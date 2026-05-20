import type {
  BidValidationInput,
  Card,
  DeckType,
  GamePlayer,
  GameSettings,
  GameState,
  LifeMode,
  LifeLoss,
  PlayedCard,
  PublicGameState,
  ResolveHandResult,
  TieRule,
  ValidationResult,
} from "./types";

const SPANISH_SUITS = ["oros", "copas", "espadas", "bastos"];
const FRENCH_SUITS = ["hearts", "diamonds", "clubs", "spades"];
const SPANISH_RANKS = ["1", "12", "11", "10", "7", "6", "5", "4", "3", "2"];
const FRENCH_RANKS = ["A", "K", "Q", "J", "10", "9", "8", "7", "6", "5", "4", "3", "2"];

export const DEFAULT_SETTINGS: GameSettings = {
  deckType: "spanish",
  lifeMode: "normal",
  tieRule: "diego",
  initialLives: 4,
  minPlayers: 3,
  maxPlayers: 6,
};

export function buildDeck(deckType: DeckType): Card[] {
  const suits = deckType === "spanish" ? SPANISH_SUITS : FRENCH_SUITS;
  const ranks = deckType === "spanish" ? SPANISH_RANKS : FRENCH_RANKS;

  return suits.flatMap((suit) =>
    ranks.map((rank, index) => ({
      id: `${deckType}-${suit}-${rank}`,
      deckType,
      suit,
      rank,
      label: rank,
      value: ranks.length - index,
    })),
  );
}

export function shuffleDeck(deck: Card[], seed = Date.now().toString()): Card[] {
  const shuffled = [...deck];
  let state = hashSeed(seed);

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    state = (state * 1664525 + 1013904223) % 4294967296;
    const swapIndex = state % (index + 1);
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }

  return shuffled;
}

export function dealHand(players: GamePlayer[], deck: Card[], handSize: number) {
  const hands: Record<string, Card[]> = Object.fromEntries(players.map((player) => [player.id, []]));
  const activePlayers = sortActivePlayers(players);
  let cursor = 0;

  for (let round = 0; round < handSize; round += 1) {
    for (const player of activePlayers) {
      const nextCard = deck[cursor];
      if (!nextCard) {
        throw new Error("No hay cartas suficientes para repartir la mano.");
      }
      hands[player.id].push(nextCard);
      cursor += 1;
    }
  }

  return {
    hands,
    remainingDeck: deck.slice(cursor),
  };
}

export function getNextHandSize(handIndex: number): number {
  const pattern = [5, 4, 3, 2, 1, 2, 3, 4];
  return pattern[handIndex % pattern.length];
}

export function validateBid(input: BidValidationInput): ValidationResult {
  if (!Number.isInteger(input.bid) || input.bid < 0 || input.bid > input.handSize) {
    return { valid: false, reason: "Las bazas deben estar entre 0 y el numero de cartas." };
  }

  const isLastBidder = input.playerOrder[input.playerOrder.length - 1] === input.playerId;
  const total = Object.values(input.existingBids).reduce((sum, bid) => sum + bid, 0) + input.bid;

  if (isLastBidder && total === input.handSize) {
    return {
      valid: false,
      reason: `No puedes declarar ${input.bid} bazas: eres el ultimo en declarar y la suma seria exactamente ${input.handSize}, igual que las cartas de la mano.`,
    };
  }

  return { valid: true };
}

export function validateCardPlay(hand: Card[], cardId: string): ValidationResult {
  return hand.some((card) => card.id === cardId)
    ? { valid: true }
    : { valid: false, reason: "Esa carta no esta en tu mano." };
}

export function resolveTrick(cards: PlayedCard[], tieRule: TieRule): PlayedCard {
  if (cards.length === 0) {
    throw new Error("No se puede resolver una baza vacia.");
  }

  return cards.reduce((winner, played) => {
    if (played.card.value > winner.card.value) return played;
    if (played.card.value === winner.card.value && tieRule === "lete") return played;
    return winner;
  }, cards[0]);
}

