# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Better Architecture** is an educational tower defense game teaching cloud architecture concepts. Players build infrastructure (WAF, Load Balancers, Compute, Database, Cache, etc.) to handle traffic while managing budget and reputation. Built with **Spring Boot backend** (Java 25) + **React frontend** (TypeScript + Three.js), connected via REST API + WebSocket (STOMP).

## Development Commands

### Quick Start
```bash
./start-dev.sh  # Starts both backend (8080) and frontend (5173)
```

### Backend (Gradle)
```bash
cd api
./gradlew bootRun           # Run Spring Boot server
./gradlew test              # Run JUnit tests
./gradlew build             # Build JAR artifact
./gradlew clean build       # Clean build from scratch
```

### Frontend (Vite + npm)
```bash
cd client
npm install                 # First time setup
npm run dev                 # Dev server with HMR
npm run build               # Production build to dist/
npm run preview             # Preview production build
```

## Architecture Fundamentals

### Game Loop Pattern (Critical)

The entire game runs on a **scheduled loop at 100ms intervals (10 FPS)** in `api/src/main/java/ocean/studio/BetterArchitecture/GameEngine/GameLoopScheduler.java`:

```
Every 100ms:
1. Update RPS milestones (traffic scaling)
2. Trigger random events (DDoS, Cost Spike, etc.)
3. Generate traffic based on RPS and traffic mix
4. Process pending requests through service graph
5. Apply upkeep costs (every 60 seconds)
6. Broadcast game state via WebSocket
```

**Critical Rule**: All game state mutations happen in the scheduled loop. REST controllers only update flags/configuration, never directly mutate core game state. This prevents race conditions with the concurrent game loop.

### State Management Architecture

**Backend**: In-memory storage using `ConcurrentHashMap<String, GameState>` in `GameEngineService.java`
- Thread-safe for concurrent game sessions
- No persistence - games lost on server restart
- Each game identified by UUID (e.g., `game-abc123`)

**Frontend**: React state synchronized via WebSocket
- Initial state fetched via REST API
- Real-time updates via WebSocket subscriptions
- Local state in `Game.tsx` re-renders on each broadcast

**Services Storage**: `Map<String, InfrastructureService>` (not array!) in `GameState.java`
- Keys are UUIDs like `srv-xxxxxxxx`
- Serializes to JSON object `{srv-xxx: {...}, srv-yyy: {...}}`
- Frontend must handle as object, not array

### Communication Flow

**REST API** (Initial setup and commands):
```
Client Action → HTTP POST → Spring Controller → GameEngineService → Update GameState flags
```

**WebSocket** (Real-time updates at 10 FPS):
```
GameLoopScheduler → SimpMessagingTemplate → /topic/game/{gameId}/state → STOMP Client → React setState
```

**Two-channel pattern**: Commands via REST, state sync via WebSocket. Never mutate state in controllers - only set flags for the game loop to process.

### Package Organization (Backend)

Located in `api/src/main/java/ocean/studio/BetterArchitecture/`:

