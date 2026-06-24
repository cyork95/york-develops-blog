---
title: "Automated Aerial Pageantry: Computational Mechanics, Distributed Edge Architectures, and the Environmental Optimization of Municipal Airspaces"
date: 2026-06-24
description: A deep dive into the engineering, physics, optimization algorithms, and distributed systems architecture driving the municipal transition from traditional pyrotechnics to autonomous, software-defined drone swarms.
tags: [drones, reinforcement-learning, robotics, distributed-systems, math, algorithms, optimization, environmental-engineering]
---

## The Municipal Transition and Cultural Micro-Pivot

American municipal celebrations are undergoing a rapid technological transition as traditional pyrotechnic displays are systematically replaced by automated, software-defined aerial drone swarms. This socio-technical shift is particularly concentrated in noise-sensitive and wildfire-prone regions where local governments must balance historic cultural expectations with safety and environmental preservation<sup>1</sup>.

A prominent example of this transition is Bloomington, Illinois, where the City Council approved a $60,000 agreement with Firefly Services to execute a 300-drone automated light show to celebrate the 250th anniversary of the Declaration of Independence<sup>4</sup>. Highlighting the regional, multi-agency funding models used to amortize these capital expenditures, the Town of Normal contributed up to $30,000, while McLean County provided up to $10,000 of the total show cost<sup>4</sup>. While council member Mollie Ward cast the sole dissenting vote, questioning the civic alignment of the expenditure, the municipality simultaneously approved a concurrent three-year, $125,000 contract with Gateway Pyrotechnic Solutions for traditional fireworks displays at Miller Park, demonstrating that many cities initially opt for a parallel, dual-technology approach<sup>4</sup>.

This public policy transition is heavily accelerated by localized citizen friction. Residents living adjacent to the McLean County Fairgrounds (Interstate Center) in Bloomington have documented that heavy pyrotechnic finales and unexpected low-level chemical fireballs generate high-amplitude acoustic shockwaves that rattle residential windows, vibrate residential structural framing, and trigger severe panic in companion animals<sup>5</sup>. Similar municipal shifts are occurring across Indiana, such as Indianapolis, where White River State Park hosted a 200-drone "Star Spangled Sky" display sponsored by Purdue University<sup>6</sup>, and Santa Claus, Indiana, where Holiday World's "Holidays in the Sky" event deploys a 500-drone swarm integrated with dynamic, low-smoke pyrotechnics<sup>9</sup>.

These municipal choices are heavily constrained by state-level regulatory codes. For instance, the Indiana Department of Homeland Security (IDHS) enforces strict permitting for the storage, transport, and deployment of display fireworks<sup>11</sup>. These regulations contrast with the safety records of consumer fireworks, which the U.S. Consumer Product Safety Commission (CPSC) reported as causing 6,400 emergency department visits in the month surrounding the July 4th holiday in 2023 alone, with burns accounting for 42% of those injuries<sup>11</sup>.

## The Physics vs. Code Paradigm: Kinetic Dispersion vs. Spatial Voxel Vectors

To understand this technological shift, engineers must evaluate how visual space is manipulated. Traditional pyrotechnics are transient, high-entropy thermodynamic systems governed by ballistic chemistry<sup>1</sup>. An aerial firework shell is a kinetic projectile containing black powder oxidizers, such as potassium nitrate ($KNO_3$), charcoal, and sulfur, packed alongside chemical colorants<sup>1</sup>. Once launched, the visual output is entirely probabilistic, dictated by ballistic trajectory, gravity, wind velocity, and combustion efficiency<sup>1</sup>. The resulting explosion expands radially as a sphere of short-lived, decaying kinetic energy, releasing toxic particulate matter and greenhouse gases<sup>13</sup>.

Conversely, an automated drone swarm treats the empty sky as a deterministic, three-dimensional spatial voxel matrix<sup>16</sup>. Each drone acts as an autonomous coordinate node executing a high-frequency, real-time positioning loop<sup>16</sup>. Coloration is achieved through on-board light-emitting diode (LED) microcontrollers that adjust color values via pulse-width modulation (PWM) to maintain precise geometric vectors<sup>14</sup>.

The primary technical challenge of the voxel paradigm is maintaining spatial stability under variable crosswinds, rotor wash, and rain<sup>16</sup>. To convert a 3D animation into safe flight trajectories, path-planning engines compute time-parameterized trajectories for each drone. This process utilizes $n$-th order polynomial segments to represent the 3D position vector $K(t)$ of drone $i$<sup>16</sup>:

$$ K(t) = \sum_{j=0}^{n} c_j t^j $$

To ensure smooth visual transitions and minimize mechanical strain on the brushless motors, the polynomial coefficients $c_j$ are optimized using a minimum snap criterion, which guarantees $C^4$ continuity<sup>16</sup>:

$$ \min \int_{t_0}^{t_f} \left\| \frac{d^4 K(t)}{dt^4} \right\|^2 dt $$

This optimization problem is solved subject to the physical limitations of the quadrotor systems, including maximum velocity, acceleration, and jerk<sup>16</sup>:

$$ \|\dot{K}(t)\| \le v_{\max}, \quad \|\ddot{K}(t)\| \le a_{\max}, \quad \|\dddot{K}(t)\| \le j_{\max} $$

Simultaneously, the trajectory generator must maintain a strict collision avoidance constraint between all pair combinations of drones in the swarm. This is formalized as a Euclidean distance boundary<sup>16</sup>:

$$ \|K_i(t) - K_j(t)\| \ge 2R + \delta $$

