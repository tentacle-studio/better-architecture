#include "sparse_map.h"
#include <SFML/Graphics.hpp>
#include <fmt/core.h>
#include <fmt/color.h>
#include <queue>
#include <cmath>
#include <algorithm>

GridIndex GameGrid::getIndexFromWorldPosition(float worldX, float worldY) {
    return {
        static_cast<int>(worldX / cellSize),
        static_cast<int>(worldY / cellSize)
    };
}

sf::Vector2f GameGrid::getWorldPositionFromIndex(GridIndex idx) {
    return sf::Vector2f(
        static_cast<float>(idx.x * cellSize),
        static_cast<float>(idx.y * cellSize)
    );
}

bool GameGrid::isValidPlacement(GridIndex idx) {
    if (gridData.find(idx) == gridData.end()) return true;
    return gridData[idx].type == TileType::EMPTY;
}

void GameGrid::placeService(GridIndex idx, std::shared_ptr<ServiceEntity> service) {
    Tile t;
    t.type = TileType::SERVICE;
    t.serviceEntity = service;
    gridData[idx] = t;
    
    // Auto-connect to adjacent wires
    GridIndex neighbors[] = {
        {idx.x, idx.y - 1}, // North
        {idx.x + 1, idx.y}, // East
        {idx.x, idx.y + 1}, // South
        {idx.x - 1, idx.y}  // West
    };
    
    for (const auto& neighbor : neighbors) {
        if (gridData.find(neighbor) != gridData.end() && 
            gridData[neighbor].type == TileType::WIRE) {
            updateWireBitmask(neighbor);
        }
    }
    
    // Log the service placement
    fmt::print(fg(fmt::color::cyan), 
               "Service placed at grid position ({}, {})\n", 
               idx.x, idx.y);
}

void GameGrid::connectWires(GridIndex from, GridIndex to) {
    // Smart handling: if clicking on a service, adjust to start from adjacent cell
    GridIndex actualFrom = from;
    GridIndex actualTo = to;
    
    // If starting on a service, find the first adjacent empty cell toward target
    if (gridData.find(from) != gridData.end() && 
        gridData[from].type == TileType::SERVICE) {
        // Find direction toward target
        int dx = (to.x > from.x) ? 1 : ((to.x < from.x) ? -1 : 0);
        int dy = (to.y > from.y) ? 1 : ((to.y < from.y) ? -1 : 0);
        
        // Try to start adjacent to the service
        if (dx != 0) {
            actualFrom.x += dx;
        } else if (dy != 0) {
            actualFrom.y += dy;
        }
    }
    
    // If ending on a service, adjust to end at adjacent cell
    if (gridData.find(to) != gridData.end() && 
        gridData[to].type == TileType::SERVICE) {
        // Find direction from target back toward start
        int dx = (from.x > to.x) ? 1 : ((from.x < to.x) ? -1 : 0);
        int dy = (from.y > to.y) ? 1 : ((from.y < to.y) ? -1 : 0);
        
        // Try to end adjacent to the service
        if (dx != 0) {
            actualTo.x += dx;
        } else if (dy != 0) {
            actualTo.y += dy;
        }
    }
    
    // Calculate direction and create straight line
    int dx = (actualTo.x > actualFrom.x) ? 1 : ((actualTo.x < actualFrom.x) ? -1 : 0);
    int dy = (actualTo.y > actualFrom.y) ? 1 : ((actualTo.y < actualFrom.y) ? -1 : 0);
    
    GridIndex current = actualFrom;
    
    // Place wires along the path
    while (current.x != actualTo.x || current.y != actualTo.y) {
        placeWire(current);
        
        // Move towards target (prefer primary axis)
        if (current.x != actualTo.x) {
            current.x += dx;
        } else if (current.y != actualTo.y) {
            current.y += dy;
        }
    }
    
    // Place final wire
    placeWire(actualTo);
    
    fmt::print(fg(fmt::color::yellow), 
               "Connected wires from ({}, {}) to ({}, {})\n", 
               from.x, from.y, to.x, to.y);
}

void GameGrid::placeWire(GridIndex idx) {
    // Don't overwrite services
    if (gridData.find(idx) != gridData.end() && 
        gridData[idx].type == TileType::SERVICE) {
        return;
    }
    
    // Create or update wire tile
    Tile& tile = gridData[idx];
    tile.type = TileType::WIRE;
    tile.wireConnections = 0; // Will be calculated by updateWireBitmask
    
    // Update this tile's connections
    updateWireBitmask(idx);
    
    // Update all neighboring tiles' connections
    GridIndex neighbors[] = {
        {idx.x, idx.y - 1}, // North
        {idx.x + 1, idx.y}, // East
        {idx.x, idx.y + 1}, // South
        {idx.x - 1, idx.y}  // West
    };
    
    for (const auto& neighbor : neighbors) {
        if (isConnectable(neighbor)) {
            updateWireBitmask(neighbor);
        }
    }
}

