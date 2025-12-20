import type { GameEvent } from '../types';

interface EventBarProps {
  events: GameEvent[];
  elapsedTime: number;
}

export function EventBar({ events, elapsedTime }: EventBarProps) {
  if (!events || events.length === 0) {
    return null;
  }

  return (
    <div className="event-bar-container">
      {events.map((event, index) => {
        const timeLeft = Math.max(0, event.endTime - elapsedTime);
        const progress = (timeLeft / event.duration) * 100;
        
        return (
          <div key={`${event.eventType}-${index}`} className="event-bar">
            <div className="event-content">
              <span className="event-name">⚠️ {event.eventType.replace('_', ' ')}</span>
              <span className="event-description">{event.description}</span>
              <span className="event-timer">{timeLeft.toFixed(1)}s</span>
            </div>
            <div 
              className="event-progress" 
              style={{ 
                width: `${progress}%`,
                background: 'linear-gradient(90deg, #f59e0b, #ef4444)'
              }}
            />
          </div>
        );
      })}
    </div>
  );
}