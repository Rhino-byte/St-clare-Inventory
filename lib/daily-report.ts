import PDFDocument from "pdfkit";
import { weekdayFromDateKey } from "@/lib/dates";
import { reportStockBalanceRows } from "@/lib/reports";
import { loadDailyReportSourceData } from "@/lib/sheets";
import type {
  DailyReportMealSection,
  DailyReportPayload,
  DailyReportRow,
  DailyReportSettings,
  MenuMeal,
  InventoryItem,
  StockCorrection,
  Transaction,
  WeeklyMenuTemplateEntry,
} from "@/lib/types";
import { MENU_MEALS } from "@/lib/types";

const MEAL_LABELS: Record<MenuMeal, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
};

export function buildDailyReport(params: {
  dateKey: string;
  template: WeeklyMenuTemplateEntry[];
  inventory: InventoryItem[];
  transactions: Transaction[];
  corrections?: StockCorrection[];
}): DailyReportPayload {
  const { dateKey, template, inventory, transactions, corrections = [] } =
    params;
  const weekday = weekdayFromDateKey(dateKey);

  const inventoryById = new Map(inventory.map((item) => [item.itemId, item]));
  const balanceById = new Map(
    reportStockBalanceRows(
      inventory,
      transactions,
      dateKey,
      dateKey,
      corrections
    ).map((row) => [row.itemId, row])
  );

  const missingItemIds: string[] = [];
  const rows: DailyReportRow[] = template.map((entry) => {
    const balance = balanceById.get(entry.itemId);
    const item = inventoryById.get(entry.itemId);
    if (!item) {
      missingItemIds.push(entry.itemId);
    }

    const stockIn = balance?.stockIn ?? 0;
    const stockOut = balance?.stockOut ?? 0;

    return {
      itemId: entry.itemId,
      itemName: item?.itemName ?? entry.itemName,
      unit: item?.unit ?? "",
      meal: entry.meal,
      opening: balance?.opening ?? 0,
      stockIn,
      stockOut,
      closing: balance?.closing ?? 0,
      hasMovement: stockIn > 0 || stockOut > 0,
    };
  });

  const sections: DailyReportMealSection[] = MENU_MEALS.map((meal) => ({
    meal,
    rows: rows.filter((row) => row.meal === meal),
  })).filter((section) => section.rows.length > 0);

  return { date: dateKey, weekday, rows, sections, missingItemIds };
}

export async function loadDailyReportForDate(
  dateKey: string
): Promise<DailyReportPayload> {
  const weekday = weekdayFromDateKey(dateKey);
  const source = await loadDailyReportSourceData();
  const template = source.weeklyMenuEntries.filter(
    (entry) => entry.weekday === weekday
  );

  return buildDailyReport({
    dateKey,
    template,
    inventory: source.inventory,
    transactions: source.transactions,
    corrections: source.corrections,
  });
}

export function resolveDailyReportRecipients(
  settings: DailyReportSettings
): string[] {
  const fromSettings = settings.recipients
    .split(",")
    .map((email) => email.trim())
    .filter(Boolean);

  if (fromSettings.length) {
    return fromSettings;
  }

  const fallback = process.env.ADMIN_ALERT_EMAIL ?? "";
  return fallback
    .split(",")
    .map((email) => email.trim())
    .filter(Boolean);
}

function formatReportDate(dateKey: string): string {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString("en-KE", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "Africa/Nairobi",
  });
}

function formatNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

function renderTableRowsHtml(rows: DailyReportRow[]): string {
  return rows
    .map((row) => {
      const rowStyle = row.hasMovement
        ? "background:#ffffff;"
        : "background:#fffbeb;border-left:4px solid #f59e0b;";
      const status = row.hasMovement
        ? ""
        : `<span style="display:inline-block;margin-left:8px;padding:2px 8px;border-radius:9999px;background:#fef3c7;color:#92400e;font-size:11px;font-weight:600;">No movement</span>`;

      return `<tr style="${rowStyle}">
        <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;font-weight:600;">${escapeHtml(row.itemName)}${status}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;text-align:right;">${formatNumber(row.opening)}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;text-align:right;">${formatNumber(row.stockIn)}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;text-align:right;">${formatNumber(row.stockOut)}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;text-align:right;font-weight:600;">${formatNumber(row.closing)}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;">${escapeHtml(row.unit)}</td>
      </tr>`;
    })
    .join("");
}

