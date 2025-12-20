import { useState } from 'react';
import { gameApi } from '../api';

interface MainMenuProps {
  onStartGame: (gameId: string) => void;
}

export function MainMenu({ onStartGame }: MainMenuProps) {
  const [selectedMode, setSelectedMode] = useState<'SURVIVAL' | 'SANDBOX'>('SURVIVAL');
  const [initialBudget, setInitialBudget] = useState(500);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStartGame = async () => {
    setIsCreating(true);
    setError(null);
    
    try {
      console.log('🎮 Creating game with mode:', selectedMode, 'budget:', initialBudget);
      
      // Create the game via API
      const gameState = await gameApi.createGame(selectedMode, initialBudget);
      
      console.log('✅ Game created successfully:', gameState);
      console.log('✅ Game ID:', gameState.gameId);
      
      // Pass the gameId to parent component
      onStartGame(gameState.gameId);
      
    } catch (err) {
      console.error('❌ Failed to create game:', err);
      setError(err instanceof Error ? err.message : 'Failed to create game');
      setIsCreating(false);
    }
  };

  return (
    <div className="main-menu">
      <div className="menu-container">
        <h1>🏗️ Better Architecture</h1>
        <p className="subtitle">A Tower Defense Game for Cloud Architects</p>

        <div className="menu-section">
          <h2>Select Game Mode</h2>
          
          <div className="mode-selection">
            <button
              className={`mode-button ${selectedMode === 'SURVIVAL' ? 'active' : ''}`}
              onClick={() => setSelectedMode('SURVIVAL')}
              disabled={isCreating}
            >
              <h3>🎯 Survival Mode</h3>
              <p>Escalating difficulty, random events</p>
              <ul>
                <li>RPS multipliers at time milestones</li>
                <li>Random events every 15-45s</li>
                <li>DDoS waves every 45s</li>
                <li>Game over at 0% reputation or -$1000</li>
              </ul>
            </button>

            <button
              className={`mode-button ${selectedMode === 'SANDBOX' ? 'active' : ''}`}
              onClick={() => setSelectedMode('SANDBOX')}
              disabled={isCreating}
            >
              <h3>🏖️ Sandbox Mode</h3>
              <p>Experiment freely with any budget</p>
              <ul>
                <li>Customizable starting budget</li>
                <li>Control traffic mix manually</li>
                <li>No game over conditions</li>
                <li>Perfect for learning & testing</li>
              </ul>
            </button>
          </div>
        </div>

        {selectedMode === 'SANDBOX' && (
          <div className="menu-section">
            <h2>Starting Budget</h2>
            <div className="budget-input">
              <input
                type="range"
                min="100"
                max="10000"
                step="100"
                value={initialBudget}
                onChange={(e) => setInitialBudget(Number(e.target.value))}
                disabled={isCreating}
              />
              <span className="budget-display">${initialBudget}</span>
            </div>
          </div>
        )}

        {error && (
          <div className="error-message">
            ❌ {error}
          </div>
        )}

        <button
          className="start-button"
          onClick={handleStartGame}
          disabled={isCreating}
        >
          {isCreating ? '⏳ Creating Game...' : '🚀 Start Game'}
        </button>

        <div className="menu-footer">
          <p>💡 Tip: Start with a WAF to block malicious traffic!</p>
        </div>
      </div>
    </div>
  );
}