import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: {
    value: number;
    direction: 'up' | 'down' | 'neutral';
  };
  subtitle?: string;
  variant?: 'default' | 'success' | 'warning' | 'destructive';
  className?: string;
}

export const MetricCard = ({ 
  title, 
  value, 
  icon, 
  trend, 
  subtitle, 
  variant = 'default',
  className = "" 
}: MetricCardProps) => {
  const getTrendIcon = () => {
    switch (trend?.direction) {
      case 'up': return <TrendingUp className="h-3 w-3" />;
      case 'down': return <TrendingDown className="h-3 w-3" />;
      default: return <Minus className="h-3 w-3" />;
    }
  };

  const getTrendColor = () => {
    switch (trend?.direction) {
      case 'up': return 'text-success';
      case 'down': return 'text-destructive';
      default: return 'text-muted-foreground';
    }
  };

  const getCardStyles = () => {
    switch (variant) {
      case 'success': return 'border-success/20 bg-success/5';
      case 'warning': return 'border-warning/20 bg-warning/5';
      case 'destructive': return 'border-destructive/20 bg-destructive/5';
      default: return 'border-primary/20 bg-primary/5';
    }
  };

  return (
    <Card className={`animate-fade-in hover:shadow-medium transition-smooth ${getCardStyles()} ${className}`}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between space-x-4">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-lg ${
              variant === 'success' ? 'bg-success/10' :
              variant === 'warning' ? 'bg-warning/10' :
              variant === 'destructive' ? 'bg-destructive/10' :
              'bg-primary/10'
            }`}>
              {icon}
            </div>
            <div>
              <p className="text-sm text-muted-foreground font-medium">{title}</p>
              <p className={`text-2xl font-bold ${
                variant === 'success' ? 'text-success' :
                variant === 'warning' ? 'text-warning' :
                variant === 'destructive' ? 'text-destructive' :
                'text-primary'
              }`}>
                {typeof value === 'number' ? value.toLocaleString() : value}
              </p>
              {subtitle && (
                <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
              )}
            </div>
          </div>
          
          {trend && (
            <Badge 
              variant="outline" 
              className={`${getTrendColor()} border-current bg-transparent`}
            >
              {getTrendIcon()}
              <span className="ml-1">{Math.abs(trend.value)}%</span>
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
};