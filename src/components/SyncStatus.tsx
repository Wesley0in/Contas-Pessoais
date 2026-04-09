import { CheckCircle, Clock, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface SyncStatusProps {
  status: "synced" | "pending" | "error";
  className?: string;
}

export function SyncStatus({ status, className }: SyncStatusProps) {
  const config = {
    synced: { icon: CheckCircle, label: "Sincronizado", color: "text-success" },
    pending: { icon: Clock, label: "Pendente", color: "text-warning" },
    error: { icon: AlertCircle, label: "Erro", color: "text-destructive" },
  };

  const { icon: Icon, label, color } = config[status];

  return (
    <span className={cn("inline-flex items-center gap-1 text-xs font-medium", color, className)}>
      <Icon className="w-3.5 h-3.5" />
      {label}
    </span>
  );
}
