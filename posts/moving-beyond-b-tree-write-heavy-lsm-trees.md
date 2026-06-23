---
title: "Moving Beyond the B-Tree: Why Modern Write-Heavy Architectures Demand LSM-Trees"
date: 2026-06-23
description: "An architectural exploration of why traditional B-Tree databases struggle under write-heavy workloads and how Log-Structured Merge-Trees (LSM-Trees) solve this through MemTables, SSTables, compaction, and Bloom filters."
tags: [databases, lsm-tree, b-tree, storage-engines, system-design, rocksdb, cassandra, bigtable]
---

A few weeks ago, I was looking over some data ingestion pipelines for a personal project—tracking telemetry data from a few smart home sensors and gardening monitors I’ve rigged up. I noticed that as the write volume scaled up, the underlying database was hitting a massive I/O bottleneck. It took me back to my day job as a Cloud Data Engineer, where we regularly design systems to ingest terabytes of streaming logs without breaking a sweat.

For decades, the B-Tree was the undisputed monarch of the database world, powering stalwarts like PostgreSQL and MySQL. But when you shift from traditional relational workloads to massive, write-heavy streams—like IoT telemetry, application logs, or real-time event tracking—the classic B-Tree starts to buckle under the pressure. To understand why, and to see how modern engines like Google Cloud's Bigtable, Apache Cassandra, and RocksDB solve this, we have to look closely at how data physically hits the metal of our storage drives.

---

## The In-Place Write Penalty: Why B-Trees Struggle with High-Throughput

To understand the rise of the Log-Structured Merge-Tree (LSM-Tree), we first have to look at the limitations of the B-Tree. At its core, a B-Tree organizes data into fixed-size blocks or pages (usually 4KB to 16KB). When you insert, update, or delete a record, the database performs an **in-place update**. It finds the specific page containing the key, modifies it in memory, and eventually flushes that modified page back to its exact location on disk.

This works beautifully for read-heavy workloads because data is tightly organized and predictable. But when you are hammering the database with continuous writes, two major problems emerge:

1. **Random Disk I/O:** Updates happen all over the tree. Even on modern NVMe SSDs, which handle random I/O significantly better than old spinning platters, scattering small writes across random physical blocks degrades performance and induces high latency.
2. **Write Amplification:** Suppose you want to update a single 100-byte record. The storage engine cannot write just 100 bytes; it has to rewrite the entire 4KB or 8KB page containing that record. If the database updates an internal node or splits a page, it triggers even more writes. This means your physical disk writes can be orders of magnitude larger than your actual data payload, wearing out SSD flash cells prematurely and choking your I/O bandwidth.

---

## Flipping the Script: The LSM-Tree Architecture

The LSM-Tree completely flips this model on its head. Instead of updating data in-place, an LSM-Tree treats disk storage as an **append-only log**. It turns random writes into sequential writes, which utilize the absolute maximum sequential write speed of your hardware.

Because you can't just throw data blindly into a file if you ever hope to read it back efficiently, the LSM-Tree coordinates a brilliant dance between volatile memory and immutable disk files.

### 1. The Write Path: MemTable and the WAL

When a write request arrives, it follows a strict two-step path:

* **The Write-Ahead Log (WAL):** The write is immediately appended to a raw log file on disk. This is a pure sequential append, making it incredibly fast. Its only job is disaster recovery; if the system crashes, the log is replayed to restore state.
* **The MemTable:** Simultaneously, the data is inserted into an in-memory structure called the `MemTable`. The `MemTable` is typically implemented as a skip list or a red-black tree, ensuring that data is kept sorted by key in memory at all times.

Once the write hits the WAL and the `MemTable`, the database considers the write complete. There's no waiting for a disk page search or a complex tree rebalance. It’s just a memory write and a file append.

### 2. The Move to Disk: Sorted String Tables (SSTables)

Memory isn't infinite. When the `MemTable` reaches a certain size threshold (typically 32MB or 64MB), it freezes and becomes immutable. A new, empty `MemTable` is opened to handle incoming writes.

In the background, a worker thread flushes the frozen `MemTable` to disk as an **SSTable (Sorted String Table)**.

An SSTable is a highly optimized, immutable file format consisting of two main parts: a sequence of data blocks containing sorted `key:value` pairs, and an index block mapping keys to their exact offsets within the file. Because the `MemTable` was already sorted in memory, writing the SSTable is a purely sequential, blindingly fast disk operation. Once written, these files are *never* modified. Updates and deletes simply write a new version of the key (or a deletion marker known as a "tombstone") to a newer SSTable.

