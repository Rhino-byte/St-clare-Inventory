export type UserRole = "admin" | "clerk";

function parseUidList(envValue: string | undefined): string[] {
  if (!envValue) return [];
  return envValue
    .split(",")
    .map((uid) => uid.trim())
    .filter(Boolean);
}

export function getAdminUids(): string[] {
  return parseUidList(
    process.env.ADMIN_UIDS ?? process.env.NEXT_PUBLIC_ADMIN_UIDS
  );
}

export function getClerkUids(): string[] {
  return parseUidList(
    process.env.STAFF_UIDS ??
      process.env.NEXT_PUBLIC_STAFF_UIDS ??
      process.env.CLERK_UIDS ??
      process.env.NEXT_PUBLIC_CLERK_UIDS
  );
}

export function isUidAllowed(
  uid: string | null | undefined,
  role: UserRole
): boolean {
  if (!uid) return false;
  const normalized = uid.trim();
  const uidList = role === "admin" ? getAdminUids() : getClerkUids();
  return uidList.includes(normalized);
}

export function getUserRole(uid: string | null | undefined): UserRole | null {
  if (!uid) return null;
  if (isUidAllowed(uid, "admin")) return "admin";
  if (isUidAllowed(uid, "clerk")) return "clerk";
  return null;
}
