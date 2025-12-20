package ocean.studio.BetterArchitecture.GameEngine;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import ocean.studio.BetterArchitecture.Enemy.EventManagerService;
import ocean.studio.BetterArchitecture.Enemy.TrafficRequest;
import ocean.studio.BetterArchitecture.Tower.InfrastructureService;

import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class GameLoopScheduler {

    @Autowired
    private GameEngineService gameEngine;

    @Autowired
    private EventManagerService eventManager;

    @Autowired(required = false)
    private SimpMessagingTemplate wsTemplate;

    /**
     * Main game loop - runs every 100ms (10 FPS)
     */
    @Scheduled(fixedRate = 100)
    public void gameLoop() {
        ConcurrentHashMap<String, GameState> games = gameEngine.getAllGames();

        for (Map.Entry<String, GameState> entry : games.entrySet()) {
            String gameId = entry.getKey();
            GameState game = entry.getValue();

            System.out.println("Game loop tick - GameID: " + gameId + ", Paused: " + game.isPaused());
            // Skip if paused or game over
            if (game.isPaused() || game.isGameOver()) {
                continue;
            }

            // Increment elapsed time (0.1 seconds per tick)
            game.setElapsedTime(game.getElapsedTime() + 0.1);

            // Reset service loads before processing new tick
            resetServiceLoads(game);

            // 1. Update RPS milestones (Survival mode only)
            if ("SURVIVAL".equals(game.getMode())) {
                updateRpsMultiplier(game);
            }

            // 2. Trigger random events (Survival mode only)
            if ("SURVIVAL".equals(game.getMode())) {
                eventManager.triggerRandomEvents(game);
            }

            // 3. Generate traffic based on current RPS
            List<TrafficRequest> requests = gameEngine.generateTraffic(game);

            // 4. Process all requests
            gameEngine.processRequests(game, requests);

            // 5. Process upkeep costs
            gameEngine.processUpkeep(game);
            
            // 5.5 Update economy rates every 10 seconds (100 ticks) for better UX
            long currentTick = (long)(game.getElapsedTime() * 10); // Convert seconds to ticks
            if (currentTick - game.getLastRateUpdateTick() >= 100) {
                // Calculate rates based on last 10 seconds activity, extrapolated to per minute
                // Multiply by 6 to convert 10-second rate to per-minute rate
                game.getEconomy().setRevenuePerMinute(game.getRevenueInLastMinute() * 6.0);
                
                // Expenses per minute is already calculated in processUpkeep
                // Just update from accumulated value
                double expenseRate = game.getExpensesInLastMinute() * 6.0;
                if (expenseRate > 0) {
                    game.getEconomy().setExpensesPerMinute(expenseRate);
                }
                
                // Reset tracking for next interval
                game.setRevenueInLastMinute(0.0);
                game.setExpensesInLastMinute(0.0);
                game.setLastRateUpdateTick(currentTick);
                
                System.out.println("💰 Updated rates - Revenue/min: $" + 
                    String.format("%.2f", game.getEconomy().getRevenuePerMinute()) + 
                    ", Expenses/min: $" + String.format("%.2f", game.getEconomy().getExpensesPerMinute()) +
                    " | Total Revenue: $" + String.format("%.2f", game.getEconomy().getTotalRevenue()) +
                    ", Total Expenses: $" + String.format("%.2f", game.getEconomy().getTotalExpenses()));
            }
            
            // Reset EconomyStats every minute (600 ticks)
            if (currentTick % 600 == 0 && game.getStats() != null) {
                System.out.println("📊 Minute stats - Income: $" + 
                    String.format("%.2f", game.getStats().getIncomeThisMinute()) + 
                    ", Expenses: $" + String.format("%.2f", game.getStats().getExpensesThisMinute()));
                game.getStats().resetMinuteStats();
            }

            // 6. Check game over conditions (Survival mode only)
            if ("SURVIVAL".equals(game.getMode())) {
                checkGameOver(game);
            }

            // 7. Broadcast updated state via WebSocket
            broadcastGameState(gameId, game);
        }
    }

    /**
     * Reset all service loads at start of tick
     */
    private void resetServiceLoads(GameState game) {
        for (InfrastructureService service : game.getServices().values()) {
            service.resetLoad();
        }
    }

    /**
     * Update RPS multiplier based on elapsed time milestones
     */
    private void updateRpsMultiplier(GameState game) {
        double elapsed = game.getElapsedTime();

        if (elapsed >= 600) { // 10 minutes
            game.setRpsMultiplier(4.0);
        } else if (elapsed >= 480) { // 8 minutes
            game.setRpsMultiplier(3.5);
        } else if (elapsed >= 360) { // 6 minutes
            game.setRpsMultiplier(3.0);
        } else if (elapsed >= 240) { // 4 minutes
            game.setRpsMultiplier(2.5);
        } else if (elapsed >= 180) { // 3 minutes
            game.setRpsMultiplier(2.0);
        } else if (elapsed >= 120) { // 2 minutes
            game.setRpsMultiplier(1.5);
        } else if (elapsed >= 60) { // 1 minute
            game.setRpsMultiplier(1.3);
        } else {
            game.setRpsMultiplier(1.0);
        }
    }

    /**
     * Check if game over conditions are met
     */
    private void checkGameOver(GameState game) {
        if (game.getReputation() <= 0) {
            game.setGameOver(true);
            System.out.println("💀 Game Over - Reputation reached 0%");
        } else if (game.getBudget() < -1000) {
            game.setGameOver(true);
            System.out.println("💀 Game Over - Budget below -$1000");
        }
    }

    /**
     * Broadcast game state via WebSocket
     */
    private void broadcastGameState(String gameId, GameState game) {
        if (wsTemplate != null) {
            wsTemplate.convertAndSend("/topic/game/" + gameId + "/state", game);
        }
    }
}