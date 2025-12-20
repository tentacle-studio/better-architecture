package ocean.studio.BetterArchitecture.GameEngine;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import ocean.studio.BetterArchitecture.Enemy.EventManagerService;
import ocean.studio.BetterArchitecture.Enemy.TrafficRequest;
import ocean.studio.BetterArchitecture.Enemy.TrafficType;
import ocean.studio.BetterArchitecture.Tower.InfrastructureService;
import ocean.studio.BetterArchitecture.Tower.ServiceType;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class GameEngineService {
    
    private final ConcurrentHashMap<String, GameState> games = new ConcurrentHashMap<>();
    
    @Autowired(required = false)
    private SimpMessagingTemplate wsTemplate;
    
    @Autowired
    private EventManagerService eventManagerService;
    
    private final Random random = new Random();

    /**
     * Create a new game
     */
    public GameState createGame(String mode, int startingBudget) {
        String gameId = UUID.randomUUID().toString();
        GameState game = new GameState(gameId, mode, startingBudget);
        
        games.put(gameId, game);
        System.out.println("✅ Game created: " + gameId + " | Mode: " + mode + " | Budget: $" + startingBudget);
        
        return game;
    }

    /**
     * Get game by ID
     */
    public GameState getGame(String gameId) {
        GameState game = games.get(gameId);
        if (game == null) {
            throw new IllegalArgumentException("Game not found: " + gameId);
        }
        return game;
    }
    
    /**
     * Get all active games (for game loop)
     */
    public ConcurrentHashMap<String, GameState> getAllGames() {
        return games;
    }

    /**
     * Place a service on the game board
     */
    public void placeService(String gameId, ServiceType type, Map<String, Object> position) {
        GameState game = games.get(gameId);
        if (game == null) {
            throw new IllegalArgumentException("Game not found");
        }
        
        int cost = getServiceCost(type);
        if (game.getBudget() < cost) {
            throw new IllegalArgumentException("Insufficient budget. Need: $" + cost);
        }
        
        // Create service with UUID
        String serviceId = "srv-" + UUID.randomUUID().toString().substring(0, 8);
        InfrastructureService service = new InfrastructureService();
        service.setId(serviceId);
        service.setType(type);
        service.setPosition(position);
        service.setHealth(100.0);
        service.setCapacity(getServiceCapacity(type));
        service.setCurrentLoad(0);
        service.setUpkeep(getServiceUpkeep(type));
        service.setConnections(new ArrayList<>());
        
        // Deduct cost
        game.setBudget(game.getBudget() - cost);
        
        // Add to services map
        game.getServices().put(serviceId, service);
        
        System.out.println("🏗️ Placed " + type + " (ID: " + serviceId + ") for $" + cost);
        
        broadcastGameState(gameId, game);
    }

    /**
     * Remove a service and refund 50%
     */
    public void removeService(String gameId, String serviceId) {
        GameState game = games.get(gameId);
        if (game == null) {
            throw new IllegalArgumentException("Game not found");
        }
        
        InfrastructureService service = game.getServices().get(serviceId);
        if (service == null) {
            throw new IllegalArgumentException("Service not found");
        }
        
        // Refund 50%
        int refund = getServiceCost(service.getType()) / 2;
        game.setBudget(game.getBudget() + refund);
        
        // Remove from map
        game.getServices().remove(serviceId);
        
        // Remove all connections to/from this service
        for (InfrastructureService other : game.getServices().values()) {
            other.getConnections().removeIf(connId -> connId.equals(serviceId));
        }
        
        System.out.println("🗑️ Removed service " + serviceId + " with $" + refund + " refund");
        
        broadcastGameState(gameId, game);
    }

    /**
     * Connect two services
     */
    public void connectServices(String gameId, String fromId, String toId) {
        GameState game = games.get(gameId);
        if (game == null) {
            throw new IllegalArgumentException("Game not found");
        }
        
        InfrastructureService from = game.getServices().get(fromId);
        InfrastructureService to = game.getServices().get(toId);
        
        if (from == null || to == null) {
            throw new IllegalArgumentException("Service not found");
        }
        
        // Add connection if not already exists
        if (!from.getConnections().contains(toId)) {
            from.getConnections().add(toId);
            System.out.println("🔗 Connected " + from.getType() + " → " + to.getType());
        }
        
        broadcastGameState(gameId, game);
    }

    /**
     * Repair a service to 100% health
     */
    public void repairService(String gameId, String serviceId) {
        GameState game = games.get(gameId);
        if (game == null) {
            throw new IllegalArgumentException("Game not found");
        }
        
        InfrastructureService service = game.getServices().get(serviceId);
        if (service == null) {
            throw new IllegalArgumentException("Service not found");
        }
        
        // Repair cost is 15% of service cost
        int repairCost = (int)(getServiceCost(service.getType()) * 0.15);
        if (game.getBudget() < repairCost) {
            throw new IllegalStateException("Not enough budget for repair. Need: $" + repairCost);
        }
        
        service.setHealth(100.0);
        game.setBudget(game.getBudget() - repairCost);
        
        System.out.println("🔧 Repaired " + service.getType() + " for $" + repairCost);
        
        broadcastGameState(gameId, game);
    }

    /**
     * Generate traffic requests based on RPS and traffic mix
     */
    public List<TrafficRequest> generateTraffic(GameState game) {
        List<TrafficRequest> requests = new ArrayList<>();
        
        // Base RPS scaled by multiplier (default 10 RPS * multiplier)
        double targetRps = 10.0 * game.getRpsMultiplier();
        
        // Generate requests for this tick (100ms = 0.1s)
        // Use Math.round to avoid truncation to 0
        double requestsPerTick = targetRps * 0.1;
        int requestCount = Math.max(1, (int) Math.round(requestsPerTick));
        
        // Add randomness (±30%)
        requestCount = Math.max(1, (int)(requestCount * (0.7 + random.nextDouble() * 0.6)));
        
        System.out.println("🚦 Generating " + requestCount + " requests (RPS: " + targetRps + ", multiplier: " + game.getRpsMultiplier() + ")");
        
        Map<String, Double> trafficMix = game.getTrafficMix();
        
        for (int i = 0; i < requestCount; i++) {
            TrafficType type = selectTrafficType(trafficMix);
            TrafficRequest request = new TrafficRequest(type);
            
            // Calculate path through services
            List<String> path = calculateRequestPath(game, type);
            request.setPath(path);
            
            requests.add(request);
            
            // Broadcast to frontend via WebSocket
            if (wsTemplate != null && !path.isEmpty()) {
                wsTemplate.convertAndSend("/topic/game/" + game.getGameId() + "/traffic", request);
            }
        }
        
        return requests;
    }

    /**
     * Process incoming traffic requests
     */
    public void processRequests(GameState game, List<TrafficRequest> requests) {
        System.out.println("🔄 processRequests called - Requests: " + (requests == null ? "null" : requests.size()) + 
            ", Services: " + (game.getServices() == null ? "null" : game.getServices().size()));
        
        if (requests == null || requests.isEmpty()) {
            System.out.println("⚠️ No requests to process");
            return;
        }
        
        Map<String, InfrastructureService> services = game.getServices();
        if (services == null || services.isEmpty()) {
            System.out.println("⚠️ No services available - all requests will fail");
            // No services - all requests fail
            for (TrafficRequest req : requests) {
                handleFailedRequest(game, req);
            }
            return;
        }
        
        int successCount = 0;
        int failCount = 0;
        
        for (TrafficRequest request : requests) {
            boolean processed = routeRequest(game, request);
            
            if (processed) {
                successCount++;
                // Success - add revenue
                double reward = request.getType().getReward();
                int rewardInt = (int) Math.round(reward);
                int oldBudget = game.getBudget();
                
                // Update both economy tracking and spendable budget
                game.getEconomy().addRevenue(reward);
                game.setBudget(game.getBudget() + rewardInt);
                game.addToRevenueInLastMinute(reward);
                
                System.out.println("💰 Revenue: $" + String.format("%.2f", reward) + " → Budget: $" + oldBudget + " + $" + rewardInt + " = $" + game.getBudget());
                
                // Track in stats
                if (game.getStats() != null) {
                    game.getStats().addIncome(reward, request.getType().name());
                    game.getStats().incrementRequestsProcessed();
                }
            } else {
                failCount++;
                handleFailedRequest(game, request);
            }
        }
        
        // Log summary - always log to see what's happening
        System.out.println("📊 Tick Summary - Processed: " + (successCount + failCount) + " requests | Success: " + successCount + ", Failed: " + failCount + 
            " | Total Revenue: $" + String.format("%.2f", game.getEconomy().getTotalRevenue()) + 
            " | Budget: $" + game.getBudget() +
            " | Services: " + services.size());
    }

    /**
     * Calculate path for a traffic request through services
     */
    private List<String> calculateRequestPath(GameState game, TrafficType type) {
        List<String> path = new ArrayList<>();
        Map<String, InfrastructureService> services = game.getServices();
        
        if (services.isEmpty()) {
            return path;
        }
        
        // Find entry point (WAF or first service)
        InfrastructureService entry = findServiceByType(game, ServiceType.WAF);
        if (entry == null) {
            entry = services.values().iterator().next();
        }
        
        if (entry == null) {
            return path;
        }
        
        path.add(entry.getId());
        
        // For malicious traffic, stop at WAF
        if (type == TrafficType.MALICIOUS) {
            return path;
        }
        
        // Route through ALB if exists
        InfrastructureService alb = findServiceByType(game, ServiceType.ALB);
        if (alb != null && !alb.getId().equals(entry.getId())) {
            path.add(alb.getId());
        }
        
        // Route to appropriate destination based on traffic type
        InfrastructureService destination = null;
        
        switch (type) {
            case STATIC:
            case UPLOAD:
                destination = findServiceByType(game, ServiceType.S3);
                break;
            case READ:
            case WRITE:
            case SEARCH:
                // Try cache first for reads
                if (type == TrafficType.READ) {
                    destination = findServiceByType(game, ServiceType.CACHE);
                }
                // Fallback to database or compute
                if (destination == null) {
                    destination = findServiceByType(game, ServiceType.DATABASE);
                }
                if (destination == null) {
                    destination = findServiceByType(game, ServiceType.COMPUTE);
                }
                break;
        }
        
        if (destination != null && !path.contains(destination.getId())) {
            path.add(destination.getId());
        }
        
        return path;
    }
    
    /**
     * Route a request through the infrastructure
     */
    private boolean routeRequest(GameState game, TrafficRequest request) {
        TrafficType type = request.getType();
        
        System.out.println("🔀 Routing " + type + " request");
        
        // Find entry point (WAF or first service)
        InfrastructureService entryPoint = findEntryPoint(game);
        if (entryPoint == null) {
            System.out.println("❌ No entry point found");
            return false; // No services available
        }
        
        // Check if WAF can block malicious traffic
        if (type == TrafficType.MALICIOUS) {
            InfrastructureService waf = findServiceByType(game, ServiceType.WAF);
            if (waf != null && waf.getHealth() > 0 && waf.canHandle()) {
                waf.incrementLoad();
                System.out.println("✅ Malicious traffic blocked by WAF");
                return true; // Blocked successfully
            }
            System.out.println("❌ Malicious traffic leaked - no WAF available");
            return false; // Leaked through
        }
        
        // Route based on traffic type
        boolean result = switch (type) {
            case STATIC, UPLOAD -> routeToS3(game);
            case READ, WRITE, SEARCH -> routeToDatabase(game);
            default -> false;
        };
        
        if (!result) {
            // List available services for debugging
            System.out.println("❌ Routing failed for " + type + " | Available services: " + 
                game.getServices().values().stream().map(s -> s.getType().toString()).toList());
        }
        
        return result;
    }

    /**
     * Route to S3 (check cache first, fallback to COMPUTE)
     */
    private boolean routeToS3(GameState game) {
        InfrastructureService s3 = findServiceByType(game, ServiceType.S3);
        if (s3 != null && s3.getHealth() > 0 && s3.canHandle()) {
            s3.incrementLoad();
            System.out.println("✅ Routed to S3");
            return true;
        }
        
        // Fallback to COMPUTE (can serve static files inefficiently)
        InfrastructureService compute = findServiceByType(game, ServiceType.COMPUTE);
        if (compute != null && compute.getHealth() > 0 && compute.canHandle()) {
            compute.incrementLoad();
            System.out.println("✅ Routed to COMPUTE (fallback for static)");
            return true;
        }
        
        if (s3 != null) {
            System.out.println("❌ S3 routing failed - Health: " + s3.getHealth() + ", Load: " + s3.getCurrentLoad() + "/" + s3.getEffectiveCapacity());
        }
        return false;
    }

    /**
     * Route to Database (check cache first, fallback to COMPUTE)
     */
    private boolean routeToDatabase(GameState game) {
        // Try cache first for READ requests
        InfrastructureService cache = findServiceByType(game, ServiceType.CACHE);
        if (cache != null && cache.getHealth() > 0 && cache.canHandle() && random.nextDouble() < 0.7) {
            cache.incrementLoad();
            System.out.println("✅ Routed to CACHE");
            return true; // Cache hit
        }
        
        // Try database
        InfrastructureService db = findServiceByType(game, ServiceType.DATABASE);
        if (db != null && db.getHealth() > 0 && db.canHandle()) {
            db.incrementLoad();
            System.out.println("✅ Routed to DATABASE");
            return true;
        }
        
        // Fallback to COMPUTE as last resort
        InfrastructureService compute = findServiceByType(game, ServiceType.COMPUTE);
        if (compute != null && compute.getHealth() > 0 && compute.canHandle()) {
            compute.incrementLoad();
            System.out.println("✅ Routed to COMPUTE (fallback for database)");
            return true;
        }
        
        if (db != null) {
            System.out.println("❌ Database routing failed - Health: " + db.getHealth() + ", Load: " + db.getCurrentLoad() + "/" + db.getEffectiveCapacity());
        }
        return false;
    }

    /**
     * Find entry point (WAF or first available service)
     */
    private InfrastructureService findEntryPoint(GameState game) {
        InfrastructureService waf = findServiceByType(game, ServiceType.WAF);
        if (waf != null) return waf;
        
        return game.getServices().values().stream().findFirst().orElse(null);
    }

    /**
     * Find service by type
     */
    private InfrastructureService findServiceByType(GameState game, ServiceType type) {
        return game.getServices().values().stream()
            .filter(s -> s.getType() == type)
            .findFirst()
            .orElse(null);
    }

    /**
     * Handle failed request (reputation loss)
     */
    private void handleFailedRequest(GameState game, TrafficRequest request) {
        if (request.getType() == TrafficType.MALICIOUS) {
            // Malicious leak is worse
            game.setReputation(Math.max(0, game.getReputation() - 5));
            System.out.println("⚠️ Malicious traffic leaked! Reputation -5%");
        } else {
            // Regular request failure
            game.setReputation(Math.max(0, game.getReputation() - 1));
        }
    }

    /**
     * Process upkeep costs for all services
     */
    public void processUpkeep(GameState game) {
        double totalUpkeep = 0.0;
        
        for (InfrastructureService service : game.getServices().values()) {
            double upkeep = service.getUpkeep();
            
            // Apply cost spike multiplier if active
            if (eventManagerService.isCostSpikeActive(game)) {
                upkeep *= 1.5;
            }
            
            // Apply auto-repair overhead if enabled
            if (game.isAutoRepairEnabled()) {
                upkeep *= 1.1;
                
                // Auto-repair damaged services
                if (service.getHealth() < 100) {
                    service.setHealth(Math.min(100, service.getHealth() + 5)); // Heal 5% per tick
                }
            }
            
            totalUpkeep += upkeep;
            
            // Degrade service health based on load
            if (service.getCurrentLoad() > service.getCapacity() * 0.8) {
                service.degradeHealth(0.5); // Lose 0.5% health per tick when overloaded
            }
        }
        
        // Deduct upkeep from budget (per tick, which is 0.1s)
        // Upkeep is per minute, so divide by 600 ticks
        double upkeepThisTick = totalUpkeep / 600.0;
        int upkeepInt = (int) Math.ceil(upkeepThisTick);
        int budgetBefore = game.getBudget();
        game.setBudget(game.getBudget() - upkeepInt);
        game.getEconomy().addExpense(upkeepThisTick);
        game.addToExpensesInLastMinute(upkeepThisTick);
        
        if (upkeepInt > 0) {
            System.out.println("💸 Upkeep: $" + String.format("%.2f", upkeepThisTick) + " → Budget: $" + budgetBefore + " - $" + upkeepInt + " = $" + game.getBudget());
        }
        
        // Track in stats
        if (game.getStats() != null) {
            game.getStats().addExpense(upkeepThisTick, "UPKEEP");
        }
        
        // Update expense rate immediately for real-time display
        game.getEconomy().setExpensesPerMinute(totalUpkeep);
    }

    /**
     * Select traffic type based on traffic mix percentages
     */
    private TrafficType selectTrafficType(Map<String, Double> trafficMix) {
        double roll = random.nextDouble() * 100;
        double cumulative = 0;
        
        for (Map.Entry<String, Double> entry : trafficMix.entrySet()) {
            cumulative += entry.getValue();
            if (roll <= cumulative) {
                return TrafficType.valueOf(entry.getKey());
            }
        }
        
        return TrafficType.READ; // Default fallback
    }

    /**
     * Pause game
     */
    public GameState pauseGame(String gameId) {
        GameState game = getGame(gameId);
        game.setPaused(true);
        return game;
    }

    /**
     * Resume game
     */
    public GameState resumeGame(String gameId) {
        GameState game = getGame(gameId);
        game.setPaused(false);
        return game;
    }

    /**
     * Toggle auto-repair
     */
    public GameState setAutoRepair(String gameId, boolean enabled) {
        GameState game = getGame(gameId);
        game.setAutoRepairEnabled(enabled);
        return game;
    }

    /**
     * Broadcast game state via WebSocket
     */
    private void broadcastGameState(String gameId, GameState game) {
        if (wsTemplate != null) {
            wsTemplate.convertAndSend("/topic/game/" + gameId + "/state", game);
        }
    }

    /**
     * Service cost calculation
     */
    private int getServiceCost(ServiceType type) {
        return switch (type) {
            case WAF -> 40;
            case SQS -> 35;
            case ALB -> 50;
            case COMPUTE -> 60;
            case CACHE -> 60;
            case DATABASE -> 150;
            case S3 -> 25;
        };
    }

    /**
     * Service capacity calculation
     */
    private int getServiceCapacity(ServiceType type) {
        return switch (type) {
            case WAF -> 30;
            case SQS -> 200;
            case ALB -> 20;
            case COMPUTE -> 4;
            case CACHE -> 30;
            case DATABASE -> 8;
            case S3 -> 25;
        };
    }

    /**
     * Service upkeep calculation (per minute)
     */
    private double getServiceUpkeep(ServiceType type) {
        return switch (type) {
            case WAF -> 2.0;
            case SQS -> 1.5;
            case ALB -> 3.0;
            case COMPUTE -> 4.0;
            case CACHE -> 3.0;
            case DATABASE -> 8.0;
            case S3 -> 1.5;
        };
    }
}