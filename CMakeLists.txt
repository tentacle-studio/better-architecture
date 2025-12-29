cmake_minimum_required(VERSION 3.21)

project(BetterArchitecture 
    VERSION 1.0.0
    DESCRIPTION "Tower Defense Game Teaching Cloud Architecture"
    LANGUAGES CXX
)

# Set C++ standard
set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

# Find packages installed via vcpkg
find_package(fmt CONFIG REQUIRED)
find_package(SFML COMPONENTS Graphics REQUIRED)
find_package(curl CONFIG REQUIRED)
find_package(nlohmann_json CONFIG REQUIRED)

# Create executable
add_executable(better-architecture 
    src/main.cpp
    src/Map/game_grid.cpp
    src/Map/service_entity.cpp
    src/engine/game_engine.cpp
    src/Sidebar/sidebar.cpp
)

# Link libraries
target_link_libraries(better-architecture PRIVATE 
    fmt::fmt
    SFML::Graphics
    CURL::libcurl
    nlohmann_json::nlohmann_json
)

# Include directories
target_include_directories(better-architecture PRIVATE
    ${CMAKE_CURRENT_SOURCE_DIR}/src
    ${CMAKE_CURRENT_SOURCE_DIR}/include
)

# Compiler warnings
if(MSVC)
    target_compile_options(better-architecture PRIVATE /W4)
else()
    target_compile_options(better-architecture PRIVATE -Wall -Wextra -Wpedantic)
endif()

# Set output directory
set_target_properties(better-architecture PROPERTIES
    RUNTIME_OUTPUT_DIRECTORY "${CMAKE_BINARY_DIR}/bin"
)
