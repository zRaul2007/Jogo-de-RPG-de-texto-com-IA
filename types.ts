
export interface GameStateFromAI {
  sceneDescription: string;
  imagePrompt: string;
  choices: string[];
  gameOver: boolean;
  gameOverMessage: string | null;
}

// Represents either a scene description or a player choice for the story log
export interface StoryLogEntry {
  type: 'scene' | 'choice';
  text: string;
}
