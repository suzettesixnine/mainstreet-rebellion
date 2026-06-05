import { useMemo } from "react";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import type { Tables } from "@/integrations/supabase/types";

interface Props {
  listings: Tables<"listings">[];
}

export default function DashboardAnalytics({ listings }: Props) {
  // Views per listing (top 10)
  const viewsData = useMemo(() => {
    return [...listings]
      .sort((a, b) => b.view_count - a.view_count)
      .slice(0, 10)
      .map((l) => ({
        name: l.title.length > 18 ? l.title.slice(0, 18) + "…" : l.title,
        views: l.view_count,
      }));
  }, [listings]);

  // Sales over time (sold listings grouped by month)
  const salesData = useMemo(() => {
    const sold = listings.filter((l) => l.status === "sold");
    const grouped: Record<string, { count: number; revenue: number }> = {};

    sold.forEach((l) => {
      const d = new Date(l.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (!grouped[key]) grouped[key] = { count: 0, revenue: 0 };
      grouped[key].count += 1;
      grouped[key].revenue += Number(l.price) * l.quantity;
    });

    return Object.entries(grouped)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, data]) => ({
        month,
        sales: data.count,
        revenue: data.revenue,
      }));
  }, [listings]);

  const viewsConfig = {
    views: { label: "Views", color: "hsl(var(--primary))" },
  };

  const salesConfig = {
    sales: { label: "Sales", color: "hsl(var(--primary))" },
  };

  const revenueConfig = {
    revenue: { label: "Revenue ($)", color: "hsl(var(--secondary))" },
  };

  if (listings.length === 0) return null;

  return (
    <div className="space-y-6 mt-10">
      <h2 className="font-display text-xl font-bold uppercase tracking-wider text-foreground">
        Analytics
      </h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Views per listing */}
        <Card className="border-foreground/10">
          <CardHeader className="pb-2">
            <CardTitle className="font-display text-sm uppercase tracking-wider text-muted-foreground">
              Views per Listing
            </CardTitle>
          </CardHeader>
          <CardContent>
            {viewsData.length > 0 ? (
              <ChartContainer config={viewsConfig} className="h-[250px] w-full">
                <BarChart data={viewsData} margin={{ top: 5, right: 10, left: 0, bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="name"
                    angle={-35}
                    textAnchor="end"
                    tick={{ fontSize: 10 }}
                    interval={0}
                  />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="views" fill="var(--color-views)" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ChartContainer>
            ) : (
              <p className="text-sm text-muted-foreground py-8 text-center">No view data yet</p>
            )}
          </CardContent>
        </Card>

        {/* Sales over time */}
        <Card className="border-foreground/10">
          <CardHeader className="pb-2">
            <CardTitle className="font-display text-sm uppercase tracking-wider text-muted-foreground">
              Sales Over Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            {salesData.length > 0 ? (
              <ChartContainer config={salesConfig} className="h-[250px] w-full">
                <BarChart data={salesData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="sales" fill="var(--color-sales)" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ChartContainer>
            ) : (
              <p className="text-sm text-muted-foreground py-8 text-center">No sales yet</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Revenue trend — full width */}
      <Card className="border-foreground/10">
        <CardHeader className="pb-2">
          <CardTitle className="font-display text-sm uppercase tracking-wider text-muted-foreground">
            Revenue Trend
          </CardTitle>
        </CardHeader>
        <CardContent>
          {salesData.length > 0 ? (
            <ChartContainer config={revenueConfig} className="h-[250px] w-full">
              <LineChart data={salesData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${v}`} />
                <ChartTooltip
                  content={<ChartTooltipContent formatter={(value) => `$${Number(value).toFixed(2)}`} />}
                />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="var(--color-revenue)"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
              </LineChart>
            </ChartContainer>
          ) : (
            <p className="text-sm text-muted-foreground py-8 text-center">No revenue data yet</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
