import { NextResponse } from "next/server";
import {
  loadDailyReportForDate,
  renderDailyReportPdf,
} from "@/lib/daily-report";
import { requireAdmin } from "@/lib/auth/api-auth";
import { isValidDateKey, todayDateKey } from "@/lib/reports";
import type { DailyReportPayload } from "@/lib/types";

function isDailyReportPayload(value: unknown): value is DailyReportPayload {
  if (!value || typeof value !== "object") return false;
  const report = value as DailyReportPayload;
  return (
    typeof report.date === "string" &&
    Array.isArray(report.rows) &&
    Array.isArray(report.sections)
  );
}

async function pdfResponse(report: DailyReportPayload) {
  const pdf = await renderDailyReportPdf(report);
  return new NextResponse(new Uint8Array(pdf), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="daily-stock-${report.date}.pdf"`,
    },
  });
}

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
    return pdfResponse(report);
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("GET /api/daily-report/pdf", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to generate PDF",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    await requireAdmin(request);
    const body = await request.json().catch(() => ({}));
    const report =
      body && typeof body === "object" && "report" in body
        ? (body as { report?: unknown }).report
        : null;

    if (!isDailyReportPayload(report)) {
      return NextResponse.json(
        { error: "A valid report payload is required." },
        { status: 400 }
      );
    }

    return pdfResponse(report);
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("POST /api/daily-report/pdf", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to generate PDF",
      },
      { status: 500 }
    );
  }
}
