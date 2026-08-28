import { google } from "googleapis";
import {
  cachedSheetsFetch,
  invalidateSheetsCache,
  SHEETS_CACHE_TTLS,
} from "./sheets-cache";
import { withSheetsRetry } from "./sheets-retry";
import {
  calculateClosingStock,
  parseOptionalNumber,
  parseSheetNumber,
  toSheetInteger,
  toSheetItemId,
} from "./stock";
import type {
  AlertLogEntry,
  DailyReportSettings,
  DailyReportTemplateEntry,
  InventoryItem,
  ItemUpdateRequest,
  MenuMeal,
  StockCorrection,
  Transaction,
  Weekday,
  WeeklyMenuMeals,
  WeeklyMenuTemplateEntry,
} from "./types";
import { DEFAULT_STOCK_DESTINATION, MENU_MEALS } from "./types";

const INVENTORY_SHEET = "Sheet1";
const TRANSACTIONS_SHEET = "Transactions";
const ALERT_LOG_SHEET = "AlertLog";
const CORRECTIONS_SHEET = "Corrections";
const DAILY_REPORT_TEMPLATE_SHEET = "DailyReportTemplate";
const DAILY_REPORT_SETTINGS_SHEET = "DailyReportSettings";
const WEEKLY_MENU_TEMPLATE_SHEET = "WeeklyMenuTemplate";

const DEFAULT_DAILY_REPORT_SETTINGS: DailyReportSettings = {
  enabled: false,
  sendTime: "20:00",
  recipients: "",
  lastSentDate: "",
};

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

const ENSURE_AUX_TTL_MS = 5 * 60_000;
let ensureAuxiliaryPromise: Promise<void> | null = null;
let ensureAuxiliaryExpiresAt = 0;

function invalidateEnsureAuxiliaryCache(): void {
  ensureAuxiliaryPromise = null;
  ensureAuxiliaryExpiresAt = 0;
}

export async function ensureAuxiliarySheets(): Promise<void> {
  const now = Date.now();
  if (ensureAuxiliaryPromise && ensureAuxiliaryExpiresAt > now) {
    return ensureAuxiliaryPromise;
  }

  ensureAuxiliaryPromise = ensureAuxiliarySheetsImpl().then(() => {
    ensureAuxiliaryExpiresAt = Date.now() + ENSURE_AUX_TTL_MS;
  });

  return ensureAuxiliaryPromise;
}

