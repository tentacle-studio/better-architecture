#include "game_engine.hpp"
#include "Map/service_entity.h"
#include "Docker/simulation_manager.cpp"
#include <iostream>
#include <algorithm>
#include <cmath>
#include <SFML/Graphics.hpp>

GameEngine::GameEngine() 
    : window(sf::VideoMode({1280, 720}), "SysAdmin Defense"),
      currentState(GameState::EDITING),
      selectedServiceType(ServiceType::NONE),
      wiringMode(WiringMode::CLICK_AND_DRAG),
      isWiringDrag(false),
      isRunning(true),
      simManager(nullptr)
{
    window.setFramerateLimit(144); // Cap rendering to save GPU
    
    // Initialize ghost sprite for placement preview
    ghostSprite.setSize(sf::Vector2f(32.f, 32.f)); // Match your cell size
    ghostSprite.setOutlineThickness(2.f);
    ghostSprite.setOutlineColor(sf::Color::White);
    
    // Initialize sidebar
    sidebar.init(window);
    
    // Setup callback for when user selects a service
    sidebar.setServiceSelectedCallback([this](ServiceType type) {
        this->selectedServiceType = type;
        this->currentState = GameState::DRAGGING_GHOST;
        std::cout << "State changed to DRAGGING_GHOST with service type: " 
                  << static_cast<int>(type) << std::endl;
    });
    
    // Start the heavy simulation logic in a separate thread
    simulationThread = std::thread(&GameEngine::simulationWorker, this);
}

GameEngine::~GameEngine() {
    isRunning = false;
    
    // Stop the simulation manager gracefully
    if (simManager) {
        simManager->stop();
    }
    
    if (simulationThread.joinable()) {
        simulationThread.join();
    }
    
    // Clean up (simManager deleted by worker thread)
}

// THE MAIN LOOP (Presentation Layer)
void GameEngine::run() {
    sf::Clock clock;
    float timeSinceLastUpdate = 0.f;

    while (window.isOpen()) {
        sf::Time dt = clock.restart();
        timeSinceLastUpdate += dt.asSeconds();

        processInput();

        // Fixed Time Step: Catch up on logic updates
        while (timeSinceLastUpdate > TIME_PER_FRAME) {
            timeSinceLastUpdate -= TIME_PER_FRAME;
            processInput(); // Poll input again to prevent lag
            update(TIME_PER_FRAME);
        }

        render();
    }
}

