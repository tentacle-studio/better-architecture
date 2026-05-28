# Gateway - Code Style & Architecture Guide

## Overview
The Gateway is a Node.js/TypeScript API gateway built with Fastify, serving as the entry point for the Better Architecture educational platform. It handles authentication, rate limiting, WebSocket connections, and communicates with a gRPC-based orchestrator for sandbox management.

## Tech Stack (2026)
- **Runtime**: Node.js 22+ (ES Modules)
- **Framework**: Fastify 4.x
- **Language**: TypeScript 5.x with strict mode
- **Database**: PostgreSQL 15+ with Drizzle ORM
- **Cache/Rate Limiting**: Redis 7+
- **Message Queue**: NATS 2.x
- **Authentication**: JWT (jose library) + Hashing (bcryptjs)
- **gRPC**: @grpc/grpc-js for orchestrator communication
- **Observability**: OpenTelemetry + Pino logging
- **Validation**: Zod schema validation
- **Build**: tsx (development), tsc (production)

## Project Structure
```
gateway/
├── src/
│   ├── app.ts                  # Fastify app setup, middleware registration
│   ├── config.ts               # Configuration loading with Zod validation
│   ├── db/
│   │   ├── client.ts           # Drizzle database client
│   │   ├── schema.ts           # Database schema definitions
│   │   ├── migrate.ts          # Migration runner
│   │   └── queries/            # Database query functions
│   ├── middleware/
│   │   ├── auth.ts             # JWT authentication middleware
│   │   ├── rate-limit.ts       # Redis-based rate limiting
│   │   └── tracing.ts          # OpenTelemetry tracing
│   ├── routes/
│   │   ├── auth.ts             # Authentication endpoints
│   │   ├── labs.ts             # Lab management endpoints
│   │   ├── users.ts            # User management endpoints
│   │   ├── progress.ts         # Progress tracking endpoints
│   │   └── daily-tasks.ts      # Daily tasks endpoints
│   ├── services/
│   │   ├── auth-service.ts     # JWT/OIDC authentication logic
│   │   ├── nats-client.ts      # NATS message client
│   │   ├── orchestrator-client.ts  # gRPC client for orchestrator
│   │   ├── session-service.ts  # Redis session management
│   │   └── vault-client.ts     # Vault secret fetching
│   ├── types/
│   │   └── shared.ts           # Shared TypeScript types
│   └── ws/
│       ├── terminal.ts         # Terminal WebSocket handler
│       ├── canvas-sync.ts      # Canvas sync WebSocket handler
│       └── traffic.ts          # Traffic visualization WebSocket
├── proto/
│   └── orchestrator.proto      # gRPC service definition
├── migrations/                 # SQL migration files
├── package.json
├── tsconfig.json
└── Dockerfile
```

## Architecture Principles

### 1. Layered Architecture
- **Routes**: Define HTTP endpoints, input validation, request/response shaping
- **Services**: Business logic, external service communication
- **Middleware**: Cross-cutting concerns (auth, rate limiting, tracing)
- **Database**: Data access via Drizzle ORM with dedicated query files

### 2. Dependency Injection
Services are instantiated with configuration and passed to routes/middleware that need them:
```typescript
const authService = new AuthService(config);
await fastify.register(authRoutes, { authService, db });
```

### 3. gRPC Communication
The orchestrator-client uses protobuf-defined services for:
- Sandbox lifecycle (CreateSandbox, DestroySandbox)
- Validation (ValidateQuiz)
- Streaming (ExecStream, WatchResources)

### 4. WebSocket Architecture
Dual-protocol support:
- REST for standard CRUD operations
- WebSocket for real-time terminal, canvas sync, and traffic visualization

## Code Style

### TypeScript Configuration
- Target: ES2022
- Module: ESNext (native ESM)
- Strict mode enabled
- No unused locals/parameters
- No implicit returns

### Naming Conventions
- **Files**: camelCase (e.g., `auth-service.ts`, `orchestrator-client.ts`)
- **Classes**: PascalCase (e.g., `AuthService`, `NatsClient`)
- **Functions**: camelCase (e.g., `createAuthMiddleware`, `loadConfig`)
- **Database tables**: snake_case (e.g., `sandbox_sessions`, `user_path_progress`)

### Import Style
```typescript
// ESM imports with .js extension (required for ESM resolution)
import Fastify from 'fastify';
import { z } from 'zod';
import type { FastifyRequest } from 'fastify';
```

