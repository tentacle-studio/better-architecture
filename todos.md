# Project Todos

## Active

### P0 - Critical Security (Week 1)
- [ ] Enable gRPC mTLS between Gateway and Orchestrator (remove `grpc.credentials.createInsecure()`) | Priority: P0
- [ ] Rotate all hardcoded secrets in docker-compose.yml (Vault root token, Postgres password) | Priority: P0
- [ ] Migrate secrets management to production Vault with dynamic secrets | Priority: P0
- [ ] Fix Kubernetes RBAC to namespace-scoped access instead of ClusterAdmin | Priority: P0
- [ ] Implement production-grade secret management (no plaintext in env vars) | Priority: P0
- [ ] Implement WebSocket authentication via `Sec-WebSocket-Protocol` header instead of query params | Priority: P0
- [ ] If user exists or mount to other Chrome tabs, inactive or delete lab session | Priority: P0
- [ ] Register CompensationWorkflow and GradeLabWorkflow on Temporal | Priority: P0
- [ ] Full backend observability | Priority: P0

### P0 - Critical Reliability (Week 1-2)
- [ ] Persist sandbox state to PostgreSQL (currently in-memory only - data loss on restart) | Priority: P0
- [ ] Add circuit breakers to all gRPC calls to Orchestrator | Priority: P0
- [ ] Enable NATS JetStream persistence (prevent event loss on restart) | Priority: P0
- [ ] Set up PostgreSQL read replicas for high availability | Priority: P0
- [ ] Configure database connection pooling in Gateway (pg.Pool with max=20, min=5, idle timeout 30s) | Priority: P0
- [ ] Implement WebSocket connection manager with per-user limits (max 5 per user, 1000 total) | Priority: P0
- [ ] Add database performance indexes (labs category/status, sandbox sessions, user progress) | Priority: P0

### P1 - Gateway Hardening (Week 2)
- [ ] Add input validation on all gRPC request handlers (user_id, quiz_id, seed_manifest) | Priority: P1
- [ ] Implement per-user rate limiting quotas (not just global limits) | Priority: P1
- [ ] Strengthen JWT secret validation (require cryptographically random 256-bit minimum) | Priority: P1
- [ ] Add health check endpoint for load balancer probes | Priority: P1
- [ ] Implement request ID propagation across all services | Priority: P1
- [ ] Implement multi-tier caching strategy with Redis (route caching, query result caching) | Priority: P1
- [ ] Enhanced JWT security with token rotation and family tracking | Priority: P1
- [ ] Implement sliding window rate limiting with Redis sorted sets | Priority: P1
- [ ] Add comprehensive Zod schemas with sanitization for all endpoints | Priority: P1
- [ ] Implement WebSocket heartbeat monitoring (30s ping/pong, 90s timeout) | Priority: P1

### P1 - Temporal Integration (Week 2-3)
- [ ] Implement actual Temporal workflow code (SetupLabEnvironment workflow) | Priority: P1
- [ ] Add compensation workflows for partial sandbox cleanup | Priority: P1
- [ ] Implement sandbox TTL enforcement with cleanup workflow | Priority: P1

### P1 - Judge Engine Improvements (Week 2-3)
- [ ] Add timeout bounds to Judge Engine validation (prevent indefinite hangs) | Priority: P1
- [ ] Make port-forward based terminal scalable (replace per-session kubectl processes) | Priority: P1
- [ ] Add garbage collection for orphaned sandbox resources | Priority: P1
- [ ] Implement sandbox provisioning work queue with NATS JetStream | Priority: P1
- [ ] Add sandbox pooling system for faster provisioning (prewarm min sandboxes) | Priority: P1

### P2 - Observability (Week 4)
- [ ] Add OpenTelemetry distributed tracing end-to-end across all services | Priority: P2
- [ ] Deploy Prometheus metrics collection with Grafana dashboards | Priority: P2
- [ ] Set up centralized logging (Loki or EFK stack) | Priority: P2
- [ ] Add alerting rules for critical failures (sandbox creation, validation) | Priority: P2
- [ ] Define and monitor Service Level Indicators (SLIs) for key operations | Priority: P2
- [ ] Create SLO monitoring dashboard (95% sandbox creation <10s, 99.5% API availability) | Priority: P2
- [ ] Implement custom metrics (sandbox creation duration, active sandboxes, request success rates) | Priority: P2
- [ ] Add performance profiling endpoints for Gateway and Orchestrator | Priority: P2

