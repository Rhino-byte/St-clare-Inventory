import nodemailer from "nodemailer";
import {
  renderDailyReportHtml,
  renderDailyReportPdf,
  renderDailyReportText,
  resolveDailyReportRecipients,
} from "@/lib/daily-report";
import type { DailyReportPayload, DailyReportSettings } from "@/lib/types";

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

export async function sendDailyReportEmail(
  payload: DailyReportPayload,
  settings: DailyReportSettings
): Promise<void> {
  const recipients = resolveDailyReportRecipients(settings);
  if (!recipients.length) {
    throw new Error(
      "No recipients configured. Set recipients in daily report settings or ADMIN_ALERT_EMAIL."
    );
  }

  const transporter = getTransporter();
  const pdf = await renderDailyReportPdf(payload);
  const subject = `Daily stock report — ${payload.date}`;

  await transporter.sendMail({
    from: process.env.SMTP_FROM ?? process.env.SMTP_USER,
    to: recipients.join(", "),
    subject,
    text: renderDailyReportText(payload),
    html: renderDailyReportHtml(payload),
    attachments: [
      {
        filename: `daily-stock-${payload.date}.pdf`,
        content: pdf,
        contentType: "application/pdf",
      },
    ],
  });
}
