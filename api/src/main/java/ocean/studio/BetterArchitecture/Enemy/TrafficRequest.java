package ocean.studio.BetterArchitecture.Enemy;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

public class TrafficRequest {
    private String id;
    private TrafficType type;
    private long spawnTime;
    private List<String> path; // List of service IDs this request passes through
    private RequestStatus status;
    private String failureReason;

    public TrafficRequest(TrafficType type) {
        this.id = UUID.randomUUID().toString();
        this.type = type;
        this.spawnTime = System.currentTimeMillis();
        this.path = new ArrayList<>();
        this.status = RequestStatus.PENDING;
    }

    public enum RequestStatus {
        PENDING,
        PROCESSING,
        SUCCESS,
        FAILED,
        BLOCKED
    }

    // Getters and setters
    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public TrafficType getType() {
        return type;
    }

    public void setType(TrafficType type) {
        this.type = type;
    }

    public long getSpawnTime() {
        return spawnTime;
    }

    public void setSpawnTime(long spawnTime) {
        this.spawnTime = spawnTime;
    }

    public List<String> getPath() {
        return path;
    }

    public void setPath(List<String> path) {
        this.path = path;
    }

    public RequestStatus getStatus() {
        return status;
    }

    public void setStatus(RequestStatus status) {
        this.status = status;
    }

    public String getFailureReason() {
        return failureReason;
    }

    public void setFailureReason(String failureReason) {
        this.failureReason = failureReason;
    }

    public void addToPath(String serviceId) {
        this.path.add(serviceId);
    }
}
