import { NextRequest, NextResponse } from "next/server";
import { createRoom } from "@/lib/rooms/service";
import { createStore, jsonError } from "../_helpers";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const origin = request.headers.get("origin") ?? undefined;
    const result = await createRoom(createStore(), {
      hostName: body.hostName ?? body.name ?? "",
      settings: body.settings,
      origin,
    });

    return NextResponse.json(result);
  } catch (error) {
    return jsonError(error);
  }
}
