import React, { useState } from 'react';
import type { GameState } from '../types';
import { gameApi } from '../api';

interface TrafficControlPanelProps {
  gameState: GameState;
  onUpdate: () => void;
}

export const TrafficControlPanel: React.FC<TrafficControlPanelProps> = ({ 
  gameState, 
  onUpdate 
}) => {
  const [trafficMix, setTrafficMix] = useState(gameState.trafficMix);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleSliderChange = (trafficType: string, value: number) => {
    setTrafficMix(prev => ({
      ...prev,
      [trafficType]: value
    }));
  };

  const handleApplyChanges = async () => {
    // Normalize to 100%
    const total = Object.values(trafficMix).reduce((sum, val) => sum + val, 0);
    if (Math.abs(total - 100) > 0.1) {
      alert('Traffic mix must sum to 100%');
      return;
    }

    setIsUpdating(true);
    try {
      await gameApi.updateTrafficMix(gameState.gameId, trafficMix);
      onUpdate();
    } catch (error) {
      console.error('Failed to update traffic mix:', error);
      alert('Failed to update traffic mix');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleReset = () => {
    const defaultMix = {
      STATIC: 20,
      READ: 25,
      WRITE: 15,
      UPLOAD: 10,
      SEARCH: 10,
      MALICIOUS: 20
    };
    setTrafficMix(defaultMix);
  };

  if (gameState.mode !== 'SANDBOX') {
    return null;
  }

  const total = Object.values(trafficMix).reduce((sum, val) => sum + val, 0);
  const isValid = Math.abs(total - 100) < 0.1;

  const trafficTypes = [
    { type: 'STATIC', label: '🟢 Static', color: '#44ff44' },
    { type: 'READ', label: '🔵 Read', color: '#4488ff' },
    { type: 'WRITE', label: '🟠 Write', color: '#ff8800' },
    { type: 'UPLOAD', label: '🟡 Upload', color: '#ffaa00' },
    { type: 'SEARCH', label: '🔵 Search', color: '#00aaff' },
    { type: 'MALICIOUS', label: '🔴 Malicious', color: '#ff4444' }
  ];

  return (
    <div className="panel traffic-control-panel">
      <h3>🚦 Traffic Control (Sandbox)</h3>
      
      <div style={{ 
        marginBottom: '15px', 
        padding: '8px', 
        background: 'rgba(76, 175, 80, 0.2)',
        borderRadius: '4px',
        fontSize: '0.85rem'
      }}>
        {gameState.paused ? (
          <span style={{ color: '#ff9800' }}>
            ⏸️ Game paused - Click ▶️ Resume to start traffic
          </span>
        ) : (
          <span style={{ color: '#4CAF50' }}>
            ✅ Traffic flowing at {(5.0 * gameState.rpsMultiplier).toFixed(1)} RPS
          </span>
        )}
      </div>

      <div style={{ marginBottom: '10px' }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between',
          marginBottom: '5px'
        }}>
          <span style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>Traffic Mix</span>
          <span style={{ 
            fontSize: '0.9rem',
            color: isValid ? '#4CAF50' : '#ff4444'
          }}>
            Total: {total.toFixed(1)}%
          </span>
        </div>

        {trafficTypes.map(({ type, label, color }) => (
          <div key={type} style={{ marginBottom: '12px' }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between',
              marginBottom: '4px',
              fontSize: '0.85rem'
            }}>
              <span>{label}</span>
              <span style={{ color }}>{trafficMix[type]}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={trafficMix[type]}
              onChange={(e) => handleSliderChange(type, Number(e.target.value))}
              style={{
                width: '100%',
                accentColor: color
              }}
            />
          </div>
        ))}
      </div>

      <div style={{ 
        display: 'flex', 
        gap: '10px',
        marginTop: '15px'
      }}>
        <button
          onClick={handleApplyChanges}
          disabled={!isValid || isUpdating}
          style={{
            flex: 1,
            padding: '8px',
            background: isValid ? '#4CAF50' : '#666',
            border: 'none',
            borderRadius: '4px',
            color: 'white',
            cursor: isValid ? 'pointer' : 'not-allowed',
            fontWeight: 'bold'
          }}
        >
          {isUpdating ? '⏳ Applying...' : '✅ Apply Changes'}
        </button>
        
        <button
          onClick={handleReset}
          style={{
            padding: '8px 12px',
            background: 'rgba(255, 255, 255, 0.1)',
            border: '1px solid #666',
            borderRadius: '4px',
            color: 'white',
            cursor: 'pointer'
          }}
        >
          🔄 Reset
        </button>
      </div>

      {!isValid && (
        <div style={{
          marginTop: '10px',
          padding: '8px',
          background: 'rgba(244, 67, 54, 0.2)',
          border: '1px solid #f44336',
          borderRadius: '4px',
          color: '#f44336',
          fontSize: '0.85rem'
        }}>
          ⚠️ Traffic mix must sum to exactly 100%
        </div>
      )}
    </div>
  );
};