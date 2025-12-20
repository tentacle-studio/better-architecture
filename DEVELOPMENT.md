# Development Guide

## Project Structure Overview

This project follows a client-server architecture with clear separation of concerns:

### Backend (Spring Boot)
- **Language**: Java 25
- **Framework**: Spring Boot 4.0
- **Build Tool**: Gradle
- **Port**: 8080

### Frontend (React)
- **Language**: TypeScript
- **Framework**: React 19
- **Build Tool**: Vite
- **Port**: 5173 (dev)

## Development Workflow

### 1. Backend Development

**Location**: `api/src/main/java/ocean/studio/BetterArchitecture/`

#### Key Components:

**Tower Package** (Infrastructure & Game Engine)
- `ServiceType.java` - Enum defining all infrastructure services
- `InfrastructureService.java` - Service entity with health, position, connections
- `GameState.java` - Complete game state including economy, services, events
- `GameEngineService.java` - Core game logic (traffic routing, service management)
- `GameLoopScheduler.java` - Scheduled tasks running at 10 FPS
- `WebSocketConfig.java` - WebSocket configuration for real-time updates
- `GameController.java` - REST endpoints for game management
- `ServiceController.java` - REST endpoints for service operations

**Enemy Package** (Traffic & Events)
- `TrafficType.java` - Enum for different traffic types
- `TrafficRequest.java` - Individual traffic request entity
- `GameEvent.java` - Random events that challenge players
- `EventManagerService.java` - Event triggering and management logic

**Finance Package** (Economy System)
- `GameEconomy.java` - Budget, reputation, score tracking
- `EconomyStats.java` - Detailed income/expense statistics

#### Running Backend

```bash
cd api
./gradlew bootRun
```

Or in your IDE, run `BetterArchitectureApplication.java`

#### Backend Testing

```bash
cd api
./gradlew test
```

### 2. Frontend Development

**Location**: `client/src/`

#### Key Components:

**Core Files**
- `types.ts` - TypeScript interfaces matching backend models
- `api.ts` - API service with REST and WebSocket clients
- `App.tsx` - Main application component with routing
- `Game.tsx` - Game container managing state and layout
- `Game.css` - Game-specific styles

**Components** (`client/src/components/`)
- `MainMenu.tsx` - Start screen with mode selection
- `GameCanvas.tsx` - 3D visualization using Three.js
- `ServiceToolbar.tsx` - Service selection and placement UI
- `StatsPanel.tsx` - Real-time game statistics display
- `HealthPanel.tsx` - Service health monitoring and repair
- `FinancesPanel.tsx` - Income and expense tracking
- `EventBar.tsx` - Active event notification banner

#### Running Frontend

```bash
cd client
npm install  # First time only
npm run dev
```

#### Frontend Build

```bash
cd client
npm run build  # Outputs to dist/
npm run preview  # Preview production build
```

### 3. Full Stack Development

Use the convenience script:

```bash
./start-dev.sh
```

This starts both backend and frontend concurrently.

## Game Logic Flow

### 1. Game Initialization
```
Player creates game → POST /api/game/create
→ GameEngineService creates GameState
→ WebSocket connection established
→ GameLoopScheduler starts processing
```

### 2. Service Placement
```
Player selects service → Clicks on canvas
→ POST /api/service/{gameId}/place
→ GameEngineService validates budget
→ Creates InfrastructureService
→ Adds to GameState
→ WebSocket broadcasts update
→ Canvas renders new service
```

### 3. Traffic Generation (Every 100ms)
```
GameLoopScheduler tick
→ EventManagerService checks/triggers events
→ GameEngineService.generateTraffic()
  → Calculates effective RPS
  → Selects traffic types based on mix
  → Creates TrafficRequest entities
→ WebSocket broadcasts new traffic
```

### 4. Request Processing
```
GameEngineService.processRequests()
→ For each pending request:
  → Find entry point (WAF or first service)
  → Traverse service connections
  → Check capacity at each hop
  → Degrade service health
  → Reach target or fail
→ Handle success/failure:
  → Update budget
  → Adjust reputation
  → Record statistics
→ WebSocket broadcasts state update
```

