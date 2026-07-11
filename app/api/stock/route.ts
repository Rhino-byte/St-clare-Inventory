import { NextResponse } from "next/server";
import { clearAlertIfRecovered, sendLowStockAlert } from "@/lib/alerts";
import { requireClerk } from "@/lib/auth/api-auth";
import {
  appendTransaction,
  getInventoryItemById,
  updateStockMovement,
} from "@/lib/sheets";
import { validateStockMovement } from "@/lib/stock";
import type { StockMovementRequest } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const { email, uid } = await requireClerk(request);
    const body = (await request.json()) as StockMovementRequest;

    if (!body.itemId || !body.type || !body.quantity) {
      return NextResponse.json(
        { error: "itemId, type, and quantity are required." },
        { status: 400 }
      );
    }

    if (body.type !== "in" && body.type !== "out") {
      return NextResponse.json({ error: "Invalid movement type." }, { status: 400 });
    }

    const item = await getInventoryItemById(body.itemId);
    if (!item) {
      return NextResponse.json({ error: "Item not found." }, { status: 404 });
    }

    const validationError = validateStockMovement(item, body.type, body.quantity);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const updatedItem = await updateStockMovement(item, body.type, body.quantity);

    await appendTransaction({
      timestamp: new Date().toISOString(),
      itemId: updatedItem.itemId,
      itemName: updatedItem.itemName,
      type: body.type,
      quantity: body.quantity,
      userEmail: email ?? uid,
      notes: body.notes?.trim() ?? "",
    });

    await clearAlertIfRecovered(updatedItem);
    const alertSent = await sendLowStockAlert(updatedItem);

    return NextResponse.json({ item: updatedItem, alertSent });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("POST /api/stock", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update stock" },
      { status: 500 }
    );
  }
}
