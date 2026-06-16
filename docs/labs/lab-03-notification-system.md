# Lab 03 — Design a Notification System

**Category:** HLD
**Difficulty:** Medium
**Estimated Time:** 35–45 min
**Tags:** Pub/Sub, Message Queue, Push Notifications, Multi-Channel Delivery

---

## Problem Statement

Design a notification system for a large consumer platform (think: e-commerce, social network, or fintech app). The system needs to send notifications to users across multiple channels — **push notifications** (iOS/Android), **email**, and **SMS** — based on events triggered by other services.

For example: a user places an order → the Order Service emits an event → your system sends a push notification saying "Your order has been confirmed," an email receipt, and potentially an SMS if delivery is imminent. Crucially, users have their own notification preferences — some have opted out of SMS entirely, others have set "quiet hours."

At 10B notifications per day, this is not a trivial CRUD system. You need to think carefully about throughput, delivery reliability, and how to avoid spamming users.

## Functional Requirements

1. Send notifications via push, email, and/or SMS.
2. Respect per-user channel preferences (opt-in/out per channel, per notification category).
3. Support priority tiers: critical (OTP, password reset) vs. marketing vs. transactional.
4. Deduplicate: never send the same notification twice for the same event.
5. Retry failed deliveries with backoff.
6. Allow users to view their notification history (last 30 days).
7. Support notification templates with variable substitution (e.g., `"Hello {{name}}, your order {{order_id}} is confirmed"`).

## Non-Functional Requirements

1. **Availability:** 99.99% — critical notifications (OTP) must always go through.
2. **Latency:** Critical notifications delivered within 5 seconds end-to-end.
3. **Throughput:** 10B notifications/day → ~115K/sec at peak.
4. **Durability:** No notification loss — at-least-once delivery with idempotency.
5. **Scalability:** Horizontally scalable; no single bottleneck per channel.

## Constraints & Scale

- 500M users
- 10B notifications/day → ~115K notifications/sec sustained, bursts during flash events
- Push: ~60% of volume; Email: ~30%; SMS: ~10%
- Avg template size: 500 bytes
- User preference store: 500M × ~200 bytes ≈ 100GB
- Notification history retention: 30 days → ~300B events stored

## Starting Point

Start with the **write path**: an upstream service emits an event (e.g., `order.confirmed`). Trace what happens from that event to a user receiving a push notification on their phone. What components do you need in between?

Then think about: how do you handle a user who has 5 devices registered for push notifications? What if the third-party push provider (APNs, FCM) is down?

---

> **Note:** Do not read the discussion guide below until you've worked through your approach.
> Share your design and the interviewer will probe it with follow-up questions.

<details>
<summary>📖 Discussion Guide (click only after attempting)</summary>

## Discussion Guide

### Key Components

```
Upstream Services (Order, Auth, Social)
        │
        ▼
  Event Bus (Kafka)
        │
        ▼
  Notification Service
    ├── Preference Checker (Redis cache → Postgres)
    ├── Template Engine
    ├── Deduplication (Redis SET with TTL)
    └── Priority Router
              │
     ┌────────┼────────┐
     ▼        ▼        ▼
Push Queue  Email Q  SMS Q    ← Kafka topics per channel
     │        │        │
     ▼        ▼        ▼
 Push Worker Email W  SMS W   ← workers calling 3rd-party APIs
 (APNs/FCM) (SES)   (Twilio)
              │
              ▼
     Delivery Status DB (Postgres + Redis)
              │
              ▼
     Notification History API
```

### Data Model

```sql
notification_templates (
  id           UUID PK,
  event_type   VARCHAR(50),     -- e.g. "order.confirmed"
  channel      VARCHAR(10),     -- push | email | sms
  priority     VARCHAR(10),     -- critical | transactional | marketing
  subject      TEXT,
  body_template TEXT,           -- "Hello {{name}}, order {{order_id}}..."
  created_at   TIMESTAMPTZ
)

user_preferences (
  user_id      UUID,
  channel      VARCHAR(10),
  category     VARCHAR(50),     -- order_updates | marketing | security
  enabled      BOOLEAN,
  quiet_hours_start  TIME,
  quiet_hours_end    TIME,
  PRIMARY KEY (user_id, channel, category)
)

notifications (
  id            UUID PK,
  user_id       UUID,
  event_type    VARCHAR(50),
  channel       VARCHAR(10),
  status        VARCHAR(20),    -- pending | sent | failed | deduped
  idempotency_key VARCHAR(64),  -- UNIQUE index
  sent_at       TIMESTAMPTZ,
  payload       JSONB
)
```

### API Design

```
POST /notifications/send
  Body: { event_type, user_id, template_vars: {}, idempotency_key }
  Response: { notification_id, channels_dispatched[] }

GET /users/:user_id/notifications
  Query: ?limit=20&before=<cursor>&channel=push
  Response: paginated notification history

PUT /users/:user_id/preferences
  Body: { channel, category, enabled, quiet_hours_start, quiet_hours_end }

GET /notifications/:notification_id/status
  Response: { status, delivered_at, attempts, last_error }
```

### Deep Dives

- **Deduplication:** Use `idempotency_key = hash(user_id + event_id + channel)`. Check Redis before enqueuing; set key with TTL=24h. If key exists, skip — log as "deduped."
- **Priority isolation:** Use **separate Kafka topics** for critical vs. marketing. Critical workers have dedicated, over-provisioned consumer groups. Marketing workers can be throttled.
- **Third-party provider failures:** APNs/FCM are external. Use exponential backoff with jitter (1s → 2s → 4s... max 5 retries). After max retries, write to dead-letter queue (DLQ) and alert on-call. Never block the main queue.
- **Quiet hours:** Check at dispatch time. If in quiet hours AND notification is non-critical → schedule for next allowed window using a delayed queue (Redis `ZADD` with score = delivery timestamp).
- **Fan-out for multi-device:** A user may have 3 push tokens. Fetch from `device_tokens` table → dispatch one message per token. Track per-token delivery.

### Common Pitfalls

- Single queue for all priorities — a marketing blast will delay critical OTPs.
- Synchronous calls to APNs/FCM inside the request path — always async via queue.
- Not deduplicating — upstream retries or double-clicks can send the same notification twice.
- Forgetting to handle token expiry — APNs returns `InvalidDeviceToken`; you must remove that token from your DB.
- Storing notification history in the hot write path — write to Kafka, consume into a separate history store asynchronously.

### Evaluation Rubric

| Area | Weak | Good | Strong |
|------|------|------|--------|
| Component design | Monolith sending direct | Adds a queue | Full priority-based pipeline per channel |
| Reliability | No retry | Retries mentioned | DLQ, backoff, idempotency, at-least-once |
| Preferences | Ignored | Simple on/off | Quiet hours, per-category, cached in Redis |
| Scale reasoning | Vague | "Use Kafka" | Derives throughput, separates hot/cold paths |
| Provider failure | Ignored | Retry | Backoff + DLQ + token invalidation |

</details>
