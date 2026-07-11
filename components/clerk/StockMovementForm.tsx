"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { fetchInventory, submitStockMovement } from "@/lib/api-client";
import { formatNumber } from "@/lib/utils";
import type { InventoryItem } from "@/lib/types";

interface StockMovementFormProps {
  type: "in" | "out";
}

export function StockMovementForm({ type }: StockMovementFormProps) {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState("");
  const [itemId, setItemId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    fetchInventory()
      .then(setItems)
      .catch((error: Error) => toast.error(error.message))
      .finally(() => setLoading(false));
  }, []);

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return items;
    return items.filter(
      (item) =>
        item.itemName.toLowerCase().includes(query) ||
        item.category.toLowerCase().includes(query)
    );
  }, [items, search]);

  const selectedItem = items.find((item) => item.itemId === itemId);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!itemId) {
      toast.error("Select an item.");
      return;
    }

    const qty = Number(quantity);
    if (!Number.isFinite(qty) || qty <= 0) {
      toast.error("Enter a valid quantity.");
      return;
    }

    setSubmitting(true);
    try {
      const result = await submitStockMovement({
        itemId,
        type,
        quantity: qty,
        notes,
      });
      toast.success(
        `${type === "in" ? "Stock in" : "Stock out"} recorded for ${result.item.itemName}.`
      );
      setItems((current) =>
        current.map((item) => (item.itemId === result.item.itemId ? result.item : item))
      );
      setQuantity("");
      setNotes("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Update failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{type === "in" ? "Record Stock In" : "Record Stock Out"}</CardTitle>
        <CardDescription>
          {type === "in"
            ? "Add received stock to the inventory."
            : "Record items used or removed from store."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="search">Search items</Label>
            <Input
              id="search"
              placeholder="Search by item or category"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Item</Label>
            <Select value={itemId} onValueChange={setItemId} disabled={loading}>
              <SelectTrigger>
                <SelectValue placeholder={loading ? "Loading items..." : "Select an item"} />
              </SelectTrigger>
              <SelectContent>
                {filteredItems.map((item) => (
                  <SelectItem key={item.itemId} value={item.itemId}>
                    {item.itemName} ({formatNumber(item.closingStock)} {item.unit || "units"})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedItem && (
            <div className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
              Available:{" "}
              <span className="font-semibold text-slate-900">
                {formatNumber(selectedItem.closingStock)} {selectedItem.unit || "units"}
              </span>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="quantity">Quantity</Label>
            <Input
              id="quantity"
              type="number"
              min="0"
              step="any"
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Input
              id="notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="e.g. breakfast service"
            />
          </div>

          <Button type="submit" className="w-full" disabled={submitting || loading}>
            {submitting ? "Saving..." : type === "in" ? "Add Stock" : "Remove Stock"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
