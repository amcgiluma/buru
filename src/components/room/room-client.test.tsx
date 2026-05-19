import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { GameTable } from "./room-client";
import type { Card, GameState } from "@/lib/game/types";
import type { RoomSnapshot } from "@/lib/rooms/types";

describe("GameTable", () => {
  it("shows the player's cards while choosing how many bazas they expect to win", () => {
    render(<GameTable snapshot={biddingSnapshot()} playerId="p1" onAction={vi.fn()} />);

    expect(screen.getByText("Cuantas bazas crees que ganaras?")).toBeInTheDocument();
    expect(screen.getByLabelText("12 oros")).toBeInTheDocument();
    expect(screen.getByLabelText("7 copas")).toBeInTheDocument();
    expect(screen.getAllByText("Bazas: -").length).toBeGreaterThan(0);
  });
});

function biddingSnapshot(): RoomSnapshot {
  const players = [
    player("p1", "Ana", 0, true),
    player("p2", "Beto", 1, false),
    player("p3", "Cris", 2, false),
  ];
  const gameState: GameState = {
    phase: "bidding",
    settings: {
      deckType: "spanish",
      lifeMode: "normal",
      tieRule: "diego",
      initialLives: 4,
      minPlayers: 3,
      maxPlayers: 6,
    },
    players,
    dealerSeat: 0,
    leaderPlayerId: "p1",
    currentTurnPlayerId: "p1",
    handIndex: 0,
    handSize: 2,
    deck: [],
    hands: {
      p1: [card("oros", "12", 9), card("copas", "7", 6)],
      p2: [{ id: "hidden-p2-1", hidden: true }],
      p3: [{ id: "hidden-p3-1", hidden: true }],
    },
    bids: {},
    tricksWon: { p1: 0, p2: 0, p3: 0 },
    currentTrick: [],
    completedTricks: [],
    losses: {},
  };

  return {
    room: {
      id: "room-1",
      code: "ABCDE",
      status: "bidding",
      settings: gameState.settings,
      gameState,
      version: 1,
      createdAt: "2026-05-20T00:00:00.000Z",
      updatedAt: "2026-05-20T00:00:00.000Z",
    },
    players,
  };
}

function player(id: string, name: string, seat: number, isHost: boolean) {
  return {
    id,
    roomId: "room-1",
    name,
    seat,
    isHost,
    lives: 4,
    status: "active" as const,
    createdAt: "2026-05-20T00:00:00.000Z",
    updatedAt: "2026-05-20T00:00:00.000Z",
  };
}

function card(suit: string, rank: string, value: number): Card {
  return {
    id: `spanish-${suit}-${rank}`,
    deckType: "spanish",
    suit,
    rank,
    label: rank,
    value,
  };
}
