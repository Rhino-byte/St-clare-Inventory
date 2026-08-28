"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingState } from "@/components/ui/loading-state";
import {
  downloadDailyReportPdf,
  fetchDailyReport,
  fetchDailyReportSettings,
  fetchInventory,
  fetchWeeklyMenuTemplate,
  saveDailyReportSettings,
  saveWeeklyMenuTemplate,
  sendDailyReportEmail,
} from "@/lib/api-client";
import { weekdayFromDateKey, yesterdayDateKey } from "@/lib/dates";
import { SHEETS_RATE_LIMIT_MESSAGE } from "@/lib/sheets-retry";
import type {
  DailyReportPayload,
  DailyReportRow,
  DailyReportSettings,
  InventoryItem,
  MenuMeal,
  Weekday,
  WeeklyMenuMeals,
} from "@/lib/types";
import { MENU_MEALS, WEEKDAYS } from "@/lib/types";
import { formatNumber } from "@/lib/utils";

const WEEKDAY_LABELS: Record<Weekday, string> = {
  monday: "Mon",
  tuesday: "Tue",
  wednesday: "Wed",
  thursday: "Thu",
  friday: "Fri",
  saturday: "Sat",
  sunday: "Sun",
};

const MEAL_LABELS: Record<MenuMeal, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
};

function emptyMeals(): WeeklyMenuMeals {
  return { breakfast: [], lunch: [], dinner: [] };
}

