"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isUidAllowed } from "@/lib/auth/roles";
import { signOutFirebase } from "@/lib/auth/firebase-client";
import { fetchPortalStatus } from "@/lib/auth/portal-client";
import { useFirebaseAuth } from "@/lib/auth/use-firebase-auth";
import { LoadingState } from "@/components/ui/loading-state";

export function ClerkAuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, loading } = useFirebaseAuth();
  const [portalOk, setPortalOk] = useState<boolean | null>(null);

  useEffect(() => {
    if (loading) {
      return;
    }

    if (!user) {
      setPortalOk(null);
      router.replace("/clerk/login");
      return;
    }

    if (!isUidAllowed(user.uid, "clerk")) {
      setPortalOk(null);
      signOutFirebase().finally(() => router.replace("/clerk/login?error=access"));
      return;
    }

    let cancelled = false;
    setPortalOk(null);

    fetchPortalStatus("clerk")
      .then((ok) => {
        if (cancelled) {
          return;
        }
        setPortalOk(ok);
        if (!ok) {
          router.replace("/clerk/login");
        }
      })
      .catch(() => {
        if (!cancelled) {
          setPortalOk(false);
          router.replace("/clerk/login");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [user, loading, router]);

  const allowed =
    !loading && !!user && isUidAllowed(user.uid, "clerk") && portalOk === true;

  if (loading || portalOk === null) {
    return <LoadingState label="Checking staff access" layout="centered" />;
  }

  if (!allowed) {
    return null;
  }

  return <>{children}</>;
}
