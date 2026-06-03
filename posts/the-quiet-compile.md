---
title: The Quiet Compile
date: 2026-06-03
description: A short story about a developer who discovers his code has been rewriting itself overnight.
tags: [fiction, short story]
section: creative-writing
---

Marcus noticed it on a Tuesday.

The diff was three lines — a tightened loop, a renamed variable, a comment that hadn't been there before. He scrolled through `git log`, expecting to find a colleague's initials tucked into an off-hours commit. There were none. The timestamp said 2:47 AM. The author said his name.

He didn't remember being awake at 2:47 AM.

---

He let it go. He was tired. He'd been tired for months — the kind of tired that lives behind your eyes and makes you misread your own error messages. He told himself he'd written it in a half-asleep haze and simply forgotten. Developers did stranger things.

But the next morning, there were six more lines.

Clean lines. Correct lines. Better than the ones he'd written Friday, if he was honest. The refactor he'd been putting off for three sprints — the one he kept moving to the bottom of the backlog because he knew it would take a full afternoon he never seemed to have — was done. Quietly. Completely. Without him.

Marcus opened a new terminal window and stared at it for a long time.

```bash
$ git log --oneline -5
a3f9c1d  Refactor auth middleware (cleanup)
b88e20a  Remove unused import
c12f47e  Fix edge case in retry loop
9de3301 (origin/main)  Add rate limiting
```

He typed `git show a3f9c1d` and read through the diff slowly, the way you read something you suspect might be evidence of something but aren't sure yet what.

The code was good. Methodical. The variable names were his — the same slightly-too-long-but-descriptive names his tech lead used to tease him about. The comments were in his voice. Even the blank lines were where he would have put blank lines.

He thought: *if I were going to gaslight myself, this is exactly how I'd do it.*

---

He set up a camera. A proper one, not his laptop webcam — he borrowed a trail cam from his brother-in-law who hunted deer in November. He aimed it at his monitor and went to sleep at ten.

The footage showed him sitting down at 2:44 AM. Eyes open. Fingers moving. He typed for eleven minutes with the quiet focus of someone solving a problem they've thought about for a long time. Then he stood up, went back to bed, and was asleep before his head finished falling.

He watched the clip four times.

The fifth time, he noticed his eyes. They were open, yes. But they weren't *looking* at the screen. They were aimed somewhere slightly to the left of it, fixed on a point in the middle distance — the particular unfocused gaze of a person whose mind is somewhere else entirely.

The code, it turned out, did not need him to be present.

It only needed his hands.

---

He mentioned it to his therapist, who said the word *parasomnia* with the practiced calm of someone who had heard stranger things. He mentioned it to his partner, who laughed and said they wished they could bill those hours. He did not mention it to his team lead, because he couldn't think of a single way to explain it that didn't end with HR involvement.

The commits kept coming. Never more than eleven minutes. Never before 2 AM or after 3. Always correct. Always in his voice. Always the thing he'd been meaning to do but hadn't.

He started leaving notes.

Not instructions — he tried that, a commented-out `TODO` left conspicuously at the top of a file, and woke up to find it deleted without ceremony. Just observations. Small ones, tucked into the margins of the codebase like letters you write knowing they probably won't be read.

*// I've been meaning to fix this for six months.*

*// This is the part I'm most proud of.*

*// I don't know if you'll ever see this.*

One morning he found a reply.

Not in words. Just a commit — a single-line change to a function he'd flagged months ago as "works but I hate it." The new version was elegant in a way that made him feel something close to envy. Beneath it, in the commit message, his own name and, in parentheses:

*(I know.)*

---

He never did figure out what it was. His neurologist found nothing. His sleep study found nothing. The commits slowed after winter, became occasional by spring, and by summer had stopped entirely.

He still checks `git log` every morning before coffee. Some days hoping. Some days not sure.

The code he wrote during those months is still in production. He maintains it the way you maintain something someone else built — carefully, with a lot of comments, and a nagging suspicion that whoever wrote it understood the problem better than you do.

He suspects they did.

---

*This is a work of fiction. Any resemblance to actual sleep-coding incidents is, unfortunately, not outside the realm of possibility.*
