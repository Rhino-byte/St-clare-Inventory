import { NextResponse } from "next/server";
import { clearAlertIfRecovered, sendLowStockAlert } from "@/lib/alerts";
import { requireClerk } from "@/lib/auth/api-auth";
import {
  appendTransactions,
  batchUpdateStockMovements,
  getInventoryItems,
} from "@/lib/sheets";
import { validateStockMovement } from "@/lib/stock";
import {
  DEFAULT_STOCK_DESTINATION,
  STOCK_DESTINATIONS,
  type BulkStockMovementLine,
  type BulkStockMovementRequest,
  type InventoryItem,
  type StockDestination,
  type Transaction,
} from "@/lib/types";

const MAX_BULK_LINES = 50;

function isStockDestination(value: unknown): value is StockDestination {
  return (
    typeof value === "string" &&
    (STOCK_DESTINATIONS as readonly string[]).includes(value)
  );
}

function resolveDestination(
  type: "in" | "out",
  destination: unknown
): { destination: string; error?: string } {
  if (type !== "out") return { destination: "" };
  if (destination == null) {
    return { destination: DEFAULT_STOCK_DESTINATION };
  }
  if (!isStockDestination(destination)) {
    return {
      destination: "",
      error: `Destination must be ${STOCK_DESTINATIONS.join(", ")}.`,
    };
  }
  return { destination };
}

export async function POST(request: Request) {
  try {
    const { email, uid } = await requireClerk(request);
    const body = (await request.json()) as BulkStockMovementRequest;

    if (body.type !== "in" && body.type !== "out") {
      return NextResponse.json({ error: "Invalid movement type." }, { status: 400 });
    }

    if (!Array.isArray(body.lines) || body.lines.length === 0) {
      return NextResponse.json(
        { error: "Add at least one line to submit." },
        { status: 400 }
      );
    }

    if (body.lines.length > MAX_BULK_LINES) {
      return NextResponse.json(
        { error: `Bulk updates are limited to ${MAX_BULK_LINES} lines.` },
        { status: 400 }
      );
    }

    const inventory = await getInventoryItems();
    const byId = new Map(inventory.map((item) => [item.itemId, item]));

    const totalsByItem = new Map<string, number>();
    const normalizedLines: Array<{
      line: BulkStockMovementLine;
      item: InventoryItem;
      destination: string;
    }> = [];

    for (let index = 0; index < body.lines.length; index += 1) {
      const line = body.lines[index];
      const label = `Line ${index + 1}`;

      if (!line?.itemId) {
        return NextResponse.json(
          { error: `${label}: item is required.` },
          { status: 400 }
        );
      }

      const quantity = Number(line.quantity);
      if (!Number.isFinite(quantity) || quantity <= 0) {
        return NextResponse.json(
          { error: `${label}: quantity must be greater than zero.` },
          { status: 400 }
        );
      }

      const item = byId.get(line.itemId);
      if (!item) {
        return NextResponse.json(
          { error: `${label}: item not found.` },
          { status: 404 }
        );
      }

      const dest = resolveDestination(body.type, line.destination);
      if (dest.error) {
        return NextResponse.json(
          { error: `${label}: ${dest.error}` },
          { status: 400 }
        );
      }

      totalsByItem.set(
        line.itemId,
        (totalsByItem.get(line.itemId) ?? 0) + quantity
      );

      normalizedLines.push({
        line: { ...line, quantity },
        item,
        destination: dest.destination,
      });
    }

    for (const [itemId, totalQty] of totalsByItem) {
      const item = byId.get(itemId)!;
      const validationError = validateStockMovement(item, body.type, totalQty);
      if (validationError) {
        return NextResponse.json({ error: validationError }, { status: 400 });
      }
    }

    const inventoryUpdates = Array.from(totalsByItem.entries()).map(
      ([itemId, quantity]) => ({
        item: byId.get(itemId)!,
        type: body.type,
        quantity,
      })
    );

    const updatedItems = await batchUpdateStockMovements(inventoryUpdates);
    const updatedById = new Map(
      updatedItems.map((item) => [item.itemId, item])
    );

    const timestamp = new Date().toISOString();
    const userEmail = email ?? uid;
    const transactions: Transaction[] = normalizedLines.map(
      ({ line, item, destination }) => ({
        timestamp,
        itemId: item.itemId,
        itemName: item.itemName,
        type: body.type,
        quantity: line.quantity,
        userEmail,
        notes: line.notes?.trim() ?? "",
        destination,
      })
    );

    await appendTransactions(transactions);

    for (const item of updatedItems) {
      await clearAlertIfRecovered(item);
      await sendLowStockAlert(item);
    }

    return NextResponse.json({
      items: Array.from(updatedById.values()),
    });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("POST /api/stock/bulk", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update stock" },
      { status: 500 }
    );
  }
}
