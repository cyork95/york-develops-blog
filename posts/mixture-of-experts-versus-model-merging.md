---
title: "Architectural Syntheses in High-Performance Language Model Infrastructure: Mixture of Experts versus Model Merging"
date: 2026-06-24
description: "A comprehensive deep dive comparing Mixture of Experts (MoE) and Model Merging, mapping their routing algorithms, weight-space merging techniques, upcycling strategies (FrankenMoEs), and hardware deployment profiles."
tags: [mixture-of-experts, model-merging, system-design, llamacpp, vllm, deepseek, mergekit, machine-learning]
---

As foundation models scale to hundreds of billions of parameters, deep learning engineers and systems architects face a critical trade-off: how to incorporate diverse, specialized capabilities into a single model without incurring unsustainable training and inference overhead<sup>1</sup>. This challenge has divided the open-source community into two primary architectural camps: Mixture of Experts (MoE) and Model Merging<sup>1</sup>.

MoE architectures preserve specialized parameter spaces at runtime by routing tokens dynamically to isolated expert sub-networks, but they require substantial High-Bandwidth Memory (HBM) and Video Random Access Memory (VRAM) to hold the entire parameter ensemble<sup>3</sup>. Conversely, Model Merging collapses specialized parameter spaces directly within weight space without additional training, producing a standard dense model with high compute efficiency but exposing the system to parameter interference and capability degradation<sup>6</sup>.

This report provides a technical analysis of both paradigms, mapping their mathematical frameworks, systems-level optimization constraints, hybrid upcycling implementations, and hardware deployment trade-offs.

---

## Architectural Mechanics of Mixture of Experts

The Mixture of Experts paradigm scales total model capacity while keeping inference computation manageable<sup>5</sup>. This is achieved by substituting the conventional monolithic Feed-Forward Network (FFN) in a Transformer block with a sparse layer containing multiple specialized experts<sup>9</sup>.

### Routing and Mathematical Frameworks

Let $x \in \mathbb{R}^d$ represent the input token embedding at a given Transformer layer. The gating network, or router, is defined by a parameter matrix $W_g \in \mathbb{R}^{N \times d}$, where $N$ is the total number of experts<sup>12</sup>. The router computes unnormalized routing logits $h(x) = W_g x$<sup>4, 91</sup>. To select the top-$k$ experts while ensuring routing sparsity, a selective softmax activation is applied<sup>9</sup>:

$$G(x)_i = \text{Softmax}(\text{KeepTopK}(h(x), k))_i = \begin{cases} 
\frac{e^{h(x)_i}}{\sum_{j \in \mathcal{T}} e^{h(x)_j}} & \text{if } i \in \mathcal{T} \\ 
0 & \text{if } i \notin \mathcal{T} 
\end{cases}$$

where $\mathcal{T}$ represents the indices of the $k$ largest logits in $h(x)$<sup>9</sup>. The final token representation $y$ is computed as the weighted linear combination of the active experts' forward passes<sup>12</sup>:

$$y = \sum_{i \in \mathcal{T}} G(x)_i E_i(x)$$

For example, Mixtral 8x7B utilizes a Top-2 routing scheme ($k = 2$) over $N = 8$ total experts, activating roughly 12.9B parameters out of a total 46.7B parameter budget per token<sup>1</sup>. Rumors surrounding GPT-4 suggest a larger formulation: an eight-way MoE utilizing approximately 220B parameters per expert, yielding a total parameter footprint of 1.7 trillion<sup>14</sup>.

### DeepSeekMoE: Fine-Grained Specialization

Standard GShard-style MoE models suffer from representation overlap and routing redundancy<sup>9</sup>. To maximize expert specialization, DeepSeekMoE introduces two main structural modifications<sup>15</sup>:

1. **Fine-Grained Expert Segmentation**: An expert's intermediate hidden dimension is divided by a factor of $m$. By increasing the number of experts to $m \cdot N$ while reducing each expert's individual hidden capacity to $1/m$, the network enables a more flexible combination of activated parameters under a constant computational budget<sup>15</sup>.
2. **Shared Expert Isolation**: A set of $N_s$ experts is isolated and configured to remain always active for every token<sup>9</sup>. These shared experts capture and consolidate general background knowledge, freeing the remaining $N_r$ routed experts to specialize in distinct, non-overlapping semantic distributions<sup>9</sup>.

The overall output calculation $y_l$ for token $x$ in layer $l$ is formalized as<sup>9</sup>:

$$y_l = \sum_{i=1}^{N_s} E_i^s(x) + \sum_{j \in \mathcal{U}} g_{j}(x) E_j^r(x)$$

where $E_i^s(x)$ represents the $i$-th shared expert, $E_j^r(x)$ represents the $j$-th routed expert, $\mathcal{U}$ is the set of activated routed experts, and $g_j(x)$ is the dynamically computed gating coefficient<sup>9</sup>. For a model like DeepSeek-V3, this setup coordinates 256 routed experts alongside a dedicated shared expert, activating 37B parameters out of a 671B parameter total footprint<sup>13</sup>.

### Training Stability and Load Balancing

Because the gating network is trained via backpropagation, routing decisions can form a positive feedback loop<sup>12</sup>. The router tends to favor a small subset of experts, leaving the remaining sub-networks underutilized<sup>12</sup>. This "expert collapse" is typically addressed using specialized regularizers and training configurations<sup>12</sup>.

#### Load-Balancing Auxiliary Loss

The standard auxiliary loss penalizes uneven token distribution across experts<sup>12</sup>. For a batch of $T$ tokens and $N$ experts, the regularizer minimizes the variance of routing probabilities<sup>11</sup>:

$$L_{\text{aux}} = N \sum_{i=1}^N f_i \cdot P_i$$

where $f_i$ is the fraction of tokens routed to expert $i$:

$$f_i = \frac{1}{T} \sum_{t=1}^T \mathbb{I}(\text{Router}(x_t) \text{ selects expert } i)$$

and $P_i$ is the average gating probability of expert $i$ across the batch<sup>11</sup>:

$$P_i = \frac{1}{T} \sum_{t=1}^T G(x_t)_i$$

This loss term is added to the language modeling objective $L_{\text{LM}}$ with a scaling factor $\alpha$<sup>12</sup>:

$$L_{\text{total}} = L_{\text{LM}} + \alpha L_{\text{aux}}$$

#### Router z-loss

Introduced in ST-MoE, the router $z$-loss stabilizes FP16 training by penalizing large logits entering the softmax function, which reduces numerical roundoff errors<sup>12</sup>. This loss is formulated as<sup>21</sup>:

$$L_z = \frac{1}{B} \sum_{i=1}^B \left( \ln \sum_{j=1}^N e^{h(x_i)_j} \right)^2$$

Additionally, Switch Transformers utilize selective precision, training the experts in bfloat16 while keeping routing, attention, and normalization calculations in FP32 to ensure training stability without degrading final generation quality<sup>21</sup>.

#### Auxiliary-Loss-Free Load Balancing (ALF-LB)

Static auxiliary losses force a trade-off: if $\alpha$ is too high, the router prioritizes uniform allocation over routing quality, hurting model capability; if $\alpha$ is too low, routing collapse occurs<sup>11</sup>. DeepSeek-V3 addresses this by updating an adaptive expert bias vector $b$ during training<sup>19</sup>:

