package ocean.studio.BetterArchitecture.Enemy;

import ocean.studio.BetterArchitecture.GameEngine.GameEvent;
import ocean.studio.BetterArchitecture.GameEngine.GameState;
import ocean.studio.BetterArchitecture.Tower.InfrastructureService;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.Random;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class EventManagerService {
    private final Random random = new Random();
    
    // Track last event time per game (gameId -> lastEventTime)
    private final Map<String, Double> lastEventTimes = new ConcurrentHashMap<>();
    private final Map<String, Double> nextEventDelays = new ConcurrentHashMap<>();

    /**
     * Triggers random events based on elapsed game time
     */
    public void triggerRandomEvents(GameState game) {
        if (game == null || game.isGameOver()) {
            return;
        }
        
        String gameId = game.getGameId();
        double currentTime = game.getElapsedTime();
        
        // Initialize tracking for new games
        lastEventTimes.putIfAbsent(gameId, 0.0);
        nextEventDelays.putIfAbsent(gameId, 20.0);
        
        double lastEventTime = lastEventTimes.get(gameId);
        double nextEventDelay = nextEventDelays.get(gameId);
        
        // Check if it's time for next event (15-45 second intervals)
        if (currentTime - lastEventTime < nextEventDelay) {
            return;
        }
        
        // Process expired events (reverse their effects)
        game.getActiveEvents().removeIf(event -> {
            if (currentTime >= event.getEndTime()) {
                applyEventEffect(game, event, false); // Reverse effect
                System.out.println("✅ Event ended: " + event.getEventType());
                return true;
            }
            return false;
        });
        
        // Trigger new event
        GameEvent event = createRandomEvent(currentTime);
        if (event != null) {
            game.getActiveEvents().add(event);
            applyEventEffect(game, event, true);
            
            System.out.println("🎲 Event triggered: " + event.getEventType() + " - " + event.getDescription());
            
            // Schedule next event (15-45 seconds)
            lastEventTimes.put(gameId, currentTime);
            nextEventDelays.put(gameId, 15 + (random.nextDouble() * 30));
        }
    }

    /**
     * Creates a random event with appropriate timing
     */
    private GameEvent createRandomEvent(double currentTime) {
        String[] eventTypes = {
            "COST_SPIKE", 
            "CAPACITY_DROP", 
            "TRAFFIC_BURST", 
            "SERVICE_OUTAGE",
            "DDOS_ATTACK",
            "TRAFFIC_SHIFT"
        };
        
        String type = eventTypes[random.nextInt(eventTypes.length)];
        double duration = 10 + (random.nextDouble() * 20); // 10-30 seconds
        
        String description = switch (type) {
            case "COST_SPIKE" -> "☁️ Cloud Provider Rate Increase! +50% upkeep costs";
            case "CAPACITY_DROP" -> "⚡ Power Fluctuation! All services lose 30% health";
            case "TRAFFIC_BURST" -> "📈 Viral Post! Traffic doubled temporarily";
            case "SERVICE_OUTAGE" -> "💥 Hardware Failure! Random service down";
            case "DDOS_ATTACK" -> "🔥 DDoS Attack! 50% malicious traffic wave";
            case "TRAFFIC_SHIFT" -> "🔄 Usage Pattern Changed! Traffic mix shifted";
            default -> "Unknown Event";
        };
        
        return new GameEvent(type, description, currentTime, duration);
    }

    /**
     * Applies or removes event effects on game state
     */
    private void applyEventEffect(GameState game, GameEvent event, boolean start) {
        String eventType = event.getEventType();
        
        switch (eventType) {
            case "COST_SPIKE":
                // Cost increase is handled in upkeep calculation via isCostSpikeActive()
                break;
                
            case "CAPACITY_DROP":
                if (start) {
                    for (InfrastructureService service : game.getServices().values()) {
                        service.degradeHealth(30);
                    }
                } else {
                    // Restore 30 health when event ends
                    for (InfrastructureService service : game.getServices().values()) {
                        service.setHealth(Math.min(100, service.getHealth() + 30));
                    }
                }
                break;
                
            case "TRAFFIC_BURST":
                if (start) {
                    game.setRpsMultiplier(game.getRpsMultiplier() * 2.0);
                } else {
                    game.setRpsMultiplier(game.getRpsMultiplier() / 2.0);
                }
                break;
                
            case "SERVICE_OUTAGE":
                // Temporarily reduce one service's health to 0
                if (start && !game.getServices().isEmpty()) {
                    InfrastructureService randomService = game.getServices().values().stream()
                        .skip(random.nextInt(game.getServices().size()))
                        .findFirst()
                        .orElse(null);
                    if (randomService != null) {
                        randomService.setHealth(0);
                        System.out.println("💥 Service outage: " + randomService.getId());
                    }
                }
                // No reversal needed - player must repair manually
                break;
                
            case "DDOS_ATTACK":
                if (start) {
                    // Spike malicious traffic
                    game.getTrafficMix().put("MALICIOUS", 50.0);
                    // Reduce other traffic proportionally
                    game.getTrafficMix().put("STATIC", 10.0);
                    game.getTrafficMix().put("READ", 12.5);
                    game.getTrafficMix().put("WRITE", 7.5);
                    game.getTrafficMix().put("UPLOAD", 7.5);
                    game.getTrafficMix().put("SEARCH", 12.5);
                } else {
                    // Reset to default balanced mix
                    resetTrafficMix(game);
                }
                break;
                
            case "TRAFFIC_SHIFT":
                if (start) {
                    shiftTrafficPattern(game);
                } else {
                    // Reset to default when event ends
                    resetTrafficMix(game);
                }
                break;
        }
    }

    /**
     * Randomly adjusts traffic mix percentages
     */
    private void shiftTrafficPattern(GameState game) {
        game.getTrafficMix().put("STATIC", 15.0 + random.nextDouble() * 20);
        game.getTrafficMix().put("READ", 20.0 + random.nextDouble() * 20);
        game.getTrafficMix().put("WRITE", 10.0 + random.nextDouble() * 15);
        game.getTrafficMix().put("UPLOAD", 5.0 + random.nextDouble() * 15);
        game.getTrafficMix().put("SEARCH", 10.0 + random.nextDouble() * 15);
        game.getTrafficMix().put("MALICIOUS", 3.0 + random.nextDouble() * 7);
    }

    /**
     * Resets traffic mix to default balanced state
     */
    private void resetTrafficMix(GameState game) {
        game.getTrafficMix().put("STATIC", 20.0);
        game.getTrafficMix().put("READ", 25.0);
        game.getTrafficMix().put("WRITE", 15.0);
        game.getTrafficMix().put("UPLOAD", 15.0);
        game.getTrafficMix().put("SEARCH", 20.0);
        game.getTrafficMix().put("MALICIOUS", 5.0);
    }

    /**
     * Updates RPS multiplier based on elapsed time milestones (Survival mode only)
     */
    public void updateRPSMilestones(GameState game) {
        // Check mode using String comparison (getMode() returns String, not enum)
        if (!"SURVIVAL".equalsIgnoreCase(game.getMode())) {
            return;
        }

        double elapsed = game.getElapsedTime();
        double newMultiplier = 1.0;
        
        // Progressive difficulty curve
        if (elapsed >= 600) newMultiplier = 4.0;       // 10 min
        else if (elapsed >= 480) newMultiplier = 3.5;  // 8 min
        else if (elapsed >= 360) newMultiplier = 3.0;  // 6 min
        else if (elapsed >= 300) newMultiplier = 2.5;  // 5 min
        else if (elapsed >= 240) newMultiplier = 2.2;  // 4 min
        else if (elapsed >= 180) newMultiplier = 2.0;  // 3 min
        else if (elapsed >= 120) newMultiplier = 1.7;  // 2 min
        else if (elapsed >= 60) newMultiplier = 1.3;   // 1 min
        
        if (newMultiplier != game.getRpsMultiplier()) {
            game.setRpsMultiplier(newMultiplier);
            System.out.println("📈 RPS Multiplier increased to " + newMultiplier + "x at " + 
                             String.format("%.1f", elapsed) + "s");
        }
    }

    /**
     * Checks if a COST_SPIKE event is currently active
     */
    public boolean isCostSpikeActive(GameState game) {
        if (game == null || game.getActiveEvents() == null) {
            return false;
        }
        
        return game.getActiveEvents().stream()
            .anyMatch(event -> "COST_SPIKE".equals(event.getEventType()) && 
                             game.getElapsedTime() < event.getEndTime());
    }
    
    /**
     * Cleanup tracking when game ends
     */
    public void cleanupGame(String gameId) {
        lastEventTimes.remove(gameId);
        nextEventDelays.remove(gameId);
    }
}