import { NextResponse } from "next/server";
import { clearAlertIfRecovered, sendLowStockAlert } from "@/lib/alerts";
import { requireAdmin } from "@/lib/auth/api-auth";
import {
  appendCorrection,
  getCorrections,
  getInventoryItemById,
  updateStockMovement,
} from "@/lib/sheets";
import type { StockCorrectionRequest } from "@/lib/types";

const DEFAULT_LIST_LIMIT = 50;
const MAX_LIST_LIMIT = 200;

export async function GET(request: Request) {
  try {
    await requireAdmin(request);
    const { searchParams } = new URL(request.url);
    const rawLimit = Number(searchParams.get("limit") ?? DEFAULT_LIST_LIMIT);
    const limit = Number.isFinite(rawLimit)
      ? Math.min(MAX_LIST_LIMIT, Math.max(1, Math.floor(rawLimit)))
      : DEFAULT_LIST_LIMIT;

    const corrections = await getCorrections();
    const newestFirst = [...corrections].sort((a, b) =>
      b.timestamp.localeCompare(a.timestamp)
    );

    return NextResponse.json({
      corrections: newestFirst.slice(0, limit),
    });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("GET /api/corrections", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to load corrections",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { email, uid } = await requireAdmin(request);
    const body = (await request.json()) as StockCorrectionRequest;

    if (!body.itemId) {
      return NextResponse.json({ error: "itemId is required." }, { status: 400 });
    }

    const delta = Number(body.delta);
    if (!Number.isFinite(delta) || delta === 0) {
      return NextResponse.json(
        { error: "Delta must be a non-zero number." },
        { status: 400 }
      );
    }

    const reason = body.reason?.trim() ?? "";
    if (!reason) {
      return NextResponse.json(
        { error: "Reason is required." },
        { status: 400 }
      );
    }

    const item = await getInventoryItemById(body.itemId);
    if (!item) {
      return NextResponse.json({ error: "Item not found." }, { status: 404 });
    }

    const beforeClosing = item.closingStock;
    if (delta < 0 && Math.abs(delta) > beforeClosing) {
      return NextResponse.json(
        {
          error: `Cannot remove ${Math.abs(delta)}. Only ${beforeClosing} available.`,
        },
        { status: 400 }
      );
    }

    const type = delta > 0 ? "in" : "out";
    const quantity = Math.abs(delta);
    const updatedItem = await updateStockMovement(item, type, quantity);

    const correction = {
      timestamp: new Date().toISOString(),
      itemId: updatedItem.itemId,
      itemName: updatedItem.itemName,
      delta,
      beforeClosing,
      afterClosing: updatedItem.closingStock,
      adminEmail: email ?? uid,
      reason,
    };

    await appendCorrection(correction);

    await clearAlertIfRecovered(updatedItem);
    const alertSent = await sendLowStockAlert(updatedItem);

    return NextResponse.json({
      item: updatedItem,
      correction,
      alertSent,
    });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("POST /api/corrections", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to apply correction",
      },
      { status: 500 }
    );
  }
}
