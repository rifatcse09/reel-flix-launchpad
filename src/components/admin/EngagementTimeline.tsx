import { BarChart, Bar, ResponsiveContainer, Tooltip } from "recharts";

interface EngagementTimelineProps {
  notificationId: string;
  reads: number;
}

export const EngagementTimeline = ({ notificationId, reads }: EngagementTimelineProps) => {
  // Simulate hourly engagement data (in production, fetch from database)
  const generateTimelineData = () => {
    const hours = 24;
    return Array.from({ length: hours }, (_, i) => ({
      hour: i,
      reads: Math.floor(Math.random() * (reads / 10))
    }));
  };

  const timelineData = generateTimelineData();

  return (
    <ResponsiveContainer width="100%" height={30}>
      <BarChart data={timelineData}>
        <Tooltip 
          contentStyle={{ 
            backgroundColor: 'hsl(var(--background))', 
            border: '1px solid hsl(var(--border))',
            fontSize: '12px'
          }}
          formatter={(value: number) => [`${value} reads`, 'Hour']}
        />
        <Bar 
          dataKey="reads" 
          fill="hsl(217, 91%, 60%)" 
          radius={[2, 2, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
};