$$s_i = \text{Softmax}(W_g x + b_i)_i$$

At the end of each training step, the bias is adjusted based on expert token load relative to average demand<sup>11</sup>:

$$b_i \leftarrow b_i + \gamma (\bar{f} - f_i)$$

where $f_i$ is the token load of expert $i$, $\bar{f}$ is the mean load across all experts, and $\gamma$ is the step size<sup>11</sup>. This formulation casts load balancing as a primal-dual optimization of a linear programming assignment problem, maintaining routing balance without altering the primary semantic loss landscape<sup>11</sup>.

---

## The Algorithmic Landscape of Model Merging

Model Merging combines the parameters of multiple trained neural networks into a single unified model without additional training<sup>2</sup>. This approach leverages Linear Mode Connectivity (LMC), which suggests that models fine-tuned from a shared pretrained initialization reside within the same low-loss basin<sup>2</sup>. Naive parameter averaging across independently trained networks is typically obstructed by permutation symmetries<sup>25</sup>.

For a network with $L$ hidden layers of width $W$, there exist $(W!)^L$ equivalent parameterizations, creating a highly non-convex loss landscape<sup>25</sup>. While independently trained networks must be aligned using optimal transport, Hungarian assignment, or activation-distribution matching to resolve permutation ambiguities, shared initialization breaks this symmetry<sup>25</sup>. Optimization trajectories beginning from a common checkpoint ($\theta_0$) implicitly preserve hidden unit correspondences, allowing direct parameter-space operations<sup>2</sup>.

### Weight Space Merging Algorithmic Space

Several specialized algorithms have been developed to combine task-specific parameters while minimizing capability loss.

#### Model Soups

Model Soups combine multiple models trained on the same dataset with different hyperparameters<sup>6</sup>.

- **Uniform Soups**: Average all fine-tuned checkpoints equally:
  $$\theta_{\text{uniform}} = \frac{1}{M} \sum_{i=1}^M \theta_i$$
- **Greedy Soups**: Rank checkpoints by validation accuracy and sequentially average them into the active pool<sup>6</sup>. The updated checkpoint is retained only if validation performance improves, which helps prevent destructive parameter interference<sup>6</sup>.

#### Spherical Linear Interpolation (SLERP)

Traditional linear interpolation of high-dimensional weight vectors can shrink the magnitude of the merged vector, reducing weight scale and representation capacity<sup>27</sup>. SLERP preserves geometric properties by interpolating along a spherical path on a high-dimensional hypersphere<sup>27</sup>. For two parameter vectors $\theta_1$ and $\theta_2$, let $\phi$ represent the angle between them<sup>27</sup>:

$$\phi = \arccos\left(\frac{\theta_1 \cdot \theta_2}{\|\theta_1\| \|\theta_2\|}\right)$$

SLERP is computed as<sup>27</sup>:

$$\text{SLERP}(\theta_1, \theta_2; t) = \frac{\sin((1-t)\phi)}{\sin\phi} \theta_1 + \frac{\sin(t\phi)}{\sin\phi} \theta_2$$

While highly effective at smoothly blending two models, SLERP is mathematically limited to pairwise merges<sup>6</sup>.

#### Task Arithmetic

Task Arithmetic treats fine-tuning trajectories as directional vectors (task vectors) within the weight space<sup>6</sup>. Let $\theta_0$ be the base pretrained model, and $\theta_i$ be a model fine-tuned for task $i$<sup>28</sup>. The task vector is defined as<sup>6</sup>:

$$\tau_i = \theta_i - \theta_0$$

Multiple task vectors are linearly combined and added back to the base model using a tuning parameter $\lambda$<sup>6</sup>:

$$\theta_{\text{merged}} = \theta_0 + \lambda \sum_{i=1}^T \tau_i$$

While computationally simple, recent studies indicate that Task Arithmetic is often the only approach that consistently achieves constructive interference across diverse LLM benchmarks<sup>32</sup>.

#### TIES-Merging (Trim, Elect Sign, and Merge)

When merging multiple task vectors, simple linear combination often fails due to redundant parameter updates (small updates acting as noise) and sign conflicts (opposing directional updates that cancel each other out)<sup>33</sup>. TIES-Merging addresses these issues through a three-step protocol<sup>33</sup>:

1. **Trim**: For each task vector $\tau_i$, only the top $k$\% of parameters with the highest absolute magnitudes are retained, setting the remaining parameters to zero to produce a sparsified task vector $\hat{\tau}_i$<sup>35</sup>.
2. **Elect Sign**: The dominant sign direction $s_j \in \{-1, 1\}$ is elected for each parameter position $j$ by taking the sign of the sum across all trimmed task vectors<sup>35</sup>:
   $$s_j = \text{sign}\left(\sum_{i=1}^M \hat{\tau}_{i,j}\right)$$
3. **Disjoint Merge**: Only the updates that agree with the elected sign $s_j$ are retained<sup>33</sup>. The final merged value is computed as the disjoint mean over the index set $\mathcal{A}_j = \{ i \mid \text{sign}(\hat{\tau}_{i,j}) = s_j \}$<sup>33</sup>:
   $$\tau_{\text{merged},j} = \frac{1}{|\mathcal{A}_j|} \sum_{i \in \mathcal{A}_j} \hat{\tau}_{i,j}$$

The merged parameters are then added to the base model: $\theta_{\text{merged}} = \theta_0 + \lambda \tau_{\text{merged}}$<sup>35</sup>.

#### DARE (Drop and Rescale)

DARE is a sparsification preprocessing strategy that reduces parameter interference by randomly zeroing out delta parameters and scaling the survivors to maintain the expected value of the weight distributions<sup>36</sup>. Given a drop rate $p$, DARE applies a Bernoulli mask $m$ (where each element is 1 with probability $1-p$) to each parameter of the task vector $\tau_i$<sup>28</sup>. The sparsified and rescaled task vector $\tau_i^{\text{dare}}$ is defined as<sup>28</sup>:

$$\tau_i^{\text{dare}} = \frac{m \odot \tau_i}{1 - p}$$

By eliminating up to 90% or even 99% of delta values, DARE reduces update density and mitigates parameter interference before final merging<sup>36</sup>.

#### DELLA-Merging

DELLA-Merging improves upon TIES and DARE by replacing uniform random dropping with MagPrune, a stochastic magnitude-based pruning strategy<sup>39</sup>. MagPrune ranks delta parameters by magnitude and assigns a variable dropout probability $p_j$ to each parameter, where smaller parameter updates have a higher probability of being dropped<sup>39</sup>:

$$p_j = 1 - \frac{|\tau_{i,j}|}{\max_k |\tau_{i,k}|}$$

Parameters that survive the pruning step are rescaled by $1/(1-p_j)$ to maintain representation stability, resulting in smoother merges than uniform pruning<sup>39</sup>.

#### Model Stock

Model Stock computes optimal interpolation weights using the geometric properties of the weight space<sup>6</sup>. Assuming fine-tuning trajectories map to a low-dimensional manifold, Model Stock calculates the "perpendicular foot" from the center of the weight distribution ($\bar{\theta}$) to the plane spanned by the base model ($\theta_0$) and two fine-tuned models ($\theta_1, \theta_2$)<sup>35</sup>. This geometry yields an optimal interpolation ratio $t$ dependent on the angle $\alpha$ between the fine-tuned task updates<sup>35</sup>:

