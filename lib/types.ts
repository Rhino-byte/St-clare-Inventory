export interface InventoryItem {
  rowIndex: number;
  itemId: string;
  itemName: string;
  category: string;
  unit: string;
  openingStock: number;
  stockIn: number;
  stockOut: number;
  closingStock: number;
  reorderLevel: number | null;
  notes: string;
}

export type StockMovementType = "in" | "out";

export const STOCK_DESTINATIONS = [
  "Charity Work",
  "Office",
  "Kitchen",
  "House Keeping",
  "Visitors",
] as const;

export type StockDestination = (typeof STOCK_DESTINATIONS)[number];

export const DEFAULT_STOCK_DESTINATION: StockDestination = "Kitchen";

export interface StockMovementRequest {
  itemId: string;
  type: StockMovementType;
  quantity: number;
  notes?: string;
  /** Required for stock-out. Where items were taken. */
  destination?: StockDestination;
}

export interface BulkStockMovementLine {
  itemId: string;
  quantity: number;
  notes?: string;
  /** Required for stock-out. Where items were taken. */
  destination?: StockDestination;
}

export interface BulkStockMovementRequest {
  type: StockMovementType;
  lines: BulkStockMovementLine[];
}

export interface Transaction {
  timestamp: string;
  itemId: string;
  itemName: string;
  type: StockMovementType;
  quantity: number;
  userEmail: string;
  notes: string;
  /** Empty for stock-in. Kitchen default when reading blank stock-out rows. */
  destination: string;
}

export interface AlertLogEntry {
  itemId: string;
  lastAlertedAt: string;
  stockAtAlert: number;
}

export interface DashboardStats {
  totalItems: number;
  lowStockCount: number;
  outOfStockCount: number;
  todayMovements: number;
}

export interface ItemUpdateRequest {
  itemId: string;
  itemName?: string;
  category?: string;
  unit?: string;
  openingStock?: number;
  reorderLevel?: number | null;
  notes?: string;
}

export interface StockCorrectionRequest {
  itemId: string;
  /** Signed quantity: positive adds stock, negative removes stock. */
  delta: number;
  reason: string;
}

export interface StockCorrection {
  timestamp: string;
  itemId: string;
  itemName: string;
  delta: number;
  beforeClosing: number;
  afterClosing: number;
  adminEmail: string;
  reason: string;
}

export interface DailyReportTemplateEntry {
  sortOrder: number;
  itemId: string;
  itemName: string;
}

export const WEEKDAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

export type Weekday = (typeof WEEKDAYS)[number];

export const MENU_MEALS = ["breakfast", "lunch", "dinner"] as const;

export type MenuMeal = (typeof MENU_MEALS)[number];

export interface WeeklyMenuTemplateEntry {
  weekday: Weekday;
  meal: MenuMeal;
  sortOrder: number;
  itemId: string;
  itemName: string;
}

export type WeeklyMenuMeals = Record<
  MenuMeal,
  Array<{ itemId: string; itemName: string; sortOrder: number }>
>;

export interface DailyReportMealSection {
  meal: MenuMeal;
  rows: DailyReportRow[];
}

export interface DailyReportSettings {
  enabled: boolean;
  /** 24h HH:MM in Africa/Nairobi */
  sendTime: string;
  recipients: string;
  /** YYYY-MM-DD when cron last sent successfully */
  lastSentDate: string;
}

export interface DailyReportRow {
  itemId: string;
  itemName: string;
  unit: string;
  meal: MenuMeal;
  opening: number;
  stockIn: number;
  stockOut: number;
  closing: number;
  hasMovement: boolean;
}

export interface DailyReportPayload {
  date: string;
  weekday: Weekday;
  rows: DailyReportRow[];
  sections: DailyReportMealSection[];
  missingItemIds: string[];
}
