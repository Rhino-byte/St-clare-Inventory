import { NextResponse } from "next/server";
import {
  ALL_DESTINATION,
  buildDashboardStats,
  destinationBreakdown,
  dailyMovementTotals,
  filterAnalyticsTransactions,
  filterTransactionsByDays,
  inventoryOptions,
  itemDailyOutSeries,
  listCategories,
  periodOutComparisonSeries,
  stockHealthSnapshot,
  topOutItemIds,
  topUsedDailySeries,
  userActivityByDay,
} from "@/lib/analytics";
import { requireAdmin } from "@/lib/auth/api-auth";
import { rollingDateRange } from "@/lib/dates";
import { getInventoryItems, getTransactions } from "@/lib/sheets";
import { isLowStock } from "@/lib/stock";
import { STOCK_DESTINATIONS } from "@/lib/types";

export async function GET(request: Request) {
  try {
    await requireAdmin(request);
    const { searchParams } = new URL(request.url);
    const days = Number(searchParams.get("days") ?? 30);
    const span = days <= 0 ? 1 : days;
    const categoryParam = searchParams.get("category")?.trim() ?? "";
    const destinationParam =
      searchParams.get("destination")?.trim() || ALL_DESTINATION;

    const [items, transactions] = await Promise.all([
      getInventoryItems(),
      getTransactions(),
    ]);

    const categories = listCategories(items);
    const category =
      categoryParam && categories.includes(categoryParam)
        ? categoryParam
        : categories[0] ?? "";

    const destination =
      destinationParam === ALL_DESTINATION ||
      (STOCK_DESTINATIONS as readonly string[]).includes(destinationParam)
        ? destinationParam
        : ALL_DESTINATION;

    const ranged = filterTransactionsByDays(transactions, days);
    const currentRange = rollingDateRange(span);

    // Cap item-compare window at 30 days for readability when range is longer.
    const usageSpan = days <= 0 ? 7 : Math.min(span, 30);
    const usageRange = rollingDateRange(usageSpan);

    const scopedForCharts = filterAnalyticsTransactions(ranged, items, {
      category,
      destination,
      destinationOutsOnly: true,
    });

    const scopedOutsForPeriod = filterAnalyticsTransactions(
      transactions,
      items,
      {
        category,
        destination,
        destinationOutsOnly: false,
      }
    ).filter((tx) => tx.type === "out");

    const categoryItems = items.filter(
      (item) =>
        !category ||
        (item.category?.trim() || "Uncategorized") === category
    );
    const categoryOptions = inventoryOptions(categoryItems);

    const topUsed = topUsedDailySeries(
      items,
      scopedForCharts,
      currentRange.from,
      currentRange.to,
      category,
      5
    );

    const periodComparison = periodOutComparisonSeries(
      scopedOutsForPeriod,
      days
    );

    const defaultItemIds = topOutItemIds(scopedForCharts, 3);
    const usageItemIds =
      defaultItemIds.length > 0
        ? defaultItemIds
        : categoryOptions.slice(0, 3).map((option) => option.itemId);

    const usageSeries = itemDailyOutSeries(
      scopedForCharts,
      usageRange.from,
      usageRange.to,
      usageItemIds.length ? usageItemIds : undefined
    );
    for (const option of categoryOptions) {
      usageSeries.itemNames[option.itemId] = option.itemName;
    }

    // Destination breakdown ignores destination filter (shows all destinations
    // within category); when a destination is selected the UI shows a KPI.
    const categoryScoped = filterAnalyticsTransactions(ranged, items, {
      category,
      destination: ALL_DESTINATION,
      destinationOutsOnly: true,
    });

    const staffScoped = filterAnalyticsTransactions(ranged, items, {
      category,
      destination,
      destinationOutsOnly: false,
    });

    return NextResponse.json({
      stats: buildDashboardStats(items, transactions),
      lowStockItems: items.filter(isLowStock),
      category,
      destination,
      categories,
      destinations: [...STOCK_DESTINATIONS],
      stockHealth: stockHealthSnapshot(items),
      dailyMovement: dailyMovementTotals(
        scopedForCharts,
        currentRange.from,
        currentRange.to
      ),
      destinationTotals: destinationBreakdown(categoryScoped),
      topUsed,
      periodComparison,
      inventoryOptions: categoryOptions,
      itemUsageSeries: usageSeries,
      itemUsageDays: usageSpan,
      defaultItemIds: usageItemIds,
      userActivity: userActivityByDay(staffScoped, days),
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
