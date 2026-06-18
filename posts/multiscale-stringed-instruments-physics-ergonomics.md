---
title: "Engineering Dynamics, Metallurgy, and Biomechanical Ergonomics of Multi-Scale Stringed Instruments"
date: 2026-06-18
description: A rigorous physics and engineering analysis of multi-scale fanned-fret stringed instruments — from transverse and torsional wave propagation equations to metallurgy, Euler-Bernoulli beam theory for inharmonicity, and hand mechanics.
tags: [physics, engineering, mathematics, acoustics, metallurgy, ergonomics, multi-scale, instruments, music]
---

## Theoretical Mechanics of String Vibration and Tension Dynamics

The performance of a stringed musical instrument is governed by the physical laws of transverse wave propagation<sup>1</sup>. For an ideal, perfectly flexible string, the fundamental vibrational frequency (\(f\)) is determined by the string's length (\(L\)), axial tension (\(T\)), and linear mass density (\(\mu\))<sup>1</sup>. This relationship is mathematically defined by the classical wave equation derived from Mersenne's laws<sup>1</sup>:

$$f = \frac{1}{2L} \sqrt{\frac{T}{\mu}}$$

To adjust the pitch of an individual string to a designated note, a player alters the tension (\(T\)) until the vibrational frequency matches the target pitch<sup>4</sup>. On a traditional single-scale instrument, the vibrating length (\(L\)) remains identical across all strings<sup>5</sup>. Under a uniform scale length, the only variables available to achieve different pitches are the linear mass density of the string and its axial tension<sup>1</sup>. This mechanical framework introduces significant physical compromises<sup>1</sup>. For example, on a standard bass guitar with a uniform 34" scale length, a low B string (\(B_0\)) requires a massive linear density to avoid a flaccid, unplayable state<sup>1</sup>. Conversely, simply tightening the string to achieve physical resistance increases tension at the cost of transient speed and playability<sup>9</sup>.

The physical speed of a transverse wave traveling along a string is defined as<sup>2</sup>:

$$v = \sqrt{\frac{T}{\mu}}$$

Higher-tuned strings naturally exhibit higher frequency and wave velocity, making them feel tighter and more responsive<sup>5</sup>. If a builder attempts to increase the tension of a low B string on a standard bass by extending the scale length uniformly to 35", the actual change in velocity and tension is minimal<sup>5</sup>. Calculating the percentage difference in wave velocity between a 34" and a 35" scale length reveals only a marginal shift<sup>5</sup>:

$$\% \Delta v = \left( \sqrt{\frac{35}{34}} - 1 \right) \times 100\% \approx 1.46\%$$

This 1.46% difference is barely perceptible to the player, demonstrating that uniform long-scale designs fail to fully resolve low-end flaccidity<sup>5</sup>.

To achieve uniform wave propagation velocity (\(v\)) and balanced tactile tension across strings tuned to different registers, the scale length must vary in direct proportion to the target frequencies<sup>1</sup>. Under ideal velocity-matching conditions, the relationship between any two strings on a multi-scale fretboard is expressed as<sup>5</sup>:

$$\frac{L_1}{L_2} = \frac{f_2}{f_1}$$

By dynamically extending the scale length (\(L\)) for lower-frequency strings and shortening it for higher-frequency strings, multi-scale systems satisfy this velocity-matching equation<sup>5</sup>. This allows the lower strings to achieve optimal tension without requiring excessively thick string gauges that damp transient attack and muddy the fundamental pitch<sup>1</sup>.

---

## String Metallurgy, Core Construction, and Boundary Friction

The physical behavior of a string is deeply influenced by its internal architecture and metallurgy<sup>1</sup>. String gauge is merely a dimensional indicator; the primary determinant of vibrational tension and flexibility is the string's unit weight (linear mass density) and internal core geometry<sup>1</sup>.

