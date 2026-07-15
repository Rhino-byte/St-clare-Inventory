import { NextResponse } from "next/server";
import { itemDailyMovement } from "@/lib/analytics";
import { requireClerkOrAdmin } from "@/lib/auth/api-auth";
import { isUidAllowed } from "@/lib/auth/roles";
import { todayDateKey } from "@/lib/dates";
import { getTransactions } from "@/lib/sheets";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(request: Request) {
  try {
    const user = await requireClerkOrAdmin(request);
    const isAdmin = isUidAllowed(user.uid, "admin");
    const { searchParams } = new URL(request.url);
    const requestedDate = searchParams.get("date");

    const todayKey = todayDateKey();
    let dateKey = todayKey;

    if (isAdmin && requestedDate) {
      if (!DATE_RE.test(requestedDate)) {
        return NextResponse.json(
          { error: "Invalid date. Use YYYY-MM-DD." },
          { status: 400 }
        );
      }
      dateKey = requestedDate;
    }
    // Non-admin staff always get today, even if ?date= is passed.

    const transactions = await getTransactions();
    const items = itemDailyMovement(transactions, dateKey);

    return NextResponse.json({ date: dateKey, items });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("GET /api/daily-stock", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load daily stock" },
      { status: 500 }
    );
  }
}
