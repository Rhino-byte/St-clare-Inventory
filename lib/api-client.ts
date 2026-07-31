import type {
  DailyStockItem,
  DailyTopByCategory,
  InventoryOption,
  ItemDailyOutSeries,
  PeriodComparisonSeries,
  UserActivitySeries,
} from "@/lib/analytics";
import type { DashboardStats, InventoryItem, Transaction } from "@/lib/types";
import { getFirebaseAuthHeader } from "@/lib/auth/use-firebase-auth";

export type AnalyticsResponse = {
  stats: DashboardStats;
  lowStockItems: InventoryItem[];
  categoryStock: Array<{ category: string; stock: number }>;
  topStockIn: Array<{ itemId: string; itemName: string; quantity: number }>;
  dailyMovement: Array<{ date: string; in: number; out: number }>;
  itemMovement: Array<{
    itemId: string;
    itemName: string;
    in: number;
    out: number;
    net: number;
  }>;
  userActivity: UserActivitySeries;
  transactions: Transaction[];
  categories: string[];
  dailyTopByCategory: DailyTopByCategory;
  periodComparison: PeriodComparisonSeries;
  inventoryOptions: InventoryOption[];
  itemWeeklySeries: ItemDailyOutSeries;
};

export async function fetchInventory(): Promise<InventoryItem[]> {
  const headers = await getFirebaseAuthHeader();
  const response = await fetch("/api/inventory", { headers, cache: "no-store" });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error ?? "Failed to load inventory");
  }
  return data.items;
}

export async function submitStockMovement(payload: {
  itemId: string;
  type: "in" | "out";
  quantity: number;
  notes?: string;
  destination?: "Charity Work" | "Office" | "Kitchen" | "House Keeping";
}) {
  const headers = await getFirebaseAuthHeader();
  const response = await fetch("/api/stock", {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error ?? "Failed to update stock");
  }
  return data;
}

export async function fetchDailyStock(date?: string): Promise<{
  date: string;
  items: DailyStockItem[];
}> {
  const headers = await getFirebaseAuthHeader();
  const query = date ? `?date=${encodeURIComponent(date)}` : "";
  const response = await fetch(`/api/daily-stock${query}`, {
    headers,
    cache: "no-store",
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error ?? "Failed to load daily stock");
  }
  return data;
}

export async function fetchReport(params: {
  period: "weekly" | "monthly" | "4months" | "custom";
  from?: string;
  to?: string;
}) {
  const headers = await getFirebaseAuthHeader();
  const search = new URLSearchParams({ period: params.period });
  if (params.period === "custom") {
    if (params.from) search.set("from", params.from);
    if (params.to) search.set("to", params.to);
  }
  const response = await fetch(`/api/reports?${search.toString()}`, {
    headers,
    cache: "no-store",
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error ?? "Failed to load report");
  }
  return data;
}

export async function fetchAnalytics(
  days: number,
  headers: HeadersInit
): Promise<AnalyticsResponse> {
  const response = await fetch(`/api/analytics?days=${days}`, {
    headers,
    cache: "no-store",
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error ?? "Failed to load analytics");
  }
  return data as AnalyticsResponse;
}

export async function updateItem(
  payload: Record<string, unknown>,
  headers: HeadersInit
) {
  const response = await fetch("/api/items", {
    method: "PUT",
    headers,
    body: JSON.stringify(payload),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error ?? "Failed to update item");
  }
  return data.item;
}

export async function sendTestAlert(headers: HeadersInit) {
  const response = await fetch("/api/alerts/test", {
    method: "POST",
    headers,
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error ?? "Failed to send test alert");
  }
  return data;
}
