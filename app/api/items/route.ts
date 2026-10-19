import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/api-auth";
import { createInventoryItem, updateItemMetadata } from "@/lib/sheets";
import type { CreateItemRequest, ItemUpdateRequest } from "@/lib/types";

function parseOptionalWholeNumber(
  value: unknown
): number | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

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

export async function POST(request: Request) {
  try {
    await requireAdmin(request);
    const body = (await request.json()) as CreateItemRequest;
    const itemName = String(body.itemName ?? "").trim();

    if (!itemName) {
      return NextResponse.json(
        { error: "Item name is required." },
        { status: 400 }
      );
    }

    const openingStock = parseOptionalWholeNumber(body.openingStock);
    if (openingStock !== undefined && openingStock !== null && Number.isNaN(openingStock)) {
      return NextResponse.json(
        { error: "Opening stock must be a whole number that is zero or greater." },
        { status: 400 }
      );
    }

    const reorderLevel = parseOptionalWholeNumber(body.reorderLevel);
    if (Number.isNaN(reorderLevel)) {
      return NextResponse.json(
        { error: "Reorder level must be a whole number that is zero or greater." },
        { status: 400 }
      );
    }

    const item = await createInventoryItem({
      itemName,
      category: body.category,
      unit: body.unit,
      openingStock: openingStock ?? undefined,
      reorderLevel,
      notes: body.notes,
    });
    return NextResponse.json({ item });
  } catch (error) {
    if (error instanceof Response) return error;
    const message =
      error instanceof Error ? error.message : "Failed to add item";
    const status = /already exists|required|whole number/i.test(message)
      ? 400
      : 500;
    console.error("POST /api/items", error);
    return NextResponse.json({ error: message }, { status });
  }
}