async function ensureAuxiliarySheetsImpl(): Promise<void> {
  const sheets = getSheetsClient();
  const spreadsheetId = getSpreadsheetId();
  const meta = await withSheetsRetry(() =>
    sheets.spreadsheets.get({ spreadsheetId })
  );
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

  if (!existing.has(DAILY_REPORT_TEMPLATE_SHEET)) {
    requests.push({
      addSheet: { properties: { title: DAILY_REPORT_TEMPLATE_SHEET } },
    });
  }

  if (!existing.has(DAILY_REPORT_SETTINGS_SHEET)) {
    requests.push({
      addSheet: { properties: { title: DAILY_REPORT_SETTINGS_SHEET } },
    });
  }

  if (!existing.has(WEEKLY_MENU_TEMPLATE_SHEET)) {
    requests.push({
      addSheet: { properties: { title: WEEKLY_MENU_TEMPLATE_SHEET } },
    });
  }

  if (requests.length) {
    await withSheetsRetry(() =>
      sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: { requests },
      })
    );
    invalidateEnsureAuxiliaryCache();
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

  if (!existing.has(DAILY_REPORT_TEMPLATE_SHEET)) {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${DAILY_REPORT_TEMPLATE_SHEET}!A1:C1`,
      valueInputOption: "RAW",
      requestBody: {
        values: [["Sort Order", "Item ID", "Item Name"]],
      },
    });
  }

  if (!existing.has(DAILY_REPORT_SETTINGS_SHEET)) {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${DAILY_REPORT_SETTINGS_SHEET}!A1:B5`,
      valueInputOption: "RAW",
      requestBody: {
        values: [
          ["Key", "Value"],
          ["enabled", "false"],
          ["sendTime", DEFAULT_DAILY_REPORT_SETTINGS.sendTime],
          ["recipients", ""],
          ["lastSentDate", ""],
        ],
      },
    });
  }

  if (!existing.has(WEEKLY_MENU_TEMPLATE_SHEET)) {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${WEEKLY_MENU_TEMPLATE_SHEET}!A1:E1`,
      valueInputOption: "RAW",
      requestBody: {
        values: [["Day", "Meal", "Sort", "Item ID", "Item Name"]],
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
  return cachedSheetsFetch(
    "inventory",
    SHEETS_CACHE_TTLS.inventory,
    readInventoryItemsUncached
  );
}

async function readInventoryItemsUncached(): Promise<InventoryItem[]> {
  const sheets = getSheetsClient();
  const response = await withSheetsRetry(() =>
    sheets.spreadsheets.values.get({
      spreadsheetId: getSpreadsheetId(),
      range: `${INVENTORY_SHEET}!A2:J`,
    })
  );

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

  invalidateSheetsCache(["inventory", "dailyReportSource"]);

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

  await withSheetsRetry(() =>
    sheets.spreadsheets.values.batchUpdate({
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
    })
  );

  invalidateSheetsCache(["inventory", "transactions", "dailyReportSource"]);

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

  await withSheetsRetry(() =>
    sheets.spreadsheets.values.append({
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
    })
  );

  invalidateSheetsCache(["transactions", "dailyReportSource"]);
}

export async function getTransactions(): Promise<Transaction[]> {
  return cachedSheetsFetch(
    "transactions",
    SHEETS_CACHE_TTLS.transactions,
    readTransactionsUncached
  );
}

async function readTransactionsUncached(): Promise<Transaction[]> {
  await ensureAuxiliarySheets();
  const sheets = getSheetsClient();
  const response = await withSheetsRetry(() =>
    sheets.spreadsheets.values.get({
      spreadsheetId: getSpreadsheetId(),
      range: `${TRANSACTIONS_SHEET}!A2:H`,
    })
  );

  const rows = response.data.values ?? [];
  return parseTransactionRows(rows);
}

function parseTransactionRows(rows: string[][]): Transaction[] {
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
  return cachedSheetsFetch(
    "corrections",
    SHEETS_CACHE_TTLS.corrections,
    readCorrectionsUncached
  );
}

async function readCorrectionsUncached(): Promise<StockCorrection[]> {
  await ensureAuxiliarySheets();
  const sheets = getSheetsClient();
  const response = await withSheetsRetry(() =>
    sheets.spreadsheets.values.get({
      spreadsheetId: getSpreadsheetId(),
      range: `${CORRECTIONS_SHEET}!A2:H`,
    })
  );

  const rows = response.data.values ?? [];
  return parseCorrectionRows(rows);
}

function parseCorrectionRows(rows: string[][]): StockCorrection[] {
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

  await withSheetsRetry(() =>
    sheets.spreadsheets.values.append({
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
    })
  );

  invalidateSheetsCache(["corrections", "dailyReportSource"]);
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
  await withSheetsRetry(() =>
    sheets.spreadsheets.values.update({
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
    })
  );

  invalidateSheetsCache(["inventory", "dailyReportSource"]);

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

function parseDailyReportSettingsRows(
  rows: string[][]
): DailyReportSettings {
  const map = new Map<string, string>();
  for (const row of rows) {
    const key = String(row[0] ?? "").trim();
    if (!key || key.toLowerCase() === "key") continue;
    map.set(key, String(row[1] ?? "").trim());
  }

  const enabledRaw = (map.get("enabled") ?? "false").toLowerCase();
  const sendTime = map.get("sendTime") ?? DEFAULT_DAILY_REPORT_SETTINGS.sendTime;

  return {
    enabled: enabledRaw === "true" || enabledRaw === "1" || enabledRaw === "yes",
    sendTime: /^\d{2}:\d{2}$/.test(sendTime)
      ? sendTime
      : DEFAULT_DAILY_REPORT_SETTINGS.sendTime,
    recipients: map.get("recipients") ?? "",
    lastSentDate: map.get("lastSentDate") ?? "",
  };
}

export async function getDailyReportTemplate(): Promise<
  DailyReportTemplateEntry[]
> {
  await ensureAuxiliarySheets();
  const sheets = getSheetsClient();
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: getSpreadsheetId(),
    range: `${DAILY_REPORT_TEMPLATE_SHEET}!A2:C`,
  });

  const rows = response.data.values ?? [];
  return rows
    .map((row, index) => {
      const itemId = String(row[1] ?? "").trim();
      const itemName = String(row[2] ?? "").trim();
      if (!itemId) return null;
      const sortOrder = parseSheetNumber(row[0]);
      return {
        sortOrder: sortOrder > 0 ? sortOrder : index + 1,
        itemId,
        itemName,
      };
    })
    .filter((entry): entry is DailyReportTemplateEntry => entry !== null)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export async function saveDailyReportTemplate(
  entries: DailyReportTemplateEntry[]
): Promise<void> {
  await ensureAuxiliarySheets();
  const sheets = getSheetsClient();
  const spreadsheetId = getSpreadsheetId();

  const values = [
    ["Sort Order", "Item ID", "Item Name"],
    ...entries.map((entry, index) => [
      String(index + 1),
      toSheetItemId(entry.itemId),
      entry.itemName,
    ]),
  ];

  await sheets.spreadsheets.values.clear({
    spreadsheetId,
    range: `${DAILY_REPORT_TEMPLATE_SHEET}!A:Z`,
  });

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${DAILY_REPORT_TEMPLATE_SHEET}!A1`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values },
  });
}

