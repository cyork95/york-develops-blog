---
title: Hello, World — Welcome to York Develops Blog
date: 2026-06-03
description: The first post. What this blog is, why it exists, and what's coming next.
tags: [meta, intro]
---

Every engineer eventually reaches the same inflection point: you've solved enough interesting problems that writing them down starts to feel less like a chore and more like a responsibility. This is that moment for me.

## What this is

This blog is an extension of [York Develops](https://cyork95.github.io) — a place to go deeper than a portfolio card allows. The site tells you *what* I've built. This is where I'll explain *how*, *why*, and occasionally, *what I got wrong the first time*.

The topics will mostly orbit the work I do day-to-day:

- **Cloud engineering** — GCP, infrastructure patterns, the unglamorous work of keeping pipelines running
- **Data & tooling** — building CLI tools, wrangling schemas, the surprisingly fun world of data quality
- **AI in practice** — practical, no-hype takes on integrating LLMs into real workflows
- **Side projects** — whatever I'm building at 11pm that I probably shouldn't be

## What this isn't

A content marketing blog. There are no call-to-actions, no newsletter popups, no "like and subscribe." This is a technical notebook that happens to be public.

## The format

Posts will vary in length. Some will be deep-dives. Some will be short notes — the kind of thing I'd put in a Slack message to a colleague who just ran into the same problem I solved last Tuesday.

All code will be real, runnable code:

```python
# Example: a pattern I use constantly — retry with exponential backoff
import time
import functools

def retry(max_attempts=3, backoff=2.0):
    def decorator(fn):
        @functools.wraps(fn)
        def wrapper(*args, **kwargs):
            for attempt in range(max_attempts):
                try:
                    return fn(*args, **kwargs)
                except Exception as e:
                    if attempt == max_attempts - 1:
                        raise
                    time.sleep(backoff ** attempt)
        return wrapper
    return decorator
```

## What's next

I have a backlog of drafts covering a GCP pipeline refactor I recently shipped, a deep-dive on prompt engineering patterns that actually hold up in production, and a walkthrough of the CLI tool I built to automate the thing that was eating two hours of my week.

Those are coming soon. For now — hello, world.

---

*Cody York is a Cloud Data Engineer at CVS Health based in Bloomington, IN. He builds data pipelines, cloud infrastructure, and occasionally blogs about it.*
