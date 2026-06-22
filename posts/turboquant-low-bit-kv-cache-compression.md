---
title: "Structural Engineering Shifts in Real-Time Inference Infrastructure: An Evaluation of TurboQuant and Low-Bit Key-Value Cache Compressions"
date: 2026-06-21
description: An in-depth evaluation of TurboQuant — its mathematical preconditioning under PolarQuant, QJL residual error correction, RaBitQ academic disputes, hardwarefast Walsh-Hadamard transform adaptations, and vLLM integration presets.
tags: [turboquant, kv-cache, quantization, vllm, Triton, ICLR-2026, GPU, AMD, RoCM, machine-learning]
---

## The Hardware Memory Wall and the Emergence of TurboQuant

The deployment of large language models in enterprise environments has hit a critical physical constraint: the hardware memory wall<sup>1</sup>. While standard model weight quantization techniques, such as 4-bit and 8-bit weights, effectively reduce the static footprint of neural network parameters, they leave the dynamic memory requirements of the key-value (KV) cache entirely unaddressed<sup>1</sup>. During autoregressive decoding, key-value vectors must be stored for every token across the context window<sup>1</sup>. As sequence lengths extend from 4K to 32K, 128K, and beyond, this dynamic cache grows linearly, rapidly overtaking the static weight footprint as the dominant consumer of graphics memory<sup>1</sup>.

For instance, running a standard 8-billion parameter model at a 32K context window demands approximately 4.6 GB of VRAM solely for the KV cache<sup>1</sup>. When scaling to a 70-billion parameter model under high concurrency, storing uncompressed key-value activations in 16-bit precision (FP16 or BF16) forces system engineers to utilize multi-GPU clusters, driving up hardware costs and leading to low compute efficiency<sup>2</sup>.

In late March 2026, Google Research published a vector quantization framework named *TurboQuant* at the ICLR 2026 conference<sup>1</sup>. The publication generated immediate industry interest, drawing comparisons to a "DeepSeek moment" for real-time inference infrastructure<sup>1</sup>. The algorithm claims to compress the key-value cache down to 3 bits per coordinate with near-zero loss in model accuracy, reducing VRAM demands by over six-fold and speeding up attention logit calculations on NVIDIA H100 GPUs by up to eight times<sup>1</sup>.

The market implications of this structural shift were profound. The potential reduction in enterprise dependency on high-bandwidth memory (HBM) triggered a single-day $90 billion sell-off in memory manufacturer stocks, with SK Hynix dropping 12%, Samsung falling 7%, and Micron experiencing significant downward pressure at the market open<sup>8</sup>.

#### Table 1: Memory Footprint & Infrastructure Comparison

| Memory Footprint Factor | Uncompressed Baseline (FP16) | TurboQuant Compressed Format | System-Level Impact |
| :--- | :--- | :--- | :--- |
| **Typical VRAM (8B Model, 32K Context)** | 4.6 GB<sup>1</sup> | ~1.15 GB<sup>1</sup> | Fits large-context workloads onto consumer-grade GPUs<sup>6</sup> |
| **Scaling Limit (70B Model, 128K Context)** | ~140 GB<sup>2</sup> | ~36.8 GB<sup>2</sup> | Consolidates multi-GPU requirements to a single accelerator<sup>2</sup> |
| **HBM Bandwidth Pressure** | Extremely high (memory-bound decoding)<sup>2</sup> | Low (reduced byte transfer per token)<sup>10</sup> | Alleviates execution bottlenecks and boosts throughput<sup>10</sup> |

---

## The Algorithmic Architecture of TurboQuant

TurboQuant optimizes transient high-dimensional key-value activations at runtime using a two-stage approach: PolarQuant for primary coordinate-wise compression and a 1-bit Quantized Johnson-Lindenstrauss (QJL) transform for residual bias correction<sup>6</sup>. Unlike traditional product quantization methods, the combined algorithm is data-oblivious, requiring no offline training or calibration datasets, and allowing standard models to benefit from it immediately without retraining<sup>3</sup>.

```
Raw Vector (x) 
    │
    ▼
Pairing into Radii & Angles
    │
    ▼
Recursive Polar Transform
    │
    ▼
Angle Quantization (Lloyd-Max Beta Distribution Centroids) ──► PolarQuant (~3 bits)
    │
    ▼
Compute Residual Error Vector (r = x - x_hat)
    │
    ▼
1-bit Quantized Johnson-Lindenstrauss (QJL) Projection ───────► Sign Vector Correction (1 bit)
```

### Stage 1: Polar-Transform Preconditioning via PolarQuant

Standard vector quantization in Cartesian coordinate spaces is inherently lossy when applied to neural network activations<sup>6</sup>. Language models exhibit highly skewed token activation distributions, where a tiny fraction of outlier channels have magnitudes up to 100 times larger than normal coordinates<sup>2</sup>. Normalizing across these wide ranges to enable uniform quantization is computationally expensive and introduces significant rounding errors<sup>2</sup>.

The primary insight behind the PolarQuant stage (presented at AISTATS 2026) is that high-dimensional key-value vectors behave more predictably in polar coordinates<sup>6</sup>. By mapping a \(d\)-dimensional coordinate space into a polar coordinate system, the vector is split into its radial magnitude and its angular components<sup>6</sup>. The process consists of three steps<sup>8</sup>:
1. **Pairing:** Group the \(d\)-dimensional vector into coordinate pairs to compute individual radii and angles<sup>8</sup>.
2. **Radius Transform:** Apply recursive polar transformations across the resulting radii to isolate vector magnitudes<sup>8</sup>.
3. **Angle Quantization:** Quantize only the highly concentrated angular coordinates<sup>8</sup>.

