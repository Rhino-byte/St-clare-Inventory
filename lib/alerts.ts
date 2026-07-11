import nodemailer from "nodemailer";
import { getAlertLogs, upsertAlertLog } from "./sheets";
import { isLowStock } from "./stock";
import type { InventoryItem } from "./types";

function getSmtpConfig() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT ?? 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;

  if (!host || !user || !pass) {
    throw new Error("SMTP credentials are not fully configured.");
  }

  return { host, port, user, pass };
}

function getTransporter() {
  const { host, port, user, pass } = getSmtpConfig();
  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

function getAlertRecipients(): string[] {
  const raw = process.env.ADMIN_ALERT_EMAIL ?? "";
  return raw
    .split(",")
    .map((email) => email.trim())
    .filter(Boolean);
}

export async function sendTestEmail(): Promise<void> {
  const transporter = getTransporter();
  const recipients = getAlertRecipients();
  if (!recipients.length) {
    throw new Error("ADMIN_ALERT_EMAIL is not configured.");
  }

  await transporter.sendMail({
    from: process.env.SMTP_FROM ?? process.env.SMTP_USER,
    to: recipients.join(", "),
    subject: "St Clare Inventory — Test Alert",
    text: "This is a test email from the St Clare Inventory Stock App.",
    html: "<p>This is a <strong>test email</strong> from the St Clare Inventory Stock App.</p>",
  });
}

export async function sendLowStockAlert(item: InventoryItem): Promise<boolean> {
  if (!isLowStock(item) || item.reorderLevel === null) {
    return false;
  }

  const logs = await getAlertLogs();
  const existing = logs.find((log) => log.itemId === item.itemId);
  if (existing && item.closingStock <= existing.stockAtAlert) {
    return false;
  }

  const transporter = getTransporter();
  const recipients = getAlertRecipients();
  if (!recipients.length) {
    throw new Error("ADMIN_ALERT_EMAIL is not configured.");
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const subject = `Low stock alert: ${item.itemName}`;
  const text = [
    `Item: ${item.itemName}`,
    `Category: ${item.category}`,
    `Current stock: ${item.closingStock} ${item.unit}`,
    `Reorder level: ${item.reorderLevel} ${item.unit}`,
    `Dashboard: ${appUrl}/admin/dashboard`,
  ].join("\n");

  await transporter.sendMail({
    from: process.env.SMTP_FROM ?? process.env.SMTP_USER,
    to: recipients.join(", "),
    subject,
    text,
    html: `<p><strong>${item.itemName}</strong> is running low.</p>
      <ul>
        <li>Category: ${item.category}</li>
        <li>Current stock: ${item.closingStock} ${item.unit}</li>
        <li>Reorder level: ${item.reorderLevel} ${item.unit}</li>
      </ul>
      <p><a href="${appUrl}/admin/dashboard">Open admin dashboard</a></p>`,
  });

  await upsertAlertLog({
    itemId: item.itemId,
    lastAlertedAt: new Date().toISOString(),
    stockAtAlert: item.closingStock,
  });

  return true;
}

export async function checkAllItemsForAlerts(
  items: InventoryItem[]
): Promise<number> {
  let sent = 0;
  for (const item of items) {
    try {
      const didSend = await sendLowStockAlert(item);
      if (didSend) sent += 1;
    } catch (error) {
      console.error(`Failed to alert for item ${item.itemId}:`, error);
    }
  }
  return sent;
}

export async function clearAlertIfRecovered(item: InventoryItem): Promise<void> {
  if (item.reorderLevel === null) return;
  if (item.closingStock > item.reorderLevel) {
    const logs = await getAlertLogs();
    const existing = logs.find((log) => log.itemId === item.itemId);
    if (existing) {
      await upsertAlertLog({
        itemId: item.itemId,
        lastAlertedAt: existing.lastAlertedAt,
        stockAtAlert: item.reorderLevel + 1,
      });
    }
  }
}
