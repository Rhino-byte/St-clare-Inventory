import { google } from "googleapis";
import {
  calculateClosingStock,
  parseOptionalNumber,
  parseSheetNumber,
  toSheetInteger,
  toSheetItemId,
} from "./stock";
import type {
  AlertLogEntry,
  InventoryItem,
  ItemUpdateRequest,
  StockCorrection,
  Transaction,
} from "./types";
import { DEFAULT_STOCK_DESTINATION } from "./types";

const INVENTORY_SHEET = "Sheet1";
const TRANSACTIONS_SHEET = "Transactions";
const ALERT_LOG_SHEET = "AlertLog";
const CORRECTIONS_SHEET = "Corrections";

function getSpreadsheetId(): string {
  const id = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
  if (!id) {
    throw new Error("GOOGLE_SHEETS_SPREADSHEET_ID is not configured.");
  }
  return id;
}

function getSheetsClient() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(
    /\\n/g,
    "\n"
  );

  if (!email || !key) {
    throw new Error("Google service account credentials are not configured.");
  }

  const auth = new google.auth.JWT({
    email,
    key,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  return google.sheets({ version: "v4", auth });
}

function rowToItem(row: string[], rowIndex: number): InventoryItem | null {
  const itemId = String(row[0] ?? "").trim();
  const itemName = String(row[1] ?? "").trim();
  if (!itemId || !itemName) return null;

  const openingStock = parseSheetNumber(row[4]);
  const stockIn = parseSheetNumber(row[5]);
  const stockOut = parseSheetNumber(row[6]);
  const closingFromSheet = parseOptionalNumber(row[7]);
  const computedClosing = calculateClosingStock(openingStock, stockIn, stockOut);
  // Prefer sheet value when present, but never expose a negative closing stock.
  const closingStock = Math.max(
    0,
    closingFromSheet !== null ? closingFromSheet : computedClosing
  );

  return {
    rowIndex,
    itemId,
    itemName,
    category: String(row[2] ?? "").trim(),
    unit: String(row[3] ?? "").trim(),
    openingStock,
    stockIn,
    stockOut,
    closingStock,
    reorderLevel: parseOptionalNumber(row[8]),
    notes: String(row[9] ?? "").trim(),
  };
}

export async function ensureAuxiliarySheets(): Promise<void> {
  const sheets = getSheetsClient();
  const spreadsheetId = getSpreadsheetId();
  const meta = await sheets.spreadsheets.get({ spreadsheetId });
  const existing = new Set(
    meta.data.sheets?.map((sheet) => sheet.properties?.title).filter(Boolean)
  );

  const requests: Array<{ addSheet: { properties: { title: string } } }> = [];

  if (!existing.has(TRANSACTIONS_SHEET)) {
    requests.push({
      addSheet: { properties: { title: TRANSACTIONS_SHEET } },
    });
  }

  if (!existing.has(ALERT_LOG_SHEET)) {
    requests.push({
      addSheet: { properties: { title: ALERT_LOG_SHEET } },
    });
  }

  if (!existing.has(CORRECTIONS_SHEET)) {
    requests.push({
      addSheet: { properties: { title: CORRECTIONS_SHEET } },
    });
  }

  if (requests.length) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: { requests },
    });
  }

  if (!existing.has(TRANSACTIONS_SHEET)) {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${TRANSACTIONS_SHEET}!A1:H1`,
      valueInputOption: "RAW",
      requestBody: {
        values: [
          [
            "Timestamp",
            "Item ID",
            "Item Name",
            "Type",
            "Quantity",
            "User Email",
            "Notes",
            "Destination",
          ],
        ],
      },
    });
  } else {
    await ensureTransactionsDestinationColumn(sheets, spreadsheetId);
  }

  if (!existing.has(ALERT_LOG_SHEET)) {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${ALERT_LOG_SHEET}!A1:C1`,
      valueInputOption: "RAW",
      requestBody: {
        values: [["Item ID", "Last Alerted At", "Stock At Alert"]],
      },
    });
  }

  if (!existing.has(CORRECTIONS_SHEET)) {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${CORRECTIONS_SHEET}!A1:H1`,
      valueInputOption: "RAW",
      requestBody: {
        values: [
          [
            "Timestamp",
            "Item ID",
            "Item Name",
            "Delta",
            "Before Closing",
            "After Closing",
            "Admin Email",
            "Reason",
          ],
        ],
      },
    });
  }
}

/** Ensure column H header exists and backfill blank destinations with Kitchen. */
async function ensureTransactionsDestinationColumn(
  sheets: ReturnType<typeof getSheetsClient>,
  spreadsheetId: string
): Promise<void> {
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${TRANSACTIONS_SHEET}!A1:H`,
  });

  const rows = response.data.values ?? [];
  if (rows.length === 0) {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${TRANSACTIONS_SHEET}!A1:H1`,
      valueInputOption: "RAW",
      requestBody: {
        values: [
          [
            "Timestamp",
            "Item ID",
            "Item Name",
            "Type",
            "Quantity",
            "User Email",
            "Notes",
            "Destination",
          ],
        ],
      },
    });
    return;
  }

  const header = [...(rows[0] ?? [])];
  while (header.length < 8) {
    header.push("");
  }
  if (header[7]?.trim() !== "Destination") {
    header[7] = "Destination";
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${TRANSACTIONS_SHEET}!A1:H1`,
      valueInputOption: "RAW",
      requestBody: { values: [header] },
    });
  }

  const dataRows = rows.slice(1);
  if (dataRows.length === 0) {
    return;
  }

  let needsBackfill = false;
  const updatedRows = dataRows.map((row) => {
    const next = [...row];
    while (next.length < 8) {
      next.push("");
    }
    if (!next[7]?.trim()) {
      next[7] = DEFAULT_STOCK_DESTINATION;
      needsBackfill = true;
    }
    return next;
  });

  if (needsBackfill) {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${TRANSACTIONS_SHEET}!A2:H${dataRows.length + 1}`,
      valueInputOption: "RAW",
      requestBody: { values: updatedRows },
    });
  }
}

export async function getInventoryItems(): Promise<InventoryItem[]> {
  const sheets = getSheetsClient();
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: getSpreadsheetId(),
    range: `${INVENTORY_SHEET}!A2:J`,
  });

  const rows = response.data.values ?? [];
  return rows
    .map((row, index) => rowToItem(row, index + 2))
    .filter((item): item is InventoryItem => item !== null);
}

export async function getInventoryItemById(
  itemId: string
): Promise<InventoryItem | null> {
  const items = await getInventoryItems();
  return items.find((item) => item.itemId === itemId) ?? null;
}

export async function updateStockMovement(
  item: InventoryItem,
  type: "in" | "out",
  quantity: number
): Promise<InventoryItem> {
  const sheets = getSheetsClient();
  const spreadsheetId = getSpreadsheetId();

  const stockIn = type === "in" ? item.stockIn + quantity : item.stockIn;
  const stockOut = type === "out" ? item.stockOut + quantity : item.stockOut;
  const closingStock = calculateClosingStock(
    item.openingStock,
    stockIn,
    stockOut
  );

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${INVENTORY_SHEET}!F${item.rowIndex}:H${item.rowIndex}`,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [
        [
          toSheetInteger(stockIn),
          toSheetInteger(stockOut),
          toSheetInteger(closingStock),
        ],
      ],
    },
  });

  return {
    ...item,
    stockIn,
    stockOut,
    closingStock,
  };
}

