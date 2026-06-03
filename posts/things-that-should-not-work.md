---
title: Things That Absolutely Should Not Work (But Do)
date: 2026-06-03
description: A running list of the most baffling, cursed, and beautiful hacks I've seen in the wild.
tags: [lists, humor]
section: fun
---

Every engineer has a list. The mental file labeled *"I cannot explain why this works and I refuse to investigate further."* Here's mine, in no particular order of shame.

---

## 1. The production server that only works if you leave a terminal window open

Not a process. Not a background job. A terminal window. Specifically, a terminal window running `tail -f /var/log/app.log` that no one opened intentionally. It was opened by a junior developer during a late-night incident two years ago. He no longer works there. The window is still open. The server has never crashed since.

The leading theory is that the log-tailing somehow prevents a buffer from filling. The actual theory, quietly held by the entire team, is that they have angered something.

---

## 2. The query that runs slower with an index

Yes. We added the index. We checked the execution plan. The query planner was using it. It was 40% slower. We dropped the index. Speed returned. The DBA stared at the ceiling for a long time and then closed her laptop and went home.

---

## 3. Sleep-based rate limiting

```python
import time

def call_api(payload):
    time.sleep(0.5)  # don't ask
    return requests.post(API_URL, json=payload)
```

The comment has been there for four years. The original author left the company. The replacement author left the company. Three separate developers have tried removing the sleep, discovered the API starts returning 429s at seemingly random intervals, and quietly put it back. We now consider the sleep load-bearing.

---

## 4. The bug that fixed itself during the demo

You know this one. You've been chasing it for two weeks. You have repro steps. You have logs. You have screenshots. You sit down to show it to the stakeholder and it simply does not happen. You change nothing. You deploy nothing. You stare at the working screen and feel a cold, specific feeling that has no name in English but probably has one in German.

The bug came back on the Monday after the demo. It always does.

---

## 5. CSS that only works in production

The local environment renders it broken. Staging renders it broken. Production renders it correctly. The difference in the build pipeline is one environment variable that controls a completely unrelated feature flag. No one has been able to establish causation. Everyone is afraid to touch the flag.

---

## 6. The API that returns 200 for errors

```json
{
  "status": 200,
  "success": false,
  "error": "Payment failed",
  "message": "Everything is fine"
}
```

This is a real response from a real third-party payment API that a real company charges real money for. The error handling code reads like someone mid-breakdown: six nested conditionals checking `success`, `error`, `message`, `data`, `data.error`, and finally — the one that actually worked — `data.transaction.declined_reason`.

---

## 7. Turning it off and on again (but make it enterprise)

Our Kubernetes cluster had a node that would periodically start behaving strangely — not crashing, just... drifting. Pods would take longer to schedule. Logs would lag. Nothing definitive, nothing actionable. Our solution was to add a CronJob that cordons and drains the node at 3 AM every Sunday.

We wrote the ticket. We did the postmortem. We documented the root cause as "suspected memory pressure." The CronJob is still running. We stopped looking.

---

## 8. The comment that became a feature

```python
# TODO: remove this before prod
if user.email.endswith('@beta.example.com'):
    return skip_payment_check()
```

It made it to production. It stayed there for eight months. It was discovered not by a security audit but by a customer who noticed that signing up with a beta email address let them skip the checkout flow entirely. They emailed support to report it. Support thanked them and forwarded it to engineering. Engineering found the comment. The comment was dated two years prior.

The beta domain was never actually used. Someone just forgot to delete eleven lines of code.

---

## 9. The server farm with one special machine

In a pool of twelve identical EC2 instances, one runs 30% faster. Same AMI. Same instance type. Same everything. Load balancers try to distribute evenly. Users notice. Users have opinions. One particularly engaged user filed a support ticket asking why the app "sometimes feels slow" and specifically requesting the fast one.

We named it. You shouldn't name them, but we named it.

---

## 10. git push --force (but it worked out)

I'm not going to tell the full story. What I will say is that it involved a Friday afternoon, a misconfigured remote, a panicked `git reflog`, and twenty-two minutes that I would describe as "character-building." The branch was recovered. The deploy was clean. No one else ever knew.

Someone who was not me definitely learned something that day.

---

*This list is updated irregularly, whenever something breaks in a way that deserves to be remembered. Submissions welcome.*
