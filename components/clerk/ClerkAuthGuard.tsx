"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { isUidAllowed } from "@/lib/auth/roles";
import { signOutFirebase } from "@/lib/auth/firebase-client";
import { useFirebaseAuth } from "@/lib/auth/use-firebase-auth";

export function ClerkAuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, loading } = useFirebaseAuth();

  const allowed =
    !loading && !!user && isUidAllowed(user.uid, "clerk");

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.replace("/clerk/login");
      return;
    }

    if (!isUidAllowed(user.uid, "clerk")) {
      signOutFirebase().finally(() => router.replace("/clerk/login?error=access"));
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-sm text-slate-500">
        Checking clerk access...
      </div>
    );
  }

  if (!allowed) {
    return null;
  }

  return <>{children}</>;
}
