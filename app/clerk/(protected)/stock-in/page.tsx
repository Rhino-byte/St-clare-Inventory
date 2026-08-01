import { StockMovementPageClient } from "@/components/clerk/StockMovementPageClient";

export default function ClerkStockInPage() {
  return (
    <StockMovementPageClient
      type="in"
      title="Stock In"
      description="Add received stock back into inventory."
    />
  );
}