/** Apply multiple inventory stock updates in one Sheets batch request. */
export async function batchUpdateStockMovements(
  updates: Array<{ item: InventoryItem; type: "in" | "out"; quantity: number }>
): Promise<InventoryItem[]> {
  if (updates.length === 0) return [];

  const sheets = getSheetsClient();
  const spreadsheetId = getSpreadsheetId();

  const updatedItems = updates.map(({ item, type, quantity }) => {
    const stockIn = type === "in" ? item.stockIn + quantity : item.stockIn;
    const stockOut = type === "out" ? item.stockOut + quantity : item.stockOut;
    const closingStock = calculateClosingStock(
      item.openingStock,
      stockIn,
      stockOut
    );
    return {
      ...item,
      stockIn,
      stockOut,
      closingStock,
    };
  });

  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId,
    requestBody: {
      valueInputOption: "USER_ENTERED",
      data: updatedItems.map((item) => ({
        range: `${INVENTORY_SHEET}!F${item.rowIndex}:H${item.rowIndex}`,
        values: [
          [
            toSheetInteger(item.stockIn),
            toSheetInteger(item.stockOut),
            toSheetInteger(item.closingStock),
          ],
        ],
      })),
    },
  });

  return updatedItems;
}

export async function appendTransaction(transaction: Transaction): Promise<void> {
  await appendTransactions([transaction]);
}

export async function appendTransactions(
  transactions: Transaction[]
): Promise<void> {
  if (transactions.length === 0) return;

  await ensureAuxiliarySheets();
  const sheets = getSheetsClient();

  await sheets.spreadsheets.values.append({
    spreadsheetId: getSpreadsheetId(),
    range: `${TRANSACTIONS_SHEET}!A:H`,
    valueInputOption: "USER_ENTERED",
    insertDataOption: "INSERT_ROWS",
    requestBody: {
      values: transactions.map((transaction) => [
        transaction.timestamp,
        toSheetItemId(transaction.itemId),
        transaction.itemName,
        transaction.type,
        toSheetInteger(transaction.quantity),
        transaction.userEmail,
        transaction.notes,
        transaction.destination,
      ]),
    },
  });
}

