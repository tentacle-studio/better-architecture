#include "sidebar.hpp"
#include <iostream>

Sidebar::Sidebar() 
    : sidebarWidth(200.f),
      iconSize(60.f),
      iconPadding(20.f),
      startY(80.f),
      selectedService(ServiceType::NONE),
      fontLoaded(false),
      isDragging(false),
      isInWiringMode(false),
      wiringModeText("")
{
    // Setup background
    background.setFillColor(sf::Color(40, 40, 45));
    background.setOutlineColor(sf::Color(60, 60, 65));
    background.setOutlineThickness(2.f);
}

void Sidebar::init(const sf::RenderWindow& window) {
    // Position and size the sidebar
    sf::Vector2u windowSize = window.getSize();
    background.setSize(sf::Vector2f(sidebarWidth, static_cast<float>(windowSize.y)));
    background.setPosition(sf::Vector2f(0.f, 0.f));
    
    // Try to load font (SFML might have issues, so we'll use a simple fallback)
    // In a real project, you'd bundle a font file
    fontLoaded = font.openFromFile("/System/Library/Fonts/Helvetica.ttc");
    if (!fontLoaded) {
        std::cerr << "Warning: Could not load font. Text will not display." << std::endl;
    }
    
    setupIcons(window);
}

void Sidebar::setupIcons(const sf::RenderWindow&) {
    serviceIcons.clear();
    
    // Define the service catalog
    std::vector<std::tuple<ServiceType, std::string, sf::Color>> services = {
        {ServiceType::POSTGRES, "Postgres", sf::Color(51, 103, 145)},   // Postgres blue
        {ServiceType::REDIS, "Redis", sf::Color(211, 59, 42)},          // Redis red
        {ServiceType::NGINX, "Nginx", sf::Color(0, 150, 57)},           // Nginx green
        {ServiceType::LOAD_BALANCER, "Load Balancer", sf::Color(255, 165, 0)}, // Orange
        {ServiceType::API_GATEWAY, "API Gateway", sf::Color(138, 43, 226)},     // Purple
        {ServiceType::SERVER, "Server", sf::Color(128, 128, 128)},       // Gray
    };
    
    float currentY = startY;
    
    for (const auto& [type, name, color] : services) {
        ServiceIcon icon(type, name, color);
        
        // Setup the button rectangle
        icon.button.setSize(sf::Vector2f(iconSize, iconSize));
        icon.button.setPosition(sf::Vector2f(
            (sidebarWidth - iconSize) / 2.f, 
            currentY
        ));
        icon.button.setFillColor(color);
        icon.button.setOutlineColor(sf::Color(200, 200, 200, 100));
        icon.button.setOutlineThickness(2.f);
        
        serviceIcons.push_back(icon);
        
        // Move to next icon position (with space for label)
        currentY += iconSize + iconPadding + 20.f;
    }
}

void Sidebar::handleClick(sf::Vector2i mousePos) {
    sf::Vector2f mousePosF(static_cast<float>(mousePos.x), static_cast<float>(mousePos.y));
    
    // Check each service icon
    for (const auto& icon : serviceIcons) {
        if (icon.button.getGlobalBounds().contains(mousePosF)) {
            selectedService = icon.type;
            isDragging = true;
            
            std::cout << "Selected service: " << icon.name << std::endl;
            
            // Trigger callback if set
            if (onServiceSelected) {
                onServiceSelected(icon.type);
            }
            
            return;
        }
    }
}

void Sidebar::draw(sf::RenderWindow& window) {
    // Draw sidebar background
    window.draw(background);
    
    // Draw wiring mode indicator box (always visible when in wiring mode)
    if (isInWiringMode) {
        sf::RectangleShape modeBox(sf::Vector2f(180.f, 30.f));
        modeBox.setPosition(sf::Vector2f(10.f, 48.f));
        modeBox.setFillColor(sf::Color(0, 100, 100, 180));
        modeBox.setOutlineColor(sf::Color(0, 255, 255));
        modeBox.setOutlineThickness(2.f);
        window.draw(modeBox);
    }
    
    // Draw Loadedtitle text (if font loaded)
    if (fontLoaded) {
        sf::Text title(font, "Service Shop");
        title.setCharacterSize(20);
        title.setFillColor(sf::Color::White);
        title.setStyle(sf::Text::Bold);
        
        sf::FloatRect titleBounds = title.getLocalBounds();
        title.setOrigin(sf::Vector2f(titleBounds.size.x / 2.f, 0.f));
        title.setPosition(sf::Vector2f(sidebarWidth / 2.f, 20.f));
        window.draw(title);        
        // Draw wiring mode indicator
        if (isInWiringMode) {
            sf::Text modeLabel(font, "Mode:");
            modeLabel.setCharacterSize(14);
            modeLabel.setFillColor(sf::Color(200, 200, 200));
            modeLabel.setPosition(sf::Vector2f(10.f, 50.f));
            window.draw(modeLabel);
            
            sf::Text modeText(font, wiringModeText);
            modeText.setCharacterSize(12);
            modeText.setFillColor(sf::Color(0, 255, 255));
            modeText.setStyle(sf::Text::Bold);
            modeText.setPosition(sf::Vector2f(10.f, 68.f));
            window.draw(modeText);
        }    }
    
    // Draw all service icons
    for (const auto& icon : serviceIcons) {
        // Highlight if selected
        sf::RectangleShape buttonToDraw = icon.button;
        if (selectedService == icon.type && isDragging) {
            buttonToDraw.setOutlineColor(sf::Color::Yellow);
            buttonToDraw.setOutlineThickness(4.f);
        }
        
        window.draw(buttonToDraw);
        
        // Draw icon text (first letter) if font loaded
        if (fontLoaded) {
            sf::Text iconText(font, std::string(1, icon.name[0]));
            iconText.setCharacterSize(30);
            iconText.setFillColor(sf::Color::White);
            iconText.setStyle(sf::Text::Bold);
            
            sf::FloatRect iconTextBounds = iconText.getLocalBounds();
            iconText.setOrigin(sf::Vector2f(iconTextBounds.size.x / 2.f, iconTextBounds.size.y / 2.f));
            sf::Vector2f iconCenter = icon.button.getPosition() + sf::Vector2f(iconSize / 2.f, iconSize / 2.f);
            iconText.setPosition(sf::Vector2f(iconCenter.x, iconCenter.y - 5.f));
            
            window.draw(iconText);
            
            // Draw label below icon
            sf::Text label(font, icon.name);
            label.setCharacterSize(14);
            label.setFillColor(sf::Color::White);
            
            sf::FloatRect labelBounds = label.getLocalBounds();
            label.setOrigin(sf::Vector2f(labelBounds.size.x / 2.f, 0.f));
            label.setPosition(sf::Vector2f(
                sidebarWidth / 2.f,
                icon.button.getPosition().y + iconSize + 5.f
            ));
            
            window.draw(label);
        }
    }
}

bool Sidebar::containsPoint(sf::Vector2i point) const {
    return point.x >= 0 && point.x <= static_cast<int>(sidebarWidth);
}