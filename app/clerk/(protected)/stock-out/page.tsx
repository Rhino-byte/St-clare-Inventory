import { StockMovementPageClient } from "@/components/clerk/StockMovementPageClient";

export default function ClerkStockOutPage() {
  return (
    <StockMovementPageClient
      type="out"
      title="Stock Out"
      description="Record items used or removed from the store."
    />
  );
}