where $R$ represents the physical structural radius of the quadrotor frame and $\delta$ is a safety factor scaling parameter used to account for localized aerodynamic disturbances, such as rotor wash and wind shear<sup>16</sup>.

## Swarm Intelligence: Distributed Optimization and Multi-Agent Reinforcement Learning

Early drone light shows relied on centralized Ground Control Stations (GCS) to broadcast pre-rendered coordinate paths directly to every aircraft over standard wireless frequencies. This centralized model possesses a critical single point of failure: if the RF link is jammed, degraded, or suffers from high latency, the entire formation can collapse, resulting in catastrophic mid-air collisions<sup>19</sup>.

Modern deployments resolve this vulnerability by implementing decentralized multi-agent architectures governed by Multi-Agent Reinforcement Learning (MARL) frameworks, such as Multi-Agent Deep Deterministic Policy Gradient (MADDPG) networks<sup>22</sup>. MADDPG operates on the principle of Centralized Training with Decentralized Execution (CTDE)<sup>26</sup>. During the offline training phase, a centralized critic network has access to the global state and the actions of all agents to guide the learning process<sup>26</sup>. During real-time execution, however, the centralized critic is discarded, and each drone runs an independent actor network on its embedded flight controller, utilizing only its localized observations to compute optimal control actions<sup>26</sup>.

For a swarm of $N$ drones, each agent $i$ parameterizes its policy via an actor network $\mu_i$ with parameters $\theta_i$<sup>26</sup>. The policy gradient of the expected return $J(\theta_i)$ for agent $i$ within a continuous action space is mathematically formulated as<sup>26</sup>:

$$ \nabla_{\theta_i} J(\theta_i) = \mathbb{E}_{s, a \sim \mathcal{D}} \left[ \nabla_{\theta_i} \log \mu_i(a_i | o_i) \nabla_{a_i} Q_i^{\mu} (x, a_1, \dots, a_N) |_{a_i = \mu_i(a_i | o_i)} \right] $$

where $o_i$ represents the local observation of agent $i$, $x$ is the global state vector containing the combined observations of the swarm, $\mathcal{D}$ is the experience replay buffer storing state transition tuples, and $Q_i^{\mu}$ is the centralized action-value function (critic) for agent $i$<sup>26</sup>.

To update the centralized critic, the network minimizes a mean squared bellman error loss function<sup>26</sup>:

