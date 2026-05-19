import { beforeEach, describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS } from "@/lib/game/engine";
import { MemoryRoomStore } from "./test-store";
import {
  createRoom,
  joinRoom,
  normalizeSettings,
  performRoomAction,
  startRoom,
  updateRoomSettings,
} from "./service";

let store: MemoryRoomStore;

beforeEach(() => {
  store = new MemoryRoomStore();
});

describe("room service", () => {
  it("creates a room with a host player and invite url", async () => {
    const result = await createRoom(store, { hostName: "Ana", origin: "http://localhost:3000" });

    expect(result.room.code).toMatch(/^[A-Z0-9]{5}$/);
    expect(result.players).toHaveLength(1);
    expect(result.players[0]).toMatchObject({ name: "Ana", seat: 0, isHost: true });
    expect(result.inviteUrl).toBe(`http://localhost:3000/rooms/${result.room.code}`);
  });

  it("joins players and rejects empty, duplicate or full rooms", async () => {
    const created = await createRoom(store, { hostName: "Ana" });
    await joinRoom(store, created.room.code, { name: "Beto" });

    await expect(joinRoom(store, created.room.code, { name: " " })).rejects.toThrow("nombre");
    await expect(joinRoom(store, created.room.code, { name: "beto" })).rejects.toThrow("existe");

    await joinRoom(store, created.room.code, { name: "Cris" });
    await joinRoom(store, created.room.code, { name: "Dani" });
    await joinRoom(store, created.room.code, { name: "Eli" });
    await joinRoom(store, created.room.code, { name: "Fran" });
    await expect(joinRoom(store, created.room.code, { name: "Gala" })).rejects.toThrow("llena");
  });

  it("allows only the host to change lobby settings", async () => {
    const created = await createRoom(store, { hostName: "Ana" });
    const joined = await joinRoom(store, created.room.code, { name: "Beto" });

    await expect(
      updateRoomSettings(store, created.room.code, joined.player.id, { lifeMode: "extreme" }),
    ).rejects.toThrow("host");

    const updated = await updateRoomSettings(store, created.room.code, created.player.id, { lifeMode: "extreme" });
    expect(updated.room.settings.lifeMode).toBe("extreme");
  });

  it("clamps settings to MVP limits", () => {
    expect(
      normalizeSettings({
        // @ts-expect-error crafted clients can send invalid values
        deckType: "wild",
        lifeMode: "extreme",
        tieRule: "lete",
        initialLives: 99,
        minPlayers: 1,
        maxPlayers: 20,
      }),
    ).toEqual({
      deckType: "spanish",
      lifeMode: "extreme",
      tieRule: "lete",
      initialLives: 4,
      minPlayers: 3,
      maxPlayers: 6,
    });
  });

  it("rejects starting with fewer than three players and rejects non-host start", async () => {
    const created = await createRoom(store, { hostName: "Ana" });
    const joined = await joinRoom(store, created.room.code, { name: "Beto" });

    await expect(startRoom(store, created.room.code, joined.player.id)).rejects.toThrow("host");
    await expect(startRoom(store, created.room.code, created.player.id)).rejects.toThrow("3");
  });

  it("starts a game with three players and blocks stale actions", async () => {
    const created = await roomWithThreePlayers();
    const started = await startRoom(store, created.room.code, created.hostId);

    expect(started.room.status).toBe("bidding");
    expect(started.room.version).toBe(1);
    expect(started.room.gameState.handSize).toBe(5);

    await expect(
      performRoomAction(store, created.room.code, created.hostId, {
        type: "place_bid",
        version: 0,
        bid: 1,
      }),
    ).rejects.toThrow("Version");
  });

  it("rejects action outside the current turn", async () => {
    const created = await roomWithThreePlayers();
    const started = await startRoom(store, created.room.code, created.hostId);
    const outOfTurn = started.players.find((player) => player.id !== started.room.gameState.currentTurnPlayerId);

    await expect(
      performRoomAction(store, created.room.code, outOfTurn!.id, {
        type: "place_bid",
        version: started.room.version,
        bid: 1,
      }),
    ).rejects.toThrow("turno");
  });

  it("runs a complete one-card hand through bids and plays", async () => {
    const created = await roomWithThreePlayers();
    await updateRoomSettings(store, created.room.code, created.hostId, DEFAULT_SETTINGS);
    const started = await startRoom(store, created.room.code, created.hostId, { forceHandSize: 1 });
    let snapshot = started;
    const order = snapshot.room.gameState.players.map((player) => player.id);

    snapshot = await performRoomAction(store, created.room.code, order[0], {
      type: "place_bid",
      version: snapshot.room.version,
      bid: 0,
    });
    snapshot = await performRoomAction(store, created.room.code, order[1], {
      type: "place_bid",
      version: snapshot.room.version,
      bid: 0,
    });
    snapshot = await performRoomAction(store, created.room.code, order[2], {
      type: "place_bid",
      version: snapshot.room.version,
      bid: 0,
    });

    expect(snapshot.room.status).toBe("playing");

    for (const playerId of order) {
      const cardId = snapshot.room.gameState.hands[playerId][0].id;
      snapshot = await performRoomAction(store, created.room.code, playerId, {
        type: "play_card",
        version: snapshot.room.version,
        cardId,
      });
    }

    expect(["hand_result", "game_over"]).toContain(snapshot.room.status);
    expect(snapshot.room.gameState.completedTricks).toHaveLength(1);
  });

  it("rejects bidding actions from eliminated players", async () => {
    const created = await roomWithThreePlayers();
    const started = await startRoom(store, created.room.code, created.hostId, { forceHandSize: 1 });
    const eliminated = started.room.gameState.currentTurnPlayerId;
    await store.updatePlayer(eliminated, { lives: 0, status: "eliminated" });

    await expect(
      performRoomAction(store, created.room.code, eliminated, {
        type: "place_bid",
        version: started.room.version,
        bid: 0,
      }),
    ).rejects.toThrow("Los jugadores eliminados no pueden actuar.");
  });
});

async function roomWithThreePlayers() {
  const created = await createRoom(store, { hostName: "Ana" });
  await joinRoom(store, created.room.code, { name: "Beto" });
  await joinRoom(store, created.room.code, { name: "Cris" });
  return {
    room: created.room,
    hostId: created.player.id,
  };
}