export async function getTransactions(): Promise<Transaction[]> {
  await ensureAuxiliarySheets();
  const sheets = getSheetsClient();
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: getSpreadsheetId(),
    range: `${TRANSACTIONS_SHEET}!A2:H`,
  });

  const rows = response.data.values ?? [];
  return rows.map((row) => {
    const rawType = String(row[3] ?? "")
      .trim()
      .toLowerCase();
    const type = (rawType === "out" ? "out" : "in") as Transaction["type"];
    const destination =
      String(row[7] ?? "").trim() ||
      (type === "out" ? DEFAULT_STOCK_DESTINATION : "");
    return {
      timestamp: String(row[0] ?? ""),
      itemId: String(row[1] ?? "").trim(),
      itemName: String(row[2] ?? ""),
      type,
      quantity: parseSheetNumber(row[4]),
      userEmail: String(row[5] ?? ""),
      notes: String(row[6] ?? ""),
      destination,
    };
  });
}

export async function getCorrections(): Promise<StockCorrection[]> {
  await ensureAuxiliarySheets();
  const sheets = getSheetsClient();
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: getSpreadsheetId(),
    range: `${CORRECTIONS_SHEET}!A2:H`,
  });

  const rows = response.data.values ?? [];
  return rows
    .map((row) => ({
      timestamp: String(row[0] ?? ""),
      itemId: String(row[1] ?? "").trim(),
      itemName: String(row[2] ?? ""),
      delta: parseSheetNumber(row[3]),
      beforeClosing: parseSheetNumber(row[4]),
      afterClosing: parseSheetNumber(row[5]),
      adminEmail: String(row[6] ?? ""),
      reason: String(row[7] ?? ""),
    }))
    .filter((entry) => entry.itemId && entry.timestamp);
}

export async function appendCorrection(
  correction: StockCorrection
): Promise<void> {
  await ensureAuxiliarySheets();
  const sheets = getSheetsClient();

  await sheets.spreadsheets.values.append({
    spreadsheetId: getSpreadsheetId(),
    range: `${CORRECTIONS_SHEET}!A:H`,
    valueInputOption: "USER_ENTERED",
    insertDataOption: "INSERT_ROWS",
    requestBody: {
      values: [
        [
          correction.timestamp,
          toSheetItemId(correction.itemId),
          correction.itemName,
          toSheetInteger(correction.delta),
          toSheetInteger(correction.beforeClosing),
          toSheetInteger(correction.afterClosing),
          correction.adminEmail,
          correction.reason,
        ],
      ],
    },
  });
}

export async function updateItemMetadata(
  update: ItemUpdateRequest
): Promise<InventoryItem> {
  const item = await getInventoryItemById(update.itemId);
  if (!item) {
    throw new Error("Item not found.");
  }

  const nextItem: InventoryItem = {
    ...item,
    itemName: update.itemName ?? item.itemName,
    category: update.category ?? item.category,
    unit: update.unit ?? item.unit,
    openingStock: update.openingStock ?? item.openingStock,
    reorderLevel:
      update.reorderLevel !== undefined ? update.reorderLevel : item.reorderLevel,
    notes: update.notes ?? item.notes,
  };

  nextItem.closingStock = calculateClosingStock(
    nextItem.openingStock,
    nextItem.stockIn,
    nextItem.stockOut
  );

  const sheets = getSheetsClient();
  await sheets.spreadsheets.values.update({
    spreadsheetId: getSpreadsheetId(),
    range: `${INVENTORY_SHEET}!B${item.rowIndex}:J${item.rowIndex}`,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [
        [
          nextItem.itemName,
          nextItem.category,
          nextItem.unit,
          toSheetInteger(nextItem.openingStock),
          toSheetInteger(nextItem.stockIn),
          toSheetInteger(nextItem.stockOut),
          toSheetInteger(nextItem.closingStock),
          nextItem.reorderLevel === null
            ? ""
            : toSheetInteger(nextItem.reorderLevel),
          nextItem.notes,
        ],
      ],
    },
  });

  return nextItem;
}

export async function getAlertLogs(): Promise<AlertLogEntry[]> {
  await ensureAuxiliarySheets();
  const sheets = getSheetsClient();
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: getSpreadsheetId(),
    range: `${ALERT_LOG_SHEET}!A2:C`,
  });

  const rows = response.data.values ?? [];
  return rows.map((row) => ({
    itemId: String(row[0] ?? "").trim(),
    lastAlertedAt: String(row[1] ?? ""),
    stockAtAlert: parseSheetNumber(row[2]),
  }));
}

export async function upsertAlertLog(entry: AlertLogEntry): Promise<void> {
  await ensureAuxiliarySheets();
  const sheets = getSheetsClient();
  const spreadsheetId = getSpreadsheetId();
  const logs = await getAlertLogs();
  const existingIndex = logs.findIndex((log) => log.itemId === entry.itemId);

  const rowValues = [
    toSheetItemId(entry.itemId),
    entry.lastAlertedAt,
    toSheetInteger(entry.stockAtAlert),
  ];

  if (existingIndex === -1) {
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${ALERT_LOG_SHEET}!A:C`,
      valueInputOption: "USER_ENTERED",
      insertDataOption: "INSERT_ROWS",
      requestBody: {
        values: [rowValues],
      },
    });
    return;
  }

  const rowIndex = existingIndex + 2;
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${ALERT_LOG_SHEET}!A${rowIndex}:C${rowIndex}`,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [rowValues],
    },
  });
}