To ensure a uniform, predictable coordinate distribution without using per-model calibration data, PolarQuant applies a random orthogonal rotation matrix to the input vector before quantizing the angles<sup>7</sup>. The rotation matrix \(R\) is defined as the orthogonal matrix \(Q\) obtained from the QR decomposition of a random Gaussian matrix \(G\)<sup>8</sup>:

$$G = Q U$$

where \(Q\) is orthogonal and \(U\) is upper triangular. Thus, we set \(R = Q\). Multiplying a unit-length normalized vector by \(R\) redistributes coordinate variance evenly<sup>8</sup>. In high dimensions, the rotated coordinates follow a predictable Beta distribution<sup>3</sup>. The coordinate probability density function \(p(x)\) for a dimension \(d\) is analytically represented as:

$$p(x) = \frac{1}{\sqrt{\pi}} \frac{\Gamma\left(\frac{d}{2}\right)}{\Gamma\left(\frac{d-1}{2}\right)} (1 - x^2)^{\frac{d-3}{2}}$$

for \(x \in [-1, 1]\). Because this distribution is mathematically determined by the vector dimension and does not depend on the specific dataset, the algorithm precomputes a single set of optimal Lloyd-Max scalar quantization centroids offline<sup>8</sup>. For a set of \(k\) centroids \(c_i\) and decision boundaries \(b_i\), the Lloyd-Max conditions satisfy:

$$c_i = \frac{\int_{b_{i-1}}^{b_i} x p(x) dx}{\int_{b_{i-1}}^{b_i} p(x) dx}, \quad b_i = \frac{c_i + c_{i+1}}{2}$$

Quantization maps each rotated coordinate to the nearest precomputed centroid index, storing the indices along with the vector's scalar norm<sup>8</sup>. Dequantization maps the indices back to centroid values and projects them back using the transpose of the rotation matrix \(R^T\)<sup>3</sup>. This first stage consumes \(2\) to \(3\) bits of the total coordinate bit budget<sup>14</sup>.

### Stage 2: Residual Error Correction via QJL

While PolarQuant minimizes mean-squared error (MSE), MSE-optimal scalar quantizers introduce systematic biases when calculating inner products (which form the foundation of attention scores)<sup>1</sup>. To eliminate this bias, TurboQuant applies a 1-bit Quantized Johnson-Lindenstrauss (QJL) transform to the remaining residual error vector from the first stage<sup>3</sup>.

Let \(r\) represent the residual vector<sup>3</sup>:

$$r = x - \hat{x}$$

Let \(\|r\|\) represent the residual norm<sup>3</sup>. The normalized residual vector is projected using a random projection matrix \(P \in \mathbb{R}^{m \times d}\) to generate a 1-bit sign vector \(s\)<sup>3</sup>:

$$s = \text{sign}\left( P \cdot \frac{r}{\|r\|} \right)$$

The final quantized state is stored as a composite structure<sup>3</sup>:

$$\text{state}(x) = (\hat{x}, \|r\|, s)$$

During decompression, the unbiased inner product estimator reconstructs the inner product of two residuals \(r_x, r_y\) as<sup>3</sup>:

$$\langle r_x, r_y \rangle \approx C \cdot \|r_x\| \cdot \|r_y\| \cdot \frac{s_x^T s_y}{m}$$

where \(C\) is a scaling constant (which depends on the dimension and projection properties) and \(m\) is the projection dimension. This step ensures that the expected value of the compressed inner product matches the true inner product exactly, preventing error accumulation over long sequences<sup>3</sup>.

---

## Academic Lineage, Alternative Paradigms, and the RaBitQ Controversy

The development of TurboQuant has occurred alongside a series of academic discussions and competitive alternative architectures<sup>17</sup>. Structuring these connections is essential for evaluating where the technology sits within the broader vector quantization landscape<sup>16</sup>.

### Historical Ancestry and Mathematical Overlaps

The core mathematical approach of combining orthogonal rotations, deterministic scalar quantization, and re-normalization to compress vectors is built on several prior works<sup>20</sup>:
* **DRIVE (NeurIPS 2021) & EDEN (ICML 2022):** First established the pattern of using structured Hadamard rotations and scalar Lloyd-Max quantization for gradient compression and federated learning<sup>20</sup>.
* **HIGGS (NAACL 2025):** Mathematically proved that linear rotations can preserve inner products, showing equivalence to the scalar quantization case<sup>20</sup>.
* **"Cache Me If You Must" (ICML 2025):** Applied Hadamard rotations and scalar quantization to key-value caches before the formal publication of TurboQuant<sup>20</sup>.

### The RaBitQ Dispute

Despite its acceptance to ICLR 2026, TurboQuant faced criticism from the authors of RaBitQ (SIGMOD 2024), who raised concerns about academic misrepresentation, incorrect theoretical characterization, and biased benchmarking<sup>17</sup>. Both RaBitQ and TurboQuant rely on applying a random orthogonal projection (such as a Johnson-Lindenstrauss transform) to redistribute outlier coordinate variance into a highly concentrated normal distribution before quantization<sup>9</sup>.

