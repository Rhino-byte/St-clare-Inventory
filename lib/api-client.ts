import type {
  CategoryTopDailySeries,
  DailyStockItem,
  DailyTopByCategory,
  DestinationTotal,
  InventoryOption,
  ItemDailyOutSeries,
  PeriodComparisonSeries,
  StockHealth,
  UserActivitySeries,
} from "@/lib/analytics";
import type {
  DashboardStats,
  InventoryItem,
  BulkStockMovementRequest,
  StockCorrection,
  StockCorrectionRequest,
  StockDestination,
  Transaction,
} from "@/lib/types";
import { getFirebaseAuthHeader } from "@/lib/auth/use-firebase-auth";

export type AnalyticsResponse = {
  stats: DashboardStats;
  lowStockItems: InventoryItem[];
  category?: string;
  destination?: string;
  categories: string[];
  destinations: string[];
  stockHealth: StockHealth;
  dailyMovement: Array<{ date: string; in: number; out: number }>;
  destinationTotals: DestinationTotal[];
  topUsed: CategoryTopDailySeries;
  periodComparison: PeriodComparisonSeries;
  inventoryOptions: InventoryOption[];
  itemUsageSeries: ItemDailyOutSeries;
  itemUsageDays: number;
  defaultItemIds: string[];
  userActivity: UserActivitySeries;
  // Legacy optional fields kept for older callers
  categoryStock?: Array<{ category: string; stock: number }>;
  topStockIn?: Array<{ itemId: string; itemName: string; quantity: number }>;
  itemMovement?: Array<{
    itemId: string;
    itemName: string;
    in: number;
    out: number;
    net: number;
  }>;
  transactions?: Transaction[];
  dailyTopByCategory?: DailyTopByCategory;
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
  destination?: StockDestination;
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

export async function submitBulkStockMovement(payload: BulkStockMovementRequest): Promise<{
  items: InventoryItem[];
}> {
  const headers = await getFirebaseAuthHeader();
  const response = await fetch("/api/stock/bulk", {
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
  headers: HeadersInit,
  filters?: { category?: string; destination?: string }
): Promise<AnalyticsResponse> {
  const search = new URLSearchParams({ days: String(days) });
  if (filters?.category) search.set("category", filters.category);
  if (filters?.destination) search.set("destination", filters.destination);
  const response = await fetch(`/api/analytics?${search.toString()}`, {
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

export async function fetchCorrections(limit = 50): Promise<StockCorrection[]> {
  const headers = await getFirebaseAuthHeader();
  const response = await fetch(`/api/corrections?limit=${limit}`, {
    headers,
    cache: "no-store",
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error ?? "Failed to load corrections");
  }
  return data.corrections ?? [];
}

export async function submitStockCorrection(
  payload: StockCorrectionRequest
): Promise<{
  item: InventoryItem;
  correction: StockCorrection;
  alertSent: boolean;
}> {
  const headers = await getFirebaseAuthHeader();
  const response = await fetch("/api/corrections", {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error ?? "Failed to apply correction");
  }
  return data;
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
