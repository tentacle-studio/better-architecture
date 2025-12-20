package ocean.studio.BetterArchitecture.GameEngine;

public class GameEvent {
    private String eventType;
    private String description;
    private double startTime;
    private double duration;

    public GameEvent(String eventType, String description, double startTime, double duration) {
        this.eventType = eventType;
        this.description = description;
        this.startTime = startTime;
        this.duration = duration;
    }

    // Getters and Setters
    public String getEventType() {
        return eventType;
    }

    public void setEventType(String eventType) {
        this.eventType = eventType;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public double getStartTime() {
        return startTime;
    }

    public void setStartTime(double startTime) {
        this.startTime = startTime;
    }

    public double getDuration() {
        return duration;
    }

    public void setDuration(double duration) {
        this.duration = duration;
    }

    public double getEndTime() {
        return startTime + duration;
    }
}