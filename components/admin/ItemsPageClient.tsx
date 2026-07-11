"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ItemsTable } from "@/components/admin/ItemsTable";
import { LoadingState } from "@/components/ui/loading-state";
import { getFirebaseAuthHeader } from "@/lib/auth/use-firebase-auth";
import type { InventoryItem } from "@/lib/types";

export function ItemsPageClient() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const headers = await getFirebaseAuthHeader();
        const inventoryResponse = await fetch("/api/inventory", {
          headers,
          cache: "no-store",
        });
        const inventoryData = await inventoryResponse.json();
        if (!inventoryResponse.ok) {
          throw new Error(inventoryData.error ?? "Failed to load items");
        }
        setItems(inventoryData.items);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to load items");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <LoadingState
        label="Loading items"
        layout="centered"
        className="min-h-[40vh]"
      />
    );
  }

  return <ItemsTable initialItems={items} />;
}
