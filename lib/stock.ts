import type { InventoryItem } from "./types";

export function calculateClosingStock(
  openingStock: number,
  stockIn: number,
  stockOut: number
): number {
  return Math.max(0, openingStock + stockIn - stockOut);
}

export function parseSheetNumber(value: string | number | undefined): number {
  if (value === undefined || value === null || value === "") return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

/** Whole number for Google Sheets numeric cells. */
export function toSheetInteger(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round(value);
}

/**
 * Write Item ID as a number when it is a plain integer string without leading zeros;
 * otherwise keep text (codes, letters, or padded IDs like 001).
 */
export function toSheetItemId(itemId: string): string | number {
  const trimmed = itemId.trim();
  if (/^(0|[1-9]\d*)$/.test(trimmed)) {
    const asNumber = Number(trimmed);
    if (Number.isSafeInteger(asNumber)) return asNumber;
  }
  return trimmed;
}

export function parseOptionalNumber(
  value: string | number | undefined
): number | null {
  if (value === undefined || value === null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function isLowStock(item: InventoryItem): boolean {
  if (item.reorderLevel === null) return false;
  return item.closingStock <= item.reorderLevel;
}

export function isOutOfStock(item: InventoryItem): boolean {
  return item.closingStock <= 0;
}

export function validateStockMovement(
  item: InventoryItem,
  type: "in" | "out",
  quantity: number
): string | null {
  if (!Number.isFinite(quantity) || quantity <= 0) {
    return "Quantity must be greater than zero.";
  }

  if (type === "out") {
    const available = Math.max(0, item.closingStock);
    if (available <= 0) {
      return `Cannot remove stock. ${item.itemName} has no available quantity.`;
    }
    if (quantity > available) {
      return `Cannot remove ${quantity} ${item.unit}. Only ${available} available.`;
    }
  }

  return null;
}
