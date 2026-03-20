import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowUp, ArrowDown, Minus } from "lucide-react";

interface TrendIndicator {
  direction: "up" | "down" | "stable";
  percentage?: number;
}

interface MetricCardProps {
  label: string;
  value: string | number;
  interpretation: string;
  icon?: React.ReactNode;
  valueColor?: string; // e.g., "text-green-600", "text-red-600"
  trend?: TrendIndicator;
  size?: "sm" | "md" | "lg"; // For different sized displays
}

export function MetricCard({
  label,
  value,
  interpretation,
  icon,
  valueColor = "text-foreground",
  trend,
  size = "md",
}: MetricCardProps) {
  const sizeClasses = {
    sm: "p-4",
    md: "p-6",
    lg: "p-8",
  };

  const valueSizeClasses = {
    sm: "text-xl",
    md: "text-3xl",
    lg: "text-5xl",
  };

  const getTrendIcon = () => {
    if (!trend) return null;

    const trendColor =
      trend.direction === "up"
        ? "text-green-600"
        : trend.direction === "down"
          ? "text-red-600"
          : "text-gray-500";

    const iconClass = "h-4 w-4";

    switch (trend.direction) {
      case "up":
        return <ArrowUp className={`${iconClass} ${trendColor}`} />;
      case "down":
        return <ArrowDown className={`${iconClass} ${trendColor}`} />;
      case "stable":
        return <Minus className={`${iconClass} ${trendColor}`} />;
    }
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className={`${sizeClasses[size]} pb-2`}>
        <div className="flex items-start justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {label}
          </CardTitle>
          {icon && <div className="text-2xl">{icon}</div>}
        </div>
      </CardHeader>
      <CardContent className={sizeClasses[size]}>
        <div className="space-y-3">
          {/* Value Display */}
          <div className="flex items-baseline gap-2">
            <div className={`font-bold ${valueSizeClasses[size]} ${valueColor}`}>
              {value}
            </div>
            {trend && (
              <div className="flex items-center gap-1">
                {getTrendIcon()}
                {trend.percentage && (
                  <span
                    className={`text-sm ${
                      trend.direction === "up"
                        ? "text-green-600"
                        : trend.direction === "down"
                          ? "text-red-600"
                          : "text-gray-500"
                    }`}
                  >
                    {Math.abs(trend.percentage)}%
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Interpretation */}
          <p className="text-sm text-muted-foreground">{interpretation}</p>
        </div>
      </CardContent>
    </Card>
  );
}