$$ L(\theta_i) = \mathbb{E}_{s, a, r, s' \sim \mathcal{D}} \left[ \left( Q_i^{\mu}(x, a_1, \dots, a_N) - y_i \right)^2 \right] $$

where the target value $y_i$ is computed using target actor and critic networks to stabilize training<sup>26</sup>:

$$ y_i = r_i + \gamma Q_i^{\mu'} (x', a_1', \dots, a_N') |_{a_j' = \mu_j'(a_j' | o_j')} $$

In this equation, $r_i$ is the reward received by agent $i$, $\gamma$ is the temporal discount factor, and $\mu'$ represents the ensemble of target policies<sup>26</sup>.

To train the swarm to maintain complex geometric formations while avoiding obstacles, engineers construct a multi-objective reward function. Collisions with other drones or static obstacles incur heavy negative penalties, while maintaining the target formation coordinates yields positive rewards<sup>23</sup>.

| Event | Reward / Penalty Value |
| :--- | :--- |
| Collision with static/dynamic environmental obstacle | $R_{\text{obstacle}} = -5.0$ <sup>[23]</sup> |
| Collision with another drone agent in the swarm | $R_{\text{agent}} = -5.0$ <sup>[23]</sup> |
| Establishment of new target coordinate alignment (landmark coverage) | $R_{\text{new}} = +5.0$ <sup>[23]</sup> |
| Sustained target alignment / waypoint coverage | $R_{\text{sustained}} = +0.5$ <sup>[23]</sup> |
| Idle state or redundant spatial coverage | $R_{\text{idle}} = -0.1$ <sup>[23]</sup> |

By optimizing this policy over thousands of simulated episodes, the drones learn to dynamically adjust their flight paths in real time to counter external environmental forces, such as localized wind shear, without requiring centralized commands<sup>18</sup>.

Furthermore, R&D teams are integrating priority-based experience replay (PER) into these architectures—as seen in Hanwha Systems’ or the Electronics and Telecommunications Research Institute’s (ETRI) 2026 patents—which train individual actor networks within a Markov game formalization to handle dynamic swarm redeployment and role allocation<sup>24</sup>. These networks are supported by specialized optimization protocols such as the Constrained Hungarian Method for Swarm Drones Assignment (CHungSDA) to optimally allocate UAVs to waypoints<sup>16</sup> and potential field algorithms that map repulsion vectors for collision-free path adjustment<sup>29</sup>.

## Algorithmic Pathfinding and Completeness in Continuous-Time Domains

While MARL models provide robust, reactive collision avoidance, high-level planning of large-scale formations requires decoupled pathfinding algorithms to map initial transitions and major transformations. In environments filled with dynamic obstacles, Safe Interval Path Planning (SIPP) serves as a foundational single-agent planner<sup>30</sup>. SIPP avoids the computational bottleneck of searching a time-expanded grid by defining "safe intervals"<sup>30</sup>. A safe interval is a maximal contiguous time window $[t_s, t_e]$ during which a spatial configuration remains entirely collision-free<sup>30</sup>. By searching over these temporal intervals rather than discrete timesteps, SIPP compresses the search space dimensionality while guaranteeing path optimality<sup>30</sup>.

To coordinate multiple drones, SIPP is integrated into a two-level hierarchical framework known as Continuous-Time Conflict-Based Search (CCBS)<sup>31</sup>. At the low level, CCBS utilizes a modified SIPP planner to independently calculate optimal, continuous-time paths for each individual drone based on a set of constraints<sup>31</sup>. At the high level, CCBS searches a binary Constraint Tree (CT)<sup>36</sup>. Each node in the CT represents a set of spatial-temporal constraints<sup>36</sup>. If the high-level planner detects a collision between two paths, it branches by creating two child nodes, imposing a constraint on one of the conflicting agents in each branch, and forcing the low-level planner to recalculate that agent's path<sup>36</sup>.

Despite the theoretical benefits of CCBS in continuous-time multi-agent path finding (MAPF-R), recent computational research has identified a major vulnerability: the algorithm is theoretically incomplete<sup>39</sup>. Because CCBS permits agents to wait for arbitrary, real-valued durations, the underlying search space contains an uncountably infinite state space<sup>39</sup>. Consequently, when resolving conflicts in highly dense formations, the standard CCBS algorithm can fall into infinite non-terminating loops, failing to resolve simple spatial deadlocks<sup>39</sup>.

To resolve this limitation, computer scientists have developed Conflict-Based Search with Asynchronous Actions (CBS-AA)<sup>39</sup>. CBS-AA bypasses the uncountably infinite state space by discretizing wait actions into unit-duration intervals (MAPF-R-DT), transforming the planning process into an optimally-solvable problem with complete termination guarantees<sup>41</sup>. Alternatively, researchers have introduced the $\delta$-Branching Rule ($\delta$-BR) to CCBS<sup>40</sup>. The $\delta$-BR framework enforces strict analytical bounds on search-space pruning, guaranteeing that the continuous-time search terminates with a provably sound and optimal path in a finite number of iterations, even within highly constrained environments<sup>40</sup>.

## Distributed Edge Architectures and Resilient Mesh Infrastructure

Operating a decentralized drone swarm under real-world atmospheric or electromagnetic disturbances requires a resilient communication architecture. Modern swarms establish a peer-to-peer (P2P) wireless mesh network, completely removing the ground control station as a single point of failure<sup>21</sup>. These networks utilize real-time publish/subscribe substrates, such as the Data Distribution Service (DDS) commonly integrated into Robot Operating System 2 (ROS 2), or custom UDP broadcasts operating over Frequency Hopping Spread Spectrum (FHSS) radio to resist localized RF jamming<sup>20</sup>.

Each drone in the swarm executes an independent, multi-layered software stack that operates continuously without centralized intervention<sup>21</sup>.

```text
+--------------------------------------------------------+
|                   Mission Execution                    |
|       (Task State Machine & Waypoint Navigation)       |
+---------------------------+----------------------------+
                            |
+---------------------------v----------------------------+
|                  Consensus & Election                  |
|     (Role FSM, Heartbeat Timers, Voting Mechanics)     |
+---------------------------+----------------------------+
                            |
+---------------------------v----------------------------+
|                      Mesh Network                      |
|      (Routing Protocols & Neighbor State Tables)       |
+---------------------------+----------------------------+
                            |
+---------------------------v----------------------------+
|               Hardware Abstraction (HAL)               |
|      (IMU/GPS Sensors & Flight Controller Interface)   |
+--------------------------------------------------------+
                            ^
+---------------------------+----------------------------+
|                    Safety Watchdog                     |
|      (Independent Thread: Fail-Safe Triggering)        |
+--------------------------------------------------------+
```

To maintain global swarm coherence, each drone maintains a local "neighbor table" that tracks the signal strength, unique identifier, and timestamp of every reachable peer<sup>21</sup>. To detect hardware or communication failures, the swarm utilizes a structured heartbeat system<sup>21</sup>. Every drone periodically broadcasts a HELLO packet containing its state vector (ID, coordinates, battery level, and active role)<sup>21</sup>.

If a follower drone fails to detect a heartbeat from the designated swarm commander within a strict temporal window, it immediately triggers a state transition<sup>21</sup>. The timeout window is calculated as:

$$ \Delta t_{timeout} = k \cdot t_{heartbeat} + \tau_{network} $$

Typically, setting $k = 3$ with a $t_{heartbeat} = 0.5\text{ s}$ heartbeat interval yields a $1.5\text{ s}$ failure detection window (assuming negligible network latency $\tau_{network}$)<sup>21</sup>. Upon timeout, the drone's role finite state machine transitions from "FOLLOWER" to "CANDIDATE," initiating a dynamic leader election protocol<sup>21</sup>. To determine the most suitable commander, candidates broadcast their unique ID and a deterministically calculated priority score<sup>21</sup>:

$$ \text{Priority}_i = w_1 \cdot S_{battery} + w_2 \cdot S_{network} + w_3 \cdot S_{role} $$

where the individual sub-scores are defined as<sup>21</sup>:
- $S_{battery}$ (prioritizes drones with the longest remaining flight endurance)
- $S_{network}$ (prioritizes drones with the highest network connectivity)
- $S_{role} = 1$ if the drone is currently designated as a "SCOUT," or $S_{role} = 0$ for any other functional class.

If two candidate drones calculate identical priority scores, the unique, factory-assigned hardware UUID is utilized as a deterministic tiebreaker<sup>21</sup>. Once a candidate secures a quorum of votes from its visible peers, it transitions to "COMMANDER," reconstructs the global swarm state, and resumes task allocation<sup>21</sup>.

Physical separation of the swarm due to atmospheric wind shear can result in a "split-brain" scenario, where each isolated sub-group elects its own local commander<sup>21</sup>. When the sub-swarms physically drift back into radio range and reconnect, the two active commanders resolve the conflict by comparing their (election_term, timestamp) tuples<sup>21</sup>. The commander with the higher term wins; if the terms are equal, the newer timestamp wins<sup>21</sup>. The losing commander automatically demotes itself to a follower and triggers a state synchronization to absorb the winner's canonical plan<sup>21</sup>.

Under active jamming or GNSS-denied conditions, advanced swarms deploy consensus-driven positioning frameworks like SwarmRaft<sup>46</sup>. SwarmRaft combines GNSS and inertial navigation system (INS) data over a distributed network<sup>46</sup>. In the event of signal loss, the swarm executes a local voting loop to reconstruct the position of the failed node<sup>46</sup>. For each node $i$, a vote counter $V_i$ evaluates consistency against neighbor nodes $j$ in the local neighborhood $\mathcal{N}_i$<sup>46</sup>:

$$ V_i = \sum_{j \in \mathcal{N}_i} \text{sgn}(\epsilon - \| (p_i - p_j) - d_{ij} \|) $$

where

$$ \text{sgn}(x) = \begin{cases} 1 & \text{if } x \ge 0 \\ -1 & \text{if } x < 0 \end{cases} $$

Here, $p$ represents the reported 3D position vector, $d_{ij}$ is the physically measured inter-node distance, and $\epsilon$ is a consistency tolerance margin<sup>46</sup>. If $V_i < 0$, node $i$ is flagged as faulty, and the commander reconstructs its position using trusted peer coordinates to prevent spoofing or localization failures<sup>46</sup>.

To defend against identity hijacking and malicious node injection, swarms can deploy Credit-Score and Grouping-Mechanism Practical Byzantine Fault Tolerance (CG-PBFT) algorithms<sup>47</sup>. CG-PBFT classifies nodes into hierarchical consensus groups based on a dynamic credit score, optimizing the consensus sequence via BLS aggregate signature technology<sup>47</sup>. By restricting the consensus set to trusted nodes, CG-PBFT achieves a 250% increase in average throughput and a 70% reduction in average consensus latency compared to standard PBFT, making it highly suitable for resource-constrained UAV networks<sup>47</sup>.

## Environmental and Economic Accounting

The transition from chemical pyrotechnics to automated drone swarms represents a fundamental realignment of environmental impact and economic models for municipalities. Traditional fireworks release vast quantities of fine particulate matter directly into the lower atmosphere, producing severe localized spikes in both $PM_{2.5}$ and $PM_{10}$ concentrations<sup>49</sup>.

During national celebrations, regional $PM_{2.5}$ concentrations routinely spike between 2 and 10 times baseline background levels, occasionally doubling federal maximum safety thresholds<sup>49</sup>. These fine particles can penetrate deep into mammalian lungs, causing acute respiratory distress, triggering cardiovascular events, and exacerbating chronic respiratory illnesses<sup>15</sup>.

Furthermore, traditional fireworks generate a persistent toxic legacy in local ecosystems. The chemical oxidizers used to fuel the combustion—specifically perchlorate ($ClO_4^-$) compounds—settle directly into local watersheds, resulting in spikes between 24 and 1,028 times the baseline concentration<sup>15</sup>. Perchlorates act as potent thyroid disruptors in both humans and wildlife, impairing metabolic pathways and disrupting aquatic larval development<sup>12</sup>.

Acoustically, traditional pyrotechnics produce heavy artillery shockwaves ranging from 150 to 195 decibels, far exceeding the mammalian pain threshold of 75 to 80 decibels<sup>2</sup>. This intense acoustic trauma triggers severe panic and disorientation in wildlife, resulting in nest abandonment, vehicle collisions, and fatal cardiovascular shock in domestic animals<sup>2</sup>. It also acts as a primary trigger for post-traumatic stress disorder (PTSD) among military veterans, with surveys indicating that 93.9% of individuals with PTSD suffer severe negative psychological impacts from the unpredictable, high-decibel explosions of traditional fireworks<sup>55</sup>.

The following table contrasts the environmental, safety, and economic metrics of traditional heavy pyrotechnics with those of automated aerial drone displays:

| Parameter | Traditional Heavy Pyrotechnics | Automated Aerial Swarm Displays |
| :--- | :--- | :--- |
| **Acoustic Output** | 150 to 195 dB at source; high-amplitude, low-frequency concussive shockwaves<sup>2</sup>. | 60 to 65 dB; localized, steady high-frequency rotor hum<sup>2</sup>. |
| **Atmospheric Emissions** | Massive release of $PM_{2.5}$, sulfur dioxide ($SO_2$), and carbon monoxide ($CO$)<sup>12</sup>. | Zero immediate direct emissions during operational flight phase<sup>13</sup>. |
| **Water & Soil Contamination** | Heavy perchlorate ($ClO_4^-$) runoff; chemical fallout of Sr, Ba, Cu, Cr, and Pb<sup>15</sup>. | Localized lithium-battery charging footprint; recyclable hardware<sup>1</sup>. |
| **Wildfire Risk** | High; risk of ignition from hot falling chemical duds and burning debris<sup>1</sup>. | Negligible; equipped with active thermal monitoring and safety hover protocols<sup>1</sup>. |
| **Visual Mutability** | Fixed radial and cylindrical ballistic expansions; zero real-time dynamic path mutability<sup>59</sup>. | Full 3D geometric flexibility; real-time alphanumeric rendering and dynamic transformations<sup>14</sup>. |
| **Capital Lifecycle** | Single-use consumer expendable; 100% capital depreciation per show<sup>3</sup>. | Reusable hardware asset; amortized capital investment over hundreds of flights<sup>3</sup>. |
| **Operational Labor** | High-risk manual rigging; extensive post-event physical debris cleanup<sup>1</sup>. | Automated flight execution; minimal setup footprint and zero post-show structural debris<sup>14</sup>. |

## The Hybrid Frontier: Pyro-Drones and Extended Endurance Power Systems

To bridge the gap between traditional visceral appeal and modern algorithmic precision, engineering teams have developed hybrid systems known as "pyro-drones"<sup>60</sup>. These platforms mount specialized, lightweight pyrotechnic modules onto automated, tracking-gimbals carried by MARL-driven drone swarms<sup>59</sup>. This combination allows event producers to layer structural storytelling and precise spatial geometry with the classic emotional impact of live chemical reactions<sup>59</sup>.

A prominent example of this hybrid execution is Verge Aero’s X1 pyro module, which weighs just 70 grams<sup>62</sup>. This ultra-lightweight payload bypasses the need for independent power sources or radio receivers by interfacing directly with the drone’s primary flight controller via a unified ribbon cable<sup>62</sup>. To ensure safety, the flight controller executes a "Soft-Arm" check<sup>62</sup>. The pyrotechnic electric match cannot be ignited until the drone has successfully launched, cleared its safety geofence, and verified that all onboard sensors and flight control loops are operating within normal tolerances<sup>62</sup>. The physical chassis is protected by flat metal shielding that distributes explosive recoil across the carbon-fiber frame while shielding the battery pack and sensitive avionics from heat<sup>62</sup>.

To preserve the visual clarity of the drone's LEDs and protect the environment, these hybrid systems utilize advanced, nitrocellulose-based chemical formulations<sup>58</sup>. Traditional black-powder pyrotechnics produce a thick sulfurous smoke cloud that quickly obscures the drone formation<sup>12</sup>. Hybrid platforms resolve this by employing clean-burning pyrotechnics, such as Ultratec’s AngelFire and Low Smoke Lift (LSL) technologies<sup>58</sup>. By substituting standard carbon-rich fuels with high-nitrogen nitrocellulose, these systems eliminate up to 90% of lift smoke while producing exceptionally bright, saturated colors<sup>58</sup>. Additionally, modern pulse lift plates completely eliminate the need for disposable paper discs or plastic caps<sup>58</sup>. The entire pyrotechnic reaction is consumed in mid-air, allowing the hybrid swarm to execute synchronized, multi-stage cascading firework effects directly from the flying formation without leaving physical debris on the ground<sup>58</sup>.

However, adding pyrotechnic payloads increases structural weight, which reduces the flight endurance of standard battery-powered quadrotors<sup>62</sup>. While pure lithium-ion battery platforms are limited to short shows, developer teams are designing long-endurance platforms utilizing series hybrid architectures<sup>65</sup>. In a series hybrid drone, a liquid fuel tank supplies gasoline to a lightweight, two-stroke internal combustion engine coupled directly to a brushless permanent magnet generator<sup>65</sup>. The generator's alternating current output is converted to direct current by a rectifier, which directly drives the electronic speed controllers (ESCs) and brushless propeller motors<sup>65</sup>. A small, in-line lithium-ion battery pack acts as an electrical buffer to absorb transients and provide emergency backup power if the engine fails<sup>65</sup>.

This series hybrid configuration exploits the fundamental energy density gap between chemical fuels and electrochemistry. Gasoline carries approximately 12,200 Wh/kg of chemical energy, whereas a high-quality lithium-ion pack provides roughly 250 Wh/kg<sup>65</sup>. This fifty-fold energy density advantage dramatically extends operational flight times to several hours<sup>65</sup>. Furthermore, as fuel is consumed during flight, the total vehicle mass drops, lowering the required thrust, reducing electrical load, and increasing the overall efficiency of the propulsion system during the final stages of the display<sup>65</sup>.

## Conclusions

The transition of municipal celebrations from traditional pyrotechnics to automated aerial displays represents a significant shift in control systems engineering and environmental management. By replacing analog chemical propulsion with digitized, real-time voxel spaces, drone swarms resolve long-standing issues related to particulate emissions, chemical watershed contamination, and acoustic distress in urban ecosystems. At the core of this transition is a complete restructuring of swarm coordination: moving from vulnerable, centralized command architectures to resilient, peer-to-peer mesh networks driven by Multi-Agent Reinforcement Learning and robust pathfinding algorithms.

As municipalities continue to balance cultural traditions with strict environmental policies, the adoption of hybrid "pyro-drone" systems provides a practical evolutionary step. By combining the safety and precision of distributed edge computing with clean-burning, smoke-free chemical payloads, these hybrid platforms allow communities to enjoy the visual impact of traditional displays while meeting modern safety and sustainability standards. Ultimately, this integration demonstrates how advanced robotics and decentralized optimization can reshape public celebrations, turning a classic seasonal tradition into a highly optimized showcase of edge intelligence.

## Works Cited

1. Drone Displays, Fireworks and the Environment - Tasmanian Minerals, Manufacturing & Energy Council, [https://tmec.com.au/articles/drone-fireworks-environment/](https://tmec.com.au/articles/drone-fireworks-environment/)
2. Fireworks and Their Impact on Health - STM Learning, [https://stmlearning.com/news/all-blog-posts/fireworks-and-their-impact-on-health/](https://stmlearning.com/news/all-blog-posts/fireworks-and-their-impact-on-health/)
3. Why drones are replacing fireworks shows | National Geographic, [https://www.nationalgeographic.com/science/article/fireworks-drones-swarm-danger-health-technology](https://www.nationalgeographic.com/science/article/fireworks-drones-swarm-danger-health-technology)
4. Bloomington council approves $60,000 drone show for July 4 weekend - WGLT, [https://www.wglt.org/local-news/2026-04-27/bloomington-council-approves-60-000-drone-show-for-july-4-weekend](https://www.wglt.org/local-news/2026-04-27/bloomington-council-approves-60-000-drone-show-for-july-4-weekend)
5. Fairgrounds Firework mishap : r/bloomington - Reddit, [https://www.reddit.com/r/bloomington/comments/1lmog8x/fairgrounds_firework_mishap/](https://www.reddit.com/r/bloomington/comments/1lmog8x/fairgrounds_firework_mishap/)
6. Star Spangled Sky Drone Show - White River State Park, [https://whiteriverstatepark.org/event/star-spangled-sky-drone-show/](https://whiteriverstatepark.org/event/star-spangled-sky-drone-show/)
7. Free drone show to cap off America's 250 celebration at White River State Park - WTHR, [https://www.wthr.com/article/news/local/white-river-state-park-americas-250-drone-show-patriotism/531-4b4d2170-b2ad-44a9-ac91-b1c7f6ab90b0](https://www.wthr.com/article/news/local/white-river-state-park-americas-250-drone-show-patriotism/531-4b4d2170-b2ad-44a9-ac91-b1c7f6ab90b0)
8. Star Spangled Sky: A Drone Show at White River State Park - Visit Indiana, [https://visitindiana.in.gov/event/star-spangled-sky%3A-a-drone-show-at-white-river-state-park/30553/](https://visitindiana.in.gov/event/star-spangled-sky%3A-a-drone-show-at-white-river-state-park/30553/)
9. Holidays in the Sky | Holiday World Theme Park & Splashin' Safari Water Park, [https://holidayworld.com/shows-activities/holidays-in-the-sky/](https://holidayworld.com/shows-activities/holidays-in-the-sky/)
10. Holidays in the Sky Drone and Fireworks Spectacular - Visit Indiana, [https://visitindiana.in.gov/event/holidays-in-the-sky-drone-and-fireworks-spectacular/170/](https://visitindiana.in.gov/event/holidays-in-the-sky-drone-and-fireworks-spectacular/170/)
11. Fireworks Safety - IN.gov, [https://www.in.gov/dhs/get-prepared/fire-safety/fireworks-safety/](https://www.in.gov/dhs/get-prepared/fire-safety/fireworks-safety/)
12. Course:CONS200/2024WT1/The impacts of fireworks on wildlife - UBC Wiki, [https://wiki.ubc.ca/Course:CONS200/2024WT1/The_impacts_of_fireworks_on_wildlife](https://wiki.ubc.ca/Course:CONS200/2024WT1/The_impacts_of_fireworks_on_wildlife)
13. Not just a flash in the pan: short and long term impacts of fireworks on the environment, [https://plpa.net/wp-content/uploads/2025/11/pc22040.pdf](https://plpa.net/wp-content/uploads/2025/11/pc22040.pdf)
14. Are drone light shows an environmental alternative to fireworks? - The DEG, [https://thedeg.com.au/are-drone-light-shows-an-environmental-alternative-to-fireworks/](https://thedeg.com.au/are-drone-light-shows-an-environmental-alternative-to-fireworks/)
15. 05/21/2024 - Work Study - Additional Docs-Fireworks, [https://lf.portorchardwa.gov/WebLink/DocView.aspx?id=246212&dbid=0&repo=PortOrchard](https://lf.portorchardwa.gov/WebLink/DocView.aspx?id=246212&dbid=0&repo=PortOrchard)
16. Enhancing Drone Light Shows Performances: Optimal Allocation and Trajectories for Swarm Drone Formations - arXiv, [https://arxiv.org/html/2603.24401v1](https://arxiv.org/html/2603.24401v1)
17. Indiana Drone Light Shows by Sky Elements, [https://skyelementsdrones.com/indiana](https://skyelementsdrones.com/indiana)
18. Enhanced multi agent coordination algorithm for drone swarm patrolling in durian orchards, [https://pmc.ncbi.nlm.nih.gov/articles/PMC11914038/](https://pmc.ncbi.nlm.nih.gov/articles/PMC11914038/)
19. War 2026: Future of Drone Swarms and Edge AI - Blockchain Council, [https://www.blockchain-council.org/news/war-2026-future-of-drone-swarms-edge-ai-countermeasures/](https://www.blockchain-council.org/news/war-2026-future-of-drone-swarms-edge-ai-countermeasures/)
20. Ukraine's drone mesh war is an edge AI problem - EdgeLance, [https://www.edgelance.com/blog/ukraine-drone-mesh-edge-ai](https://www.edgelance.com/blog/ukraine-drone-mesh-edge-ai)
21. Designing Resilient Drone Swarms: Leaderless-Tolerant Mesh Networks with Secure Communications - Simplico, [https://simplico.net/2026/04/19/designing-resilient-drone-swarms-leaderless-tolerant-mesh-networks-with-secure-communications/](https://simplico.net/2026/04/19/designing-resilient-drone-swarms-leaderless-tolerant-mesh-networks-with-secure-communications/)
22. PER-MADDPG: Multi-Agent Reinforcement Learning for Coordinated UAV Swarm Performance under Rhythmic Constraints - ResearchGate, [https://www.researchgate.net/publication/395207000_PER-MADDPG_Multi-Agent_Reinforcement_Learning_for_Coordinated_UAV_Swarm_Performance_under_Rhythmic_Constraints](https://www.researchgate.net/publication/395207000_PER-MADDPG_Multi-Agent_Reinforcement_Learning_for_Coordinated_UAV_Swarm_Performance_under_Rhythmic_Constraints)
23. arjun7579/maddpg-drone-coverage: Implementation of a multi-agent UAV swarm system ... - GitHub, [https://github.com/arjun7579/maddpg-drone-coverage](https://github.com/arjun7579/maddpg-drone-coverage)
24. Drone swarm coordination patent landscape 2026 - PatSnap, [https://www.patsnap.com/resources/blog/articles/drone-swarm-coordination-patent-landscape-2026/](https://www.patsnap.com/resources/blog/articles/drone-swarm-coordination-patent-landscape-2026/)
25. Multi-Agent Deep Deterministic Policy Gradient (MADDPG) - AgileRL Documentation, [https://docs.agilerl.com/en/latest/api/algorithms/maddpg.html](https://docs.agilerl.com/en/latest/api/algorithms/maddpg.html)
26. Multi-agent Deep Deterministic Policy Gradient (MADDPG) - XuanCe, [https://xuance.org/documents/algorithms/marl/maddpg.html](https://xuance.org/documents/algorithms/marl/maddpg.html)
27. A tutorial on MADDPG. Original article… | by Diego Benalcazar | Machine Intelligence and Deep Learning | Medium, [https://medium.com/machine-intelligence-and-deep-learning-lab/a-tutorial-on-maddpg-53241ae8aac](https://medium.com/machine-intelligence-and-deep-learning-lab/a-tutorial-on-maddpg-53241ae8aac)
28. Cooperative Encirclement and Obstacle Avoidance of Fixed-Wing UAVs via MADDPG with Curriculum Learning - MDPI, [https://www.mdpi.com/2504-446X/9/10/727](https://www.mdpi.com/2504-446X/9/10/727)
29. Collision Avoidance Mechanism for Swarms of Drones - PMC - NIH, [https://pmc.ncbi.nlm.nih.gov/articles/PMC11858889/](https://pmc.ncbi.nlm.nih.gov/articles/PMC11858889/)
30. Safe Interval Path Planning (SIPP) - Emergent Mind, [https://www.emergentmind.com/topics/safe-interval-path-planning-sipp](https://www.emergentmind.com/topics/safe-interval-path-planning-sipp)
31. Multi-Agent Pathfinding with Continuous Time - IJCAI, [https://www.ijcai.org/proceedings/2019/0006.pdf](https://www.ijcai.org/proceedings/2019/0006.pdf)
32. Real-time Safe Interval Path Planning - Computer Science, [https://www.cs.unh.edu/~ruml/papers/rtsipp-socs-24.pdf](https://www.cs.unh.edu/~ruml/papers/rtsipp-socs-24.pdf)
33. Multi-Objective Safe-Interval Path Planning with Dynamic Obstacles - Zhongqiang Richard Ren, [https://wonderren.github.io/files/ren22_mosipp_RAL_IROS22.pdf](https://wonderren.github.io/files/ren22_mosipp_RAL_IROS22.pdf)
34. MT-SIPP: An Efficient Collision-Free Multi-Chain Robot Path Planning Algorithm - MDPI, [https://www.mdpi.com/2075-1702/12/7/482](https://www.mdpi.com/2075-1702/12/7/482)
35. PathPlanning/Continuous-CBS: Continuous CBS - a modification of conflict based search algorithm, that allows to perform actions (move, wait) of arbitrary duration. Timeline is not discretized, i.e. is continuous. · GitHub, [https://github.com/PathPlanning/Continuous-CBS](https://github.com/PathPlanning/Continuous-CBS)
36. Conflict-Based Search (CBS) - Emergent Mind, [https://www.emergentmind.com/topics/conflict-based-search-cbs](https://www.emergentmind.com/topics/conflict-based-search-cbs)
37. Adding Heuristics to Conflict-Based Search for Multi-Agent Path Finding - School of Computing Science, [https://www2.cs.sfu.ca/~hangma/pub/icaps18.pdf](https://www2.cs.sfu.ca/~hangma/pub/icaps18.pdf)
38. Branch-and-Cut-and-Price for Multi-Agent Pathfinding - IJCAI, [https://www.ijcai.org/proceedings/2019/0179.pdf](https://www.ijcai.org/proceedings/2019/0179.pdf)
39. Conflict-Based Search for Multi Agent Path Finding with Asynchronous Actions - arXiv, [https://arxiv.org/abs/2603.18866](https://arxiv.org/abs/2603.18866)
40. Optimal Multi-agent Path Finding in Continuous Time - arXiv, [https://arxiv.org/html/2508.16410v2](https://arxiv.org/html/2508.16410v2)
41. Revisiting Conflict Based Search with Continuous-Time - arXiv, [https://arxiv.org/html/2501.07744v3](https://arxiv.org/html/2501.07744v3)
42. Conflict-Based Search for Multi Agent Path Finding with Asynchronous Actions - arXiv, [https://arxiv.org/html/2603.18866v1](https://arxiv.org/html/2603.18866v1)
43. Autonomous, Edge-Native Drone Swarms Unveiled by Tashi - EIN Presswire, [https://www.einpresswire.com/article/920358795/autonomous-edge-native-drone-swarms-unveiled-by-tashi](https://www.einpresswire.com/article/920358795/autonomous-edge-native-drone-swarms-unveiled-by-tashi)
44. Autonomous, Edge-Native Drone Swarms Unveiled In India - Aviation Defence Universe, [https://www.aviation-defence-universe.com/autonomous-edge-native-drone-swarms-unveiled-in-india/](https://www.aviation-defence-universe.com/autonomous-edge-native-drone-swarms-unveiled-in-india/)
45. Agentic AI Meets Edge Computing in Autonomous UAV Swarms - arXiv, [https://arxiv.org/html/2601.14437v1](https://arxiv.org/html/2601.14437v1)
46. SwarmRaft: Leveraging Consensus for Robust Drone Swarm Coordination in GNSS-Degraded Environments - arXiv, [https://arxiv.org/html/2508.00622v2](https://arxiv.org/html/2508.00622v2)
47. (PDF) Design of Consensus Algorithm for UAV Swarm Identity Authentication Based on Lightweight Blockchain - ResearchGate, [https://www.researchgate.net/publication/399493446_Design_of_Consensus_Algorithm_for_UAV_Swarm_Identity_Authentication_Based_on_Lightweight_Blockchain](https://www.researchgate.net/publication/399493446_Design_of_Consensus_Algorithm_for_UAV_Swarm_Identity_Authentication_Based_on_Lightweight_Blockchain)
48. CMC | Free Full-Text | Design of Consensus Algorithm for UAV Swarm Identity Authentication Based on Lightweight Blockchain - Tech Science Press, [https://www.techscience.com/cmc/v87n2/66571/html](https://www.techscience.com/cmc/v87n2/66571/html)
49. Impact of 4th of July Fireworks on Spatiotemporal PM2.5 Concentrations in California Based on the PurpleAir Sensor Network: Implications for Policy and Environmental Justice - PMC, [https://pmc.ncbi.nlm.nih.gov/articles/PMC8198140/](https://pmc.ncbi.nlm.nih.gov/articles/PMC8198140/)
50. The Dark Side of Fireworks – The Chemistry of their Environmental Effects, [https://www.compoundchem.com/2017/01/05/fireworks-environment/](https://www.compoundchem.com/2017/01/05/fireworks-environment/)
51. Bombs Bursting in Air: Environmental Regulation of Fireworks - Legal Planet, [https://legal-planet.org/2013/07/03/bombs-bursting-in-air-environmental-regulation-of-fireworks/](https://legal-planet.org/2013/07/03/bombs-bursting-in-air-environmental-regulation-of-fireworks/)
52. What's in that smoke? Experts warn of hidden fireworks pollution :: WRAL.com, [https://www.wral.com/news/local/hidden-fireworks-pollution-raleigh-july-2025/](https://www.wral.com/news/local/hidden-fireworks-pollution-raleigh-july-2025/)
53. The Impact of Fireworks on Selected Ambient Particulate Metal Concentrations Associated with the Independence Day Holiday - MDPI, [https://www.mdpi.com/2073-4433/16/1/17](https://www.mdpi.com/2073-4433/16/1/17)
54. Why fireworks are torture for dogs, cats, and wild animals | AnimaNaturalis, [https://www.animanaturalis.org/n/47037/why-fireworks-are-torture-for-dogs-cats-and-wild-animals](https://www.animanaturalis.org/n/47037/why-fireworks-are-torture-for-dogs-cats-and-wild-animals)
55. Fireworks Frighten Animals. It Doesn't Have to Be This Way. | Sierra Club, [https://www.sierraclub.org/sierra/fireworks-frighten-animals-it-doesn-t-have-be-way](https://www.sierraclub.org/sierra/fireworks-frighten-animals-it-doesn-t-have-be-way)
56. Fireworks are unnecessarily loud, and they should be replaced with quieter fireworks (like flying fish), or drone shows. : r/unpopularopinion - Reddit, [https://www.reddit.com/r/unpopularopinion/comments/1txyiwq/fireworks_are_unnecessarily_loud_and_they_should/](https://www.reddit.com/r/unpopularopinion/comments/1txyiwq/fireworks_are_unnecessarily_loud_and_they_should/)
57. PTSD UK Fireworks Impact report 2025, [https://www.ptsduk.org/wp-content/uploads/2025/10/PTSD-UK-Fireworks-Impact-report-2025-1.pdf](https://www.ptsduk.org/wp-content/uploads/2025/10/PTSD-UK-Fireworks-Impact-report-2025-1.pdf)
58. About us - Nuvu Kft., [https://nuvu.hu/en/aboutus/](https://nuvu.hu/en/aboutus/)
59. Pyro drone show: Technology, costs, and key advantages for events - Cyberdrone, [https://www.cyberdrone.com/blog/pyro-drone-show](https://www.cyberdrone.com/blog/pyro-drone-show)
60. Pyro Drones are Fireworks On Drones, [https://skyelementsdrones.com/pyro-drones](https://skyelementsdrones.com/pyro-drones)
61. How to Integrate Drone Shows with Fireworks: Technology, Safety & Event Planning, [https://www.droneshowsoftware.com/news/how-its-made-integrating-drone-shows-with-fireworks](https://www.droneshowsoftware.com/news/how-its-made-integrating-drone-shows-with-fireworks)
62. X1 Pyro Module - Verge Aero Docs, [https://docs.verge.aero/drone-show-hardware/payloads/x1-pyro-module](https://docs.verge.aero/drone-show-hardware/payloads/x1-pyro-module)
63. Pyro Drone Shows | Pyroemotions, [https://pyroemotions.com/en/pyro-lights-drones/pyro-drones](https://pyroemotions.com/en/pyro-lights-drones/pyro-drones)
64. Drone Pyrotechnics - Ultratec Special Effects, [https://ultratecfx.com/pyrotechnics/products-catalog/drone-pyro/](https://ultratecfx.com/pyrotechnics/products-catalog/drone-pyro/)
65. Hybrid drones: How do they work? - Skyfront, [https://skyfront.com/learn/hybrid-drone](https://skyfront.com/learn/hybrid-drone)
