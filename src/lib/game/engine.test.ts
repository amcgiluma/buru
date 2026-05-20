import { describe, expect, it } from "vitest";
import {
  buildDeck,
  continueTrick,
  createInitialGameState,
  dealHand,
  getBuruStatus,
  getNextHandSize,
  hidePrivateState,
  playCard,
  resolveHand,
  resolveTrick,
  startNextHand,
  validateBid,
} from "./engine";
import type { Card, GamePlayer } from "./types";

const players: GamePlayer[] = [
  { id: "p1", name: "Ana", seat: 0, lives: 4, status: "active", isHost: true },
  { id: "p2", name: "Beto", seat: 1, lives: 4, status: "active", isHost: false },
  { id: "p3", name: "Cris", seat: 2, lives: 4, status: "active", isHost: false },
];

describe("BURU engine", () => {
  it("follows the 5 to 1 to 5 hand pattern", () => {
    const sizes = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(getNextHandSize);
    expect(sizes).toEqual([5, 4, 3, 2, 1, 2, 3, 4, 5, 4]);
  });

  it("creates spanish and french decks without jokers", () => {
    expect(buildDeck("spanish")).toHaveLength(40);
    expect(buildDeck("french")).toHaveLength(52);
    expect(new Set(buildDeck("spanish").map((card) => card.id)).size).toBe(40);
    expect(new Set(buildDeck("french").map((card) => card.id)).size).toBe(52);
  });

  it("creates exactly four cards per rank in each deck", () => {
    expect(countByRank(buildDeck("spanish"))).toEqual({
      "1": 4,
      "12": 4,
      "11": 4,
      "10": 4,
      "7": 4,
      "6": 4,
      "5": 4,
      "4": 4,
      "3": 4,
      "2": 4,
    });
    expect(countByRank(buildDeck("french"))).toEqual({
      A: 4,
      K: 4,
      Q: 4,
      J: 4,
      "10": 4,
      "9": 4,
      "8": 4,
      "7": 4,
      "6": 4,
      "5": 4,
      "4": 4,
      "3": 4,
      "2": 4,
    });
  });

  it("deals hands without duplicate cards", () => {
    const dealt = dealHand(players, buildDeck("spanish"), 5);
    const ids = Object.values(dealt.hands).flat().map((card) => card.id);
    expect(ids).toHaveLength(15);
    expect(new Set(ids).size).toBe(15);
    expect(dealt.remainingDeck).toHaveLength(25);
  });

  it("rejects the final bid when total bids equal the hand size", () => {
    const result = validateBid({
      bid: 2,
      handSize: 5,
      existingBids: { p1: 1, p2: 2 },
      playerOrder: ["p1", "p2", "p3"],
      playerId: "p3",
    });

    expect(result.valid).toBe(false);
    expect(result.reason).toBe(
      "No puedes declarar 2 bazas: eres el ultimo en declarar y la suma seria exactamente 5, igual que las cartas de la mano.",
    );
  });

  it("rejects bids outside the hand size", () => {
    expect(
      validateBid({
        bid: 6,
        handSize: 5,
        existingBids: {},
        playerOrder: ["p1", "p2", "p3"],
        playerId: "p1",
      }).valid,
    ).toBe(false);
  });

  it("resolves a trick by pure card value", () => {
    const winner = resolveTrick(
      [
        { playerId: "p1", card: card("french", "hearts", "K") },
        { playerId: "p2", card: card("french", "clubs", "A") },
        { playerId: "p3", card: card("french", "spades", "10") },
      ],
      "diego",
    );

    expect(winner.playerId).toBe("p2");
  });

  it("uses Diego tie rule to keep the first tied card", () => {
    const winner = resolveTrick(
      [
        { playerId: "p1", card: card("spanish", "oros", "7") },
        { playerId: "p2", card: card("spanish", "copas", "7") },
      ],
      "diego",
    );

    expect(winner.playerId).toBe("p1");
  });

  it("uses Lete tie rule to prefer the second tied card", () => {
    const winner = resolveTrick(
      [
        { playerId: "p1", card: card("spanish", "oros", "7") },
        { playerId: "p2", card: card("spanish", "copas", "7") },
      ],
      "lete",
    );

    expect(winner.playerId).toBe("p2");
  });

  it("hides the viewer card and reveals opponent cards while bidding a one-card hand", () => {
    const state = createInitialGameState(players, {
      deckType: "spanish",
      lifeMode: "normal",
      tieRule: "diego",
      initialLives: 4,
      minPlayers: 3,
      maxPlayers: 6,
    });
    const oneCardState = {
      ...state,
      handSize: 1,
      phase: "bidding" as const,
      hands: {
        p1: [card("spanish", "oros", "1")],
        p2: [card("spanish", "copas", "2")],
        p3: [card("spanish", "espadas", "3")],
      },
    };

    const publicForP1 = hidePrivateState(oneCardState, "p1");

    expect(publicForP1.hands.p1[0]).toEqual({ id: "spanish-oros-1", hidden: true });
    expect(publicForP1.hands.p2[0].rank).toBe("2");
    expect(publicForP1.hands.p3[0].rank).toBe("3");
  });

  it("hides the viewer card and reveals opponent cards while playing a one-card hand", () => {
    const state = createInitialGameState(players, {
      deckType: "spanish",
      lifeMode: "normal",
      tieRule: "diego",
      initialLives: 4,
      minPlayers: 3,
      maxPlayers: 6,
    });
    const oneCardState = {
      ...state,
      handSize: 1,
      phase: "playing" as const,
      hands: {
        p1: [card("spanish", "oros", "1")],
        p2: [card("spanish", "copas", "2")],
        p3: [card("spanish", "espadas", "3")],
      },
    };

    const publicForP1 = hidePrivateState(oneCardState, "p1");

    expect(publicForP1.hands.p1[0]).toEqual({ id: "spanish-oros-1", hidden: true });
    expect(publicForP1.hands.p2[0].rank).toBe("2");
    expect(publicForP1.hands.p3[0].rank).toBe("3");
  });

  it("maps lives to the persistent BURU status", () => {
    expect(getBuruStatus(4)).toBe("");
    expect(getBuruStatus(3)).toBe("B");
    expect(getBuruStatus(2)).toBe("BU");
    expect(getBuruStatus(1)).toBe("BUR");
    expect(getBuruStatus(0)).toBe("BURU");
  });

  it("resolves normal life loss and phrases", () => {
    const result = resolveHand(players, { p1: 1, p2: 0, p3: 2 }, { p1: 1, p2: 1, p3: 0 }, "normal");

    expect(result.players.find((player) => player.id === "p1")?.lives).toBe(4);
    expect(result.players.find((player) => player.id === "p2")?.lives).toBe(3);
    expect(result.losses.p2.phrase).toBe("B");
  });

  it("resolves extreme life loss and elimination", () => {
    const result = resolveHand(players, { p1: 0, p2: 0, p3: 0 }, { p1: 4, p2: 0, p3: 1 }, "extreme");

    expect(result.players.find((player) => player.id === "p1")?.lives).toBe(0);
    expect(result.players.find((player) => player.id === "p1")?.status).toBe("eliminated");
    expect(result.losses.p1.phrase).toBe("BURU");
  });

  it("detects the final winner when one player remains alive", () => {
    const almostOut = [
      { ...players[0], lives: 1 },
      { ...players[1], lives: 1 },
      { ...players[2], lives: 4 },
    ];
    const result = resolveHand(almostOut, { p1: 0, p2: 0, p3: 0 }, { p1: 1, p2: 2, p3: 0 }, "extreme");

    expect(result.winnerId).toBe("p3");
  });

  it("pauses with the completed trick visible after the final card is played", () => {
    const state = playableState({ handSize: 2 });

    const paused = playCard(state, "p3", "spanish-espadas-3");

    expect(paused.phase).toBe("trick_result");
    expect(paused.currentTrick).toHaveLength(3);
    expect(paused.completedTricks).toHaveLength(1);
    expect(paused.lastTrickWinnerPlayerId).toBe("p2");
    expect(paused.currentTurnPlayerId).toBe("p2");
    expect(paused.tricksWon.p2).toBe(1);
  });

  it("continues from a trick result into the next trick led by the winner", () => {
    const paused = playCard(playableState({ handSize: 2 }), "p3", "spanish-espadas-3");

    const continued = continueTrick(paused);

    expect(continued.phase).toBe("playing");
    expect(continued.currentTrick).toEqual([]);
    expect(continued.completedTricks).toHaveLength(1);
    expect(continued.leaderPlayerId).toBe("p2");
    expect(continued.currentTurnPlayerId).toBe("p2");
    expect(continued.lastTrickWinnerPlayerId).toBeUndefined();
  });

  it("continues from the final trick result into the hand result", () => {
    const paused = playCard(playableState({ handSize: 1 }), "p3", "spanish-espadas-3");

    const result = continueTrick(paused);

    expect(result.phase).toBe("hand_result");
    expect(result.currentTrick).toEqual([]);
    expect(result.losses.p1.phrase).toBe("B");
  });

  it("rotates the next hand starter one active player at a time", () => {
    const initial = createInitialGameState(players, {
      deckType: "spanish",
      lifeMode: "normal",
      tieRule: "diego",
      initialLives: 4,
      minPlayers: 3,
      maxPlayers: 6,
    });

    const secondHand = startNextHand({ ...initial, phase: "hand_result" as const }, "hand-2");
    const thirdHand = startNextHand({ ...secondHand, phase: "hand_result" as const }, "hand-3");
    const fourthHand = startNextHand({ ...thirdHand, phase: "hand_result" as const }, "hand-4");

    expect(initial.currentTurnPlayerId).toBe("p1");
    expect(secondHand.currentTurnPlayerId).toBe("p2");
    expect(thirdHand.currentTurnPlayerId).toBe("p3");
    expect(fourthHand.currentTurnPlayerId).toBe("p1");
  });

  it("rotates to the next active seat when the previous dealer was eliminated", () => {
    const state = createInitialGameState(players, {
        deckType: "spanish",
        lifeMode: "normal",
        tieRule: "diego",
        initialLives: 4,
        minPlayers: 3,
        maxPlayers: 6,
      });
    const stateAfterElimination = {
      ...state,
      players: state.players.map((player) =>
        player.id === "p2" ? { ...player, lives: 0, status: "eliminated" as const } : player,
      ),
      dealerSeat: 1,
      phase: "hand_result" as const,
    };

    const nextHand = startNextHand(stateAfterElimination, "after-elimination");

    expect(nextHand.currentTurnPlayerId).toBe("p3");
    expect(nextHand.dealerSeat).toBe(2);
  });
});

