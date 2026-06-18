---
title: "Analysis of Luck Mitigation in Game Systems: Mathematical Architectures, Markov Models, and Interactive Verification"
date: 2026-06-17
description: A rigorous mathematical examination of variance-mitigation algorithms in game design — from Pseudo-Random Distribution and Markov chain state-space models to Fire Emblem's 2RN True Hit system and the competitive balance implications for Dota 2, Hearthstone, and beyond.
tags: [game-design, mathematics, probability, pseudo-random-distribution, markov-chains, statistics, dota2, fire-emblem, hearthstone, game-theory]
---

Stochastic events serve as a structural foundation in game design, introducing predictability-breaking variance that requires active cognitive adaptation. However, a persistent conflict exists between mathematical entropy — traditionally modeled via independent and identically distributed (IID) trials — and human cognitive interpretation of probability. Due to psychological biases such as the clustering illusion and the Gambler's Fallacy, players routinely interpret natural statistical groupings (such as consecutive critical strikes or prolonged dry spells) as evidence of unfair system performance.

To reconcile mathematical chaos with player satisfaction and competitive integrity, modern game systems utilize variance-mitigation algorithms. Crucially, a clear distinction must be maintained between low-level **Pseudo-Random Number Generators (PRNGs)** and high-level **Pseudo-Random Distribution (PRD)**. While PRNGs are deterministic mathematical algorithms designed to produce uniform sequences of random numbers from an initial seed, PRD is a design-level statistical mechanic that dynamically manipulates success probabilities over a sequence of events to compress variance and eliminate extreme outcomes.

---

## The Observable Platform as an Interactive Verification Sandbox

The analytical examination of variance-mitigation algorithms has been significantly enhanced by browser-based computation. Platforms such as the Observable digital platform function as a highly interactive sandbox for mathematical verification, allowing developers to execute reactive code directly in the browser runtime. Observable notebooks facilitate a style of literate programming, weaving together explanatory Markdown, raw JavaScript, responsive HTML, and SQL queries into unified, dynamic documents.

A primary advantage of this digital environment is its built-in reactivity. In an Observable notebook, individual code cells automatically re-evaluate whenever their dependent parameters or inputs are modified. In the context of probability modeling, this allows users to manipulate the nominal (or in-game) probability using interactive sliders and observe the resulting mathematical curves recalculate in real time. These notebooks feature interactive visualization tools that display statistical curves, such as the **Probability Mass Function (PMF)** and the **Cumulative Distribution Function (CDF)**. The PMF details the exact probability of an event occurring precisely on the $N$-th attempt, while the CDF displays the cumulative likelihood of a success occurring at any point before or during the $N$-th trial. Observing these shifting curves provides a clearer perspective on the hidden algorithmic frameworks governing classic gaming collections.

---

## Mathematical Formulations of Independent vs. Dependent Probability Engines

Implementing game mechanics (such as critical strikes, bash status effects, or item drops) using a uniform distribution relies on independent, memoryless trials. Under a uniform distribution with a nominal probability of $25\%$, the success rate remains exactly $25\%$ on every trial, regardless of historical outcomes. While mathematically pure, this system has no upper bound on the number of attempts required to achieve a success, theoretically allowing infinitely long dry streaks.

By contrast, Pseudo-Random Distribution (PRD) replaces independent trials with a stateful, dependent probability engine. Under PRD, the actual success probability on the $N$-th trial since the last success, denoted as $P(N)$, scales dynamically according to the following linear formula:

$$P(N) = \min(C \cdot N, 1.0)$$

where $C$ is a constant real-valued parameter determined numerically to align the long-run actual success rate with the nominal in-game probability $p$.

```
[Success] ---> (Reset: N = 1) ---> P(1) = C
    ^                                   |
    |                                [Failure]
    |                                   v
[Success] ---> (Reset: N = 1) ---> P(2) = 2C
    ^                                   |
    |                                [Failure]
    |                                   v
[Success] ---> (Reset: N = 1) ---> P(3) = 3C
```

Every failed attempt increments the trial counter $N$ by 1, automatically increasing the success probability of the next attempt by the constant $C$. This base value $C$ starts significantly lower than the listed nominal probability but climbs steadily with each consecutive miss until a hit occurs. The millisecond a success is achieved, an instant reset returns the system counter $N$ to 1, dropping the success probability back to $C$ for the subsequent trial. This dynamic eliminates the possibility of infinite dry streaks, establishing a strict deterministic limit $K$ where success becomes guaranteed:

$$K = \left\lceil \frac{1}{C} \right\rceil$$

### Comparative Statistical Attributes at 25% Nominal Probability

For a nominal probability of $25\%$, the differences between a uniform distribution and a PRD system highlight the variance-compression capabilities of PRD.

| Statistical Attribute | Uniform (True Random) Distribution | Pseudo-Random Distribution (PRD) |
|---|---|---|
| Nominal Success Rate ($p$) | $25.00\%$ | $25.00\%$ (Long-run actual: $24.99\%$) |
| Dynamic Increment/Base ($C$) | N/A (Constant $25\%$ probability) | $0.0847440917643321$ (approx. $8.47\%$) |
| Standard Deviation ($\sigma$) | $\pm 3.5$ attacks | $\pm 1.9$ attacks |
| Max Attempts Before Success ($K$) | $\infty$ | $11$ attacks (guaranteed at $12$ if reached) |
| Peak PMF Occurrence (Mode) | $1$st attack ($25.00\%$ probability) | $3$rd attack ($19.32\%$ probability) |

Under a uniform distribution, the most likely outcome is immediate success on the first trial ($25.00\%$), which leads to frequent, highly clustered streaks of good luck. In contrast, PRD limits the chance of consecutive successes by reducing the initial probability on the first attack to just $C \approx 8.47\%$.

The probability of landing exactly $N$ attacks between two successes under PRD, denoted as $P_{\text{prd}}(N)$, is calculated using the following recurrence relation:

$$P_{\text{prd}}(N) = P(N) \prod_{i=1}^{N-1} (1 - P(i))$$

with the base case:

$$P_{\text{prd}}(1) = P(1) = C$$

Computing this distribution for the $25\%$ nominal case demonstrates that the probability mass is concentrated around the third and fourth attacks, providing a steady, balanced experience that matches human expectations of probability.

---

## State-Space Modeling: The Markov Chain Transition Matrix

The sequential behavior of a PRD system can be modeled as a discrete-time Markov chain with a finite state space $S = \{1, 2, \dots, K\}$. Each state $n \in S$ represents the exact number of consecutive trials that have occurred since the last successful event.

From any state $n$, the system exhibits exactly two transition possibilities:

- **Critical Success / Status Proc:** The system transitions back to state $1$ with probability: $A^n_1 = \min(c \cdot n, 1.0)$
- **Normal Hit / Standard Event:** The system advances to state $n + 1$ with probability: $A^n_{n+1} = 1 - \min(c \cdot n, 1.0)$

This state-transition behavior is represented by the following transition diagram:

```
         1-c          1-2c         1-3c         1-4c
  (1) ---------> (2) ---------> (3) ---------> (4) ---------> (5)
   |              |              |              |              |
   | c            | 2c           | 3c           | 4c           | 1
   v              v              v              v              v
 [State 1]      [State 1]      [State 1]      [State 1]      [State 1]
```

Using the variable $c$ to represent the system constant, the stochastic transition matrix $\mathbf{A^i_j} \in \mathbb{R}^{K \times K}$ (illustrated below for $K = \lfloor c^{-1} \rfloor = 5$) maps these transition probabilities:

$$\mathbf{A^i_j} = \begin{bmatrix}
c & 1-c & 0 & 0 & 0 \\
2c & 0 & 1-2c & 0 & 0 \\
3c & 0 & 0 & 1-3c & 0 \\
4c & 0 & 0 & 0 & 1-4c \\
1 & 0 & 0 & 0 & 0
\end{bmatrix}$$

Because the states in this Markov chain are finite and communicate directly with State 1, the chain is **irreducible** and **positive recurrent**, ensuring it converges to a unique stationary distribution vector $\boldsymbol{\pi} = [\pi_1, \pi_2, \dots, \pi_K]$. This vector represents the long-run proportion of time the system spends in each state.

To compute this stationary distribution, the balance equations $\boldsymbol{\pi} \mathbf{P} = \boldsymbol{\pi}$ and the normalization constraint $\sum \pi_n = 1$ are applied. The long-run success rate of the system is represented by the stationary probability of being in State 1:

$$\pi_1 = p$$

Solving these equations recursively allows developers to calculate the exact value of the constant $c$ required to achieve the desired nominal probability $p$.

---

## Low-Level Randomness: PRNG Architectures and Mathematical Contrast

While PRD operates as a game-design-level algorithm to manipulate success distributions, it must not be confused with the low-level Pseudo-Random Number Generators (PRNGs) that provide the underlying source of entropy. PRNGs are deterministic mathematical algorithms that produce a sequence of numbers approximating the properties of a uniform distribution. These generators require a starting integer known as a **seed**. From this seed, the sequence is generated iteratively; if the seed and algorithm parameters are known, the exact sequence can be replicated.

