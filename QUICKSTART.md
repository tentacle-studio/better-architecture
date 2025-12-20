# 🎮 Better Architecture - Quick Start Guide

Welcome to **Better Architecture**, a tower defense game that teaches cloud solution architecture!

## 🚀 5-Minute Setup

### Prerequisites Check
```bash
java --version  # Need Java 17+
node --version  # Need Node 18+
```

### One-Command Start
```bash
git clone <your-repo>
cd better-architecture
./start-dev.sh  # macOS/Linux
```

The game will open at http://localhost:5173 🎉

## 🎯 Your First Game (2 minutes)

### 1. Start a Survival Game
- Click "Start Game" on the main menu
- Choose "Survival Mode"
- Budget: $500

### 2. Build Your First Infrastructure
```
Step 1: Place WAF (Firewall)
  - Click "WAF" in toolbar ($40)
  - Click on grid to place
  ✅ Blocks malicious traffic!

Step 2: Add Compute (Server)
  - Click "Compute" ($60)
  - Place next to WAF
  ✅ Processes requests!

Step 3: Add Database
  - Click "Database" ($150)
  - Place next to Compute
  ✅ Stores data!

Step 4: Connect them!
  - Click "Connect" tool
  - Click WAF → Click Compute
  - Click Compute → Click Database
  ✅ Traffic flows through your infrastructure!
```

### 3. Watch Your Architecture Work
- **Green numbers** = Earning money ✅
- **Red health bars** = Services need repair 🔧
- **Event bar** = Random challenges ⚠️

### 4. Survive!
- Keep **Reputation** above 0%
- Keep **Budget** above -$1000
- Repair services when health drops
- Scale up as traffic increases

## 🎓 Pro Tips for First 3 Minutes

1. **Always place WAF first** - Malicious traffic kills reputation fast
2. **Watch your budget** - Each service costs upkeep per minute
3. **Connect services properly** - Traffic needs a path to its destination
4. **Repair early** - Low health = reduced capacity
5. **Prepare for spikes** - Traffic multiplies at time milestones

## 📊 Understanding the UI

### Top Panel (Event Bar)
Shows active challenges like "DDoS Attack" or "Cost Spike"

### Left Panel
- **Stats**: Budget, Reputation, Score, RPS
- **Health**: Service status and repair buttons
- **Finances**: Income vs Expenses breakdown

### Right Panel (Toolbar)
- **Services**: Click to place infrastructure
- **Connect**: Link services together
- **Delete**: Remove services (50% refund)

### Center (Game Canvas)
- **3D view** of your infrastructure
- **Right-click + drag** to pan camera
- **Left-click** to place services

## 🎮 Game Modes Explained

### 🔥 Survival Mode (Recommended for First Play)
- Start with $500
- Traffic increases over time
- Random events every 15-45 seconds
- **Goal**: Survive as long as possible

### 🏗️ Sandbox Mode (For Experimentation)
- Set your own budget (up to $10,000+)
- Control traffic manually
- No game over
- **Goal**: Learn and test architectures

## 🆘 Troubleshooting

### Backend won't start?
```bash
cd api
./gradlew clean build
./gradlew bootRun
```

### Frontend won't start?
```bash
cd client
rm -rf node_modules package-lock.json
npm install
npm run dev
```

### Can't connect to game?
1. Check backend is running: http://localhost:8080
2. Check CORS in `api/src/main/resources/application.properties`
3. Clear browser cache and refresh

### Services not appearing?
1. Open browser console (F12)
2. Check for WebSocket connection errors
3. Verify backend logs for errors

## 📚 Next Steps

1. ✅ Complete your first survival game
2. 📖 Read [DEVELOPMENT.md](DEVELOPMENT.md) for detailed mechanics
3. 🏗️ Try Sandbox mode to experiment
4. 🚀 Check [ARCHITECTURE.md](ARCHITECTURE.md) to understand the code
5. 🎯 Try to beat your high score!

## 🎯 Win Conditions

There's no "winning" - just survive as long as you can!

**Good First Goal**: Survive 5 minutes
**Intermediate Goal**: Survive 10 minutes  
**Expert Goal**: Reach 100,000 score
**Master Goal**: Survive with 100% reputation

## 🐛 Found a Bug?

1. Check browser console (F12) for errors
2. Check backend logs in terminal
3. Try restarting both servers
4. Open an issue on GitHub

## 💡 Strategy for Success

### Minute 1: Foundation
- WAF → Compute → Database
- Keep it simple and cheap

### Minute 2-3: Scale Preparation  
- Add SQS (queue) before compute
- Add Cache between Compute and Database
- Monitor health bars

### Minute 4-5: Traffic Spike
- RPS doubles at minute 3!
- Add more Compute if needed
- Enable Auto-Repair

### Minute 6+: Survival Mode
- Multiple services of each type
- Load balancers (ALB)
- Constant repairs and scaling

## 🎉 Have Fun!

Remember: **Failing is learning!** Each game teaches you something new about cloud architecture.

Good luck, Cloud Architect! 🚀☁️

---

Need help? Check the [full README](README.md) or [development guide](DEVELOPMENT.md)
