"use client";

import { useMemo } from "react";
import type { InventoryOption } from "@/lib/analytics";

const MAX_SELECTED = 5;

interface ItemMultiSelectProps {
  options: InventoryOption[];
  value: string[];
  onChange: (itemIds: string[]) => void;
}

export function ItemMultiSelect({
  options,
  value,
  onChange,
}: ItemMultiSelectProps) {
  const selected = useMemo(() => new Set(value), [value]);

  function toggle(itemId: string) {
    if (selected.has(itemId)) {
      onChange(value.filter((id) => id !== itemId));
      return;
    }
    if (value.length >= MAX_SELECTED) return;
    onChange([...value, itemId]);
  }

  if (!options.length) {
    return (
      <p className="text-sm text-slate-500">No inventory items available.</p>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-slate-500">
        Select up to {MAX_SELECTED} items ({value.length}/{MAX_SELECTED}).
      </p>
      <div className="flex max-h-40 flex-wrap gap-2 overflow-y-auto rounded-md border border-slate-200 bg-white p-3">
        {options.map((option) => {
          const isOn = selected.has(option.itemId);
          const disabled = !isOn && value.length >= MAX_SELECTED;
          return (
            <label
              key={option.itemId}
              className={`inline-flex cursor-pointer items-center gap-2 rounded-md border px-2.5 py-1.5 text-sm ${
                isOn
                  ? "border-emerald-600 bg-emerald-50 text-emerald-900"
                  : disabled
                    ? "cursor-not-allowed border-slate-200 text-slate-400"
                    : "border-slate-200 text-slate-700 hover:bg-slate-50"
              }`}
            >
              <input
                type="checkbox"
                className="h-3.5 w-3.5 rounded border-slate-300 text-emerald-700 focus:ring-emerald-600"
                checked={isOn}
                disabled={disabled}
                onChange={() => toggle(option.itemId)}
              />
              <span className="max-w-[10rem] truncate" title={option.itemName}>
                {option.itemName}
              </span>
            </label>
          );
        })}
      </div>
    </div>
  );
}
