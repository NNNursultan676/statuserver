import { Card } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  icon?: React.ReactNode;
}

export function MetricCard({ title, value, subtitle, trend, trendValue, icon }: MetricCardProps) {
  const trendConfig = {
    up: { icon: TrendingUp, className: "text-green-500" },
    down: { icon: TrendingDown, className: "text-red-500" },
    neutral: { icon: Minus, className: "text-muted-foreground" },
  };

  const TrendIcon = trend ? trendConfig[trend].icon : null;
  const trendClassName = trend ? trendConfig[trend].className : "";

  return (
    <Card className="p-6" data-testid={`card-metric-${title.toLowerCase().replace(/\s+/g, '-')}`}>
      <div className="flex items-start justify-between mb-4">
        <p className="text-sm text-muted-foreground">{title}</p>
        {icon && <div className="text-muted-foreground">{icon}</div>}
      </div>
      <div className="space-y-2">
        <p className="text-3xl font-bold font-mono" data-testid={`text-metric-value-${title.toLowerCase().replace(/\s+/g, '-')}`}>
          {value}
        </p>
        {(subtitle || trend) && (
          <div className="flex items-center gap-2 text-sm">
            {trend && TrendIcon && (
              <div className={`flex items-center gap-1 ${trendClassName}`}>
                <TrendIcon className="w-4 h-4" />
                {trendValue && <span className="font-medium">{trendValue}</span>}
              </div>
            )}
            {subtitle && <span className="text-muted-foreground">{subtitle}</span>}
          </div>
        )}
      </div>
    </Card>
  );
}
