"use client";

import { BulkStockMovementForm } from "@/components/clerk/BulkStockMovementForm";

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
  return (
    <div className="space-y-2">
      <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">{title}</h1>
      <p className="text-sm text-slate-500">{description}</p>

      <div className="pt-2">
        <BulkStockMovementForm type={type} />
      </div>
    </div>
  );
}
