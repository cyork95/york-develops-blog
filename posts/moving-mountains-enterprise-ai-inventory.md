---
title: "Moving Mountains: What Building an Enterprise AI Inventory Taught Me About GKE, Data Governance, and Keeping My Sanity"
date: 2026-06-09
description: A year-long deep dive into building an enterprise AI model inventory at CVS Health — GKE job orchestration, Docker containerization, Jenkins-to-GitHub-Actions migration, and the real lesson nobody talks about: data governance is the hardest part of enterprise AI.
tags: [gcp, gke, kubernetes, docker, data-governance, flask, angular, github-actions]
section: programming
---

Every engineer has that project. The one that starts as a vague bullet point in a quarterly planning meeting and morphs into a monolithic, career-defining beast that you live, breathe, and occasionally dream about.

For the past year, I've been entirely buried in one of those beasts at CVS Health. The mission: build an end-to-end AI model inventory from scratch to ensure enterprise-wide model compliance. When you're dealing with healthcare data, compliance isn't just a bureaucratic checkbox — it's an absolute wall of regulatory necessity. The compliance teams needed a single source of truth to track how models are tested, where their data comes from, and who is accountable.

I was handed the reins to architect and build this entire data pipeline end to end, completely on my own. It has been a massive labor of love, a rollercoaster of self-reliance, and the very first project in my career that feels entirely mine. But ownership comes with a price, and for me, that price was being violently thrown out of my comfortable data engineering sandbox and forced to master a stack I had barely touched before.

## The Stack and the Sandbox Shift

As a data engineer rooted in the Google Cloud Platform ecosystem, I am incredibly comfortable with BigQuery. Give me a massive dataset, some messy SQL, and a pipeline to optimize, and I'm a happy camper. But a true enterprise application requires a real ecosystem.

To bridge the gap between compliance officers and complex data models, the architecture needed to be robust. Here is the blueprint of what I put together:

- **Backend:** Python and Flask to handle the business logic and API orchestration.
- **Frontend:** A clean, responsive Angular UI for the compliance teams to interact with.
- **Data Warehouse:** BigQuery, my old faithful, acting as the ultimate analytical storage engine.
- **CI/CD:** Originally Jenkins, which we later migrated over to GitHub Actions.
- **Orchestration & Compute:** Google Kubernetes Engine (GKE).

```
[Angular UI] <---> [Flask API (GKE)] <---> [Data Pipelines (GKE Jobs)]
                                                  │
                                                  ▼
                                          [BigQuery Storage]
```

The data engineering side of my brain knew exactly how to structure the BigQuery tables and design the API endpoints. The real curveball? Containerization and infrastructure. I had never actually containerized a full application and deployed it to production, let alone managed the orchestration. Suddenly, I wasn't just writing data scripts; I was writing Dockerfiles, configuring Kubernetes manifests, and managing cluster workloads.

## Wrestling with the Kubernetes Bear

If you want to feel incredibly humbled as an engineer, stare at a crashing GKE job log for the first time.

Because our data processing tasks run on schedules — ingesting metadata from various teams, running compliance validation scripts, and mapping internal hierarchies — I chose to utilize GKE Jobs. Unlike a continuous deployment, a GKE Job spins up, executes a specific data task, and terminates.

```yaml
# A look into the structure of the GKE Job manifests I had to master
apiVersion: batch/v1
kind: Job
metadata:
  name: compliance-metadata-ingest
  namespace: ai-inventory
spec:
  template:
    spec:
      containers:
      - name: ingest-worker
        image: gcr.io/cvs-enterprise-data/ai-inventory-backend:latest
        command: ["python", "manage.py", "run-ingest-pipeline"]
        env:
        - name: GCP_PROJECT
          value: "cvs-enterprise-data"
      restartPolicy: OnFailure
  backoffLimit: 4
```

Learning to package the Flask backend into a lightweight Docker container was step one. Step two was troubleshooting why those containers were throwing memory errors or failing to communicate with our databases inside the cluster.

I spent weeks learning the intricacies of Kubernetes pods, service accounts, and resource limits. There's a specific kind of frustration that comes with an application working perfectly on your local machine, only to fail in the cloud because of a misconfigured YAML file or a permission mismatch in GKE. But troubleshooting those failures forced me to understand the *why* behind containerization. It bridges the gap between "code that runs" and "infrastructure that scales."

## From Jenkins Nightmare to GitHub Actions Heaven

When I first inherited the deployment environment, the enterprise standard dictated using Jenkins for our CI/CD pipelines. I had to learn Jenkins completely from scratch, and honestly, it felt like pulling teeth. Writing Groovy scripts and navigating a web of legacy plugins felt disconnected from the modern, declarative workflows I value.

Midway through the project, we got the green light to migrate to GitHub Actions. It was another tool I had to learn on the fly, but the difference was night and day.

Configuring a `.github/workflows/deploy.yml` file felt intuitive, modern, and clean. I was able to automate our entire testing suite, build the Docker images, push them to Google Artifact Registry, and trigger the GKE deployments seamlessly on every main branch merge. Moving away from Jenkins didn't just speed up my deployment times; it made the development process genuinely enjoyable again.

## The Power of Ecosystem Integration

As the project evolved, it became clear that just having a UI and a database wasn't enough. An inventory is dead weight if people don't know they need to update it, or if the data inside it doesn't map to real corporate realities.

To solve this, I began expanding the application's ecosystem via a web of API integrations.

### Microsoft Graph API

To make compliance enforcement actionable, we needed to know exactly who owned which model, who their manager was, and what department they belonged to. By hooking into the Microsoft Graph API, the inventory can pull organizational hierarchy data in real-time. If an AI model fails a compliance check, the system automatically resolves the ownership chain to flag the correct stakeholders.

### Real-Time Slack Alerts

Instead of expecting busy data scientists and compliance officers to log into a dashboard every day, I built automated Slack alerts. Using Slack webhooks tied to our Flask backend, the system pings specific channels or users when action is required — like a missing model validation document or an upcoming audit deadline.

## The Unexpected Lesson: Demystifying the AI Landscape

When you spend a year building a system designed to audit hundreds of AI models across a massive enterprise, you get a front-row seat to the actual state of artificial intelligence in the wild.

Going in, it's easy to buy into the mainstream hype that everyone is building cutting-edge, autonomous neural networks. The unexpected lesson for me wasn't just technical; it was a reality check on how data is actually used.

I saw firsthand how teams are sourcing data, how they are testing for bias, and how varied the use cases truly are — stretching from standard statistical regressions to complex generative models. I learned that the hardest part of AI in the enterprise isn't writing the algorithmic code; it's the data governance. It's proving where your data came from, ensuring it respects user privacy, and validating that the output is safe and compliant.

## Looking Ahead

This project is still ongoing, constantly evolving as new compliance rules emerge and more teams onboard their workloads. It's an exhausting, continuous cycle of building, breaking, and improving.

But looking back at where I started a year ago — nervously staring at a blank repository, terrified of Kubernetes cluster architecture, and dreading Jenkins pipelines — I realize how much my engineering DNA has changed. I am no longer just a data engineer who writes queries and builds ETL lines. Because I was forced to step outside my comfort zone, I became someone who can architect, containerize, deploy, and own a critical enterprise platform from end to end.

It truly is a labor of love. And the next time GKE throws a deployment error at me? I'll know exactly where to look.
