package ocean.studio.BetterArchitecture.GameEngine;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/game")
@CrossOrigin(origins = "*")
public class GameController {

    @Autowired
    private GameEngineService gameEngine;

    /**
     * Create a new game
     * POST /api/game/create
     * Body: { "mode": "SURVIVAL", "initialBudget": 500 }
     */
    @PostMapping("/create")
    public ResponseEntity<GameState> createNewGame(@RequestBody GameCreationRequest req) {
        System.out.println(">>> Creating new game");
        System.out.println(">>> Mode: " + req.mode);
        System.out.println(">>> Budget: " + req.initialBudget);
        
        try {
            GameState game = gameEngine.createGame(req.mode, req.initialBudget);
            System.out.println(">>> Game ID: " + game.getGameId());
            System.out.println(">>> Game created successfully with " + game.getServices().size() + " services");
            return ResponseEntity.ok(game);
        } catch (Exception e) {
            System.err.println(">>> Error creating game: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.internalServerError().build();
        }
    }

    /**
     * Get current game state
     * GET /api/game/{gameId}
     */
    @GetMapping("/{gameId}")
    public ResponseEntity<GameState> getGameStatus(@PathVariable String gameId) {
        try {
            System.out.println(">>> Fetching game: " + gameId);
            
            GameState game = gameEngine.getGame(gameId);
            
            if (game == null) {
                System.err.println(">>> Game not found: " + gameId);
                return ResponseEntity.notFound().build();
            }
            
            System.out.println(">>> Getting game: " + gameId + " with " + game.getServices().size() + " services");
            return ResponseEntity.ok(game);
        } catch (Exception e) {
            System.err.println(">>> Error getting game: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.internalServerError().build();
        }
    }

    /**
     * Pause game
     * POST /api/game/{gameId}/pause
     */
    @PostMapping("/{gameId}/pause")
    public ResponseEntity<GameState> pauseTheGame(@PathVariable String gameId) {
        GameState game = gameEngine.pauseGame(gameId);
        System.out.println("⏸️ Game paused: " + gameId);
        return ResponseEntity.ok(game);
    }

    /**
     * Resume game
     * POST /api/game/{gameId}/resume
     */
    @PostMapping("/{gameId}/resume")
    public ResponseEntity<GameState> resumeTheGame(@PathVariable String gameId) {
        GameState game = gameEngine.resumeGame(gameId);
        System.out.println("▶️ Game resumed: " + gameId);
        return ResponseEntity.ok(game);
    }

    /**
     * Toggle auto-repair feature
     * POST /api/game/{gameId}/auto-repair
     * Body: { "enabled": true }
     */
    @PostMapping("/{gameId}/auto-repair")
    public ResponseEntity<GameState> toggleAutoFix(
            @PathVariable String gameId,
            @RequestBody AutoRepairRequest req
    ) {
        GameState game = gameEngine.setAutoRepair(gameId, req.enabled);
        System.out.println("🔧 Auto-repair " + (req.enabled ? "enabled" : "disabled") + " for game: " + gameId);
        return ResponseEntity.ok(game);
    }

    /**
     * Update traffic mix (Sandbox mode only)
     * POST /api/game/{gameId}/traffic-mix
     * Body: { "STATIC": 20.0, "READ": 25.0, "WRITE": 15.0, ... }
     */
    @PostMapping("/{gameId}/traffic-mix")
    public ResponseEntity<GameState> updateTrafficMix(
            @PathVariable String gameId,
            @RequestBody Map<String, Double> trafficMix
    ) {
        GameState game = gameEngine.getGame(gameId);
        
        if (game == null) {
            return ResponseEntity.notFound().build();
        }
        
        // Validate traffic mix sums to ~100%
        double sum = trafficMix.values().stream().mapToDouble(Double::doubleValue).sum();
        if (Math.abs(sum - 100.0) > 0.01) {
            return ResponseEntity.badRequest().build();
        }
        
        game.setTrafficMix(trafficMix);
        System.out.println("🚦 Traffic mix updated for game: " + gameId);
        return ResponseEntity.ok(game);
    }

    // Request DTOs
    static class GameCreationRequest {
        public String mode;
        public int initialBudget;
    }

    static class AutoRepairRequest {
        public boolean enabled;
    }
}