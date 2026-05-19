import { nanoid } from "nanoid";
import { createHash, randomBytes } from "node:crypto";
import { createInitialGameState, placeBid, playCard, startNextHand } from "@/lib/game/engine";
import type { GameSettings, RoomStatus } from "@/lib/game/types";
import type { GamePlayer } from "@/lib/game/types";
import type { PlayerRecord, RoomAction, RoomSnapshot, RoomStore } from "./types";

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export async function createRoom(
  store: RoomStore,
  input: { hostName: string; origin?: string; settings?: Partial<GameSettings> },
) {
  const hostName = normalizeName(input.hostName);
  if (!hostName) throw new Error("El nombre no puede estar vacio.");

  const settings = normalizeSettings(input.settings);
  const code = createRoomCode();
  const playerToken = createPlayerToken();
  const snapshot = await store.createRoomWithHost({ code, settings, hostName, tokenHash: hashPlayerToken(playerToken) });
  await store.addEvent({ roomId: snapshot.room.id, playerId: snapshot.players[0].id, type: "room_created" });

  return {
    ...snapshot,
    player: snapshot.players[0],
    playerToken,
    inviteUrl: input.origin ? `${input.origin.replace(/\/$/, "")}/rooms/${snapshot.room.code}` : `/rooms/${snapshot.room.code}`,
  };
}

export async function joinRoom(store: RoomStore, code: string, input: { name: string }) {
  const name = normalizeName(input.name);
  if (!name) throw new Error("El nombre no puede estar vacio.");

  const snapshot = await requireRoom(store, code);
  if (snapshot.room.status !== "lobby") throw new Error("La sala ya ha empezado.");
  if (snapshot.players.some((player) => player.name.toLowerCase() === name.toLowerCase())) {
    throw new Error("Ya existe un jugador con ese nombre.");
  }
  if (snapshot.players.length >= snapshot.room.settings.maxPlayers) {
    throw new Error("La sala esta llena.");
  }

  const playerToken = createPlayerToken();
  const player = await store.addPlayer(snapshot.room.id, name, nextSeat(snapshot.players), hashPlayerToken(playerToken));
  await store.addEvent({ roomId: snapshot.room.id, playerId: player.id, type: "player_joined" });
  const updated = await requireRoom(store, code);

  return { ...updated, player, playerToken };
}

export async function updateRoomSettings(
  store: RoomStore,
  code: string,
  playerId: string,
  settings: Partial<GameSettings>,
): Promise<RoomSnapshot> {
  const snapshot = await requireRoom(store, code);
  const player = requirePlayer(snapshot, playerId);
  if (!player.isHost) throw new Error("Solo el host puede cambiar settings.");
  if (snapshot.room.status !== "lobby") throw new Error("La partida ya esta bloqueada.");

  const nextSettings = normalizeSettings({ ...snapshot.room.settings, ...settings });
  await store.updateRoom(snapshot.room.id, { settings: nextSettings, version: snapshot.room.version + 1 }, snapshot.room.version);
  await store.addEvent({ roomId: snapshot.room.id, playerId, type: "settings_updated", payload: nextSettings });
  return requireRoom(store, code);
}

export async function startRoom(
  store: RoomStore,
  code: string,
  playerId: string,
  options?: { forceHandSize?: number },
): Promise<RoomSnapshot> {
  const snapshot = await requireRoom(store, code);
  const player = requirePlayer(snapshot, playerId);
  if (!player.isHost) throw new Error("Solo el host puede empezar la partida.");
  if (snapshot.room.status !== "lobby") throw new Error("La partida ya ha empezado.");
  if (snapshot.players.length < snapshot.room.settings.minPlayers) {
    throw new Error(`Necesitas al menos ${snapshot.room.settings.minPlayers} jugadores.`);
  }

  let state = createInitialGameState(snapshot.players, snapshot.room.settings, `${snapshot.room.code}-${snapshot.room.version}`);
  if (options?.forceHandSize) {
    state = {
      ...state,
      handSize: options.forceHandSize,
      hands: Object.fromEntries(
        Object.entries(state.hands).map(([id, hand]) => [id, hand.slice(0, options.forceHandSize)]),
      ),
    };
  }

  await store.updateRoom(snapshot.room.id, {
    status: "bidding",
    gameState: state,
    version: snapshot.room.version + 1,
  }, snapshot.room.version);
  await store.addEvent({ roomId: snapshot.room.id, playerId, type: "game_started" });

  return requireRoom(store, code);
}