$$t = \frac{\cos\alpha}{1 + \cos\alpha}$$

The resulting merged weight is computed as<sup>35</sup>:

$$\theta_{\text{merged}} = \theta_0 + t(\bar{\theta} - \theta_0)$$

This geometric formulation generalizes to $M$ models, minimizing activation drift during interpolation<sup>25</sup>.

| Method | Drop / Sparsification Criteria | Rescaling Factor | Sign Conflict Resolution | Key Use Cases & Strengths |
| :--- | :--- | :--- | :--- | :--- |
| **Linear / Soup**<sup>27, 42</sup> | None | None | None | Simple checkpoints trained on identical tasks |
| **SLERP**<sup>27, 29</sup> | None | Trigonometric scaling | None | High-quality pairwise model blending |
| **Task Arithmetic**<sup>6, 27</sup> | None | Constant $\lambda$ | None | Combining lightweight skill deltas |
| **TIES-Merging**<sup>33, 35</sup> | Hard threshold (top $k$\% magnitude) | Constant $\lambda$ | Sign consensus & disjoint mean | Large multi-task merges with high conflict potential |
| **DARE**<sup>36, 37</sup> | Random uniform (Bernoulli mask $m$) | $\frac{1}{1-p}$ | None (pre-processing plug-in) | Parameter compression (up to 99% drop rate) |
| **DELLA-Merging**<sup>39, 40</sup> | Stochastic magnitude-based (MagPrune) | $\frac{1}{1-p_j}$ (variable) | Sign consensus | Highly specialized domain merges (Math, Code) |
| **Model Stock**<sup>35, 42</sup> | None | Geometric projection | None | Dataless weight-space manifold optimization |

### Advanced Merging Paradigms

* **WUDI-Merging**: This data-free optimization method minimizes activation shifts directly<sup>43</sup>. Under the assumption that task vectors form approximate linear subspaces of the model's activation space, WUDI-Merging uses SGD with the Adam optimizer to optimize merged parameters, resolving parameter conflicts without raw data<sup>44</sup>.
* **EMR-Merging (Elect, Mask, & Rescale-Merging)**: This method chooses a representative base checkpoint and constructs extremely lightweight, task-specific parameter masks and rescalers<sup>31</sup>. At inference time, these modulators are dynamically applied to the base parameter space to run individual tasks, achieving a modular, tuning-free architecture<sup>31</sup>.
* **IP-Merging**: This approach identifies specialized parameters (such as mathematical reasoning units) and uses singular value decomposition (SVD) to project them into the subspace of a broader multimodal model, aligning heterogeneous representation spaces<sup>30</sup>.
* **Curriculum Model Merging (CMM)**: This method targets domain-specific models (such as chemical LLMs) that exhibit highly imbalanced task distributions<sup>46</sup>. It sequentially integrates models using a structured performance-aware curriculum, preventing dominant task representations from diluting sparse domain updates<sup>46</sup>.
* **HM3 (Hierarchical Model Merging)**: This framework formulates model merging as a bilevel optimization problem spanning both the parameter space (using weight interpolation) and the architectural space (using reinforcement learning to search for optimal layer routing paths across different models)<sup>47</sup>.

---

## Alignment Dynamics, Continual Learning, and Evaluation Metrics

Model merging is increasingly used to address multi-objective optimization problems, such as aligning LLMs across the dimensions of Helpfulness, Honesty, and Harmlessness (the 3H alignment problem)<sup>48</sup>. Rather than mixing datasets at training time—which can lead to conflicting optimization gradients and catastrophic forgetting—practitioners can fine-tune specialized models on individual alignment objectives and merge them afterward<sup>48</sup>.

```text
                [ Pretrained Foundation Model \theta_0 ]
                                   |
           +-----------------------+-----------------------+
           |                       |                       |
           v                       v                       v
 [ Helpfulness Tuning ]    [ Honesty Tuning ]     [ Harmlessness Tuning ]
       (\theta_H)              (\theta_O)              (\theta_S)
           \                       |                       /
            +----------------------+----------------------+
                                   | (Parameter-Level Fusion via RESM)
                                   v
                      [ 3H-Aligned Unified LLM ]
```

### 3H Alignment Optimization and the RESM Algorithm

Traditional multi-objective data mixing frequently experiences gradient interference when conflicting data signals pollute the optimization space<sup>48</sup>. Parameter-level model merging bypasses these data-level conflicts but introduces architectural challenges, including Preference Noise Accumulation and Layer-wise Sparsity Mismatch<sup>48</sup>. Because different Transformer layers contribute unequally to different alignment objectives, applying a uniform merging coefficient across all layers can degrade performance<sup>48</sup>.

To address these layer-wise conflicts, the RESM (Reweighting-Enhanced task Singular Merging) algorithm uses SVD to analyze task updates<sup>30</sup>. RESM filters out preference noise in the lower singular values and applies an adaptive, outlier-aware weighting scheme to scale parameter updates layer-by-layer<sup>48</sup>. This approach balances multi-objective alignment, outperforming standard data mixing by 10% to 15% and traditional weight merging by 5% to 8%<sup>48</sup>.

### Sequential Merging and Continual Learning

Model merging also provides a low-compute paradigm for sequential knowledge acquisition in continual learning<sup>51</sup>. Techniques like MagMax enable models to learn successive tasks without catastrophic forgetting<sup>51</sup>.

MagMax sequentially merges task-specific updates into foundation checkpoints by identifying and preserving the maximum magnitude updates across sequential training runs<sup>51</sup>. This maintains representation stability across tasks without requiring continuous access to historical raw training data<sup>45</sup>.

Within this landscape, the FUSE taxonomy categorizes model fusion methods across three primary levels of integration<sup>45</sup>:

1. **Parameter-Level Fusion**: Operates directly on the weights of constituent models (e.g., SLERP, TIES, DELLA, Model Stock)<sup>42</sup>.
2. **Representation-Level Fusion**: Analyzes and aligns internal hidden activations or representation spaces during intermediate processing<sup>25</sup>.
3. **Behavior-Level Fusion**: Merges the output distributions or behaviors of multiple models, often using knowledge distillation<sup>45</sup>.

### Benchmark Contamination and Evaluation Validity

While merged models have achieved high rankings on open benchmarks like the Open LLM Leaderboard, evaluations can be affected by data contamination<sup>1</sup>. When combining numerous expert models, if any constituent expert has been fine-tuned on datasets that overlap with benchmark test sets (such as MMLU or GSM8K), this information leakage is propagated and amplified in the merged model<sup>1</sup>.

This data contamination can artificially inflate benchmark scores, creating a discrepancy between automated benchmark metrics and actual generation quality<sup>1</sup>. Consequently, blind human evaluation platforms like the LMSYS Chatbot Arena—which select and evaluate models via randomized side-by-side comparisons—are increasingly used to verify true capability improvements<sup>1</sup>.

---

## Upcycling and the Hybrid Frontier: FrankenMoEs

Rather than choosing between the clean boundaries of MoEs and the resource efficiency of Model Merging, practitioners can utilize a hybrid approach: FrankenMoEs (or MoErges)<sup>1</sup>. Enabled by tools like Arcee's MergeKit library, FrankenMoEs construct sparse MoE models by upcycling existing, independently fine-tuned dense models into a unified MoE block, completely bypassing the massive compute costs of training an MoE from scratch<sup>52</sup>.

