package ocean.studio.BetterArchitecture.Enemy;

import ocean.studio.BetterArchitecture.Tower.ServiceType;

public enum TrafficType {
    STATIC("Static", "#4ade80", 0.50, 3, ServiceType.S3, false),
    READ("Read", "#60a5fa", 0.80, 5, ServiceType.DATABASE, false),
    WRITE("Write", "#fb923c", 1.20, 8, ServiceType.DATABASE, false),
    UPLOAD("Upload", "#facc15", 1.50, 10, ServiceType.S3, false),
    SEARCH("Search", "#22d3ee", 0.80, 5, ServiceType.DATABASE, false),
    MALICIOUS("Malicious", "#ef4444", 0.50, 10, ServiceType.WAF, true);

    private final String displayName;
    private final String color;
    private final double reward;
    private final int score;
    private final ServiceType targetService;
    private final boolean requiresBlocking;

    TrafficType(String displayName, String color, double reward, int score, 
                ServiceType targetService, boolean requiresBlocking) {
        this.displayName = displayName;
        this.color = color;
        this.reward = reward;
        this.score = score;
        this.targetService = targetService;
        this.requiresBlocking = requiresBlocking;
    }

    public String getDisplayName() {
        return displayName;
    }

    public String getColor() {
        return color;
    }

    public double getReward() {
        return reward;
    }

    public int getScore() {
        return score;
    }

    public ServiceType getTargetService() {
        return targetService;
    }

    public boolean isRequiresBlocking() {
        return requiresBlocking;
    }
}