// 1. INPUT
void GameEngine::processInput() {
    while (auto event = window.pollEvent()) {
        if (event->is<sf::Event::Closed>())
            window.close();
            
        // Handle Mouse Clicks for Grid Placement
        if (const auto* mouseClick = event->getIf<sf::Event::MouseButtonPressed>()) {
            if (mouseClick->button == sf::Mouse::Button::Left) {
                // Get mouse position
                sf::Vector2i mousePos = sf::Mouse::getPosition(window);
                
                // Check if click is on sidebar first
                if (sidebar.containsPoint(mousePos)) {
                    sidebar.handleClick(mousePos);
                } else {
                    // Click is on the grid area
                    GridIndex clickedCell = grid.getIndexFromWorldPosition(
                        static_cast<float>(mousePos.x), 
                        static_cast<float>(mousePos.y)
                    );
                    
                    // If we're dragging a service ghost, place it
                    if (currentState == GameState::DRAGGING_GHOST && 
                        selectedServiceType != ServiceType::NONE) {
                        
                        // 1. Check if placement is valid
                        if (grid.isValidPlacement(clickedCell)) {
                            // 2. Instantiate the logical object
                            std::string instanceId = "srv-" + std::to_string(clickedCell.x) + 
                                                    "-" + std::to_string(clickedCell.y);
                            sf::Vector2f worldPos = grid.getWorldPositionFromIndex(clickedCell);
                            auto serviceEntity = std::make_shared<ServiceEntity>(
                                selectedServiceType, 
                                instanceId, 
                                worldPos
                            );
                            
                            // 3. Trigger the Backend - Send command to Docker thread
                            ServiceType capturedType = selectedServiceType;
                            std::string capturedId = instanceId;
                            
                            // Send job to SimulationManager
                            SimJob job;
                            job.type = JobType::BUILD_CONTAINER;
                            job.entityId = capturedId;
                            
                            // Pass service type as metadata for dynamic container selection
                            switch (capturedType) {
                                case ServiceType::POSTGRES: job.metaData = "POSTGRES"; break;
                                case ServiceType::REDIS: job.metaData = "REDIS"; break;
                                case ServiceType::NGINX: job.metaData = "NGINX"; break;
                                case ServiceType::LOAD_BALANCER: job.metaData = "LOAD_BALANCER"; break;
                                case ServiceType::API_GATEWAY: job.metaData = "API_GATEWAY"; break;
                                default: job.metaData = "NGINX"; break;
                            }
                            
                            job.gridPos = clickedCell;
                            jobQueue.push(job);
                            
                            std::cout << "[Backend] Queued container build for " 
                                     << static_cast<int>(capturedType) 
                                     << " with ID: " << capturedId << std::endl;
                            
                            // 4. Update Grid - Save object into gridData
                            grid.placeService(clickedCell, serviceEntity);
                            
                            std::cout << "Service placed at grid position (" 
                                     << clickedCell.x << ", " << clickedCell.y << ")" << std::endl;
                        } else {
                            std::cout << "Invalid placement location!" << std::endl;
                        }
                        
                        // 5. Reset State to EDITING (equivalent to IDLE in this context)
                        currentState = GameState::EDITING;
                        selectedServiceType = ServiceType::NONE;
                        sidebar.clearSelection();
                    } else if (currentState == GameState::WIRING) {
                        // Wiring mode - handle based on sub-mode
                        if (wiringMode == WiringMode::CLICK_AND_DRAG) {
                            // Start or end wire drag
                            if (!isWiringDrag) {
                                // Start dragging
                                wiringStartCell = clickedCell;
                                isWiringDrag = true;
                                std::cout << "Wire drag started at (" 
                                         << clickedCell.x << ", " << clickedCell.y << ")" << std::endl;
                            } else {
                                // End dragging - draw wires
                                wiringEndCell = clickedCell;
                                grid.connectWires(wiringStartCell, wiringEndCell);
                                isWiringDrag = false;
                                std::cout << "Wire drag ended at (" 
                                         << clickedCell.x << ", " << clickedCell.y << ")" << std::endl;
                            }
                        } else if (wiringMode == WiringMode::PATHFINDING_BFS) {
                            // BFS pathfinding mode
                            if (!isWiringDrag) {
                                // Select start point
                                wiringStartCell = clickedCell;
                                isWiringDrag = true;
                                std::cout << "BFS start point: (" 
                                         << clickedCell.x << ", " << clickedCell.y << ")" << std::endl;
                            } else {
                                // Select end point and find path
                                wiringEndCell = clickedCell;
                                auto path = grid.findPath(wiringStartCell, wiringEndCell);
                                
                                if (!path.empty()) {
                                    // Place wires along the found path
                                    for (size_t i = 0; i < path.size() - 1; ++i) {
                                        grid.connectWires(path[i], path[i + 1]);
                                    }
                                }
                                
                                isWiringDrag = false;
                            }
                        }
                    } else {
                        // Wire connection logic
                        grid.connectWires(clickedCell, clickedCell);
                    }
                }
            }
        }
        
        // Handle right-click to cancel dragging
        if (const auto* mouseClick = event->getIf<sf::Event::MouseButtonPressed>()) {
            if (mouseClick->button == sf::Mouse::Button::Right) {
                if (currentState == GameState::DRAGGING_GHOST) {
                    std::cout << "Cancelled service placement" << std::endl;
                    currentState = GameState::EDITING;
                    selectedServiceType = ServiceType::NONE;
                    sidebar.clearSelection();
                }
            }
        }
        
        // Handle keyboard shortcuts
        if (const auto* keyPress = event->getIf<sf::Event::KeyPressed>()) {
            // W key - Toggle wiring mode
            if (keyPress->code == sf::Keyboard::Key::W) {
                if (currentState == GameState::WIRING) {
                    currentState = GameState::EDITING;
                    isWiringDrag = false;
                    sidebar.setWiringMode(false, "");
                    std::cout << "Exited wiring mode" << std::endl;
                } else {
                    currentState = GameState::WIRING;
                    std::string modeText = wiringMode == WiringMode::CLICK_AND_DRAG ? 
                                          "WIRING\nClick & Drag" : "WIRING\nBFS Pathfinding";
                    sidebar.setWiringMode(true, modeText);
                    std::cout << "Entered wiring mode (Click & Drag)" << std::endl;
                }
            }
            
            // M key - Toggle wiring sub-mode (when in wiring mode)
            if (keyPress->code == sf::Keyboard::Key::M && currentState == GameState::WIRING) {
                if (wiringMode == WiringMode::CLICK_AND_DRAG) {
                    wiringMode = WiringMode::PATHFINDING_BFS;
                    sidebar.setWiringMode(true, "WIRING\nBFS Pathfinding");
                    std::cout << "Switched to BFS Pathfinding mode" << std::endl;
                } else {
                    wiringMode = WiringMode::CLICK_AND_DRAG;
                    sidebar.setWiringMode(true, "WIRING\nClick & Drag");
                    std::cout << "Switched to Click & Drag mode" << std::endl;
                }
                isWiringDrag = false; // Reset drag state when switching modes
            }
            
            // ESC key - Cancel current operation
            if (keyPress->code == sf::Keyboard::Key::Escape) {
                currentState = GameState::EDITING;
                selectedServiceType = ServiceType::NONE;
                isWiringDrag = false;
                sidebar.clearSelection();
                sidebar.setWiringMode(false, "");
                std::cout << "Operation cancelled" << std::endl;
            }
        }
    }
}