```text
                 [ Selected Specialized 7B Checkpoints ]
                  (AlphaMonarch, CodeNinja, Kunoichi)
                                   |
                  +----------------+----------------+
                  | (Normalize & Collapsed Non-FFN) |
                  v                                 v
        [ Collapsed Base Layers ]             [ Individual Expert FFNs ]
        (Attention, Normalization)            (Kept as isolated experts)
                  \                                 /
                   +----------------+---------------+
                                    | (Construct Gating Network)
                                    v
                        [ Upcycled FrankenMoE ]
```

### Upcycling Mechanics and Router Initialization

To construct a FrankenMoE, a base dense model is selected as the architectural skeleton<sup>52</sup>. Specialized checkpoints sharing this base architecture (e.g., a coding expert, a mathematical reasoning expert, and an instruction-following expert) are gathered<sup>52</sup>.

The non-FFN components (self-attention layers, layer normalization, and embeddings) are collapsed into a single set of parameters using weight averaging or SLERP<sup>54</sup>. However, the FFN blocks across the constituent models are kept separate and mapped to the expert slots of a newly constructed sparse MoE layer<sup>1</sup>.

Because these parent models were trained independently, the model does not contain a pre-trained gating network<sup>52</sup>. MergeKit supports three primary strategies for initializing the router weights ($W_g$) without training<sup>52</sup>:

* **Random**: Gating weights are initialized randomly<sup>52</sup>. This approach often routes tokens uniformly without semantic awareness, requiring post-merge Supervised Fine-Tuning (SFT) to establish specialized pathways<sup>52</sup>.
* **Cheap Embed**: This method uses the raw embeddings of the input tokens directly, applying a constant, computationally inexpensive linear transformation across all layers<sup>52</sup>. This provides basic semantic routing suitable for execution on less powerful hardware<sup>52</sup>.
* **Hidden**: Gating representations of positive and negative prompt templates are extracted from the final layer of the base model, averaged, and normalized<sup>52</sup>. This aligns the router's decision boundaries with the semantic subspaces of the respective experts<sup>52</sup>.

### Case Study: Beyonder-4x7B

The viability of this upcycling strategy is demonstrated by the Beyonder-4x7B series<sup>55</sup>. Built using the `mixtral` branch of MergeKit via `LazyMergekit`, Beyonder-4x7B-v3 upcycles four distinct 7B expert checkpoints into a 24.2B parameter sparse MoE model<sup>52</sup>:

1. `mlabonne/AlphaMonarch-7B` (General-purpose Chat)<sup>59</sup>
2. `beowolx/CodeNinja-1.0-OpenChat-7B` (Code Generation)<sup>52</sup>
3. `mlabonne/NeuralDaredevil-7B` (Mathematical Reasoning)<sup>52</sup>
4. `SanjiWatsuki/Kunoichi-DPO-v2-7B` (Creative/Roleplay)<sup>52</sup>

By engaging two experts per layer at runtime, the active parameter count during inference is limited to approximately 12B, delivering the compute speed of a 12B dense model while leveraging a 24.2B parameter database<sup>56</sup>.

| Model | Total Params | Active Params | AGIEval | GPT4All | TruthfulQA | Bigbench | Average |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **AlphaMonarch-7B**<sup>59</sup> | 7B | 7B | 45.37 | 77.01 | 78.39 | 50.20 | 62.74 |
| **NeuralDaredevil-7B**<sup>52</sup> | 7B | 7B | 45.23 | 76.20 | 67.61 | 48.52 | 59.39 |
| **Kunoichi-DPO-v2-7B**<sup>52</sup> | 7B | 7B | 44.79 | 75.05 | 65.68 | 47.65 | 58.29 |
| **CodeNinja-1.0-7B**<sup>52</sup> | 7B | 7B | 39.98 | 71.77 | 48.73 | 40.92 | 50.35 |
| **Beyonder-4x7B-v2**<sup>52</sup> | 24.2B | 12B | 45.29 | 75.95 | 60.86 | 46.40 | 57.13 |
| **Beyonder-4x7B-v3**<sup>59</sup> | 24.2B | 12B | 45.85 | 76.67 | 74.98 | 50.12 | 61.91 |

Beyonder-4x7B-v3 achieves a 61.91 average score across the Nous evaluation suite, outperforming its specialized mathematical, creative, and coding experts<sup>59</sup>. This validates the upcycling theory: while individual experts experience performance degradation outside their fine-tuning distributions, the integrated gating network successfully routes tasks to their respective specialized experts, preserving task performance while maintaining low inference-time compute<sup>52</sup>.

---

## Systems Infrastructure, GPU Kernels, and Offloading Strategies

While the algorithmic performance of sparse MoE models is competitive with larger dense equivalents, deploying them in production exposes a sharp division in hardware utilization<sup>3</sup>. The choice between MoEs and merged models often depends on the underlying memory hierarchy of the serving hardware<sup>3</sup>.

### The Memory-Compute Bottleneck: FLOPs vs. HBM

The primary bottleneck in LLM inference is memory bandwidth<sup>3</sup>. During the autoregressive generation phase, tokens are decoded sequentially<sup>3</sup>. For each generated token, all active model parameters must be retrieved from high-bandwidth memory (HBM) into the processor's registers<sup>3</sup>.

If the memory bandwidth of the GPU is $B_{\text{mem}}$ (in TB/sec) and the active parameter count is $P_{\text{active}}$, the maximum theoretical single-user decoding speed is limited to $B_{\text{mem}} / P_{\text{active}}$ tokens per second<sup>3</sup>.

For a dense model, the active parameter count matches the total model size<sup>3</sup>. For a sparse MoE, the active parameter count is significantly smaller<sup>4</sup>. For example, DeepSeek-V3 has 671B total parameters but activates only 37B per token<sup>19</sup>. At high batch sizes, compute bounds dominate; however, at low batch sizes (common in single-user setups), inference is entirely memory-bound<sup>3</sup>.

Crucially, although an MoE activates only a subset of parameters per token, all parameters must reside in VRAM to allow for potential activation by the router<sup>4</sup>. An MoE model requires a VRAM capacity proportional to its total parameter size ($P_{\text{total}}$), while its decoding throughput per token at low concurrency is proportional to its active parameters ($P_{\text{active}}$)<sup>3</sup>.

To run a 671B model like DeepSeek-V3 in 16-bit precision, a system must accommodate a weight footprint of 1.34 TB, requiring a minimum of 17 H100 (80GB) GPUs simply to fit the weights in HBM<sup>13</sup>. Conversely, a merged dense model collapses these capabilities back into a single, compact parameter space (e.g., 7B or 8B parameters), allowing deployment on consumer-grade edge devices or single GPUs<sup>1</sup>.

### Dynamic Serving Optimizations for MoEs