function parseMenuMeal(value: string): MenuMeal | null {
  const meal = value.trim().toLowerCase();
  if (meal === "breakfast" || meal === "lunch" || meal === "dinner") {
    return meal;
  }
  return null;
}

function parseWeekday(value: string): Weekday | null {
  const day = value.trim().toLowerCase();
  const weekdays: Weekday[] = [
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
    "sunday",
  ];
  return weekdays.includes(day as Weekday) ? (day as Weekday) : null;
}

function emptyWeeklyMenuMeals(): WeeklyMenuMeals {
  return { breakfast: [], lunch: [], dinner: [] };
}

function parseWeeklyMenuRows(rows: string[][]): WeeklyMenuTemplateEntry[] {
  return rows
    .map((row, index) => {
      const weekday = parseWeekday(String(row[0] ?? ""));
      const meal = parseMenuMeal(String(row[1] ?? ""));
      const itemId = String(row[3] ?? "").trim();
      const itemName = String(row[4] ?? "").trim();
      if (!weekday || !meal || !itemId) return null;
      const sortOrder = parseSheetNumber(row[2]);
      return {
        weekday,
        meal,
        sortOrder: sortOrder > 0 ? sortOrder : index + 1,
        itemId,
        itemName,
      };
    })
    .filter((entry): entry is WeeklyMenuTemplateEntry => entry !== null);
}

function weeklyMenuMealsForDay(
  entries: WeeklyMenuTemplateEntry[],
  weekday: Weekday
): WeeklyMenuMeals {
  const meals = emptyWeeklyMenuMeals();

  for (const meal of MENU_MEALS) {
    meals[meal] = entries
      .filter((entry) => entry.weekday === weekday && entry.meal === meal)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((entry) => ({
        itemId: entry.itemId,
        itemName: entry.itemName,
        sortOrder: entry.sortOrder,
      }));
  }

  return meals;
}

