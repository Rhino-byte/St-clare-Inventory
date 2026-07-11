import { StockMovementForm } from "@/components/clerk/StockMovementForm";

export default function ClerkStockOutPage() {
  return (
    <div className="space-y-2">
      <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">Stock Out</h1>
      <p className="text-sm text-slate-500">
        Record items used or removed from the store.
      </p>
      <div className="pt-4">
        <StockMovementForm type="out" />
      </div>
    </div>
  );
}
