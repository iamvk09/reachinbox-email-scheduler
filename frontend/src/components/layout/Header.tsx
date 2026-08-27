import React, { useEffect, useState } from "react";
import { Mail, LogOut, Plus, User } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { Button } from "../common/Button";

export interface HeaderProps {
  onOpenCompose: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenCompose }) => {
  const { user, logout } = useAuth();
  const [avatarFailed, setAvatarFailed] = useState(false);

  useEffect(() => {
    setAvatarFailed(false);
  }, [user?.picture]);

  const initials = (user?.name || "User")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center shadow-sm">
            <Mail className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-base text-slate-900 tracking-tight">ReachInbox</span>
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                Scheduler
              </span>
            </div>
            <p className="text-xs text-slate-500">Email scheduling workspace</p>
          </div>
        </div>

        {/* Action & User Info */}
        <div className="flex items-center gap-3 sm:gap-4">
          <Button
            variant="primary"
            size="sm"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={onOpenCompose}
            className="shadow-none font-medium"
          >
            Compose New Email
          </Button>

          <div className="h-6 w-px bg-slate-200 hidden sm:block" />

          {/* User badge */}
          {user && (
            <div className="flex items-center gap-3">
              <div className="hidden md:flex items-center gap-2.5 px-2 py-1">
                {user.picture && !avatarFailed ? (
                  <img
                    src={user.picture}
                    alt={user.name}
                    className="w-7 h-7 rounded-full object-cover border border-slate-200"
                    onError={() => setAvatarFailed(true)}
                  />
                ) : (
                  <div
                    className="w-7 h-7 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-[10px] font-semibold text-blue-700"
                    aria-label={`${user.name}'s avatar`}
                  >
                    {initials || <User className="w-3.5 h-3.5" />}
                  </div>
                )}
                <div className="text-left">
                  <p className="text-xs font-medium text-slate-800 leading-tight">{user.name}</p>
                  <p className="text-[10px] text-slate-500 leading-tight truncate max-w-[140px]">
                    {user.email}
                  </p>
                </div>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={logout}
                leftIcon={<LogOut className="w-4 h-4" />}
                title="Logout"
                className="text-slate-500 hover:text-slate-900 hover:bg-slate-100"
              >
                <span className="hidden sm:inline">Logout</span>
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