void GameGrid::updateWireBitmask(GridIndex idx) {
    // Check if this tile exists and is a wire
    if (gridData.find(idx) == gridData.end() || 
        gridData[idx].type != TileType::WIRE) {
        return;
    }
    
    Tile& tile = gridData[idx];
    tile.wireConnections = 0;
    
    // Check all four neighbors
    struct NeighborCheck {
        GridIndex pos;
        Direction dir;
    };
    
    NeighborCheck neighbors[] = {
        {{idx.x, idx.y - 1}, NORTH},
        {{idx.x + 1, idx.y}, EAST},
        {{idx.x, idx.y + 1}, SOUTH},
        {{idx.x - 1, idx.y}, WEST}
    };
    
    for (const auto& [neighborPos, dir] : neighbors) {
        if (isConnectable(neighborPos)) {
            tile.wireConnections |= dir;
        }
    }
}

std::vector<GridIndex> GameGrid::findPath(GridIndex start, GridIndex end) {
    // BFS pathfinding through wires and services
    std::queue<GridIndex> frontier;
    std::map<GridIndex, GridIndex> cameFrom;
    
    frontier.push(start);
    cameFrom[start] = start;
    
    // BFS
    while (!frontier.empty()) {
        GridIndex current = frontier.front();
        frontier.pop();
        
        if (current.x == end.x && current.y == end.y) {
            // Found path - reconstruct it
            std::vector<GridIndex> path;
            GridIndex step = end;
            
            while (!(step.x == start.x && step.y == start.y)) {
                path.push_back(step);
                step = cameFrom[step];
            }
            path.push_back(start);
            
            std::reverse(path.begin(), path.end());
            
            fmt::print(fg(fmt::color::green), 
                      "BFS: Found path of length {}\n", path.size());
            return path;
        }
        
        // Check all neighbors
        GridIndex neighbors[] = {
            {current.x, current.y - 1}, // North
            {current.x + 1, current.y}, // East
            {current.x, current.y + 1}, // South
            {current.x - 1, current.y}  // West
        };
        
        for (const auto& next : neighbors) {
            // Can only path through wires or the destination service
            bool canTraverse = isConnectable(next) || 
                             (next.x == end.x && next.y == end.y);
            
            if (canTraverse && cameFrom.find(next) == cameFrom.end()) {
                frontier.push(next);
                cameFrom[next] = current;
            }
        }
    }
    
    // No path found
    fmt::print(fg(fmt::color::red), 
              "BFS: Network Unreachable - No path from ({}, {}) to ({}, {})\n",
              start.x, start.y, end.x, end.y);
    return {};
}

bool GameGrid::isConnectable(GridIndex idx) {
    if (gridData.find(idx) == gridData.end()) {
        return false;
    }
    
    const Tile& tile = gridData[idx];
    return tile.type == TileType::WIRE || tile.type == TileType::SERVICE;
}

std::vector<std::shared_ptr<ServiceEntity>> GameGrid::getAllServices() const {
    std::vector<std::shared_ptr<ServiceEntity>> services;
    
    for (const auto& [idx, tile] : gridData) {
        if (tile.type == TileType::SERVICE && tile.serviceEntity) {
            services.push_back(tile.serviceEntity);
        }
    }
    
    return services;
}

