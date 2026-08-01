"use client";

import { useState } from "react";
import { BulkStockMovementForm } from "@/components/clerk/BulkStockMovementForm";
import { StockMovementForm } from "@/components/clerk/StockMovementForm";
import { Button } from "@/components/ui/button";

interface StockMovementPageClientProps {
  type: "in" | "out";
  title: string;
  description: string;
}

export function StockMovementPageClient({
  type,
  title,
  description,
}: StockMovementPageClientProps) {
  const [mode, setMode] = useState<"single" | "bulk">("single");

  return (
    <div className="space-y-2">
      <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">{title}</h1>
      <p className="text-sm text-slate-500">{description}</p>

      <div className="flex flex-wrap gap-2 pt-2">
        <Button
          type="button"
          size="sm"
          variant={mode === "single" ? "default" : "outline"}
          onClick={() => setMode("single")}
        >
          Single
        </Button>
        <Button
          type="button"
          size="sm"
          variant={mode === "bulk" ? "default" : "outline"}
          onClick={() => setMode("bulk")}
        >
          Bulk
        </Button>
      </div>

      <div className="pt-2">
        {mode === "single" ? (
          <StockMovementForm type={type} />
        ) : (
          <BulkStockMovementForm type={type} />
        )}
      </div>
    </div>
  );
}
