import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatNumber } from "@/lib/utils";
import type { InventoryItem } from "@/lib/types";

interface LowStockTableProps {
  items: InventoryItem[];
}

function StatusBadge({ item }: { item: InventoryItem }) {
  if (item.closingStock <= 0) {
    return <Badge variant="danger">Out of stock</Badge>;
  }
  return <Badge variant="warning">Low stock</Badge>;
}

export function LowStockTable({ items }: LowStockTableProps) {
  if (!items.length) {
    return (
      <p className="rounded-lg border border-dashed border-slate-200 p-6 text-sm text-slate-500">
        No low-stock items right now.
      </p>
    );
  }

  return (
    <>
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Item</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Closing stock</TableHead>
              <TableHead>Reorder level</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.itemId}>
                <TableCell className="font-medium">{item.itemName}</TableCell>
                <TableCell>{item.category || "—"}</TableCell>
                <TableCell>
                  {formatNumber(item.closingStock)} {item.unit}
                </TableCell>
                <TableCell>
                  {item.reorderLevel ?? "—"} {item.unit}
                </TableCell>
                <TableCell>
                  <StatusBadge item={item} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="space-y-3 md:hidden">
        {items.map((item) => (
          <Card key={item.itemId}>
            <CardContent className="space-y-3 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-slate-900">{item.itemName}</p>
                  <p className="text-sm text-slate-500">{item.category || "—"}</p>
                </div>
                <StatusBadge item={item} />
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-slate-500">Closing stock</p>
                  <p className="font-medium">
                    {formatNumber(item.closingStock)} {item.unit}
                  </p>
                </div>
                <div>
                  <p className="text-slate-500">Reorder level</p>
                  <p className="font-medium">
                    {item.reorderLevel ?? "—"} {item.unit}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}