* **Dropless MoE and Block-Sparse GEMM (MegaBlocks)**: Standard MoE serving engines route tokens to experts using a static capacity factor, which caps the maximum number of tokens a single expert can process in a batch to ensure uniform matrix dimensions for hardware efficiency<sup>12</sup>. Tokens exceeding this capacity are dropped, bypassing expert computation entirely and degrading model performance<sup>12</sup>. To resolve this, MegaBlocks reformulates MoE computation using block-sparse matrix multiplication kernels<sup>62</sup>. By representing uneven token distributions across experts as a single block-sparse matrix operation rather than many small dense GEMMs, MegaBlocks enables parallel expert execution without token dropping<sup>62</sup>. This dropless-MoE (dMoE) architecture accelerates training and inference throughput by up to $1.3\times$ to $2.4\times$ compared to static routing systems like Tutel<sup>62</sup>.
* **Fused Triton Kernels**: Modern serving frameworks like vLLM and SGLang utilize GPU kernels written in Triton to optimize memory access during expert dispatching<sup>65</sup>. A fused MoE kernel executes the up-projection, activation (e.g., SwiGLU), and down-projection operations in a single GPU launch<sup>66</sup>. This eliminates the latency of intermediate tensor round-trips to global GPU memory, which accounts for over 50% of per-token latency in small-batch MoE serving<sup>67</sup>.
* **Routing-Aware Dispatch (RaMP)**: Standard MoE execution engines choose kernel configurations based solely on batch size<sup>67</sup>. However, real-world expert routing is highly skewed, with only 10% to 30% of experts actively processing tokens at any given layer<sup>67</sup>. RaMP (Routing-Aware Dispatch) addresses this by dynamically adjusting the GPU thread block geometry and tiling configurations at runtime based on the router's current expert activation distribution<sup>67</sup>. Paired with a co-designed templated kernel, RaMP delivers a $1.2\times$ to $1.8\times$ end-to-end serving speedup in vLLM over standard Triton baselines<sup>67</sup>.

### External Storage and Offloading Paradigms

* **Llama.cpp and Unified Memory serving**: In hybrid CPU-GPU frameworks like `llama.cpp` using the GGUF model format, the layers of a model are divided between GPU VRAM and standard system RAM<sup>68</sup>. For dense models, this leads to a steep performance penalty: if even 10% of a layer's parameters are offloaded to system RAM, the entire generation loop slows to the speed of the PCIe bus connecting system memory to the GPU<sup>68</sup>. For MoE models, keeping the active gating network and the Key-Value (KV) cache on the GPU is critical<sup>68</sup>. Because only $k$ experts are activated per token, only those specific expert weights need to be transferred to GPU registers<sup>68</sup>. However, if the inactive experts reside in system RAM, they must be streamed over the PCIe bus on-demand, which can still bottleneck generation speeds<sup>68</sup>.
* **Activation-Aware Expert Offloading (MoE-Infinity)**: MoE-Infinity addresses the transfer bottlenecks of hybrid memory systems through three key empirical insights<sup>69</sup>:
  1. *Low Activation Ratios*: Autoregressive decoding exhibits extreme spatial sparsity, with only a small fraction of experts activated per step<sup>69</sup>.
  2. *Group Activation*: Experts tend to activate in correlated, multi-layer groups because they specialize in similar semantic concepts<sup>69</sup>.
  3. *Skewed Expert Reuse*: Autoregressive generation displays temporal locality, where specific experts are heavily reused within a single request<sup>69</sup>.

  Leveraging these properties, MoE-Infinity constructs a sparsity-aware expert cache in GPU VRAM<sup>74</sup>. An independent I/O thread prefetches anticipated experts from host CPU RAM to GPU memory using Direct Memory Access (DMA) over pinned memory, overlapping the transfer latency with the execution of the active attention layers<sup>69</sup>. By dynamically prioritizing the caching of early-layer experts—where router decisions are highly sensitive—MoE-Infinity achieves $4\times$ to $8\times$ latency reductions over un-optimized offloading systems, bringing local MoE performance close to full-GPU serving<sup>73</sup>.

| Feature | Dense Model (Pure VRAM) | Model Merged Dense (Pure VRAM) | Sparse MoE (Full GPU Serving) | Sparse MoE (CPU/GPU Offloading) | FrankenMoE / MoErge (Pure VRAM) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Total Parameter Footprint** | Low to Medium | Low to Medium | Extremely Large | Extremely Large | Medium to High |
| **Active Parameters / Token** | $P_{\text{total}}$ | $P_{\text{total}}$ | $P_{\text{active}} \ll P_{\text{total}}$ | $P_{\text{active}} \ll P_{\text{total}}$ | $P_{\text{active}} \ll P_{\text{total}}$ |
| **Compute Cost (FLOPs)** | High | High | Low | Low | Medium |
| **System VRAM Required** | Low to Medium | Low to Medium | Extremely High | Low (Cached) | Medium to High |
| **Inference Latency (Single User)** | Medium (Bandwidth bound)<sup>3</sup> | Medium (Bandwidth bound)<sup>3</sup> | Extremely Low<sup>4</sup> | High (PCIe bound)<sup>75</sup> | Low to Medium |
| **Serving Throughput (Batching)** | Highly Predictable | Highly Predictable | Extremely High (Group GEMM)<sup>66</sup> | Restricted | High |
| **Primary System Bottleneck** | Memory Bandwidth<sup>3</sup> | Memory Bandwidth<sup>3</sup> | HBM Capacity & Cost<sup>3</sup> | PCIe Bus Throughput<sup>73</sup> | Gating Quality & Cache Hit Rate<sup>69</sup> |

### Structural Selection Matrix for LLM Infrastructure

| Target Hardware Profile | VRAM / RAM Constraints | Primary Workload Focus | Recommended Architectural Paradigm | Key Software & Kernel Optimizations |
| :--- | :--- | :--- | :--- | :--- |
| **GPU Cluster** (e.g., $8\times$ H100 / A100)<sup>13</sup> | Unlimited ($> 640\text{ GB}$) | Multi-tenant SaaS, high batch concurrency<sup>3</sup> | Sparse Mixture of Experts (e.g., DeepSeek-V3, Mixtral-8x22B)<sup>19</sup> | MegaBlocks dMoE<sup>62</sup>, RaMP routing-aware dispatch<sup>67</sup>, vLLM `fused_moe`<sup>66</sup> |
| **Single High-End GPU** (e.g., $1\times$ H100 / RTX 5090)<sup>3</sup> | High ($24\text{ GB}$ to $80\text{ GB}$) | Multi-domain coding, instruction-following<sup>52</sup> | FrankenMoE (MoErge) (e.g., Beyonder-4x7B, customized upcycled models)<sup>52</sup> | LazyMergekit Hidden Router initialization<sup>52</sup>, SGLang / vLLM runtime serving<sup>57</sup> |
| **Edge Workstation / Consumer GPU** (e.g., $1\times$ RTX 4060 / Apple Silicon)<sup>71</sup> | Highly Constrained ($8\text{ GB}$ to $16\text{ GB}$) | Domain-specific local reasoning, factual instruction<sup>39</sup> | Merged Dense Model (e.g., TIES, DELLA, or RESM merged configurations)<sup>33</sup> | DELLA-Merging with MagPrune<sup>39</sup>, RESM for multi-objective alignment<sup>48</sup> |
| **Commodity CPU Only** (No dedicated accelerator)<sup>72</sup> | Highly Constrained ($16\text{ GB}$ to $64\text{ GB}$ System RAM)<sup>77</sup> | Low-cost offline assistants, embedded applications<sup>78</sup> | Quantized Merged Dense (or highly quantized upcycled MoE)<sup>68</sup> | `llama.cpp` server mode<sup>71</sup>, disable BIOS Hyperthreading & NUMA, fast DDR5 RAM<sup>72</sup> |

---

## Analytical Conclusions and Architectural Recommendations

