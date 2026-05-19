import { NextResponse } from "next/server";
import { hidePrivateState } from "@/lib/game/engine";
import type { RoomSnapshot } from "@/lib/rooms/types";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { SupabaseRoomStore } from "@/lib/rooms/supabase-store";

export function createStore() {
  return new SupabaseRoomStore(createSupabaseAdmin());
}

export function jsonError(error: unknown, status = 400) {
  const message = error instanceof Error ? error.message : "Error inesperado.";
  return NextResponse.json({ error: message }, { status });
}

export function publicSnapshot(snapshot: RoomSnapshot, playerId?: string) {
  if (!snapshot.room.gameState?.phase) return snapshot;
  if (!playerId) {
    return {
      ...snapshot,
      room: {
        ...snapshot.room,
        gameState: {
          ...snapshot.room.gameState,
          hands: Object.fromEntries(
            Object.entries(snapshot.room.gameState.hands).map(([id, hand]) => [
              id,
              hand.map((card) => ({ id: card.id, hidden: true })),
            ]),
          ),
        },
      },
    };
  }
  return {
    ...snapshot,
    room: {
      ...snapshot.room,
      gameState: hidePrivateState(snapshot.room.gameState, playerId),
    },
  };
}
