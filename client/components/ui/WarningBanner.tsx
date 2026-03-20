import React from "react";
import { AlertCircle, AlertTriangle, Info, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface WarningBannerProps {
  warnings: string[];
  severity?: "warning" | "error" | "info";
  dismissible?: boolean;
  onDismiss?: () => void;
}

export function WarningBanner({
  warnings,
  severity = "warning",
  dismissible = true,
  onDismiss,
}: WarningBannerProps) {
  const [visible, setVisible] = React.useState(true);

  if (!warnings || warnings.length === 0 || !visible) {
    return null;
  }

  const severityConfig = {
    warning: {
      icon: AlertTriangle,
      bgColor: "bg-yellow-50 dark:bg-yellow-950",
      borderColor: "border-yellow-200 dark:border-yellow-800",
      textColor: "text-yellow-900 dark:text-yellow-100",
      iconColor: "text-yellow-600",
    },
    error: {
      icon: AlertCircle,
      bgColor: "bg-red-50 dark:bg-red-950",
      borderColor: "border-red-200 dark:border-red-800",
      textColor: "text-red-900 dark:text-red-100",
      iconColor: "text-red-600",
    },
    info: {
      icon: Info,
      bgColor: "bg-blue-50 dark:bg-blue-950",
      borderColor: "border-blue-200 dark:border-blue-800",
      textColor: "text-blue-900 dark:text-blue-100",
      iconColor: "text-blue-600",
    },
  };

  const config = severityConfig[severity];
  const Icon = config.icon;

  const handleDismiss = () => {
    setVisible(false);
    onDismiss?.();
  };

  return (
    <div className={`rounded-md border ${config.borderColor} ${config.bgColor} p-4`}>
      <div className={config.textColor}>
        {warnings.length === 1 ? (
          // Single warning with icon
          <div className="flex items-start gap-3">
            <Icon className={`h-5 w-5 mt-0.5 flex-shrink-0 ${config.iconColor}`} />
            <div className="flex-1">
              <p className="text-sm font-medium">{warnings[0]}</p>
            </div>
            {dismissible && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDismiss}
                className="h-6 w-6 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        ) : (
          // Multiple warnings as list
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <Icon className={`h-5 w-5 mt-0.5 flex-shrink-0 ${config.iconColor}`} />
              <div className="flex-1">
                <p className="text-sm font-medium">
                  {severity === "warning" && "Warnings:"}
                  {severity === "error" && "Errors:"}
                  {severity === "info" && "Information:"}
                </p>
              </div>
              {dismissible && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDismiss}
                  className="h-6 w-6 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            <ul className="ml-8 space-y-2">
              {warnings.map((warning, idx) => (
                <li key={idx} className="text-sm">
                  • {warning}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
