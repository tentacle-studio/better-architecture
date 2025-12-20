package ocean.studio.BetterArchitecture.Tower;

public enum ServiceType {
    WAF("WAF", 40, 30, 2.0, "Firewall - Blocks malicious traffic"),
    SQS("SQS", 35, 200, 1.5, "Queue - Buffers requests during spikes"),
    ALB("ALB", 50, 20, 3.0, "Load Balancer - Distributes traffic"),
    COMPUTE("Compute", 60, 4, 4.0, "EC2 Instance - Processes requests"),
    CACHE("Cache", 60, 30, 3.0, "Redis Cache - Caches responses"),
    DATABASE("Database", 150, 8, 8.0, "RDS - Persistent data storage"),
    S3("S3", 25, 25, 1.5, "Storage - Static files and uploads");

    private final String displayName;
    private final int cost;
    private final int baseCapacity;
    private final double upkeepPerMinute;
    private final String description;

    ServiceType(String displayName, int cost, int baseCapacity, double upkeepPerMinute, String description) {
        this.displayName = displayName;
        this.cost = cost;
        this.baseCapacity = baseCapacity;
        this.upkeepPerMinute = upkeepPerMinute;
        this.description = description;
    }

    public String getDisplayName() {
        return displayName;
    }

    public int getCost() {
        return cost;
    }

    public int getBaseCapacity() {
        return baseCapacity;
    }

    public double getUpkeepPerMinute() {
        return upkeepPerMinute;
    }

    public String getDescription() {
        return description;
    }

    public int getRepairCost() {
        return (int) (cost * 0.15);
    }
}
