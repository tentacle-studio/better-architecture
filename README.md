# Better Architecture

<div align="center">

🎮 **A Tower Defense Game for Cloud Architects** 🏗️

Build infrastructure, survive traffic, learn scaling and cloud best practices!

[Demo](#demo) • [Features](#features) • [Getting Started](#getting-started) • [How to Play](#how-to-play)

</div>

---

## 📖 About

**Better Architecture** is an educational tower defense game inspired by [Server Survival](https://github.com/pshenok/server-survival) that teaches cloud architecture concepts through gameplay. As a Cloud Architect, you must build and scale resilient infrastructure to handle increasing traffic loads while managing budget, defending against DDoS attacks, and maintaining service health.

Built with **React + Spring Boot** architecture.

## ✨ Features

### 🎯 Two Game Modes

#### Survival Mode
- Escalating traffic with RPS multipliers at time milestones (×1.3 at 1min → ×4.0 at 10min)
- Random events every 15-45 seconds (Cost Spikes, Capacity Drops, Traffic Bursts, etc.)
- Traffic pattern shifts every 40 seconds
- DDoS waves with 50% malicious traffic every 45 seconds
- Service health degradation under load requiring repairs
- Game over when reputation reaches 0% or budget drops below -$1000

#### Sandbox Mode
- Fully customizable testing environment
- Control starting budget (100-10000+)
- Adjust traffic mix manually
- No game over conditions
- Experiment freely with any architecture

### 🏗️ Infrastructure Services

| Service | Cost | Capacity | Upkeep | Description |
|---------|------|----------|--------|-------------|
| **WAF** | $40 | 30 | $2.0/min | Firewall - First line of defense, blocks malicious traffic |
| **SQS** | $35 | 200 | $1.5/min | Queue - Buffers requests during traffic spikes |
| **ALB** | $50 | 20 | $3.0/min | Load Balancer - Distributes traffic to multiple instances |
| **Compute** | $60 | 4 | $4.0/min | EC2 Instance - Processes requests (upgradeable T1→T3) |
| **Cache** | $60 | 30 | $3.0/min | Redis Cache - Reduces database load |
| **Database** | $150 | 8 | $8.0/min | RDS - Handles READ/WRITE/SEARCH (upgradeable T1→T3) |
| **S3** | $25 | 25 | $1.5/min | Storage - Handles STATIC/UPLOAD traffic |

### 🚦 Traffic Types

| Type | Color | Target | Reward | Description |
|------|-------|--------|--------|-------------|
| STATIC | 🟢 Green | S3 | $0.50 | Static file requests |
| READ | 🔵 Blue | Database | $0.80 | Database reads |
| WRITE | 🟠 Orange | Database | $1.20 | Database writes |
| UPLOAD | 🟡 Yellow | S3 | $1.50 | File uploads |
| SEARCH | 🔵 Cyan | Database | $0.80 | Search queries |
| MALICIOUS | 🔴 Red | WAF | $0.50 | DDoS/Attack traffic - MUST be blocked! |

### 🎮 Game Mechanics

- **Economy System**: Earn money from successful requests, pay upkeep costs
- **Reputation System**: Lose reputation on failed requests or leaked attacks
- **Service Health**: Services degrade under load and need repairs
- **Auto-Repair**: Optional feature with 10% upkeep overhead
- **Dynamic Events**: Random challenges that test your architecture
- **Real-time Updates**: WebSocket-powered live game state updates

## 🚀 Getting Started

### Prerequisites

- **Java 17+** (for Spring Boot backend)
- **Node.js 18+** (for React frontend)
- **npm** or **yarn**

### Installation

1. **Clone the repository**
```bash
git clone <your-repo-url>
cd better-architecture
```

2. **Start the Backend (Spring Boot)**
```bash
cd api
./gradlew bootRun
```

The backend will start on `http://localhost:8080`

3. **Start the Frontend (React + Vite)**

In a new terminal:
```bash
cd client
npm install
npm run dev
```

The frontend will start on `http://localhost:5173`

4. **Open your browser** and navigate to `http://localhost:5173`

## 🎮 How to Play

### Objective
Survive as long as possible by building infrastructure to handle traffic while maintaining:
- **Budget** ($): Don't go bankrupt (below -$1000)
- **Reputation** (%): Keep it above 0%
- **Service Health**: Repair damaged services

### Getting Started

1. **Place a WAF First**: Always start with a WAF to block malicious traffic
2. **Build Your Path**: Connect services in a logical flow
   - Internet → WAF → ALB → Compute → Cache → (Database/S3)
3. **Scale Strategically**: Add services as traffic increases
4. **Monitor Health**: Watch service health bars and repair when needed
5. **Manage Economy**: Balance income vs upkeep costs

### Controls

- **Left Click**: Select tools, place services
- **Right Click + Drag**: Pan the camera
- **Connect Tool**: Create traffic flow between services
- **Delete Tool**: Remove services (50% refund)
- **Repair Button**: Fix damaged services (15% of service cost)

### Strategy Tips

1. 🛡️ **Block Attacks First**: Malicious traffic leaks destroy reputation (-5 per leak)
2. 💚 **Watch Service Health**: Damaged services have reduced capacity
3. 📈 **Scale for Surges**: RPS multiplies at time milestones - prepare ahead!
4. 💰 **Balance Costs**: Start lean, scale as income grows
5. 🗄️ **Use Cache**: Significantly reduces database load for READ requests
6. 📦 **Buffer with SQS**: Queue helps survive traffic burst events
7. ⚠️ **React to Events**: Watch the event bar and adapt quickly

## 🏗️ Architecture

### Backend (Spring Boot)
```
api/src/main/java/ocean/studio/BetterArchitecture/
├── Tower/              # Infrastructure services & game engine
│   ├── ServiceType.java
│   ├── InfrastructureService.java
│   ├── GameState.java
│   ├── GameEngineService.java
│   ├── GameController.java
│   ├── ServiceController.java
│   ├── WebSocketConfig.java
│   └── GameLoopScheduler.java
├── Enemy/              # Traffic & events
│   ├── TrafficType.java
│   ├── TrafficRequest.java
│   ├── GameEvent.java
│   └── EventManagerService.java
└── Finance/            # Economy system
    ├── GameEconomy.java
    └── EconomyStats.java
```

### Frontend (React + TypeScript + Three.js)
```
client/src/
├── types.ts            # TypeScript interfaces
├── api.ts              # API service & WebSocket
├── App.tsx             # Main application
├── Game.tsx            # Game container
├── Game.css            # Game styles
└── components/
    ├── MainMenu.tsx        # Start screen
    ├── GameCanvas.tsx      # 3D visualization (Three.js)
    ├── ServiceToolbar.tsx  # Service placement UI
    ├── StatsPanel.tsx      # Game statistics
    ├── HealthPanel.tsx     # Service health management
    ├── FinancesPanel.tsx   # Income/expense tracking
    └── EventBar.tsx        # Active event display
```

## 🔧 Tech Stack

### Backend
- **Spring Boot 4.0** - Application framework
- **Spring Web** - REST API
- **Spring WebSocket** - Real-time updates
- **Java 25** - Programming language

### Frontend
- **React 19** - UI framework
- **TypeScript** - Type safety
- **Three.js** - 3D graphics
- **Vite** - Build tool
- **STOMP/SockJS** - WebSocket client

## 📝 API Endpoints

### Game Management
- `POST /api/game/create` - Create new game
- `GET /api/game/{gameId}` - Get game state
- `POST /api/game/{gameId}/pause` - Pause game
- `POST /api/game/{gameId}/resume` - Resume game
- `POST /api/game/{gameId}/auto-repair` - Toggle auto-repair
- `POST /api/game/{gameId}/traffic-mix` - Update traffic distribution

### Service Management
- `POST /api/service/{gameId}/place` - Place a service
- `DELETE /api/service/{gameId}/remove/{serviceId}` - Remove service
- `POST /api/service/{gameId}/connect` - Connect two services
- `POST /api/service/{gameId}/repair/{serviceId}` - Repair service

### WebSocket
- `/ws` - WebSocket endpoint
- `/topic/game/{gameId}/state` - Game state updates
- `/topic/game/{gameId}/traffic` - New traffic notifications

## 🎯 Future Enhancements

- [ ] Tutorial system for new players
- [ ] Sound effects and background music
- [ ] Service upgrade system (T1 → T2 → T3)
- [ ] Multiple service instances
- [ ] Save/load game functionality
- [ ] Leaderboard and achievements
- [ ] More infrastructure services (CloudFront, Lambda, etc.)
- [ ] Advanced traffic patterns
- [ ] Multiplayer mode

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is inspired by [Server Survival](https://github.com/pshenok/server-survival) by pshenok.

## 🙏 Acknowledgments

- Inspired by [Server Survival](https://github.com/pshenok/server-survival)
- Built with modern web technologies
- Educational tool for learning cloud architecture

---

<div align="center">

**Built with code and cloud concepts** ☁️

</div>