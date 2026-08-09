import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { StockHealth } from "@/lib/analytics";

interface StockHealthCardsProps {
  health: StockHealth;
}

export function StockHealthCards({ health }: StockHealthCardsProps) {
  const cards = [
    { label: "Total items", value: health.totalItems },
    { label: "Low stock", value: health.lowStockCount },
    { label: "Out of stock", value: health.outOfStockCount },
    { label: "At / below reorder", value: health.atOrBelowReorder },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.label}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">
              {card.label}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-slate-900">{card.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
