
import React, { useState, useEffect, useCallback } from 'react';
import { GameStateFromAI, StoryLogEntry } from './types';
import { getInitialScene, getNextScene, generateImage } from './services/geminiService';
import ImageDisplay from './components/ImageDisplay';
import SceneDisplay from './components/SceneDisplay';
import ChoicesList from './components/ChoicesList';
import LoadingIndicator from './components/LoadingIndicator';
import ErrorMessage from './components/ErrorMessage';
import GameStartScreen from './components/GameStartScreen';
import GameOverScreen from './components/GameOverScreen';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameStateFromAI | null>(null);
  const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(null);
  const [storyLog, setStoryLog] = useState<string[]>([]); // Log of scene descriptions for context
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isImageLoading, setIsImageLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [gameStarted, setGameStarted] = useState<boolean>(false);
  const [apiKeyMissing, setApiKeyMissing] = useState<boolean>(false);

  useEffect(() => {
    if (!process.env.API_KEY) {
      setApiKeyMissing(true);
      setError("API Key is missing. Please ensure the API_KEY environment variable is set.");
    }
  }, []);

  const handleStartGame = useCallback(async (theme: string) => {
    if (apiKeyMissing) return;
    setIsLoading(true);
    setError(null);
    setStoryLog([]);
    setCurrentImageUrl(null);
    try {
      const initialData = await getInitialScene(theme);
      if (initialData) {
        setGameState(initialData);
        setStoryLog([initialData.sceneDescription]);
        setGameStarted(true);
        if (initialData.imagePrompt) {
          setIsImageLoading(true);
          const imageUrl = await generateImage(initialData.imagePrompt);
          setCurrentImageUrl(imageUrl);
          setIsImageLoading(false);
        }
      } else {
        setError("Failed to initialize game: No data received from AI.");
      }
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "An unknown error occurred while starting the game.");
    } finally {
      setIsLoading(false);
    }
  }, [apiKeyMissing]);

  const handleChoiceSelected = useCallback(async (choice: string) => {
    if (!gameState || apiKeyMissing) return;

    setIsLoading(true);
    setError(null);
    setCurrentImageUrl(null); // Clear previous image while loading new one

    // Add choice to a more detailed log if needed, for now, storyLog only has scene descriptions.
    // const newStoryLog = [...storyLog, `Player chose: ${choice}`]; 
    // For simplicity, Gemini prompt uses current scene + player choice + N previous scenes.

    try {
      const nextData = await getNextScene(gameState.sceneDescription, choice, storyLog);
      if (nextData) {
        setGameState(nextData);
        if (!nextData.gameOver) {
          setStoryLog(prevLog => [...prevLog, nextData.sceneDescription]); // Add new scene to log
          if (nextData.imagePrompt) {
            setIsImageLoading(true);
            const imageUrl = await generateImage(nextData.imagePrompt);
            setCurrentImageUrl(imageUrl);
            setIsImageLoading(false);
          }
        } else {
           // Handle game over image if desired, e.g. a generic game over image or last scene's image
           if (nextData.imagePrompt) {
             setIsImageLoading(true);
             const imageUrl = await generateImage(nextData.imagePrompt);
             setCurrentImageUrl(imageUrl);
             setIsImageLoading(false);
           }
        }
      } else {
        setError("Failed to get next scene: No data received from AI.");
      }
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "An unknown error occurred while processing your choice.");
    } finally {
      setIsLoading(false);
    }
  }, [gameState, storyLog, apiKeyMissing]);

  const handleRestartGame = () => {
    setGameStarted(false);
    setGameState(null);
    setCurrentImageUrl(null);
    setStoryLog([]);
    setError(null);
    setIsLoading(false);
    setIsImageLoading(false);
  };

  if (apiKeyMissing && !gameStarted) {
     return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gray-900">
            <ErrorMessage message="CRITICAL ERROR: API Key is not configured. The application cannot function. Please set the API_KEY environment variable." />
        </div>
     );
  }
  
  if (!gameStarted) {
    return <GameStartScreen onStartGame={handleStartGame} isLoading={isLoading} />;
  }

  if (gameState?.gameOver) {
    return <GameOverScreen message={gameState.gameOverMessage} onRestart={handleRestartGame} />;
  }

  return (
    <div className="container mx-auto max-w-3xl p-4 min-h-screen flex flex-col">
      <header className="my-6 text-center">
        <h1 className="text-4xl font-bold text-purple-400">Gemini Adventure Weaver</h1>
      </header>
      
      <main className="flex-grow">
        <ErrorMessage message={error || (apiKeyMissing ? "API Key is missing, game functionality is limited." : "")} />

        {isLoading && !gameState?.sceneDescription && <LoadingIndicator />}
        
        {gameState && (
          <>
            <ImageDisplay imageUrl={currentImageUrl} altText={gameState.imagePrompt || "Scene image"} isLoading={isImageLoading} />
            <SceneDisplay description={gameState.sceneDescription} />
            {isLoading && gameState.sceneDescription && <LoadingIndicator/>}
            {!isLoading && <ChoicesList choices={gameState.choices} onChoiceSelected={handleChoiceSelected} disabled={isLoading} />}
          </>
        )}
      </main>
      <footer className="py-6 text-center text-sm text-gray-500">
        <p>Story and images dynamically generated by Google AI.</p>
      </footer>
    </div>
  );
};

export default App;