function weeklyMenuEntriesForDay(
  entries: WeeklyMenuTemplateEntry[],
  weekday: Weekday
): WeeklyMenuTemplateEntry[] {
  return entries.filter((entry) => entry.weekday === weekday);
}

async function readWeeklyMenuTemplateRowsUncached(): Promise<WeeklyMenuTemplateEntry[]> {
  await ensureAuxiliarySheets();
  const sheets = getSheetsClient();
  const response = await withSheetsRetry(() =>
    sheets.spreadsheets.values.get({
      spreadsheetId: getSpreadsheetId(),
      range: `${WEEKLY_MENU_TEMPLATE_SHEET}!A2:E`,
    })
  );

  return parseWeeklyMenuRows(response.data.values ?? []);
}

async function loadWeeklyMenuEntries(): Promise<WeeklyMenuTemplateEntry[]> {
  let entries = await cachedSheetsFetch(
    "weeklyMenu",
    SHEETS_CACHE_TTLS.weeklyMenu,
    readWeeklyMenuTemplateRowsUncached
  );

  if (entries.length > 0) {
    return entries;
  }

  const legacy = await getDailyReportTemplate();
  if (!legacy.length) {
    return [];
  }

  const migrated: WeeklyMenuTemplateEntry[] = legacy.map((entry, index) => ({
    weekday: "monday",
    meal: "breakfast",
    sortOrder: index + 1,
    itemId: entry.itemId,
    itemName: entry.itemName,
  }));

  await writeWeeklyMenuTemplateRows(migrated);
  invalidateSheetsCache(["weeklyMenu", "dailyReportSource"]);
  return migrated;
}

async function writeWeeklyMenuTemplateRows(
  entries: WeeklyMenuTemplateEntry[]
): Promise<void> {
  const sheets = getSheetsClient();
  const spreadsheetId = getSpreadsheetId();
  const values = [
    ["Day", "Meal", "Sort", "Item ID", "Item Name"],
    ...entries.map((entry) => [
      entry.weekday,
      entry.meal,
      String(entry.sortOrder),
      toSheetItemId(entry.itemId),
      entry.itemName,
    ]),
  ];

  await withSheetsRetry(() =>
    sheets.spreadsheets.values.clear({
      spreadsheetId,
      range: `${WEEKLY_MENU_TEMPLATE_SHEET}!A:Z`,
    })
  );

  await withSheetsRetry(() =>
    sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${WEEKLY_MENU_TEMPLATE_SHEET}!A1`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values },
    })
  );
}

export async function migrateLegacyDailyReportTemplateIfNeeded(): Promise<void> {
  await loadWeeklyMenuEntries();
}

export async function getWeeklyMenuMealsForDay(
  weekday: Weekday
): Promise<WeeklyMenuMeals> {
  const entries = await loadWeeklyMenuEntries();
  return weeklyMenuMealsForDay(entries, weekday);
}

export async function getWeeklyMenuForDay(
  weekday: Weekday
): Promise<WeeklyMenuTemplateEntry[]> {
  const entries = await loadWeeklyMenuEntries();
  return weeklyMenuEntriesForDay(entries, weekday);
}

export async function saveWeeklyMenuForDay(
  weekday: Weekday,
  meals: WeeklyMenuMeals
): Promise<WeeklyMenuMeals> {
  const allEntries = await loadWeeklyMenuEntries();
  const kept = allEntries.filter((entry) => entry.weekday !== weekday);

  const nextForDay: WeeklyMenuTemplateEntry[] = [];
  for (const meal of MENU_MEALS) {
    meals[meal].forEach((item, index) => {
      if (!item.itemId) return;
      nextForDay.push({
        weekday,
        meal,
        sortOrder: index + 1,
        itemId: item.itemId,
        itemName: item.itemName,
      });
    });
  }

  await writeWeeklyMenuTemplateRows([...kept, ...nextForDay]);
  invalidateSheetsCache(["weeklyMenu", "dailyReportSource"]);
  return weeklyMenuMealsForDay([...kept, ...nextForDay], weekday);
}

export async function getDailyReportSettings(): Promise<DailyReportSettings> {
  return cachedSheetsFetch(
    "dailyReportSettings",
    SHEETS_CACHE_TTLS.dailyReportSettings,
    readDailyReportSettingsUncached
  );
}

async function readDailyReportSettingsUncached(): Promise<DailyReportSettings> {
  await ensureAuxiliarySheets();
  const sheets = getSheetsClient();
  const response = await withSheetsRetry(() =>
    sheets.spreadsheets.values.get({
      spreadsheetId: getSpreadsheetId(),
      range: `${DAILY_REPORT_SETTINGS_SHEET}!A2:B`,
    })
  );

  const rows = response.data.values ?? [];
  if (!rows.length) {
    return { ...DEFAULT_DAILY_REPORT_SETTINGS };
  }
  return parseDailyReportSettingsRows(rows);
}

export async function updateDailyReportSettings(
  settings: Partial<DailyReportSettings>
): Promise<DailyReportSettings> {
  const current = await getDailyReportSettings();
  const next: DailyReportSettings = {
    enabled: settings.enabled ?? current.enabled,
    sendTime: settings.sendTime ?? current.sendTime,
    recipients: settings.recipients ?? current.recipients,
    lastSentDate: settings.lastSentDate ?? current.lastSentDate,
  };

  const sheets = getSheetsClient();
  const spreadsheetId = getSpreadsheetId();

  await withSheetsRetry(() =>
    sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${DAILY_REPORT_SETTINGS_SHEET}!A1:B5`,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [
          ["Key", "Value"],
          ["enabled", next.enabled ? "true" : "false"],
          ["sendTime", next.sendTime],
          ["recipients", next.recipients],
          ["lastSentDate", next.lastSentDate],
        ],
      },
    })
  );

  invalidateSheetsCache("dailyReportSettings");

  return next;
}

