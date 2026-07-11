import { NextResponse } from "next/server";
import { clearPortalCookieHeader } from "@/lib/auth/portal";

export async function POST() {
  return NextResponse.json(
    { ok: true },
    {
      headers: {
        "Set-Cookie": clearPortalCookieHeader(),
      },
    }
  );
}