export async function performRoomAction(
  store: RoomStore,
  code: string,
  playerId: string,
  action: RoomAction,
): Promise<RoomSnapshot> {
  const snapshot = await requireRoom(store, code);
  const player = requirePlayer(snapshot, playerId);
  if ((action.type === "place_bid" || action.type === "play_card") && (player.status === "eliminated" || player.lives <= 0)) {
    throw new Error("Los jugadores eliminados no pueden actuar.");
  }

  if (action.version !== snapshot.room.version) {
    throw new Error("Version obsoleta. Refresca el estado de la sala.");
  }

  let nextState = snapshot.room.gameState;

  if (action.type === "place_bid") {
    nextState = placeBid(nextState, playerId, action.bid);
  }

  if (action.type === "play_card") {
    nextState = playCard(nextState, playerId, action.cardId);
  }

  if (action.type === "next_hand") {
    if (nextState.phase !== "hand_result") throw new Error("La mano actual no ha terminado.");
    nextState = startNextHand(nextState, `${snapshot.room.code}-${snapshot.room.version}`);
  }

  if (action.type === "resolve_trick") {
    throw new Error("Las bazas se resuelven automaticamente al jugar la ultima carta.");
  }

  if (action.type === "leave_room") {
    await store.updatePlayer(playerId, { status: "disconnected" });
    await store.addEvent({ roomId: snapshot.room.id, playerId, type: "player_left" });
    return requireRoom(store, code);
  }

  await persistPlayers(store, snapshot.players, nextState.players);
  await store.updateRoom(snapshot.room.id, {
    status: statusFromPhase(nextState.phase),
    gameState: nextState,
    version: snapshot.room.version + 1,
  }, snapshot.room.version);
  await store.addEvent({ roomId: snapshot.room.id, playerId, type: action.type, payload: actionPayload(action) });

  return requireRoom(store, code);
}

export async function requireRoom(store: RoomStore, code: string): Promise<RoomSnapshot> {
  const snapshot = await store.getRoomByCode(code.toUpperCase());
  if (!snapshot) throw new Error("Sala no encontrada.");
  return snapshot;
}

export function normalizeSettings(settings?: Partial<GameSettings>): GameSettings {
  const deckType = settings?.deckType === "french" ? "french" : "spanish";
  const lifeMode = settings?.lifeMode === "extreme" ? "extreme" : "normal";
  const tieRule = settings?.tieRule === "lete" ? "lete" : "diego";

  return {
    deckType,
    lifeMode,
    tieRule,
    initialLives: 4,
    minPlayers: 3,
    maxPlayers: 6,
  };
}

export async function verifyRoomPlayer(
  store: RoomStore,
  code: string,
  playerId: string | undefined,
  playerToken: string | undefined,
) {
  if (!playerId || !playerToken) return false;
  const snapshot = await store.getRoomByCode(code.toUpperCase());
  if (!snapshot) return false;
  return store.verifyPlayerToken(snapshot.room.id, playerId, hashPlayerToken(playerToken));
}

function normalizeName(name: string): string {
  return name.trim().replace(/\s+/g, " ").slice(0, 24);
}

function createRoomCode(): string {
  return nanoid(5)
    .split("")
    .map((char) => CODE_ALPHABET[char.charCodeAt(0) % CODE_ALPHABET.length])
    .join("");
}

function createPlayerToken(): string {
  return randomBytes(24).toString("base64url");
}

function hashPlayerToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function nextSeat(players: PlayerRecord[]): number {
  const seats = new Set(players.map((player) => player.seat));
  for (let seat = 0; seat < 6; seat += 1) {
    if (!seats.has(seat)) return seat;
  }
  return players.length;
}

function requirePlayer(snapshot: RoomSnapshot, playerId: string): PlayerRecord {
  const player = snapshot.players.find((candidate) => candidate.id === playerId);
  if (!player) throw new Error("Jugador no encontrado.");
  return player;
}

function statusFromPhase(phase: RoomSnapshot["room"]["gameState"]["phase"]): RoomStatus {
  if (phase === "bidding") return "bidding";
  if (phase === "playing") return "playing";
  if (phase === "game_over") return "game_over";
  return "hand_result";
}

async function persistPlayers(store: RoomStore, previous: PlayerRecord[], next: GamePlayer[]) {
  for (const player of next) {
    const before = previous.find((candidate) => candidate.id === player.id);
    if (!before || before.lives !== player.lives || before.status !== player.status) {
      await store.updatePlayer(player.id, { lives: player.lives, status: player.status });
    }
  }
}

function actionPayload(action: RoomAction): Record<string, unknown> {
  if (action.type === "place_bid") return { bid: action.bid };
  if (action.type === "play_card") return { cardId: action.cardId };
  return {};
}
