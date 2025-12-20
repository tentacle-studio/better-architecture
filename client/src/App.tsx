import { useState } from 'react';
import { Game } from './Game';
import { MainMenu } from './components/MainMenu';
import './App.css';

export default function App() {
  const [currentGameId, setCurrentGameId] = useState<string | null>(null);

  const handleStartGame = (gameId: string) => {
    console.log('Starting game with ID:', gameId);
    setCurrentGameId(gameId);
  };

  const handleExitGame = () => {
    console.log('Exiting game');
    setCurrentGameId(null);
  };

  // Conditional render - only ONE component at a time
  if (currentGameId) {
    return <Game gameId={currentGameId} onExit={handleExitGame} />;
  }

  return <MainMenu onStartGame={handleStartGame} />;
}