// 2. LOGIC UPDATE (Deterministic)
void GameEngine::update(float dt) {
    // A. Process results from SimulationManager
    SimResult result;
    while (resultQueue.pop(result)) {
        std::cout << "[Result] Entity " << result.entityId 
                  << (result.success ? " ready" : " failed") 
                  << " (" << result.durationMs << "ms)" << std::endl;
        
        if (!result.errorMsg.empty()) {
            std::cout << "  Error: " << result.errorMsg << std::endl;
        }
    }
    
    // B. Execute tasks sent from the Backend (e.g., "Request Finished")
    std::function<void()> task;
    while (commandQueue.pop(task)) {
        task(); // Run this safely on the Main Thread
    }

    // C. Update ghost sprite position when dragging
    if (currentState == GameState::DRAGGING_GHOST) {
        sf::Vector2i mousePos = sf::Mouse::getPosition(window);
        sf::Vector2f worldPos = window.mapPixelToCoords(mousePos);
        
        // Get grid index from mouse position
        ghostGridPosition = grid.getIndexFromWorldPosition(worldPos.x, worldPos.y);
        
        // Snap ghost to grid position
        sf::Vector2f cellWorldPos = grid.getWorldPositionFromIndex(ghostGridPosition);
        ghostSprite.setPosition(cellWorldPos);
        
        // Visual validation: Check if placement is valid
        // For now, we'll use a simple check - assume valid if not too close to edges
        bool isValidPlacement = (ghostGridPosition.x >= 0 && ghostGridPosition.x < 50 &&
                                ghostGridPosition.y >= 0 && ghostGridPosition.y < 50);
        
        if (isValidPlacement) {
            ghostSprite.setFillColor(sf::Color(100, 255, 100, 128)); // Transparent green
        } else {
            ghostSprite.setFillColor(sf::Color(255, 100, 100, 128)); // Transparent red
        }
    }
    
    // D. Update Packet System
    updatePackets(dt);
    
    // E. Spawn packets periodically (for testing)
    packetSpawnTimer += dt;
    if (packetSpawnTimer >= PACKET_SPAWN_INTERVAL) {
        packetSpawnTimer = 0.f;
        
        // Find a random service to target
        auto services = grid.getAllServices();
        if (!services.empty()) {
            // Spawn packet targeting the first service (for now)
            std::string targetId = services[0]->getId();
            spawnPacket("spawner", targetId);
        }
    }
    
    // F. Handle Results from Backend
    SimResult res;
    while (resultQueue.pop(res)) {
        // Find the packet by ID
        auto* packet = getPacketById(res.entityId);
        if (!packet) continue; // Packet might be deleted already

        if (res.success) {
            // SUCCESS (200 OK)
            packet->state = PacketState::COMPLETED;
            packet->shape.setFillColor(sf::Color::Green);
            
            playerScore += 10;
            
            // Mark for deletion after a brief delay
            // For now, delete immediately
        } else {
            // FAILURE (500 Error / Timeout)
            packet->state = PacketState::FAILED;
            packet->shape.setFillColor(sf::Color::Red);
            
            playerHealth -= 1; // "Leaked" request damages player
        }
    }
    
    // G. Remove completed/failed packets
    activePackets.erase(
        std::remove_if(activePackets.begin(), activePackets.end(),
            [](const PacketEntity& p) {
                return p.state == PacketState::COMPLETED || 
                       p.state == PacketState::FAILED;
            }),
        activePackets.end()
    );
}

