export type CardColor = 'red' | 'green' | 'blue' | 'yellow' | 'wild';

export type LogEntry =
  | { type: 'game-started'; card: Card }
  | { type: 'starting-skip'; playerName: string }
  | { type: 'starting-reverse-skip' }
  | { type: 'direction-reversed-first'; playerName: string }
  | { type: 'starting-draw2'; playerName: string }
  | { type: 'uno-penalty'; playerName: string }
  | { type: 'card-played'; playerName: string; card: Card }
  | { type: 'player-wins'; playerName: string }
  | { type: 'player-skipped'; playerName: string }
  | { type: 'direction-reversed' }
  | { type: 'plays-again'; playerName: string }
  | { type: 'player-draws-skipped'; playerName: string; count: number }
  | { type: 'color-chosen'; playerName: string; color: CardColor }
  | { type: 'draw-pile-reshuffled' }
  | { type: 'player-draws-card'; playerName: string }
  | { type: 'player-cannot-play'; playerName: string }
  | { type: 'player-passes'; playerName: string }
  | { type: 'uno-called'; playerName: string }
  | { type: 'draw-pile-empty' };

export type CardValue =
  | '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9'
  | 'skip' | 'reverse' | 'draw2' | 'wild' | 'wild4';

export interface Card {
  id: string;
  color: CardColor;
  value: CardValue;
}

export type PlayerType = 'human' | 'ai';
export type AiDifficulty = 'easy' | 'medium';

export interface Player {
  id: string;
  name: string;
  type: PlayerType;
  difficulty?: AiDifficulty;
  hand: Card[];
  /** True if the player has pressed the UNO button before playing their second-to-last card */
  hasCalledUno: boolean;
}

/**
 * playing        — normal turn
 * choosing-color — current player just played a wild and must pick a color
 * drawn-card     — current player drew a card and must decide to play it or pass
 * game-over      — a player has emptied their hand
 */
export type GamePhase = 'playing' | 'choosing-color' | 'drawn-card' | 'game-over';

export type Direction = 1 | -1;

export interface GameState {
  players: Player[];
  drawPile: Card[];
  discardPile: Card[];
  currentPlayerIndex: number;
  direction: Direction;
  phase: GamePhase;
  /** Effective color in play (important when a wild is on top of discard) */
  currentColor: CardColor;
  winner: Player | null;
  /** The card that was just drawn; non-null only during the drawn-card phase */
  drawnCard: Card | null;
  /** Structured history of recent actions; rendered by ActionLog with i18n */
  log: LogEntry[];
}