```
  Hexagonal Core (Hex Core)              Round Core (Round Core)
     ▲                                      ▲
   /   \  ◄─── Wrap Wire Bites             (   ) ◄─── Continuous Contact,
   \   /       into Corners                \   /      Higher Flexibility
     ▼                                      ▼
```

### Core Geometry and Mechanical Response

Modern strings are manufactured using either a hexagonal or a round carbon-steel core wire<sup>1</sup>.
* **Hex Core:** This geometry features sharp corners that allow the outer wrap wire to bite into the core<sup>1</sup>. This mechanical grip prevents slippage, leading to superior tuning stability and a bright, aggressive transient attack<sup>1</sup>. However, the hex shape increases structural stiffness, which elevates the bending resistance of the string<sup>1</sup>.
* **Round Core:** These strings maintain continuous, flush contact between the core and the outer wrap wire<sup>1</sup>. Consequently, round-core strings are denser and heavier in mass than hex-core variants of the same gauge<sup>1</sup>. They are physically more flexible, providing a softer tactile feel under the fingers<sup>1</sup>. However, this high flexibility can be a disadvantage in down-tuned progressive metal contexts, as the larger vibrational envelope can lead to extreme fret buzz against the fingerboard<sup>1</sup>.

### Metallurgy and Material Density

The material composition of the core and wrap wires dictates both magnetic output and structural elasticity<sup>1</sup>. Table 1 compares the physical properties and performance profiles of common string materials.

#### Table 1: String Metallurgy

| String Metallurgy | Core Structure | Density & Elasticity | Tactile Playability | Acoustic & Electro-Magnetic Profile |
| :--- | :--- | :--- | :--- | :--- |
| **Stainless Steel** | High-carbon steel core<sup>14</sup> | High stiffness, resistant to deformation<sup>4</sup> | Stiff and abrasive under hand pressure<sup>1</sup> | Bright, aggressive treble response; high magnetic output<sup>1</sup> |
| **Cobalt / Nickel-Plated Steel** | Hexagonal steel core<sup>1</sup> | Moderate elasticity, balanced tension<sup>1</sup> | Smooth, highly responsive tactile feel<sup>1</sup> | Balanced midrange focus; ideal for modern progressive metal<sup>14</sup> |
| **Phosphor Bronze** | High-tensile steel core | Dense wrap wire, low magnetic response<sup>1</sup> | Medium stiffness, high tension requirement<sup>1</sup> | Warm, rich acoustic overtones; designed for acoustic projection<sup>1</sup> |
| **80/20 Bronze** | High-tensile steel core | Slightly lower density than phosphor bronze | Flexible feel on acoustic scale lengths | Bright, brassy initial response; rapid harmonic decay |

### Torsional Wave Propagation and Boundary Reflections

When a string is plucked or picked, it experiences not only transverse vibration but also torsional (twisting) wave propagation along its length<sup>16</sup>. As these torsional waves reach the physical boundary of the bridge saddle, they undergo reflections that travel back toward the picking hand<sup>16</sup>. The rate of these reflections is inversely proportional to the distance between the picking point and the bridge<sup>16</sup>.

The velocity of torsional wave propagation is determined by the physical composition of the string core<sup>16</sup>. Homogeneous steel strings exhibit highly efficient torsional propagation, experiencing seven to eight torsional reflections for every single transverse wave cycle<sup>16</sup>. In contrast, synthetic-core strings experience five to six reflections, and homogeneous gut strings experience only two<sup>16</sup>. A higher number of boundary reflections increases the resistance felt by the player's picking hand, making the string feel stiffer during fast, alternate-picked passages<sup>16</sup>.

---

## Mathematical Modeling of Inharmonicity and Intonation

In real-world stringed instruments, the assumption of perfect string flexibility is physically invalid<sup>3</sup>. Because strings are constructed from rigid metals, they exhibit a natural bending stiffness that acts as an additional restoring force<sup>14</sup>. This stiffness modifies the classical wave equation into a fourth-order partial differential equation based on Euler-Bernoulli beam theory<sup>2</sup>:

