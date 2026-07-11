import { StockMovementForm } from "@/components/clerk/StockMovementForm";

export default function ClerkStockInPage() {
  return (
    <div className="space-y-2">
      <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">Stock In</h1>
      <p className="text-sm text-slate-500">
        Add received stock back into inventory.
      </p>
      <div className="pt-4">
        <StockMovementForm type="in" />
      </div>
    </div>
  );
}