function renderMobileCardsHtml(rows: DailyReportRow[]): string {
  return rows
    .map((row) => {
      const cardStyle = row.hasMovement
        ? "border:1px solid #e2e8f0;background:#ffffff;"
        : "border:1px solid #fcd34d;background:#fffbeb;";
      const status = row.hasMovement
        ? ""
        : `<p style="margin:8px 0 0;font-size:12px;color:#92400e;font-weight:600;">No movement today</p>`;

      return `<div style="${cardStyle}border-radius:12px;padding:14px;margin-bottom:12px;">
        <p style="margin:0;font-size:15px;font-weight:700;color:#0f172a;">${escapeHtml(row.itemName)}</p>
        ${status}
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:12px;font-size:13px;">
          <div><span style="color:#64748b;">Opening</span><br><strong>${formatNumber(row.opening)}</strong></div>
          <div><span style="color:#64748b;">Stock In</span><br><strong>${formatNumber(row.stockIn)}</strong></div>
          <div><span style="color:#64748b;">Stock Out</span><br><strong>${formatNumber(row.stockOut)}</strong></div>
          <div><span style="color:#64748b;">Closing</span><br><strong>${formatNumber(row.closing)}</strong></div>
        </div>
      </div>`;
    })
    .join("");
}

export function renderDailyReportHtml(payload: DailyReportPayload): string {
  const title = `Daily Stock Report — ${formatReportDate(payload.date)}`;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const desktopSections = payload.sections
    .map(
      (section) => `<div style="margin-bottom:24px;">
        <h2 style="margin:0 0 12px;font-size:16px;color:#047857;">${MEAL_LABELS[section.meal]}</h2>
        <table style="width:100%;border-collapse:collapse;font-size:14px;min-width:560px;">
          <thead>
            <tr style="background:#f8fafc;">
              <th style="padding:10px 12px;text-align:left;border-bottom:2px solid #e2e8f0;">Item</th>
              <th style="padding:10px 12px;text-align:right;border-bottom:2px solid #e2e8f0;">Opening</th>
              <th style="padding:10px 12px;text-align:right;border-bottom:2px solid #e2e8f0;">In</th>
              <th style="padding:10px 12px;text-align:right;border-bottom:2px solid #e2e8f0;">Out</th>
              <th style="padding:10px 12px;text-align:right;border-bottom:2px solid #e2e8f0;">Closing</th>
              <th style="padding:10px 12px;text-align:left;border-bottom:2px solid #e2e8f0;">Unit</th>
            </tr>
          </thead>
          <tbody>${renderTableRowsHtml(section.rows)}</tbody>
        </table>
      </div>`
    )
    .join("");

  const mobileSections = payload.sections
    .map(
      (section) => `<div style="margin-bottom:20px;">
        <h2 style="margin:0 0 12px;font-size:16px;color:#047857;">${MEAL_LABELS[section.meal]}</h2>
        ${renderMobileCardsHtml(section.rows)}
      </div>`
    )
    .join("");

  const missingNote =
    payload.missingItemIds.length > 0
      ? `<p style="margin:16px 0 0;color:#b45309;font-size:13px;">${payload.missingItemIds.length} template item(s) were not found in inventory and are shown with zero balances.</p>`
      : "";

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#0f172a;">
  <div style="max-width:720px;margin:0 auto;padding:24px 16px;">
    <div style="background:#047857;color:#ffffff;border-radius:16px 16px 0 0;padding:20px 24px;">
      <p style="margin:0;font-size:13px;opacity:0.9;">St Clare Inventory</p>
      <h1 style="margin:8px 0 0;font-size:22px;line-height:1.3;">${escapeHtml(title)}</h1>
    </div>
    <div style="background:#ffffff;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 16px 16px;padding:20px 24px;">
      <p style="margin:0 0 16px;color:#64748b;font-size:14px;">Menu: ${escapeHtml(payload.weekday)}. Items with no stock in or out are highlighted in amber.</p>
      <div class="desktop-table" style="display:block;overflow-x:auto;">${desktopSections}</div>
      <div class="mobile-cards" style="display:none;">${mobileSections}</div>
      ${missingNote}
      <p style="margin:24px 0 0;font-size:13px;color:#64748b;">
        <a href="${appUrl}/admin/daily-report" style="color:#047857;">Open daily report in admin</a>
      </p>
    </div>
  </div>
  <style>
    @media only screen and (max-width: 640px) {
      .desktop-table { display: none !important; }
      .mobile-cards { display: block !important; }
    }
  </style>
</body>
</html>`;
}

export function renderDailyReportText(payload: DailyReportPayload): string {
  const lines = [
    `Daily Stock Report — ${formatReportDate(payload.date)}`,
    `Menu day: ${payload.weekday}`,
    "",
  ];

  for (const section of payload.sections) {
    lines.push(MEAL_LABELS[section.meal]);
    lines.push("Item | Opening | In | Out | Closing | Unit | Status");
    for (const row of section.rows) {
      const status = row.hasMovement ? "OK" : "NO MOVEMENT";
      lines.push(
        `${row.itemName} | ${formatNumber(row.opening)} | ${formatNumber(row.stockIn)} | ${formatNumber(row.stockOut)} | ${formatNumber(row.closing)} | ${row.unit} | ${status}`
      );
    }
    lines.push("");
  }

  return lines.join("\n");
}

export function renderDailyReportPdf(payload: DailyReportPayload): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: "A4" });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.fontSize(18).fillColor("#047857").text("St Clare Inventory");
    doc
      .fontSize(14)
      .fillColor("#0f172a")
      .text(`Daily Stock Report — ${formatReportDate(payload.date)}`, {
        underline: true,
      });
    doc.moveDown(0.5);
    doc
      .fontSize(10)
      .fillColor("#64748b")
      .text(`Menu: ${payload.weekday}. Items with no stock in or out are highlighted.`);

    const startX = 40;
    const colWidths = [150, 55, 45, 45, 55, 45];
    const headers = ["Item", "Opening", "In", "Out", "Closing", "Unit"];
    let y = doc.y + 12;

    function drawRow(
      values: string[],
      options?: { header?: boolean; highlight?: boolean }
    ) {
      if (y > 760) {
        doc.addPage();
        y = 40;
      }

      if (options?.highlight) {
        doc.save();
        doc.rect(startX, y - 2, 395, 16).fill("#fffbeb");
        doc.restore();
      }

      let x = startX;
      values.forEach((value, index) => {
        doc
          .fontSize(options?.header ? 9 : 8)
          .fillColor(options?.header ? "#0f172a" : "#334155")
          .font(options?.header ? "Helvetica-Bold" : "Helvetica")
          .text(value, x, y, {
            width: colWidths[index],
            align: index === 0 ? "left" : "right",
            lineBreak: false,
          });
        x += colWidths[index];
      });
      y += options?.header ? 18 : 16;
    }

    for (const section of payload.sections) {
      if (y > 720) {
        doc.addPage();
        y = 40;
      }

      doc
        .fontSize(11)
        .fillColor("#047857")
        .font("Helvetica-Bold")
        .text(MEAL_LABELS[section.meal], startX, y);
      y += 20;

      drawRow(headers, { header: true });
      doc
        .moveTo(startX, y - 4)
        .lineTo(startX + 395, y - 4)
        .strokeColor("#e2e8f0")
        .stroke();
      y += 4;

      for (const row of section.rows) {
        drawRow(
          [
            row.hasMovement ? row.itemName : `${row.itemName} *`,
            formatNumber(row.opening),
            formatNumber(row.stockIn),
            formatNumber(row.stockOut),
            formatNumber(row.closing),
            row.unit,
          ],
          { highlight: !row.hasMovement }
        );
      }

      y += 10;
    }

    doc.moveDown(2);
    doc
      .fontSize(8)
      .fillColor("#92400e")
      .text("* No movement recorded for this item on the report date.");

    doc.end();
  });
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
