import { NextResponse } from "next/server";
import { requireFirebaseUser } from "@/lib/auth/api-auth";
import { hasValidPortalCookie } from "@/lib/auth/portal";
import { isUidAllowed, type UserRole } from "@/lib/auth/roles";

function isUserRole(value: string | null): value is UserRole {
  return value === "admin" || value === "clerk";
}

export async function GET(request: Request) {
  try {
    const user = await requireFirebaseUser(request);
    const { searchParams } = new URL(request.url);
    const role = searchParams.get("role");

    if (!isUserRole(role)) {
      return NextResponse.json({ error: "Invalid role." }, { status: 400 });
    }

    if (!isUidAllowed(user.uid, role)) {
      return NextResponse.json({ ok: false });
    }

    const ok = hasValidPortalCookie(request, user.uid, role);
    return NextResponse.json({ ok });
  } catch (error) {
    if (error instanceof Response) {
      return error;
    }
    console.error("GET /api/auth/portal-status", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Portal status check failed" },
      { status: 500 }
    );
  }
}
