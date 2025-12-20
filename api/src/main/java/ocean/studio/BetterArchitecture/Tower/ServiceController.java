package ocean.studio.BetterArchitecture.Tower;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import ocean.studio.BetterArchitecture.GameEngine.GameEngineService;
import ocean.studio.BetterArchitecture.GameEngine.GameState;

import java.util.Map;

@RestController
@RequestMapping("/api/service")
@CrossOrigin(origins = "*")
public class ServiceController {

    @Autowired
    private GameEngineService gameEngine;

    /**
     * Place a new service on the game board
     * POST /api/service/{gameId}/place
     * Body: { "serviceType": "WAF", "position": {"x": 0, "y": 0, "z": 0} }
     */
    @PostMapping("/{gameId}/place")
    public ResponseEntity<GameState> placeNewService(
            @PathVariable String gameId,
            @RequestBody ServiceRequest request
    ) {
        System.out.println(">>> Placing service request received");
        System.out.println(">>> Game: " + gameId);
        System.out.println(">>> Service: " + request.serviceType);
        System.out.println(">>> Position: " + request.position);
        
        try {
            gameEngine.placeService(
                gameId,
                request.serviceType,
                request.position
            );
            
            // Get updated state after placement
            GameState updated = gameEngine.getGame(gameId);
            
            System.out.println(">>> Success! Services now: " + updated.getServices().size());
            return ResponseEntity.ok(updated);
        } catch (IllegalArgumentException e) {
            System.err.println(">>> Error: " + e.getMessage());
            return ResponseEntity.badRequest().body(null);
        } catch (Exception e) {
            System.err.println(">>> Unexpected error: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.internalServerError().build();
        }
    }

    /**
     * Connect two services together
     * POST /api/service/{gameId}/connect
     * Body: { "fromServiceId": "srv-abc123", "toServiceId": "srv-def456" }
     */
    @PostMapping("/{gameId}/connect")
    public ResponseEntity<GameState> connectServices(
        @PathVariable String gameId,
        @RequestBody ConnectRequest req
    ) {
        GameState game = gameEngine.getGame(gameId);
        
        if (game == null) {
            System.err.println(">>> Game not found: " + gameId);
            return ResponseEntity.notFound().build();
        }
        
        InfrastructureService from = game.getServices().get(req.fromServiceId);
        InfrastructureService to = game.getServices().get(req.toServiceId);
        
        if (from == null || to == null) {
            System.err.println(">>> Service not found - from: " + req.fromServiceId + ", to: " + req.toServiceId);
            return ResponseEntity.badRequest().build();
        }
        
        // Prevent duplicate connections
        if (from.isConnectedTo(req.toServiceId)) {
            System.out.println("⚠️ Services already connected");
            return ResponseEntity.ok(game);
        }
        
        // Add connection
        from.addConnection(req.toServiceId);
        
        System.out.println("🔗 Connected " + from.getType() + "[" + req.fromServiceId + "] → " + 
                          to.getType() + "[" + req.toServiceId + "]");
        return ResponseEntity.ok(game);
    }

    /**
     * Remove a service from the board (50% refund)
     * DELETE /api/service/{gameId}/remove/{serviceId}
     */
    @DeleteMapping("/{gameId}/remove/{serviceId}")
    public ResponseEntity<GameState> deleteService(
            @PathVariable String gameId,
            @PathVariable String serviceId
    ) {
        try {
            gameEngine.removeService(gameId, serviceId);
            GameState updated = gameEngine.getGame(gameId);
            
            System.out.println("🗑️ Removed service: " + serviceId);
            return ResponseEntity.ok(updated);
        } catch (IllegalArgumentException e) {
            System.err.println(">>> Remove error: " + e.getMessage());
            return ResponseEntity.badRequest().body(null);
        }
    }

    /**
     * Repair a service to 100% health
     * POST /api/service/{gameId}/repair/{serviceId}
     */
    @PostMapping("/{gameId}/repair/{serviceId}")
    public ResponseEntity<GameState> fixService(
            @PathVariable String gameId,
            @PathVariable String serviceId
    ) {
        try {
            gameEngine.repairService(gameId, serviceId);
            GameState updated = gameEngine.getGame(gameId);
            
            System.out.println("🔧 Repaired service: " + serviceId);
            return ResponseEntity.ok(updated);
        } catch (IllegalArgumentException e) {
            System.err.println(">>> Repair error: " + e.getMessage());
            return ResponseEntity.badRequest().body(null);
        } catch (IllegalStateException e) {
            System.err.println(">>> Insufficient budget: " + e.getMessage());
            return ResponseEntity.status(402).body(null); // Payment Required
        }
    }

    // Request DTOs
    static class ServiceRequest {
        public ServiceType serviceType;
        public Map<String, Object> position;
    }

    static class ConnectRequest {
        public String fromServiceId;
        public String toServiceId;
    }
}