import { useEffect, useState } from 'react';
import { GameCanvas } from './components/GameCanvas';
import { ServiceToolbar } from './components/ServiceToolbar';
import { StatsPanel } from './components/StatsPanel';
import { HealthPanel } from './components/HealthPanel';
import { FinancesPanel } from './components/FinancesPanel';
import { TrafficControlPanel } from './components/TrafficControlPanel';
import { EventBar } from './components/EventBar';
import type { GameState, ServiceType, TrafficRequest } from './types';
import { gameApi } from './api';
import './Game.css';

interface GameProps {
  gameId: string;
  onExit: () => void;
}

export function Game({ gameId, onExit }: GameProps) {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [activeTraffic, setActiveTraffic] = useState<TrafficRequest[]>([]);
  const [selectedService, setSelectedService] = useState<ServiceType | null>(null);
  const [selectedTool, setSelectedTool] = useState<'connect' | 'delete' | null>(null);

  // Initial fetch
  useEffect(() => {
    const fetchGame = async () => {
      try {
        const state = await gameApi.getGame(gameId);
        console.log('Initial game state loaded:', state);
        setGameState(state);
      } catch (error) {
        console.error('Failed to load game:', error);
      }
    };
    fetchGame();
  }, [gameId]);

  // WebSocket subscription
  useEffect(() => {
    console.log('Setting up WebSocket for game:', gameId);
    
    let unsubscribeState: (() => void) | null = null;
    let unsubscribeTraffic: { unsubscribe: () => void } | null = null;

    const setupWebSocket = async () => {
      // Subscribe to game state updates
      unsubscribeState = await gameApi.subscribeToGameUpdates(gameId, (updatedState) => {
        console.log('WebSocket update received:', updatedState);
        setGameState(updatedState);
      });

      // Subscribe to traffic updates (after connection is established)
      unsubscribeTraffic = gameApi.subscribeToTraffic(gameId, (traffic: TrafficRequest) => {
        console.log('🚦 Traffic received:', traffic);
        setActiveTraffic(prev => {
          // Add new traffic with client-side spawn timestamp
          const trafficWithTime = { ...traffic, spawnTime: Date.now() };
          const updated = [...prev, trafficWithTime];
          
          // Remove traffic older than 10 seconds and keep last 50
          return updated
            .filter(t => Date.now() - t.spawnTime < 10000)
            .slice(-50);
        });
      });
    };

    setupWebSocket();

    return () => {
      console.log('Cleaning up WebSocket');
      if (unsubscribeState) {
        unsubscribeState();
      }
      if (unsubscribeTraffic) {
        unsubscribeTraffic.unsubscribe();
      }
    };
  }, [gameId]);

  const handleServicePlaced = async () => {
    try {
      const freshState = await gameApi.getGame(gameId);
      setGameState(freshState);
    } catch (error) {
      console.error('Failed to refresh game state:', error);
    }
    setSelectedService(null);
  };

  const handleCancel = () => {
    setSelectedService(null);
    setSelectedTool(null);
  };

  const handlePause = async () => {
    if (!gameState) return;
    try {
      const updated = gameState.paused 
        ? await gameApi.resumeGame(gameId)
        : await gameApi.pauseGame(gameId);
      setGameState(updated);
    } catch (error) {
      console.error('Failed to toggle pause:', error);
    }
  };

  const handleAutoRepair = async () => {
    if (!gameState) return;
    try {
      const updated = await gameApi.setAutoRepair(gameId, !gameState.autoRepairEnabled);
      setGameState(updated);
    } catch (error) {
      console.error('Failed to toggle auto-repair:', error);
    }
  };

  const handleTrafficUpdate = async () => {
    try {
      const freshState = await gameApi.getGame(gameId);
      setGameState(freshState);
    } catch (error) {
      console.error('Failed to refresh game state:', error);
    }
  };

  if (!gameState) {
    return (
      <div className="game-container loading">
        <p>Loading game...</p>
      </div>
    );
  }

  return (
    <div className="game-container">
      {/* Top Bar */}
      <div className="top-bar">
        <h2>Better Architecture - Game {gameId.substring(0, 8)}</h2>
        <div className="top-bar-controls">
          <button onClick={handlePause}>
            {gameState.paused ? '▶️ Resume' : '⏸️ Pause'}
          </button>
          <button 
            onClick={handleAutoRepair}
            className={gameState.autoRepairEnabled ? 'active' : ''}
          >
            🔧 Auto-Repair {gameState.autoRepairEnabled ? 'ON' : 'OFF'}
          </button>
          <button onClick={onExit} className="exit-button">
            🚪 Exit Game
          </button>
        </div>
      </div>

      {/* Main Game Area - Vertical Layout */}
      <div className="game-main">
        {/* Top Section: Toolbar + Stats + Traffic Control (Sandbox) */}
        <div className="game-top-section">
          <div className="toolbar-container">
            <ServiceToolbar
              selectedService={selectedService}
              onSelectService={setSelectedService}
              selectedTool={selectedTool}
              onSelectTool={setSelectedTool}
              budget={gameState.budget}
            />
          </div>
          <div className="stats-container">
            <StatsPanel gameState={gameState} />
            {gameState.mode === 'SANDBOX' && (
              <TrafficControlPanel 
                gameState={gameState} 
                onUpdate={handleTrafficUpdate}
              />
            )}
          </div>
        </div>

        {/* Canvas - Main Play Area */}
        <div className="canvas-container">
          <GameCanvas
            gameState={gameState}
            activeTraffic={activeTraffic}
            selectedService={selectedService}
            selectedTool={selectedTool}
            onServicePlaced={handleServicePlaced}
            onCancel={handleCancel}
          />
        </div>

        {/* Bottom Section: Health + Finances */}
        <div className="game-bottom-section">
          <HealthPanel 
            gameState={gameState}
            onRepair={async (serviceId) => {
              try {
                await gameApi.repairService(gameId, serviceId);
                const updated = await gameApi.getGame(gameId);
                setGameState(updated);
              } catch (error) {
                console.error('Failed to repair service:', error);
                alert(`Repair failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
              }
            }}
          />
          <FinancesPanel gameState={gameState} />
        </div>
      </div>

      {/* Bottom Event Bar */}
      {gameState.activeEvents && gameState.activeEvents.length > 0 && (
        <EventBar events={gameState.activeEvents} elapsedTime={gameState.elapsedTime} />
      )}

      {/* Game Over Overlay */}
      {gameState.gameOver && (
        <div className="game-over-overlay">
          <div className="game-over-modal">
            <h2>💀 Game Over</h2>
            <p>Time survived: {Math.floor(gameState.elapsedTime / 60)}m {Math.floor(gameState.elapsedTime % 60)}s</p>
            <p>Final Budget: ${gameState.budget.toFixed(2)}</p>
            <p>Final Reputation: {gameState.reputation.toFixed(1)}%</p>
            <button onClick={onExit} className="primary-button">
              Return to Menu
            </button>
          </div>
        </div>
      )}
    </div>
  );
}