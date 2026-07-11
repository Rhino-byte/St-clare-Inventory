"use client";

import { useRouter } from "next/navigation";
import { signOutFirebase } from "@/lib/auth/firebase-client";
import { portalLogout } from "@/lib/auth/portal-client";
import { ResponsiveNav } from "@/components/layout/ResponsiveNav";

const links = [
  { href: "/admin/dashboard", label: "Dashboard" },
  { href: "/admin/analytics", label: "Analytics" },
  { href: "/admin/items", label: "Items" },
  { href: "/admin/alerts", label: "Alerts" },
];

export function AdminNav() {
  const router = useRouter();

  async function handleSignOut() {
    await portalLogout();
    await signOutFirebase();
    router.push("/");
  }

  return (
    <ResponsiveNav
      title="St Clare Inventory"
      subtitle="Admin dashboard"
      links={links}
      maxWidth="max-w-6xl"
      onSignOut={handleSignOut}
    />
  );
}