$$E I \frac{\partial^4 y}{\partial x^4} - T \frac{\partial^2 y}{\partial x^2} + \mu \frac{\partial^2 y}{\partial t^2} = 0$$

where \(E\) represents the Young’s modulus of elasticity of the material, and \(I\) represents the second moment of area of the string’s cross-section<sup>3</sup>. For a solid cylindrical string of radius \(r\), the second moment of area is \(I = \frac{\pi r^4}{4}\), and the radius of gyration is \(K = \frac{r}{2}\)<sup>2</sup>.

For a string pinned (simply supported) at both the nut and bridge, solving this boundary-value problem yields the frequency equation for the \(n\)-th partial<sup>2</sup>:

$$f_n = n f_0 \sqrt{1 + B n^2}$$

where \(f_0\) is the fundamental frequency of an ideal string, and \(B\) is the dimensionless inharmonicity coefficient<sup>3</sup>:

$$B = \frac{\pi^2 E I}{T L^2} = \frac{\pi^3 E r^4}{4 T L^2}$$

This mathematical relationship shows that the inharmonicity coefficient (\(B\)) scales with the fourth power of the string’s radius (\(r\)) and is inversely proportional to the tension (\(T\)) and the square of the scale length (\(L\))<sup>2</sup>.

```
   Harmonic Alignment: Ideal vs. Stiff String (High Inharmonicity)
   
   Ideal String:   |─────|─────|─────|─────|─────|  (Integer Multiples: 1, 2, 3...)
   
   Stiff String:   |─────|──────|───────|────────| (Sharp Partials: B coefficient stretching)
```

The physical consequence of inharmonicity is that higher overtones depart from strict integer multiples of the fundamental frequency, vibrating increasingly sharp<sup>3</sup>. This frequency stretching is highly perceptible in the human hearing range and is a primary cause of muddy-sounding chords<sup>1</sup>. When a thick string is used on a short scale length, \(B\) increases dramatically<sup>3</sup>.

