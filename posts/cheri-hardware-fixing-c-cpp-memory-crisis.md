---
title: "Beyond Rust: How CHERI Hardware is Fixing the C/C++ Memory Crisis at the Silicon Level"
date: 2026-06-18
description: An architectural exploration of Capability Hardware Enhanced RISC Instructions (CHERI) — how 128-bit unforgeable capabilities, ARM Morello prototypes, and CheriBSD are tackling spatial memory safety at the logic-gate level.
tags: [security, hardware, c-cpp, rust, cheri, arm, risc-v, systems-programming, operating-systems]
---

We’ve all heard the modern mantra: *Rewrite it in Rust.* And honestly, as someone who spends their days wrangling massive pipelines in Google Cloud Platform and navigating complex distributed systems, I get the appeal. Memory safety isn't just an abstract computer science problem; it’s a massive security vector. But let's be real for a moment. You cannot simply rewrite the Linux kernel, open-source database engines, or decades of foundational C/C++ infrastructure over a weekend. The sheer volume of legacy code running our digital world means we are going to be living with "unsafe" languages for the rest of our careers.

Lately, during my late-night rabbit holes—usually fueled by a hot mug of Harney & Sons Scottish Afternoon tea—I've been obsessing over a different philosophy. What if, instead of forcing software developers to rewrite trillions of lines of code, we fixed the silicon underneath them? What if the CPU itself made memory exploits physically impossible? That’s the promise of **CHERI** (Capability Hardware Enhanced RISC Instructions), a research project out of the University of Cambridge that is rapidly transitioning into production-ready hardware. It fundamentally redefines what a "pointer" is, and it might just be the most important architectural shift in hardware design since the introduction of virtual memory.

---

## The Root Disease: The Naked Integer Problem

To understand why CHERI is such a paradigm shift, we have to look at how traditional CPU architectures handle memory. In standard x86_64 or ARM64 architectures, a memory pointer is fundamentally just a raw integer representing a 64-bit address in virtual memory.

If a C program allocates a buffer on the heap, it gets back a memory address. The CPU doesn't actually know how big that buffer is; it blindly trusts the software to keep track of its own boundaries. If a malicious payload exploits a vulnerability to increment that pointer beyond its intended buffer, the CPU will happily execute the instruction, reading or writing to whatever lies beyond. This is the root cause of buffer overflows, use-after-free bugs, and a massive percentage of the CVEs that plague modern infrastructure.

We’ve tried fixing this with software mitigations: ASLR (Address Space Layout Randomization), stack canaries, and non-executable stacks. But these are just band-aids. They make exploitation harder, not impossible. CHERI attacks the disease at the cellular level by replacing these naked 64-bit integers with **architectural capabilities**.

---

## Inside the Mechanism: How CHERI Capabilities Work

Under CHERI, a pointer is no longer just a 64-bit address. It is expanded into a **128-bit capability**. This token contains three distinct pieces of information packed tightly by the hardware:

* **The Address:** The actual 64-bit memory address being targeted.
* **The Bounds:** A lower and upper limit defining the exact window of memory this pointer is legally allowed to access.
* **The Permissions:** A bitmask specifying what actions are allowed (e.g., Read, Write, Execute).

```
Traditional Pointer:
[ 64-bit Virtual Address ] -> Pure Integer (No Context)

CHERI Capability (128-bit):
[ 64-bit Virtual Address ] + [ Bounds (Base & Top) ] + [ Permissions (R/W/X) ]
```

Here’s the genius part: **Capabilities are completely unforgeable.** You cannot simply use standard integer arithmetic to manufacture a capability out of thin air or expand its bounds. To enforce this, the hardware implements a **1-bit tag** in physical memory and cache lines for every 128-bit capability slot. This tag is managed strictly by the CPU logic and is invisible to the user's address space.

If a program attempts to manually overwrite a capability in memory using standard data writes, the CPU automatically clears that 1-bit tag. The moment the program tries to dereference that modified pointer, the CPU detects that the tag is `0` and instantly triggers a hardware exception, halting the thread before a single byte of unauthorized data can be read or leaked.

---

## Real-World Performance: The ARM Morello Prototype

