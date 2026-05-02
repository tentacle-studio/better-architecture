# Gateway Service

TypeScript Fastify API Gateway for Better Architecture platform.

## Features

- **REST API**: Auth, labs, users, progress, daily tasks
- **WebSocket**: Terminal, canvas sync, traffic visualization
- **Authentication**: JWT + OIDC integration
- **Rate Limiting**: Per-user rate limiting with Redis
- **Tracing**: OpenTelemetry instrumentation
- **Database**: PostgreSQL with connection pooling
- **Message Queue**: NATS JetStream for real-time events
- **gRPC Client**: Communication with Go orchestrator

## Setup

1. Install dependencies:
```bash
npm install
```

2. Copy environment file:
```bash
cp .env.example .env
```

3. Configure environment variables in `.env`

4. Run in development:
```bash
npm run dev
```

5. Build for production:
```bash
npm run build
npm start
```

## Docker

Build and run with Docker:

```bash
docker build -t gateway .
docker run -p 3000:3000 --env-file .env gateway
```

## API Endpoints

### Authentication
- `POST /auth/login` - Login with OIDC token
- `POST /auth/refresh` - Refresh access token
- `POST /auth/logout` - Logout and revoke refresh token

### Labs
- `GET /labs` - List available labs
- `GET /labs/:id` - Get lab details
- `POST /labs/:id/start` - Start a lab sandbox
- `POST /labs/:id/submit` - Submit lab quiz
- `DELETE /labs/:id/session` - Destroy sandbox

### Users & Progress
- `GET /users/me` - Get current user profile
- `PATCH /users/me` - Update user profile
- `GET /progress` - Get user progress
- `GET /progress/streak` - Get streak data
- `GET /daily-tasks` - Get daily tasks
- `PATCH /daily-tasks/:taskId` - Mark task complete

### WebSocket
- `ws://gateway/ws/terminal/:sandboxId` - Terminal I/O
- `ws://gateway/ws/canvas/:sandboxId` - Resource state sync
- `ws://gateway/ws/traffic/:sandboxId` - Traffic events

## Architecture

```
gateway/
├── src/
│   ├── app.ts                      # Main application
│   ├── config.ts                   # Configuration
│   ├── routes/                     # REST API routes
│   ├── ws/                         # WebSocket handlers
│   ├── services/                   # Business logic services
│   ├── middleware/                 # Fastify middleware
│   ├── db/                         # Database client & queries
│   └── types/                      # TypeScript types
├── proto/                          # gRPC proto definitions
├── Dockerfile
└── package.json
```

## Development

- `npm run dev` - Start with hot reload
- `npm run build` - Build TypeScript
- `npm run typecheck` - Type checking only
- `npm run lint` - Lint code
