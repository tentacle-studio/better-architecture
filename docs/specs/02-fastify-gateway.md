# 02 — Node.js / Fastify API Gateway

TypeScript Fastify service acting as the single entry point for the frontend, handling auth, REST endpoints, and three WebSocket channels (terminal, canvas, traffic).

**Service name:** `gateway`  
**Language:** TypeScript (Node.js 22+)  
**Key deps:** `fastify`, `@fastify/websocket`, `@grpc/grpc-js`, `nats`, `jose` (JWT), OpenTelemetry JS SDK

---

## 2.1 Project Structure

```
gateway/
├── src/
│   ├── app.ts                      # Fastify instance, plugin registration
│   ├── config.ts                   # Typed env config (zod schema)
│   ├── routes/
│   │   ├── auth.ts                 # POST /auth/login, /auth/refresh, /auth/logout
│   │   ├── labs.ts                 # CRUD /labs, /labs/:id/start, /labs/:id/submit
│   │   ├── quizzes.ts              # GET /quizzes, /quizzes/:id
│   │   ├── users.ts                # GET /users/me, PATCH /users/me
│   │   ├── progress.ts             # GET /progress, /progress/streak
│   │   └── daily-tasks.ts          # GET /daily-tasks, PATCH /daily-tasks/:id
│   ├── ws/
│   │   ├── terminal.ts             # WebSocket → gRPC ExecStream proxy
│   │   ├── canvas-sync.ts          # WebSocket → resource state push
│   │   └── traffic.ts              # WebSocket → NATS traffic events
│   ├── services/
│   │   ├── orchestrator-client.ts  # gRPC client wrapper
│   │   ├── nats-client.ts          # NATS JetStream consumer
│   │   ├── auth-service.ts         # JWT + OIDC verification
│   │   └── session-service.ts      # Active session tracking (Redis)
│   ├── middleware/
│   │   ├── auth.ts                 # JWT verification hook
│   │   ├── rate-limit.ts           # Per-user rate limiting
│   │   └── tracing.ts              # OTel span creation
│   ├── db/
│   │   ├── client.ts               # PostgreSQL connection (pg / drizzle-orm)
│   │   └── queries/                # Typed query functions
│   └── types/
│       └── shared.ts               # Shared types between gateway & frontend
├── Dockerfile
├── package.json
└── tsconfig.json
```

---

## 2.2 REST API Endpoints

### Auth

| Method | Path | Body / Query | Response | Notes |
|--------|------|-------------|----------|-------|
| `POST` | `/auth/login` | `{ provider: "oidc", token: string }` | `{ accessToken, refreshToken, user }` | Verifies OIDC token, issues JWT pair |
| `POST` | `/auth/refresh` | `{ refreshToken }` | `{ accessToken, refreshToken }` | Rotates refresh token |
| `POST` | `/auth/logout` | — | `204` | Revokes refresh token |

### Labs

| Method | Path | Body / Query | Response | Notes |
|--------|------|-------------|----------|-------|
| `GET` | `/labs` | `?page&limit&category` | `{ data: Lab[], total }` | List available labs |
| `GET` | `/labs/:id` | — | `Lab` | Lab detail + quiz spec |
| `POST` | `/labs/:id/start` | — | `{ sandboxId, wsUrl }` | Calls orchestrator.CreateSandbox, returns WebSocket URLs |
| `POST` | `/labs/:id/submit` | `{ sandboxId }` | `{ passed, score, results[] }` | Calls orchestrator.ValidateQuiz |
| `DELETE` | `/labs/:id/session` | `{ sandboxId }` | `204` | Calls orchestrator.DestroySandbox |

### Progress & Daily Tasks

| Method | Path | Response | Notes |
|--------|------|----------|-------|
| `GET` | `/users/me` | `User` | Profile, level, XP |
| `GET` | `/progress` | `{ level, xp, streak, paths[], domains[] }` | Aggregated progress |
| `GET` | `/progress/streak` | `{ currentStreak, weekActivity[] }` | Streak data |
| `GET` | `/daily-tasks` | `{ day, week, topic, tasks[] }` | Today's task list |
| `PATCH` | `/daily-tasks/:taskId` | `{ isCompleted: true }` | Mark task done, award XP |
| `GET` | `/roadmap` | `{ phases[], currentPhase, modules[] }` | Learning roadmap |

---

## 2.3 WebSocket Endpoints

All WebSocket connections require a valid JWT in the `Authorization` header or `token` query param.

### `ws://gateway/ws/terminal/:sandboxId`

- **Purpose:** Proxy terminal I/O between browser Xterm.js and Go orchestrator's ExecStream
- **Protocol:** Binary frames (stdin/stdout), JSON frames for resize `{"type":"resize","cols":80,"rows":24}`
- **Lifecycle:** Opens gRPC ExecStream on connect, closes on disconnect
- **Heartbeat:** Ping/pong every 30s, timeout at 90s

### `ws://gateway/ws/canvas/:sandboxId`

- **Purpose:** Push resource state changes to the PixiJS/Canvas2D frontend
- **Protocol:** JSON delta messages
- **Message format:**
```json
{
  "type": "resource_event",
  "data": {
    "kind": "Pod",
    "name": "nginx-pod",
    "status": "Running",
    "connections": [{"from": "nginx-pod", "to": "redis-svc", "port": 6379}]
  }
}
```
- **Source:** Subscribes to orchestrator's `WatchResources` gRPC stream + NATS traffic events
- **Batching:** Aggregates events over 100ms windows before sending to reduce bandwidth

### `ws://gateway/ws/traffic/:sandboxId`

- **Purpose:** Real-time traffic visualization data for animated "packet dots" on canvas
- **Protocol:** JSON frames
- **Message format:**
```json
{
  "type": "traffic",
  "events": [
    {"src": "client-pod", "dst": "nginx-pod", "protocol": "HTTP", "latency_ms": 12},
    {"src": "nginx-pod", "dst": "redis-svc", "protocol": "TCP", "latency_ms": 3}
  ]
}
```
- **Source:** NATS JetStream subject `traffic.user.<userId>.<sandboxId>`

---

## 2.4 Authentication Flow

1. Frontend redirects to OIDC provider (Auth0 / Clerk)
2. Provider returns `id_token` to frontend callback
3. Frontend calls `POST /auth/login` with the `id_token`
4. Gateway verifies token against provider's JWKS endpoint
5. Gateway upserts user in PostgreSQL
6. Gateway issues short-lived access JWT (15min) + long-lived refresh JWT (7d)
7. Access JWT payload: `{ sub, email, role, iat, exp }`
8. All subsequent API/WS requests include `Authorization: Bearer <accessToken>`
