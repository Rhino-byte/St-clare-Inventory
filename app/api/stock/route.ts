import { NextResponse } from "next/server";
import { clearAlertIfRecovered, sendLowStockAlert } from "@/lib/alerts";
import { requireClerk } from "@/lib/auth/api-auth";
import {
  appendTransaction,
  getInventoryItemById,
  updateStockMovement,
} from "@/lib/sheets";
import { validateStockMovement } from "@/lib/stock";
import {
  DEFAULT_STOCK_DESTINATION,
  STOCK_DESTINATIONS,
  type StockDestination,
  type StockMovementRequest,
} from "@/lib/types";

function isStockDestination(value: unknown): value is StockDestination {
  return (
    typeof value === "string" &&
    (STOCK_DESTINATIONS as readonly string[]).includes(value)
  );
}

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

    let destination = "";
    if (body.type === "out") {
      if (body.destination != null) {
        if (!isStockDestination(body.destination)) {
          return NextResponse.json(
            {
              error: `Destination must be ${STOCK_DESTINATIONS.join(", ")}.`,
            },
            { status: 400 }
          );
        }
        destination = body.destination;
      } else {
        destination = DEFAULT_STOCK_DESTINATION;
      }
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
      destination,
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