---

## The Core Engineering Magic: Compaction Strategies

If SSTables are immutable and we just keep writing new ones, we run into an obvious issue: we will eventually fill up the disk with duplicate, obsolete versions of keys, and looking up a single key will require searching through dozens of separate files.

To prevent this read degradation, LSM engines run background processes called **Compaction**. Compaction reads multiple SSTables, merges their sorted contents (discarding overwritten values and tombstones), and writes out a clean, consolidated set of new SSTables.

Engineers generally use one of two primary compaction strategies, depending on the workload:

### Size-Tiered Compaction

Commonly used in systems like Apache Cassandra, this strategy waits until a certain number of SSTables of roughly equal size have accumulated (e.g., four 64MB files). It then merges them into a single, larger SSTable (e.g., 256MB).

* **Pros:** Low write overhead during ingestion.
* **Cons:** High temporary disk space overhead (you need enough free space to hold the files being merged), and it can leave old duplicates around for a long time.

### Leveled Compaction

Popularized by Google’s LevelDB and Meta’s RocksDB, this approach divides storage into distinct levels ($L_1$, $L_2$, $L_3$, etc.), where each level has a strict capacity limit (e.g., $L_1 = 10\text{ MB}$, $L_2 = 100\text{ MB}$, $L_3 = 1\text{ GB}$). Critically, within a single level, keys do not overlap across SSTables.

When $L_1$ exceeds its capacity, an SSTable from $L_1$ is merged with all overlapping SSTables in $L_2$.

* **Pros:** Highly space-efficient with excellent, predictable read performance, since a key will only exist in at most one SSTable per level.
* **Cons:** High write amplification, as data is repeatedly read and re-written down through the levels.

---

## Mitigating the Read Penalty: Bloom Filters

Because a key might live in the active `MemTable` or across any number of SSTables on disk, reading data from an LSM-Tree can be costly. If a key doesn't exist in the database, a naive reader would have to check every single SSTable file on disk before concluding the key is missing.

To prevent this catastrophic read penalty, modern LSM storage engines leverage a brilliant probabilistic data structure: the **Bloom Filter**.

Every SSTable has an associated Bloom filter kept in memory. A Bloom filter is incredibly compact and can tell you one of two things with absolute certainty:

1. The key **definitely is not** in this SSTable.
2. The key **might be** in this SSTable.

When a read request comes in for a specific key, the engine queries the Bloom filters for the relevant SSTables first. If the filter says "not present," the engine skips that file entirely, completely avoiding an expensive disk I/O operation. Only if the filter returns "might be present" does the engine actually read the file from disk to find the data.

---

## The Architectural Trade-Offs

Choosing a storage engine comes down to understanding the fundamental trade-offs between write speed, read speed, and space optimization.

| Feature | B-Tree Engines (e.g., InnoDB, PostgreSQL) | LSM-Tree Engines (e.g., RocksDB, Bigtable) |
| :--- | :--- | :--- |
| **Write Performance** | Slower; bound by random I/O and page splits. | Extremely Fast; bound by sequential disk bandwidth. |
| **Read Performance** | Fast and Predictable; point lookups require minimal page reads. | Variable; relies heavily on Bloom filters and caching. |
| **Space Efficiency** | Modest; fragmentation and internal page padding waste space. | High; immutability allows for excellent block compression. |
| **Write Amplification** | High; writing full pages for minor modifications. | High during compaction, but lower during initial ingestion. |

---

## Closing Thoughts

Diving into storage internals reminds me why I fell in love with computer science. There is no such thing as a \"perfect\" architecture—only a series of deeply deliberate engineering trade-offs. The B-Tree sacrificed write throughput to give us highly predictable, rapid point lookups. The LSM-Tree accepted a heavier background maintenance tax (compaction) and read complexity to unlock massive, unthrottled write scaling.

The next time you spin up an instance of RocksDB for an embedded project, or deploy a Bigtable cluster to ingest streaming telemetry, take a moment to appreciate the elegant choreography happening beneath the abstraction layer. The data isn't just sitting there; it's constantly being sorted, flushed, filtered, and merged in a beautifully orchestrated race against the physical limits of hardware.
