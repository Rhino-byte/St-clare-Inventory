import { NextResponse } from "next/server";
import { checkAllItemsForAlerts } from "@/lib/alerts";
import { getInventoryItems } from "@/lib/sheets";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const items = await getInventoryItems();
    const alertsSent = await checkAllItemsForAlerts(items);
    return NextResponse.json({ alertsSent, checked: items.length });
  } catch (error) {
    console.error("GET /api/cron/check-stock", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Cron job failed" },
      { status: 500 }
    );
  }
}
