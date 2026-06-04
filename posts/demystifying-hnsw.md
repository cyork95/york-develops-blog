---
title: "Demystifying HNSW: The Graph Theory and Systems Architecture Powering Vector Search"
date: 2026-06-03
description: A deep dive into how HNSW graphs work — the skip-list inspiration, distance math, quantization trade-offs, and the LSM-Tree architecture behind production vector databases.
tags: [vector-search, hnsw, gcp, data-engineering]
section: programming
---

Lately, my engineering brain has been entirely consumed by the mechanics of vector search. Working daily within Google Cloud Platform, I spend plenty of time orchestrating pipelines that churn out embeddings — turning raw data into those massive, high-dimensional arrays of 32-bit floats that represent semantic meaning. But for the longest time, the actual retrieval step felt like a bit of a black box. We hand those embeddings off to a vector database, run a query, and millisecond-level magic happens.

Last weekend, while sitting on the back patio with a hot mug of Harney & Sons Tower of London blend, watching the bumblebees finally colonize my emerging Zone 6b perennial beds, it hit me: the real engineering marvel isn't generating the vectors. It's the retrieval. Traditional SQL indexes like B-Trees work brilliantly when you are searching for exact matches or sorting linear, one-dimensional data. But throw a 1,536-dimensional embedding at a B-Tree, and it completely melts under the "curse of dimensionality." To build search infrastructure that doesn't collapse under its own weight, you have to leave the comfort of exact matches behind and step into the world of probabilistic graph theory. Specifically, you encounter the current gold standard of Approximate Nearest Neighbor (ANN) search: the **Hierarchical Navigable Small World (HNSW)** graph.

## 1. From Skip-Lists to Multi-Layer Graphs

If you try to find the exact nearest neighbor to a query vector across a dataset of hundreds of millions of embeddings, you are stuck with a brute-force $O(N)$ linear scan. You have to calculate the distance between your query and every single vector in the system. At scale, your latency budget evaporates instantly.

HNSW elegantly avoids this by fundamentally reimagining the search space as a multi-layered network, heavily borrowing its core architecture from a classic data structure: the probabilistic skip-list.

```
Layer 2 (Express)   [Node A] -------------------------------------> [Node Z]
                       |                                               |
Layer 1 (Regional)  [Node A] -----------> [Node M] -----------------> [Node Z]
                       |                     |                         |
Layer 0 (Dense)     [Node A] -> [Node D] -> [Node M] -> [Node T] -> [Node Z]
```

In a standard skip-list, you have a linked list with multiple layers. The top layers have few elements and allow you to make massive, sweeping "express train" jumps across the data. As you descend layers, the density increases, allowing you to fine-tune your position until you find the exact element on the bottom layer.

HNSW translates this concept into a multi-layered graph. The top layer consists of a sparse graph with long-range edges. When a query vector enters the system, the algorithm starts at this top layer, rapidly hopping across massive distances in the high-dimensional space to find the local region closest to the query. Once it hits a local optimum where it can't get any closer, it drops down to the next layer, using the previous stop as the entry point. This process repeats until it reaches Layer 0 — the dense, full graph containing every single vector — where it executes localized, highly precise short-range hops to lock onto the nearest neighbors.

The magic of this approach is that it converts an intractable $O(N)$ search problem into a highly predictable $O(\log N)$ logarithmic traversal.

## 2. The Math of High-Dimensional Distance

When we talk about making "hops" based on proximity, we have to define what proximity means. In vector space, distance is identity. The three primary mathematical metrics used to evaluate these graph distances are:

- **Euclidean Distance ($L_2$ norm):** Measures the straight-line distance between two points in Euclidean space. It is highly sensitive to the absolute magnitude of the vectors.
- **Cosine Similarity:** Measures the cosine of the angle between two vectors, completely ignoring magnitude. It looks purely at directional alignment, making it perfect for text embeddings where document length can vary wildly.
- **Dot Product:** Multiplies corresponding components and sums them up. If your vectors are unit-normalized (scaled to a length of 1), the Dot Product is mathematically equivalent to Cosine Similarity, but it bypasses the expensive square root and division operations, saving precious CPU cycles.

Choosing the right metric isn't just an abstract data science choice; it dictates the CPU instructions utilized during graph traversal.

## 3. The Systems Engineering Bottleneck: Squeezing Graphs into RAM

