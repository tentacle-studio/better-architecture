import { ServiceType } from '../types';
import './ServiceToolbar.css';

interface ServiceToolbarProps {
  selectedService: ServiceType | null;
  onSelectService: (serviceType: ServiceType | null) => void;
  selectedTool: 'connect' | 'delete' | null;
  onSelectTool: (tool: 'connect' | 'delete' | null) => void;
  budget: number;
}

export const ServiceToolbar: React.FC<ServiceToolbarProps> = ({
  selectedService,
  onSelectService,
  selectedTool,
  onSelectTool,
  budget
}) => {
  const getServiceCost = (type: ServiceType): number => {
    const costs = {
      WAF: 40, SQS: 35, ALB: 50, COMPUTE: 60,
      CACHE: 60, DATABASE: 150, S3: 25
    };
    return costs[type] || 0;
  };

  return (
    <div className="service-toolbar">
      <h3>🏗️ Services</h3>
      
      {Object.values(ServiceType).map(type => {
        const cost = getServiceCost(type);
        const canAfford = budget >= cost;
        const isSelected = selectedService === type;
        
        return (
          <button
            key={type}
            onClick={() => onSelectService(type)}
            disabled={!canAfford}
            className={isSelected ? 'selected' : ''}
            title={canAfford ? `Place ${type} for $${cost}` : `Insufficient budget (need $${cost})`}
          >
            <span className="service-name">{type}</span>
            <span className="service-cost">${cost}</span>
          </button>
        );
      })}
      
      <hr style={{ margin: '15px 0', border: 'none', borderTop: '1px solid #444' }} />
      
      <h4>🔧 Tools</h4>
      <div className="tools">
        <button
          onClick={() => onSelectTool(selectedTool === 'connect' ? null : 'connect')}
          className={selectedTool === 'connect' ? 'selected' : ''}
        >
          🔗 Connect
        </button>
        
        <button
          onClick={() => onSelectTool(selectedTool === 'delete' ? null : 'delete')}
          className={selectedTool === 'delete' ? 'selected' : ''}
        >
          🗑️ Delete (50% refund)
        </button>
      </div>
    </div>
  );
};