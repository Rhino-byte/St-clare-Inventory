"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchAnalytics, sendTestAlert } from "@/lib/api-client";
import { getFirebaseAuthHeader } from "@/lib/auth/use-firebase-auth";

export function AlertsPanel() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<
    Array<{ itemId: string; itemName: string; closingStock: number; reorderLevel: number | null }>
  >([]);

  async function loadHistory() {
    try {
      const headers = await getFirebaseAuthHeader();
      const data = await fetchAnalytics(30, headers);
      setHistory(
        data.lowStockItems.map((item: {
          itemId: string;
          itemName: string;
          closingStock: number;
          reorderLevel: number | null;
        }) => ({
          itemId: item.itemId,
          itemName: item.itemName,
          closingStock: item.closingStock,
          reorderLevel: item.reorderLevel,
        }))
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load alerts");
    }
  }

  async function handleTestEmail() {
    setLoading(true);
    try {
      const headers = await getFirebaseAuthHeader();
      await sendTestAlert(headers);
      toast.success("Test email sent.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to send test email");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Email alerts</CardTitle>
          <CardDescription>
            Low-stock alerts are sent automatically after stock movements and once a day.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button onClick={handleTestEmail} disabled={loading}>
            {loading ? "Sending..." : "Send test email"}
          </Button>
          <Button variant="outline" onClick={loadHistory}>
            Refresh low-stock list
          </Button>
          <Button variant="ghost" onClick={() => router.push("/admin/dashboard")}>
            Back to dashboard
          </Button>
        </CardContent>
      </Card>

      {history.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Current low-stock items</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {history.map((item) => (
              <div
                key={item.itemId}
                className="flex flex-col gap-1 rounded-lg border border-slate-200 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between"
              >
                <span className="font-medium">{item.itemName}</span>
                <span className="text-slate-500">
                  {item.closingStock} / reorder {item.reorderLevel ?? "—"}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
