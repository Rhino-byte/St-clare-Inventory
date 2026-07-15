"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingState } from "@/components/ui/loading-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { fetchReport } from "@/lib/api-client";
import type {
  ReportDestinationTotal,
  ReportPeriod,
  ReportStockBalanceRow,
  ReportStockInRow,
  ReportStockOutRow,
} from "@/lib/reports";
import { formatNumber } from "@/lib/utils";

const PERIOD_OPTIONS: Array<{ label: string; value: ReportPeriod }> = [
  { label: "Weekly", value: "weekly" },
  { label: "Monthly", value: "monthly" },
  { label: "4 months", value: "4months" },
  { label: "Custom", value: "custom" },
];

const PIE_COLORS = ["#047857", "#b45309", "#1d4ed8", "#7c3aed", "#be123c"];

type ReportSections = {
  stockIn: boolean;
  stockOut: boolean;
  stockBalance: boolean;
  destinationChart: boolean;
};

const DEFAULT_SECTIONS: ReportSections = {
  stockIn: true,
  stockOut: true,
  stockBalance: true,
  destinationChart: true,
};

const SECTION_OPTIONS: Array<{ key: keyof ReportSections; label: string }> = [
  { key: "stockIn", label: "Stock In" },
  { key: "stockOut", label: "Stock Out" },
  { key: "stockBalance", label: "Stock balance" },
  { key: "destinationChart", label: "Destination chart" },
];

type ReportData = {
  period: ReportPeriod;
  from: string;
  to: string;
  stockIn: ReportStockInRow[];
  stockOut: ReportStockOutRow[];
  stockBalance: ReportStockBalanceRow[];
  destinationTotals: ReportDestinationTotal[];
};

function EmptyBlock({ message }: { message: string }) {
  return (
    <p className="rounded-lg border border-dashed border-slate-200 p-6 text-sm text-slate-500">
      {message}
    </p>
  );
}

