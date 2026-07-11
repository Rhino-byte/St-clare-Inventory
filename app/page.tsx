import Link from "next/link";
import { Package, Shield, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-emerald-50 to-white">
      <div className="mx-auto flex max-w-5xl flex-col gap-10 px-4 py-16">
        <div className="space-y-4 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-700 text-white">
            <Package className="h-7 w-7" />
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-slate-900">
            St Clare Inventory
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-slate-600">
            Track kitchen and store stock with Google Sheets, clerk stock movements,
            and admin analytics with low-stock email alerts.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800">
                <Shield className="h-5 w-5" />
              </div>
              <CardTitle>Admin</CardTitle>
              <CardDescription>
                Dashboard, analytics, item management, and email alerts.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full">
                <Link href="/admin/login">Admin sign in</Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-800">
                <Users className="h-5 w-5" />
              </div>
              <CardTitle>Clerk</CardTitle>
              <CardDescription>
                Record stock in and stock out during daily operations.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline" className="w-full">
                <Link href="/clerk/login">Clerk sign in</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