* **For Enterprise SaaS Providers**: Deploy Sparse Mixture of Experts trained with Auxiliary-Loss-Free Load Balancing (ALF-LB)<sup>19</sup>. By adjusting router biases dynamically during training, this approach minimizes load imbalances and maximizes expert specialization without polluting the primary semantic loss landscape<sup>11</sup>. At run-time, utilize serving engines with block-sparse GPU kernels (MegaBlocks) and routing-aware dispatches (RaMP) to maximize hardware efficiency under high batch concurrency<sup>62</sup>.
* **For Moderate VRAM Deployments**: Adopt the FrankenMoE upcycling strategy<sup>52</sup>. By combining specialized open-weight dense checkpoints into a sparse MoE structure via MergeKit, organizations can acquire multi-domain capabilities without incurring retraining costs<sup>52</sup>. Pair this setup with an activation-aware serving framework like MoE-Infinity or FineMoE to prefetch and cache active experts, hiding memory transfer latency behind attention computations<sup>61</sup>.
* **For Edge and Local Deployments**: Utilize Model Merging to preserve a compact, dense parameter footprint<sup>2</sup>. To combine specialized capabilities while minimizing task vector interference, use DELLA-Merging with MagPrune to drop redundant delta updates stochastically while preserving model representation stability<sup>39</sup>. When combining divergent alignment domains (Helpfulness, Honesty, Harmlessness), apply the RESM algorithm to resolve layer-wise sparsity mismatches and prevent preference noise accumulation<sup>48</sup>.

---

## Works Cited

