import React from "react";
import { Clock, CheckCircle2, XCircle } from "lucide-react";
import { EmailStatus } from "../../types/email";

export interface BadgeProps {
  status: EmailStatus | "deferred";
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
      bg: "bg-amber-500/10 text-amber-400 border border-amber-500/30",
      icon: <Clock className="w-3.5 h-3.5" />,
      defaultText: "Scheduled",
    },
    sending: {
      bg: "bg-sky-500/10 text-sky-400 border border-sky-500/30",
      icon: <Clock className="w-3.5 h-3.5 animate-spin" />,
      defaultText: "Sending",
    },
    sent: {
      bg: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30",
      icon: <CheckCircle2 className="w-3.5 h-3.5" />,
      defaultText: "Sent",
    },
    failed: {
      bg: "bg-rose-500/10 text-rose-400 border border-rose-500/30",
      icon: <XCircle className="w-3.5 h-3.5" />,
      defaultText: "Failed",
    },
    deferred: {
      bg: "bg-blue-500/10 text-blue-400 border border-blue-500/30",
      icon: <Clock className="w-3.5 h-3.5" />,
      defaultText: "Deferred (Rate Limited)",
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
