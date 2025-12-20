# Better Architecture - System Architecture

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Browser (Client)                         │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    React Application                      │  │
│  │  ┌────────────┐  ┌────────────┐  ┌──────────────────┐  │  │
│  │  │ Main Menu  │  │    Game    │  │   Components     │  │  │
│  │  │            │  │ Container  │  │  - Toolbar       │  │  │
│  │  │ - Survival │  │            │  │  - Stats Panel   │  │  │
│  │  │ - Sandbox  │  │ - State    │  │  - Health Panel  │  │  │
│  │  └────────────┘  └────────────┘  └──────────────────┘  │  │
│  │                                                          │  │
│  │  ┌────────────────────────────────────────────────────┐ │  │
│  │  │         GameCanvas (Three.js)                      │ │  │
│  │  │  - 3D Scene rendering                              │ │  │
│  │  │  - Service visualization                           │ │  │
│  │  │  - Traffic animation                               │ │  │
│  │  └────────────────────────────────────────────────────┘ │  │
│  └──────────────────────────────────────────────────────────┘  │
│                              ↕                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    API Service                            │  │
│  │  - REST API Client (fetch)                               │  │
│  │  - WebSocket Client (STOMP/SockJS)                       │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              ↕ HTTP/WebSocket
┌─────────────────────────────────────────────────────────────────┐
│                    Spring Boot Backend (Server)                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    REST Controllers                       │  │
│  │  ┌────────────────┐           ┌──────────────────┐      │  │
│  │  │ GameController │           │ ServiceController│      │  │
│  │  │ - create       │           │ - place          │      │  │
│  │  │ - pause/resume │           │ - remove         │      │  │
│  │  │ - auto-repair  │           │ - connect        │      │  │
│  │  └────────────────┘           └──────────────────┘      │  │
│  └──────────────────────────────────────────────────────────┘  │
│                              ↕                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    Service Layer                          │  │
│  │  ┌──────────────────────────────────────────────────┐   │  │
│  │  │          GameEngineService                        │   │  │
│  │  │  - createGame()                                   │   │  │
│  │  │  - placeService() / removeService()              │   │  │
│  │  │  - generateTraffic()                              │   │  │
│  │  │  - processRequests()                              │   │  │
│  │  │  - processUpkeep()                                │   │  │
│  │  └──────────────────────────────────────────────────┘   │  │
│  │  ┌──────────────────────────────────────────────────┐   │  │
│  │  │        EventManagerService                        │   │  │
│  │  │  - triggerRandomEvent()                           │   │  │
│  │  │  - updateRPSMilestones()                          │   │  │
│  │  └──────────────────────────────────────────────────┘   │  │
│  └──────────────────────────────────────────────────────────┘  │
│                              ↕                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                  Game Loop Scheduler                      │  │
│  │  @Scheduled(fixedRate = 100ms)                           │  │
│  │  - Update RPS milestones                                 │  │
│  │  - Trigger random events                                 │  │
│  │  - Generate traffic                                      │  │
│  │  - Process requests                                      │  │
│  │  - Process upkeep                                        │  │
│  │  - Broadcast via WebSocket                               │  │
│  └──────────────────────────────────────────────────────────┘  │
│                              ↕                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              WebSocket Configuration                      │  │
│  │  - STOMP over WebSocket                                  │  │
│  │  - Topic: /topic/game/{gameId}/state                     │  │
│  │  - Topic: /topic/game/{gameId}/traffic                   │  │
│  └──────────────────────────────────────────────────────────┘  │
│                              ↕                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    Domain Models                          │  │
│  │  - GameState (ConcurrentHashMap storage)                │  │
│  │  - InfrastructureService                                 │  │
│  │  - TrafficRequest                                        │  │
│  │  - GameEconomy                                           │  │
│  │  - ServiceType / TrafficType / GameEvent (Enums)        │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow Diagrams

### 1. Game Creation Flow
```
Player                 React                  API                 Backend
  |                      |                     |                      |
  |-- Select Mode ------>|                     |                      |
  |                      |-- POST /create ---->|                      |
  |                      |                     |-- createGame() ----->|
  |                      |                     |                      |-- New GameState
  |                      |                     |<---- GameState ------|
  |                      |<--- GameState ------|                      |
  |                      |-- Connect WS ------>|                      |
  |                      |<--- Connected ------|                      |
  |<--- Game Started ----|                     |                      |
```

### 2. Service Placement Flow
```
Player                 Canvas               API                 Engine              GameState
  |                      |                   |                    |                    |
  |-- Click Service ---->|                   |                    |                    |
  |-- Click Grid ------->|                   |                    |                    |
  |                      |-- placeService -->|                    |                    |
  |                      |                   |-- Check Budget --->|                    |
  |                      |                   |                    |-- Validate ------->|
  |                      |                   |                    |<-- Valid ----------|
  |                      |                   |<-- Service --------|                    |
  |                      |                   |                    |-- Add Service ---->|
  |                      |<-- Success -------|                    |                    |
  |                      |                   |                    |                    |
  |<-- Render Service ---|                   |<===== WebSocket Broadcast =============|
```

### 3. Traffic Processing Flow (Every 100ms)
```
GameLoopScheduler      Engine              GameState            Services
       |                 |                    |                    |
       |-- Tick -------->|                    |                    |
       |                 |-- Generate ------->|                    |
       |                 |   Traffic          |                    |
       |                 |<-- Requests -------|                    |
       |                 |                    |                    |
       |                 |-- Process -------->|                    |
       |                 |   Requests         |-- Get Services --->|
       |                 |                    |<-- Services -------|
       |                 |                    |                    |
       |                 |-- Route Request -->|                    |
       |                 |    (For each)      |-- Check Capacity ->|
       |                 |                    |<-- Available ------|
       |                 |                    |-- Degrade Health ->|
       |                 |                    |                    |
       |                 |<-- Result ---------|                    |
       |                 |-- Update Economy ->|                    |
       |                 |<-- Updated --------|                    |
       |                 |                    |                    |
       |-- Broadcast --->|==== WebSocket ====>| Client             |
```

