#pragma once
#include <SFML/Graphics.hpp>
#include <vector>
#include <functional>
#include "service_types.h"

struct ServiceIcon {
    ServiceType type;
    sf::RectangleShape button;
    sf::Color iconColor;
    std::string name;
    
    ServiceIcon(ServiceType t, const std::string& n, sf::Color color)
        : type(t), iconColor(color), name(n) {}
};

class Sidebar {
private:
    sf::RectangleShape background;
    std::vector<ServiceIcon> serviceIcons;
    sf::Font font;
    bool fontLoaded;
    
    float sidebarWidth;
    float iconSize;
    float iconPadding;
    float startY;
    
    ServiceType selectedService;
    bool isDragging;
    
    // Game state display
    bool isInWiringMode;
    std::string wiringModeText;
    
    // Callback when user clicks a service icon
    std::function<void(ServiceType)> onServiceSelected;
    
    void setupIcons(const sf::RenderWindow& window);
    
public:
    Sidebar();
    
    void init(const sf::RenderWindow& window);
    void handleClick(sf::Vector2i mousePos);
    void draw(sf::RenderWindow& window);
    
    // Check if mouse is over sidebar area
    bool containsPoint(sf::Vector2i point) const;
    
    // Getters
    ServiceType getSelectedService() const { return selectedService; }
    bool isServiceSelected() const { return selectedService != ServiceType::NONE; }
    
    // Setter for callback
    void setServiceSelectedCallback(std::function<void(ServiceType)> callback) {
        onServiceSelected = callback;
    }
    
    // Reset selection
    void clearSelection() { 
        selectedService = ServiceType::NONE; 
        isDragging = false;
    }
    
    // Update wiring mode display
    void setWiringMode(bool isWiring, const std::string& modeText) {
        isInWiringMode = isWiring;
        wiringModeText = modeText;
    }
};
