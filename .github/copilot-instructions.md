# Better Architecture - AI Coding Agent Instructions

## Project Overview
Tower defense game teaching cloud architecture concepts. **Spring Boot backend** (Java 25) with **React frontend** (TypeScript), connected via REST + WebSocket (STOMP).

## Architecture Essentials

### Game Loop Pattern (100ms ticks)
Core gameplay runs in [GameLoopScheduler.java](api/src/main/java/ocean/studio/BetterArchitecture/GameEngine/GameLoopScheduler.java) at 10 FPS:
1. Update RPS milestones → 2. Trigger random events → 3. Generate traffic → 4. Process requests → 5. Process upkeep → 6. Broadcast via WebSocket

**Critical**: All game mutations happen in scheduled loop. Controllers only update flags/config, never directly mutate game state.

### State Management
- **Backend**: `ConcurrentHashMap<String, GameState>` in [GameEngineService.java](api/src/main/java/ocean/studio/BetterArchitecture/GameEngine/GameEngineService.java)
- **Frontend**: React state synchronized via WebSocket updates in [Game.tsx](client/src/Game.tsx)
- **Services storage**: `Map<String, InfrastructureService>` (not array!) - check type conversions carefully

### Data Flow Pattern
```
Client Action → REST Controller → Update GameState flags → 
GameLoopScheduler picks up changes → Processes logic → 
Broadcasts via WebSocket `/topic/game/{gameId}/state`
```

## Package Organization (Backend)

```
GameEngine/    - Core game loop, state management, service placement
Enemy/         - Traffic generation, events, DDoS mechanics
Finance/       - Economy calculations, budget tracking
Tower/         - Infrastructure services, WebSocket config, controllers
```

**Naming Convention**: Packages named by game domain (Enemy, Tower), not technical layers. When adding features, follow game metaphor (e.g., new traffic patterns → Enemy package).

## Development Commands

### Quick Start
```bash
./start-dev.sh  # Starts both servers (backend on 8080, frontend on 5173)
```

### Backend (Gradle)
```bash
cd api
./gradlew bootRun           # Run server
./gradlew test              # Run tests
./gradlew build             # Build JAR
```

### Frontend (Vite + npm)
```bash
cd client
npm install                 # First time only
npm run dev                 # Dev server with HMR
npm run build               # Production build to dist/
npm run preview             # Test production build
```

## Key Patterns

### WebSocket Communication
- Uses STOMP over SockJS (see [WebSocketConfig.java](api/src/main/java/ocean/studio/BetterArchitecture/Tower/WebSocketConfig.java))
- Topics: `/topic/game/{gameId}/state` (full state), `/topic/game/{gameId}/traffic` (new requests)
- Client connection in [api.ts](client/src/api.ts) - always disconnect on cleanup

### Service Placement Flow
1. Frontend calls `POST /api/service/{gameId}/place` with `{serviceType, position}`
2. Backend validates budget, creates service with UUID (`srv-xxxxxxxx`)
3. Service added to `GameState.services` map
4. Immediate broadcast + next game loop tick picks it up

### Type Synchronization
Backend enums (ServiceType, TrafficType) must match [types.ts](client/src/types.ts) exactly. When adding new types:
1. Update Java enum
2. Update TypeScript union type
3. Add UI representation in [ServiceToolbar.tsx](client/src/components/ServiceToolbar.tsx)

## Common Gotchas

1. **Services as Map not Array**: Backend uses `Map<String, InfrastructureService>`, serializes to JSON object. Frontend expects object, not array.

2. **Game State Timing**: Don't expect instant updates - changes may take 1-2 ticks (100-200ms) to reflect via WebSocket.

3. **Budget Validation**: Always check budget *before* operations in backend. Frontend shows optimistic updates but backend rejects insufficient funds.

4. **Event System**: Random events in Survival mode trigger based on elapsed time. Sandbox mode disables events entirely - check `game.getMode()`.

5. **CORS**: Backend allows all origins in dev. For production, update WebSocket allowed origins in [WebSocketConfig.java](api/src/main/java/ocean/studio/BetterArchitecture/Tower/WebSocketConfig.java).

## Testing Notes

- Backend tests use JUnit 5
- Frontend has no tests yet (opportunity for contribution)
- Manual testing: use Sandbox mode with high budget to test mechanics in isolation

## Debugging Tips

- **Console logging**: Both backend (System.out) and frontend (console.log) are verbose - check both simultaneously
- **WebSocket issues**: Open browser devtools Network tab → WS filter to see STOMP frames
- **Game state inspection**: Subscribe to `/topic/game/{gameId}/state` manually using browser STOMP clients

## Configuration Files

- Backend port: [application.properties](api/src/main/resources/application.properties)
- Frontend API URL: [vite.config.ts](client/vite.config.ts) proxy config
- Java version: [build.gradle](api/build.gradle) - currently Java 25
- TypeScript config: [tsconfig.json](client/tsconfig.json)
