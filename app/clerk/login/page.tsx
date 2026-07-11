"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { LoadingSpinner, LoadingState } from "@/components/ui/loading-state";
import { signInWithGoogle, signOutFirebase } from "@/lib/auth/firebase-client";
import { fetchPortalStatus, portalLogin } from "@/lib/auth/portal-client";
import { isUidAllowed } from "@/lib/auth/roles";
import { useFirebaseAuth } from "@/lib/auth/use-firebase-auth";

function ClerkLoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading } = useFirebaseAuth();
  const [signingIn, setSigningIn] = useState(false);
  const [checkingPortal, setCheckingPortal] = useState(false);
  const [awaitingPassword, setAwaitingPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [submittingPassword, setSubmittingPassword] = useState(false);

  useEffect(() => {
    if (searchParams.get("error") === "access") {
      toast.error("Your account is not authorized for staff access.");
    }
  }, [searchParams]);

  useEffect(() => {
    if (loading) {
      return;
    }

    if (!user) {
      setAwaitingPassword(false);
      return;
    }

    if (!isUidAllowed(user.uid, "clerk")) {
      return;
    }

    let cancelled = false;
    setCheckingPortal(true);

    fetchPortalStatus("clerk")
      .then((ok) => {
        if (cancelled) {
          return;
        }
        if (ok) {
          router.replace("/clerk/stock-out");
        } else {
          setAwaitingPassword(true);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setCheckingPortal(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [user, loading, router]);

  async function handleSignIn() {
    setSigningIn(true);
    try {
      const result = await signInWithGoogle();
      if (!isUidAllowed(result.user.uid, "clerk")) {
        await signOutFirebase();
        toast.error("Access denied. This account is not staff.");
        return;
      }
      setAwaitingPassword(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Sign in failed");
    } finally {
      setSigningIn(false);
    }
  }

  async function handlePasswordSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!password.trim()) {
      toast.error("Enter the staff password.");
      return;
    }

    setSubmittingPassword(true);
    try {
      await portalLogin("clerk", password);
      router.push("/clerk/stock-out");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Password verification failed");
    } finally {
      setSubmittingPassword(false);
    }
  }

  const showPasswordStep = awaitingPassword && !!user && isUidAllowed(user.uid, "clerk");

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Staff sign in</CardTitle>
        <CardDescription>
          {showPasswordStep
            ? "Enter the staff password to continue."
            : "Sign in with your Google account to record stock movements."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading || checkingPortal ? (
          <LoadingState
            label="Checking access"
            layout="inline"
            size="sm"
            className="w-full justify-center py-6"
          />
        ) : showPasswordStep ? (
          <form className="space-y-4" onSubmit={handlePasswordSubmit}>
            <Input
              type="password"
              placeholder="Staff password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              className="w-full"
            />
            <Button type="submit" className="w-full" disabled={submittingPassword}>
              {submittingPassword ? (
                <span className="inline-flex items-center gap-2">
                  <LoadingSpinner size="sm" />
                  <span>
                    Verifying
                    <span className="loading-ellipsis" aria-hidden="true" />
                  </span>
                </span>
              ) : (
                "Continue"
              )}
            </Button>
          </form>
        ) : (
          <GoogleSignInButton onClick={handleSignIn} loading={signingIn} />
        )}
        <Button asChild variant="ghost" className="w-full">
          <Link href="/">Back to home</Link>
        </Button>
      </CardContent>
    </Card>
  );
}

export default function ClerkLoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <Suspense
        fallback={
          <LoadingState
            label="Loading"
            layout="centered"
            className="min-h-screen"
          />
        }
      >
        <ClerkLoginContent />
      </Suspense>
    </main>
  );
}
