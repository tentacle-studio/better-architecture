# Lab 05 — Design a Distributed Message Queue

**Category:** HLD
**Difficulty:** Hard
**Estimated Time:** 40–55 min
**Tags:** Distributed Systems, Replication, Ordering, Durability, Consumer Groups

---

## Problem Statement

Design a distributed, persistent message queue system similar to Apache Kafka. Your system allows producers to publish messages to named **topics**, and multiple independent **consumer groups** to consume those messages at their own pace — without one slow consumer affecting another.

Unlike a traditional queue (where a message is deleted once consumed), your system retains messages for a configurable retention window. Consumers track their own position (**offset**) in the log. This allows replaying messages, adding new consumers retroactively, and building audit trails.

The system must be fault-tolerant: a broker node failing should not lose any acknowledged messages and consumers should be able to resume from where they left off.

## Functional Requirements

1. Producers publish messages to a named topic.
2. Topics are divided into **partitions** for parallelism.
3. Multiple **consumer groups** can independently consume any topic.
4. Each consumer group tracks its own offset per partition.
5. Messages are retained for a configurable period (e.g., 7 days) regardless of consumption.
6. Consumer can seek to a specific offset or timestamp to replay messages.
7. At-least-once delivery guarantee by default; exactly-once as a stretch.
8. Producers can optionally set a message **key** to guarantee all messages with the same key go to the same partition (ordering guarantee).

## Non-Functional Requirements

1. **Durability:** Acknowledged messages must survive broker restarts and single-node failures.
2. **Availability:** 99.99% — the system must tolerate broker failures without downtime.
3. **Throughput:** 1M messages/sec write, 5M messages/sec read.
4. **Latency:** Producer ACK p99 < 50ms; consumer receive p99 < 100ms.
5. **Scalability:** Horizontally scalable by adding brokers; no hard ceiling.
6. **Ordering:** Messages with the same partition key must be delivered in order within a partition.

## Constraints & Scale

- 1M messages/sec write → ~1M × 1KB avg = 1GB/sec ingestion
- 10TB data/day → ~70TB/week retained
- 1,000 topics, avg 64 partitions each → 64,000 partition-leaders spread across brokers
- Consumer throughput: 5× write rate (multiple consumer groups)
- Replication factor: 3 (tolerate 2 failures before data loss)

## Starting Point

Start with the **producer write path**: a producer sends a message to `topic=orders, key=user_123`. Trace the full journey:

1. How does the producer know which broker to talk to?
2. Which partition does `user_123` land on?
3. How does the broker persist the message and replicate it?
4. When does the producer receive the ACK?

Then think about what happens when the **partition leader broker crashes mid-write**.

---

> **Note:** Do not read the discussion guide below until you've worked through your approach.
> Share your design and the interviewer will probe it with follow-up questions.

<details>
<summary>📖 Discussion Guide (click only after attempting)</summary>

## Discussion Guide

### Key Components

```
Producers
    │
    ▼
┌─────────────────────────────────────────────────────┐
│  Broker Cluster                                     │
│                                                     │
│  Broker 1 (Leader: P0, P1)   Broker 2 (Leader: P2) │
│  Broker 3 (Follower: P0, P2) etc.                  │
│                                                     │
│  Each broker:                                       │
│    - Commit Log (append-only files on disk)         │
│    - In-memory index: offset → file position        │
│    - Replication manager                            │
└─────────────────────────────────────────────────────┘
    │                         │
    ▼                         ▼
Consumers (Group A)      Consumers (Group B)
    │
    ▼
ZooKeeper / Metadata Service
  - Cluster membership
  - Topic/partition → broker mapping
  - Consumer group offsets
```

### Core Concepts

**Topic → Partition → Log:**
- A topic is split into N partitions (N is set at creation time).
- Each partition is an **ordered, immutable append-only log**.
- Each message has a monotonically increasing **offset** within its partition.
- Messages are stored as segment files on disk (e.g., 1GB each); old segments are deleted after retention expires.

**Partition Assignment:**
```
partition = hash(key) % num_partitions
```
Same key → same partition → ordering guaranteed within that partition.
No key → round-robin across partitions for load balancing.

**Replication (ISR model):**
- Each partition has 1 **leader** + N-1 **followers** (In-Sync Replicas).
- Producer writes to the leader; leader replicates to followers.
- ACK modes:
  - `acks=0` — fire and forget (fastest, may lose data)
  - `acks=1` — leader persists (default; may lose if leader dies before replication)
  - `acks=all` — all ISR acknowledge (strongest durability; higher latency)
