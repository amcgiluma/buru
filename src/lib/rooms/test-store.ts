import type { GameState } from "@/lib/game/types";
import type { PlayerRecord, RoomRecord, RoomSnapshot, RoomStore } from "./types";

export class MemoryRoomStore implements RoomStore {
  private rooms = new Map<string, RoomRecord>();
  private players = new Map<string, PlayerRecord>();
  private tokenHashes = new Map<string, string>();
  private counter = 0;

  async createRoomWithHost(input: {
    code: string;
    settings: RoomRecord["settings"];
    hostName: string;
    tokenHash: string;
  }): Promise<RoomSnapshot> {
    const now = new Date().toISOString();
    const room: RoomRecord = {
      id: this.id("room"),
      code: input.code,
      status: "lobby",
      settings: input.settings,
      gameState: {} as GameState,
      version: 0,
      createdAt: now,
      updatedAt: now,
    };
    const host: PlayerRecord = {
      id: this.id("player"),
      roomId: room.id,
      name: input.hostName,
      seat: 0,
      lives: input.settings.initialLives,
      status: "active",
      isHost: true,
      createdAt: now,
      updatedAt: now,
    };
    this.rooms.set(room.id, room);
    this.players.set(host.id, host);
    this.tokenHashes.set(host.id, input.tokenHash);
    return this.snapshot(room.code);
  }

  async getRoomByCode(code: string): Promise<RoomSnapshot | null> {
    const room = [...this.rooms.values()].find((candidate) => candidate.code === code.toUpperCase());
    if (!room) return null;
    return this.snapshot(room.code);
  }

  async verifyPlayerToken(roomId: string, playerId: string, tokenHash: string): Promise<boolean> {
    const player = this.players.get(playerId);
    return Boolean(player && player.roomId === roomId && this.tokenHashes.get(playerId) === tokenHash);
  }

  async addPlayer(roomId: string, name: string, seat: number, tokenHash: string): Promise<PlayerRecord> {
    const room = this.rooms.get(roomId);
    if (!room) throw new Error("Sala no encontrada.");
    const now = new Date().toISOString();
    const player: PlayerRecord = {
      id: this.id("player"),
      roomId,
      name,
      seat,
      lives: room.settings.initialLives,
      status: "active",
      isHost: false,
      createdAt: now,
      updatedAt: now,
    };
    this.players.set(player.id, player);
    this.tokenHashes.set(player.id, tokenHash);
    return player;
  }

  async updateRoom(
    roomId: string,
    patch: Partial<Pick<RoomRecord, "status" | "settings" | "gameState" | "version">>,
    expectedVersion?: number,
  ): Promise<void> {
    const room = this.rooms.get(roomId);
    if (!room) throw new Error("Sala no encontrada.");
    if (expectedVersion !== undefined && room.version !== expectedVersion) {
      throw new Error("Version obsoleta. Refresca el estado de la sala.");
    }
    this.rooms.set(roomId, { ...room, ...patch, updatedAt: new Date().toISOString() });
  }

  async updatePlayer(playerId: string, patch: Partial<Pick<PlayerRecord, "lives" | "status">>): Promise<void> {
    const player = this.players.get(playerId);
    if (!player) throw new Error("Jugador no encontrado.");
    this.players.set(playerId, { ...player, ...patch, updatedAt: new Date().toISOString() });
  }

  async addEvent(): Promise<void> {
    return undefined;
  }

  private async snapshot(code: string): Promise<RoomSnapshot> {
    const room = [...this.rooms.values()].find((candidate) => candidate.code === code.toUpperCase());
    if (!room) throw new Error("Sala no encontrada.");
    return {
      room: { ...room, gameState: room.gameState as GameState },
      players: [...this.players.values()].filter((player) => player.roomId === room.id).sort((a, b) => a.seat - b.seat),
    };
  }

  private id(prefix: string): string {
    this.counter += 1;
    return `${prefix}_${this.counter}`;
  }
}
