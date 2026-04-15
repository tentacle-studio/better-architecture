# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Better Architecture** is an educational desktop tower defense game teaching cloud architecture concepts through real infrastructure simulation. Players build and connect services (Postgres, Redis, NGINX, Load Balancers, API Gateways, Servers) on a grid to handle traffic. Built with **C++17**, **SFML** for graphics, and **Docker** for real container-based infrastructure simulation.

**Tech Stack:**
- C++17 with CMake 3.21+ build system
- SFML (Simple Fast Multimedia Library) for rendering and input
- Docker containers for real infrastructure simulation
- vcpkg for dependency management
- libcurl for Docker API communication
- nlohmann-json for JSON parsing

## Development Commands

### Prerequisites

Install required tools:
```bash
# macOS
brew install cmake ninja

# Ubuntu/Debian
sudo apt install cmake ninja-build

# Windows
# Download CMake from https://cmake.org/download/
# Download Ninja from https://ninja-build.org/
```

Install vcpkg for dependency management:
```bash
# Clone vcpkg
git clone https://github.com/microsoft/vcpkg.git
cd vcpkg

# Bootstrap vcpkg
./bootstrap-vcpkg.sh  # macOS/Linux
# or
bootstrap-vcpkg.bat   # Windows

# Set environment variable
export VCPKG_ROOT=/path/to/vcpkg
```

### Building

```bash
# Configure with default preset
cmake --preset default

# Or configure for release
cmake --preset release

# Build (debug)
cmake --build --preset debug

# Build (release)
cmake --build --preset release
```

### Running

```bash
# Run the game
./build/bin/better-architecture
```

### Quick Start

First time setup:
```bash
# Install dependencies
brew install cmake ninja
git clone https://github.com/microsoft/vcpkg.git
export VCPKG_ROOT=$(pwd)/vcpkg
cd vcpkg && ./bootstrap-vcpkg.sh && cd ..

# Build and run
cmake --preset default
cmake --build --preset debug
./build/bin/better-architecture
```

## Architecture Fundamentals

### Game Loop Pattern (Critical)

The game runs on a **two-thread architecture** with a 60 FPS render loop in `src/Engine/Render/game_engine.cpp`:

```
Main Thread (60 FPS):
1. Process SFML input events (mouse clicks, keyboard)
2. Update packet positions and animations (delta time)
3. Render grid, services, wires, UI, and packets
4. Push simulation jobs to worker thread queue

Worker Thread (Async):
1. Pull jobs from SafeQueue
2. Create/destroy Docker containers for services
3. Execute simulated requests against containers
4. Push results back to main thread queue
```

**Critical Rule**: The main thread owns all SFML objects and rendering state. The worker thread manages Docker containers exclusively. Communication happens through thread-safe `SafeQueue<T>` only. Never share mutable state between threads.

**Frame timing**: Each frame targets ~16.6ms (1/60 second). Updates use delta time for smooth animations regardless of frame rate.

### State Management Architecture

**In-Process**: C++ objects in memory, no persistence or database
- GameGrid stores services in a sparse map (efficient for large grids)
- ServiceEntity objects represent placed infrastructure
- PacketEntity objects visualize traffic between services
- All state resets on application restart

**Thread Communication**: Producer-consumer pattern via SafeQueue
- `SafeQueue<SimJob>` - Main thread pushes jobs → Worker pulls
- `SafeQueue<SimResult>` - Worker pushes results → Main pulls
- Mutex-protected with `std::queue` and `std::mutex`

**Rendering State**: SFML manages window, sprites, and draw calls
- `sf::RenderWindow` - Main game window at 1920x1080 (configurable)
- `sf::RectangleShape` - Used for grid cells, services, wires
- `sf::CircleShape` - Used for packet entities

### Communication Flow