### 4. Event System Flow
```
Time                EventManager           GameState            Client
  |                      |                    |                    |
  |-- Random Interval -->|                    |                    |
  |                      |-- Check Event ---->|                    |
  |                      |<-- No Active ------|                    |
  |                      |                    |                    |
  |                      |-- Trigger Event -->|                    |
  |                      |                    |-- Set Event ------>|
  |                      |                    |                    |
  |                      |-- Apply Effect --->|                    |
  |                      |   (Cost Spike,     |                    |
  |                      |    DDoS, etc.)     |                    |
  |                      |                    |                    |
  |                      |                    |==== Broadcast ====>|
  |                      |                    |                    |-- Show EventBar
  |                      |                    |                    |
  |-- Event Duration --->|                    |                    |
  |                      |-- End Event ------>|                    |
  |                      |-- Remove Effect -->|                    |
  |                      |                    |==== Broadcast ====>|
  |                      |                    |                    |-- Hide EventBar
```

## Component Interaction Matrix

| Component | Creates | Reads | Updates | Deletes |
|-----------|---------|-------|---------|---------|
| GameController | GameState | GameState | GameState (pause) | GameState |
| ServiceController | Services | Services | Services (repair) | Services |
| GameEngineService | Traffic | GameState, Services | Economy, Health | Services |
| EventManagerService | Events | GameState | TrafficMix, RPS | - |
| GameLoopScheduler | - | All Games | All via Engine | - |

## Technology Stack Integration

```
┌─────────────────────────────────────────────────────────────┐
│                     Technology Layers                        │
├─────────────────────────────────────────────────────────────┤
│  Presentation Layer                                          │
│  - React 19 (UI Components)                                 │
│  - Three.js (3D Visualization)                              │
│  - TypeScript (Type Safety)                                 │
├─────────────────────────────────────────────────────────────┤
│  Communication Layer                                         │
│  - REST API (Initial setup, commands)                       │
│  - WebSocket/STOMP (Real-time updates)                      │
│  - SockJS (WebSocket fallback)                              │
├─────────────────────────────────────────────────────────────┤
│  Business Logic Layer                                        │
│  - Spring Boot 4.0 (Application Framework)                  │
│  - @Scheduled Tasks (Game Loop)                             │
│  - Service Layer (Game Engine, Event Manager)               │
├─────────────────────────────────────────────────────────────┤
│  Domain Layer                                                │
│  - POJOs (GameState, Services, Traffic)                     │
│  - Enums (ServiceType, TrafficType, Events)                 │
│  - Business Rules (Routing, Economy, Health)                │
├─────────────────────────────────────────────────────────────┤
│  Infrastructure Layer                                        │
│  - ConcurrentHashMap (In-memory game storage)               │
│  - Spring WebSocket (Messaging)                             │
│  - Gradle (Build & Dependency Management)                   │
└─────────────────────────────────────────────────────────────┘
```

## Scalability Considerations

### Current Architecture (Single Instance)
- In-memory game state storage (ConcurrentHashMap)
- Suitable for: Development, small deployments, personal use
- Limitations: 
  - Games lost on restart
  - No horizontal scaling
  - Single point of failure

### Future Scaling Options

#### 1. Add Database Persistence
```
GameState → JPA/Hibernate → PostgreSQL/MongoDB
- Persist game sessions
- Enable save/load functionality
- Survive restarts
```

#### 2. Distributed Cache
```
GameState → Redis/Hazelcast → Shared cache
- Share state across instances
- Enable horizontal scaling
- Fast in-memory access
```

#### 3. Microservices
```
Current Monolith → Split into:
- Game Engine Service
- Event Service
- Economy Service
- WebSocket Gateway
- API Gateway
```

#### 4. Message Queue
```
Game Events → RabbitMQ/Kafka → Event Consumers
- Decouple components
- Better event processing
- Audit trail
```

## Security Considerations

### Current State
- CORS enabled for localhost development
- No authentication/authorization
- WebSocket open to all

### Production Recommendations
- [ ] Add Spring Security
- [ ] Implement JWT authentication
- [ ] Secure WebSocket connections
- [ ] Rate limiting on API endpoints
- [ ] Input validation and sanitization
- [ ] HTTPS/WSS in production

## Monitoring & Observability

### Recommended Additions
- [ ] Spring Actuator (Health checks, metrics)
- [ ] Prometheus + Grafana (Metrics visualization)
- [ ] ELK Stack (Logging)
- [ ] Distributed tracing (if microservices)

### Key Metrics to Track
- Active game sessions
- Average game duration
- Request processing time
- WebSocket connection count
- Memory usage per game
- CPU usage during traffic spikes

## Performance Benchmarks

### Expected Performance
- **Game Loop**: 100ms intervals (10 FPS)
- **WebSocket Latency**: < 50ms
- **Service Placement**: < 100ms
- **Request Processing**: < 10ms per request
- **Concurrent Games**: ~100-1000 depending on hardware

### Optimization Tips
- Use object pooling for TrafficRequests
- Batch WebSocket messages
- Optimize Three.js rendering (LOD, culling)
- Profile memory usage regularly
- Consider worker threads for heavy calculations