The controversy centers on three main points:
* **Omission of Prior Art:** The original TurboQuant paper initially described RaBitQ as "grid-based PQ," omitting its core random rotation step<sup>18</sup>. This was despite documented contact in January 2025, where a TurboQuant co-author requested help to debug a Python translation of RaBitQ's C++ code<sup>18</sup>. In the final ICLR 2026 paper, the authors moved their description of RaBitQ to the appendix, defending the omission by arguing that random rotations are standard techniques<sup>18</sup>.
* **Incorrect Theoretical Claims:** The TurboQuant paper labeled RaBitQ's error bounds as "suboptimal" due to "loose analysis"<sup>18</sup>. However, RaBitQ's authors had already published a rigorous proof in Theorem 3.2 of their extended work showing that RaBitQ matches the optimal asymptotic bounds of Alon and Klartag (FOCS 2017)<sup>18</sup>.
* **Unbalanced Benchmarking:** The paper reported that RaBitQ was several orders of magnitude slower than TurboQuant<sup>18</sup>. The RaBitQ authors revealed that TurboQuant was tested on a high-end NVIDIA A100 GPU, whereas RaBitQ was evaluated using a non-optimized, single-threaded Python translation run on a single CPU core with multi-threading explicitly disabled<sup>18</sup>.

### Alternative Vector Quantization Frameworks

Beyond the TurboQuant and RaBitQ architectures, several alternative quantization strategies have been proposed to optimize storage and retrieval in vector search engines and inference frameworks<sup>3</sup>:
* **HQMQ (High-Quality Multi-Quaternion Quantization):** Groups key-value channels into 4-element chunks, treating them as unit quaternions<sup>19</sup>. It maps directions to the 24-vertex Hurwitz group (\(\mathcal{H}\)) on the \(S^3\) sphere and applies a random secondary codebook to bypass scalar Lloyd-Max calibration<sup>19</sup>.
* **IsoQuant:** Applies an \(SO(4)\) isoclinic rotation to 4-element key blocks as a preconditioning step, followed by scalar Lloyd-Max quantization<sup>19</sup>.
* **RotorQuant:** Employs Clifford algebra rotors across 3-element coordinate blocks to stabilize the distribution prior to quantization<sup>19</sup>.
* **FibQuant:** Projects coordinate directions onto a Fibonacci-sphere grid to maintain consistent spacing<sup>19</sup>.

---

## System-Level Hardware Optimization and Production Kernel Engineering

While the theoretical formulation of TurboQuant relies on random orthogonal rotations and QJL residual tracking, adapting the algorithm for high-throughput production frameworks (such as vLLM) required major systems-level modifications<sup>21</sup>.

### The Deprecation of QJL in Production

A key difference between the academic paper and real-world implementations is the deliberate omission of the QJL stage<sup>15</sup>. Six independent development teams confirmed that the 1-bit QJL residual correction degrades attention quality in practice<sup>15</sup>.

The mathematical explanation lies in the non-linear softmax operation of the attention mechanism<sup>15</sup>. The variance introduced by the 1-bit QJL projection is amplified during softmax exponentiation, introducing random noise that degrades generation quality<sup>15</sup>. Additionally, loading and computing the random projection matrix \(P\) at runtime introduces severe register pressure and processing overhead<sup>22</sup>. As a result, modern inference libraries use an MSE-only quantization strategy<sup>15</sup>.

### Hardware-Aware Mathematical Substitutions

To run efficiently on modern hardware, production engines replace the random orthogonal rotation matrix with a Fast Walsh-Hadamard Transform (WHT)<sup>22</sup>. While a random rotation matrix requires storing \(O(d^2)\) floating-point parameters per layer and performing dense matrix-vector multiplications, WHT is parameter-free<sup>22</sup>. WHT uses simple addition and subtraction operations, running in \(O(d \log d)\) time instead of \(O(d^2)\), which significantly reduces GPU register pressure and instruction count<sup>22</sup>.

### Multi-Tier Kernel Engineering on GPUs

To make TurboQuant competitive with optimized 16-bit and FP8 baselines, three levels of custom hardware kernels have been developed<sup>22</sup>:
* **Custom Triton Kernels:** Fuses the quantization and dequantization stages into single execution blocks to minimize global memory transfers<sup>22</sup>. These kernels utilize a "Structure of Arrays" (SoA) layout to enable coalesced 128-bit memory access<sup>22</sup>. They also precompute centroid pairs offline, allowing a single byte load to recover two dequantized values and halving lookup table overhead<sup>22</sup>.
* **Native HIP Kernels:** Developed for AMD CDNA architectures, these kernels compile directly to raw GCN assembly instructions<sup>22</sup>. They leverage direct Matrix Fused Multiply-Add (MFMA) instructions instead of Triton abstractions, offering precise control over register allocation<sup>22</sup>. Additionally, they stage dequantized values in Local Data Share (LDS) memory, allowing Grouped-Query Attention (GQA) threads to share a single global memory load and reducing execution stalls<sup>22</sup>.
* **FlyDSL Kernels:** Generates JIT-compiled assembly code for CDNA3 hardware<sup>22</sup>. FlyDSL coordinates register-level hand-offs directly from the QK dot-product through the softmax operation to the final PV multiplication<sup>22</sup>. This bypasses shared-memory spills entirely and achieves up to 95% of the throughput of unquantized BF16 baselines while using a fraction of the memory<sup>22</sup>.

### Cross-Platform Hardware Implementations

