import type { GameState } from '../types';
import { SERVICE_INFO } from '../types';

interface HealthPanelProps {
  gameState: GameState;
  onRepair: (serviceId: string) => Promise<void>;
}

export function HealthPanel({ gameState, onRepair }: HealthPanelProps) {
  const services = Object.values(gameState.services || {});
  const damagedServices = services.filter(s => s.health < 100);

  return (
    <div className="panel health-panel">
      <h3>Service Health</h3>
      
      {damagedServices.length === 0 ? (
        <p className="no-services">All services healthy ✅</p>
      ) : (
        <div className="service-list">
          {damagedServices.map(service => {
            const info = SERVICE_INFO[service.type];
            const repairCost = Math.floor(info.cost * 0.15);
            const canAfford = gameState.budget >= repairCost;
            
            return (
              <div key={service.id} className="service-health-item">
                <div className="service-header">
                  <span>{info.displayName}</span>
                  <span className={service.health < 40 ? 'critical' : service.health < 70 ? 'warning' : ''}>
                    {service.health.toFixed(0)}%
                  </span>
                </div>
                <div className="health-bar">
                  <div 
                    className="health-fill" 
                    style={{ 
                      width: `${service.health}%`,
                      background: service.health < 40 ? '#ef4444' : service.health < 70 ? '#f59e0b' : '#10b981'
                    }}
                  />
                </div>
                <button 
                  className="repair-button"
                  onClick={() => onRepair(service.id)}
                  disabled={!canAfford}
                  title={canAfford ? `Repair for $${repairCost}` : 'Insufficient budget'}
                >
                  🔧 Repair ${repairCost}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
