import React, { useCallback, useEffect, useState } from "react";
import { Clock, CheckCircle2, Filter, UserCheck, Users } from "lucide-react";

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
  const { user, isAuthenticated } = useAuth();

  const [activeTab, setActiveTab] = useState<"scheduled" | "sent">("scheduled");
  const [senderFilter, setSenderFilter] = useState<"my" | "all">("all");
  const [scheduledEmails, setScheduledEmails] = useState<EmailRecord[]>([]);
  const [sentEmails, setSentEmails] = useState<EmailRecord[]>([]);
  const [isLoadingScheduled, setIsLoadingScheduled] = useState(false);
  const [isLoadingSent, setIsLoadingSent] = useState(false);
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [toast, setToast] = useState<ToastProps | null>(null);

  const activeSenderQuery = senderFilter === "my" && user?.email ? user.email : undefined;

  const loadScheduledEmails = useCallback(
    async (showLoading = true) => {
      if (showLoading) setIsLoadingScheduled(true);
      try {
        const data = await fetchScheduledEmails(activeSenderQuery);
        setScheduledEmails(data);
      } catch (error) {
        console.error("Failed to load scheduled emails:", error);
      } finally {
        if (showLoading) setIsLoadingScheduled(false);
      }
    },
    [activeSenderQuery]
  );

  const loadSentEmails = useCallback(
    async (showLoading = true) => {
      if (showLoading) setIsLoadingSent(true);
      try {
        const data = await fetchSentEmails(activeSenderQuery);
        setSentEmails(data);
      } catch (error) {
        console.error("Failed to load sent emails:", error);
      } finally {
        if (showLoading) setIsLoadingSent(false);
      }
    },
    [activeSenderQuery]
  );

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
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      <Header onOpenCompose={() => setIsComposeOpen(true)} />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 mb-6 border-b border-slate-200">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Email Campaigns</h1>
            <p className="mt-1 text-sm text-slate-500">
              Schedule, monitor, and track automated email delivery in real time.
            </p>
          </div>

          {/* Controls: Tabs & Sender Filter */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Sender Filter Selector */}
            <div className="flex items-center gap-1 bg-slate-200/80 p-1 rounded-xl border border-slate-300">
              <button
                onClick={() => setSenderFilter("all")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  senderFilter === "all"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>All Senders</span>
              </button>

              {user?.email && (
                <button
                  onClick={() => setSenderFilter("my")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    senderFilter === "my"
                      ? "bg-white text-blue-700 shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                  title={`Show only emails sent by ${user.email}`}
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  <span className="truncate max-w-[130px]">My Emails</span>
                </button>
              )}
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center gap-1 bg-slate-200/80 p-1 rounded-xl border border-slate-300">
              <button
                onClick={() => setActiveTab("scheduled")}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === "scheduled"
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Scheduled</span>
                <span
                  className={`text-[11px] px-2 py-0.5 rounded-full font-bold ${
                    activeTab === "scheduled"
                      ? "bg-blue-700 text-white"
                      : "bg-slate-300 text-slate-700"
                  }`}
                >
                  {scheduledEmails.length}
                </span>
              </button>

              <button
                onClick={() => setActiveTab("sent")}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === "sent"
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Sent / Log</span>
                <span
                  className={`text-[11px] px-2 py-0.5 rounded-full font-bold ${
                    activeTab === "sent"
                      ? "bg-blue-700 text-white"
                      : "bg-slate-300 text-slate-700"
                  }`}
                >
                  {sentEmails.length}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Filter info indicator */}
        {senderFilter === "my" && user?.email && (
          <div className="mb-4 px-3.5 py-2 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-between text-xs text-blue-800">
            <span className="flex items-center gap-1.5 font-medium">
              <Filter className="w-3.5 h-3.5 text-blue-600" />
              Showing emails filtered for sender: <strong>{user.email}</strong>
            </span>
            <button
              onClick={() => setSenderFilter("all")}
              className="text-blue-600 hover:text-blue-800 font-semibold underline text-xs"
            >
              Show all senders
            </button>
          </div>
        )}

        {/* Tab Panels */}
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
