import { NextRequest, NextResponse } from "next/server";
import { DeckService } from "@/lib/services/deck.service";
import { verifyAuth } from "@/lib/utils/auth";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authUser = verifyAuth(req);
    if (!authUser) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const body = await req.json();
    const deck = await DeckService.update(authUser.id, id, body);
    return NextResponse.json({ success: true, message: "Deck updated", data: deck });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authUser = verifyAuth(req);
    if (!authUser) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    await DeckService.delete(authUser.id, id);
    return NextResponse.json({ success: true, message: "Deck deleted" });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 400 });
  }
}
