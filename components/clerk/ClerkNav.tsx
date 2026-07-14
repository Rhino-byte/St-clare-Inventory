"use client";

import { useRouter } from "next/navigation";
import { signOutFirebase } from "@/lib/auth/firebase-client";
import { portalLogout } from "@/lib/auth/portal-client";
import { useFirebaseAuth } from "@/lib/auth/use-firebase-auth";
import { ResponsiveNav } from "@/components/layout/ResponsiveNav";

const links = [
  { href: "/clerk/stock-out", label: "Stock Out" },
  { href: "/clerk/stock-in", label: "Stock In" },
  { href: "/clerk/daily", label: "Today" },
];

export function ClerkNav() {
  const router = useRouter();
  const { user } = useFirebaseAuth();

  async function handleSignOut() {
    await portalLogout();
    await signOutFirebase();
    router.push("/");
  }

  return (
    <ResponsiveNav
      title="St Clare Inventory"
      subtitle="Staff workspace"
      links={links}
      maxWidth="max-w-3xl"
      onSignOut={handleSignOut}
      trailing={
        user?.email ? (
          <span className="text-xs text-slate-500">{user.email}</span>
        ) : undefined
      }
    />
  );
}