A common method used in standard programming libraries (such as the traditional C library `rand()`) is the **Linear Congruential Generator (LCG)**. This generator is defined by the linear recurrence relation:

$$X_{n+1} = (a \cdot X_n + b) \pmod{m}$$

where $X_0$ is the seed, $a$ is the multiplier, $b$ is the increment, and $m$ is the modulus.

Historically, many early LCG implementations exhibited serious statistical flaws, including short cycle periods and noticeable correlation between successive values. To guarantee that an LCG achieves its maximum possible period length equal to $m$ before repeating, the parameters must satisfy the three conditions of the **Hull-Dobell Theorem**:

1. The increment $b$ and the modulus $m$ must be relatively prime (meaning $\gcd(b, m) = 1$).
2. The term $(a - 1)$ must be divisible by all prime factors of $m$.
3. The term $(a - 1)$ must be divisible by $4$ if $m$ is divisible by $4$.

For example, older ANSI C implementations utilized the parameters $m = 2^{31}$, $a = 1103515245$, and $b = 12345$. These values satisfy the Hull-Dobell conditions:

$$\begin{aligned}
&\text{Prime factor of } m = 2^{31} \text{ is } 2. \text{ Since } b = 12345 \text{ is odd, } \gcd(12345, 2^{31}) = 1. \\
&(a - 1) = 1103515244, \text{ which is even and thus divisible by } 2. \\
&m \text{ is divisible by } 4, \text{ and } (a - 1) = 1103515244 \text{ is divisible by } 4 \quad (1103515244 / 4 = 275878811).
\end{aligned}$$

While this LCG achieves its full period of $2^{31}$, standard LCGs suffer from poor dimensional distribution, causing sequential values to lie on parallel hyperplanes. Additionally, the lower-order bits of LCGs are often far less random than the higher-order bits, which can distort in-game probability checks if modulo reduction (such as `rand() % 100`) is used. To resolve these issues, modern game engines use superior generators such as the **Mersenne Twister** or specialized uniform libraries like `d3-random`, which generate independent, uniform values across the half-closed interval $[0, 1)$ without structural bias.

---

## Fire Emblem's Multivariant Accuracy Models: 2RN and Hybrid True Hit

While PRD dynamically adjusts the success probability across successive attempts, other game systems use static mathematical transformations of the random numbers themselves to align in-game odds with player expectations. The Fire Emblem tactical role-playing franchise provides a clear example of this approach, transitioning across three distinct accuracy models over its history.

### 1RN System

Used in the early titles (from *Shadow Dragon & the Blade of Light* through *Thracia 776*), this system uses a single random number generator. The engine draws a single random integer $X \sim U(0, 99)$. If $X$ is strictly less than the displayed hit rate $h$, the attack lands. Here, the displayed accuracy corresponds exactly to the actual mathematical probability of success.

### 2RN System (True Hit)

Introduced in *The Binding Blade* and utilized through *Three Houses*, this system generates two independent random integers $X_1, X_2 \sim U(0, 99)$ and averages them to evaluate accuracy:

$$\text{True Hit Condition: } \frac{X_1 + X_2}{2} < h \implies X_1 + X_2 < 2h$$

This averaging transformation alters the underlying probability from a flat uniform distribution to a symmetric, triangular distribution (equivalent to a discrete Bates distribution with $n=2$). This transformation curves the actual success rate into a sigmoid shape, reducing the likelihood of extreme high or low rolls.

The piecewise quadratic formula to calculate actual probability under the 2RN True Hit system is:

$$\text{True Hit Probability } P(h) = \begin{cases}
\dfrac{h(2h+1)}{100}\% & \text{for } h \le 50 \\[10pt]
\dfrac{-2h^2 + 399h - 9900}{100}\% & \text{for } h \ge 50
\end{cases}$$

This model compresses the ends of the spectrum: displayed hit rates above $50\%$ are boosted to hit even more consistently, while hit rates below $50\%$ are reduced to miss more often.

### Hybrid Sine-Wave System

Introduced in *Fire Emblem Fates* and used in *Shadows of Valentia* and *Engage*, this hybrid system addresses the issue of high-evasion units becoming practically unhittable under the 2RN system. For displayed hit rates below $50\%$, the system reverts to a 1RN calculation, making dodging more dangerous and preventing players from relying entirely on extreme evasion stats. For hit rates at or above $50\%$, the engine rolls a single random number from $0$ to $9999$ and compares it to a sine-weighted curve:

