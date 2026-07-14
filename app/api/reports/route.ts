import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/api-auth";
import {
  filterTransactionsByDateRange,
  reportDestinationTotals,
  reportStockBalanceRows,
  reportStockInTotals,
  reportStockOutTotals,
  resolveReportRange,
  type ReportPeriod,
} from "@/lib/reports";
import { getInventoryItems, getTransactions } from "@/lib/sheets";

const PERIODS: ReportPeriod[] = ["weekly", "monthly", "4months", "custom"];

function isReportPeriod(value: string | null): value is ReportPeriod {
  return !!value && (PERIODS as string[]).includes(value);
}

export async function GET(request: Request) {
  try {
    await requireAdmin(request);
    const { searchParams } = new URL(request.url);
    const periodParam = searchParams.get("period") ?? "monthly";

    if (!isReportPeriod(periodParam)) {
      return NextResponse.json(
        { error: "Invalid period. Use weekly, monthly, 4months, or custom." },
        { status: 400 }
      );
    }

    const range = resolveReportRange({
      period: periodParam,
      from: searchParams.get("from"),
      to: searchParams.get("to"),
    });

    if ("error" in range) {
      return NextResponse.json({ error: range.error }, { status: 400 });
    }

    const [transactions, items] = await Promise.all([
      getTransactions(),
      getInventoryItems(),
    ]);

    const filtered = filterTransactionsByDateRange(
      transactions,
      range.from,
      range.to
    );

    return NextResponse.json({
      period: periodParam,
      from: range.from,
      to: range.to,
      stockIn: reportStockInTotals(filtered),
      stockOut: reportStockOutTotals(filtered),
      stockBalance: reportStockBalanceRows(
        items,
        transactions,
        range.from,
        range.to
      ),
      destinationTotals: reportDestinationTotals(filtered),
    });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("GET /api/reports", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load report" },
      { status: 500 }
    );
  }
}