export function resolveHand(
  players: GamePlayer[],
  bids: Record<string, number>,
  tricksWon: Record<string, number>,
  lifeMode: LifeMode,
): ResolveHandResult {
  const losses: Record<string, LifeLoss> = {};
  const updatedPlayers = players.map((player) => {
    if (player.status === "eliminated") return player;

    const bid = bids[player.id] ?? 0;
    const won = tricksWon[player.id] ?? 0;
    const difference = Math.abs(won - bid);
    const loss = difference === 0 ? 0 : lifeMode === "normal" ? 1 : difference;
    const nextLives = Math.max(0, player.lives - loss);

    if (loss > 0) {
      losses[player.id] = {
        amount: loss,
        phrase: getBuruStatus(nextLives),
      };
    }

    const status = nextLives <= 0 ? ("eliminated" as const) : player.status;

    return {
      ...player,
      lives: nextLives,
      status,
    };
  });

  const alive = updatedPlayers.filter((player) => player.lives > 0 && player.status !== "eliminated");

  return {
    players: updatedPlayers,
    losses,
    winnerId: alive.length === 1 ? alive[0].id : undefined,
  };
}

export function getBuruStatus(lives: number): string {
  if (lives <= 0) return "BURU";
  if (lives === 1) return "BUR";
  if (lives === 2) return "BU";
  if (lives === 3) return "B";
  return "";
}

export function createInitialGameState(players: GamePlayer[], settings: GameSettings, seed = "buru"): GameState {
  const normalizedPlayers = sortPlayers(players).map((player) => ({
    ...player,
    lives: settings.initialLives,
    status: "active" as const,
  }));
  const handSize = getNextHandSize(0);
  const deck = shuffleDeck(buildDeck(settings.deckType), seed);
  const dealt = dealHand(normalizedPlayers, deck, handSize);
  const dealer = normalizedPlayers[0];

  return {
    phase: "bidding",
    settings,
    players: normalizedPlayers,
    dealerSeat: dealer.seat,
    leaderPlayerId: dealer.id,
    currentTurnPlayerId: dealer.id,
    handIndex: 0,
    handSize,
    deck: dealt.remainingDeck,
    hands: dealt.hands,
    bids: {},
    tricksWon: Object.fromEntries(normalizedPlayers.map((player) => [player.id, 0])),
    currentTrick: [],
    completedTricks: [],
    losses: {},
    lastTrickWinnerPlayerId: undefined,
  };
}

export function startNextHand(state: GameState, seed = Date.now().toString()): GameState {
  const activePlayers = sortActivePlayers(state.players);
  const handIndex = state.handIndex + 1;
  const handSize = getNextHandSize(handIndex);
  const deck = shuffleDeck(buildDeck(state.settings.deckType), seed);
  const dealt = dealHand(activePlayers, deck, handSize);
  const dealer = activePlayers[(handIndex + state.dealerSeat) % activePlayers.length] ?? activePlayers[0];

  return {
    ...state,
    phase: "bidding",
    handIndex,
    handSize,
    dealerSeat: dealer.seat,
    leaderPlayerId: dealer.id,
    currentTurnPlayerId: dealer.id,
    deck: dealt.remainingDeck,
    hands: dealt.hands,
    bids: {},
    tricksWon: Object.fromEntries(activePlayers.map((player) => [player.id, 0])),
    currentTrick: [],
    completedTricks: [],
    losses: {},
    lastTrickWinnerPlayerId: undefined,
    winnerId: undefined,
  };
}

export function getTurnOrder(players: GamePlayer[], startPlayerId: string): string[] {
  const activePlayers = sortActivePlayers(players);
  const startIndex = activePlayers.findIndex((player) => player.id === startPlayerId);
  const ordered = startIndex === -1 ? activePlayers : [...activePlayers.slice(startIndex), ...activePlayers.slice(0, startIndex)];
  return ordered.map((player) => player.id);
}

export function getNextPlayerId(players: GamePlayer[], currentPlayerId: string): string {
  const order = getTurnOrder(players, currentPlayerId);
  return order[1] ?? order[0];
}

