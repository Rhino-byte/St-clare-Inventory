import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { DailyStockItem } from "@/lib/analytics";
import { formatNumber } from "@/lib/utils";

interface DailyStockTableProps {
  items: DailyStockItem[];
  emptyMessage?: string;
}

export function DailyStockTable({
  items,
  emptyMessage = "No stock movements for this day.",
}: DailyStockTableProps) {
  if (!items.length) {
    return (
      <p className="rounded-lg border border-dashed border-slate-200 p-6 text-sm text-slate-500">
        {emptyMessage}
      </p>
    );
  }

  return (
    <>
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Item name</TableHead>
              <TableHead>Stock In</TableHead>
              <TableHead>Stock Out</TableHead>
              <TableHead>Destination</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.itemId}>
                <TableCell className="font-medium">{item.itemName}</TableCell>
                <TableCell>{formatNumber(item.stockIn)}</TableCell>
                <TableCell>{formatNumber(item.stockOut)}</TableCell>
                <TableCell>{item.destination || "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="space-y-3 md:hidden">
        {items.map((item) => (
          <Card key={item.itemId}>
            <CardContent className="space-y-3 p-4">
              <p className="font-medium text-slate-900">{item.itemName}</p>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-slate-500">Stock In</p>
                  <p className="font-medium text-slate-900">
                    {formatNumber(item.stockIn)}
                  </p>
                </div>
                <div>
                  <p className="text-slate-500">Stock Out</p>
                  <p className="font-medium text-slate-900">
                    {formatNumber(item.stockOut)}
                  </p>
                </div>
                <div className="col-span-2">
                  <p className="text-slate-500">Destination</p>
                  <p className="font-medium text-slate-900">
                    {item.destination || "—"}
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
