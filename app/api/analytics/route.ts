import { NextResponse } from "next/server";
import {
  buildDashboardStats,
  categoryTopDailyUsageSeries,
  dailyMovementTotals,
  filterTransactionsByDays,
  groupStockByCategory,
  inventoryOptions,
  itemDailyOutSeries,
  itemMovementTotals,
  listCategories,
  periodOutComparisonSeries,
  topStockInItems,
  userActivityByDay,
} from "@/lib/analytics";
import { requireAdmin } from "@/lib/auth/api-auth";
import { rollingDateRange } from "@/lib/dates";
import { getInventoryItems, getTransactions } from "@/lib/sheets";
import { isLowStock } from "@/lib/stock";

export async function GET(request: Request) {
  try {
    await requireAdmin(request);
    const { searchParams } = new URL(request.url);
    const days = Number(searchParams.get("days") ?? 30);
    const span = days <= 0 ? 1 : days;

    const [items, transactions] = await Promise.all([
      getInventoryItems(),
      getTransactions(),
    ]);

    const filtered = filterTransactionsByDays(transactions, days);
    const currentRange = rollingDateRange(span);
    const weeklyRange = rollingDateRange(7);

    const options = inventoryOptions(items);
    const weeklySeries = itemDailyOutSeries(
      transactions,
      weeklyRange.from,
      weeklyRange.to,
      options.map((option) => option.itemId)
    );
    for (const option of options) {
      weeklySeries.itemNames[option.itemId] = option.itemName;
    }

    return NextResponse.json({
      stats: buildDashboardStats(items, transactions),
      lowStockItems: items.filter(isLowStock),
      categoryStock: groupStockByCategory(items),
      topStockIn: topStockInItems(filtered),
      dailyMovement: dailyMovementTotals(filtered),
      itemMovement: itemMovementTotals(filtered),
      userActivity: userActivityByDay(filtered, days),
      transactions: filtered,
      categories: listCategories(items),
      dailyTopByCategory: categoryTopDailyUsageSeries(
        items,
        transactions,
        currentRange.from,
        currentRange.to
      ),
      periodComparison: periodOutComparisonSeries(transactions, days),
      inventoryOptions: options,
      itemWeeklySeries: weeklySeries,
    });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("GET /api/analytics", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load analytics" },
      { status: 500 }
    );
  }
}
