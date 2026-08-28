import { NextResponse } from "next/server";
import { loadDailyReportForDate } from "@/lib/daily-report";
import { sendDailyReportEmail } from "@/lib/daily-report-mail";
import { yesterdayDateKey, todayDateKey } from "@/lib/dates";
import { getDailyReportSettings, updateDailyReportSettings } from "@/lib/sheets";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (process.env.DAILY_REPORT_CRON_ENABLED === "false") {
    return NextResponse.json({ skipped: true, reason: "cron_disabled_env" });
  }

  try {
    const settings = await getDailyReportSettings();
    if (!settings.enabled) {
      return NextResponse.json({ skipped: true, reason: "disabled" });
    }

    const today = todayDateKey();
    if (settings.lastSentDate === today) {
      return NextResponse.json({ skipped: true, reason: "already_sent_today" });
    }

    const reportDate = yesterdayDateKey();
    const report = await loadDailyReportForDate(reportDate);
    if (!report.rows.length) {
      return NextResponse.json({ skipped: true, reason: "empty_template" });
    }

    await sendDailyReportEmail(report, settings);
    await updateDailyReportSettings({ lastSentDate: today });

    return NextResponse.json({
      sent: true,
      reportDate,
      weekday: report.weekday,
      itemCount: report.rows.length,
    });
  } catch (error) {
    console.error("GET /api/cron/daily-report", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Daily report cron failed",
      },
      { status: 500 }
    );
  }
}
