# Low-Level Design (LLD) Problem Bank

A curated set of design problems focusing on class design, API contracts, data modeling,
and component-level architecture. These are the "object-oriented design" and "component design"
counterparts to the big-picture HLD questions.

## Table of Contents

1. [Easy](#easy)
2. [Medium](#medium)
3. [Hard](#hard)

---

## Easy

### 1. Design a Parking Lot System

**Tags:** OOP, State Management, Concurrency
**Key concepts:** Vehicle types, spot allocation strategy, pricing, entry/exit tracking
**Focus areas:** Class hierarchy (Vehicle → Car, Truck, Motorcycle), ParkingSpot, ParkingLot
**Interesting angles:** Multi-floor, handicapped spots, electric vehicle charging, real-time availability

### 2. Design a Library Management System

**Tags:** OOP, CRUD, Search
**Key concepts:** Book catalog, member management, borrow/return flow, fine calculation, reservations
**Focus areas:** Book, Member, Loan, Reservation entities and their relationships
**Interesting angles:** ISBN lookup, overdue notifications, waitlist when all copies out

### 3. Design a Vending Machine

**Tags:** State Machine, OOP
**Key concepts:** State transitions (idle → accepting money → dispensing → returning change), inventory tracking
**Focus areas:** State pattern, money handling, product selection
**Interesting angles:** Multiple payment methods, out-of-stock handling, admin refill interface

### 4. Design a Stack Overflow-like Q&A Platform (Data Model)

**Tags:** Schema Design, Voting, Reputation
**Key concepts:** Questions, answers, comments, voting, tagging, reputation system, badges
**Focus areas:** Entity relationships, vote aggregation, search indexing
**Interesting angles:** Duplicate detection, community moderation, markdown rendering

### 5. Design a Todo List API

**Tags:** REST API, CRUD, Authentication
**Key concepts:** Resource modeling, status transitions, filtering/sorting, user scoping
**Focus areas:** RESTful endpoints, request/response schemas, error handling
**Interesting angles:** Subtasks, labels/tags, due dates, recurring tasks, shared lists

---

## Medium

### 6. Design an Elevator System

**Tags:** Scheduling, State Machine, Concurrency
**Key concepts:** Elevator scheduling algorithms (SCAN, LOOK), multi-elevator coordination, request queuing
**Focus areas:** Elevator, Floor, Request, Scheduler classes and their interactions
**Interesting angles:** Priority floors (lobby), emergency mode, weight limits, energy efficiency

### 7. Design an In-Memory Cache with TTL (like a mini-Redis)

**Tags:** Data Structures, Concurrency, Eviction
**Key concepts:** Hash map + doubly linked list (LRU), TTL expiration (lazy vs active), thread safety
**Focus areas:** Cache interface, eviction policies (LRU, LFU, FIFO), get/put/delete operations
**Interesting angles:** Max memory limits, statistics tracking, pattern-based key expiration

### 8. Design a Hotel Booking System

**Tags:** OOP, Concurrency, Reservation
**Key concepts:** Room types, availability calendar, booking conflicts, payment integration, cancellation
**Focus areas:** Room, Reservation, Guest, Payment entities; concurrency on double-booking
**Interesting angles:** Overbooking strategy, seasonal pricing, loyalty programs, group bookings

### 9. Design a Movie Ticket Booking System (e.g., BookMyShow)

**Tags:** Concurrency, Seat Selection, Payments
**Key concepts:** Seat locking (temporary hold), show scheduling, theater layout, payment timeout
**Focus areas:** Show, Theater, Seat, Booking classes; handling concurrent seat selection
**Interesting angles:** Seat map rendering, bulk booking, different pricing zones, refund policy

### 10. Design a Chess Game

**Tags:** OOP, Game Logic, State Machine
**Key concepts:** Piece movement rules, board representation, check/checkmate detection, move validation
**Focus areas:** Piece hierarchy (King, Queen, Rook...), Board, Game, Move classes
**Interesting angles:** Castling, en passant, pawn promotion, draw conditions, move history/undo

### 11. Design a File System (in-memory)

**Tags:** Tree, OOP, Permissions
**Key concepts:** Directory tree, file/folder CRUD, path resolution, permissions model
**Focus areas:** FileNode, Directory, FileSystem classes; tree traversal
**Interesting angles:** Symbolic links, search by name/extension, disk usage calculation, permissions

### 12. Design a Rate Limiter Component

**Tags:** Algorithms, Concurrency, API Design
**Key concepts:** Token bucket, sliding window log, sliding window counter, fixed window
**Focus areas:** RateLimiter interface, algorithm implementations, thread-safe operations
**Interesting angles:** Per-key limits, distributed rate limiting, graceful rejection responses

### 13. Design a Task Scheduler (like cron)

**Tags:** Priority Queue, Concurrency, Scheduling
**Key concepts:** Cron expression parsing, priority queue for next execution, thread pool for execution
**Focus areas:** Task, Scheduler, CronExpression classes; recurring vs one-shot tasks
**Interesting angles:** Missed execution handling, task dependencies, max concurrency, retry policies

### 14. Design a Logging Framework (like Log4j)

**Tags:** OOP, Design Patterns, I/O
**Key concepts:** Log levels, appenders (console, file, remote), formatters, logger hierarchy
**Focus areas:** Logger, Appender, Formatter, LogLevel; configuration management
**Interesting angles:** Async logging, structured logging (JSON), log rotation, MDC/context propagation

### 15. Design a Pub/Sub Messaging System (component level)

**Tags:** Observer Pattern, Concurrency, Messaging
**Key concepts:** Topics, subscribers, message delivery guarantees, filtering
**Focus areas:** Topic, Subscriber, Publisher, Message classes; delivery strategies
**Interesting angles:** Wildcard subscriptions, message ordering, dead letter handling, backpressure

---

## Hard

### 16. Design a Database Connection Pool

**Tags:** Concurrency, Resource Management, Design Patterns
**Key concepts:** Pool sizing, connection lifecycle, health checking, wait queue, timeout handling
**Focus areas:** ConnectionPool, Connection, PoolConfig classes; thread-safe borrow/return
**Interesting angles:** Dynamic resizing, connection validation, leaked connection detection, metrics

### 17. Design an Online Code Editor & Judge (like LeetCode)

**Tags:** Sandboxing, Queue, API Design
**Key concepts:** Code submission, sandboxed execution, test case management, verdict determination
**Focus areas:** Submission, TestCase, Judge, Sandbox classes; execution pipeline
**Interesting angles:** Time/memory limits, multiple language support, plagiarism detection, contest mode

### 18. Design a Spreadsheet Engine

**Tags:** Dependency Graph, Parsing, Reactive Updates
**Key concepts:** Cell dependency DAG, formula parsing, topological sort for recalculation, circular reference detection
**Focus areas:** Cell, Sheet, FormulaParser, DependencyGraph classes
**Interesting angles:** Range references (SUM(A1:A10)), cross-sheet references, undo/redo, concurrent editing

### 19. Design a Workflow Engine (like GitHub Actions / Airflow)

**Tags:** DAG, State Machine, Concurrency
**Key concepts:** DAG execution, step dependencies, parallel execution, failure handling, retry logic
**Focus areas:** Workflow, Step, Executor, StepResult classes; DAG resolution and execution
**Interesting angles:** Conditional steps, timeouts, approval gates, parameterized workflows

### 20. Design a Type-Ahead / Autocomplete Service (component level)

**Tags:** Trie, Ranking, Caching
**Key concepts:** Trie construction, prefix matching, ranking by frequency/recency, personalization
**Focus areas:** Trie, TrieNode, AutocompleteService classes; insert/search/rank operations
**Interesting angles:** Fuzzy matching, multi-language support, real-time frequency updates, memory optimization

### 21. Design an Event Sourcing System

**Tags:** Event Store, CQRS, Projections
**Key concepts:** Event store, command handling, event projection, snapshots, replay
**Focus areas:** Event, EventStore, Aggregate, Projection classes; append-only log design
**Interesting angles:** Schema evolution, temporal queries, saga orchestration, event versioning

### 22. Design a Plugin/Extension System

**Tags:** Design Patterns, Dynamic Loading, API Design
**Key concepts:** Plugin interface, lifecycle management, dependency resolution, sandboxing, versioning
**Focus areas:** PluginManager, Plugin interface, PluginContext, Hook system
**Interesting angles:** Hot-reloading, plugin marketplace, permission model, conflict resolution

### 23. Design a Consensus Module (Raft simplified)

**Tags:** Distributed Systems, State Machine, Replication
**Key concepts:** Leader election, log replication, commit index, term numbers, membership changes
**Focus areas:** RaftNode, Log, StateMachine classes; RPC interfaces (AppendEntries, RequestVote)
**Interesting angles:** Split-brain handling, snapshotting, read consistency, joint consensus

### 24. Design a Circuit Breaker Pattern

**Tags:** Resilience, State Machine, Monitoring
**Key concepts:** Closed/Open/Half-Open states, failure threshold, recovery timeout, fallback strategies
**Focus areas:** CircuitBreaker, CircuitBreakerConfig, CallResult classes; state transitions
**Interesting angles:** Per-endpoint breakers, sliding window metrics, bulkhead integration, dashboard

### 25. Design an API Gateway (component level)

**Tags:** Routing, Middleware, Authentication, Rate Limiting
**Key concepts:** Request routing, authentication/authorization, rate limiting, request transformation, load balancing
**Focus areas:** Gateway, Route, Middleware, Filter chain classes; plugin architecture
**Interesting angles:** Circuit breaking, response caching, request aggregation, WebSocket support
