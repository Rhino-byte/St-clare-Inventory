"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { signInWithGoogle, signOutFirebase } from "@/lib/auth/firebase-client";
import { isUidAllowed } from "@/lib/auth/roles";
import { useFirebaseAuth } from "@/lib/auth/use-firebase-auth";

function ClerkLoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading } = useFirebaseAuth();
  const [signingIn, setSigningIn] = useState(false);

  useEffect(() => {
    if (searchParams.get("error") === "access") {
      toast.error("Your account is not authorized for clerk access.");
    }
  }, [searchParams]);

  useEffect(() => {
    if (!loading && user && isUidAllowed(user.uid, "clerk")) {
      router.replace("/clerk/stock-out");
    }
  }, [user, loading, router]);

  async function handleSignIn() {
    setSigningIn(true);
    try {
      const result = await signInWithGoogle();
      if (!isUidAllowed(result.user.uid, "clerk")) {
        await signOutFirebase();
        toast.error("Access denied. This account is not a clerk.");
        return;
      }
      router.push("/clerk/stock-out");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Sign in failed");
    } finally {
      setSigningIn(false);
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Clerk sign in</CardTitle>
        <CardDescription>
          Sign in with your Google account to record stock movements.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <GoogleSignInButton onClick={handleSignIn} loading={signingIn} />
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
      <Suspense fallback={<p className="text-sm text-slate-500">Loading...</p>}>
        <ClerkLoginContent />
      </Suspense>
    </main>
  );
}