Production frameworks have implemented TurboQuant across a wide variety of hardware environments<sup>6</sup>:
* **Enterprise CUDA Clusters:** Extended vLLM forks support TurboQuant on NVIDIA RTX A6000 (SM86) and Blackwell GB10 (SM121) architectures using Triton attention backends<sup>26</sup>.
* **Cross-Platform Workstations:** The QVAC SDK 0.12.0 implements TurboQuant using a unified Vulkan backend<sup>6</sup>. This provides cross-platform support across NVIDIA, AMD, and Intel GPUs under Windows and Linux, and has been validated on high-end hardware such as the RTX 5090 and AMD Ryzen AI Max+ 395 (Strix Halo)<sup>6</sup>.
* **Local Edge AI:** Implemented via the MLX framework for Apple Silicon, allowing large models like Qwen3.5-35B-A3B to process massive context lengths locally on unified memory systems<sup>6</sup>.

---

## Infrastructure Benchmarking and Agentic Framework Integration

For infrastructure engineers, the primary value of low-bit KV cache quantization is its performance on long-context, multi-turn agentic workloads<sup>22</sup>. These workloads typically feature high input sequence lengths, short generation outputs, and repetitive queries that share long prompt prefixes<sup>22</sup>. Under standard precision, the KV cache quickly fills the available VRAM, causing frequent cache evictions<sup>22</sup>. When an eviction occurs, the system must re-process the entire prompt prefix on the next turn, causing a massive spike in Time-to-First-Token (TTFT)<sup>22</sup>.

By compressing the KV cache, systems can keep the entire context history resident in memory, eliminating cache evictions and reducing TTFT<sup>22</sup>. This structural shift provides a valuable foundation when comparing agentic frameworks or designing custom local benchmarks<sup>6</sup>.

### Production Presets and Perplexity Trade-offs

To help engineers evaluate these trade-offs, modern engines like vLLM provide specific named presets for the `--kv-cache-dtype` flag<sup>20</sup>. These presets allow developers to select the optimal balance between VRAM compression and generation quality<sup>15</sup>.

#### Table 2: vLLM KV Cache Quantization Presets

| vLLM Preset Name | Key Quantization Format | Value Quantization Format | Norm Correction (NC) | Memory Reduction Ratio | Model Perplexity Impact (\(\Delta\) PPL) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **turboquant_k8v4** | 8-bit FP8 | 4-bit Uniform | Disabled | 2.6x | +1.17% |
| **turboquant_4bit_nc** | 4-bit Lloyd-Max | 4-bit Uniform | Enabled | 3.8x | +2.71% |
| **turboquant_k3v4_nc** | 3-bit Lloyd-Max | 4-bit Uniform | Enabled | ~3.5x | +10.63% |
| **turboquant_3bit_nc** | 3-bit Lloyd-Max | 3-bit Uniform | Enabled | 4.9x | +20.59% |

The norm correction (NC) feature is highly critical for ultra-low precision presets<sup>20</sup>. It re-normalizes the centroid vectors to a unit norm before applying the inverse rotation during dequantization<sup>20</sup>. This simple step corrects quantization-induced norm distortion, improving model perplexity by approximately 0.8% at 4-bit representations<sup>20</sup>.

### Benchmarking with Haystack

To design custom benchmark suites, engineers can integrate TurboQuant into standard orchestration pipelines<sup>6</sup>. For example, the `turboquant-vllm` package provides a `CompressedDynamicCache` wrapper that plugs directly into Haystack's `TransformersChatGenerator`<sup>10</sup>. This allows developers to measure real-world metrics, such as TTFT, token throughput, and live VRAM consumption, across different quantization levels<sup>11</sup>.

```python
from transformers import AutoTokenizer, AutoModelForCausalLM
from transformers import DynamicCache
from turboquant_vllm import CompressedDynamicCache

# Initialize standard model and tokenizer
tokenizer = AutoTokenizer.from_pretrained("Qwen/Qwen2.5-3B-Instruct")
model = AutoModelForCausalLM.from_pretrained("Qwen/Qwen2.5-3B-Instruct").to("cuda")

# Initialize and wrap the key-value cache
base_cache = DynamicCache()
compressed_cache = CompressedDynamicCache(
    base_cache, 
    head_dim=128, 
    k_bits=4, 
    v_bits=3
)

# Run inference with transparent on-the-fly compression
inputs = tokenizer("Identify the primary structural shifts in KV caching.", return_tensors="pt").to("cuda")
outputs = model(**inputs, past_key_values=base_cache, use_cache=True)
```

In this setup, the wrapper intercepts all cache writes and applies TurboQuant's rotation and quantization in place, allowing developers to easily benchmark VRAM savings under different context lengths<sup>10</sup>.

### Downstream Task Performance across LLM Architectures

To evaluate the impact of TurboQuant on generation quality, developers have benchmarked the algorithm across standard datasets using a variety of model sizes<sup>3</sup>.

#### Long-Context Benchmarks

On standard benchmarks (such as LongBench, Needle in a Haystack, ZeroSCROLLS, and RULER), a 3.5-bit TurboQuant implementation matches the performance of the full 16-bit precision baseline across models like Gemma and Mistral<sup>2</sup>.

#### Table 3: Long-Context Task Accuracy

