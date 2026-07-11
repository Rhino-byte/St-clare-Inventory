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

export interface StockMovementRequest {
  itemId: string;
  type: StockMovementType;
  quantity: number;
  notes?: string;
}

export interface Transaction {
  timestamp: string;
  itemId: string;
  itemName: string;
  type: StockMovementType;
  quantity: number;
  userEmail: string;
  notes: string;
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