- If the leader crashes, a follower in the ISR is elected as the new leader. No data loss if `acks=all`.

### Data Model (On-Disk)

```
/data/
  topic-orders/
    partition-0/
      00000000000000000000.log       ← segment file (messages)
      00000000000000000000.index     ← sparse offset index
      00000000000000000000.timeindex ← timestamp index
    partition-1/
      ...
```

**Message format:**
```
| offset (8B) | timestamp (8B) | key_len (4B) | key | value_len (4B) | value |
```

### API Design

**Producer API:**
```
// Client library, not HTTP
producer.send(topic, key, value, callback)
  → returns Future<RecordMetadata> { partition, offset, timestamp }

producer.flush()   // wait for all pending ACKs
producer.close()
```

**Consumer API:**
```
consumer.subscribe(["orders", "payments"])
consumer.poll(timeout_ms) → List<Record>
  // Record { topic, partition, offset, key, value, timestamp }

consumer.commitSync()   // commit current offsets
consumer.commitAsync()  // async commit
consumer.seek(partition, offset)  // replay from specific point
```

**Admin API:**
```
POST /topics { name, partitions, replication_factor, retention_ms }
GET  /topics/:name/offsets
GET  /consumer-groups/:group/lag
DELETE /topics/:name
```

### Deep Dives

**1. Consumer Groups and Partition Assignment:**
- Within a consumer group, each partition is owned by exactly one consumer (no two consumers in the same group read the same partition).
- The **Group Coordinator** (a broker) manages membership. When consumers join/leave → **rebalance** reassigns partitions.
- Rebalance strategies: Range (ordered partition ranges per consumer), RoundRobin, Sticky (minimize reshuffling).

**2. Exactly-Once Delivery (stretch):**
- At-least-once is default (consumer may re-process on crash before offset commit).
- Exactly-once requires:
  - **Idempotent producers** — broker deduplicates retried messages using `(producer_id, sequence_number)`
  - **Transactional API** — atomic write across partitions + offset commit in one transaction
  - Consumer must commit offsets and process messages in the same transaction (requires Kafka Streams or manual coordination)

**3. Consumer Lag & Backpressure:**
- Lag = `(latest_offset - consumer_committed_offset)` per partition
- Monitor lag to detect slow consumers before they fall behind the retention window (and lose the ability to catch up)
- No backpressure to producer — producer and consumer are completely decoupled

**4. Log Retention and Compaction:**
- Time-based: delete segments older than `retention.ms`
- Size-based: delete oldest segments when total log size exceeds `retention.bytes`
- **Log compaction** (special mode): keep only the latest message per key — useful for changelog/audit use cases. Compaction runs as a background thread.

**5. Leader Election on Broker Failure:**
- ZooKeeper (or KRaft in modern Kafka) detects broker heartbeat loss
- Controller broker selects new leader from ISR for each affected partition
- Clients discover new leader via metadata refresh (retry with backoff)
- If ISR is empty (all replicas down) → **unclean leader election** (data loss) or wait (availability sacrifice). Configurable.

### Common Pitfalls

- Not distinguishing between **topics** and **partitions** — the partition is the unit of parallelism, ordering, and replication.
- Assuming ordering across partitions — ordering is only guaranteed **within** a partition.
- Forgetting that offset commits are per consumer group, not global.
- Not considering what happens when a consumer crashes before committing its offset — messages will be re-delivered (at-least-once).
- Designing HTTP-based broker API instead of a binary TCP protocol — throughput requirement demands a high-performance binary protocol.
- Storing offsets in the application DB instead of back in the queue — creates coupling and offset drift.

### Evaluation Rubric

| Area | Weak | Good | Strong |
|------|------|------|--------|
| Partitioning | Not mentioned | Explains partitions for parallelism | Derives partition count, key-based routing |
| Replication | "Use replication" | ISR model described | acks=all tradeoff, unclean election |
| Consumer groups | Confused with topic | Independent offsets per group | Rebalance, partition ownership, lag monitoring |
| Persistence | In-memory only | Append-only log on disk | Segment files, sparse index, compaction |
| Failure scenarios | Ignored | Mentions leader election | ISR failover, producer retry, consumer resume |
| Scale reasoning | Vague | Rough throughput estimate | 1GB/sec write → segment sizing, broker count |

</details>
