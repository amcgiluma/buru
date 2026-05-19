import { NextResponse } from "next/server";
import { requireRoom, verifyRoomPlayer } from "@/lib/rooms/service";
import { createStore, jsonError, publicSnapshot } from "../../_helpers";

export async function GET(request: Request, context: { params: Promise<{ code: string }> }) {
  try {
    const { code } = await context.params;
    const url = new URL(request.url);
    const playerId = url.searchParams.get("playerId") ?? undefined;
    const playerToken = url.searchParams.get("playerToken") ?? undefined;
    const store = createStore();
    const authorized = await verifyRoomPlayer(store, code, playerId, playerToken);
    const snapshot = await requireRoom(store, code);
    return NextResponse.json(publicSnapshot(snapshot, authorized ? playerId : undefined));
  } catch (error) {
    return jsonError(error, 404);
  }
}