$$\text{True Hit} = \frac{(h \times 100) + \dfrac{40}{3} \cdot h \cdot \sin\!\left((0.02h - 1) \times 180°\right)}{100}\%$$

This hybrid approach ensures high-accuracy attacks remain reliable, while providing a smoother progression that prevents the extreme probability drops seen at the low end of the 2RN curve.

### Comparative Accuracy Analysis

| Displayed Hit Rate ($h$) | 1RN True Hit | 2RN True Hit | Hybrid True Hit (Fates/Engage) | Probability Shift (2RN − Displayed) |
|---|---|---|---|---|
| 0% | $0.00\%$ | $0.00\%$ | $0.00\%$ | $0.00\%$ |
| 10% | $10.00\%$ | $2.10\%$ | $10.00\%$ (1RN) | $-7.90\%$ |
| 20% | $20.00\%$ | $8.20\%$ | $20.00\%$ (1RN) | $-11.80\%$ |
| 30% | $30.00\%$ | $18.30\%$ | $30.00\%$ (1RN) | $-11.70\%$ |
| 40% | $40.00\%$ | $32.40\%$ | $40.00\%$ (1RN) | $-7.60\%$ |
| 50% | $50.00\%$ | $50.50\%$ | $50.00\%$ | $+0.50\%$ |
| 60% | $60.00\%$ | $68.40\%$ | $66.17\%$ | $+8.40\%$ |
| 70% | $70.00\%$ | $82.30\%$ | $79.85\%$ | $+12.30\%$ |
| 80% | $80.00\%$ | $92.20\%$ | $90.35\%$ | $+12.20\%$ |
| 90% | $90.00\%$ | $98.10\%$ | $96.85\%$ | $+8.10\%$ |
| 100% | $100.00\%$ | $100.00\%$ | $100.00\%$ | $0.00\%$ |

The 2RN system shifts probability by more than $12\%$ in the $70\%$–$80\%$ range, which corresponds to the sweet spot for player accuracy. This mathematical shift aligns the game's mechanics with the human bias that an $80\%$ chance should hit almost every time, reducing player frustration without modifying core unit attributes.

---

## Case Studies in Competitive Balancing: From Dota 2 to Hearthstone

The legacy of dynamic probability scaling traces back to the Warcraft 3 engine, which utilized PRD to manage passive abilities such as critical strikes, stuns, and evasion. This design philosophy was carried forward into modern competitive titles, including Dota 2, League of Legends, and Vermintide 2, establishing dynamic probability scaling as an industry standard for competitive esports.

```
                    [Attack Sequence]
                            |
                Is Ability on Cooldown?
                /                    \
              Yes                    No
              /                        \
    [No PRD Interaction]         Roll against P(N)
    * Counter N static           /               \
    * Cannot trigger effect   Success           Failure
                                /                   \
                        [Apply Effect]         [Increment State]
                        * Reset N = 1          * Increment N = N + 1
                        * Start Cooldown       * P(N) increases by C
```

In Dota 2, melee heroes wielding a Skull Basher have a listed $25\%$ chance to stun (bash) their target. However, to prevent a player from being permanently locked out of character control by lucky consecutive stuns, the game calculates the bash chance using PRD with $C \approx 8.5\%$. Immediately following a stun, the chance of triggering another on the next hit drops to just $8.5\%$. Additionally, the state counter $N$ does not increment while the item's internal cooldown is active, preventing players from building up high bash chances during cooldown windows.

This dynamic scaling philosophy has also been adapted for card games. In Hearthstone Battlegrounds, developers modified the random secrets pool of the hero Great Akazamzarak. The secret Ice Block, which prevents death for one turn, initially had a standard random probability of being discovered. To prevent game-breaking situations where a player survived five consecutive rounds purely through lucky Ice Block rolls, developers implemented a pseudo-random penalty — significantly reducing the chance of discovering a consecutive Ice Block after one had just triggered, forcing players to adapt and showcase skill rather than relying on sustained luck.

---

These case studies highlight how game developers actively manipulate statistical curves behind the scenes. Whether compressing variance in real-time combat or enforcing diminishing returns in card systems, dynamic probability scaling remains a vital tool for balancing competitive depth with intuitive, satisfying gameplay. The mathematical elegance of PRD lies not in hiding randomness from the player, but in sculpting it — transforming raw entropy into an experience that feels fair precisely because it isn't truly random at all.