For years, skeptics argued that adding bounds-checking to every single pointer operation would absolutely tank CPU performance. We’ve seen software-based bounds-checking introduce overheads of 20% to 50%, which is completely unacceptable for high-performance data engineering or kernel-level tasks.

Enter the **ARM Morello project**. Backed by the UK government and tech industry giants, ARM actually fabricated a real-world, production-scale 7nm System-on-Chip (SoC) based on their Neoverse N1 architecture, extended with CHERI capabilities.

The engineering reports coming out of the Morello prototype evaluations have blown those performance anxieties out of the water. When compiling entire operating systems and legacy codebases with CHERI protections fully enabled, the performance overhead typically lands **under 5%**.

Think about that. For a negligible performance cost, you get hardware-enforced protection against the entire category of spatial memory safety vulnerabilities. It’s a trade-off almost any enterprise infrastructure team or privacy-conscious developer would take in a heartbeat.

---

## Fine-Grained Compartmentalization vs. Heavy Virtualization

As someone who works deeply with cloud architecture, this is where CHERI gets incredibly exciting. Right now, our entire security model relies on brute-force isolation. If I want to run untrusted code, or isolate a specific microservice, I spin up a Virtual Machine or a container. This requires massive OS overhead, virtual memory page-table walks, and context-switching penalties.

CHERI enables something called **ultra-fine-grained compartmentalization**. Because bounds and permissions are enforced at the hardware capability level, you can isolate software components inside the *exact same process address space*.

Imagine a web server where the TLS key-handling library is isolated into its own hardware-enforced compartment. Even if a zero-day vulnerability allows an attacker to achieve arbitrary code execution inside the web server's main thread, the CPU physically prevents that code from reading the memory bounds belonging to the TLS compartment. You get the security isolation of a virtual machine with the near-zero overhead of a local function call.

---

## Booting CheriBSD: The Software Landscape

Hardware is useless without software that understands it, and that’s where projects like **CheriBSD** come in. CheriBSD is a highly production-ready fork of FreeBSD, adapted specifically to leverage CHERI capabilities.

The underlying toolchain uses a modified version of LLVM/Clang. When you compile legacy C or C++ code targeting CHERI, the compiler translates standard pointers into capability-aware instructions.

For a taste of what this looks like at the kernel level, here is a conceptual look at how a CHERI-aware operating system kernel sets bounds when allocating memory for a user-space buffer:

```c
#include <cheri/cheric.h>

void* allocate_secure_buffer(size_t size) {
    // 1. Allocate raw memory from the kernel pool
    void* raw_ptr = malloc(size);
    if (!raw_ptr) return NULL;

    // 2. Derive a capability from the default kernel data capability,
    // but explicitly restrict its bounds to the requested size.
    void* bounded_capability = cheri_bounds_set(raw_ptr, size);

    // 3. Strip away sensitive permissions if this goes to an untrusted sandbox
    bounded_capability = cheri_perms_and(bounded_capability, ~CHERI_PERM_EXECUTE);

    // Return the unforgeable 128-bit token to the application
    return bounded_capability;
}
```

The beauty here is that for vast swathes of legacy C/C++ code, you don't even have to modify the source code. You simply recompile it. The compiler automatically uses capability-relative instructions for pointer arithmetic, and the hardware handles the rest. If the code contains a hidden buffer overflow, it doesn't become an exploit; it simply becomes a controlled crash.

---

## Sovereignty Over Our Silicon

We talk a lot in the tech community about taking back control of our digital privacy—whether that means migrating to self-hosted cloud instances, using end-to-end encrypted suites like Proton, or dropping proprietary note-takers for local-first Markdown tools. But true digital sovereignty is a stack, and that stack goes all the way down to the silicon inside our machines.

As long as our processors rely on architectural concepts inherited from the 1970s, we are fighting an uphill battle against memory corruption. CHERI represents a fundamental rethink. It proves that we can build systems where security and privacy aren't just software design goals, but physical laws enforced by the logic gates of our CPUs.

The Morello boards are just the beginning. With RISC-V rapidly gaining traction worldwide, the integration of open CHERI extensions into mainstream, consumer-accessible hardware is closer than we think. And frankly, I can't wait for the day when our hardware finally stops trusting code blindly.
