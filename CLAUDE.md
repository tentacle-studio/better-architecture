## Project Context
This project is an educational application teaching system design, devops, and cloud architecture concepts through real infrastructure simulation. The lab follows LeetCode-style challenges and isolated environments for each challenge.

### Tech Stack
- **Orchestrator**: Go 1.21+, gRPC, Kubernetes client-go, Temporal workflows
- **Gateway**: Node.js 22+, TypeScript 5.x, Fastify 4.x, Drizzle ORM, PostgreSQL, Redis, NATS
- **Frontend**: React 19+, TypeScript 6.x, Vite 8.x, Tailwind CSS 4, Zustand, React Router DOM 7
- **Infrastructure**: Docker, Kubernetes, Helm, Vault, Temporal, NATS, PostgreSQL, Redis

## Core Principles

1. **READ FIRST**: Always read at least 1500 lines to understand context fully
2. **DELETE MORE THAN YOU ADD**: Complexity compounds into disasters
3. **FOLLOW EXISTING PATTERNS**: Don't invent new approaches
4. **BUILD AND TEST**: Run your build and test commands after changes
5. **COMMIT FREQUENTLY**: Every 5-10 minutes for meaningful progress

## File Structure Reference
```
./
├── Makefile                  # Root build orchestrator
├── docker-compose.yml        # Local development services
├── CLAUDE.md                 # Claude's rules
├── AGENTS.md                 # Agent's rules
│
├── orchestrator/            # Go gRPC server, Kubernetes orchestration, Temporal workers
│   ├── internal/
│   │   ├── grpc/           # gRPC server and protobuf handlers
│   │   ├── k8s/            # Kubernetes client operations
│   │   └── sandbox/        # Sandbox lifecycle management
│   ├── manifest/           # Kubernetes manifests and Helm charts
│   ├── proto/              # Protocol buffer definitions
│   └── main.go
│
├── gateway/                 # Fastify API Gateway (TypeScript)
│   ├── src/
│   │   ├── routes/         # HTTP route handlers
│   │   ├── services/       # Business logic services
│   │   ├── middleware/     # Auth, rate limiting, tracing
│   │   ├── db/             # Database schema and queries
│   │   └── ws/             # WebSocket handlers
│   ├── migrations/         # SQL migrations
│   ├── proto/              # gRPC protobuf definitions
│   └── package.json
│
├── frontend/                # React/Vite SPA (Feature-Sliced Design)
│   ├── src/
│   │   ├── app/            # App setup, routing, providers
│   │   ├── pages/          # Route-level components
│   │   ├── widgets/        # Complex UI blocks
│   │   ├── features/       # User interactions & business logic
│   │   ├── entities/       # Domain models (Lab, Task, User)
│   │   └── shared/         # Utilities, UI kit, API clients
│   └── package.json
│
├── docs/                    # Documentation
│   ├── labs/               # Lab tutorials and guides
│   └── orchestrator/       # Orchestrator documentation
│
└── scripts/                 # Build and deployment scripts
```

## Common Commands (All Personas)

```bash
# Build all services
make build

# Install dependencies
make install

# Start local development stack (Vault, Postgres, Redis, NATS)
make vault-up
make vault-init

# Run services in development mode
make orchestrator-run      # Go orchestrator
make gateway-dev           # Fastify dev server
make frontend-dev          # Vite dev server

# Run tests
make orchestrator-test     # Go tests

# Build Docker images
make docker-build

# Deploy to Kubernetes (Helm)
make orchestrator-helm-install
make gateway-helm-install
make frontend-helm-install

# Clean build artifacts
make clean
```

## Behavioral Guidelines
**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

### 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

### 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

### 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

### 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.
