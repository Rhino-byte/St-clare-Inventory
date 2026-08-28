import { NextResponse } from "next/server";
import { loadDailyReportForDate } from "@/lib/daily-report";
import { sendDailyReportEmail } from "@/lib/daily-report-mail";
import { yesterdayDateKey, todayDateKey, APP_TIME_ZONE } from "@/lib/dates";
import { getDailyReportSettings, updateDailyReportSettings } from "@/lib/sheets";

function getNairobiHourMinute(now = new Date()): { hour: string; minute: string } {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: APP_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);

  const hour = parts.find((part) => part.type === "hour")?.value ?? "00";
  const minute = parts.find((part) => part.type === "minute")?.value ?? "00";
  return { hour, minute };
}

function shouldSendNow(settingsSendTime: string, now = new Date()): boolean {
  const [targetHour, targetMinute] = settingsSendTime.split(":");
  const { hour, minute } = getNairobiHourMinute(now);
  return hour === targetHour && minute === targetMinute;
}

function matchesConfiguredSendWindow(now = new Date()): boolean {
  const configuredSendTime = process.env.DAILY_REPORT_SEND_TIME?.trim();
  if (!configuredSendTime || !/^\d{2}:\d{2}$/.test(configuredSendTime)) {
    return true;
  }

  const [targetHour, targetMinute] = configuredSendTime.split(":");
  const { hour, minute } = getNairobiHourMinute(now);
  return hour === targetHour && minute === targetMinute;
}

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (process.env.DAILY_REPORT_CRON_ENABLED === "false") {
    return NextResponse.json({ skipped: true, reason: "cron_disabled_env" });
  }

  if (!matchesConfiguredSendWindow()) {
    return NextResponse.json({ skipped: true, reason: "not_send_time" });
  }

  try {
    const settings = await getDailyReportSettings();
    if (!settings.enabled) {
      return NextResponse.json({ skipped: true, reason: "disabled" });
    }

    if (!shouldSendNow(settings.sendTime)) {
      return NextResponse.json({ skipped: true, reason: "not_send_time" });
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
