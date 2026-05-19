import type { GamePlayer, GameSettings, GameState, RoomStatus } from "@/lib/game/types";

export type RoomRecord = {
  id: string;
  code: string;
  status: RoomStatus;
  settings: GameSettings;
  gameState: GameState | Record<string, never>;
  version: number;
  createdAt: string;
  updatedAt: string;
};

export type PlayerRecord = GamePlayer & {
  roomId: string;
  createdAt: string;
  updatedAt: string;
};

export type RoomEventRecord = {
  id: string;
  roomId: string;
  playerId?: string;
  type: string;
  payload: Record<string, unknown>;
  createdAt: string;
};

export type RoomSnapshot = {
  room: RoomRecord & { gameState: GameState };
  players: PlayerRecord[];
};

export type RawRoomSnapshot = {
  room: RoomRecord;
  players: PlayerRecord[];
};

export type RoomStore = {
  createRoomWithHost(input: {
    code: string;
    settings: GameSettings;
    hostName: string;
    tokenHash: string;
  }): Promise<RoomSnapshot>;
  getRoomByCode(code: string): Promise<RoomSnapshot | null>;
  verifyPlayerToken(roomId: string, playerId: string, tokenHash: string): Promise<boolean>;
  addPlayer(roomId: string, name: string, seat: number, tokenHash: string): Promise<PlayerRecord>;
  updateRoom(
    roomId: string,
    patch: Partial<Pick<RoomRecord, "status" | "settings" | "gameState" | "version">>,
    expectedVersion?: number,
  ): Promise<void>;
  updatePlayer(playerId: string, patch: Partial<Pick<PlayerRecord, "lives" | "status">>): Promise<void>;
  addEvent(input: {
    roomId: string;
    playerId?: string;
    type: string;
    payload?: Record<string, unknown>;
  }): Promise<void>;
};

export type RoomAction =
  | { type: "place_bid"; version: number; bid: number }
  | { type: "play_card"; version: number; cardId: string }
  | { type: "next_hand"; version: number }
  | { type: "resolve_trick"; version: number }
  | { type: "leave_room"; version: number };
