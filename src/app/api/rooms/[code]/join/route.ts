import { NextResponse } from "next/server";
import { joinRoom } from "@/lib/rooms/service";
import { createStore, jsonError } from "../../../_helpers";

export async function POST(request: Request, context: { params: Promise<{ code: string }> }) {
  try {
    const { code } = await context.params;
    const body = await request.json();
    const result = await joinRoom(createStore(), code, { name: body.name ?? "" });
    return NextResponse.json(result);
  } catch (error) {
    return jsonError(error);
  }
}
