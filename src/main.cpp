#include <fmt/core.h>
#include <fmt/color.h>
#include "Engine/game_engine.hpp"
#include "Docker/docker_client.hpp"

int main() {
    fmt::print(fg(fmt::color::green) | fmt::emphasis::bold, 
               "Better Architecture - Tower Defense Game\n");
    
    // Create and run the game engine
    GameEngine engine;
    engine.run();
    // fmt::print("Docker Socket Permission Test\n");
    // fmt::print("==============================\n\n");

    // DockerClient client;
    
    // try {
    //     fmt::print("Creating nginx container...\n");
    //     std::string containerId = client.createContainer("nginx:latest", 1);
    //     fmt::print("Container created: {}\n\n", containerId)    ;
        
    //     fmt::print("Starting container...\n");
    //     client.startContainer(containerId);
    //     fmt::print("Container started successfully!\n\n");
        
    //     fmt::print("✓ Docker socket permissions verified\n");
    //     fmt::print("\nTo clean up, run: docker rm -f {}\n", containerId.substr(0, 12));
        
    // } catch (const std::exception& e) {
    //     fmt::print("Error: {}\n", e.what());
    //     return 1;
    // }
    
    return 0;
}