void GameGrid::draw(sf::RenderWindow& window) {
    // Draw grid lines (visual aid)
    sf::Vector2u windowSize = window.getSize();
    sf::Color gridColor(50, 50, 50, 100); // Semi-transparent gray
    
    // Vertical lines
    for (int x = 0; x < static_cast<int>(windowSize.x); x += cellSize) {
        sf::RectangleShape line(sf::Vector2f(1, windowSize.y));
        line.setPosition(sf::Vector2f(x, 0));
        line.setFillColor(gridColor);
        window.draw(line);
    }
    
    // Horizontal lines
    for (int y = 0; y < static_cast<int>(windowSize.y); y += cellSize) {
        sf::RectangleShape line(sf::Vector2f(windowSize.x, 1));
        line.setPosition(sf::Vector2f(0, y));
        line.setFillColor(gridColor);
        window.draw(line);
    }
    
    // Draw tiles (wires and services)
    for (const auto& [idx, tile] : gridData) {
        sf::Vector2f cellPos(idx.x * cellSize, idx.y * cellSize);
        
        // Draw wires with visual representation based on bitmask
        if (tile.type == TileType::WIRE) {
            uint8_t connections = tile.wireConnections;
            
            // Base wire cell
            sf::RectangleShape wireBg(sf::Vector2f(cellSize - 2, cellSize - 2));
            wireBg.setPosition(cellPos + sf::Vector2f(1, 1));
            wireBg.setFillColor(sf::Color(40, 40, 40));
            window.draw(wireBg);
            
            // Draw wire segments based on connections
            float wireThickness = 8.f;
            sf::Color wireColor(0, 200, 255); // Cyan wire
            
            float centerX = cellPos.x + cellSize / 2.f;
            float centerY = cellPos.y + cellSize / 2.f;
            
            // Draw center dot if no connections (isolated wire)
            if (connections == 0) {
                sf::CircleShape dot(6.f);
                dot.setPosition(sf::Vector2f(centerX - 6.f, centerY - 6.f));
                dot.setFillColor(wireColor);
                window.draw(dot);
            } else {
                // Draw connections to edges
                if (connections & NORTH) {
                    sf::RectangleShape segment(sf::Vector2f(wireThickness, cellSize / 2.f));
                    segment.setPosition(sf::Vector2f(centerX - wireThickness / 2.f, cellPos.y));
                    segment.setFillColor(wireColor);
                    window.draw(segment);
                }
                if (connections & EAST) {
                    sf::RectangleShape segment(sf::Vector2f(cellSize / 2.f, wireThickness));
                    segment.setPosition(sf::Vector2f(centerX, centerY - wireThickness / 2.f));
                    segment.setFillColor(wireColor);
                    window.draw(segment);
                }
                if (connections & SOUTH) {
                    sf::RectangleShape segment(sf::Vector2f(wireThickness, cellSize / 2.f));
                    segment.setPosition(sf::Vector2f(centerX - wireThickness / 2.f, centerY));
                    segment.setFillColor(wireColor);
                    window.draw(segment);
                }
                if (connections & WEST) {
                    sf::RectangleShape segment(sf::Vector2f(cellSize / 2.f, wireThickness));
                    segment.setPosition(sf::Vector2f(cellPos.x, centerY - wireThickness / 2.f));
                    segment.setFillColor(wireColor);
                    window.draw(segment);
                }
                
                // Draw center junction
                sf::CircleShape junction(wireThickness / 2.f);
                junction.setPosition(sf::Vector2f(centerX - wireThickness / 2.f, centerY - wireThickness / 2.f));
                junction.setFillColor(wireColor);
                window.draw(junction);
            }
        }
        
        // Draw services
        if (tile.type == TileType::SERVICE && tile.serviceEntity) {
            // Draw service cell background
            sf::RectangleShape cellBg(sf::Vector2f(cellSize - 2, cellSize - 2));
            cellBg.setPosition(sf::Vector2f(idx.x * cellSize + 1, idx.y * cellSize + 1));
            cellBg.setFillColor(sf::Color(100, 150, 255, 180)); // Blue tint
            window.draw(cellBg);
            
            // Draw the service entity itself
            tile.serviceEntity->draw(window);
            
            // Draw connection points where wires connect to this service
            float centerX = cellPos.x + cellSize / 2.f;
            float centerY = cellPos.y + cellSize / 2.f;
            float connSize = 12.f;
            
            // Check each direction for wire connections
            GridIndex neighbors[] = {
                {idx.x, idx.y - 1}, // North
                {idx.x + 1, idx.y}, // East
                {idx.x, idx.y + 1}, // South
                {idx.x - 1, idx.y}  // West
            };
            
            sf::Vector2f connOffsets[] = {
                {0.f, -cellSize/2.f + 4.f},  // North
                {cellSize/2.f - 4.f, 0.f},    // East
                {0.f, cellSize/2.f - 4.f},    // South
                {-cellSize/2.f + 4.f, 0.f}    // West
            };
            
            for (int i = 0; i < 4; ++i) {
                if (gridData.find(neighbors[i]) != gridData.end() && 
                    gridData[neighbors[i]].type == TileType::WIRE) {
                    // Draw connection indicator
                    sf::CircleShape conn(connSize / 2.f);
                    conn.setPosition(sf::Vector2f(
                        centerX + connOffsets[i].x - connSize/2.f,
                        centerY + connOffsets[i].y - connSize/2.f
                    ));
                    conn.setFillColor(sf::Color(0, 255, 0)); // Green for active connection
                    window.draw(conn);
                }
            }
        }
    }
};