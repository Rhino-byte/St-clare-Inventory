import { isAfter, isSameDay, parseISO, subDays } from "date-fns";
import type { DashboardStats, InventoryItem, Transaction } from "./types";
import { isLowStock, isOutOfStock } from "./stock";

export function buildDashboardStats(
  items: InventoryItem[],
  transactions: Transaction[]
): DashboardStats {
  const today = new Date();
  const todayMovements = transactions.filter((tx) => {
    if (!tx.timestamp) return false;
    const date = parseISO(tx.timestamp);
    return isSameDay(date, today);
  }).length;

  return {
    totalItems: items.length,
    lowStockCount: items.filter(isLowStock).length,
    outOfStockCount: items.filter(isOutOfStock).length,
    todayMovements,
  };
}

export function filterTransactionsByDays(
  transactions: Transaction[],
  days: number
): Transaction[] {
  const cutoff = subDays(new Date(), days);
  return transactions.filter((tx) => {
    if (!tx.timestamp) return false;
    const date = parseISO(tx.timestamp);
    return isAfter(date, cutoff) || isSameDay(date, cutoff);
  });
}

export function groupStockByCategory(items: InventoryItem[]) {
  const grouped = new Map<string, number>();
  for (const item of items) {
    const key = item.category || "Uncategorized";
    grouped.set(key, (grouped.get(key) ?? 0) + item.closingStock);
  }
  return Array.from(grouped.entries()).map(([category, stock]) => ({
    category,
    stock,
  }));
}

export function topConsumedItems(transactions: Transaction[], limit = 10) {
  const totals = new Map<string, { itemName: string; quantity: number }>();
  for (const tx of transactions) {
    if (tx.type !== "out") continue;
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
    const day = tx.timestamp.slice(0, 10);
    const current = totals.get(day) ?? { in: 0, out: 0 };
    if (tx.type === "in") current.in += tx.quantity;
    else current.out += tx.quantity;
    totals.set(day, current);
  }

  return Array.from(totals.entries())
    .map(([date, values]) => ({ date, ...values }))
    .sort((a, b) => a.date.localeCompare(b.date));
}
