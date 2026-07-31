import {
  dateKeysInclusive,
  isDateKeyInRange,
  previousRollingDateRange,
  rollingDateRange,
  todayDateKey,
  transactionDateKey,
} from "@/lib/dates";
import type { DashboardStats, InventoryItem, Transaction } from "./types";
import { isLowStock, isOutOfStock } from "./stock";

function categoryOf(item: InventoryItem): string {
  return item.category?.trim() || "Uncategorized";
}

export function buildDashboardStats(
  items: InventoryItem[],
  transactions: Transaction[]
): DashboardStats {
  const todayKey = todayDateKey();
  const todayMovements = transactions.filter(
    (tx) => transactionDateKey(tx.timestamp) === todayKey
  ).length;

  return {
    totalItems: items.length,
    lowStockCount: items.filter(isLowStock).length,
    outOfStockCount: items.filter(isOutOfStock).length,
    todayMovements,
  };
}

/**
 * Inclusive app-timezone calendar window.
 * days <= 0 → today only; days = 7 → today and the prior 6 days.
 */
export function filterTransactionsByDays(
  transactions: Transaction[],
  days: number
): Transaction[] {
  const span = days <= 0 ? 1 : days;
  const { from, to } = rollingDateRange(span);
  return transactions.filter((tx) => {
    const day = transactionDateKey(tx.timestamp);
    return isDateKeyInRange(day, from, to);
  });
}

export function filterTransactionsByDateRange(
  transactions: Transaction[],
  fromKey: string,
  toKey: string
): Transaction[] {
  return transactions.filter((tx) => {
    const day = transactionDateKey(tx.timestamp);
    return isDateKeyInRange(day, fromKey, toKey);
  });
}

export function groupStockByCategory(items: InventoryItem[]) {
  const grouped = new Map<string, number>();
  for (const item of items) {
    const key = categoryOf(item);
    grouped.set(key, (grouped.get(key) ?? 0) + item.closingStock);
  }
  return Array.from(grouped.entries()).map(([category, stock]) => ({
    category,
    stock,
  }));
}

export function listCategories(items: InventoryItem[]): string[] {
  const set = new Set<string>();
  for (const item of items) {
    set.add(categoryOf(item));
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}

export type InventoryOption = {
  itemId: string;
  itemName: string;
  category: string;
};

export function inventoryOptions(items: InventoryItem[]): InventoryOption[] {
  return items
    .map((item) => ({
      itemId: item.itemId,
      itemName: item.itemName,
      category: categoryOf(item),
    }))
    .sort((a, b) => a.itemName.localeCompare(b.itemName));
}

export function topStockInItems(transactions: Transaction[], limit = 10) {
  const totals = new Map<string, { itemName: string; quantity: number }>();
  for (const tx of transactions) {
    if (tx.type !== "in") continue;
    const current = totals.get(tx.itemId) ?? {
      itemName: tx.itemName,
      quantity: 0,
    };
    current.quantity += tx.quantity;
    totals.set(tx.itemId, current);
  }

  return Array.from(totals.entries())
    .map(([itemId, data]) => ({ itemId, ...data }))
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, limit);
}