| Evaluation Preset | RULER Main Task % | LongBench Avg % | ZeroSCROLLS Avg % | L-Eval Avg (F1) % |
| :--- | :--- | :--- | :--- | :--- |
| **FP16 Baseline** | 96.26 | 37.52 | 22.86 | 14.17 |
| **q4_0 / q4_0** | 97.56 | 37.22 | 20.67 | 18.75 |
| **tbq3_0 / pq3_0** | 93.76 | 34.97 | 19.88 | 16.25 |
| **tbq4_0 / pq4_0** | 94.86 | 37.04 | 18.45 | 16.25 |
| **tbq4_0 / q4_0** | 96.06 | 37.57 | 21.57 | 18.75 |

While 4-bit TurboQuant (`tbq4_0/q4_0`) performs comparably to standard weight-quantized baselines (`q4_0/q4_0`) in terms of accuracy, its primary value is at 2-bit and 3-bit limits, where standard methods degrade rapidly<sup>6</sup>. At these extreme widths, the rotation preconditioning prevents model collapse, allowing systems to maintain acceptable generation quality under heavy memory constraints<sup>24</sup>.

#### Vector Database Integration

The same mathematical foundations that optimize KV caches also apply to high-dimensional nearest-neighbor search in vector databases<sup>3</sup>. For example, Qdrant 1.18 integrated TurboQuant to offer a new compression path with four operating points: 4-bit (8x compression), 2-bit (16x compression), 1.5-bit (~21x compression), and 1-bit (32x compression)<sup>16</sup>.

Across public embedding datasets, TurboQuant consistently outperforms traditional Binary Quantization (BQ) and matches Scalar Quantization (SQ) while using half the memory<sup>16</sup>:
* **4-bit TurboQuant:** Competitive with 8-bit Scalar Quantization (SQ), occasionally outperforming it on datasets where the SQ linear grid struggles with irregular embedding distributions<sup>16</sup>.
* **2-bit TurboQuant:** Consistently beats 2-bit Binary Quantization by 9 to 24 percentage points in recall across ten public datasets<sup>16</sup>.
* **1-bit TurboQuant:** Outperforms vanilla 1-bit BQ by 9 to 21 percentage points in recall at the same 32x storage savings<sup>16</sup>.

---

## Interactive KV-Cache Infrastructure & Quantization Calculator

Use the interactive calculator below to evaluate the VRAM requirement and system footprint of different KV cache quantization presets across various context lengths and concurrency configurations.

