"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { updateItem } from "@/lib/api-client";
import { getFirebaseAuthHeader } from "@/lib/auth/use-firebase-auth";
import { formatNumber } from "@/lib/utils";
import type { InventoryItem } from "@/lib/types";

interface ItemsTableProps {
  initialItems: InventoryItem[];
}

export function ItemsTable({ initialItems }: ItemsTableProps) {
  const [items, setItems] = useState(initialItems);
  const [search, setSearch] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return items;
    return items.filter(
      (item) =>
        item.itemName.toLowerCase().includes(query) ||
        item.category.toLowerCase().includes(query)
    );
  }, [items, search]);

  const isFiltering = search.trim().length > 0;

  async function saveItem(item: InventoryItem) {
    setSavingId(item.itemId);
    try {
      const headers = await getFirebaseAuthHeader();
      const updated = await updateItem(
        {
          itemId: item.itemId,
          itemName: item.itemName,
          category: item.category,
          unit: item.unit,
          openingStock: item.openingStock,
          reorderLevel: item.reorderLevel,
          notes: item.notes,
        },
        headers
      );
      setItems((current) =>
        current.map((row) => (row.itemId === updated.itemId ? updated : row))
      );
      toast.success(`${updated.itemName} updated.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Update failed");
    } finally {
      setSavingId(null);
    }
  }

  function updateField(
    itemId: string,
    field: keyof InventoryItem,
    value: string
  ) {
    setItems((current) =>
      current.map((item) => {
        if (item.itemId !== itemId) return item;
        if (field === "openingStock") {
          return { ...item, openingStock: Number(value) || 0 };
        }
        if (field === "reorderLevel") {
          return {
            ...item,
            reorderLevel: value === "" ? null : Number(value),
          };
        }
        return { ...item, [field]: value };
      })
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="items-search">Search items</Label>
        <Input
          id="items-search"
          placeholder="Search by item or category"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        {isFiltering && (
          <p className="text-sm text-slate-500">
            {filteredItems.length} of {items.length} items
          </p>
        )}
      </div>

      {filteredItems.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-200 p-6 text-sm text-slate-500">
          {isFiltering ? "No items match your search." : "No items found."}
        </p>
      ) : (
        <>
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Item</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Unit</TableHead>
              <TableHead>Opening</TableHead>
              <TableHead>Closing</TableHead>
              <TableHead>Reorder</TableHead>
              <TableHead>Notes</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredItems.map((item) => (
              <TableRow key={item.itemId}>
                <TableCell>
                  <Input
                    value={item.itemName}
                    onChange={(event) =>
                      updateField(item.itemId, "itemName", event.target.value)
                    }
                  />
                </TableCell>
                <TableCell>
                  <Input
                    value={item.category}
                    onChange={(event) =>
                      updateField(item.itemId, "category", event.target.value)
                    }
                  />
                </TableCell>
                <TableCell>
                  <Input
                    value={item.unit}
                    onChange={(event) =>
                      updateField(item.itemId, "unit", event.target.value)
                    }
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    value={item.openingStock}
                    onChange={(event) =>
                      updateField(item.itemId, "openingStock", event.target.value)
                    }
                  />
                </TableCell>
                <TableCell>
                  {formatNumber(item.closingStock)} {item.unit}
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    value={item.reorderLevel ?? ""}
                    onChange={(event) =>
                      updateField(item.itemId, "reorderLevel", event.target.value)
                    }
                  />
                </TableCell>
                <TableCell>
                  <Input
                    value={item.notes}
                    onChange={(event) =>
                      updateField(item.itemId, "notes", event.target.value)
                    }
                  />
                </TableCell>
                <TableCell>
                  <Button
                    size="sm"
                    onClick={() => saveItem(item)}
                    loading={savingId === item.itemId}
                  >
                    Save
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="space-y-4 md:hidden">
        {filteredItems.map((item) => (
          <Card key={item.itemId}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{item.itemName || "Unnamed item"}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor={`${item.itemId}-name`}>Item name</Label>
                <Input
                  id={`${item.itemId}-name`}
                  value={item.itemName}
                  onChange={(event) =>
                    updateField(item.itemId, "itemName", event.target.value)
                  }
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor={`${item.itemId}-category`}>Category</Label>
                  <Input
                    id={`${item.itemId}-category`}
                    value={item.category}
                    onChange={(event) =>
                      updateField(item.itemId, "category", event.target.value)
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`${item.itemId}-unit`}>Unit</Label>
                  <Input
                    id={`${item.itemId}-unit`}
                    value={item.unit}
                    onChange={(event) =>
                      updateField(item.itemId, "unit", event.target.value)
                    }
                  />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor={`${item.itemId}-opening`}>Opening stock</Label>
                  <Input
                    id={`${item.itemId}-opening`}
                    type="number"
                    value={item.openingStock}
                    onChange={(event) =>
                      updateField(item.itemId, "openingStock", event.target.value)
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Closing stock</Label>
                  <p className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                    {formatNumber(item.closingStock)} {item.unit}
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor={`${item.itemId}-reorder`}>Reorder level</Label>
                <Input
                  id={`${item.itemId}-reorder`}
                  type="number"
                  value={item.reorderLevel ?? ""}
                  onChange={(event) =>
                    updateField(item.itemId, "reorderLevel", event.target.value)
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`${item.itemId}-notes`}>Notes</Label>
                <Input
                  id={`${item.itemId}-notes`}
                  value={item.notes}
                  onChange={(event) =>
                    updateField(item.itemId, "notes", event.target.value)
                  }
                />
              </div>
              <Button
                className="w-full"
                onClick={() => saveItem(item)}
                loading={savingId === item.itemId}
              >
                Save
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
        </>
      )}
    </div>
  );
}