function card(deckType: "spanish" | "french", suit: string, rank: string): Card {
  return {
    id: `${deckType}-${suit}-${rank}`,
    deckType,
    suit,
    rank,
    label: rank,
    value: rank === "A" || rank === "1" ? 14 : Number(rank) || 13,
  };
}

function countByRank(deck: Card[]): Record<string, number> {
  return deck.reduce<Record<string, number>>((counts, current) => {
    counts[current.rank] = (counts[current.rank] ?? 0) + 1;
    return counts;
  }, {});
}

function playableState({ handSize }: { handSize: number }) {
  return {
    phase: "playing" as const,
    settings: {
      deckType: "spanish" as const,
      lifeMode: "normal" as const,
      tieRule: "diego" as const,
      initialLives: 4,
      minPlayers: 3,
      maxPlayers: 6,
    },
    players,
    dealerSeat: 0,
    leaderPlayerId: "p1",
    currentTurnPlayerId: "p3",
    handIndex: 0,
    handSize,
    deck: [],
    hands: {
      p1: [],
      p2: [],
      p3: [card("spanish", "espadas", "3")],
    },
    bids: { p1: 1, p2: 1, p3: 0 },
    tricksWon: { p1: 0, p2: 0, p3: 0 },
    currentTrick: [
      { playerId: "p1", card: card("spanish", "oros", "2") },
      { playerId: "p2", card: card("spanish", "copas", "12") },
    ],
    completedTricks: [],
    losses: {},
  };
}
