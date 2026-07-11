"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { LowStockTable } from "@/components/admin/LowStockTable";
import { StatsCards } from "@/components/admin/StatsCards";
import { LoadingState } from "@/components/ui/loading-state";
import { fetchAnalytics } from "@/lib/api-client";
import { getFirebaseAuthHeader } from "@/lib/auth/use-firebase-auth";
import type { DashboardStats, InventoryItem } from "@/lib/types";

export function DashboardPageClient() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [lowStockItems, setLowStockItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const headers = await getFirebaseAuthHeader();
        const data = await fetchAnalytics(30, headers);
        setStats(data.stats);
        setLowStockItems(data.lowStockItems);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to load dashboard");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading || !stats) {
    return (
      <LoadingState
        label="Loading dashboard"
        layout="centered"
        className="min-h-[40vh]"
      />
    );
  }

  return (
    <div className="space-y-6">
      <StatsCards stats={stats} />
      <div>
        <h2 className="mb-3 text-lg font-semibold text-slate-900">Low stock items</h2>
        <LowStockTable items={lowStockItems} />
      </div>
    </div>
  );
}
