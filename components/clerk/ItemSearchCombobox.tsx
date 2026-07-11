"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { InventoryItem } from "@/lib/types";

interface ItemSearchComboboxProps {
  items: InventoryItem[];
  value: string;
  onChange: (itemId: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function ItemSearchCombobox({
  items,
  value,
  onChange,
  disabled = false,
  placeholder = "Search by item or category",
}: ItemSearchComboboxProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const selectedItem = items.find((item) => item.itemId === value);

  const filteredItems = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return items;
    return items.filter(
      (item) =>
        item.itemName.toLowerCase().includes(normalized) ||
        item.category.toLowerCase().includes(normalized)
    );
  }, [items, query]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  useEffect(() => {
    if (!value) return;
    const stillExists = items.some((item) => item.itemId === value);
    if (!stillExists) {
      onChange("");
      setQuery("");
    }
  }, [items, value, onChange]);

  const displayValue = open ? query : selectedItem?.itemName ?? query;

  function handleFocus() {
    if (disabled) return;
    setOpen(true);
    if (selectedItem) {
      setQuery(selectedItem.itemName);
      onChange("");
    }
  }

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const nextQuery = event.target.value;
    setQuery(nextQuery);
    setOpen(true);
    if (value) {
      onChange("");
    }
  }

  function handleSelect(item: InventoryItem) {
    onChange(item.itemId);
    setQuery("");
    setOpen(false);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      setOpen(false);
      if (selectedItem) {
        setQuery("");
      }
    }
  }

  return (
    <div className="space-y-2" ref={containerRef}>
      <Label htmlFor="item-search">Item</Label>
      <div className="relative">
        <Input
          id="item-search"
          type="text"
          autoComplete="off"
          role="combobox"
          aria-expanded={open}
          aria-autocomplete="list"
          disabled={disabled}
          placeholder={disabled ? "Loading items..." : placeholder}
          value={displayValue}
          onFocus={handleFocus}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
        />

        {open && !disabled && (
          <ul
            role="listbox"
            className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border border-slate-200 bg-white py-1 shadow-md"
          >
            {filteredItems.length === 0 ? (
              <li className="px-3 py-2.5 text-sm text-slate-500">No items found</li>
            ) : (
              filteredItems.map((item) => (
                <li key={item.itemId} role="option">
                  <button
                    type="button"
                    className={cn(
                      "flex w-full flex-col items-start px-3 py-2.5 text-left text-sm hover:bg-emerald-50 focus:bg-emerald-50 focus:outline-none",
                      value === item.itemId && "bg-emerald-50"
                    )}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => handleSelect(item)}
                  >
                    <span className="font-medium text-slate-900">{item.itemName}</span>
                    {item.category ? (
                      <span className="text-xs text-slate-500">{item.category}</span>
                    ) : null}
                  </button>
                </li>
              ))
            )}
          </ul>
        )}
      </div>
    </div>
  );
}
