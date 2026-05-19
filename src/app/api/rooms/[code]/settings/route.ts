import { NextResponse } from "next/server";
import { updateRoomSettings, verifyRoomPlayer } from "@/lib/rooms/service";
import { createStore, jsonError } from "../../../_helpers";

export async function PATCH(request: Request, context: { params: Promise<{ code: string }> }) {
  try {
    const { code } = await context.params;
    const body = await request.json();
    const store = createStore();
    const authorized = await verifyRoomPlayer(store, code, body.playerId, body.playerToken);
    if (!authorized) throw new Error("Credenciales de jugador invalidas.");
    const result = await updateRoomSettings(store, code, body.playerId ?? "", body.settings ?? {});
    return NextResponse.json(result);
  } catch (error) {
    return jsonError(error);
  }
}