function ReportRows({ rows }: { rows: DailyReportRow[] }) {
  if (!rows.length) {
    return <p className="text-sm text-slate-500">No items for this meal.</p>;
  }

  return (
    <>
      <div className="space-y-2 md:hidden">
        {rows.map((row) => (
          <div
            key={`${row.meal}-${row.itemId}`}
            className={`rounded border p-3 text-sm ${row.hasMovement ? "" : "border-amber-200 bg-amber-50"}`}
          >
            <p className="font-medium">
              {row.itemName}
              {!row.hasMovement ? " · No movement" : ""}
            </p>
            <p>
              Opening {formatNumber(row.opening)} · In {formatNumber(row.stockIn)} · Out{" "}
              {formatNumber(row.stockOut)} · Close {formatNumber(row.closing)}
            </p>
          </div>
        ))}
      </div>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[36rem] text-sm">
          <thead>
            <tr className="border-b text-left">
              <th className="p-2">Item</th>
              <th className="p-2">Opening</th>
              <th className="p-2">In</th>
              <th className="p-2">Out</th>
              <th className="p-2">Closing</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={`${row.meal}-${row.itemId}`}
                className={row.hasMovement ? "border-b" : "border-b bg-amber-50"}
              >
                <td className="p-2 font-medium">
                  {row.itemName}
                  {!row.hasMovement ? " (no movement)" : ""}
                </td>
                <td className="p-2">{formatNumber(row.opening)}</td>
                <td className="p-2">{formatNumber(row.stockIn)}</td>
                <td className="p-2">{formatNumber(row.stockOut)}</td>
                <td className="p-2">{formatNumber(row.closing)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

export default function AdminDailyReportPage() {
  const bootstrappedRef = useRef(false);
  const [bootLoading, setBootLoading] = useState(true);
  const [menuLoading, setMenuLoading] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [settings, setSettings] = useState<DailyReportSettings>({
    enabled: false,
    sendTime: "20:00",
    recipients: "",
    lastSentDate: "",
  });
  const [selectedDay, setSelectedDay] = useState<Weekday>("monday");
  const [meals, setMeals] = useState<WeeklyMenuMeals>(emptyMeals);
  const [search, setSearch] = useState("");
  const [activeMeal, setActiveMeal] = useState<MenuMeal>("breakfast");
  const [copyTarget, setCopyTarget] = useState<Weekday>("tuesday");
  const [date, setDate] = useState(yesterdayDateKey());
  const [debouncedDate, setDebouncedDate] = useState(yesterdayDateKey());
  const [report, setReport] = useState<DailyReportPayload | null>(null);

  function showLoadError(error: unknown, fallback: string) {
    const message = error instanceof Error ? error.message : fallback;
    if (message === SHEETS_RATE_LIMIT_MESSAGE) {
      toast.error(message);
      return;
    }
    toast.error(message);
  }

  const loadMenu = useCallback(async (day: Weekday) => {
    setMenuLoading(true);
    try {
      const data = await fetchWeeklyMenuTemplate(day);
      setMeals(data.meals);
    } catch (error) {
      showLoadError(error, "Failed to load menu");
      setMeals(emptyMeals());
    } finally {
      setMenuLoading(false);
    }
  }, []);

  const loadPreview = useCallback(async (previewDate: string) => {
    setPreviewLoading(true);
    try {
      const data = await fetchDailyReport(previewDate);
      setReport(data);
    } catch (error) {
      showLoadError(error, "Failed to load preview");
      setReport(null);
    } finally {
      setPreviewLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedDate(date), 300);
    return () => window.clearTimeout(timer);
  }, [date]);

  useEffect(() => {
    void (async () => {
      setBootLoading(true);
      try {
        const [items, settingsData] = await Promise.all([
          fetchInventory(),
          fetchDailyReportSettings(),
        ]);
        setInventory(items);
        setSettings(settingsData);
        bootstrappedRef.current = true;
      } catch (error) {
        showLoadError(error, "Load failed");
      } finally {
        setBootLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!bootstrappedRef.current || bootLoading) return;
    void loadMenu(selectedDay);
  }, [bootLoading, selectedDay, loadMenu]);

  useEffect(() => {
    if (!bootstrappedRef.current || bootLoading) return;
    void loadPreview(debouncedDate);
  }, [bootLoading, debouncedDate, loadPreview]);

  const selectedItemIds = useMemo(() => {
    return new Set(meals[activeMeal].map((item) => item.itemId));
  }, [meals, activeMeal]);

  const available = useMemo(() => {
    const query = search.trim().toLowerCase();
    return inventory
      .filter((item) => !selectedItemIds.has(item.itemId))
      .filter(
        (item) =>
          !query ||
          item.itemName.toLowerCase().includes(query) ||
          item.category.toLowerCase().includes(query)
      )
      .slice(0, 8);
  }, [inventory, search, selectedItemIds]);

  function addItem(item: InventoryItem) {
    setMeals((current) => ({
      ...current,
      [activeMeal]: [
        ...current[activeMeal],
        {
          itemId: item.itemId,
          itemName: item.itemName,
          sortOrder: current[activeMeal].length + 1,
        },
      ],
    }));
    setSearch("");
  }

  function removeItem(meal: MenuMeal, itemId: string) {
    setMeals((current) => ({
      ...current,
      [meal]: current[meal]
        .filter((entry) => entry.itemId !== itemId)
        .map((entry, index) => ({ ...entry, sortOrder: index + 1 })),
    }));
  }

  if (bootLoading) {
    return <LoadingState label="Loading daily report…" />;
  }

  const previewWeekday = weekdayFromDateKey(date);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Daily Report</h1>
        <p className="mt-1 text-sm text-slate-600">
          Automated emails send yesterday&apos;s stock using yesterday&apos;s weekday menu
          (Africa/Nairobi).
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Email schedule</CardTitle>
          <CardDescription>
            Reports use the previous calendar day&apos;s stock and that day&apos;s menu template.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <label className="flex gap-2 text-sm">
            <input
              type="checkbox"
              checked={settings.enabled}
              onChange={(event) =>
                setSettings({ ...settings, enabled: event.target.checked })
              }
            />
            Send daily report email automatically
          </label>
          <Input
            type="time"
            value={settings.sendTime}
            onChange={(event) =>
              setSettings({ ...settings, sendTime: event.target.value })
            }
          />
          <Input
            placeholder="Recipients (optional)"
            value={settings.recipients}
            onChange={(event) =>
              setSettings({ ...settings, recipients: event.target.value })
            }
          />
          {settings.lastSentDate ? (
            <p className="text-sm text-slate-500">
              Last automated send: {settings.lastSentDate}
            </p>
          ) : null}
          <Button
            onClick={async () => {
              try {
                const saved = await saveDailyReportSettings(settings);
                setSettings(saved);
                toast.success("Settings saved");
              } catch (error) {
                toast.error(error instanceof Error ? error.message : "Save failed");
              }
            }}
          >
            Save settings
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Weekly menu template</CardTitle>
          <CardDescription>
            Set expected items per weekday and meal. Items with no movement are highlighted in
            amber on the report.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {WEEKDAYS.map((day) => (
              <Button
                key={day}
                type="button"
                size="sm"
                variant={selectedDay === day ? "default" : "outline"}
                onClick={() => setSelectedDay(day)}
              >
                {WEEKDAY_LABELS[day]}
              </Button>
            ))}
          </div>

          {menuLoading ? (
            <LoadingState label="Loading menu…" layout="inline" />
          ) : (
            <>
              <div className="flex flex-wrap gap-2">
                {MENU_MEALS.map((meal) => (
                  <Button
                    key={meal}
                    type="button"
                    size="sm"
                    variant={activeMeal === meal ? "default" : "outline"}
                    onClick={() => setActiveMeal(meal)}
                  >
                    {MEAL_LABELS[meal]} ({meals[meal].length})
                  </Button>
                ))}
              </div>

              <div className="space-y-2">
                <Label htmlFor="menu-item-search">
                  Add to {MEAL_LABELS[activeMeal]} ({WEEKDAY_LABELS[selectedDay]})
                </Label>
                <Input
                  id="menu-item-search"
                  placeholder="Search inventory to add items…"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
                {search.trim() ? (
                  <div className="max-h-40 space-y-1 overflow-y-auto rounded border p-2">
                    {available.length ? (
                      available.map((item) => (
                        <button
                          key={item.itemId}
                          type="button"
                          className="flex w-full justify-between rounded px-3 py-2 text-left text-sm hover:bg-slate-50"
                          onClick={() => addItem(item)}
                        >
                          <span>{item.itemName}</span>
                          <span className="text-slate-500">{item.category}</span>
                        </button>
                      ))
                    ) : (
                      <p className="px-2 py-1 text-sm text-slate-500">No matching items.</p>
                    )}
                  </div>
                ) : null}
              </div>

              {MENU_MEALS.map((meal) => (
                <div key={meal} className="space-y-2">
                  <h3 className="text-sm font-semibold text-slate-900">
                    {MEAL_LABELS[meal]}
                  </h3>
                  {!meals[meal].length ? (
                    <p className="rounded border border-dashed p-3 text-sm text-slate-500">
                      No items for {MEAL_LABELS[meal].toLowerCase()}.
                    </p>
                  ) : (
                    meals[meal].map((entry) => (
                      <div
                        key={`${meal}-${entry.itemId}`}
                        className="flex justify-between rounded border p-2 text-sm"
                      >
                        <span>{entry.itemName}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeItem(meal, entry.itemId)}
                        >
                          Remove
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              ))}

              <div className="flex flex-wrap items-end gap-2">
                <Button
                  onClick={async () => {
                    try {
                      const saved = await saveWeeklyMenuTemplate(selectedDay, meals);
                      setMeals(saved.meals);
                      toast.success(`Saved ${WEEKDAY_LABELS[selectedDay]} menu`);
                      if (weekdayFromDateKey(date) === selectedDay) {
                        await loadPreview(date);
                      }
                    } catch (error) {
                      toast.error(error instanceof Error ? error.message : "Save failed");
                    }
                  }}
                >
                  Save {WEEKDAY_LABELS[selectedDay]} menu
                </Button>
                <div className="flex items-center gap-2">
                  <Label htmlFor="copy-target" className="text-sm">
                    Copy {WEEKDAY_LABELS[selectedDay]} to
                  </Label>
                  <select
                    id="copy-target"
                    className="rounded border border-slate-200 px-2 py-1.5 text-sm"
                    value={copyTarget}
                    onChange={(event) => setCopyTarget(event.target.value as Weekday)}
                  >
                    {WEEKDAYS.filter((day) => day !== selectedDay).map((day) => (
                      <option key={day} value={day}>
                        {WEEKDAY_LABELS[day]}
                      </option>
                    ))}
                  </select>
                  <Button
                    variant="outline"
                    onClick={async () => {
                      try {
                        const saved = await saveWeeklyMenuTemplate(copyTarget, meals);
                        toast.success(`Copied menu to ${WEEKDAY_LABELS[copyTarget]}`);
                        if (selectedDay === copyTarget) {
                          setMeals(saved.meals);
                        }
                      } catch (error) {
                        toast.error(error instanceof Error ? error.message : "Copy failed");
                      }
                    }}
                  >
                    Copy
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Preview</CardTitle>
          <CardDescription>
            Preview stock for a date. Menu resolves from that date&apos;s weekday (
            {previewWeekday}).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="preview-date">Report date</Label>
            <Input
              id="preview-date"
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={async () => {
                try {
                  await downloadDailyReportPdf(date, report?.date === date ? report : null);
                } catch (error) {
                  showLoadError(error, "PDF failed");
                }
              }}
            >
              Download PDF
            </Button>
            <Button
              onClick={async () => {
                try {
                  await sendDailyReportEmail(date);
                  toast.success(`Email sent for ${date}`);
                } catch (error) {
                  showLoadError(error, "Send failed");
                }
              }}
            >
              Send email
            </Button>
          </div>

          {previewLoading ? (
            <LoadingState label="Loading preview…" layout="inline" />
          ) : !report?.sections.length ? (
            <p className="rounded border border-dashed p-4 text-sm text-slate-500">
              No menu items for {previewWeekday}. Add items to that day&apos;s template.
            </p>
          ) : (
            report.sections.map((section) => (
              <div key={section.meal} className="space-y-2">
                <h3 className="text-sm font-semibold text-emerald-800">
                  {MEAL_LABELS[section.meal]}
                </h3>
                <ReportRows rows={section.rows} />
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
