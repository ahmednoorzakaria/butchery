import { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: number;
    label: string;
  };
  variant?: "default" | "primary" | "success" | "warning" | "destructive";
  className?: string;
}

export function StatCard({ 
  title, 
  value, 
  icon: Icon, 
  trend, 
  variant = "default",
  className 
}: StatCardProps) {
  const variantStyles = {
    default: "text-primary",
    primary: "bg-gradient-primary text-primary-foreground",
    success: "text-success",
    warning: "text-warning", 
    destructive: "text-destructive"
  };

  const iconStyles = {
    default: "text-primary",
    primary: "text-primary-foreground opacity-80",
    success: "text-success",
    warning: "text-warning",
    destructive: "text-destructive"
  };

  return (
    <Card className={cn(
      variant === "primary" && "bg-gradient-primary text-primary-foreground border-primary/20",
      className
    )}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className={cn(
              "text-sm font-medium",
              variant === "primary" ? "text-primary-foreground/80" : "text-muted-foreground"
            )}>
              {title}
            </p>
            <p className={cn(
              "text-3xl font-bold mt-1",
              variant === "primary" ? "text-primary-foreground" : "text-foreground"
            )}>
              {value}
            </p>
            {trend && (
              <p className={cn(
                "text-xs mt-1",
                variant === "primary" ? "text-primary-foreground/70" : "text-muted-foreground"
              )}>
                <span className={cn(
                  "font-medium",
                  trend.value > 0 ? "text-success" : trend.value < 0 ? "text-destructive" : ""
                )}>
                  {trend.value > 0 ? "+" : ""}{trend.value}%
                </span>{" "}
                {trend.label}
              </p>
            )}
          </div>
          <Icon className={cn("h-8 w-8", iconStyles[variant])} />
        </div>
      </CardContent>
    </Card>
  );
}