// 3. RENDER (Interpolated)
void GameEngine::render() {
    window.clear(sf::Color(30, 30, 30)); // Dark background
    
    grid.draw(window); // Draw the tiles/wires
    
    // Draw all active packets
    for (const auto& packet : activePackets) {
        window.draw(packet.shape);
    }
    
    // Draw ghost sprite when dragging
    if (currentState == GameState::DRAGGING_GHOST) {
        window.draw(ghostSprite);
    }
    
    // Draw wiring preview when in wiring mode
    if (currentState == GameState::WIRING && isWiringDrag) {
        sf::Vector2f startPos = grid.getWorldPositionFromIndex(wiringStartCell);
        sf::Vector2i mousePos = sf::Mouse::getPosition(window);
        
        // Draw line from start to current mouse position
        sf::Vertex line[2];
        line[0].position = startPos + sf::Vector2f(32.f, 32.f);
        line[0].color = sf::Color(0, 255, 255, 180);
        line[1].position = sf::Vector2f(static_cast<float>(mousePos.x), 
                                       static_cast<float>(mousePos.y));
        line[1].color = sf::Color(0, 255, 255, 180);
        window.draw(line, 2, sf::PrimitiveType::Lines);
        
        // Highlight start cell
        sf::RectangleShape highlight(sf::Vector2f(64.f, 64.f));
        highlight.setPosition(startPos);
        highlight.setFillColor(sf::Color(0, 255, 255, 50));
        highlight.setOutlineColor(sf::Color(0, 255, 255));
        highlight.setOutlineThickness(2.f);
        window.draw(highlight);
    }
    
    // Mode indicator text would go here (needs font loaded)
    // For now, we rely on console output
    
    sidebar.draw(window); // Draw the sidebar on top
    
    window.display();
}

// 4. THE BACKEND WORKER (Simulation Layer)
void GameEngine::simulationWorker() {
    // Create SimulationManager on heap - lifetime extends beyond function scope
    simManager = std::make_unique<SimulationManager>(jobQueue, resultQueue);
    
    std::cout << "[SimulationWorker] Started with DockerClient integration" << std::endl;
    
    // Run the simulation manager's event loop
    // This will process jobs from jobQueue and push results to resultQueue
    simManager->run();
    
    std::cout << "[SimulationWorker] Stopped" << std::endl;
    // simManager will be automatically cleaned up by unique_ptr
}

// 5. PACKET HELPER FUNCTIONS
void GameEngine::spawnPacket(const std::string& sourceId, const std::string& targetId) {
    // Generate unique packet ID
    std::string packetId = "pkt-" + std::to_string(packetIdCounter++);
    
    // Create new packet
    PacketEntity packet(packetId, targetId);
    
    // Set initial position at top-left or near first wire
    // For now, spawn at a fixed position - you can improve this to spawn near source service
    packet.shape.setPosition(sf::Vector2f(100.f, 100.f));
    
    // Set velocity to move towards target
    packet.velocity = sf::Vector2f(50.f, 50.f); // pixels per second
    
    activePackets.push_back(packet);
    
    std::cout << "[PacketSystem] Spawned packet " << packetId 
              << " targeting " << targetId << std::endl;
}

PacketEntity* GameEngine::getPacketById(const std::string& packetId) {
    for (auto& packet : activePackets) {
        if (packet.id == packetId) {
            return &packet;
        }
    }
    return nullptr;
}

void GameEngine::updatePackets(float dt) {
    for (auto& packet : activePackets) {
        if (packet.state != PacketState::MOVING) continue;

        // 1. Move packet along velocity
        sf::Vector2f movement = packet.velocity * dt;
        packet.shape.move(movement);
        
        sf::Vector2f packetPos = packet.shape.getPosition();

        // 2. Check if packet reached target service
        auto services = grid.getAllServices();
        for (const auto& service : services) {
            if (service->getId() == packet.targetTowerId) {
                sf::Vector2f servicePos = service->getPosition();
                
                // Simple distance check (you can improve collision detection)
                float dx = packetPos.x - servicePos.x;
                float dy = packetPos.y - servicePos.y;
                float distance = std::sqrt(dx * dx + dy * dy);
                
                if (distance < 40.f) { // Collision threshold
                    // A. Visual Feedback: Freeze the packet
                    packet.state = PacketState::PROCESSING;
                    packet.shape.setFillColor(sf::Color::Yellow); // Yellow = Processing

                    // B. Create the Job
                    SimJob job;
                    job.type = JobType::PROCESS_REQUEST;
                    job.entityId = packet.id;
                    job.targetId = packet.targetTowerId;
                    
                    // C. Send to Simulation Thread
                    jobQueue.push(job);
                    
                    std::cout << "[PacketSystem] Packet " << packet.id 
                              << " reached target, processing request..." << std::endl;
                    
                    break;
                }
            }
        }
    }
}