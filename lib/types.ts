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
