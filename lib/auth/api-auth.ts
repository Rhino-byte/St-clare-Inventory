import { verifyFirebaseToken } from "@/lib/auth/firebase-admin";
import { hasValidPortalCookie } from "@/lib/auth/portal";
import { isUidAllowed } from "@/lib/auth/roles";

function unauthorized(message = "Unauthorized") {
  return new Response(JSON.stringify({ error: message }), {
    status: 401,
    headers: { "Content-Type": "application/json" },
  });
}

function forbidden(message = "Access denied") {
  return new Response(JSON.stringify({ error: message }), {
    status: 403,
    headers: { "Content-Type": "application/json" },
  });
}

async function getTokenFromRequest(request: Request): Promise<string> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    throw unauthorized();
  }
  return authHeader.slice("Bearer ".length);
}

export async function requireFirebaseUser(request: Request) {
  const token = await getTokenFromRequest(request);
  const decoded = await verifyFirebaseToken(token);
  const uid = decoded.uid;
  const email = decoded.email;

  if (!uid) {
    throw unauthorized();
  }

  return { uid, email: email ?? null };
}

export async function requireAdmin(request: Request) {
  const user = await requireFirebaseUser(request);
  if (!isUidAllowed(user.uid, "admin")) {
    throw forbidden();
  }
  if (!hasValidPortalCookie(request, user.uid, "admin")) {
    throw forbidden("Password verification required");
  }
  return user;
}

export async function requireClerk(request: Request) {
  const user = await requireFirebaseUser(request);
  if (!isUidAllowed(user.uid, "clerk")) {
    throw forbidden();
  }
  if (!hasValidPortalCookie(request, user.uid, "clerk")) {
    throw forbidden("Password verification required");
  }
  return user;
}

export async function requireClerkOrAdmin(request: Request) {
  const user = await requireFirebaseUser(request);
  const isAdmin = isUidAllowed(user.uid, "admin");
  const isClerk = isUidAllowed(user.uid, "clerk");

  if (!isAdmin && !isClerk) {
    throw forbidden();
  }

  const portalOk =
    (isAdmin && hasValidPortalCookie(request, user.uid, "admin")) ||
    (isClerk && hasValidPortalCookie(request, user.uid, "clerk"));

  if (!portalOk) {
    throw forbidden("Password verification required");
  }

  return user;
}
