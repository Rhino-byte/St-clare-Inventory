import { NextResponse } from "next/server";
import { sendTestEmail } from "@/lib/alerts";
import { requireAdmin } from "@/lib/auth/api-auth";

export async function POST(request: Request) {
  try {
    await requireAdmin(request);
    await sendTestEmail();
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("POST /api/alerts/test", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to send test email" },
      { status: 500 }
    );
  }
}