export function dailyMovementTotals(transactions: Transaction[]) {
  const totals = new Map<string, { in: number; out: number }>();
  for (const tx of transactions) {
    const day = transactionDateKey(tx.timestamp);
    if (!day) continue;
    const current = totals.get(day) ?? { in: 0, out: 0 };
    if (tx.type === "in") current.in += tx.quantity;
    else current.out += tx.quantity;
    totals.set(day, current);
  }

  return Array.from(totals.entries())
    .map(([date, values]) => ({ date, ...values }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function itemMovementTotals(transactions: Transaction[]) {
  const totals = new Map<string, { itemName: string; in: number; out: number }>();
  for (const tx of transactions) {
    const current = totals.get(tx.itemId) ?? {
      itemName: tx.itemName,
      in: 0,
      out: 0,
    };
    if (tx.type === "in") current.in += tx.quantity;
    else current.out += tx.quantity;
    totals.set(tx.itemId, current);
  }

  return Array.from(totals.entries())
    .map(([itemId, values]) => ({
      itemId,
      itemName: values.itemName,
      in: values.in,
      out: values.out,
      net: values.in - values.out,
    }))
    .sort((a, b) => b.in + b.out - (a.in + a.out));
}

export type DailyStockItem = {
  itemId: string;
  itemName: string;
  stockIn: number;
  stockOut: number;
  destination: string;
};

/** Per-item aggregates for a single calendar day (YYYY-MM-DD). */
export function itemDailyMovement(
  transactions: Transaction[],
  dateKey: string
): DailyStockItem[] {
  const totals = new Map<
    string,
    {
      itemName: string;
      stockIn: number;
      stockOut: number;
      destinations: Set<string>;
    }
  >();

  for (const tx of transactions) {
    if (!tx.timestamp || transactionDateKey(tx.timestamp) !== dateKey) continue;

    const current = totals.get(tx.itemId) ?? {
      itemName: tx.itemName,
      stockIn: 0,
      stockOut: 0,
      destinations: new Set<string>(),
    };

    if (tx.type === "in") {
      current.stockIn += tx.quantity;
    } else {
      current.stockOut += tx.quantity;
      const dest = tx.destination?.trim();
      if (dest) {
        current.destinations.add(dest);
      }
    }

    totals.set(tx.itemId, current);
  }

  return Array.from(totals.entries())
    .map(([itemId, values]) => ({
      itemId,
      itemName: values.itemName,
      stockIn: values.stockIn,
      stockOut: values.stockOut,
      destination: Array.from(values.destinations).sort().join(", "),
    }))
    .sort((a, b) => a.itemName.localeCompare(b.itemName));
}

export type UserActivitySeries = {
  users: string[];
  points: Array<Record<string, string | number>>;
};

/**
 * Count of transactions per userEmail per calendar day.
 * Window matches filterTransactionsByDays (inclusive app-timezone days).
 */
export function userActivityByDay(
  transactions: Transaction[],
  days: number
): UserActivitySeries {
  const span = days <= 0 ? 1 : days;
  const { from, to } = rollingDateRange(span);
  const dayKeys = dateKeysInclusive(from, to);

  const usersSet = new Set<string>();
  const counts = new Map<string, Map<string, number>>();

  for (const day of dayKeys) {
    counts.set(day, new Map());
  }

  for (const tx of transactions) {
    if (!tx.timestamp) continue;
    const day = transactionDateKey(tx.timestamp);
    if (!counts.has(day)) continue;
    const user = tx.userEmail?.trim() || "Unknown";
    usersSet.add(user);
    const dayMap = counts.get(day)!;
    dayMap.set(user, (dayMap.get(user) ?? 0) + 1);
  }

  const users = Array.from(usersSet).sort((a, b) => a.localeCompare(b));
  const points = dayKeys.map((date) => {
    const row: Record<string, string | number> = { date };
    const dayMap = counts.get(date)!;
    for (const user of users) {
      row[user] = dayMap.get(user) ?? 0;
    }
    return row;
  });

  return { users, points };
}

export const ALL_CATEGORY = "All";

export type CategoryTopDailySeries = {
  topItems: Array<{ itemId: string; itemName: string }>;
  points: Array<Record<string, string | number>>;
};

export type DailyTopByCategory = Record<string, CategoryTopDailySeries>;

/**
 * For All + each inventory category: top N items by period stock-out,
 * then continuous daily stock-out series keyed by itemName.
 */
export function categoryTopDailyUsageSeries(
  items: InventoryItem[],
  transactions: Transaction[],
  fromKey: string,
  toKey: string,
  topN = 5
): DailyTopByCategory {
  const itemById = new Map(items.map((item) => [item.itemId, item]));
  const dayKeys = dateKeysInclusive(fromKey, toKey);
  const categories = [ALL_CATEGORY, ...listCategories(items)];

  const periodOut = new Map<string, { itemName: string; quantity: number }>();
  const dailyOut = new Map<string, Map<string, number>>();

  for (const day of dayKeys) {
    dailyOut.set(day, new Map());
  }

  for (const tx of transactions) {
    if (tx.type !== "out") continue;
    const day = transactionDateKey(tx.timestamp);
    if (!isDateKeyInRange(day, fromKey, toKey)) continue;

    const current = periodOut.get(tx.itemId) ?? {
      itemName: tx.itemName,
      quantity: 0,
    };
    current.quantity += tx.quantity;
    periodOut.set(tx.itemId, current);

    const dayMap = dailyOut.get(day);
    if (dayMap) {
      dayMap.set(tx.itemId, (dayMap.get(tx.itemId) ?? 0) + tx.quantity);
    }
  }

  const result: DailyTopByCategory = {};

  for (const category of categories) {
    const eligibleIds = Array.from(periodOut.keys()).filter((itemId) => {
      if (category === ALL_CATEGORY) return true;
      const item = itemById.get(itemId);
      if (item) return categoryOf(item) === category;
      return false;
    });

    const topItems = eligibleIds
      .map((itemId) => {
        const values = periodOut.get(itemId)!;
        return {
          itemId,
          itemName: values.itemName,
          quantity: values.quantity,
        };
      })
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, topN)
      .map(({ itemId, itemName }) => ({ itemId, itemName }));

    const points = dayKeys.map((date) => {
      const row: Record<string, string | number> = { date };
      const dayMap = dailyOut.get(date)!;
      for (const item of topItems) {
        row[item.itemName] = dayMap.get(item.itemId) ?? 0;
      }
      return row;
    });

    result[category] = { topItems, points };
  }

  return result;
}

export type PeriodComparisonPoint = {
  dayIndex: number;
  label: string;
  current: number;
  previous: number;
};

export type PeriodComparisonSeries = {
  currentFrom: string;
  currentTo: string;
  previousFrom: string;
  previousTo: string;
  points: PeriodComparisonPoint[];
};

function dailyStockOutTotals(
  transactions: Transaction[],
  fromKey: string,
  toKey: string
): Map<string, number> {
  const dayKeys = dateKeysInclusive(fromKey, toKey);
  const totals = new Map<string, number>();
  for (const day of dayKeys) {
    totals.set(day, 0);
  }
  for (const tx of transactions) {
    if (tx.type !== "out") continue;
    const day = transactionDateKey(tx.timestamp);
    if (!totals.has(day)) continue;
    totals.set(day, (totals.get(day) ?? 0) + tx.quantity);
  }
  return totals;
}

/** Aligned day-index stock-out comparison: current solid vs previous ghost. */
export function periodOutComparisonSeries(
  allTransactions: Transaction[],
  days: number,
  now = new Date()
): PeriodComparisonSeries {
  const span = days <= 0 ? 1 : days;
  const current = rollingDateRange(span, now);
  const previous = previousRollingDateRange(span, now);
  const currentDays = dateKeysInclusive(current.from, current.to);
  const previousDays = dateKeysInclusive(previous.from, previous.to);

  const currentTotals = dailyStockOutTotals(
    allTransactions,
    current.from,
    current.to
  );
  const previousTotals = dailyStockOutTotals(
    allTransactions,
    previous.from,
    previous.to
  );

  const points: PeriodComparisonPoint[] = currentDays.map((label, index) => ({
    dayIndex: index + 1,
    label,
    current: currentTotals.get(label) ?? 0,
    previous: previousTotals.get(previousDays[index] ?? "") ?? 0,
  }));

  return {
    currentFrom: current.from,
    currentTo: current.to,
    previousFrom: previous.from,
    previousTo: previous.to,
    points,
  };
}

export type ItemDailyOutSeries = {
  itemIds: string[];
  itemNames: Record<string, string>;
  points: Array<Record<string, string | number>>;
};

/**
 * Continuous daily stock-out per itemId.
 * When itemIds is omitted, includes every item with stock-out in the window.
 */
export function itemDailyOutSeries(
  transactions: Transaction[],
  fromKey: string,
  toKey: string,
  itemIds?: string[]
): ItemDailyOutSeries {
  const dayKeys = dateKeysInclusive(fromKey, toKey);
  const filterSet = itemIds ? new Set(itemIds) : null;
  const names = new Map<string, string>();
  const daily = new Map<string, Map<string, number>>();

  for (const day of dayKeys) {
    daily.set(day, new Map());
  }

  for (const tx of transactions) {
    if (tx.type !== "out") continue;
    if (filterSet && !filterSet.has(tx.itemId)) continue;
    const day = transactionDateKey(tx.timestamp);
    if (!isDateKeyInRange(day, fromKey, toKey)) continue;

    names.set(tx.itemId, tx.itemName);
    const dayMap = daily.get(day);
    if (dayMap) {
      dayMap.set(tx.itemId, (dayMap.get(tx.itemId) ?? 0) + tx.quantity);
    }
  }

  const ids =
    itemIds ??
    Array.from(names.keys()).sort((a, b) =>
      (names.get(a) ?? a).localeCompare(names.get(b) ?? b)
    );

  for (const id of ids) {
    if (!names.has(id)) names.set(id, id);
  }

  const points = dayKeys.map((date) => {
    const row: Record<string, string | number> = { date };
    const dayMap = daily.get(date)!;
    for (const id of ids) {
      row[id] = dayMap.get(id) ?? 0;
    }
    return row;
  });

  return {
    itemIds: ids,
    itemNames: Object.fromEntries(names),
    points,
  };
}
