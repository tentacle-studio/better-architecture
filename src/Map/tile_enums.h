#pragma once
#include <tuple>

enum class TileType {
    EMPTY,
    SERVICE,
    WIRE
};

// Directions as bit flags
enum Direction {
    NONE  = 0,
    NORTH = 1 << 0, // 1
    EAST  = 1 << 1, // 2
    SOUTH = 1 << 2, // 4
    WEST  = 1 << 3  // 8
};

// Example: A corner pipe connecting North and East
// Value = NORTH | EAST = 1 | 2 = 3

struct GridIndex
{
    int x,y;

    bool operator<(const GridIndex& other) const {
        return std::tie(x,y) < std::tie(other.x, other.y);
    }
};
