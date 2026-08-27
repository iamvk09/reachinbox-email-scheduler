import React, { useEffect, useState } from "react";
import { Mail, LogOut, Plus, User, Server, CheckCircle2, AlertCircle } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { Button } from "../common/Button";
import { Modal } from "../common/Modal";
import { Input } from "../common/Input";
import { getApiBaseUrl, setCustomApiUrl, checkServerHealth } from "../../api/client";

export interface HeaderProps {
  onOpenCompose: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenCompose }) => {
  const { user, logout } = useAuth();
  const [avatarFailed, setAvatarFailed] = useState(false);
  const [isServerModalOpen, setIsServerModalOpen] = useState(false);
  const [serverUrlInput, setServerUrlInput] = useState(getApiBaseUrl());
  const [isHealthy, setIsHealthy] = useState<boolean | null>(null);
  const [isCheckingHealth, setIsCheckingHealth] = useState(false);

  const checkHealth = async () => {
    setIsCheckingHealth(true);
    const healthy = await checkServerHealth();
    setIsHealthy(healthy);
    setIsCheckingHealth(false);
  };

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 15000);
    return () => clearInterval(interval);
  }, []);

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

  const handleSaveServerUrl = (e: React.FormEvent) => {
    e.preventDefault();
    setCustomApiUrl(serverUrlInput);
    setIsServerModalOpen(false);
    checkHealth();
    window.location.reload();
  };

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white">
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
              <div className="flex items-center gap-2">
                <p className="text-xs text-slate-500">Email scheduling workspace</p>
                <button
                  type="button"
                  onClick={() => {
                    setServerUrlInput(getApiBaseUrl());
                    setIsServerModalOpen(true);
                  }}
                  className="inline-flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
                  title="Configure backend server URL"
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isHealthy === true
                        ? "bg-emerald-500"
                        : isHealthy === false
                        ? "bg-rose-500"
                        : "bg-amber-500 animate-pulse"
                    }`}
                  />
                  <span>{isHealthy ? "API Connected" : "API Setup"}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Action & User Info */}
          <div className="flex items-center gap-3 sm:gap-4">
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Plus className="w-4 h-4" />}
              onClick={onOpenCompose}
              className="shadow-none"
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

      {/* Backend Server Settings Modal */}
      <Modal
        isOpen={isServerModalOpen}
        onClose={() => setIsServerModalOpen(false)}
        title="Backend API Configuration"
        subtitle="Manage the backend API connection URL"
        maxWidth="md"
      >
        <form onSubmit={handleSaveServerUrl} className="space-y-4">
          <Input
            label="Backend API Server URL"
            type="text"
            value={serverUrlInput}
            onChange={(e) => setServerUrlInput(e.target.value)}
            placeholder="https://reachinbox-backend-xxxx.onrender.com"
            leftIcon={<Server className="w-4 h-4" />}
            helperText="Paste your deployed backend URL from Render (or leave blank for localhost)."
          />

          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs space-y-1.5">
            <div className="flex items-center justify-between font-semibold text-slate-800">
              <span>Connection Status:</span>
              <span className="flex items-center gap-1.5">
                {isCheckingHealth ? (
                  <span className="text-slate-500">Checking...</span>
                ) : isHealthy ? (
                  <span className="text-emerald-600 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Online & Healthy
                  </span>
                ) : (
                  <span className="text-rose-600 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    Disconnected / Sleeping
                  </span>
                )}
              </span>
            </div>
            <p className="text-slate-500">
              Current Target: <code className="font-mono text-slate-700">{getApiBaseUrl() || "localhost:4000 (Proxy)"}</code>
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setIsServerModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm">
              Save & Reconnect
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
};
