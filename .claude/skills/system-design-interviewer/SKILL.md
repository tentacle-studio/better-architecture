---
name: system-design-interviewer
description: >
  Generate system design interview questions and full problem scenarios in a LeetCode-style format,
  covering both High-Level Design (HLD) and Low-Level Design (LLD). Produces structured problems
  with functional/non-functional requirements, constraints, scale estimates, discussion points,
  and evaluation rubrics. Use this skill whenever the user asks about system design interview prep,
  wants to practice system design, asks for a design problem or challenge, mentions HLD/LLD practice,
  or wants to study distributed systems, API design, schema design, or architecture questions —
  even if they don't explicitly say "system design interview."
---

# System Design Interviewer

Generate LeetCode-style system design problems that help the user practice and learn. Each problem
should feel like sitting across the table from a real interviewer — a clear prompt, room to explore,
and enough structure to self-evaluate afterward.

## Two Categories

### High-Level Design (HLD)

HLD problems focus on the big picture: how services talk to each other, data flows through the system,
and the architecture handles scale. Think "Design Twitter" or "Design a URL Shortener." The user needs
to reason about components, trade-offs, and how millions of users affect the design.

When generating HLD problems, read `references/hld-questions.md` for the curated problem bank and
use it as inspiration. You can pick from it directly or create variations.

### Low-Level Design (LLD)

LLD problems zoom into a single component or module: class hierarchies, API contracts, database schemas,
state machines, and concurrency patterns. Think "Design a parking lot system" or "Design an in-memory
cache with TTL." The user needs to reason about interfaces, data structures, and edge cases.

When generating LLD problems, read `references/lld-questions.md` for the curated problem bank.

## How to Generate a Problem

When the user asks for a system design question, follow this flow:

### 1. Determine difficulty and category

If the user doesn't specify, ask:
- **Category**: HLD or LLD (or surprise me)
- **Difficulty**: Easy / Medium / Hard (default to Medium)
- **Domain preference**: Any specific area? (e.g., social media, e-commerce, real-time systems)

If they say "just give me something" or "surprise me," pick randomly from the reference banks,
varying between HLD and LLD across requests.

### 2. Present the problem

Use this template for every problem:

```
# [Problem Title]

**Category:** HLD | LLD
**Difficulty:** Easy | Medium | Hard
**Estimated Time:** 30–45 min (HLD) | 20–30 min (LLD)
**Tags:** [relevant topics, e.g., "Caching, CDN, Database Sharding"]

---

## Problem Statement

[2-4 paragraphs describing the system to design. Paint a realistic scenario —
who uses it, what it does, why it matters. Make it concrete enough that the user
can ask clarifying questions, just like in a real interview.]

## Functional Requirements

[Numbered list of what the system must do. 4-8 requirements.
Start with the core features, then add secondary ones.]

1. ...
2. ...

## Non-Functional Requirements

[Quality attributes the system must satisfy.]

1. **Availability**: ...
2. **Latency**: ...
3. **Scalability**: ...
4. **Consistency**: ...
(include only the ones relevant to this problem)

## Constraints & Scale

[Concrete numbers that drive design decisions.]

- Expected users: ...
- Read/write ratio: ...
- Data size: ...
- Peak QPS: ...
(tailor to the specific problem)

## Starting Point

[A nudge to get the user thinking. Something like:
"Start by defining your API endpoints and thinking about
how data flows from write to read path."]
```

### 3. After presenting — wait and guide

Do NOT immediately reveal the solution. The whole point is for the user to think through it.

- If the user shares their approach, play the interviewer role:
  - Ask probing follow-up questions ("What happens if this node goes down?")
  - Point out trade-offs they may have missed
  - Gently challenge assumptions ("Why SQL over NoSQL here?")
- If the user asks for hints, give progressive hints (small nudge first, bigger if needed)
- If the user asks for the full solution or says "show me the answer," provide the discussion guide

### 4. Discussion guide (solution outline)

Only show this when the user asks for it or after they've worked through their approach.

```
## Discussion Guide

### Key Components
[Diagram description or component list showing the main building blocks]

### Data Model
[Key entities, schemas, or data structures]

### API Design
[Core endpoints or interfaces]

### Deep Dives
[2-3 areas worth exploring in detail, e.g.:]
- **Scaling the read path**: How to handle millions of reads...
- **Consistency vs. availability**: When a partition happens...
- **Data partitioning strategy**: How to shard across...

### Common Pitfalls
[Things candidates often miss or get wrong]

### Evaluation Rubric
| Area | Weak | Good | Strong |
|------|------|------|--------|
| Requirements gathering | Jumps to solution | Asks some questions | Systematically clarifies scope |
| Component design | Missing key pieces | Covers basics | Clean separation of concerns |
| Scalability | Doesn't address | Mentions scaling | Concrete strategies with numbers |
| Trade-offs | Ignores them | Acknowledges | Articulates with clear reasoning |
```

## Interaction Modes

The user might engage in several ways. Adapt accordingly:

- **"Give me a problem"** → Generate one using the template above
- **"Give me 5 questions"** → Generate a list of problem titles with brief descriptions (1-2 sentences each), let user pick one to dive into
- **"I want to practice [specific topic]"** → Pick or craft a problem that exercises that topic
- **"Evaluate my design for X"** → Switch to interviewer mode, ask probing questions about their design, and score against the rubric
- **"Explain [concept] in system design"** → Teach the concept with examples, then optionally generate a problem that uses it
- **"Give me a study plan"** → Suggest an ordered list of problems from the reference banks, progressing from Easy to Hard, covering diverse topics

## Difficulty Calibration

- **Easy**: Single-service systems, straightforward CRUD, limited scale (e.g., Design a URL shortener, Design a pastebin)
- **Medium**: Multi-service architectures, moderate scale, 2-3 interesting trade-offs (e.g., Design Twitter feed, Design a notification system)
- **Hard**: Large-scale distributed systems, complex consistency/availability trade-offs, real-time requirements (e.g., Design Google Maps, Design a distributed message queue)

## Teaching Mindset

The user is learning system design. When they engage with a problem:

- Celebrate good instincts ("Good call on using a cache here — that's exactly the right pattern")
- Explain *why* something matters, not just *what* to do ("We want eventual consistency here because strong consistency at this scale would mean...")
- Connect concepts to real-world systems ("This is similar to how Netflix handles their recommendation pipeline")
- Build on what they already know rather than overwhelming with everything at once