### 5. Upkeep Deduction (Every 60s)
```
GameEngineService.processUpkeep()
→ Calculate total upkeep with scaling
→ Deduct from budget
→ Apply auto-repair if enabled
→ Check for game over conditions
```

## API Communication Flow

### REST API (Initial setup)
```
Client                          Server
  |                               |
  |-- POST /api/game/create ----->|
  |<---- GameState ---------------| (with gameId)
  |                               |
  |-- POST /api/service/.../place |
  |<---- InfrastructureService ---|
```

### WebSocket (Real-time updates)
```
Client                          Server
  |                               |
  |-- Connect to /ws ------------>|
  |<---- Connected ---------------|
  |                               |
  |-- Subscribe /topic/game/*/state
  |                               |
  |    GameLoopScheduler          |
  |<---- State updates (10/sec) --|
  |<---- Traffic notifications ---|
```

## Adding New Features

### Adding a New Service Type

1. **Backend**: Update `ServiceType.java` enum
```java
NEW_SERVICE("Name", cost, capacity, upkeep, "Description")
```

2. **Frontend**: Update `types.ts` enum and SERVICE_INFO
```typescript
NEW_SERVICE = 'NEW_SERVICE',
// Add to SERVICE_INFO map
```

3. **Game Logic**: Update `GameEngineService.routeRequest()` if special routing needed

### Adding a New Traffic Type

1. **Backend**: Update `TrafficType.java` enum
2. **Frontend**: Update `types.ts` and TRAFFIC_INFO
3. **Update traffic mix** in `GameState.getDefaultTrafficMix()`

### Adding a New Game Event

1. **Backend**: Add to `GameEvent.java` enum
2. **Implement logic** in `EventManagerService.applyEventEffect()`
3. **Frontend**: EventBar automatically displays new events

## Debugging Tips

### Backend Debugging
- Enable DEBUG logging: `logging.level.ocean.studio=DEBUG`
- Check game loop: Add breakpoints in `GameLoopScheduler.gameLoop()`
- Monitor traffic: Log requests in `GameEngineService.processRequests()`

### Frontend Debugging
- React DevTools: Install browser extension
- WebSocket messages: Check browser console for traffic logs
- Three.js scene: Use `window.scene = sceneRef.current` for inspection

### Common Issues

**CORS Errors**
- Check `application.properties` has correct allowed origins
- Verify `@CrossOrigin` annotations on controllers

**WebSocket Connection Failed**
- Ensure backend is running on port 8080
- Check firewall/antivirus settings
- Verify STOMP configuration matches server

**Services Not Rendering**
- Check browser console for Three.js errors
- Verify service positions are valid numbers
- Ensure WebSocket is receiving state updates

## Performance Optimization

### Backend
- Game loop runs at 100ms intervals (10 FPS)
- Consider reducing for slower machines
- Use ConcurrentHashMap for thread-safe game state

### Frontend
- Three.js renderer only updates when state changes
- Limit WebSocket message size
- Use memo/useMemo for expensive calculations

## Testing Strategy

### Backend Unit Tests
```bash
./gradlew test
```

Test coverage:
- [ ] Service placement and removal
- [ ] Traffic routing logic
- [ ] Economy calculations
- [ ] Event triggering

### Frontend Testing
```bash
npm run test  # Add testing framework first
```

Test coverage:
- [ ] Component rendering
- [ ] API calls
- [ ] WebSocket connection
- [ ] Game state updates

## Deployment

### Backend Deployment
```bash
cd api
./gradlew build
java -jar build/libs/BetterArchitecture-0.0.1-SNAPSHOT.jar
```

### Frontend Deployment
```bash
cd client
npm run build
# Deploy dist/ folder to static hosting (Netlify, Vercel, S3, etc.)
```

### Environment Variables
- Backend: Configure `application.properties` or environment variables
- Frontend: Update `.env.production` with production API URL

## Contributing

1. Create a feature branch
2. Make changes
3. Test thoroughly
4. Submit pull request

## Resources

- [Spring Boot Documentation](https://spring.io/projects/spring-boot)
- [React Documentation](https://react.dev/)
- [Three.js Documentation](https://threejs.org/docs/)
- [WebSocket & STOMP](https://docs.spring.io/spring-framework/reference/web/websocket.html)
