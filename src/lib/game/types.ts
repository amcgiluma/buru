export type DeckType = "spanish" | "french";
export type LifeMode = "normal" | "extreme";
export type TieRule = "diego" | "lete";
export type PlayerStatus = "active" | "eliminated" | "disconnected";
export type RoomStatus = "lobby" | "bidding" | "playing" | "hand_result" | "game_over";
export type GamePhase = "bidding" | "playing" | "trick_result" | "hand_result" | "game_over";

export type GameSettings = {
  deckType: DeckType;
  lifeMode: LifeMode;
  tieRule: TieRule;
  initialLives: number;
  minPlayers: number;
  maxPlayers: number;
};

export type GamePlayer = {
  id: string;
  name: string;
  seat: number;
  lives: number;
  status: PlayerStatus;
  isHost: boolean;
};

export type Card = {
  id: string;
  deckType: DeckType;
  suit: string;
  rank: string;
  label: string;
  value: number;
};

export type HiddenCard = Partial<Card> & {
  id: string;
  hidden?: boolean;
};

export type PlayedCard = {
  playerId: string;
  card: Card;
};

export type GameState = {
  phase: GamePhase;
  settings: GameSettings;
  players: GamePlayer[];
  dealerSeat: number;
  leaderPlayerId: string;
  currentTurnPlayerId: string;
  handIndex: number;
  handSize: number;
  deck: Card[];
  hands: Record<string, Card[]>;
  bids: Record<string, number>;
  tricksWon: Record<string, number>;
  currentTrick: PlayedCard[];
  completedTricks: PlayedCard[][];
  losses: Record<string, LifeLoss>;
  lastTrickWinnerPlayerId?: string;
  winnerId?: string;
};

export type PublicGameState = Omit<GameState, "hands"> & {
  hands: Record<string, HiddenCard[]>;
};

export type LifeLoss = {
  amount: number;
  phrase: string;
};

export type BidValidationInput = {
  bid: number;
  handSize: number;
  existingBids: Record<string, number>;
  playerOrder: string[];
  playerId: string;
};

export type ValidationResult = {
  valid: boolean;
  reason?: string;
};

export type ResolveHandResult = {
  players: GamePlayer[];
  losses: Record<string, LifeLoss>;
  winnerId?: string;
};
