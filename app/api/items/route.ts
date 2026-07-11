import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/api-auth";
import { updateItemMetadata } from "@/lib/sheets";
import type { ItemUpdateRequest } from "@/lib/types";

export async function PUT(request: Request) {
  try {
    await requireAdmin(request);
    const body = (await request.json()) as ItemUpdateRequest;

    if (!body.itemId) {
      return NextResponse.json({ error: "itemId is required." }, { status: 400 });
    }

    const item = await updateItemMetadata(body);
    return NextResponse.json({ item });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("PUT /api/items", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update item" },
      { status: 500 }
    );
  }
}
