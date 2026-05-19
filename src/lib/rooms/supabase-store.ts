import type { SupabaseClient } from "@supabase/supabase-js";
import type { GameState } from "@/lib/game/types";
import type { PlayerRecord, RoomRecord, RoomSnapshot, RoomStore } from "./types";

type RoomRow = {
  id: string;
  code: string;
  status: RoomRecord["status"];
  settings: RoomRecord["settings"];
  game_state: GameState | Record<string, never>;
  version: number;
  created_at: string;
  updated_at: string;
};

type PlayerRow = {
  id: string;
  room_id: string;
  name: string;
  seat: number;
  lives: number;
  status: PlayerRecord["status"];
  is_host: boolean;
  created_at: string;
  updated_at: string;
};

export class SupabaseRoomStore implements RoomStore {
  constructor(private readonly supabase: SupabaseClient) {}

  async createRoomWithHost(input: {
    code: string;
    settings: RoomRecord["settings"];
    hostName: string;
    tokenHash: string;
  }): Promise<RoomSnapshot> {
    const { data: room, error: roomError } = await this.supabase
      .from("rooms")
      .insert({
        code: input.code,
        settings: input.settings,
        status: "lobby",
        game_state: {},
      })
      .select("*")
      .single<RoomRow>();

    if (roomError) throw new Error(roomError.message);

    const { error: playerError } = await this.supabase.from("players").insert({
      room_id: room.id,
      name: input.hostName,
      seat: 0,
      lives: input.settings.initialLives,
      status: "active",
      is_host: true,
      client_token_hash: input.tokenHash,
    });

    if (playerError) throw new Error(playerError.message);

    const snapshot = await this.getRoomByCode(room.code);
    if (!snapshot) throw new Error("No se pudo crear la sala.");
    return snapshot;
  }

  async getRoomByCode(code: string): Promise<RoomSnapshot | null> {
    const { data: room, error: roomError } = await this.supabase
      .from("rooms")
      .select("*")
      .eq("code", code.toUpperCase())
      .maybeSingle<RoomRow>();

    if (roomError) throw new Error(roomError.message);
    if (!room) return null;

    const { data: players, error: playersError } = await this.supabase
      .from("players")
      .select("*")
      .eq("room_id", room.id)
      .order("seat", { ascending: true })
      .returns<PlayerRow[]>();

    if (playersError) throw new Error(playersError.message);

    return {
      room: mapRoom(room),
      players: (players ?? []).map(mapPlayer),
    };
  }

  async verifyPlayerToken(roomId: string, playerId: string, tokenHash: string): Promise<boolean> {
    const { data, error } = await this.supabase
      .from("players")
      .select("id")
      .eq("room_id", roomId)
      .eq("id", playerId)
      .eq("client_token_hash", tokenHash)
      .maybeSingle();

    if (error) throw new Error(error.message);
    return Boolean(data);
  }

  async addPlayer(roomId: string, name: string, seat: number, tokenHash: string): Promise<PlayerRecord> {
    const { data, error } = await this.supabase
      .from("players")
      .insert({
        room_id: roomId,
        name,
        seat,
        status: "active",
        is_host: false,
        client_token_hash: tokenHash,
      })
      .select("*")
      .single<PlayerRow>();

    if (error) throw new Error(error.message);
    return mapPlayer(data);
  }

  async updateRoom(
    roomId: string,
    patch: Partial<Pick<RoomRecord, "status" | "settings" | "gameState" | "version">>,
    expectedVersion?: number,
  ): Promise<void> {
    const update = {
      ...(patch.status ? { status: patch.status } : {}),
      ...(patch.settings ? { settings: patch.settings } : {}),
      ...(patch.gameState ? { game_state: patch.gameState } : {}),
      ...(patch.version !== undefined ? { version: patch.version } : {}),
    };
    const query = this.supabase.from("rooms").update(update).eq("id", roomId);
    const { data, error } =
      expectedVersion === undefined
        ? await query.select("id")
        : await query.eq("version", expectedVersion).select("id");
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) throw new Error("Version obsoleta. Refresca el estado de la sala.");
  }

  async updatePlayer(playerId: string, patch: Partial<Pick<PlayerRecord, "lives" | "status">>): Promise<void> {
    const { error } = await this.supabase.from("players").update(patch).eq("id", playerId);
    if (error) throw new Error(error.message);
  }

  async addEvent(input: {
    roomId: string;
    playerId?: string;
    type: string;
    payload?: Record<string, unknown>;
  }): Promise<void> {
    const { error } = await this.supabase.from("room_events").insert({
      room_id: input.roomId,
      player_id: input.playerId,
      type: input.type,
      payload: input.payload ?? {},
    });
    if (error) throw new Error(error.message);
  }
}

function mapRoom(row: RoomRow): RoomRecord & { gameState: GameState } {
  return {
    id: row.id,
    code: row.code,
    status: row.status,
    settings: row.settings,
    gameState: row.game_state as GameState,
    version: row.version,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapPlayer(row: PlayerRow): PlayerRecord {
  return {
    id: row.id,
    roomId: row.room_id,
    name: row.name,
    seat: row.seat,
    lives: row.lives,
    status: row.status,
    isHost: row.is_host,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
