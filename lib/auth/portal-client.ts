import type { UserRole } from "@/lib/auth/roles";
import { getFirebaseAuthHeader } from "@/lib/auth/use-firebase-auth";

export async function fetchPortalStatus(role: UserRole): Promise<boolean> {
  try {
    const headers = await getFirebaseAuthHeader();
    const response = await fetch(`/api/auth/portal-status?role=${role}`, {
      headers,
      cache: "no-store",
    });
    if (!response.ok) {
      return false;
    }
    const data = (await response.json()) as { ok?: boolean };
    return !!data.ok;
  } catch {
    return false;
  }
}

export async function portalLogin(role: UserRole, password: string): Promise<void> {
  const headers = await getFirebaseAuthHeader();
  const response = await fetch("/api/auth/portal-login", {
    method: "POST",
    headers,
    body: JSON.stringify({ role, password }),
  });

  if (!response.ok) {
    const data = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(data.error ?? "Password verification failed");
  }
}

export async function portalLogout(): Promise<void> {
  await fetch("/api/auth/portal-logout", { method: "POST" });
}
