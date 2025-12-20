package ocean.studio.BetterArchitecture.GameEngine;

import com.fasterxml.jackson.annotation.JsonProperty;
import ocean.studio.BetterArchitecture.Finance.GameEconomy;
import ocean.studio.BetterArchitecture.Finance.EconomyStats;
import ocean.studio.BetterArchitecture.Tower.InfrastructureService;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class GameState {
    
    private String gameId;
    private String mode;  // Changed from GameMode enum to String
    private boolean paused;
    private boolean gameOver;
    private boolean autoRepair;
    private long startTime;
    private double reputation;
    private int budget;
    private double rpsMultiplier;
    private double elapsedTime;
    
    @JsonProperty("services")
    private Map<String, InfrastructureService> services;
    
    private List<Map<String, String>> connections;
    private List<GameEvent> activeEvents;
    private Map<String, Double> trafficMix;
    
    private GameEconomy economy;
    private EconomyStats stats;
    private GameEvent currentEvent;
    private Long eventEndTime;
    private boolean autoRepairEnabled;
    
    // Rate tracking (reset every minute)
    private double revenueInLastMinute = 0.0;
    private double expensesInLastMinute = 0.0;
    private long lastRateUpdateTick = 0;

    public GameState(String gameId, String mode, int startingBudget) {
        this.gameId = gameId;
        this.mode = mode;
        this.budget = startingBudget;
        this.reputation = 100;
        this.rpsMultiplier = 1.0;
        this.elapsedTime = 0.0;
        this.paused = false;
        this.gameOver = false;
        this.autoRepair = false;
        this.startTime = System.currentTimeMillis();
        
        // Initialize collections
        this.services = new HashMap<>();
        this.connections = new ArrayList<>();
        this.activeEvents = new ArrayList<>();
        
        // Initialize economy
        this.economy = new GameEconomy();
        this.stats = new EconomyStats();
        
        // Initialize traffic mix (default balanced)
        this.trafficMix = new HashMap<>();
        this.trafficMix.put("STATIC", 20.0);
        this.trafficMix.put("READ", 25.0);
        this.trafficMix.put("WRITE", 15.0);
        this.trafficMix.put("UPLOAD", 15.0);
        this.trafficMix.put("SEARCH", 20.0);
        this.trafficMix.put("MALICIOUS", 5.0);
    }

    // Getters and Setters
    public String getGameId() { 
        return gameId; 
    }
    
    public void setGameId(String gameId) { 
        this.gameId = gameId; 
    }

    public String getMode() {
        return this.mode;
    }
    
    public void setMode(String mode) { 
        this.mode = mode; 
    }

    public boolean isPaused() { 
        return paused; 
    }
    
    public void setPaused(boolean paused) { 
        this.paused = paused; 
    }

    public boolean isGameOver() { 
        return gameOver; 
    }
    
    public void setGameOver(boolean gameOver) { 
        this.gameOver = gameOver; 
    }

    public boolean isAutoRepair() { 
        return autoRepair; 
    }
    
    public void setAutoRepair(boolean autoRepair) { 
        this.autoRepair = autoRepair; 
    }

    public long getStartTime() { 
        return startTime; 
    }
    
    public void setStartTime(long startTime) { 
        this.startTime = startTime; 
    }

    public double getReputation() { 
        return reputation; 
    }
    
    public void setReputation(double reputation) { 
        this.reputation = reputation; 
    }

    public int getBudget() { 
        return budget; 
    }
    
    public void setBudget(int budget) { 
        this.budget = budget; 
    }

    public double getRpsMultiplier() { 
        return rpsMultiplier; 
    }
    
    public void setRpsMultiplier(double rpsMultiplier) { 
        this.rpsMultiplier = rpsMultiplier; 
    }

    public double getElapsedTime() { 
        return elapsedTime; 
    }
    
    public void setElapsedTime(double elapsedTime) { 
        this.elapsedTime = elapsedTime; 
    }
    
    public void incrementElapsedTime(double delta) {
        this.elapsedTime += delta;
    }

    @JsonProperty("services")
    public Map<String, InfrastructureService> getServices() { 
        if (services == null) {
            services = new HashMap<>();
        }
        return services; 
    }
    
    @JsonProperty("services")
    public void setServices(Map<String, InfrastructureService> services) { 
        this.services = services; 
    }

    public List<Map<String, String>> getConnections() {
        if (connections == null) {
            connections = new ArrayList<>();
        }
        return connections;
    }
    
    public void setConnections(List<Map<String, String>> connections) {
        this.connections = connections;
    }

    public List<GameEvent> getActiveEvents() {
        if (activeEvents == null) {
            activeEvents = new ArrayList<>();
        }
        return activeEvents;
    }
    
    public void setActiveEvents(List<GameEvent> activeEvents) {
        this.activeEvents = activeEvents;
    }

    public Map<String, Double> getTrafficMix() {
        if (trafficMix == null) {
            trafficMix = new HashMap<>();
        }
        return trafficMix;
    }
    
    public void setTrafficMix(Map<String, Double> trafficMix) {
        this.trafficMix = trafficMix;
    }

    public GameEconomy getEconomy() { 
        if (economy == null) {
            economy = new GameEconomy();
        }
        return economy; 
    }
    
    public void setEconomy(GameEconomy economy) { 
        this.economy = economy; 
    }
    
    public double getRevenueInLastMinute() {
        return revenueInLastMinute;
    }
    
    public void setRevenueInLastMinute(double revenueInLastMinute) {
        this.revenueInLastMinute = revenueInLastMinute;
    }
    
    public void addToRevenueInLastMinute(double amount) {
        this.revenueInLastMinute += amount;
    }
    
    public double getExpensesInLastMinute() {
        return expensesInLastMinute;
    }
    
    public void setExpensesInLastMinute(double expensesInLastMinute) {
        this.expensesInLastMinute = expensesInLastMinute;
    }
    
    public void addToExpensesInLastMinute(double amount) {
        this.expensesInLastMinute += amount;
    }
    
    public long getLastRateUpdateTick() {
        return lastRateUpdateTick;
    }
    
    public EconomyStats getStats() {
        if (stats == null) {
            stats = new EconomyStats();
        }
        return stats;
    }
    
    public void setStats(EconomyStats stats) {
        this.stats = stats;
    }
    
    public void setLastRateUpdateTick(long lastRateUpdateTick) {
        this.lastRateUpdateTick = lastRateUpdateTick;
    }

    public GameEvent getCurrentEvent() { 
        return currentEvent; 
    }
    
    public void setCurrentEvent(GameEvent currentEvent) { 
        this.currentEvent = currentEvent; 
    }

    public Long getEventEndTime() { 
        return eventEndTime; 
    }
    
    public void setEventEndTime(Long eventEndTime) { 
        this.eventEndTime = eventEndTime; 
    }

    public boolean isAutoRepairEnabled() { 
        return autoRepairEnabled; 
    }
    
    public void setAutoRepairEnabled(boolean autoRepairEnabled) { 
        this.autoRepairEnabled = autoRepairEnabled; 
    }
}