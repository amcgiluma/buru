import { NextResponse } from "next/server";
import { performRoomAction, verifyRoomPlayer } from "@/lib/rooms/service";
import { createStore, jsonError, publicSnapshot } from "../../../_helpers";

export async function POST(request: Request, context: { params: Promise<{ code: string }> }) {
  try {
    const { code } = await context.params;
    const body = await request.json();
    const { playerId, playerToken, ...action } = body;
    const store = createStore();
    const authorized = await verifyRoomPlayer(store, code, playerId, playerToken);
    if (!authorized) throw new Error("Credenciales de jugador invalidas.");
    const result = await performRoomAction(store, code, playerId ?? "", action);
    return NextResponse.json(publicSnapshot(result, playerId));
  } catch (error) {
    return jsonError(error);
  }
}