1. Model Merging: Combining Different Fine-Tuned LLMs - Marvik.ai, [https://www.marvik.ai/blog/model-merging-combining-different-fine-tuned-llms](https://www.marvik.ai/blog/model-merging-combining-different-fine-tuned-llms)
2. Model Merging in the Era of Large Language Models Methods, Applications, and Future Directions - arXiv, [https://arxiv.org/html/2603.09938v2](https://arxiv.org/html/2603.09938v2)
3. The LLM Inference Trilemma: Throughput, Latency, Cost \| DigitalOcean, [https://www.digitalocean.com/blog/llm-inference-tradeoffs](https://www.digitalocean.com/blog/llm-inference-tradeoffs)
4. Mixture of Experts (MoE) vs Dense LLMs - Maximilian Schwarzmüller, [https://maximilian-schwarzmueller.com/articles/understanding-mixture-of-experts-moe-llms](https://maximilian-schwarzmueller.com/articles/understanding-mixture-of-experts-moe-llms)
5. RAM vs VRAM in Mixture of Experts Models: The Hidden Bottleneck in Next-Gen LLMs, [https://dypsis.ai/insights/moe-experts-ram](https://dypsis.ai/insights/moe-experts-ram)
6. An Introduction to Model Merging for LLMs \| NVIDIA Technical Blog, [https://developer.nvidia.com/blog/an-introduction-to-model-merging-for-llms/](https://developer.nvidia.com/blog/an-introduction-to-model-merging-for-llms/)
7. From Memorization to Parameter Interference: How Overtraining Experts Harms Model Merging - arXiv, [https://arxiv.org/html/2506.14126v2](https://arxiv.org/html/2506.14126v2)
8. MITIGATING PARAMETER INTERFERENCE IN MODEL MERGING VIA SHARPNESS-AWARE FINE-TUNING - ICLR Proceedings, [https://proceedings.iclr.cc/paper_files/paper/2025/file/7d865e8a5f3a0422680780aa9a7377f6-Paper-Conference.pdf](https://proceedings.iclr.cc/paper_files/paper/2025/file/7d865e8a5f3a0422680780aa9a7377f6-Paper-Conference.pdf)
9. DeepSeekMoE Architecture Overview - Emergent Mind, [https://www.emergentmind.com/topics/deepseekmoe-architecture](https://www.emergentmind.com/topics/deepseekmoe-architecture)
10. Bringing MegaBlocks to Databricks, [https://www.databricks.com/blog/bringing-megablocks-databricks](https://www.databricks.com/blog/bringing-megablocks-databricks)
11. DeepSeek-V3 Explained 3: Auxiliary-Loss-Free Load Balancing \| by Shirley Li - AI Advances, [https://ai.gopubby.com/deepseek-v3-explained-3-auxiliary-loss-free-load-balancing-4beeb734ab1f](https://ai.gopubby.com/deepseek-v3-explained-3-auxiliary-loss-free-load-balancing-4beeb734ab1f)
12. Sparse vs Dense Models: A Deep Dive into How Modern AI Really Works \| by Manish Atri, [https://medium.com/@atri_iiita/sparse-vs-dense-models-a-deep-dive-into-how-modern-ai-really-works-cf38fcd8d9ff](https://medium.com/@atri_iiita/sparse-vs-dense-models-a-deep-dive-into-how-modern-ai-really-works-cf38fcd8d9ff)
13. Mixture-of-Experts Deep Dive: How DeepSeek V3.2's 256-Expert Architecture Actually Works - TianPan.co, [https://tianpan.co/forum/t/mixture-of-experts-deep-dive-how-deepseek-v3-2s-256-expert-architecture-actually-works/108](https://tianpan.co/forum/t/mixture-of-experts-deep-dive-how-deepseek-v3-2s-256-expert-architecture-actually-works/108)
14. Model Merging vs Mixture of Experts: AI Techniques Simplified for IT Professionals, [https://www.youtube.com/watch?v=cur4om9jhmM](https://www.youtube.com/watch?v=cur4om9jhmM)
15. DeepSeekMoE: Towards Ultimate Expert Specialization in Mixture-of-Experts Language Models - arXiv, [https://arxiv.org/pdf/2401.06066](https://arxiv.org/pdf/2401.06066)
16. Synergistic Intra- and Cross-Layer Regularization Losses for MoE Expert Specialization - arXiv, [https://arxiv.org/html/2602.14159v1](https://arxiv.org/html/2602.14159v1)
17. DeepSeekMoE: Towards Ultimate Expert Specialization in Mixture-of-Experts Language Models - arXiv, [https://arxiv.org/html/2401.06066v1](https://arxiv.org/html/2401.06066v1)
18. Inside DeepSeek MoE: A Step-by-Step Walkthrough \| by Mao Jia \| GoPenAI, [https://blog.gopenai.com/inside-deepseek-moe-a-step-by-step-walkthrough-f5e1966c4e21](https://blog.gopenai.com/inside-deepseek-moe-a-step-by-step-walkthrough-f5e1966c4e21)
19. DeepSeek V3 — Megatron Bridge - NVIDIA Documentation Hub, [https://docs.nvidia.com/nemo/megatron-bridge/nightly/models/deepseek/deepseek-v3.html](https://docs.nvidia.com/nemo/megatron-bridge/nightly/models/deepseek/deepseek-v3.html)
20. What is Mixture of Experts (MoE)? — The Technique That Makes DeepSeek 10x Cheaper Than GPT \| Saeree ERP, [https://www.grandlinux.com/en/blogs/deepseek-moe-architecture.html](https://www.grandlinux.com/en/blogs/deepseek-moe-architecture.html)
21. 混合专家模型 Mixture of Experts, MoEs, [https://bimsa.net/doc/notes/31062.pdf](https://bimsa.net/doc/notes/31062.pdf)
22. DeepSeek-V3 from Scratch: Mixture of Experts (MoE) - PyImageSearch, [https://pyimagesearch.com/2026/03/23/deepseek-v3-from-scratch-mixture-of-experts-moe/](https://pyimagesearch.com/2026/03/23/deepseek-v3-from-scratch-mixture-of-experts-moe/)
23. DeepSeek-V3: Open Sparse MoE Model - Emergent Mind, [https://www.emergentmind.com/topics/deepseek-v3](https://www.emergentmind.com/topics/deepseek-v3)
24. A Theoretical Framework for Auxiliary-Loss-Free Load Balancing of Sparse Mixture-of-Experts in Large-Scale AI Models - arXiv, [https://arxiv.org/html/2512.03915v1](https://arxiv.org/html/2512.03915v1)
25. Model Merging in the Era of Large Language Models: Methods, Applications, and Future Directions - arXiv, [https://arxiv.org/html/2603.09938v1](https://arxiv.org/html/2603.09938v1)
26. Model Merging in the Era of Large Language Models: Methods, Applications, and Future Directions - arXiv, [https://arxiv.org/pdf/2603.09938](https://arxiv.org/pdf/2603.09938)
27. A Comprehensive Guide on Merging Language Models - Ionio, [https://www.ionio.ai/blog/merge-ai-models-using-mergekit](https://www.ionio.ai/blog/merge-ai-models-using-mergekit)
28. MergeBench: A Benchmark for Merging Domain-Specialized LLMs - NIPS, [https://proceedings.neurips.cc/paper_files/paper/2025/file/91f7f71cb04699f387dc863da42a1fe3-Paper-Datasets_and_Benchmarks_Track.pdf](https://proceedings.neurips.cc/paper_files/paper/2025/file/91f7f71cb04699f387dc863da42a1fe3-Paper-Datasets_and_Benchmarks_Track.pdf)
29. Merge Large Language Models with mergekit - Hugging Face, [https://huggingface.co/blog/mlabonne/merge-models](https://huggingface.co/blog/mlabonne/merge-models)
30. Can MLLMs Absorb Math Reasoning Abilities from LLMs as Free Lunch? - NIPS, [https://papers.nips.cc/paper_files/paper/2025/file/bdcdf38389d7fcefc73c4c3720217155-Paper-Conference.pdf](https://papers.nips.cc/paper_files/paper/2025/file/bdcdf38389d7fcefc73c4c3720217155-Paper-Conference.pdf)
31. EMR-MERGING: Tuning-Free High-Performance Model Merging - NIPS, [https://proceedings.neurips.cc/paper_files/paper/2024/file/dda5cac5272a9bcd4bc73d90bc725ef1-Paper-Conference.pdf](https://proceedings.neurips.cc/paper_files/paper/2024/file/dda5cac5272a9bcd4bc73d90bc725ef1-Paper-Conference.pdf)
32. A Systematic Study of Model Merging Techniques in Large Language Models - arXiv, [https://arxiv.org/html/2511.21437v1](https://arxiv.org/html/2511.21437v1)
33. Paper Review TIES-MERGING: Resolving Interference When Merging Models - Medium, [https://medium.com/@kimseongu15/paper-review-ties-merging-resolving-interference-when-merging-models-88581ee56557](https://medium.com/@kimseongu15/paper-review-ties-merging-resolving-interference-when-merging-models-88581ee56557)
34. TIES-Merging: Resolving Interference When Merging Models \| OpenReview, [https://openreview.net/forum?id=xtaX3WyCj1](https://openreview.net/forum?id=xtaX3WyCj1)
35. Papers Explained Review 13: Model Merging \| by Ritvik Rastogi - Medium, [https://ritvik19.medium.com/papers-explained-review-13-model-merging-d0db49797b90](https://ritvik19.medium.com/papers-explained-review-13-model-merging-d0db49797b90)
36. From Task-Specific Models to Unified Systems: A Review of Model Merging Approaches, [https://arxiv.org/html/2503.08998v1](https://arxiv.org/html/2503.08998v1)
37. Language Models are Super Mario: Absorbing Abilities from Homologous Models as a Free Lunch - GitHub, [https://raw.githubusercontent.com/mlresearch/v235/main/assets/yu24p/yu24p.pdf](https://raw.githubusercontent.com/mlresearch/v235/main/assets/yu24p/yu24p.pdf)
38. Language Models are Super Mario: Absorbing Abilities from Homologous Models as a Free Lunch - arXiv, [https://arxiv.org/html/2311.03099v3](https://arxiv.org/html/2311.03099v3)
39. GitHub - declare-lab/della: DELLA-Merging: Reducing Interference in Model Merging through Magnitude-Based Sampling, [https://github.com/declare-lab/della](https://github.com/declare-lab/della)
40. DELLA-Merging: Reducing Interference in Model Merging through Magnitude-Based Sampling - arXiv, [https://arxiv.org/abs/2406.11617](https://arxiv.org/abs/2406.11617)
41. DELLA-Merging: Reducing Interference in Model Merging through Magnitude-Based Sampling - arXiv, [https://arxiv.org/html/2406.11617v1](https://arxiv.org/html/2406.11617v1)
42. arcee-ai/mergekit: Tools for merging pretrained large language models. - GitHub, [https://github.com/arcee-ai/mergekit](https://github.com/arcee-ai/mergekit)
43. Whoever Started the interference Should End It: Guiding Data-Free Model Merging via Task Vectors, [https://proceedings.mlr.press/v267/cheng25h.html](https://proceedings.mlr.press/v267/cheng25h.html)
44. Whoever Started the interference Should End It: Guiding Data-Free Model Merging via Task Vectors \| OpenReview, [https://openreview.net/forum?id=xR9msNaREW](https://openreview.net/forum?id=xR9msNaREW)
45. From Parameters to Behaviors: A Survey of Model Fusion for Large Language Models, [https://www.preprints.org/manuscript/202605.2007](https://www.preprints.org/manuscript/202605.2007)
46. NeurIPS Poster Curriculum Model Merging: Harmonizing Chemical LLMs for Enhanced Cross-Task Generalization, [https://neurips.cc/virtual/2025/poster/116233](https://neurips.cc/virtual/2025/poster/116233)
47. HM3: Hierarchical Multi-Objective Model Merging for Pretrained Models - OpenReview, [https://openreview.net/pdf?id=JeP0lpusYw](https://openreview.net/pdf?id=JeP0lpusYw)
48. Mix Data or Merge Models? Balancing the Helpfulness, Honesty, and Harmlessness of Large Language Model via Model Merging \| OpenReview, [https://openreview.net/forum?id=SNJhYhO3a9&referrer=%5Bthe%20profile%20of%20JUN%20ZHOU%5D(%2Fprofile%3Fid%3D~JUN_ZHOU6)](https://openreview.net/forum?id=SNJhYhO3a9&referrer=%5Bthe%20profile%20of%20JUN%20ZHOU%5D(%2Fprofile%3Fid%3D~JUN_ZHOU6))
49. Arcee's MergeKit: A Toolkit for Merging Large Language Models - arXiv, [https://arxiv.org/html/2403.13257v3](https://arxiv.org/html/2403.13257v3)
50. Model Merging and You, [https://planetbanatt.net/articles/modelmerging.html](https://planetbanatt.net/articles/modelmerging.html)
51. Daily Papers - Hugging Face, [https://huggingface.co/papers?q=Continual%20Model%20Merging](https://huggingface.co/papers?q=Continual%20Model%20Merging)
52. Create Mixtures of Experts with MergeKit - Hugging Face, [https://huggingface.co/blog/mlabonne/frankenmoe](https://huggingface.co/blog/mlabonne/frankenmoe)
53. Mergekit Model Merging \| Guides - Clore.ai, [https://docs.clore.ai/guides/training/mergekit](https://docs.clore.ai/guides/training/mergekit)
54. MergeME: Model Merging Techniques for Homogeneous and Heterogeneous MoEs - arXiv, [https://arxiv.org/html/2502.00997v2](https://arxiv.org/html/2502.00997v2)
55. Create Mixtures of Experts with MergeKit - daily.dev, [https://app.daily.dev/posts/create-mixtures-of-experts-with-mergekit-qx7fhuo1o](https://app.daily.dev/posts/create-mixtures-of-experts-with-mergekit-qx7fhuo1o)
56. mlabonne/Beyonder-4x7B-v2 - Hugging Face, [https://huggingface.co/mlabonne/Beyonder-4x7B-v2](https://huggingface.co/mlabonne/Beyonder-4x7B-v2)
57. h2m/mhm-8x7B-FrankenMoE-v1.0 - Hugging Face, [https://huggingface.co/h2m/mhm-8x7B-FrankenMoE-v1.0](https://huggingface.co/h2m/mhm-8x7B-FrankenMoE-v1.0)
58. Create Mixtures of Experts with MergeKit \| by Maxime Labonne \| TDS Archive \| Medium, [https://medium.com/data-science/create-mixtures-of-experts-with-mergekit-11b318c99562](https://medium.com/data-science/create-mixtures-of-experts-with-mergekit-11b318c99562)
59. mlabonne/Beyonder-4x7B-v3 - Hugging Face, [https://huggingface.co/mlabonne/Beyonder-4x7B-v3](https://huggingface.co/mlabonne/Beyonder-4x7B-v3)
60. mlabonne/Beyonder-4x7B-v3-GGUF - Hugging Face, [https://huggingface.co/mlabonne/Beyonder-4x7B-v3-GGUF](https://huggingface.co/mlabonne/Beyonder-4x7B-v3-GGUF)
61. Taming Latency-Memory Trade-Off in MoE-Based LLM Serving via Fine-Grained Expert Offloading - arXiv, [https://arxiv.org/html/2502.05370v2](https://arxiv.org/html/2502.05370v2)
62. databricks/megablocks - GitHub, [https://github.com/databricks/megablocks](https://github.com/databricks/megablocks)
63. At the Frontier of AI: Reviewing Top Papers on Mixture of Experts in Machine Learning — Part 4 - Isaac Kargar, [https://kargarisaac.medium.com/at-the-frontier-of-ai-reviewing-top-papers-on-mixture-of-experts-in-machine-learning-part-4-e78f42ede2be](https://kargarisaac.medium.com/at-the-frontier-of-ai-reviewing-top-papers-on-mixture-of-experts-in-machine-learning-part-4-e78f42ede2be)
64. Training MoEs at Scale with PyTorch, [https://pytorch.org/blog/training-moes/](https://pytorch.org/blog/training-moes/)
65. Fused MoE dispatch kernel in pure Triton: 89-131% of Megablocks, runs on AMD with zero code changes : r/LocalLLaMA - Reddit, [https://www.reddit.com/r/LocalLLaMA/comments/1tp4u0u/fused_moe_dispatch_kernel_in_pure_triton_89131_of/](https://www.reddit.com/r/LocalLLaMA/comments/1tp4u0u/fused_moe_dispatch_kernel_in_pure_triton_89131_of/)
66. Efficiently serve dozens of fine-tuned models with vLLM on Amazon SageMaker AI and Amazon Bedrock \| Artificial Intelligence - AWS, [https://aws.amazon.com/blogs/machine-learning/efficiently-serve-dozens-of-fine-tuned-models-with-vllm-on-amazon-sagemaker-ai-and-amazon-bedrock/](https://aws.amazon.com/blogs/machine-learning/efficiently-serve-dozens-of-fine-tuned-models-with-vllm-on-amazon-sagemaker-ai-and-amazon-bedrock/)
67. RaMP: Runtime-Aware Megakernel Polymorphism for Mixture-of-Experts - arXiv, [https://arxiv.org/html/2604.26039v1](https://arxiv.org/html/2604.26039v1)
68. Is this possible? - Models - Hugging Face Forums, [https://discuss.huggingface.co/t/is-this-possible/163679](https://discuss.huggingface.co/t/is-this-possible/163679)
69. [Literature Review] MoE-Infinity: Offloading-Efficient MoE Model Serving - Moonlight, [https://www.themoonlight.io/en/review/moe-infinity-offloading-efficient-moe-model-serving](https://www.themoonlight.io/en/review/moe-infinity-offloading-efficient-moe-model-serving)
70. While GPUs are still the kings of speed, if you are worried about VRAM I do reco... \| Hacker News, [https://news.ycombinator.com/item?id=39839606](https://news.ycombinator.com/item?id=39839606)
71. llama.cpp on GPU Server: GGUF Performance Guide - GIGAGPU, [https://gigagpu.com/llama-cpp-gpu-server-gguf/](https://gigagpu.com/llama-cpp-gpu-server-gguf/)
72. Is there any way to speed up prompt processing on CPU? (Llama.cpp, no GPU) - Reddit, [https://www.reddit.com/r/LocalLLaMA/comments/1avx0uf/is_there_any_way_to_speed_up_prompt_processing_on/](https://www.reddit.com/r/LocalLLaMA/comments/1avx0uf/is_there_any_way_to_speed_up_prompt_processing_on/)
73. MoE-Infinity: Offloading-Efficient MoE Model Serving - arXiv, [https://arxiv.org/html/2401.14361v2](https://arxiv.org/html/2401.14361v2)
74. MoE-Infinity: Activation-Aware Expert Offloading for Efficient MoE Serving \| Takara TLDR, [https://tldr.takara.ai/p/2401.14361](https://tldr.takara.ai/p/2401.14361)
75. MoE-Infinity: Activation-Aware Expert Offloading for Efficient MoE Serving - UK Systems Research, [https://uksystems.org/workshop/2024/papers/srcw24-paper13.pdf](https://uksystems.org/workshop/2024/papers/srcw24-paper13.pdf)
76. Efficient MoE Inference on Personal Machines with Sparsity-Aware Expert Cache - arXiv, [https://arxiv.org/html/2401.14361v3](https://arxiv.org/html/2401.14361v3)
77. Just installed a recent llama.cpp branch, and the speed of Mixtral 8x7b is beyond insane, it's like a Christmas gift for us all (M2, 64 Gb). GPT 3.5 model level with such speed, locally : r/LocalLLaMA - Reddit, [https://www.reddit.com/r/LocalLLaMA/comments/18fyn1k/just_installed_a_recent_llamacpp_branch_and_the/](https://www.reddit.com/r/LocalLLaMA/comments/18fyn1k/just_installed_a_recent_llamacpp_branch_and_the/)
78. llama.cpp: A CPU-First Framework for Running LLaMA Models on Local Hardware, [https://www.sandgarden.com/learn/llama-cpp](https://www.sandgarden.com/learn/llama-cpp)