**Thread Communication Pattern**:
```
Main Thread                     Worker Thread
-----------                     -------------
User clicks service
  ↓
Create SimJob {CREATE_CONTAINER, serviceId, type}
  ↓
jobQueue.push(job) --------→ jobQueue.pop(job)
                              ↓
                            DockerClient.createContainer("postgres:latest")
                              ↓
                            resultQueue.push(result)
                              ↓
resultQueue.pop(result) ←------
  ↓
Update UI to show service active
  ↓
Render service on grid
```

**No REST API, No WebSocket** - All communication is in-process via thread-safe queues.

### Source Code Organization

Located in `src/`:

- **Engine/** - Core game systems
  - **Render/** - SFML rendering and input handling
    - `game_engine.hpp` - Main game loop class
    - `game_engine.cpp` - 60 FPS loop implementation
  - **Simulation/** - Background worker for Docker containers
    - `simulation_manager.cpp` - Container lifecycle management
    - `request_executor.hpp` - Request simulation logic
    - `thread_pool.hpp` - Concurrent job execution
    - `packet.hpp` - Packet entity for visualization
    - `job.h` - Job and Result queue structures

- **Map/** - Game world and UI
  - **Grid/** - Grid system and service placement
    - `game_grid.cpp` - Grid state and service management
    - `service_entity.h` - Service instance structure
    - `service_entity.cpp` - Service implementation
    - `sparse_map.h` - Efficient sparse grid storage
    - `tile_enums.h` - Tile type enumerations
  - **Sidebar/** - Service selection UI
    - `sidebar.hpp` - Sidebar UI component
    - `sidebar.cpp` - Sidebar implementation
    - `service_types.h` - ServiceType enum

- **Docker/** - Docker integration layer
  - `docker_client.hpp` - Docker API client (libcurl + Unix socket)
  - `port_manager.hpp` - Dynamic port allocation

- **main.cpp** - Entry point, creates GameEngine and calls run()

**Naming Convention**: Packages follow game/engine metaphor (Engine, Map) rather than technical layers. When adding features, prefer domain terminology over generic "utils" or "helpers".

## Critical Patterns and Gotchas

### 1. Docker Container Management

**Pattern**:
```cpp
// DockerClient communicates via Unix socket
// Location: /var/run/docker.sock (Docker Desktop)
//           ~/.rd/docker.sock (Rancher Desktop)

DockerClient client;
std::string containerId = client.createContainer("postgres:latest", 1);
client.startContainer(containerId);

// Later...
client.stopContainer(containerId);
client.removeContainer(containerId);
```

**Service Type → Docker Image Mapping** (in `simulation_manager.cpp`):
- `POSTGRES` → `postgres:latest` (port 5432)
- `REDIS` → `redis:latest` (port 6379)
- `NGINX` → `nginx:alpine` (port 80)
- `LOAD_BALANCER` → `nginx:alpine` (port 80)
- `API_GATEWAY` → `kong:latest` (port 8000)
- `SERVER` → `tomcat:9.0-jre11-openjdk-slim` (port 8080)

**Gotcha**: Containers persist until explicitly removed. If the game crashes, orphaned containers may remain. Use `docker ps -a` and `docker rm -f $(docker ps -aq)` to clean up.

**Gotcha**: Docker socket permissions required. Ensure your user can access the Docker socket without sudo, or the game will fail to create containers.

### 2. Thread-Safe Communication

**Pattern**:
```cpp
// SafeQueue is a mutex-protected std::queue wrapper
template<typename T>
class SafeQueue {
    std::queue<T> queue;
    std::mutex m;
public:
    void push(T item) {
        std::lock_guard<std::mutex> lock(m);
        queue.push(item);
    }
    bool pop(T& item) {
        std::lock_guard<std::mutex> lock(m);
        if (queue.empty()) return false;
        item = queue.front();
        queue.pop();
        return true;
    }
};
```

**Usage**:
```cpp
// Main thread (game_engine.cpp)
SimJob job;
job.type = JobType::CREATE_CONTAINER;
job.entityId = serviceId;
job.metadata = "POSTGRES";
jobQueue.push(job);

// Worker thread (simulation_manager.cpp)
SimJob job;
if (jobQueue.pop(job)) {
    // Process job...
    SimResult result;
    result.success = true;
    resultQueue.push(result);
}
```

**Gotcha**: Never access SFML objects from the worker thread. SFML is not thread-safe. All rendering must happen on the main thread.

**Gotcha**: Queue operations are atomic, but multi-step operations are not. If you need to check-then-push, use a separate mutex or atomic flag.

### 3. Service Placement Flow

**Flow**:
```
User clicks service in sidebar
  ↓
selectedServiceType = POSTGRES
currentState = DRAGGING_GHOST
  ↓
Mouse moves over grid
  ↓
ghostSprite.setPosition(mouseGridPos) // Visual feedback
  ↓
User clicks on grid cell
  ↓
GameGrid::placeService(serviceType, gridPos)
  ↓
Create ServiceEntity with UUID (srv-xxxxxxxx)
  ↓
Push CREATE_CONTAINER job to worker thread
  ↓
Worker creates Docker container
  ↓
Result pushed back to main thread
  ↓
Service marked as active, rendered on grid
```

**Gotcha**: Service placement is optimistic. The UI shows the service immediately, but container creation happens asynchronously. Check result queue to handle failures.

### 4. SFML Rendering Pipeline

**Render Order** (in `game_engine.cpp`):
```cpp
void GameEngine::render() {
    window.clear(sf::Color::Black);

    // 1. Grid background
    grid.render(window);

    // 2. Wires between services
    for (auto& wire : wires) {
        window.draw(wire);
    }

    // 3. Services (on top of wires)
    for (auto& service : services) {
        window.draw(service.sprite);
    }

    // 4. Packets (animated traffic)
    for (auto& packet : activePackets) {
        window.draw(packet.shape);
    }

    // 5. UI (sidebar, stats)
    sidebar.render(window);

    window.display();
}
```

**Gotcha**: Draw order matters. Objects drawn later appear on top. If wires appear above services, check draw order.

**Gotcha**: SFML coordinates are top-left origin. Grid coordinates (0,0) map to screen coordinates based on cell size (e.g., 64x64 pixels per cell).

### 5. Packet Visualization System

**Pattern**:
```cpp
// Packets spawn every PACKET_SPAWN_INTERVAL seconds
if (packetSpawnTimer >= PACKET_SPAWN_INTERVAL) {
    spawnPacket(sourceServiceId, targetServiceId);
    packetSpawnTimer = 0.f;
}

// Packets move along wires
void updatePackets(float dt) {
    for (auto& packet : activePackets) {
        packet.progress += packet.speed * dt;
        if (packet.progress >= 1.0f) {
            // Packet arrived at target
            handlePacketArrival(packet);
        }
    }
}
```

**Gotcha**: Packets are purely visual. They don't represent actual requests yet (see `TODO.txt` for planned features).

### 6. Wiring System

**Two Modes** (in `game_engine.hpp`):
- `CLICK_AND_DRAG` - User clicks source, drags to target, releases to connect
- `PATHFINDING_BFS` - Automatic pathfinding finds shortest path between services

**Gotcha**: Wires are directional. Traffic flows from source to target only. To enable bidirectional traffic, create two wires.

### 7. Service Types and Enums

**Definition** in `service_types.h`:
```cpp
enum class ServiceType {
    NONE,
    POSTGRES,
    REDIS,
    NGINX,
    LOAD_BALANCER,
    API_GATEWAY,
    SERVER,
};
```

**Gotcha**: `NONE` is used for empty grid cells and uninitialized state. Always check `type != ServiceType::NONE` before processing.

**Gotcha**: When adding new service types, update BOTH the enum AND the Docker image mapping in `simulation_manager.cpp`.

### 8. Game State Management

**States** (in `game_engine.hpp`):
```cpp
enum class GameState {
    EDITING,           // Placing/removing services
    SIMULATING,        // Game running, packets moving
    IDLE,              // No interaction
    DRAGGING_GHOST,    // Dragging service ghost before placement
    WIRING             // Connecting services with wires
};
```

**Gotcha**: Some operations are only valid in certain states. For example, can't place services while SIMULATING.

## Class and Function Reference

### GameEngine Class

**Location**: `src/Engine/Render/game_engine.hpp`

**Key Methods**:
- `run()` - Main entry point, starts render loop at 60 FPS
- `processInput()` - Handles keyboard/mouse events
- `update(float dt)` - Updates game logic (packets, animations)
- `render()` - Draws everything to window
- `simulationWorker()` - Worker thread function for Docker management

**Key Members**:
- `sf::RenderWindow window` - SFML window (1920x1080 default)
- `GameGrid grid` - Grid state and services
- `Sidebar sidebar` - Service selection UI
- `SafeQueue<SimJob> jobQueue` - Jobs for worker thread
- `SafeQueue<SimResult> resultQueue` - Results from worker thread

### GameGrid Class

**Location**: `src/Map/Grid/game_grid.cpp`

**Key Methods**:
- `placeService(ServiceType, GridIndex)` - Place service at grid position
- `removeService(GridIndex)` - Remove service from grid
- `getService(GridIndex)` - Get service at position (or nullptr)
- `render(sf::RenderWindow&)` - Draw grid and services

**Key Members**:
- `SparseMap<ServiceEntity> services` - Efficient sparse grid storage
- `int cellSize` - Pixel size of each grid cell (64x64 default)

### DockerClient Class

**Location**: `src/Docker/docker_client.hpp`

**Key Methods**:
- `createContainer(string image, int instanceId)` - Create container from image
- `startContainer(string containerId)` - Start stopped container
- `stopContainer(string containerId)` - Stop running container
- `removeContainer(string containerId)` - Remove container
- `getContainerPort(string containerId, int internalPort)` - Get mapped host port

**Implementation Details**:
- Uses libcurl to communicate with Docker Unix socket
- Sends raw HTTP requests (POST, DELETE) to Docker API v1.41
- Parses JSON responses with nlohmann-json

### SimulationManager Class

**Location**: `src/Engine/Simulation/simulation_manager.cpp`

**Key Methods**:
- `run()` - Worker thread main loop
- `processJob(SimJob&)` - Handle job from main thread
- `handleCreateContainer(SimJob&)` - Create Docker container
- `handleDestroyContainer(SimJob&)` - Stop and remove container
- `handleExecuteRequest(SimJob&)` - Execute simulated request

**Key Members**:
- `DockerClient docker` - Docker API client
- `PortManager portManager` - Dynamic port allocation
- `map<string, string> containerMap` - GameEntityID → Docker ContainerID

## Adding New Features

### Adding a New Service Type

1. **Add to enum** in `src/Map/Sidebar/service_types.h`:
```cpp
enum class ServiceType {
    NONE,
    POSTGRES,
    REDIS,
    NGINX,
    LOAD_BALANCER,
    API_GATEWAY,
    SERVER,
    ELASTICSEARCH,  // New service type
};
```

2. **Add Docker image mapping** in `src/Engine/Simulation/simulation_manager.cpp`:
```cpp
std::string getDockerImageForService(const std::string& serviceTypeStr) {
    if (serviceTypeStr == "POSTGRES") return "postgres:latest";
    if (serviceTypeStr == "REDIS") return "redis:latest";
    // ... existing mappings
    if (serviceTypeStr == "ELASTICSEARCH") return "elasticsearch:8.11.0";
    return "nginx:alpine"; // Default
}
```

3. **Add port mapping**:
```cpp
int getInternalPortForImage(std::string imageName) {
    if (imageName.find("postgres") != std::string::npos) return 5432;
    // ... existing mappings
    if (imageName.find("elasticsearch") != std::string::npos) return 9200;
    return 80; // Default
}
```

4. **Add to sidebar UI** in `src/Map/Sidebar/sidebar.cpp`:
```cpp
// Add button and visual representation
void Sidebar::addServiceButton(ServiceType::ELASTICSEARCH,
                                "Elasticsearch",
                                sf::Color(0, 150, 136));
```

5. **Rebuild**:
```bash
cmake --build --preset debug
```

### Adding a New Game Mode

1. **Add to GameState enum** in `src/Engine/Render/game_engine.hpp`:
```cpp
enum class GameState {
    EDITING,
    SIMULATING,
    IDLE,
    DRAGGING_GHOST,
    WIRING,
    MY_NEW_MODE,  // New mode
};
```

2. **Handle mode in input processing**:
```cpp
void GameEngine::processInput() {
    if (currentState == GameState::MY_NEW_MODE) {
        // Handle inputs for new mode
    }
}
```

3. **Update rendering** if mode requires visual changes:
```cpp
void GameEngine::render() {
    // ... existing rendering
    if (currentState == GameState::MY_NEW_MODE) {
        // Render mode-specific UI
    }
}
```

### Adding a New Packet Effect

1. **Modify PacketEntity** in `src/Engine/Simulation/packet.hpp`:
```cpp
struct PacketEntity {
    std::string id;
    std::string sourceId;
    std::string targetId;
    float progress;  // 0.0 to 1.0
    sf::CircleShape shape;
    sf::Color color;  // Add color for different packet types
    PacketType type;  // Add enum for packet types
};
```

2. **Update spawn logic**:
```cpp
void GameEngine::spawnPacket(const std::string& sourceId,
                             const std::string& targetId,
                             PacketType type) {
    PacketEntity packet;
    packet.type = type;
    // Set color based on type
    packet.color = getColorForPacketType(type);
    packet.shape.setFillColor(packet.color);
    // ... rest of initialization
}
```

## Testing and Debugging

### Manual Testing Strategy

**Testing Service Placement**:
1. Run game: `./build/bin/better-architecture`
2. Click service in sidebar
3. Click on grid to place
4. Verify container created: `docker ps`
5. Check container logs: `docker logs <container_id>`

**Testing Wiring**:
1. Place two services
2. Press 'W' key to enter wiring mode
3. Click source service
4. Click target service
5. Verify wire drawn between them

**Testing Packet Flow**:
1. Wire two services together
2. Wait for packet spawn (2 seconds)
3. Verify packet moves along wire
4. Check packet arrives at target

### Debugging Tips

**SFML Window Debug**:
- Add debug overlays: `window.draw(debugText);`
- Print mouse position: `sf::Mouse::getPosition(window)`
- Check frame rate: measure time between frames

**Docker Container Debug**:
```bash
# List running containers
docker ps

# View container logs
docker logs <container_id>

# Inspect container
docker inspect <container_id>

# Test container connectivity
curl localhost:<mapped_port>
```

**Thread Safety Debug**:
- Add logging with thread ID: `std::this_thread::get_id()`
- Use thread sanitizer: `cmake -DCMAKE_CXX_FLAGS="-fsanitize=thread"`
- Check for data races with valgrind: `valgrind --tool=helgrind`

**Console Logging**:
The fmt library provides colored output:
```cpp
#include <fmt/color.h>
fmt::print(fg(fmt::color::green), "Service placed successfully\n");
fmt::print(fg(fmt::color::red), "Error: {}\n", errorMsg);
```

**Breakpoints** (GDB/LLDB):
```bash
# Build with debug symbols
cmake --preset debug
cmake --build --preset debug

# Run with debugger
lldb ./build/bin/better-architecture

# Set breakpoint
(lldb) b game_engine.cpp:123

# Run
(lldb) run
```

**Common Issues**:

1. **"Failed to create Docker container"**
   - Check Docker daemon running: `docker ps`
   - Check socket permissions: `ls -la /var/run/docker.sock`
   - Try with sudo (temporary): `sudo ./build/bin/better-architecture`

2. **Black screen / No rendering**
   - Check SFML installation: `brew list sfml`
   - Verify window created: Add `fmt::print("Window created\n");`
   - Check for exception in terminal output

3. **Segfault on startup**
   - Run with debugger to get stack trace
   - Check for null pointer dereferences
   - Verify all resources loaded correctly

4. **Services not appearing**
   - Check jobQueue successfully pushing: Add logging
   - Verify worker thread running: Add thread ID log
   - Check resultQueue being polled by main thread

## Configuration Files

### CMakeLists.txt

**Location**: `CMakeLists.txt`

Main build configuration:
```cmake
cmake_minimum_required(VERSION 3.21)
project(BetterArchitecture VERSION 1.0.0)

set(CMAKE_CXX_STANDARD 17)

# Find dependencies (via vcpkg)
find_package(fmt CONFIG REQUIRED)
find_package(SFML COMPONENTS Graphics REQUIRED)
find_package(curl CONFIG REQUIRED)
find_package(nlohmann_json CONFIG REQUIRED)

# Create executable
add_executable(better-architecture
    src/main.cpp
    src/Map/Grid/game_grid.cpp
    src/Map/Grid/service_entity.cpp
    src/Map/Sidebar/sidebar.cpp
    src/Engine/Render/game_engine.cpp
)

# Link libraries
target_link_libraries(better-architecture PRIVATE
    fmt::fmt
    SFML::Graphics
    CURL::libcurl
    nlohmann_json::nlohmann_json
)
```

**Adding a new source file**: Add to `add_executable()` list.
**Adding a new dependency**: Add `find_package()` and link in `target_link_libraries()`.

### CMakePresets.json

**Location**: `CMakePresets.json`

Presets for different build configurations:
- `default` - Debug build with vcpkg toolchain
- `debug` - Alias for default
- `release` - Release build with optimizations (-O3)

**Usage**:
```bash
cmake --preset release
cmake --build --preset release
```

### vcpkg.json

**Location**: `vcpkg.json`

Dependency manifest:
```json
{
  "name": "better-architecture",
  "version": "1.0.0",
  "dependencies": [
    "fmt",
    "nlohmann-json",
    "sfml",
    "curl"
  ]
}
```

**Adding a dependency**:
1. Search for package: `$VCPKG_ROOT/vcpkg search <name>`
2. Add to dependencies array
3. Reconfigure: `cmake --preset default`

### vcpkg-configuration.json

**Location**: `vcpkg-configuration.json`

vcpkg registry configuration (usually no changes needed).

## Performance Considerations

### Rendering Performance

**Target**: 60 FPS (16.6ms per frame)

**Bottlenecks**:
- Too many draw calls (each service, wire, packet is a draw call)
- Inefficient sprite batching (SFML draws individually by default)
- Excessive state changes (texture switching, shader changes)

**Optimizations**:
- Use `sf::VertexArray` to batch multiple rectangles into one draw call
- Limit visible area (don't render off-screen services)
- Use `sf::RenderTexture` to cache static elements

**Profiling**:
```cpp
auto start = std::chrono::high_resolution_clock::now();
render();
auto end = std::chrono::high_resolution_clock::now();
auto duration = std::chrono::duration_cast<std::chrono::milliseconds>(end - start);
fmt::print("Render time: {}ms\n", duration.count());
```

### Docker Container Performance

**Limits**:
- Each container uses ~50-200MB RAM depending on image
- Container startup takes 1-5 seconds depending on image size
- macOS Docker Desktop has overhead vs. native Linux

**Optimizations**:
- Use Alpine-based images (smaller, faster startup)
- Reuse stopped containers instead of removing and recreating
- Limit concurrent container operations
- Pre-pull images: `docker pull postgres:latest`

**Estimated Capacity**:
- Development machine: 10-20 services
- High-end workstation: 50-100 services
- Beyond 100 services, consider container pooling or mocking

### Thread Communication Performance

**SafeQueue Overhead**:
- Mutex lock/unlock per operation: ~50-100ns
- Negligible for typical game rates (10-60 jobs/second)

**Optimizations**:
- Batch multiple jobs into one push
- Use lock-free queues for extreme performance (boost::lockfree::queue)
- Avoid queue operations in hot loops

## Deployment Notes

### Building for Release

```bash
# Configure for release
cmake --preset release

# Build with optimizations
cmake --build --preset release

# Executable location
./build/bin/better-architecture
```

### Distribution

**macOS**:
1. Build release binary
2. Copy SFML frameworks to app bundle (or use static linking)
3. Sign application: `codesign -s "Developer ID" better-architecture`
4. Create DMG: `hdiutil create -volname BetterArchitecture -srcfolder build/bin -format UDZO BetterArchitecture.dmg`

**Linux**:
1. Build release binary
2. Bundle SFML shared libraries with AppImage
3. Use LinuxDeploy: `linuxdeploy --executable=better-architecture --appdir=AppDir --output=appimage`

**Windows**:
1. Build release binary with MSVC
2. Copy SFML DLLs to executable directory
3. Create installer with NSIS or WiX

### System Requirements

**Minimum**:
- OS: macOS 10.15+, Ubuntu 20.04+, Windows 10
- CPU: Dual-core 2.0 GHz
- RAM: 4GB
- GPU: Integrated graphics with OpenGL 3.3
- Disk: 500MB
- Docker: Docker Desktop or equivalent

**Recommended**:
- OS: macOS 13+, Ubuntu 22.04+, Windows 11
- CPU: Quad-core 3.0 GHz
- RAM: 8GB
- GPU: Dedicated GPU with OpenGL 4.5
- Disk: 2GB (for Docker images)
- Docker: Docker Desktop 4.0+

### Docker Setup for End Users

Users must have Docker installed and running:

**macOS**:
```bash
brew install --cask docker
# Or download Docker Desktop from docker.com
```

**Linux**:
```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
sudo usermod -aG docker $USER
```

**Windows**:
```
Download Docker Desktop from docker.com
Enable WSL2 backend
```

**Socket Path Configuration**:
- Update `docker_client.hpp` `SOCKET_PATH` if using non-standard Docker installation
- Default: `/var/run/docker.sock` (Docker Desktop)
- Rancher Desktop: `~/.rd/docker.sock`
- Podman: `XDG_RUNTIME_DIR/podman/podman.sock`

## Project Status and Roadmap

**Current Status**: Restructured from Spring Boot + React to C++ + SFML architecture (Dec 29, 2025)

**Completed**:
- Two-thread architecture (render + simulation worker)
- SFML rendering with grid, sidebar, and packet visualization
- Docker integration for real container management
- Service placement and wiring system
- Dynamic port management

**In Progress** (see `TODO.txt`):
- Request path calculation between services
- Network latency simulation
- Response handling from containers

**Future Roadmap**:
- Budget and reputation mechanics (ported from old architecture)
- Health and repair system (ported from old architecture)
- Traffic types (STATIC, READ, WRITE, MALICIOUS)
- Random events (DDoS, Cost Spike, Capacity Drop)
- Game modes (Sandbox vs. Survival)
- Save/load game state
- Performance metrics dashboard

## Additional Resources

**External Documentation**:
- [SFML Documentation](https://www.sfml-dev.org/documentation/)
- [Docker API Reference](https://docs.docker.com/engine/api/)
- [CMake Documentation](https://cmake.org/documentation/)
- [vcpkg Documentation](https://vcpkg.io/en/docs/)

**Learning Resources**:
- [SFML Game Development Book](https://www.packtpub.com/product/sfml-game-development/9781849696845)
- [C++ Concurrency in Action](https://www.manning.com/books/c-plus-plus-concurrency-in-action-second-edition)
- [Docker for Developers](https://www.docker.com/resources/what-container/)
