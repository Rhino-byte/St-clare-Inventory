import { format, subDays, differenceInCalendarDays, parseISO } from "date-fns";
import { DEFAULT_STOCK_DESTINATION } from "@/lib/types";
import type { InventoryItem, Transaction } from "@/lib/types";

export type ReportPeriod = "weekly" | "monthly" | "4months" | "custom";

export const REPORT_PERIOD_DAYS: Record<Exclude<ReportPeriod, "custom">, number> = {
  weekly: 7,
  monthly: 30,
  "4months": 120,
};

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_CUSTOM_RANGE_DAYS = 366 * 2;

export function isValidDateKey(value: string): boolean {
  if (!DATE_RE.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(year, month - 1, day);
  return (
    parsed.getFullYear() === year &&
    parsed.getMonth() === month - 1 &&
    parsed.getDate() === day
  );
}

export function todayDateKey(now = new Date()): string {
  return format(now, "yyyy-MM-dd");
}

/** Inclusive rolling window: from = today - (days - 1), to = today. */
export function presetDateRange(
  days: number,
  now = new Date()
): { from: string; to: string } {
  const to = todayDateKey(now);
  const from = format(subDays(now, days - 1), "yyyy-MM-dd");
  return { from, to };
}

export function filterTransactionsByDateRange(
  transactions: Transaction[],
  fromKey: string,
  toKey: string
): Transaction[] {
  return transactions.filter((tx) => {
    if (!tx.timestamp) return false;
    const day = tx.timestamp.slice(0, 10);
    return day >= fromKey && day <= toKey;
  });
}

export function resolveReportRange(params: {
  period: ReportPeriod;
  from?: string | null;
  to?: string | null;
}): { from: string; to: string } | { error: string } {
  if (params.period === "custom") {
    const from = params.from?.trim() ?? "";
    const to = params.to?.trim() ?? "";
    if (!from || !to) {
      return { error: "Custom period requires from and to dates (YYYY-MM-DD)." };
    }
    if (!isValidDateKey(from) || !isValidDateKey(to)) {
      return { error: "Invalid date. Use YYYY-MM-DD." };
    }
    if (from > to) {
      return { error: "From date must be on or before the to date." };
    }
    const span = differenceInCalendarDays(parseISO(to), parseISO(from)) + 1;
    if (span > MAX_CUSTOM_RANGE_DAYS) {
      return { error: "Custom range cannot exceed 2 years." };
    }
    return { from, to };
  }

  const days = REPORT_PERIOD_DAYS[params.period];
  return presetDateRange(days);
}

export type ReportStockInRow = {
  itemId: string;
  itemName: string;
  stockIn: number;
};

export type ReportStockOutRow = {
  itemId: string;
  itemName: string;
  stockOut: number;
  destination: string;
};

export type ReportClosingStockRow = {
  itemId: string;
  itemName: string;
  category: string;
  unit: string;
  closingStock: number;
};

export type ReportDestinationTotal = {
  destination: string;
  quantity: number;
};

export function reportStockInTotals(transactions: Transaction[]): ReportStockInRow[] {
  const totals = new Map<string, { itemName: string; stockIn: number }>();
  for (const tx of transactions) {
    if (tx.type !== "in") continue;
    const current = totals.get(tx.itemId) ?? { itemName: tx.itemName, stockIn: 0 };
    current.stockIn += tx.quantity;
    totals.set(tx.itemId, current);
  }
  return Array.from(totals.entries())
    .map(([itemId, values]) => ({
      itemId,
      itemName: values.itemName,
      stockIn: values.stockIn,
    }))
    .sort((a, b) => a.itemName.localeCompare(b.itemName));
}

export function reportStockOutTotals(transactions: Transaction[]): ReportStockOutRow[] {
  const totals = new Map<
    string,
    { itemId: string; itemName: string; stockOut: number; destination: string }
  >();

  for (const tx of transactions) {
    if (tx.type !== "out") continue;
    const destination = tx.destination?.trim() || DEFAULT_STOCK_DESTINATION;
    const key = `${tx.itemId}::${destination}`;
    const current = totals.get(key) ?? {
      itemId: tx.itemId,
      itemName: tx.itemName,
      stockOut: 0,
      destination,
    };
    current.stockOut += tx.quantity;
    totals.set(key, current);
  }

  return Array.from(totals.values()).sort((a, b) => {
    const byName = a.itemName.localeCompare(b.itemName);
    if (byName !== 0) return byName;
    return a.destination.localeCompare(b.destination);
  });
}

export function reportDestinationTotals(
  transactions: Transaction[]
): ReportDestinationTotal[] {
  const totals = new Map<string, number>();
  for (const tx of transactions) {
    if (tx.type !== "out") continue;
    const destination = tx.destination?.trim() || DEFAULT_STOCK_DESTINATION;
    totals.set(destination, (totals.get(destination) ?? 0) + tx.quantity);
  }
  return Array.from(totals.entries())
    .map(([destination, quantity]) => ({ destination, quantity }))
    .sort((a, b) => b.quantity - a.quantity);
}

export function reportClosingStockRows(
  items: InventoryItem[]
): ReportClosingStockRow[] {
  return [...items]
    .map((item) => ({
      itemId: item.itemId,
      itemName: item.itemName,
      category: item.category,
      unit: item.unit,
      closingStock: item.closingStock,
    }))
    .sort((a, b) => {
      if (a.closingStock > 0 && b.closingStock <= 0) return -1;
      if (a.closingStock <= 0 && b.closingStock > 0) return 1;
      return a.itemName.localeCompare(b.itemName);
    });
}
