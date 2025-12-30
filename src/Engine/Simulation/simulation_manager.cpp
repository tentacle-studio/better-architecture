#include "Docker/docker_client.hpp"
#include "request_executor.hpp"
#include "Engine/Render/game_engine.hpp"
#include "Docker/port_manager.hpp"
#include <atomic>
#include <iostream>

class SimulationManager {
    DockerClient docker;
    RequestExecutor requestPool;
    SafeQueue<SimJob>& inputQueue;
    SafeQueue<SimResult>& outputQueue;
    PortManager portManager;
    
    // Map internal GameEntityID to Docker ContainerID
    std::map<std::string, std::string> containerMap;
    
    std::atomic<bool> shouldStop{false};
    
    // Helper: Map service type to Docker image name
    std::string getDockerImageForService(const std::string& serviceTypeStr) {
        // Parse the service type from metadata
        if (serviceTypeStr == "POSTGRES") return "postgres:latest";
        if (serviceTypeStr == "REDIS") return "redis:latest";
        if (serviceTypeStr == "NGINX") return "nginx:latest";
        if (serviceTypeStr == "LOAD_BALANCER") return "nginx:alpine"; // Lightweight nginx
        if (serviceTypeStr == "API_GATEWAY") return "kong:latest";
        if (serviceTypeStr == "SERVER") return "tomcat:9.0-jre11-openjdk-slim"; // Example app server
    }

    // Helper to determine internal port
    int getInternalPortForImage(std::string imageName) {
        if (imageName.find("postgres") != std::string::npos) return 5432;
        if (imageName.find("redis") != std::string::npos) return 6379;
        if (imageName.find("nginx") != std::string::npos) return 80;
        if (imageName.find("tomcat") != std::string::npos) return 8080;
        return 80; // Default
    }

    // Helper to send error results back to game loop
    void sendResult(std::string entityId, bool success, double durationMs, std::string errorMsg = "") {
        SimResult result;
        result.entityId = entityId;
        result.success = success;
        result.durationMs = durationMs;
        result.errorMsg = errorMsg;
        outputQueue.push(result);
    }

public:
    SimulationManager(SafeQueue<SimJob>& in, SafeQueue<SimResult>& out) 
        : inputQueue(in), outputQueue(out) {}
    
    ~SimulationManager() {
        cleanup();
    }

    std::map<std::string, int> portMapping;
    
    void stop() {
        shouldStop = true;
    }

    void run() {
        while (!shouldStop) {
            SimJob job;
            if (inputQueue.pop(job)) {
                processJob(job);
            }
            
            // Periodic Tasks:
            // 1. Poll Docker Stats every 1 second
            // 2. Update Network Physics (tc rules)
            
            std::this_thread::sleep_for(std::chrono::milliseconds(10));
        }
        
        // Clean up all containers when the simulation loop exits
        cleanup();
    }
    
    void cleanup() {
        std::cout << "[SimulationManager] Cleaning up " << containerMap.size() << " containers..." << std::endl;
        
        for (const auto& [entityId, containerId] : containerMap) {
            std::cout << "  Stopping container " << containerId << " (entity: " << entityId << ")" << std::endl;
            docker.stopContainer(containerId);
            docker.removeContainer(containerId);
        }
        
        containerMap.clear();
        std::cout << "[SimulationManager] Cleanup complete" << std::endl;
    }

    void processJob(SimJob& job) {
        switch (job.type) {
            case JobType::BUILD_CONTAINER: {
                try {
                    // 1. Get a Port
                    int hostPort = portManager.acquirePort();
                    
                    // 2. Map service type to actual Docker image name
                    std::string imageName = getDockerImageForService(job.metaData);
                    
                    // 3. Identify Internal Port based on the actual image
                    int internalPort = getInternalPortForImage(imageName);
                    
                    // 4. Prepare mounts for SERVER type (Tomcat)
                    std::vector<std::pair<std::string, std::string>> mounts;
                    if (job.metaData == "SERVER") {
                        // Docker requires absolute paths for bind mounts
                        std::string warPath = "/Users/jimmynguyen/Desktop/better-architecture/src/bin/assets/java/ROOT.war";
                        mounts.push_back({warPath, "/usr/local/tomcat/webapps/ROOT.war"});
                    }
                    
                    // 5. Create Container with Mapping and Mounts
                    std::string containerId = docker.createContainer(imageName, internalPort, hostPort, mounts);
                    
                    if (containerId.empty()) {
                        // Handle failure (rollback port)
                        portManager.releasePort(hostPort);
                        outputQueue.push({job.entityId, false, 0, "Docker Create Failed"});
                        return;
                    }

                    docker.startContainer(containerId);

                    // 4. Save Logic State
                    // We map the Game Entity ID to the assigned HOST PORT
                    // This is crucial for performCurlRequest later
                    portMapping[job.entityId] = hostPort;
                    containerMap[job.entityId] = containerId;
                    
                    // For Tomcat, give it time to deploy the WAR file
                    if (job.metaData == "SERVER") {
                        std::cout << "[Docker] Waiting for Tomcat to deploy WAR..." << std::endl;
                        std::this_thread::sleep_for(std::chrono::seconds(3));
                    }

                    outputQueue.push({job.entityId, true, 0, "Running on Port " + std::to_string(hostPort)});
                    
                } catch (const std::exception& e) {
                    outputQueue.push({job.entityId, false, 0, e.what()});
                }

                break;
            }

            case JobType::PROCESS_REQUEST: {
                // 1. Resolve Target (use targetId to look up the service's port)
                if (portMapping.find(job.targetId) == portMapping.end()) {
                    // Error: Service doesn't have a container yet!
                    sendResult(job.entityId, false, 0, "Target service not found"); 
                    return;
                }

                int port = portMapping[job.targetId];
                // Use root path for Tomcat - works with default servlet and deployed WAR
                std::string url = "http://localhost:" + std::to_string(port) + "/";

                // 2. Execute in Thread Pool
                // Capture 'this' and 'job' by value
                requestPool.executeRequest(url, [this, job](RequestResult res) {
                    
                    // 3. This runs when curl finishes
                    SimResult result;
                    result.entityId = job.entityId; // The Packet ID
                    result.success = (res.statusCode >= 200 && res.statusCode < 300);
                    result.durationMs = res.latencyMs;
                    
                    // Push back to Main Game Loop
                    this->outputQueue.push(result);
                });

                break;
            }
            
            case JobType::DESTROY_CONTAINER: {
                // Cleanup Logic
                if (portMapping.count(job.entityId)) {
                    int port = portMapping[job.entityId];
                    std::string cid = containerMap[job.entityId];
                    
                    docker.stopAndRemove(cid); // You need to implement this in DockerClient
                    portManager.releasePort(port);
                    
                    portMapping.erase(job.entityId);
                    containerMap.erase(job.entityId);
                }
                break;
            }
        }
    }
};