<div class="calculator-container" id="calculator-widget">
  <style>
    .calculator-container {
      background-color: var(--bg-secondary);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 1.5rem;
      margin: 2rem 0 2rem calc(50% - min(430px, 50vw - 1.5rem));
      width: min(860px, 100vw - 3rem);
      font-family: var(--font-body);
      color: var(--text-primary);
      box-shadow: var(--shadow-lg);
    }
    .calc-title {
      font-family: var(--font-heading);
      font-size: 1.25rem;
      font-weight: 700;
      color: var(--text-primary);
      margin-bottom: 1rem;
      letter-spacing: -0.02em;
      border-bottom: 1px solid var(--border-subtle);
      padding-bottom: 0.5rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .calc-title span {
      font-family: var(--font-mono);
      font-size: 0.7rem;
      color: var(--accent);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .calc-grid {
      display: grid;
      grid-template-columns: 1.2fr 1fr;
      gap: 1.5rem;
    }
    @media (max-width: 840px) {
      .calc-grid {
        grid-template-columns: 1fr;
      }
    }
    .calc-controls {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    .control-group {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }
    .control-label {
      font-size: 0.8rem;
      font-weight: 600;
      color: var(--text-secondary);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .control-val {
      font-family: var(--font-mono);
      color: var(--accent);
      font-size: 0.8rem;
    }
    /* radio buttons stylings */
    .radio-group {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.5rem;
    }
    .radio-btn {
      position: relative;
    }
    .radio-btn input {
      position: absolute;
      opacity: 0;
      width: 0;
      height: 0;
    }
    .radio-label {
      display: block;
      text-align: center;
      padding: 0.5rem;
      font-size: 0.85rem;
      font-weight: 500;
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      background-color: var(--bg-card);
      cursor: pointer;
      transition: all var(--transition);
    }
    .radio-btn input:checked + .radio-label {
      border-color: var(--accent);
      background-color: var(--accent-dim);
      color: var(--accent);
    }
    /* select styling */
    .calc-select {
      background-color: var(--bg-card);
      border: 1px solid var(--border);
      color: var(--text-primary);
      padding: 0.5rem;
      border-radius: var(--radius-sm);
      font-size: 0.85rem;
      cursor: pointer;
      outline: none;
      transition: border-color var(--transition);
    }
    .calc-select:focus {
      border-color: var(--accent);
    }
    /* slider styling */
    .calc-slider {
      -webkit-appearance: none;
      width: 100%;
      height: 6px;
      border-radius: 3px;
      background: var(--border);
      outline: none;
    }
    .calc-slider::-webkit-slider-thumb {
      -webkit-appearance: none;
      appearance: none;
      width: 16px;
      height: 16px;
      border-radius: 50%;
      background: var(--accent);
      cursor: pointer;
      transition: transform var(--transition);
    }
    .calc-slider::-webkit-slider-thumb:hover {
      transform: scale(1.2);
    }
    .calc-slider::-moz-range-thumb {
      width: 16px;
      height: 16px;
      border-radius: 50%;
      background: var(--accent);
      cursor: pointer;
      border: none;
      transition: transform var(--transition);
    }
    .calc-slider::-moz-range-thumb:hover {
      transform: scale(1.2);
    }
    /* right column / outputs */
    .calc-outputs {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      justify-content: space-between;
    }
    .readout-group {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.75rem;
    }
    @media (max-width: 480px) {
      .readout-group {
        grid-template-columns: 1fr;
      }
    }
    .readout-card {
      background-color: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      padding: 1rem;
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      min-width: 0;
      overflow: hidden;
    }
    .readout-title {
      font-size: 0.75rem;
      color: var(--text-secondary);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .readout-val {
      font-family: var(--font-heading);
      font-size: clamp(1.4rem, 2.5vw, 1.8rem);
      font-weight: 700;
      color: var(--text-primary);
      line-height: 1.1;
      word-break: break-all;
    }
    .readout-val.compressed {
      color: var(--accent);
      text-shadow: 0 0 10px rgba(0, 212, 170, 0.15);
    }
    /* comparative bar chart */
    .chart-container {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      margin-top: 0.25rem;
    }
    .chart-bar-group {
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
    }
    .chart-bar-label {
      font-size: 0.7rem;
      color: var(--text-secondary);
      display: flex;
      justify-content: space-between;
    }
    .chart-bar-track {
      background-color: var(--border-subtle);
      height: 10px;
      border-radius: 5px;
      overflow: hidden;
      position: relative;
    }
    .chart-bar-fill {
      height: 100%;
      border-radius: 5px;
      transition: width 0.2s ease-out;
    }
    .chart-bar-fill.baseline {
      background-color: var(--text-muted);
    }
    .chart-bar-fill.compressed {
      background: linear-gradient(90deg, var(--purple), var(--accent));
    }
    /* status insight card */
    .insight-card {
      background-color: var(--accent-dim);
      border: 1px solid rgba(0, 212, 170, 0.15);
      border-radius: var(--radius-sm);
      padding: 0.85rem;
      font-size: 0.8rem;
      line-height: 1.5;
      color: var(--text-primary);
      display: flex;
      gap: 0.5rem;
      align-items: flex-start;
      transition: all var(--transition);
    }
    .insight-card.warning {
      background-color: var(--purple-dim);
      border-color: rgba(188, 140, 255, 0.15);
    }
    .insight-card.danger {
      background-color: var(--amber-dim);
      border-color: rgba(245, 158, 11, 0.15);
    }
    .insight-icon {
      font-size: 1rem;
      line-height: 1;
    }
    .insight-text {
      flex: 1;
    }
  </style>
  <div class="calc-title">
    LLM KV-Cache & Quantization Calculator
    <span>v1.2.0 • Interactive</span>
  </div>
  <div class="calc-grid">
    <!-- Controls (Left Side) -->
    <div class="calc-controls">
      <!-- Model Size -->
      <div class="control-group">
        <label class="control-label">Model Architecture</label>
        <div class="radio-group">
          <label class="radio-btn">
            <input type="radio" name="model-size" id="model-8b" value="8B" checked onclick="calculateKV()">
            <span class="radio-label">Llama-3 8B</span>
          </label>
          <label class="radio-btn">
            <input type="radio" name="model-size" id="model-70b" value="70B" onclick="calculateKV()">
            <span class="radio-label">Llama-3 70B</span>
          </label>
        </div>
      </div>
      <!-- Context Window -->
      <div class="control-group">
        <div class="control-label">
          Context Window
          <span class="control-val" id="ctx-val">32,000 tokens</span>
        </div>
        <input type="range" class="calc-slider" id="ctx-slider" min="4000" max="128000" step="4000" value="32000" oninput="updateSliders(); calculateKV();">
      </div>
      <!-- Concurrency -->
      <div class="control-group">
        <div class="control-label">
          Concurrency / Batch Size
          <span class="control-val" id="batch-val">1 concurrent request</span>
        </div>
        <input type="range" class="calc-slider" id="batch-slider" min="1" max="64" step="1" value="1" oninput="updateSliders(); calculateKV();">
      </div>
      <!-- Quantization Preset -->
      <div class="control-group">
        <label class="control-label">Quantization Preset</label>
        <select class="calc-select" id="preset-select" onchange="calculateKV()">
          <option value="1.0">Uncompressed Baseline (FP16) — 1.0x</option>
          <option value="0.385">turboquant_k8v4 (8-bit/4-bit) — 2.6x reduction (+1.17% PPL)</option>
          <option value="0.263" selected>turboquant_4bit_nc (4-bit Balanced) — 3.8x reduction (+2.71% PPL)</option>
          <option value="0.204">turboquant_3bit_nc (3-bit Extreme) — 4.9x reduction (+20.59% PPL)</option>
        </select>
      </div>
    </div>
    <!-- Outputs (Right Side) -->
    <div class="calc-outputs">
      <!-- VRAM Readouts -->
      <div class="readout-group">
        <div class="readout-card">
          <div class="readout-title">Baseline VRAM</div>
          <div class="readout-val" id="baseline-vram">4.60 GB</div>
        </div>
        <div class="readout-card">
          <div class="readout-title">Compressed VRAM</div>
          <div class="readout-val compressed" id="compressed-vram">1.21 GB</div>
        </div>
      </div>
      <!-- Chart -->
      <div class="chart-container">
        <div class="chart-bar-group">
          <div class="chart-bar-label">
            <span>FP16 Baseline</span>
            <span id="chart-base-label">4.60 GB</span>
          </div>
          <div class="chart-bar-track">
            <div class="chart-bar-fill baseline" id="chart-base-fill" style="width: 100%"></div>
          </div>
        </div>
        <div class="chart-bar-group">
          <div class="chart-bar-label">
            <span>Compressed Format</span>
            <span id="chart-comp-label">1.21 GB</span>
          </div>
          <div class="chart-bar-track">
            <div class="chart-bar-fill compressed" id="chart-comp-fill" style="width: 26%"></div>
          </div>
        </div>
      </div>
      <!-- Dynamic Status Insight Card -->
      <div class="insight-card" id="insight-card">
        <span class="insight-icon" id="insight-icon">⚡</span>
        <div class="insight-text" id="insight-text">
          Fits smoothly on consumer-grade edge hardware (Apple Silicon / Single RTX 4090).
        </div>
      </div>
    </div>
  </div>
  <script>
    (function() {
      const container = document.getElementById('calculator-widget');
      const ctxSlider = container.querySelector('#ctx-slider');
      const batchSlider = container.querySelector('#batch-slider');
      const ctxVal = container.querySelector('#ctx-val');
      const batchVal = container.querySelector('#batch-val');
      const presetSelect = container.querySelector('#preset-select');
      const baselineVram = container.querySelector('#baseline-vram');
      const compressedVram = container.querySelector('#compressed-vram');
      const chartBaseLabel = container.querySelector('#chart-base-label');
      const chartCompLabel = container.querySelector('#chart-comp-label');
      const chartBaseFill = container.querySelector('#chart-base-fill');
      const chartCompFill = container.querySelector('#chart-comp-fill');
      const insightCard = container.querySelector('#insight-card');
      const insightIcon = container.querySelector('#insight-icon');
      const insightText = container.querySelector('#insight-text');
      window.updateSliders = function() {
        ctxVal.textContent = Number(ctxSlider.value).toLocaleString() + ' tokens';
        batchVal.textContent = batchSlider.value + (batchSlider.value === '1' ? ' concurrent request' : ' concurrent requests');
      };
      window.calculateKV = function() {
        const modelSize = container.querySelector('input[name="model-size"]:checked').value;
        const contextWindow = parseFloat(ctxSlider.value);
        const concurrency = parseFloat(batchSlider.value);
        const presetFactor = parseFloat(presetSelect.value);
        let baseline = 0;
        if (modelSize === '8B') {
          baseline = (contextWindow / 32000) * 4.6 * concurrency;
        } else if (modelSize === '70B') {
          baseline = (contextWindow / 128000) * 140 * concurrency;
        }
        const compressed = baseline * presetFactor;
        baselineVram.textContent = baseline.toFixed(2) + ' GB';
        compressedVram.textContent = compressed.toFixed(2) + ' GB';
        chartBaseLabel.textContent = baseline.toFixed(2) + ' GB';
        chartCompLabel.textContent = compressed.toFixed(2) + ' GB';
        const maxVal = Math.max(baseline, 1);
        const basePercentage = (baseline / maxVal) * 100;
        const compPercentage = (compressed / maxVal) * 100;
        chartBaseFill.style.width = basePercentage + '%';
        chartCompFill.style.width = compPercentage + '%';
        insightCard.className = 'insight-card';
        if (compressed <= 16) {
          insightIcon.textContent = '⚡';
          insightText.textContent = 'Fits smoothly on consumer-grade edge hardware (Apple Silicon / Single RTX 4090).';
        } else if (compressed > 16 && compressed <= 80) {
          insightCard.classList.add('warning');
          insightIcon.textContent = '🔮';
          insightText.textContent = 'Consolidates workload onto a single enterprise accelerator (NVIDIA H100 / AMD MI300X).';
        } else {
          insightCard.classList.add('danger');
          insightIcon.textContent = '🚨';
          insightText.textContent = 'Requires a multi-GPU infrastructure cluster with high-speed interconnects.';
        }
      };
      // Run initially
      updateSliders();
      calculateKV();
    })();
  </script>
</div>

---

## Analytical Conclusions

The introduction of TurboQuant represents a major structural shift in the design of real-time inference infrastructure<sup>21</sup>. By applying high-dimensional geometric rotations, the algorithm transforms highly irregular key-value distributions containing severe activation outliers into predictable, uniform distributions<sup>2</sup>. This mathematical preconditioning allows systems to compress the KV cache down to ultra-low bit-widths without using per-model calibration data, establishing a new operational standard for enterprise serving engines<sup>3</sup>.

However, the real-world deployment of TurboQuant highlights a clear tension between academic theory and practical systems engineering<sup>15</sup>. While the original Google Research paper proposed a dual-stage pipeline (PolarQuant and QJL) to mathematically eliminate inner-product bias, hardware implementations have universally deprecated the QJL stage<sup>3</sup>.

In practical multi-turn serving scenarios, the 1-bit QJL residual correction introduces high computational overhead and adds variance that is amplified by the attention mechanism's softmax function, degrading generation quality<sup>15</sup>. Consequently, the industry has standardized on an optimized, MSE-only quantization approach<sup>15</sup>.

Additionally, the adoption of TurboQuant is highly dependent on system-level hardware optimizations<sup>10</sup>. While the compression of the KV cache delivers massive VRAM savings and speeds up prefill times (TTFT), the computational cost of on-the-fly dequantization during decoding can degrade throughput on standard hardware architectures<sup>10</sup>.

To overcome this decode bottleneck, the deployment of specialized, low-level kernels (such as Triton, native HIP, and FlyDSL) is highly critical<sup>22</sup>. By leveraging hardware-specific optimizations (such as fast Walsh-Hadamard transforms, shared-memory staging, and in-register operations), these advanced kernels successfully mitigate decompression latency<sup>22</sup>. This brings the throughput of compressed serving systems within 5% of unquantized baselines, offering a highly effective path for running massive context lengths on resource-constrained hardware<sup>2</sup>.

---

### Works Cited

1. "What Is Google TurboQuant and What Does It Mean for Open Source Inference?", *Deep Infra*, https://deepinfra.com/blog/google-turboquant
2. "Google's TurboQuant Compression May Support Faster Inference, Same Accuracy on Less Capable Hardware", *InfoQ*, https://www.infoq.com/news/2026/04/turboquant-compression-kv-cache/
3. "TurboQuant", *Wikipedia*, https://en.wikipedia.org/wiki/TurboQuant
4. "Kitty: Accurate and Efficient 2-bit KV Cache Quantization with Dynamic Channel-wise Precision Boost", *arXiv*, https://arxiv.org/pdf/2511.18643
5. "KIVI: A Tuning-Free Asymmetric 2bit Quantization for KV Cache", *GitHub*, https://raw.githubusercontent.com/mlresearch/v235/main/assets/liu24bz/liu24bz.pdf
6. "TurboQuant in QVAC SDK 0.12.0: KV-cache quantization for production local AI", *Tether.io*, https://qvac.tether.io/blog/turboquant-in-qvac-sdk-0-12-0-kv-cache-quantization-for-production-local-ai/
7. "TurboQuant: Redefining AI efficiency with extreme compression", *Google Research*, https://research.google/blog/turboquant-redefining-ai-efficiency-with-extreme-compression/
8. "TurboQuant.net - Independent TurboQuant Analysis", https://turboquant.net/
9. "Beyond the TurboQuant-RaBitQ Debate: Why Vector Quantization Matters for AI Infrastructure Costs", *Milvus Medium*, https://milvusio.medium.com/beyond-the-turboquant-rabitq-debate-why-vector-quantization-matters-for-ai-infrastructure-costs-6334f01b58f4
10. "turboquant-vllm", *GitHub*, https://github.com/Alberto-Codes/turboquant-vllm
11. "Compress the KV Cache with TurboQuant and Haystack", *Haystack Tutorials*, https://haystack.deepset.ai/tutorials/49_turboquant_quantization_with_huggingface
12. "Effective KV Compression with TurboQuant", *MachineLearningMastery.com*, https://machinelearningmastery.com/effective-kv-compression-with-turboquant/
13. "PolarQuant: Quantizing KV Caches with Polar Transformation", *arXiv*, https://arxiv.org/abs/2502.02617
14. "Google's TurboQuant: The Compression Breakthrough That Could Reshape LLM Infrastructure", *Towards AI*, https://pub.towardsai.net/googles-turboquant-the-compression-breakthrough-that-could-reshape-llm-infrastructure-c09d68017567
15. "turboquant", *GitHub*, https://github.com/back2matching/turboquant
16. "TurboQuant in Qdrant", *Qdrant Articles*, https://qdrant.tech/articles/turboquant-quantization/
17. "D: thoughts on the controversy about Google's new paper?", *r/MachineLearning - Reddit*, https://www.reddit.com/r/MachineLearning/comments/1s7m7rn/d_thoughts_on_the_controversy_about_googles_new/
18. "TurboQuant and RaBitQ: What the Public Story Gets Wrong", *DEV Community*, https://dev.to/gaoj0017/turboquant-and-rabitq-what-the-public-story-gets-wrong-1i00
19. "Hurwitz Quaternion Multiplicative Quantization for KV Cache Compression", *arXiv*, https://arxiv.org/pdf/2605.27646
20. "turboquant", *vLLM Documentation*, https://docs.vllm.ai/en/latest/api/vllm/model_executor/layers/quantization/turboquant/
21. "Add TurboQuant Support for KV Cache Quantization", *vLLM Issues - GitHub*, https://github.com/vllm-project/vllm/issues/38171
22. "Productionizing TurboQuant on AMD GPUs for KV-Cache-Bound LLM Inference", *AMD ROCm Blogs*, https://rocm.blogs.amd.com/artificial-intelligence/turboquant-vllm-agentic/README.html
23. "turboquant-plus-rs", *Lib.rs*, https://lib.rs/crates/turboquant-plus-rs
24. "Implementing and benchmarking KV cache compression methods for LLM inference in Triton", *GitHub*, https://github.com/Mog9/KV-Compression
25. "Google Research - TurboQuant: Redefining AI efficiency with extreme compression", *r/LocalLLaMA - Reddit*, https://www.reddit.com/r/LocalLLaMA/comments/1s2su28/google_research_turboquant_redefining_ai/
26. "vllm-turboquant", *GitHub*, https://github.com/mitkox/vllm-turboquant
27. "KIVI: A Tuning-Free Asymmetric 2bit Quantization for KV Cache", *Liner*, https://liner.com/review/kivi-tuningfree-asymmetric-2bit-quantization-for-kv-cache
28. "TurboQuant: Online Vector Quantization with Near-optimal Distortion Rate", *ICLR 2026*, https://iclr.cc/virtual/2026/poster/10006985
29. "Here are my KV cache quantization benchmarks", *r/LocalLLaMA - Reddit*, https://www.reddit.com/r/LocalLLaMA/comments/1thu6os/here_are_my_kv_cache_quantization_benchmarks/
