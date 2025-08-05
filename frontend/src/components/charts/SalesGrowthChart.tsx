import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

interface SalesGrowthChartProps {
  data: Array<{
    period: string;
    sales: number;
    growth: number;
  }>;
}

export const SalesGrowthChart = ({ data }: SalesGrowthChartProps) => {
  return (
    <ResponsiveContainer width="100%" height={350}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis 
          dataKey="period" 
          className="text-muted-foreground"
          tick={{ fontSize: 12 }}
        />
        <YAxis 
          className="text-muted-foreground"
          tick={{ fontSize: 12 }}
        />
        <Tooltip 
          contentStyle={{ 
            backgroundColor: 'hsl(var(--background))', 
            border: '1px solid hsl(var(--border))',
            borderRadius: '8px',
            boxShadow: 'var(--shadow-medium)'
          }} 
        />
        <Legend />
        <Line 
          type="monotone" 
          dataKey="sales" 
          stroke="hsl(var(--chart-1))" 
          strokeWidth={3}
          dot={{ fill: 'hsl(var(--chart-1))', strokeWidth: 2, r: 4 }}
          name="Sales (KSH)"
        />
        <Line 
          type="monotone" 
          dataKey="growth" 
          stroke="hsl(var(--chart-3))" 
          strokeWidth={2}
          dot={{ fill: 'hsl(var(--chart-3))', strokeWidth: 2, r: 3 }}
          name="Growth %"
        />
      </LineChart>
    </ResponsiveContainer>
  );
};