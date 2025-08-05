import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from 'recharts';

interface SalesHeatmapProps {
  data: Array<{
    day: string;
    sales: number;
    intensity: number;
  }>;
}

const getHeatmapColor = (intensity: number) => {
  const colors = [
    'hsl(var(--muted))',
    'hsl(var(--chart-1) / 0.3)',
    'hsl(var(--chart-1) / 0.6)', 
    'hsl(var(--chart-1) / 0.8)',
    'hsl(var(--chart-1))'
  ];
  return colors[Math.min(Math.floor(intensity), 4)];
};

export const SalesHeatmap = ({ data }: SalesHeatmapProps) => {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis 
          dataKey="day" 
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
          formatter={(value: number) => [`KSH ${value.toLocaleString()}`, 'Sales']}
        />
        <Bar dataKey="sales" radius={[4, 4, 0, 0]}>
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={getHeatmapColor(entry.intensity)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};