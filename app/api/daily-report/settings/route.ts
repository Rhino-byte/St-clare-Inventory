import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/api-auth";
import {
  getDailyReportSettings,
  updateDailyReportSettings,
} from "@/lib/sheets";
import type { DailyReportSettings } from "@/lib/types";

const TIME_RE = /^\d{2}:\d{2}$/;

function parseSettingsBody(body: unknown): Partial<DailyReportSettings> {
  if (!body || typeof body !== "object") {
    throw new Error("Invalid request body.");
  }

  const payload = body as Partial<DailyReportSettings>;
  const next: Partial<DailyReportSettings> = {};

  if (payload.enabled !== undefined) {
    next.enabled = Boolean(payload.enabled);
  }

  if (payload.sendTime !== undefined) {
    const sendTime = String(payload.sendTime).trim();
    if (!TIME_RE.test(sendTime)) {
      throw new Error("sendTime must use HH:MM format.");
    }
    next.sendTime = sendTime;
  }

  if (payload.recipients !== undefined) {
    next.recipients = String(payload.recipients).trim();
  }

  if (payload.lastSentDate !== undefined) {
    next.lastSentDate = String(payload.lastSentDate).trim();
  }

  return next;
}

export async function GET(request: Request) {
  try {
    await requireAdmin(request);
    const settings = await getDailyReportSettings();
    return NextResponse.json({ settings });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("GET /api/daily-report/settings", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to load settings",
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    await requireAdmin(request);
    const body = await request.json();
    const updates = parseSettingsBody(body);
    const settings = await updateDailyReportSettings(updates);
    return NextResponse.json({ settings });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("PUT /api/daily-report/settings", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to save settings",
      },
      { status: 400 }
    );
  }
}