While HNSW is incredibly fast, it comes with a glaring engineering trade-off: it is absolutely ravenous for memory. To achieve sub-tens-of-millisecond latencies, the algorithm requires traversing pointers across nodes rapidly. If your application triggers a disk read halfway through a graph traversal, your latency profile is ruined. The entire index needs to live in RAM.

Consider the math: if you have 100 million vectors, each with 1,536 dimensions stored as 32-bit floats, the raw vector data alone takes up roughly **614 GB of memory**. When you construct an HNSW graph on top of that, adding the pointer overhead for the edges of each node, your RAM requirements can easily cross the **1 TB mark**.

To prevent this from becoming a financial disaster on your cloud bill, production systems rely on lossy compression techniques:

### Scalar Quantization (SQ)

SQ uniformly maps 32-bit floating-point numbers down to 8-bit integers (`int8`). This instantly cuts the memory footprint of your vectors by **75%**, transforming a 600 GB cluster requirement into a much more manageable 150 GB, with only a marginal single-digit percentage drop in search accuracy (recall).

### Product Quantization (PQ)

For even tighter constraints, PQ breaks down the high-dimensional vector space into smaller subspaces, clusters those subspaces using k-means, and replaces the raw values with a compact codebook index. It compresses data even further than SQ, though at a steeper cost to recall precision.

Without these quantization strategies, cache misses at the hardware level become devastating. If the HNSW index grows too massive to fit into the CPU's L3 cache, the system is constantly forced to fetch edge pointers from main system memory, stalling the CPU pipelines and tanking query-per-second (QPS) performance.

## 4. Architectural Realities: The "Kappa" Architecture for Vectors

Building a static HNSW graph is straightforward. Building a production-grade database that can handle real-time streaming data updates while serving millions of reads is an entirely different beast.

HNSW graphs are notoriously expensive to update. When a new vector is inserted, the database has to traverse the existing layers to find its appropriate neighbors, establish bidirectional links, and potentially prune old edges to keep the maximum degree of connection (the parameter $M$) within its defined bounds. If you tried to do this synchronously for every single write on a high-throughput streaming pipeline, your database would grind to a halt.

To decouple intensive graph construction from real-time indexing, modern vector engines adopt an architecture heavily inspired by Log-Structured Merge-Trees (LSM-Trees):

```
[Incoming Write] ---> [ Write-Ahead Log (WAL) ]
                             |
                             v
                     [ In-Memory Buffer Graph ]  <--- Fast, unoptimized searches
                             |
                    (Periodic Background Flush)
                             v
               [ Immutable HNSW Segments on Disk ] <--- Optimized Read Layer
```

1. **The Write-Ahead Log (WAL):** Every incoming vector is instantly appended to an on-disk, append-only log to ensure durability. If the node crashes, the data isn't lost.
2. **The In-Memory Buffer Graph:** Simultaneously, the vector is inserted into a small, unoptimized, real-time in-memory graph or a flat array. Queries scan this buffer via brute force, which is fast because the buffer is kept small.
3. **Background Merging:** Periodically, a background thread flushes these memory buffers to disk, running the intensive HNSW construction algorithm in isolation to build a massive, read-optimized, completely immutable HNSW segment.

When a query comes in, the engine queries both the massive, immutable historical HNSW segments and the active, real-time memory buffer, merging the results before returning them to the user. This read/write separation keeps the architecture resilient, highly available, and capable of handling real-time data influxes without dropping connections.

## The Deep-Dive Rabbit Hole

If you are looking to build or tune your own vector infrastructure, these are the core dial settings and architectural concepts you need to experiment with:

- **$M$:** The maximum number of bidirectional connection edges established for each new node per layer. Higher means better accuracy but a larger memory footprint.
- **$ef\_construction$:** The size of the dynamic candidate list evaluated during graph building. Cranking this up increases index build time but optimizes graph quality.
- **$ef\_search$:** The size of the dynamic candidate list tracked during a live query execution. Tweaking this at runtime lets you dynamically trade off latency for recall accuracy on the fly.

Vector search is fascinating because it forces us to look past clean, deterministic software boundaries and embrace the trade-offs of probabilistic engineering. It's a balance of math, hardware constraints, and distributed pipeline design — the exact kind of deep systems rabbit hole that makes data engineering so incredibly rewarding.
