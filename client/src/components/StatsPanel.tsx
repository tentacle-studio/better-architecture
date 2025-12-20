import React from 'react';
import type { GameState } from '../types';

interface StatsPanelProps {
  gameState: GameState;
}

export const StatsPanel: React.FC<StatsPanelProps> = ({ gameState }) => {
  const currentRPS = (5.0 * gameState.rpsMultiplier).toFixed(1);
  const servicesCount = Object.keys(gameState.services || {}).length;
  
  // Calculate total capacity and current load
  const totalCapacity = Object.values(gameState.services || {}).reduce(
    (sum, service) => sum + service.capacity,
    0
  );
  const totalLoad = Object.values(gameState.services || {}).reduce(
    (sum, service) => sum + service.currentLoad,
    0
  );
  const loadPercentage = totalCapacity > 0 ? ((totalLoad / totalCapacity) * 100).toFixed(1) : '0.0';

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="panel stats-panel">
      <h3>📊 Game Stats</h3>
      
      <div className="stat-row">
        <span>Mode:</span>
        <span className={gameState.mode === 'SURVIVAL' ? 'survival-mode' : 'sandbox-mode'}>
          {gameState.mode === 'SURVIVAL' ? '🎯 Survival' : '🏖️ Sandbox'}
        </span>
      </div>

      <div className="stat-row">
        <span>Time:</span>
        <span>{formatTime(gameState.elapsedTime)}</span>
      </div>

      <div className="stat-row">
        <span>Budget:</span>
        <span className={gameState.budget >= 0 ? 'positive' : 'negative'}>
          ${gameState.budget.toFixed(2)}
        </span>
      </div>

      <div className="stat-row">
        <span>Reputation:</span>
        <span className={
          gameState.reputation >= 75 ? 'positive' :
          gameState.reputation >= 50 ? '' :
          gameState.reputation >= 25 ? 'negative' : 'critical'
        }>
          {gameState.reputation.toFixed(1)}%
        </span>
      </div>

      <div className="stat-row">
        <span>Services:</span>
        <span>{servicesCount}</span>
      </div>

      <div className="stat-row">
        <span>Traffic (RPS):</span>
        <span className={gameState.paused ? 'paused' : 'positive'}>
          {gameState.paused ? '⏸️ Paused' : `🌐 ${currentRPS}`}
        </span>
      </div>

      <div className="stat-row">
        <span>RPS Multiplier:</span>
        <span>{gameState.rpsMultiplier.toFixed(1)}×</span>
      </div>

      <div className="stat-row">
        <span>Load:</span>
        <span className={
          parseFloat(loadPercentage) >= 90 ? 'critical' :
          parseFloat(loadPercentage) >= 70 ? 'negative' : ''
        }>
          {totalLoad} / {totalCapacity} ({loadPercentage}%)
        </span>
      </div>

      {gameState.mode === 'SANDBOX' && (
        <div style={{
          marginTop: '10px',
          padding: '8px',
          background: 'rgba(76, 175, 80, 0.2)',
          borderRadius: '4px',
          border: '1px solid #4CAF50'
        }}>
          <div style={{ fontSize: '0.85rem', color: '#4CAF50', marginBottom: '5px' }}>
            💡 Sandbox Mode
          </div>
          <div style={{ fontSize: '0.75rem', color: '#aaa' }}>
            {gameState.paused 
              ? 'Click ▶️ Resume to start traffic'
              : 'Traffic flowing automatically'}
          </div>
        </div>
      )}

      {gameState.mode === 'SURVIVAL' && gameState.rpsMultiplier < 4.0 && (
        <div style={{
          marginTop: '10px',
          padding: '8px',
          background: 'rgba(255, 152, 0, 0.2)',
          borderRadius: '4px',
          border: '1px solid #ff9800',
          fontSize: '0.75rem',
          color: '#ff9800'
        }}>
          ⚠️ Next RPS increase at {formatTime(getNextMilestone(gameState.elapsedTime))}
        </div>
      )}
    </div>
  );
};

function getNextMilestone(elapsed: number): number {
  if (elapsed < 60) return 60;
  if (elapsed < 120) return 120;
  if (elapsed < 180) return 180;
  if (elapsed < 240) return 240;
  if (elapsed < 360) return 360;
  if (elapsed < 480) return 480;
  if (elapsed < 600) return 600;
  return 600;
}