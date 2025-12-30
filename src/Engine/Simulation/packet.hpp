// Packet.hpp
#pragma once
#include <SFML/Graphics.hpp>
#include <string>

enum class PacketState {
    MOVING,
    PROCESSING, // Waiting for HTTP response
    COMPLETED,  // 200 OK
    FAILED      // 500 / Timeout
};

struct RequestPayload {
    std::string method;   // "GET", "POST"
    std::string endpoint; // "/api/v1/users"
    std::string body;
};

class PacketEntity {
public:
    std::string id;
    PacketState state;
    
    // Visuals
    sf::CircleShape shape;
    sf::Vector2f velocity;
    
    // Logic
    RequestPayload payload;
    std::string targetTowerId; // The ID of the tower it is aiming for

    PacketEntity(std::string _id, std::string _targetId) 
        : id(_id), targetTowerId(_targetId), state(PacketState::MOVING) 
    {
        shape.setRadius(5.f);
        shape.setFillColor(sf::Color::Cyan);
    }
};