export type GameMode = 'classic' | 'time';

export interface Block {
  id: string;
  value: number;
  isSelected: boolean;
}

export interface GameState {
  grid: (Block | null)[][]; // [row][col]
  targetSum: number;
  score: number;
  highScore: number;
  isGameOver: boolean;
  mode: GameMode;
  timeLeft: number; // For time mode
  level: number;
}
