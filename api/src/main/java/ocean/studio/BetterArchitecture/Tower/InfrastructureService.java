package ocean.studio.BetterArchitecture.Tower;

import java.util.*;

public class InfrastructureService {
    private String id;
    private ServiceType type;
    private Map<String, Object> position;
    private double health;
    private int capacity;
    private int currentLoad;
    private double upkeep;
    private int placementCost;
    private List<String> connections; // Service IDs this service connects to

    public InfrastructureService() {
        this.health = 100.0;
        this.connections = new ArrayList<>();
        this.currentLoad = 0;
    }

    // Getters and Setters
    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public ServiceType getType() {
        return type;
    }

    public void setType(ServiceType type) {
        this.type = type;
    }

    public Map<String, Object> getPosition() {
        return position;
    }

    public void setPosition(Map<String, Object> position) {
        this.position = position;
    }

    public double getHealth() {
        return health;
    }

    public void setHealth(double health) {
        this.health = Math.max(0.0, Math.min(100.0, health));
    }

    public int getCapacity() {
        return capacity;
    }

    public void setCapacity(int capacity) {
        this.capacity = capacity;
    }

    public int getCurrentLoad() {
        return currentLoad;
    }

    public void setCurrentLoad(int currentLoad) {
        this.currentLoad = currentLoad;
    }

    public double getUpkeep() {
        return upkeep;
    }

    public void setUpkeep(double upkeep) {
        this.upkeep = upkeep;
    }

    public int getPlacementCost() {
        return placementCost;
    }

    public void setPlacementCost(int placementCost) {
        this.placementCost = placementCost;
    }

    public List<String> getConnections() {
        if (connections == null) {
            connections = new ArrayList<>();
        }
        return connections;
    }

    public void setConnections(List<String> connections) {
        this.connections = connections;
    }

    /**
     * Get effective capacity based on current health
     * Damaged services have reduced capacity
     */
    public int getEffectiveCapacity() {
        return (int) (capacity * (health / 100.0));
    }

    /**
     * Check if service can handle additional load
     * Used by GameEngineService.routeRequest()
     */
    public boolean canHandle() {
        return health > 0 && currentLoad < getEffectiveCapacity();
    }

    /**
     * Increment load counter (called when processing request)
     * Used by GameEngineService.routeToS3() and routeToDatabase()
     */
    public void incrementLoad() {
        if (currentLoad < getEffectiveCapacity()) {
            currentLoad++;
        }
    }

    /**
     * Reset load counter (called each game tick by GameLoopScheduler)
     */
    public void resetLoad() {
        this.currentLoad = 0;
    }

    /**
     * Degrade health based on load stress
     * Used by GameEngineService.processUpkeep()
     */
    public void degradeHealth(double amount) {
        this.health = Math.max(0.0, this.health - amount);
    }

    /**
     * Add connection to another service
     */
    public void addConnection(String targetServiceId) {
        if (connections == null) {
            connections = new ArrayList<>();
        }
        if (!connections.contains(targetServiceId)) {
            connections.add(targetServiceId);
        }
    }

    /**
     * Remove connection to another service
     */
    public void removeConnection(String targetServiceId) {
        if (connections != null) {
            connections.remove(targetServiceId);
        }
    }

    /**
     * Check if this service is connected to target
     */
    public boolean isConnectedTo(String targetServiceId) {
        return connections != null && connections.contains(targetServiceId);
    }

    @Override
    public String toString() {
        return String.format("%s[id=%s, health=%.1f%%, load=%d/%d, connections=%d]",
                type, id, health, currentLoad, getEffectiveCapacity(), 
                connections != null ? connections.size() : 0);
    }
}