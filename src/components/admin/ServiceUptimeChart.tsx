import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, BarChart3 } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend
} from "recharts";

interface ServiceUptimeChartProps {
  data: { hour: string; ok: number; fail: number }[];
  loading: boolean;
}

export function ServiceUptimeChart({ data, loading }: ServiceUptimeChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <BarChart3 className="h-5 w-5 text-primary" />
          Event Activity (24h)
        </CardTitle>
        <CardDescription>Hourly breakdown of successful vs failed events</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : data.length === 0 ? (
          <p className="text-center text-muted-foreground py-8 text-sm">No event data available</p>
        ) : (
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} barCategoryGap="20%">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 20%)" />
                <XAxis
                  dataKey="hour"
                  tick={{ fontSize: 11, fill: "hsl(0 0% 65%)" }}
                  interval={2}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "hsl(0 0% 65%)" }}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(222 47% 8%)",
                    border: "1px solid hsl(0 0% 20%)",
                    borderRadius: "8px",
                    color: "hsl(0 0% 98%)",
                    fontSize: 12,
                  }}
                />
                <Legend
                  wrapperStyle={{ fontSize: 12, color: "hsl(0 0% 65%)" }}
                />
                <Bar
                  dataKey="ok"
                  name="Success"
                  fill="hsl(142 76% 36%)"
                  radius={[3, 3, 0, 0]}
                  stackId="stack"
                />
                <Bar
                  dataKey="fail"
                  name="Failed"
                  fill="hsl(0 84% 60%)"
                  radius={[3, 3, 0, 0]}
                  stackId="stack"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
