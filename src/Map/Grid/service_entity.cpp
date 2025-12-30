#include "service_entity.h"
#include <fmt/core.h>

ServiceEntity::ServiceEntity(ServiceType serviceType, const std::string& id, sf::Vector2f position)
    : type(serviceType), instanceId(id)
{
    // Setup visual representation
    visualRepresentation.setSize(sf::Vector2f(56.f, 56.f)); // Slightly smaller than cell
    visualRepresentation.setPosition(position + sf::Vector2f(4.f, 4.f)); // Center in cell
    visualRepresentation.setOutlineThickness(2.f);
    visualRepresentation.setOutlineColor(sf::Color::White);
    
    // Set color based on service type
    switch (type) {
        case ServiceType::POSTGRES:
            visualRepresentation.setFillColor(sf::Color(51, 103, 145));
            break;
        case ServiceType::REDIS:
            visualRepresentation.setFillColor(sf::Color(211, 59, 42));
            break;
        case ServiceType::NGINX:
            visualRepresentation.setFillColor(sf::Color(0, 150, 57));
            break;
        case ServiceType::LOAD_BALANCER:
            visualRepresentation.setFillColor(sf::Color(255, 165, 0));
            break;
        case ServiceType::API_GATEWAY:
            visualRepresentation.setFillColor(sf::Color(138, 43, 226));
            break;
        default:
            visualRepresentation.setFillColor(sf::Color(128, 128, 128));
            break;
    }
}

std::string ServiceEntity::getTypeName() const {
    switch (type) {
        case ServiceType::POSTGRES: return "Postgres";
        case ServiceType::REDIS: return "Redis";
        case ServiceType::NGINX: return "Nginx";
        case ServiceType::LOAD_BALANCER: return "Load Balancer";
        case ServiceType::API_GATEWAY: return "API Gateway";
        default: return "Unknown";
    }
}

void ServiceEntity::draw(sf::RenderWindow& window) {
    window.draw(visualRepresentation);
}