export type DailyReportSourceData = {
  inventory: InventoryItem[];
  transactions: Transaction[];
  corrections: StockCorrection[];
  weeklyMenuEntries: WeeklyMenuTemplateEntry[];
};

export async function loadDailyReportSourceData(): Promise<DailyReportSourceData> {
  return cachedSheetsFetch(
    "dailyReportSource",
    SHEETS_CACHE_TTLS.dailyReportSource,
    readDailyReportSourceDataUncached
  );
}

async function readDailyReportSourceDataUncached(): Promise<DailyReportSourceData> {
  await ensureAuxiliarySheets();
  const sheets = getSheetsClient();
  const spreadsheetId = getSpreadsheetId();

  const response = await withSheetsRetry(() =>
    sheets.spreadsheets.values.batchGet({
      spreadsheetId,
      ranges: [
        `${INVENTORY_SHEET}!A2:J`,
        `${TRANSACTIONS_SHEET}!A2:H`,
        `${CORRECTIONS_SHEET}!A2:H`,
        `${WEEKLY_MENU_TEMPLATE_SHEET}!A2:E`,
      ],
    })
  );

  const ranges = response.data.valueRanges ?? [];
  const inventoryRows = (ranges[0]?.values ?? []) as string[][];
  const transactionRows = (ranges[1]?.values ?? []) as string[][];
  const correctionRows = (ranges[2]?.values ?? []) as string[][];
  const menuRows = (ranges[3]?.values ?? []) as string[][];

  let weeklyMenuEntries = parseWeeklyMenuRows(menuRows);
  if (weeklyMenuEntries.length === 0) {
    weeklyMenuEntries = await loadWeeklyMenuEntries();
  }

  return {
    inventory: inventoryRows
      .map((row, index) => rowToItem(row, index + 2))
      .filter((item): item is InventoryItem => item !== null),
    transactions: parseTransactionRows(transactionRows),
    corrections: parseCorrectionRows(correctionRows),
    weeklyMenuEntries,
  };
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
