#pragma once
#include <map>
#include <memory>
#include <SFML/Graphics.hpp>
#include "tile_enums.h"
#include "service_entity.h"

struct Tile {
    TileType type = TileType::EMPTY;
    std::shared_ptr<ServiceEntity> serviceEntity = nullptr;

    // If type == WIRE, this stores the connections
    uint8_t wireConnections = 0;
};

class GameGrid {
    int cellSize = 64;
    std::map<GridIndex, Tile> gridData;
    
public:
    GridIndex getIndexFromWorldPosition(float worldX, float worldY);
    sf::Vector2f getWorldPositionFromIndex(GridIndex idx);
    bool isValidPlacement(GridIndex idx);
    void placeService(GridIndex idx, std::shared_ptr<ServiceEntity> service);
    void connectWires(GridIndex from, GridIndex to);
    void placeWire(GridIndex idx);
    void updateWireBitmask(GridIndex idx);
    std::vector<GridIndex> findPath(GridIndex start, GridIndex end);
    bool isConnectable(GridIndex idx);
    std::vector<std::shared_ptr<ServiceEntity>> getAllServices() const;
    void draw(sf::RenderWindow& window);
};