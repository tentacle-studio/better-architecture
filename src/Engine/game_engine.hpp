#pragma once
#include <SFML/Graphics.hpp>
#include <thread>
#include <atomic>
#include <mutex>
#include <queue>
#include <functional>
#include <memory>
#include "Map/sparse_map.h" // Include the header, not the .cpp file
#include "Sidebar/sidebar.hpp"
#include "Sidebar/service_types.h"
#include "Docker/job.h"
#include "Docker/packet.hpp"

// Forward declaration
class SimulationManager;

// A simple thread-safe queue for communicating between loops
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

enum class GameState { EDITING, SIMULATING, IDLE, DRAGGING_GHOST, WIRING };

enum class WiringMode {
    CLICK_AND_DRAG,    // Straight line wire placement
    PATHFINDING_BFS    // Automatic pathfinding between services
};

class GameEngine {
private:
    // Window & Rendering
    sf::RenderWindow window;
    const float TIME_PER_FRAME = 1.f / 60.f; // 60 updates per second

    // Game Objects
    GameGrid grid;
    Sidebar sidebar;
    GameState currentState;
    ServiceType selectedServiceType;
    
    // Ghost sprite for visual feedback during placement
    sf::RectangleShape ghostSprite;
    GridIndex ghostGridPosition;
    
    // Wiring tool state
    WiringMode wiringMode;
    bool isWiringDrag;
    GridIndex wiringStartCell;
    GridIndex wiringEndCell;

    // Packet System
    std::vector<PacketEntity> activePackets;
    float packetSpawnTimer = 0.f;
    const float PACKET_SPAWN_INTERVAL = 2.0f; // Spawn every 2 seconds
    int packetIdCounter = 0;
    int playerScore = 0;
    int playerHealth = 100;

    // Async Simulation (The "Backend")
    std::atomic<bool> isRunning;
    std::thread simulationThread;
    SafeQueue<std::function<void()>> commandQueue; // Tasks for Main Thread
    
    // Communication with SimulationManager
    SafeQueue<SimJob> jobQueue;       // Main Thread -> Worker Thread
    SafeQueue<SimResult> resultQueue; // Worker Thread -> Main Thread
    std::unique_ptr<SimulationManager> simManager;    // Heap-allocated, managed by unique_ptr

    // Core Loop Functions
    void processInput();
    void update(float dt); // Logic (Movement, Collision)
    void render();

    // The Background Worker
    void simulationWorker();

    // Packet Helper Functions
    void spawnPacket(const std::string& sourceId, const std::string& targetId);
    PacketEntity* getPacketById(const std::string& packetId);
    void updatePackets(float dt);

public:
    GameEngine();
    ~GameEngine();
    void run(); // The Entry Point
};