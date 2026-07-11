import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn, formatNumber } from "@/lib/utils";

export interface ItemMovementRow {
  itemId: string;
  itemName: string;
  in: number;
  out: number;
  net: number;
}

interface StockMovementSummaryProps {
  items: ItemMovementRow[];
}

function NetValue({ value }: { value: number }) {
  return (
    <span
      className={cn(
        "font-medium",
        value >= 0 ? "text-emerald-700" : "text-red-700"
      )}
    >
      {value >= 0 ? "+" : ""}
      {formatNumber(value)}
    </span>
  );
}

export function StockMovementSummary({ items }: StockMovementSummaryProps) {
  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <CardTitle>Stock in vs stock out</CardTitle>
      </CardHeader>
      <CardContent>
        {!items.length ? (
          <p className="rounded-lg border border-dashed border-slate-200 p-6 text-sm text-slate-500">
            No stock movements in this period.
          </p>
        ) : (
          <>
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Stock in</TableHead>
                    <TableHead>Stock out</TableHead>
                    <TableHead>Net</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <TableRow key={item.itemId}>
                      <TableCell className="font-medium">{item.itemName}</TableCell>
                      <TableCell className="text-emerald-700">
                        {formatNumber(item.in)}
                      </TableCell>
                      <TableCell className="text-red-700">
                        {formatNumber(item.out)}
                      </TableCell>
                      <TableCell>
                        <NetValue value={item.net} />
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
                    <p className="font-medium text-slate-900">{item.itemName}</p>
                    <div className="grid grid-cols-3 gap-3 text-sm">
                      <div>
                        <p className="text-slate-500">Stock in</p>
                        <p className="font-medium text-emerald-700">
                          {formatNumber(item.in)}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-500">Stock out</p>
                        <p className="font-medium text-red-700">
                          {formatNumber(item.out)}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-500">Net</p>
                        <NetValue value={item.net} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
