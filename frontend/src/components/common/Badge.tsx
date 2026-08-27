import React from "react";
import { Clock, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { EmailStatus } from "../../types/email";

export interface BadgeProps {
  status: EmailStatus | "deferred" | "sending";
  label?: string;
  size?: "sm" | "md";
}

export const Badge: React.FC<BadgeProps> = ({ status, label, size = "md" }) => {
  const sizeStyles = {
    sm: "px-2 py-0.5 text-xs gap-1",
    md: "px-2.5 py-1 text-xs gap-1.5",
  };

  const config = {
    pending: {
      bg: "bg-amber-50 text-amber-700 border border-amber-200",
      icon: <Clock className="w-3.5 h-3.5 text-amber-600" />,
      defaultText: "Scheduled",
    },
    sending: {
      bg: "bg-sky-50 text-sky-700 border border-sky-200",
      icon: <Loader2 className="w-3.5 h-3.5 animate-spin text-sky-600" />,
      defaultText: "Sending",
    },
    sent: {
      bg: "bg-emerald-50 text-emerald-700 border border-emerald-200",
      icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />,
      defaultText: "Sent",
    },
    failed: {
      bg: "bg-rose-50 text-rose-700 border border-rose-200",
      icon: <XCircle className="w-3.5 h-3.5 text-rose-600" />,
      defaultText: "Failed",
    },
    deferred: {
      bg: "bg-blue-50 text-blue-700 border border-blue-200",
      icon: <Clock className="w-3.5 h-3.5 text-blue-600" />,
      defaultText: "Deferred",
    },
  };

  const current = config[status] || config.pending;

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full ${sizeStyles[size]} ${current.bg}`}
    >
      {current.icon}
      <span>{label || current.defaultText}</span>
    </span>
  );
};