function StockInTable({ rows }: { rows: ReportStockInRow[] }) {
  if (!rows.length) {
    return <EmptyBlock message="No stock-in movements in this period." />;
  }
  return (
    <>
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Item Name</TableHead>
              <TableHead>Stock In</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.itemId}>
                <TableCell className="font-medium">{row.itemName}</TableCell>
                <TableCell>{formatNumber(row.stockIn)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="space-y-3 md:hidden">
        {rows.map((row) => (
          <Card key={row.itemId}>
            <CardContent className="flex items-center justify-between gap-3 p-4 text-sm">
              <p className="font-medium text-slate-900">{row.itemName}</p>
              <p className="text-slate-700">{formatNumber(row.stockIn)}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}

function StockOutTable({ rows }: { rows: ReportStockOutRow[] }) {
  if (!rows.length) {
    return <EmptyBlock message="No stock-out movements in this period." />;
  }
  return (
    <>
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Item Name</TableHead>
              <TableHead>Stock Out</TableHead>
              <TableHead>Destination</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={`${row.itemId}-${row.destination}`}>
                <TableCell className="font-medium">{row.itemName}</TableCell>
                <TableCell>{formatNumber(row.stockOut)}</TableCell>
                <TableCell>{row.destination}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="space-y-3 md:hidden">
        {rows.map((row) => (
          <Card key={`${row.itemId}-${row.destination}`}>
            <CardContent className="space-y-2 p-4 text-sm">
              <p className="font-medium text-slate-900">{row.itemName}</p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-slate-500">Stock Out</p>
                  <p className="font-medium">{formatNumber(row.stockOut)}</p>
                </div>
                <div>
                  <p className="text-slate-500">Destination</p>
                  <p className="font-medium">{row.destination}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}

function StockBalanceTable({ rows }: { rows: ReportStockBalanceRow[] }) {
  if (!rows.length) {
    return <EmptyBlock message="No inventory items found." />;
  }

  return (
    <div className="stock-balance-ledger-wrap w-full overflow-x-auto">
      <table className="stock-balance-ledger w-full min-w-[40rem] border-collapse text-sm">
        <thead>
          <tr>
            <th scope="col">Item Name</th>
            <th scope="col">Unit</th>
            <th scope="col">Opening</th>
            <th scope="col">Stock In</th>
            <th scope="col">Total</th>
            <th scope="col">Stock Out</th>
            <th scope="col">Closing</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={row.itemId}>
              <td className="stock-balance-item">
                <span className="stock-balance-no">{index + 1}.</span> {row.itemName}
              </td>
              <td className="stock-balance-num">{row.unit || "—"}</td>
              <td className="stock-balance-num">{formatNumber(row.opening)}</td>
              <td className="stock-balance-num">{formatNumber(row.stockIn)}</td>
              <td className="stock-balance-num">{formatNumber(row.total)}</td>
              <td className="stock-balance-num">{formatNumber(row.stockOut)}</td>
              <td className="stock-balance-num">{formatNumber(row.closing)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ReportsPageClient() {
  const [period, setPeriod] = useState<ReportPeriod>("monthly");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ReportData | null>(null);
  const [sections, setSections] = useState<ReportSections>(DEFAULT_SECTIONS);

  const hasVisibleSection =
    sections.stockIn ||
    sections.stockOut ||
    sections.stockBalance ||
    sections.destinationChart;

  function toggleSection(key: keyof ReportSections) {
    setSections((current) => ({ ...current, [key]: !current[key] }));
  }

  const loadPreset = useCallback(async (nextPeriod: Exclude<ReportPeriod, "custom">) => {
    setLoading(true);
    try {
      const report = await fetchReport({ period: nextPeriod });
      setData(report);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load report");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (period === "custom") {
      setLoading(false);
      return;
    }
    loadPreset(period);
  }, [period, loadPreset]);

  async function handleApplyCustom() {
    if (!customFrom || !customTo) {
      toast.error("Select both from and to dates.");
      return;
    }
    setLoading(true);
    try {
      const report = await fetchReport({
        period: "custom",
        from: customFrom,
        to: customTo,
      });
      setData(report);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load report");
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  function handlePeriodChange(next: ReportPeriod) {
    setPeriod(next);
    if (next === "custom") {
      setData(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="report-controls flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">Reports</h1>
          <p className="text-sm text-slate-500">
            Generate stock movement summaries by period.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          className="report-controls shrink-0"
          onClick={() => window.print()}
          disabled={!data || !hasVisibleSection}
        >
          Print
        </Button>
      </div>

      <div className="report-controls flex flex-wrap gap-2">
        {PERIOD_OPTIONS.map((option) => (
          <Button
            key={option.value}
            type="button"
            variant={period === option.value ? "default" : "outline"}
            onClick={() => handlePeriodChange(option.value)}
          >
            {option.label}
          </Button>
        ))}
      </div>

      <div className="report-controls rounded-lg border border-slate-200 bg-white p-4">
        <p className="mb-3 text-sm font-medium text-slate-900">
          Include in report
        </p>
        <div className="flex flex-wrap gap-x-5 gap-y-3">
          {SECTION_OPTIONS.map((option) => (
            <label
              key={option.key}
              htmlFor={`report-section-${option.key}`}
              className="inline-flex cursor-pointer items-center gap-2 text-sm text-slate-700"
            >
              <input
                id={`report-section-${option.key}`}
                type="checkbox"
                checked={sections[option.key]}
                onChange={() => toggleSection(option.key)}
                className="h-4 w-4 rounded border-slate-300 text-emerald-700 focus:ring-emerald-600"
              />
              {option.label}
            </label>
          ))}
        </div>
      </div>

      {period === "custom" && (
        <div className="report-controls flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4 sm:flex-row sm:items-end">
          <div className="space-y-2 sm:w-44">
            <Label htmlFor="report-from">From</Label>
            <Input
              id="report-from"
              type="date"
              value={customFrom}
              onChange={(event) => setCustomFrom(event.target.value)}
            />
          </div>
          <div className="space-y-2 sm:w-44">
            <Label htmlFor="report-to">To</Label>
            <Input
              id="report-to"
              type="date"
              value={customTo}
              onChange={(event) => setCustomTo(event.target.value)}
            />
          </div>
          <Button type="button" onClick={handleApplyCustom}>
            Apply
          </Button>
        </div>
      )}

      {loading ? (
        <LoadingState
          label="Loading report"
          layout="centered"
          className="min-h-[40vh]"
        />
      ) : !data ? (
        <EmptyBlock
          message={
            period === "custom"
              ? "Choose a from and to date, then click Apply."
              : "No report data loaded."
          }
        />
      ) : (
        <div className="report-print-root space-y-8">
          <p className="text-sm text-slate-600">
            Period: <span className="font-medium text-slate-900">{data.from}</span>
            {" → "}
            <span className="font-medium text-slate-900">{data.to}</span>
          </p>

          {!hasVisibleSection ? (
            <EmptyBlock message="Select at least one section to include in the report." />
          ) : (
            <>
              {sections.stockIn && (
                <section className="space-y-3">
                  <h2 className="text-lg font-semibold text-slate-900">Stock In</h2>
                  <StockInTable rows={data.stockIn} />
                </section>
              )}

              {sections.stockOut && (
                <section className="space-y-3">
                  <h2 className="text-lg font-semibold text-slate-900">Stock Out</h2>
                  <StockOutTable rows={data.stockOut} />
                </section>
              )}

              {sections.stockBalance && (
                <section className="space-y-3">
                  <h2 className="text-lg font-semibold text-slate-900">
                    Stock balance
                  </h2>
                  <p className="text-sm text-slate-500">
                    Opening → Stock In → Total (Opening + Stock In) → Stock Out →
                    Closing (Total − Stock Out).
                  </p>
                  <StockBalanceTable rows={data.stockBalance} />
                </section>
              )}

              {sections.destinationChart && (
                <section className="space-y-3">
                  <h2 className="text-lg font-semibold text-slate-900">
                    Destination distribution
                  </h2>
                  {data.destinationTotals.length === 0 ? (
                    <EmptyBlock message="No stock-out destinations in this period." />
                  ) : (
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">
                          Stock out by destination
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="h-72 sm:h-80">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={data.destinationTotals}
                              dataKey="quantity"
                              nameKey="destination"
                              cx="50%"
                              cy="50%"
                              outerRadius={100}
                              label
                            >
                              {data.destinationTotals.map((entry, index) => (
                                <Cell
                                  key={entry.destination}
                                  fill={PIE_COLORS[index % PIE_COLORS.length]}
                                />
                              ))}
                            </Pie>
                            <Tooltip />
                            <Legend />
                          </PieChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
                  )}
                </section>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
