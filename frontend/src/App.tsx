import React, { useCallback, useEffect, useState } from "react";
import { Clock, CheckCircle2 } from "lucide-react";

import { useAuth } from "./context/AuthContext";
import { LoginScreen } from "./components/auth/LoginScreen";
import { Header } from "./components/layout/Header";
import { ScheduledTable } from "./components/emails/ScheduledTable";
import { SentTable } from "./components/emails/SentTable";
import { ComposeModal } from "./components/emails/ComposeModal";
import { Toast, ToastProps } from "./components/common/Toast";
import { fetchScheduledEmails, fetchSentEmails } from "./api/emailApi";
import { EmailRecord } from "./types/email";

export const AppContent: React.FC = () => {
  const { isAuthenticated } = useAuth();

  const [activeTab, setActiveTab] = useState<"scheduled" | "sent">("scheduled");
  const [scheduledEmails, setScheduledEmails] = useState<EmailRecord[]>([]);
  const [sentEmails, setSentEmails] = useState<EmailRecord[]>([]);
  const [isLoadingScheduled, setIsLoadingScheduled] = useState(false);
  const [isLoadingSent, setIsLoadingSent] = useState(false);
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [toast, setToast] = useState<ToastProps | null>(null);

  const loadEmails = useCallback(async (
    fetchEmails: () => Promise<EmailRecord[]>,
    setEmails: React.Dispatch<React.SetStateAction<EmailRecord[]>>,
    setLoading: React.Dispatch<React.SetStateAction<boolean>>,
    showLoading = true,
  ) => {
    if (showLoading) setLoading(true);
    try {
      setEmails(await fetchEmails());
    } catch (error) {
      console.error("Failed to load emails:", error);
    } finally {
      if (showLoading) setLoading(false);
    }
  }, []);

  const loadScheduledEmails = useCallback((showLoading = true) =>
    loadEmails(fetchScheduledEmails, setScheduledEmails, setIsLoadingScheduled, showLoading),
  [loadEmails]);

  const loadSentEmails = useCallback((showLoading = true) =>
    loadEmails(fetchSentEmails, setSentEmails, setIsLoadingSent, showLoading),
  [loadEmails]);

  useEffect(() => {
    if (!isAuthenticated) return;

    loadScheduledEmails(true);
    loadSentEmails(true);

    const interval = setInterval(() => {
      loadScheduledEmails(false);
      loadSentEmails(false);
    }, 5000);

    return () => clearInterval(interval);
  }, [isAuthenticated, loadScheduledEmails, loadSentEmails]);

  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  const handleScheduleSuccess = (count: number) => {
    setToast({
      type: "success",
      message: `Successfully queued ${count} email${count === 1 ? "" : "s"} in BullMQ!`,
      onClose: () => setToast(null),
    });
    loadScheduledEmails(true);
    setActiveTab("scheduled");
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      <Header onOpenCompose={() => setIsComposeOpen(true)} />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 mb-6">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Email campaigns</h1>
            <p className="mt-1 text-sm text-slate-500">Schedule, monitor, and review your email delivery.</p>
          </div>
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
            <button
              onClick={() => setActiveTab("scheduled")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === "scheduled"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>Scheduled Emails</span>
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                  activeTab === "scheduled"
                    ? "bg-slate-100 text-slate-600"
                    : "bg-slate-200 text-slate-500"
                }`}
              >
                {scheduledEmails.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("sent")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === "sent"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Sent Emails</span>
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                  activeTab === "sent"
                    ? "bg-slate-100 text-slate-600"
                    : "bg-slate-200 text-slate-500"
                }`}
              >
                {sentEmails.length}
              </span>
            </button>
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Updates every 5 seconds
            </span>
          </div>
        </div>

        {activeTab === "scheduled" ? (
          <ScheduledTable
            emails={scheduledEmails}
            isLoading={isLoadingScheduled}
            onRefresh={() => loadScheduledEmails(true)}
            onOpenCompose={() => setIsComposeOpen(true)}
          />
        ) : (
          <SentTable
            emails={sentEmails}
            isLoading={isLoadingSent}
            onRefresh={() => loadSentEmails(true)}
          />
        )}
      </main>

      <ComposeModal
        isOpen={isComposeOpen}
        onClose={() => setIsComposeOpen(false)}
        onSuccess={handleScheduleSuccess}
      />

      {toast && <Toast {...toast} />}
    </div>
  );
};

export default function App() {
  return <AppContent />;
}
