#include <fmt/core.h>
#include <fmt/color.h>
#include "Engine/Render/game_engine.hpp"
#include "Docker/docker_client.hpp"

int main() {
    fmt::print(fg(fmt::color::green) | fmt::emphasis::bold, 
               "Better Architecture - Tower Defense Game\n");
    
    // Create and run the game engine
    // GameEngine engine;
    // engine.run();
    
    return 0;
}
