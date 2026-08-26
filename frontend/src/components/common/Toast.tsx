import React, { useEffect } from "react";
import { CheckCircle2, AlertCircle, X, Info } from "lucide-react";

export interface ToastProps {
  id?: string;
  type?: "success" | "error" | "info";
  message: string;
  onClose: () => void;
  duration?: number;
}

export const Toast: React.FC<ToastProps> = ({
  type = "info",
  message,
  onClose,
  duration = 4000,
}) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);
    return () => clearTimeout(timer);
  }, [onClose, duration]);

  const icons = {
    success: <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />,
    error: <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />,
    info: <Info className="w-5 h-5 text-indigo-400 shrink-0" />,
  };

  const borders = {
    success: "border-emerald-500/40 bg-slate-900/95 text-slate-100",
    error: "border-rose-500/40 bg-slate-900/95 text-slate-100",
    info: "border-indigo-500/40 bg-slate-900/95 text-slate-100",
  };

  return (
    <div
      className={`fixed bottom-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-xl border shadow-xl backdrop-blur-md transition-all animate-in fade-in slide-in-from-bottom-5 ${borders[type]}`}
    >
      {icons[type]}
      <p className="text-sm font-medium pr-2">{message}</p>
      <button
        onClick={onClose}
        className="text-slate-400 hover:text-white p-1 rounded-md transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