For instance, the G-string (\(G_3\)) on a standard electric guitar is the thickest unwound monofilament string in the set, making it notoriously difficult to tune and intonate<sup>17</sup>. It suffers from high inharmonicity, causing its upper partials to clash with other strings<sup>17</sup>. On a bass guitar, the low B string (\(B_0\)) would require an impractically thick gauge (such as \(0.145"\)) to maintain playable tension on a short scale, resulting in a stiff, non-elastic string that behaves more like a metal bar than an ideal vibrating string<sup>17</sup>. This physical stiffness causes rapid decay and a dull, "dead" sound<sup>17</sup>.

Multi-scale geometry resolves this physical dilemma<sup>1</sup>. By extending the scale length (\(L\)) of the lower strings, the system can achieve target tensions (\(T\)) using significantly thinner core diameters (\(d\))<sup>1</sup>. Since \(B\) depends on the fourth power of the radius but only the second power of length, reducing the string's thickness has a powerful effect in minimizing inharmonicity<sup>2</sup>.

Additionally, multi-scale systems allow the physical gauges of a string set to be closer in size<sup>12</sup>. This gauge normalization keeps tension balanced without requiring extreme variations in string mass, resulting in clean, well-aligned overtones across the entire fretboard<sup>1</sup>.

---

## Fretboard Architecture, Mechanics, and Ergonomic Optimization

The physical design of a multi-scale fretboard involves coordinating several geometric planes<sup>21</sup>. No single component can be designed in isolation; changes in scale length affect string tension, which in turn influences neck relief, bridge height, and overall structural stability<sup>21</sup>.

```
                Progressive Fanned Fret Geometry
                
   [Nut / Fret 0]         [Fret 9: Neutral]        [Bridge Saddles]
        \                       |                       /
         \                      |                      /
          \                     |                     /
           \                    |                     /
```

### The Systemic Physics of the Neck and Fingerboard

A modern multi-scale neck is engineered as a pre-stressed loaded beam<sup>21</sup>. The asymmetrical tension generated by fanning the scales—where the bass side exerts significantly higher physical force than the treble side—creates a twisting torque across the neck's longitudinal axis<sup>9</sup>.

To resist this torque and prevent structural warping over time, manufacturers reinforce the neck with dual carbon-fiber rods placed parallel to a two-way adjustable truss rod<sup>21</sup>. This reinforcing framework stabilizes the neck, allowing it to settle into a consistent relief curve under string tension rather than relying on hardware force alone<sup>21</sup>.

To maintain uniform string height and action across fanned frets, builders employ a conical (compound) fingerboard radius<sup>21</sup>. Unlike a standard cylindrical radius, which has a constant curve, a conical radius forms a portion of a cone, flattening progressively as it approaches the bridge<sup>21</sup>. This geometry ensures that when strings are fretted or bent across the fanned frets, they maintain a consistent distance from the frets, preventing dead spots or buzzing<sup>21</sup>.

### Biomechanical Ergonomics of the Neutral Fret

The placement of the neutral (perpendicular) fret determines the distribution of the fan angle across the neck, directly impacting the player's wrist health<sup>9</sup>. When a musician stands or sits in a natural playing posture, their fretting arm pivots at the elbow and shoulder, and the hand naturally rotates as it moves along the neck<sup>9</sup>.

* **9th Fret Neutral:** Set as the default by luthiers like Ormsby and Kiesel, this layout aligns the perpendicular fret with the hand's natural resting angle near the middle of the neck<sup>9</sup>. The frets fan inward toward the nut (matching the inward angle of the wrist at low frets) and outward toward the bridge (matching the forearm's natural angle at high frets)<sup>9</sup>. This configuration keeps the wrist straight, reducing tendon strain and preventing repetitive strain injuries<sup>9</sup>.
* **12th Fret Neutral:** Used on many Ibanez multi-scale models, this layout places the straight fret at the midpoint of the neck<sup>10</sup>. While comfortable for high-register soloing, it creates a steep, aggressive fan angle at the nut<sup>27</sup>. This angle can make low-register barre chords difficult for players with smaller hands<sup>27</sup>.
* **Nut Neutral (0-Fret):** This layout fans all frets outward toward the bridge, eliminating the angle at the nut<sup>10</sup>. This provides a familiar feel for low-register rhythm playing but requires an extremely slanted bridge, which can make palm muting awkward<sup>10</sup>.

---

## Electro-Acoustic Coupling, Node Alignment, and Hardware Integration

Integrating electronics and hardware into a multi-scale instrument requires precise engineering to maintain consistent string-to-string balance and dynamic response<sup>9</sup>.

```
                 Angled Pickup and Saddle Alignment
                 
                         [Bridge Saddles]
                          \   \   \   \
                           \   \   \   \
                            \   \   \   \
                    [Slanted Pickup Coils]
                      ==================
```

### Bridge Saddle Intonation Dynamics

To achieve accurate intonation, the bridge saddles must be individually adjusted to compensate for string properties<sup>4</sup>. When a string is fretted, the physical action (string height) forces the player to depress the string, stretching it and increasing its tension<sup>4</sup>. This tension spike pulls the fretted note sharp<sup>4</sup>.

To offset this, the bridge saddles are moved backward to lengthen the vibrating path, compensating for the tension increase<sup>4</sup>. Shorter scales and lower tensions require greater compensation at the saddle to prevent intonation drift<sup>4</sup>. On a multi-scale bridge, the saddles are mounted on an angled plate or as individual monorail units, aligning the compensation path with the fanned scale lengths<sup>7</sup>.

### Electromagnetic Pickup Alignment and Wave Nodes

The position of a pickup along the string's length directly determines its output tone<sup>31</sup>. Plucking a string generates an array of standing waves with physical nodes (points of zero vibration) and antinodes (points of maximum vibration) distributed along the scale<sup>31</sup>.

If a pickup's pole piece sits directly beneath a node for a specific harmonic, that frequency will be absent from the amplified signal<sup>31</sup>. On a traditional guitar, these nodes form straight lines perpendicular to the strings, allowing straight pickups to capture a consistent balance of frequencies<sup>31</sup>.

On a multi-scale instrument, the nodes fan out proportionally with the different scale lengths<sup>31</sup>. If a standard straight pickup is used, it will sit at different relative physical positions under each string—close to the bridge on the high strings and far from the bridge on the low strings<sup>31</sup>. This misalignment causes a muddy neck-like tone on the low register and a thin, ice-pick treble response on the high register<sup>31</sup>.

To ensure consistent tone, the pickups must be slanted to follow the fanned angle of the string nodes<sup>10</sup>. This angling can be accomplished using two primary pickup formats:
* **Slanted Open-Coil Humbuckers:** These are custom-engineered pickups where the individual coils and magnet bobbins are physically offset or skewed (typically between \(10^\circ\) and \(20^\circ\))<sup>33</sup>. This offset ensures that the pole screws align directly under each fanned string, avoiding volume drop-offs and maintaining balanced output<sup>33</sup>.
* **Active Soapbar Pickups:** These utilize continuous internal blade or neodymium disc magnets rather than individual pole pieces<sup>33</sup>. The solid magnetic bar creates an uninterrupted sensing field, allowing the pickup housing to be mounted at an angle without causing string alignment issues<sup>33</sup>.

---

## Historical Milestones and Modern Industrial Evolution

The development of the multi-scale fingerboard spans centuries, evolving from Renaissance acoustic designs to modern high-performance electric instruments<sup>35</sup>. Table 2 traces the key innovations and patents that have shaped this technology.

#### Table 2: Historical Milestones

| Historical Era | Key Innovator / Instrument | Technical Milestone | Impact on Instrument Design |
| :--- | :--- | :--- | :--- |
| c. 1560 | Renaissance Bandora<sup>35</sup> | Slanted bridge and frets with varying scale lengths<sup>35</sup> | Established early principles of tension balancing for low-register strings<sup>35</sup>. |
| 1900 | E. A. Edgren<sup>35</sup> | U.S. Patent #652-353 for radial, diverging frets<sup>35</sup> | Earliest patent for fanned frets on curved, steel-string fingerboards<sup>35</sup>. |
| 1977 | John D. Starrett<sup>36</sup> | The StarrBoard touch-tapping instrument<sup>36</sup> | First modern multi-scale fretboard, connecting two distinct scale lengths<sup>36</sup>. |
| 1989 | Ralph Novak<sup>35</sup> | U.S. Patent #4,852,450 for the "Multiple Scale Fretboard"<sup>35</sup> | Popularized the "fanned-fret" design for electric guitars and basses<sup>35</sup>. |
| Post-2008 | Ormsby, Dingwall, Kiesel, Strandberg<sup>12</sup> | Expiration of Novak's patent; public domain transition<sup>35</sup> | Led to widespread commercial adoption and the standardization of multi-scale production<sup>35</sup>. |

### Historical Perspectives: From the Renaissance to the StarrBoard

The physical benefits of varying scale lengths were first harnessed in the mid-16th century with the bandora and the orpharion<sup>35</sup>. These multi-string instruments featured slanted frets and bridges, allowing their lower bass strings to maintain clarity and tension without requiring massive string diameters<sup>35</sup>.

In 1900, E. A. Edgren patented a radial fret layout designed for curved fretboards<sup>35</sup>. While structurally innovative, the design remained a historical curiosity as contemporary music did not yet require extended bass ranges on acoustic guitars<sup>35</sup>.

The concept re-emerged in 1977 when John D. Starrett invented the StarrBoard, a touch-tapping instrument<sup>36</sup>. To accommodate a vast pitch register spanning from a low B on bass to a high B four octaves above, Starrett plotted two ideal scale lengths and connected them linearly, creating the first modern multi-scale fretboard layout<sup>36</sup>.

### The Ralph Novak Era and Trademark Legacy

Luthier Ralph Novak is credited with bringing the fanned-fret concept to the electric guitar<sup>35</sup>. While repairing instruments in New York City and Berkeley, California, Novak noticed that short-scale instruments possessed a sweet, warm treble register but a muddy bass, while long-scale instruments delivered bright, focused bass response<sup>37</sup>.

To merge these qualities, Novak developed and patented the modern "fanned-fret" system (U.S. Patent #4,852,450, granted in 1989), founding Novax Guitars<sup>35</sup>. This design gave blues guitarists warm, bendable high strings alongside clear, tight low strings<sup>37</sup>. Following the expiration of Novak’s patent in 2008, the multi-scale concept entered the public domain<sup>35</sup>. This allowed other manufacturers to adopt and refine the design, though Novak’s firm retained the trademarked term "Fanned-Fret"<sup>35</sup>.

### Modern Industrial Landscape and Progressive Metal Evolution

In the contemporary guitar market, the multi-scale system has become an essential tool for technical progressive metal, math rock, and "djent"<sup>10</sup>. Bands like Meshuggah, Animals as Leaders, and Periphery rely on extended-range eight- and nine-string guitars tuned to extremely low registers<sup>15</sup>.

On a standard single-scale guitar, these low tunings suffer from loose tension and severe pitch spikes<sup>9</sup>. Multi-scale instruments with spreads of 25.5"–27" or 25.5"–28" provide the structural tension required to stabilize these low notes, ensuring rapid transient response and consistent tuning stability<sup>9</sup>.

Furthermore, the clean overtone alignment of fanned-fret systems delivers a highly detailed acoustic profile<sup>1</sup>. This harmonic clarity, free from inharmonic frequency clashing, produces a rich, transparent tone reminiscent of high-fidelity analog vinyl tracking<sup>1</sup>.

```
                     Modern Multi-Scale Brand Ecosystem
                     
   [Dingwall]                 [Strandberg]                 [Ormsby]
   • Saskatoon, Canada        • Headless Boden designs      • Coined "Multiscale"
   • 34" to 37" bass spread    • Ergonomic EndurNeck        • 9th fret neutral standard
   • Neve onboard preamps     • Lightweight, 0-neutral      • Extreme fan spreads
```

In the bass market, Sheldon Dingwall of Dingwall Designer Guitars popularized fanned-fret designs for four-, five-, and six-string electric basses<sup>8</sup>. The classic Dingwall layout uses a scale spread from 34" on the high G string to a long 37" on the low B string<sup>8</sup>. This extended length allows a standard-gauge 0.130" B string to achieve crisp focus and deep sustain without sounding muddy or flaccid<sup>1</sup>.

This physical clarity is reinforced by specialized electronics, such as the Rupert Neve Designs active preamps used on the John Taylor Signature model, which are voiced to capture the wide, balanced frequency output of fanned-fret instruments<sup>8</sup>. Additionally, the use of tapered strings—where the winding is thinner over the bridge saddle—ensures a clean vibrational pivot point, lowering the string's action and maximizing sustain<sup>1</sup>.

Other brands have developed distinct ergonomic signatures<sup>39</sup>. Strandberg incorporates the patented EndurNeck—an asymmetrical, multi-faceted neck profile that shifts its orientation along the fanned scale to support the thumb's natural positioning<sup>48</sup>. Kiesel offers highly customizable multi-scale options with a standard 9th-fret neutral position, prioritizing low-register playability and fluid hand transitions<sup>23</sup>.

Ormsby Guitars, credited with coining the term "Multiscale," uses non-converging fret layouts to optimize intonation across extreme spreads<sup>9</sup>. This diverse manufacturing ecosystem demonstrates that multi-scale geometry is no longer a niche custom modification, but a highly developed standard in modern instrument design<sup>35</sup>.

---

### Works Cited

1. "Which strings match which tuning? What should I do about neck size?", *S (Varelser) - note*, https://note.com/varelser/n/n225c44244fb6?hl=en
2. "Inharmonicity in plucked guitar strings", *AIP Publishing*, https://pubs.aip.org/aapt/ajp/article-pdf/90/7/487/20102395/487_1_5.0064373.pdf
3. "Inharmonicity", *Grokipedia*, https://grokipedia.com/page/Inharmonicity
4. "How to Intonate a Guitar (or Bass)", *Electric Herald*, https://www.electricherald.com/how-to-intonate-a-guitar-or-bass/
5. "A final definitive answer to the 34 vs 35 inch b string debate", *r/Bass - Reddit*, https://www.reddit.com/r/Bass/comments/19e61tf/a_final_definitive_answer_to_the_34_vs_35_inch_b/
6. "Tech Talk - Guitar Scale Length", https://northwestguitars.co.uk/blogs/blog/tech-talk-guitar-scale-length
7. "The Multi-Scale Guitar: A Harmonious Innovation", https://www.samash.com/spotlight/post/the-multi-scale-guitar-a-harmonious-innovation
8. "Dingwall - Bass", *Eddie's Guitars*, https://eddiesguitars.com/product-category/bass/bass-guitar-brands/dingwall/
9. "What is a Multiscale", *Ormsby Guitars*, https://ormsbyguitars.com/pages/what-is-a-multiscale
10. "A Look At The Multi Scale Guitar Is It For You?", *GSG*, https://gstringuitars.com/a-look-at-the-multi-scale-guitar/
11. "What is an Extended Range Guitar? Our Experts Explain", *GuitarGuitar*, https://www.guitarguitar.co.uk/news/141976/
12. "Multi-scale is superior to straight scale. A rant.", *r/ExtendedRangeGuitars - Reddit*, https://www.reddit.com/r/ExtendedRangeGuitars/comments/1mb97kk/multiscale_is_superior_to_straight_scale_a_rant/
13. "Payson Fanned Fret Multi-Scale Bass Strings", *Payson Fanned Bass Strings*, https://www.paysonbass.com/
14. "Lumped bass guitar strings from Kemp Strings!", https://kempstrings.com/lumped-bass-guitar-strings-from-kemp-strings/
15. "8 String Electric Guitars", *American Musical Supply*, https://www.americanmusical.com/c/guitars/electric-guitars/8-string-electric-guitars
16. "String stiffness", http://knutsacoustics.com/files/String-stiffness.pdf
17. "Musical String Inharmonicity", *USC Dornsife*, https://dornsife.usc.edu/sergey-lototsky/wp-content/uploads/sites/211/2023/06/Musical-string-inharmonicity-Chris-Murray.pdf
18. "Inharmonicity due to Stiffness for Guitar Strings", *Graduate Program in Acoustics*, https://www.acs.psu.edu/drussell/Demos/Stiffness-Inharmonicity/Stiffness-B.html
19. "Inharmonicity", *Wikipedia*, https://en.wikipedia.org/wiki/Inharmonicity
20. "Sorry Sheldon: unpopular opinion of why your scale length is too long", *r/Bass - Reddit*, https://www.reddit.com/r/Bass/comments/eyso9r/sorry_sheldon_unpopular_opinion_of_why_your_scale/
21. "Design Philosophy", *Contriver Guitars*, https://contriverguitars.com/design-philosophy
22. "Dingwall Designer Guitars", *Wikipedia*, https://en.wikipedia.org/wiki/Dingwall_Designer_Guitars
23. "NAMM 2016: Kiesel Guitars Introduces Aries AM8 Multiscale Fanned-Fret Eight-String Guitar", https://www.guitarworld.com/gear/namm-2016-kiesel-guitars-introduces-aries-am8-multiscale-fanned-fret-eight-string-guitar
24. "Fan fret neutral fret", *r/Luthier - Reddit*, https://www.reddit.com/r/Luthier/comments/1180qgg/fan_fret_neutral_fret/
25. "What scale length is your Vader 8 Multiscale?", *r/kieselcarvinguitars - Reddit*, https://www.reddit.com/r/kieselcarvinguitars/comments/1hhco42/what_scale_length_is_your_vader_8_multiscale/
26. "Multiscale Fret: Ergonomic Guitar Innovation | PDF | Guitars | String Instruments", *Scribd*, https://www.scribd.com/document/918202204/13811-924-45313-1-10-20210729
27. "Multiscale guitarists - best neutral fret?", *r/ExtendedRangeGuitars - Reddit*, https://www.reddit.com/r/ExtendedRangeGuitars/comments/1p96nnz/multiscale_guitarists_best_neutral_fret/
28. "LF guitar similar to Kiesel AM7", *r/7String - Reddit*, https://www.reddit.com/r/7String/comments/1u70myd/lf_guitar_similar_to_kiesel_am7/
29. "Fan fret question", *r/7String - Reddit*, https://www.reddit.com/r/7String/comments/1sd7pbi/fan_fret_question/
30. "Multiscale 7 String Question", *r/kieselcarvinguitars - Reddit*, https://www.reddit.com/r/kieselcarvinguitars/comments/1i9bif3/multiscale_7_string_question/
31. "[DISCUSSION] Angle of pickups on multiscale guitars", *Reddit*, https://www.reddit.com/r/Guitar/comments/11xqpfj/discussion_angle_of_pickups_on_multiscale_guitars/
32. "[QUESTION] I've always wondered... what's up with angled pickups?", *r/Guitar - Reddit*, https://www.reddit.com/r/Guitar/comments/9d5dtc/question_ive_always_wondered_whats_up_with_angled/
33. "Multiscale pickups", *Bare Knuckle Pickups*, https://www.bareknucklepickups.co.uk/news/article/multiscale-pickups
34. "NORDSTRAND DINGSTRAND NORDWALL 4 SET", *Reverb*, https://reverb.com/item/41626940-nordstrand-dingstrand-nordwall-4-set
35. "Multi-scale fingerboard", *Grokipedia*, https://grokipedia.com/page/Multi-scale_fingerboard
36. "Multi-scale fingerboard", *Wikipedia*, https://en.wikipedia.org/wiki/Multi-scale_fingerboard
37. "History", *Novax Guitars*, https://www.novaxguitars.com/history.html
38. "Is It Multiscale or Fanned Fret? - Guitar Anatomy Class", *ProjectGuitar.com*, https://www.projectguitar.com/articles/guitar-anatomy-class_52_52_52/is-it-multiscale-or-fanned-fret-r23/
39. "A History of the Baritone Guitar in Metal", *Reverb News*, https://reverb.com/news/a-history-of-the-baritone-guitar-in-metal-music
40. "History of Multiscale Instruments", https://multiscale.info/history.php
41. "The Ibanez RG: the Greatest Modern Guitar", *GuitarGuitar*, https://www.guitarguitar.co.uk/news/142163/
42. "The Basics Of Tuning An 8 String Guitar: All You Need 2 Know", https://staytunedguitar.com/tuning-an-8-string-guitar
43. "Strandberg Boden Standard N2.8 Headless Multi-Scale Guitar - Black Sat", *Motor City Guitar*, https://motorcityguitar.com/products/strandberg-boden-standard-n2-8-black-satin-metallic
44. "Can anyone explain what Dingwalls are for..?", *Basschat*, https://www.basschat.co.uk/topic/523001-can-anyone-explain-what-dingwalls-are-for/page/3/
45. "Dingwall - Basses", *Bass Central*, https://basscentral.com/basses/dingwall/?page=2
46. "John Taylor Signature", *Dingwall Guitars*, https://dingwallguitars.com/bass/john-taylor-signature-model-2/
47. "Dingwall Releases John Taylor Signature Model", https://duranduran.com/2024/dingwall-releases-john-taylor-signature-model/
48. ".strandberg* x Jamstik MIDI Guitar", https://jamstik.com/products/strandberg-x-jamstik-midi-guitar
