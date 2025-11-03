import { Badge } from "@/components/ui/badge";
import { ServiceStatus } from "@shared/schema";
import { CheckCircle2, AlertTriangle, XCircle, Wrench, Loader2 } from "lucide-react";

interface StatusBadgeProps {
  status: ServiceStatus;
  showIcon?: boolean;
  size?: "sm" | "default";
}

export function StatusBadge({ status, showIcon = true, size = "default" }: StatusBadgeProps) {
  const config = {
    operational: {
      label: "Operational",
      icon: CheckCircle2,
      className: "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20",
    },
    degraded: {
      label: "Degraded",
      icon: AlertTriangle,
      className: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    },
    down: {
      label: "Down",
      icon: XCircle,
      className: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
    },
    maintenance: {
      label: "Maintenance",
      icon: Wrench,
      className: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
    },
    loading: {
      label: "Load",
      icon: Loader2,
      className: "bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20",
    },
  };

  const { label, icon: Icon, className } = config[status];

  return (
    <Badge variant="outline" className={`${className} ${size === "sm" ? "text-xs" : ""}`}>
      {showIcon && <Icon className="w-3 h-3 mr-1.5" />}
      {label}
    </Badge>
  );
}