### Error Handling
```typescript
// Use try/catch for async operations
try {
  const result = await someAsyncOperation();
} catch (error) {
  fastify.log.error(error);
  return reply.status(500).send({ error: 'Internal server error' });
}
```

### Configuration Management
All configuration loaded through Zod-validated schema with Optional Vault integration:
```typescript
const configSchema = z.object({
  databaseUrl: z.string().url(),
  jwtSecret: z.string().min(32),
  port: z.coerce.number().default(3000),
});
```

## Commands

```bash
# Development
pnpm run dev          # Start with hot-reload (tsx watch)

# Build
pnpm run build        # Compile TypeScript to JavaScript

# Production
pnpm run start        # Start production server

# Code quality
pnpm run lint         # ESLint check
pnpm run typecheck    # TypeScript type checking

# Database
pnpm run db:migrate   # Run database migrations
pnpm run db:studio    # Open Drizzle Studio GUI
```

## Docker Commands

```bash
# Build for production
docker build -t gateway:latest .

# Run locally
docker run -p 3000:3000 --env-file .env gateway:latest

# Development build
docker-compose build gateway
docker-compose up gateway
```

## Key Patterns

### 1. Route Registration Pattern
```typescript
// Public routes (no auth)
await fastify.register(authRoutes, { prefix: '', authService, db });

// Protected routes (auth + rate limit)
await fastify.register(async (protectedRoutes) => {
  protectedRoutes.addHook('onRequest', authMiddleware);
  protectedRoutes.addHook('onRequest', rateLimiter);
  await protectedRoutes.register(labsRoutes, { prefix: '', orchestrator });
});
```

### 2. WebSocket Handler Pattern
```typescript
export async function terminalWebSocket(fastify: FastifyInstance, opts: TerminalWSOptions) {
  fastify.get('/ws/terminal', {
    websocket: true,
    preHandler: [authMiddleware]
  }, async (connection, request) => {
    // WebSocket handling
  });
}
```

### 3. gRPC Client Pattern
```typescript
export class OrchestratorClient {
  async createSandbox(request: CreateSandboxRequest): Promise<CreateSandboxResponse> {
    return new Promise((resolve, reject) => {
      this.client.CreateSandbox(request, (error, response) => {
        error ? reject(error) : resolve(response);
      });
    });
  }
}
```

### 4. Database Query Pattern
```typescript
// queries/labs.ts
export async function getLabById(db: PgSelect, id: string) {
  return await db.select().from(labs).where(eq(labs.id, id)).then(rows => rows[0]);
}
```

## Important Notes (2026 Best Practices)

### Security
- Always validate input with Zod schemas at route level
- JWT tokens validated via `jose` library (modern alternative to `jsonwebtoken`)
- Password hashing uses bcryptjs with 10 salt rounds
- Rate limiting prevents brute force attacks
- CORS configured with credentials support for frontend

### Observability
- Pino logging with JSON output for production, pretty-printed for development
- OpenTelemetry middleware for distributed tracing
- Health check endpoint for Kubernetes readiness/liveness probes

### Performance
- Redis caching for sessions and rate limiting
- NATS for async message processing
- Connection pooling via Drizzle ORM
- WebSocket connections for real-time updates (avoid polling)

### Infrastructure
- Multi-stage Docker builds minimize production image size
- Environment-based configuration (development/production/test)
- Graceful shutdown on SIGTERM/SIGINT
- Vault integration for secret management (optional, for production)

## Common Issues & Solutions

### Native ESM Resolution
TypeScript ESM requires `.js` extensions in imports even for `.ts` files:
```typescript
// Correct
import { loadConfig } from './config.js';

// Incorrect - will fail at runtime
import { loadConfig } from './config';
```

### gRPC Protocol Buffer Changes
After modifying `proto/orchestrator.proto`:
```bash
# Regenerate TypeScript definitions
npx protoc --js_out=import_style=commonjs,binary:. --grpc_out=./src/grpc --plugin=protoc-gen-grpc=`which grpc_tools_node_protoc_plugin` proto/orchestrator.proto
```

### Database Schema Updates
After modifying `db/schema.ts`:
```bash
pnpm run db:generate  # Generate migration
pnpm run db:migrate   # Apply migration
```

## Testing Guidelines

When adding new features:
1. Write unit tests for services
2. Write integration tests for routes
3. Test WebSocket handlers with mock connections
4. Mock external dependencies (NATS, gRPC, Redis)

Example test structure:
```typescript
// services/auth-service.test.ts
describe('AuthService', () => {
  it('should create valid JWT tokens', async () => {
    // test implementation
  });
});
```