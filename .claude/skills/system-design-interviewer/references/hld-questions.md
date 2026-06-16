# High-Level Design (HLD) Problem Bank

A curated set of system design problems focusing on architecture, scalability, and distributed systems.
Use these as-is or as inspiration to create variations.

## Table of Contents

1. [Easy](#easy)
2. [Medium](#medium)
3. [Hard](#hard)

---

## Easy

### 1. Design a URL Shortener (e.g., bit.ly)

**Tags:** Hashing, Key-Value Store, Redirection
**Key concepts:** Hash/encode generation, collision handling, read-heavy system, analytics tracking
**Scale:** 100M URLs created/month, 10:1 read/write ratio
**Interesting angles:** Custom aliases, expiration, analytics dashboard

### 2. Design a Pastebin (e.g., pastebin.com)

**Tags:** Object Storage, CDN, Expiration
**Key concepts:** Content storage, unique ID generation, access controls, paste expiration
**Scale:** 5M pastes/day, average paste size 10KB
**Interesting angles:** Syntax highlighting, private vs public pastes, rate limiting

### 3. Design a Rate Limiter

**Tags:** Distributed Systems, Caching, Algorithms
**Key concepts:** Token bucket vs sliding window, distributed rate limiting, Redis-based counters
**Scale:** 10K requests/sec across multiple API servers
**Interesting angles:** Per-user vs per-IP, hierarchical limits, graceful degradation

### 4. Design a Key-Value Store

**Tags:** Storage, Replication, Consistency
**Key concepts:** Partitioning, replication, consistency models, conflict resolution
**Scale:** 1M reads/sec, 100K writes/sec
**Interesting angles:** Tunable consistency, vector clocks, gossip protocol

### 5. Design a Content Delivery Network (CDN)

**Tags:** Caching, Edge Computing, DNS
**Key concepts:** Edge servers, cache invalidation, origin pull vs push, geographic routing
**Scale:** Serve 1B requests/day globally
**Interesting angles:** Cache hierarchies, stale-while-revalidate, video streaming vs static assets

---

## Medium

### 6. Design Twitter / X (Social Feed)

**Tags:** Feed Generation, Fan-out, Caching, Pub/Sub
**Key concepts:** Fan-out on write vs read, timeline caching, celebrity problem, social graph
**Scale:** 500M users, 600K tweets/sec read, 6K tweets/sec write
**Interesting angles:** Real-time updates, trending topics, mixed media in tweets

### 7. Design Instagram

**Tags:** Media Storage, CDN, Feed, Search
**Key concepts:** Image upload pipeline, feed generation, explore/discovery, stories with TTL
**Scale:** 2B users, 100M photos/day
**Interesting angles:** Image processing pipeline, content moderation, geo-tagging

### 8. Design a Notification System

**Tags:** Pub/Sub, Message Queue, Push Notifications
**Key concepts:** Multi-channel delivery (push, email, SMS), priority queues, deduplication, user preferences
**Scale:** 10B notifications/day
**Interesting angles:** Rate limiting per user, notification grouping, real-time vs batched

### 9. Design a Chat Application (e.g., WhatsApp/Slack)

**Tags:** WebSockets, Message Queue, Presence, Encryption
**Key concepts:** Real-time messaging, message ordering, read receipts, group chat fan-out, offline delivery
**Scale:** 100M concurrent connections, 60B messages/day
**Interesting angles:** End-to-end encryption, message search, file sharing, presence indicators

### 10. Design a Web Crawler

**Tags:** Distributed Computing, Queue, Politeness
**Key concepts:** URL frontier, politeness policies, deduplication, distributed crawling, content extraction
**Scale:** Crawl 1B pages/month
**Interesting angles:** JavaScript rendering, trap detection, priority scheduling

### 11. Design an E-Commerce Platform (e.g., Amazon)

**Tags:** Microservices, Inventory, Payments, Search
**Key concepts:** Product catalog, shopping cart, order pipeline, inventory management, payment processing
**Scale:** 300M products, 50K orders/sec during peak
**Interesting angles:** Flash sales (thundering herd), recommendation engine, multi-vendor marketplace

### 12. Design a File Storage Service (e.g., Google Drive / Dropbox)

**Tags:** Object Storage, Sync, Versioning, Chunking
**Key concepts:** File chunking, deduplication, sync conflict resolution, block-level diffing
**Scale:** 500M users, 1B files uploaded/day
**Interesting angles:** Offline editing + sync, real-time collaboration, version history

### 13. Design a Search Autocomplete System

**Tags:** Trie, Caching, Ranking
**Key concepts:** Trie data structure, top-K frequent queries, personalization, multi-language support
**Scale:** 10K queries/sec, 100M unique queries
**Interesting angles:** Typo tolerance, trending queries, per-user personalization

### 14. Design a Video Streaming Platform (e.g., YouTube / Netflix)

**Tags:** Video Processing, CDN, Adaptive Bitrate, Recommendation
**Key concepts:** Video transcoding pipeline, adaptive bitrate streaming, content delivery, recommendation system
**Scale:** 1B daily views, 500 hours of video uploaded/minute
**Interesting angles:** Live streaming, copyright detection, offline downloads, A/B testing thumbnails

### 15. Design a Ride-Sharing Service (e.g., Uber / Lyft)

**Tags:** Geospatial, Matching, Real-Time, Pricing
**Key concepts:** Driver-rider matching, ETA computation, surge pricing, geospatial indexing
**Scale:** 20M rides/day, 5M concurrent drivers
**Interesting angles:** Pool/shared rides, driver dispatching algorithm, payment splitting

---

## Hard

### 16. Design Google Maps

**Tags:** Geospatial, Graph Algorithms, Real-Time Traffic, Tile Rendering
**Key concepts:** Map tile serving, route computation (Dijkstra/A*), real-time traffic updates, ETA prediction
**Scale:** 1B users, billions of road segments, real-time updates from millions of devices
**Interesting angles:** Offline maps, public transit integration, live traffic vs historical patterns

### 17. Design a Distributed Message Queue (e.g., Kafka)

**Tags:** Distributed Systems, Replication, Ordering, Durability
**Key concepts:** Partitioning, consumer groups, exactly-once semantics, log compaction, replication
**Scale:** 1M messages/sec, 10TB data/day, 99.99% availability
**Interesting angles:** Ordering guarantees, dead letter queues, schema evolution, exactly-once delivery

### 18. Design a Distributed Cache (e.g., Redis at Scale)

**Tags:** Caching, Consistent Hashing, Replication
**Key concepts:** Consistent hashing, cache eviction, hot key handling, cache stampede prevention
**Scale:** 100M ops/sec, 50TB data across cluster
**Interesting angles:** Multi-region caching, cache-aside vs write-through, thundering herd

### 19. Design a Global Payment System

**Tags:** Distributed Transactions, Idempotency, Compliance
**Key concepts:** Distributed transactions, idempotency, fraud detection, multi-currency, ledger design
**Scale:** 10M transactions/day, sub-second latency, zero data loss
**Interesting angles:** Two-phase commit vs saga pattern, regulatory compliance, reconciliation

### 20. Design Google Docs (Real-Time Collaboration)

**Tags:** CRDT, OT, WebSocket, Conflict Resolution
**Key concepts:** Operational transformation (OT) vs CRDTs, cursor presence, version history, access control
**Scale:** 100M documents, 10M concurrent editors
**Interesting angles:** Offline editing, comments/suggestions, permission model, undo/redo with collaboration

### 21. Design a Distributed Task Scheduler (e.g., Airflow at Scale)

**Tags:** DAG Execution, Distributed Systems, Fault Tolerance
**Key concepts:** DAG-based scheduling, task dependency resolution, failure recovery, distributed worker pools
**Scale:** 1M tasks/hour, complex dependency graphs
**Interesting angles:** Priority scheduling, backfill, dynamic DAG generation, resource isolation

### 22. Design a Search Engine (e.g., Google Search)

**Tags:** Inverted Index, Ranking, Crawling, Distributed Storage
**Key concepts:** Web crawling, inverted index, PageRank, query parsing, result ranking
**Scale:** 8.5B searches/day, trillions of indexed pages
**Interesting angles:** Spell correction, knowledge graph, personalization, freshness vs relevance

### 23. Design a Real-Time Gaming Leaderboard

**Tags:** Sorted Sets, Real-Time, Sharding
**Key concepts:** Ranked data structures, real-time updates, sharding across regions, anti-cheat
**Scale:** 100M players, 1M score updates/sec
**Interesting angles:** Regional vs global leaderboards, time-windowed boards, near-real-time rank queries

### 24. Design a Metrics & Monitoring System (e.g., Datadog / Prometheus)

**Tags:** Time-Series, Aggregation, Alerting, Dashboards
**Key concepts:** Time-series storage, rollup/downsampling, alerting pipeline, query language
**Scale:** 10M metrics, 1M data points/sec ingestion
**Interesting angles:** Anomaly detection, cardinality explosion, multi-tenant isolation

### 25. Design a Social Network Graph Service

**Tags:** Graph Database, BFS/DFS, Caching, Sharding
**Key concepts:** Graph storage, friend-of-friend queries, shortest path, privacy controls, graph partitioning
**Scale:** 2B users, 100B edges, 1M graph queries/sec
**Interesting angles:** Six degrees of separation, privacy-aware graph traversal, friend recommendations
