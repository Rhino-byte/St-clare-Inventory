import { NextResponse } from "next/server";
import { requireFirebaseUser } from "@/lib/auth/api-auth";
import {
  buildPortalCookieHeader,
  constantTimeEqual,
  getRoleAccessPassword,
} from "@/lib/auth/portal";
import { isUidAllowed, type UserRole } from "@/lib/auth/roles";

function isUserRole(value: unknown): value is UserRole {
  return value === "admin" || value === "clerk";
}

export async function POST(request: Request) {
  try {
    const user = await requireFirebaseUser(request);
    const body = (await request.json()) as { role?: unknown; password?: unknown };

    if (!isUserRole(body.role)) {
      return NextResponse.json({ error: "Invalid role." }, { status: 400 });
    }

    if (typeof body.password !== "string" || !body.password) {
      return NextResponse.json({ error: "Password is required." }, { status: 400 });
    }

    if (!isUidAllowed(user.uid, body.role)) {
      return NextResponse.json({ error: "Access denied." }, { status: 403 });
    }

    const expectedPassword = getRoleAccessPassword(body.role);
    if (!expectedPassword) {
      return NextResponse.json(
        { error: "Portal password is not configured." },
        { status: 503 }
      );
    }

    if (!constantTimeEqual(body.password, expectedPassword)) {
      return NextResponse.json({ error: "Incorrect password." }, { status: 401 });
    }

    return NextResponse.json(
      { ok: true },
      {
        headers: {
          "Set-Cookie": buildPortalCookieHeader(user.uid, body.role),
        },
      }
    );
  } catch (error) {
    if (error instanceof Response) {
      return error;
    }
    console.error("POST /api/auth/portal-login", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Portal login failed" },
      { status: 500 }
    );
  }
}
