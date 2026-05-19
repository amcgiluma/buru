import { NextResponse } from "next/server";
import { startRoom, verifyRoomPlayer } from "@/lib/rooms/service";
import { createStore, jsonError, publicSnapshot } from "../../../_helpers";

export async function POST(request: Request, context: { params: Promise<{ code: string }> }) {
  try {
    const { code } = await context.params;
    const body = await request.json();
    const store = createStore();
    const authorized = await verifyRoomPlayer(store, code, body.playerId, body.playerToken);
    if (!authorized) throw new Error("Credenciales de jugador invalidas.");
    const result = await startRoom(store, code, body.playerId ?? "");
    return NextResponse.json(publicSnapshot(result, body.playerId));
  } catch (error) {
    return jsonError(error);
  }
}
