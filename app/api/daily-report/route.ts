import { NextResponse } from "next/server";
import { loadDailyReportForDate } from "@/lib/daily-report";
import { requireAdmin } from "@/lib/auth/api-auth";
import { isValidDateKey, todayDateKey } from "@/lib/reports";

export async function GET(request: Request) {
  try {
    await requireAdmin(request);
    const { searchParams } = new URL(request.url);
    const requestedDate = searchParams.get("date")?.trim();
    const dateKey =
      requestedDate && isValidDateKey(requestedDate)
        ? requestedDate
        : todayDateKey();

    const report = await loadDailyReportForDate(dateKey);
    return NextResponse.json(report);
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("GET /api/daily-report", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to load daily report",
      },
      { status: 500 }
    );
  }
}