- **GameEngine/** - Core game loop, state management, service operations
  - `GameLoopScheduler.java` - @Scheduled tasks at 100ms intervals
  - `GameEngineService.java` - Business logic (traffic routing, service placement)
  - `GameState.java` - Complete game state (services, economy, events)

- **Tower/** - Infrastructure services and API layer
  - `ServiceType.java` - Enum for infrastructure (WAF, ALB, Compute, Database, etc.)
  - `InfrastructureService.java` - Service entity with health, position, connections
  - `GameController.java` - REST endpoints for game management
  - `ServiceController.java` - REST endpoints for service operations
  - `WebSocketConfig.java` - STOMP/SockJS configuration

- **Enemy/** - Traffic generation and events
  - `TrafficType.java` - Enum for traffic (STATIC, READ, WRITE, MALICIOUS, etc.)
  - `TrafficRequest.java` - Individual request entity
  - `GameEvent.java` - Random events (DDoS, Cost Spike, Capacity Drop)
  - `EventManagerService.java` - Event triggering logic

- **Finance/** - Economy system
  - `GameEconomy.java` - Budget, reputation, score tracking
  - `EconomyStats.java` - Income/expense statistics

**Naming Convention**: Packages follow game domain metaphor (Enemy, Tower), not technical layers (controllers, services). When adding features, use game terminology.

### Frontend Structure

Located in `client/src/`:

- **types.ts** - TypeScript interfaces matching backend models
- **api.ts** - API client with REST methods + WebSocket connection
- **App.tsx** - Main application with routing (MainMenu vs Game)
- **Game.tsx** - Game container managing state and WebSocket subscriptions
- **components/** - React components
  - `GameCanvas.tsx` - Three.js 3D visualization
  - `ServiceToolbar.tsx` - Service placement UI
  - `StatsPanel.tsx`, `HealthPanel.tsx`, `FinancesPanel.tsx` - Game UI

## Critical Patterns and Gotchas

### 1. Service Placement Flow
```
User clicks service → POST /api/service/{gameId}/place {serviceType, position}
→ Validate budget in GameEngineService
→ Create InfrastructureService with UUID (srv-xxxxxxxx)
→ Add to GameState.services map (NOT array)
→ Immediate WebSocket broadcast
→ Next game loop tick processes it
```

**Gotcha**: Budget check happens server-side. Frontend shows optimistic updates but server may reject if insufficient funds.

### 2. Type Synchronization

Backend enums must match frontend TypeScript unions exactly:
- `ServiceType.java` ↔ `types.ts` ServiceType union
- `TrafficType.java` ↔ `types.ts` TrafficType union
- `GameEvent.java` ↔ `types.ts` GameEvent union

When adding new types, update both files and UI representations.

### 3. WebSocket Configuration

- Endpoint: `/ws` with SockJS fallback
- Topics:
  - `/topic/game/{gameId}/state` - Full game state (10/sec)
  - `/topic/game/{gameId}/traffic` - New traffic notifications
- STOMP protocol over WebSocket
- Always disconnect on component unmount to prevent memory leaks

**CORS**: Backend allows all origins in dev (`application.properties`). For production, update allowed origins in `WebSocketConfig.java`.

### 4. Game State Timing

Changes may take 1-2 game loop ticks (100-200ms) to reflect:
- REST call updates flags
- Next scheduled tick processes changes
- WebSocket broadcast sends updated state
- Frontend re-renders

Don't assume instant updates. Frontend should show loading states during operations.

### 5. Event System (Survival Mode Only)

Random events trigger every 15-45 seconds in Survival mode:
- DDoS waves (50% malicious traffic)
- Cost spikes (2x upkeep)
- Capacity drops (50% service capacity)
- Traffic bursts (3x RPS)

**Gotcha**: Sandbox mode disables events entirely. Always check `game.getMode()` when testing event logic.

### 6. Traffic Routing Logic

Located in `GameEngineService.routeRequest()`:
```
1. Find entry point (WAF if present, otherwise first service)
2. Traverse service connections (BFS)
3. Check capacity at each hop
4. Degrade service health based on load
5. Reach target service or fail
6. Update economy: success = +reward, failure = -reputation
```

**Gotcha**: MALICIOUS traffic must be blocked by WAF. If it reaches any other service, reputation drops by 5 points per leak.

### 7. Service Health and Repair

- Services degrade health under load (100 → 0)
- Low health reduces capacity proportionally
- Repair cost = 15% of service placement cost
- Auto-repair option adds 10% upkeep overhead

**Gotcha**: Health degradation is faster under higher load. High RPS requires constant repairs.

### 8. Services as Map, Not Array

Backend uses `Map<String, InfrastructureService>` which serializes to JSON object:
```json
{
  "srv-abc123": {
    "id": "srv-abc123",
    "type": "COMPUTE",
    "position": {"x": 0, "y": 0}
  },
  "srv-def456": {...}
}
```

Frontend must use `Object.values(gameState.services)` to iterate, not array methods directly.

## API Endpoints Reference

### Game Management
- `POST /api/game/create` - Create game with mode and config
- `GET /api/game/{gameId}` - Fetch current game state
- `POST /api/game/{gameId}/pause` - Pause game loop
- `POST /api/game/{gameId}/resume` - Resume game loop
- `POST /api/game/{gameId}/auto-repair` - Toggle auto-repair mode
- `POST /api/game/{gameId}/traffic-mix` - Update traffic distribution (Sandbox)

### Service Management
- `POST /api/service/{gameId}/place` - Place service with type and position
- `DELETE /api/service/{gameId}/remove/{serviceId}` - Remove service (50% refund)
- `POST /api/service/{gameId}/connect` - Connect two services for traffic flow
- `POST /api/service/{gameId}/repair/{serviceId}` - Repair service health

### WebSocket
- Connect: `/ws` (SockJS endpoint)
- Subscribe: `/topic/game/{gameId}/state` (game state updates)
- Subscribe: `/topic/game/{gameId}/traffic` (new traffic notifications)

## Adding New Features

### Adding a New Service Type

1. **Backend**: Update `ServiceType.java` enum
```java
NEW_SERVICE("Display Name", cost, capacity, upkeep, "Description")
```

2. **Frontend**: Update `types.ts` and SERVICE_INFO map
```typescript
export type ServiceType = 'WAF' | 'ALB' | ... | 'NEW_SERVICE';
export const SERVICE_INFO = {
  NEW_SERVICE: { name: '...', cost: ..., emoji: '...' }
};
```

3. **Routing Logic**: Update `GameEngineService.routeRequest()` if service has special routing behavior

4. **UI**: Add to `ServiceToolbar.tsx` for visual representation

### Adding a New Traffic Type

1. **Backend**: Add to `TrafficType.java` enum with target and reward
2. **Frontend**: Add to `types.ts` and TRAFFIC_INFO map with color
3. **Game Balance**: Update default traffic mix in `GameState.getDefaultTrafficMix()`

### Adding a New Game Event

1. **Backend**: Add to `GameEvent.java` enum
2. **Logic**: Implement effect in `EventManagerService.applyEventEffect()` and `removeEventEffect()`
3. **Frontend**: Event automatically displays in EventBar component

## Testing and Debugging

### Backend Testing
```bash
cd api
./gradlew test  # Run JUnit tests
```

**Test coverage areas**:
- Service placement and budget validation
- Traffic routing through service graph
- Economy calculations (income, upkeep, refunds)
- Event triggering and effects

### Frontend Testing
Currently no test framework configured. To add:
```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom
```

### Manual Testing Strategy

Use **Sandbox mode** with high budget ($10,000+) to test mechanics in isolation:
- Disable events to test specific features
- Manually control traffic mix
- No game over conditions for long-running tests

### Debugging Tips

**Console Logging**: Both backend and frontend are verbose with emoji-prefixed logs:
- Backend: Check terminal running `./gradlew bootRun`
- Frontend: Browser console (F12)

**WebSocket Inspection**:
1. Browser DevTools → Network tab → WS filter
2. See STOMP frames being sent/received
3. Verify state updates at 10 FPS

**Game State Inspection**:
- Add breakpoints in `GameLoopScheduler.gameLoop()` for backend
- Add `console.log(gameState)` in `Game.tsx` for frontend
- Use React DevTools to inspect component state

## Configuration Files

- Backend port and CORS: `api/src/main/resources/application.properties`
- Java version and dependencies: `api/build.gradle` (currently Java 25)
- Frontend API URL: `client/vite.config.ts` proxy config
- TypeScript config: `client/tsconfig.json`
- Frontend environment: `client/.env` (VITE_API_URL)

## Performance Considerations

**Game Loop**: Runs at 100ms (10 FPS) for all active games
- Each tick processes all games in ConcurrentHashMap
- Estimated capacity: 100-1000 concurrent games depending on hardware
- Consider reducing tick rate for slower environments

**WebSocket Broadcast**: Full state sent 10 times per second
- Average state size: ~2-5KB per game
- For 100 games: ~20-50KB/sec bandwidth
- Consider delta updates for production scaling

**Three.js Rendering**: Frontend only re-renders when state changes
- Use memoization for expensive calculations
- Consider LOD (Level of Detail) for many services

## Deployment Notes

**Backend**:
```bash
./gradlew build
java -jar build/libs/BetterArchitecture-0.0.1-SNAPSHOT.jar
```

**Frontend**:
```bash
npm run build  # Outputs to dist/
# Deploy dist/ folder to static hosting
```

**Environment Setup**:
- Update `VITE_API_URL` in `.env.production`
- Configure WebSocket allowed origins for production domain
- Ensure load balancer supports WebSocket sticky sessions
- Consider Redis/database for multi-instance deployment (currently single-instance only)
