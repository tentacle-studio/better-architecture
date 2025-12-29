#pragma once
#include <string>
#include <SFML/Graphics.hpp>
#include "Sidebar/service_types.h"

// Represents a logical service instance (e.g., Postgres, Redis, Nginx)
class ServiceEntity {
private:
    ServiceType type;
    std::string instanceId;
    sf::RectangleShape visualRepresentation;
    
public:
    ServiceEntity(ServiceType serviceType, const std::string& id, sf::Vector2f position);
    
    ServiceType getType() const { return type; }
    std::string getInstanceId() const { return instanceId; }
    std::string getId() const { return instanceId; }
    std::string getTypeName() const;
    sf::Vector2f getPosition() const { return visualRepresentation.getPosition(); }
    
    void draw(sf::RenderWindow& window);
};