export function placeBid(state: GameState, playerId: string, bid: number): GameState {
  const order = getTurnOrder(state.players, state.leaderPlayerId);
  const validation = validateBid({
    bid,
    handSize: state.handSize,
    existingBids: state.bids,
    playerOrder: order,
    playerId,
  });

  if (state.phase !== "bidding") throw new Error("La sala no esta en fase de bazas.");
  if (state.currentTurnPlayerId !== playerId) throw new Error("No es tu turno.");
  if (!validation.valid) throw new Error(validation.reason);

  const bids = { ...state.bids, [playerId]: bid };
  const nextTurn = getNextPlayerId(state.players, playerId);
  const allBidsPlaced = order.every((id) => bids[id] !== undefined);

  return {
    ...state,
    bids,
    phase: allBidsPlaced ? "playing" : "bidding",
    currentTurnPlayerId: allBidsPlaced ? state.leaderPlayerId : nextTurn,
  };
}

export function playCard(state: GameState, playerId: string, cardId: string): GameState {
  if (state.phase !== "playing") throw new Error("La sala no esta en fase de juego.");
  if (state.currentTurnPlayerId !== playerId) throw new Error("No es tu turno.");

  const hand = state.hands[playerId] ?? [];
  const validation = validateCardPlay(hand, cardId);
  if (!validation.valid) throw new Error(validation.reason);

  const card = hand.find((candidate) => candidate.id === cardId);
  if (!card) throw new Error("Carta no encontrada.");

  const hands = {
    ...state.hands,
    [playerId]: hand.filter((candidate) => candidate.id !== cardId),
  };
  const currentTrick = [...state.currentTrick, { playerId, card }];
  const activeCount = sortActivePlayers(state.players).length;

  if (currentTrick.length < activeCount) {
    return {
      ...state,
      hands,
      currentTrick,
      currentTurnPlayerId: getNextPlayerId(state.players, playerId),
    };
  }

  const winner = resolveTrick(currentTrick, state.settings.tieRule);
  const tricksWon = {
    ...state.tricksWon,
    [winner.playerId]: (state.tricksWon[winner.playerId] ?? 0) + 1,
  };
  const completedTricks = [...state.completedTricks, currentTrick];

  return {
    ...state,
    phase: "trick_result",
    hands,
    currentTrick,
    completedTricks,
    tricksWon,
    leaderPlayerId: winner.playerId,
    currentTurnPlayerId: winner.playerId,
    lastTrickWinnerPlayerId: winner.playerId,
  };
}

export function continueTrick(state: GameState): GameState {
  if (state.phase !== "trick_result") throw new Error("La sala no esta mostrando el resultado de una baza.");

  const winnerPlayerId = state.lastTrickWinnerPlayerId ?? state.leaderPlayerId;
  const handComplete = state.completedTricks.length >= state.handSize;

  if (!handComplete) {
    return {
      ...state,
      phase: "playing",
      currentTrick: [],
      leaderPlayerId: winnerPlayerId,
      currentTurnPlayerId: winnerPlayerId,
      lastTrickWinnerPlayerId: undefined,
    };
  }

  const result = resolveHand(state.players, state.bids, state.tricksWon, state.settings.lifeMode);

  return {
    ...state,
    phase: result.winnerId ? "game_over" : "hand_result",
    players: result.players,
    currentTrick: [],
    losses: result.losses,
    winnerId: result.winnerId,
    leaderPlayerId: winnerPlayerId,
    currentTurnPlayerId: winnerPlayerId,
    lastTrickWinnerPlayerId: undefined,
  };
}

export function hidePrivateState(state: GameState, viewerPlayerId: string): PublicGameState {
  const hands = Object.fromEntries(
    Object.entries(state.hands).map(([playerId, hand]) => [
      playerId,
      hand.map((card) => {
        if (playerId !== viewerPlayerId) {
          return { id: card.id, hidden: true };
        }
        return card;
      }),
    ]),
  );

  return {
    ...state,
    hands,
  };
}

export function sortPlayers(players: GamePlayer[]): GamePlayer[] {
  return [...players].sort((left, right) => left.seat - right.seat);
}

export function sortActivePlayers(players: GamePlayer[]): GamePlayer[] {
  return sortPlayers(players).filter((player) => player.status !== "eliminated" && player.lives > 0);
}

function hashSeed(seed: string): number {
  return [...seed].reduce((hash, char) => (hash * 31 + char.charCodeAt(0)) >>> 0, 2166136261);
}
