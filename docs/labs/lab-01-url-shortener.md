# Lab 01 — Design a URL Shortener

**Category:** HLD
**Difficulty:** Easy
**Estimated Time:** 30–45 min
**Tags:** Hashing, Key-Value Store, Redirection, Read-Heavy Systems

---

## Problem Statement

You're building a URL shortening service similar to bit.ly. Users submit a long URL and receive a short, unique alias (e.g., `https://short.ly/aB3xK2`). When anyone visits the short URL, they're instantly redirected to the original long URL.

The service is read-heavy: links are created once but may be clicked millions of times. It needs to be fast, reliable, and globally accessible. Companies use this to track link analytics — knowing how many times a link was clicked, from which country, and on which device.

Your job is to design the full system: how short codes are generated, how redirects work at scale, and how you'd handle analytics without slowing down the critical redirect path.

## Functional Requirements

1. Given a long URL, generate a unique short URL.
2. Redirect a user from a short URL to the original long URL.
3. Allow users to optionally specify a custom alias (e.g., `/my-campaign`).
4. Short URLs expire after a configurable TTL (default: never).
5. Track click analytics: timestamp, country, device type per click.
6. Support deleting a short URL.

## Non-Functional Requirements

1. **Availability:** 99.99% uptime — redirects must never be down.
2. **Latency:** Redirect p99 < 10ms.
3. **Scalability:** Support 100M URLs created per month, 1B redirects per day.
4. **Durability:** No data loss for created URLs.
5. **Consistency:** Eventual consistency is acceptable for analytics; redirects must be strongly consistent.

## Constraints & Scale

- 100M new URLs / month → ~40 writes/sec average
- Read/write ratio: **100:1** → ~4,000 redirects/sec average, burst to 50K/sec
- Average URL size: 200 bytes
- Short code length: 7 characters (base62 → 62^7 ≈ 3.5 trillion unique codes)
- Analytics volume: ~1B events/day
- Storage for URLs: 100M × 500 bytes ≈ 50GB/year

## Starting Point

Start by answering: **how do you generate a unique 7-character short code?**

Think through at least two approaches (e.g., hashing vs. auto-increment + encoding) and consider what happens when two users submit the same long URL. Then sketch the read path: what happens between a user clicking `https://short.ly/aB3xK2` and landing on the destination page?

---

> **Note:** Do not read the discussion guide below until you've worked through your approach.
> Share your design and the interviewer will probe it with follow-up questions.

<details>
<summary>📖 Discussion Guide (click only after attempting)</summary>

## Discussion Guide

### Key Components

```
Client → CDN/Edge Cache → Redirect Service → Cache (Redis) → DB (Postgres/DynamoDB)
                                   ↓
                           Analytics Stream (Kafka → ClickHouse)
```

- **Redirect Service** — stateless, horizontally scaled; cache-first lookup
- **Creation Service** — handles write path, code generation, custom aliases
- **Key-Value Store** — Redis for hot redirects (TTL-backed), Postgres/DynamoDB for persistence
- **Analytics Pipeline** — async, fire-and-forget; never blocks the redirect

### Data Model

```sql
urls (
  short_code   VARCHAR(10) PRIMARY KEY,
  long_url     TEXT NOT NULL,
  user_id      UUID,
  created_at   TIMESTAMPTZ,
  expires_at   TIMESTAMPTZ,
  is_custom    BOOLEAN
)

click_events (
  id           UUID,
  short_code   VARCHAR(10),
  clicked_at   TIMESTAMPTZ,
  country      VARCHAR(2),
  device_type  VARCHAR(20),
  referrer     TEXT
)
```

### API Design

```
POST /shorten
  Body: { long_url, custom_alias?, ttl_days? }
  Response: { short_url, short_code, expires_at }

GET /:short_code
  Response: 301/302 redirect to long_url
  (302 preferred to avoid browsers caching indefinitely)

DELETE /urls/:short_code
  Auth required

GET /urls/:short_code/stats
  Response: { total_clicks, clicks_by_country, clicks_by_day }
```

### Code Generation: Two Approaches

**Option A — MD5/SHA hash + truncate:**
- Hash the long URL → take first 7 base62 chars
- Risk: collisions. Must check DB; retry with salt on collision.
- Problem: same URL always generates same code (dedup vs. per-user uniqueness tradeoff)

**Option B — Auto-increment ID + base62 encode:**
- DB auto-increment → encode integer to base62
- Globally unique, no collisions
- Risk: predictable/enumerable. Offset starting ID or XOR with secret to obscure.

**Recommended:** Option B for simplicity + uniqueness; use a dedicated ID generation service (like Twitter Snowflake or a simple counter in Redis) for distributed environments.

### Deep Dives

- **Caching strategy:** Cache `short_code → long_url` in Redis with LRU eviction. Cache hit rate ~99% for popular links means most requests never touch the DB.
- **Analytics without blocking redirects:** Publish click events to Kafka asynchronously after issuing the redirect. Consumer writes to ClickHouse for aggregation queries.
- **Custom aliases:** Check uniqueness before insert; enforce reserved words blocklist (e.g., `api`, `health`, `admin`).

### Common Pitfalls

- Using 301 (permanent) redirect — browsers cache it permanently, breaking analytics tracking. Use **302** (temporary).
- Forgetting to handle expired URLs gracefully (return 410 Gone, not 404).
- Not thinking about the **thundering herd** when a popular link's cache entry expires — use a background refresh before expiry.
- Designing analytics as synchronous — it must be async or it will bottleneck redirects.

### Evaluation Rubric

| Area | Weak | Good | Strong |
|------|------|------|--------|
| Code generation | Vague "use hashing" | Picks approach, notes collisions | Compares tradeoffs, picks base62+counter |
| Read path | Single server | Adds cache | Cache + CDN, explains TTL strategy |
| Analytics | Synchronous or ignored | Async queue | Full pipeline (Kafka → OLAP), explains 302 |
| Scale reasoning | No numbers | Rough estimates | Derives cache hit rate, storage, QPS |
| Failure handling | Ignored | Mentions retries | Cache stampede, expired URL UX, DB fallback |

</details>
