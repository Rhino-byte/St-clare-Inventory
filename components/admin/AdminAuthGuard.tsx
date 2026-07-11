"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isUidAllowed } from "@/lib/auth/roles";
import { signOutFirebase } from "@/lib/auth/firebase-client";
import { fetchPortalStatus } from "@/lib/auth/portal-client";
import { useFirebaseAuth } from "@/lib/auth/use-firebase-auth";
import { LoadingState } from "@/components/ui/loading-state";

export function AdminAuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, loading } = useFirebaseAuth();
  const [portalOk, setPortalOk] = useState<boolean | null>(null);

  useEffect(() => {
    if (loading) {
      return;
    }

    if (!user) {
      setPortalOk(null);
      router.replace("/admin/login");
      return;
    }

    if (!isUidAllowed(user.uid, "admin")) {
      setPortalOk(null);
      signOutFirebase().finally(() => router.replace("/admin/login?error=access"));
      return;
    }

    let cancelled = false;
    setPortalOk(null);

    fetchPortalStatus("admin")
      .then((ok) => {
        if (cancelled) {
          return;
        }
        setPortalOk(ok);
        if (!ok) {
          router.replace("/admin/login");
        }
      })
      .catch(() => {
        if (!cancelled) {
          setPortalOk(false);
          router.replace("/admin/login");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [user, loading, router]);

  const allowed =
    !loading && !!user && isUidAllowed(user.uid, "admin") && portalOk === true;

  if (loading || portalOk === null) {
    return <LoadingState label="Checking admin access" layout="centered" />;
  }

  if (!allowed) {
    return null;
  }

  return <>{children}</>;
}
