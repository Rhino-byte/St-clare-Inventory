import { NextResponse } from "next/server";
import { requireClerkOrAdmin } from "@/lib/auth/api-auth";
import { getInventoryItems } from "@/lib/sheets";

export async function GET(request: Request) {
  try {
    await requireClerkOrAdmin(request);
    const items = await getInventoryItems();
    return NextResponse.json({ items });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("GET /api/inventory", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load inventory" },
      { status: 500 }
    );
  }
}
