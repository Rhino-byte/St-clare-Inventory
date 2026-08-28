import { NextResponse } from "next/server";
import { loadDailyReportForDate } from "@/lib/daily-report";
import { sendDailyReportEmail } from "@/lib/daily-report-mail";
import { requireAdmin } from "@/lib/auth/api-auth";
import { yesterdayDateKey } from "@/lib/dates";
import { isValidDateKey } from "@/lib/reports";
import { getDailyReportSettings } from "@/lib/sheets";

export async function POST(request: Request) {
  try {
    await requireAdmin(request);
    const body = await request.json().catch(() => ({}));
    const requestedDate =
      body && typeof body === "object" && "date" in body
        ? String((body as { date?: unknown }).date ?? "").trim()
        : "";
    const dateKey =
      requestedDate && isValidDateKey(requestedDate)
        ? requestedDate
        : yesterdayDateKey();

    const [report, settings] = await Promise.all([
      loadDailyReportForDate(dateKey),
      getDailyReportSettings(),
    ]);

    if (!report.rows.length) {
      return NextResponse.json(
        {
          error:
            "No menu items for this day. Add items to the weekly menu template before sending.",
        },
        { status: 400 }
      );
    }

    await sendDailyReportEmail(report, settings);

    return NextResponse.json({
      ok: true,
      date: dateKey,
      weekday: report.weekday,
      itemCount: report.rows.length,
    });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("POST /api/daily-report/send", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to send daily report",
      },
      { status: 500 }
    );
  }
}