### P2 - Scalability (Month 2)
- [ ] Configure HPA for Gateway and Orchestrator deployments | Priority: P2
- [ ] Set up NATS clustering (3-node cluster for HA) | Priority: P2
- [ ] Implement resource quotas on sandbox namespaces (prevent noisy neighbors) | Priority: P2
- [ ] Add vCluster horizontal scaling support | Priority: P2
- [ ] Implement horizontal scaling with sticky sessions for WebSocket connections | Priority: P2
- [ ] Add database sharding preparation with consistent hashing | Priority: P2
- [ ] Implement read replica routing for read-heavy queries | Priority: P2
- [ ] Add load testing suite and performance benchmarking | Priority: P2

### P3 - Documentation & Operations (Month 2-3)
- [ ] Document disaster recovery procedures | Priority: P3
- [ ] Add runbooks for common operational tasks | Priority: P3
- [ ] Set up automated backup strategy for PostgreSQL | Priority: P3
- [ ] Implement log retention policies | Priority: P3

### P3 - Development Experience (Month 3)
- [ ] Enhance docker-compose.dev.yml with hot reload for all services | Priority: P3
- [ ] Implement API contract testing between Gateway and Orchestrator | Priority: P3
- [ ] Add Pact consumer-driven contract tests | Priority: P3
- [ ] Create local development documentation with setup scripts | Priority: P3

### P3 - Cost Optimization (Month 3)
- [ ] Implement query result projection (select only needed fields) | Priority: P3
- [ ] Add resource usage monitoring and optimization alerts | Priority: P3
- [ ] Implement sandbox auto-scaling based on demand | Priority: P3
- [ ] Optimize Docker image sizes with multi-stage builds | Priority: P3

### P3 - Frontend Improvements (Ongoing)
- [ ] Display actual nodes and pods in UI sandbox view | Priority: P3
- [ ] Add silent JWT refresh flow | Priority: P3
- [ ] Implement route-based code splitting with React.lazy() | Priority: P3
- [ ] Add client-side caching for API responses | Priority: P3
- [ ] Implement prefetching for likely navigation routes | Priority: P3
- [ ] Add bundle size optimization and dependency analysis | Priority: P3

### 
- [ ] Implement Redis-backed session state for Gateway WebSocket mappings
- [ ] Implement deep health checks that verify orchestrator connectivity
- [ ] Add migration rollback support to database schema migrations
- [ ] Implement NetworkPolicy egress rules for sandbox isolation
- [ ] Add request logging with correlation IDs

### Implementation Tasks - Gateway Files
- [ ] Create gateway/src/middleware/circuit-breaker.ts (resilience patterns) | Priority: P1
- [ ] Create gateway/src/db/connection-pool.ts (optimized database connections) | Priority: P0
- [ ] Create gateway/src/middleware/cache-middleware.ts (multi-tier caching) | Priority: P1
- [ ] Create gateway/src/ws/connection-manager.ts (WebSocket pooling and limits) | Priority: P0
- [ ] Create gateway/migrations/006_performance_indexes.sql (database indexes) | Priority: P0
- [ ] Create gateway/src/services/token-manager.ts (JWT rotation with family tracking) | Priority: P1
- [ ] Create gateway/src/middleware/sliding-window-rate-limit.ts (advanced rate limiting) | Priority: P1
- [ ] Create gateway/src/telemetry/metrics.ts (custom Prometheus metrics) | Priority: P2

### Implementation Tasks - Orchestrator Files
- [ ] Create orchestrator/internal/sandbox/pool.go (sandbox pooling system) | Priority: P1
- [ ] Create orchestrator/internal/sandbox/queue.go (NATS work queue pattern) | Priority: P1
- [ ] Create orchestrator/internal/telemetry/metrics.go (custom metrics and SLIs) | Priority: P2
- [ ] Create orchestrator/internal/middleware/circuit_breaker.go (resilience patterns) | Priority: P1
- [ ] Create orchestrator/internal/db/sharding.go (database sharding preparation) | Priority: P2

### Implementation Tasks - Frontend Files
- [ ] Update frontend/src/app/router.tsx (route-based code splitting) | Priority: P3
- [ ] Create frontend/src/shared/api/cache.ts (client-side caching layer) | Priority: P3
- [ ] Create frontend/src/features/auth/lib/token-manager.ts (token rotation handling) | Priority: P3
- [ ] Update frontend/vite.config.ts (bundle optimization configuration) | Priority: P3

### Documentation
- [ ] After v1 version built, create a architecture decision records (ADR)

## Completed