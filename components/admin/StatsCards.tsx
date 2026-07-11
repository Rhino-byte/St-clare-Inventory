import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DashboardStats } from "@/lib/types";

interface StatsCardsProps {
  stats: DashboardStats;
}

export function StatsCards({ stats }: StatsCardsProps) {
  const cards = [
    { label: "Total items", value: stats.totalItems },
    { label: "Low stock", value: stats.lowStockCount },
    { label: "Out of stock", value: stats.outOfStockCount },
    { label: "Today's movements", value: stats.todayMovements },
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
