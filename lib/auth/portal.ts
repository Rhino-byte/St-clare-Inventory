import { createHmac, timingSafeEqual } from "crypto";
import type { UserRole } from "@/lib/auth/roles";

export const PORTAL_COOKIE_NAME = "portal";

function getPortalSecret(): string {
  const secret = process.env.PORTAL_SECRET;
  if (!secret) {
    throw new Error("PORTAL_SECRET is not configured");
  }
  return secret;
}

export function createPortalToken(uid: string, role: UserRole): string {
  return createHmac("sha256", getPortalSecret())
    .update(`${uid}|${role}`)
    .digest("hex");
}

export function getRoleAccessPassword(role: UserRole): string | undefined {
  return role === "admin"
    ? process.env.ADMIN_ACCESS_PASSWORD
    : process.env.STAFF_ACCESS_PASSWORD;
}

export function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  try {
    return timingSafeEqual(Buffer.from(a), Buffer.from(b));
  } catch {
    return false;
  }
}

function parseCookieHeader(cookieHeader: string | null): Record<string, string> {
  if (!cookieHeader) {
    return {};
  }
  return Object.fromEntries(
    cookieHeader.split(";").map((part) => {
      const [key, ...values] = part.trim().split("=");
      return [key, values.join("=")];
    })
  );
}

export function getPortalCookieValue(request: Request): string | null {
  const cookies = parseCookieHeader(request.headers.get("cookie"));
  return cookies[PORTAL_COOKIE_NAME] ?? null;
}

export function hasValidPortalCookie(
  request: Request,
  uid: string,
  role: UserRole
): boolean {
  const cookieValue = getPortalCookieValue(request);
  if (!cookieValue) {
    return false;
  }
  const expected = createPortalToken(uid, role);
  return constantTimeEqual(cookieValue, expected);
}

export function buildPortalCookieHeader(uid: string, role: UserRole): string {
  const token = createPortalToken(uid, role);
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${PORTAL_COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Lax${secure}`;
}

export function clearPortalCookieHeader(): string {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${PORTAL_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`;
}
