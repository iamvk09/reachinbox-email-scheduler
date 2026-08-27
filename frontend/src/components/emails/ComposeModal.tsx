import React, { useState, useEffect } from "react";
import {
  Upload,
  Send,
  Calendar,
  Clock,
  AlertCircle,
  CheckCircle2,
  FileText,
  User,
  Gauge,
  Server,
} from "lucide-react";

import { Modal } from "../common/Modal";
import { Input, Textarea } from "../common/Input";
import { Button } from "../common/Button";
import { useAuth } from "../../context/AuthContext";
import { parseRecipientsInput, readCsvFile } from "../../utils/csvParser";
import { scheduleEmailsApi } from "../../api/emailApi";
import { ScheduleEmailPayloadItem } from "../../types/email";
import { getApiBaseUrl, setCustomApiUrl } from "../../api/client";

export interface ComposeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (count: number) => void;
}

export const ComposeModal: React.FC<ComposeModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { user } = useAuth();

  const [sender, setSender] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [recipientsRawText, setRecipientsRawText] = useState("");
  const [startTime, setStartTime] = useState("");
  const [delaySeconds, setDelaySeconds] = useState(2);
  const [hourlyLimit, setHourlyLimit] = useState(10);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [showServerInput, setShowServerInput] = useState(false);
  const [customServerUrl, setCustomServerUrl] = useState(getApiBaseUrl());

  // Initialize defaults on open
  useEffect(() => {
    if (isOpen) {
      setSender(user?.email || "campaign@reachinbox.test");
      setSubject("");
      setBody("");
      setRecipientsRawText("");
      setDelaySeconds(2);
      setHourlyLimit(10);
      setErrorMessage("");
      setShowServerInput(false);

      // Default start time to now formatted for datetime-local input (YYYY-MM-DDTHH:mm)
      const now = new Date();
      now.setMinutes(now.getMinutes() + 1); // 1 minute in future as default
      const offset = now.getTimezoneOffset() * 60000;
      const localISOTime = new Date(now.getTime() - offset).toISOString().slice(0, 16);
      setStartTime(localISOTime);
    }
  }, [isOpen, user]);

  // Live parsed recipients calculation
  const parsedRecipients = parseRecipientsInput(recipientsRawText);

  // Handle CSV file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const fileContent = await readCsvFile(file);
      // Append to current recipients text
      setRecipientsRawText((prev) =>
        prev.trim() ? `${prev}\n${fileContent}` : fileContent
      );
      setErrorMessage("");
    } catch (err: any) {
      setErrorMessage("Failed to read CSV file.");
    } finally {
      e.target.value = ""; // Reset input
    }
  };

  const handleSaveCustomServer = () => {
    setCustomApiUrl(customServerUrl);
    setErrorMessage("");
    setShowServerInput(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    if (!sender.trim() || !sender.includes("@")) {
      setErrorMessage("Please enter a valid sender email address.");
      return;
    }
    if (!subject.trim()) {
      setErrorMessage("Email subject is required.");
      return;
    }
    if (!body.trim()) {
      setErrorMessage("Email body is required.");
      return;
    }
    if (parsedRecipients.validEmails.length === 0) {
      setErrorMessage("Please provide at least one valid recipient email address.");
      return;
    }
    if (!startTime) {
      setErrorMessage("Please select a valid scheduled start time.");
      return;
    }

    const startDate = new Date(startTime);
    if (isNaN(startDate.getTime())) {
      setErrorMessage("Invalid scheduled start time.");
      return;
    }

    setIsSubmitting(true);

    try {
      // Build batch payload with staggered scheduled times
      const startMs = startDate.getTime();
      const delayMs = Math.max(0, delaySeconds) * 1000;

      const payload: ScheduleEmailPayloadItem[] = parsedRecipients.validEmails.map(
        (recipient, index) => {
          const itemScheduledDate = new Date(startMs + index * delayMs);
          return {
            recipient,
            subject: subject.trim(),
            body: body.trim(),
            sender: sender.trim(),
            scheduledTime: itemScheduledDate.toISOString(),
          };
        }
      );

      await scheduleEmailsApi(payload);

      onSuccess(payload.length);
      onClose();
    } catch (err: any) {
      const msg = err.message || "Failed to schedule emails.";
      setErrorMessage(msg);
      if (msg.includes("Failed to connect") || msg.includes("Failed to fetch")) {
        setShowServerInput(true);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Compose & Schedule Emails"
      subtitle="Schedule delayed campaigns backed by BullMQ & Redis"
      maxWidth="2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Sender Email */}
        <Input
          label="Sender Email Address"
          type="email"
          value={sender}
          onChange={(e) => setSender(e.target.value)}
          placeholder="your.email@company.com"
          leftIcon={<User className="w-4 h-4" />}
          required
        />

        {/* Recipients Input & CSV Upload */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-medium text-slate-300">
              Recipient Email Addresses (CSV Upload or Text)
            </label>
            <label className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 text-xs font-medium cursor-pointer border border-indigo-500/30 transition-colors">
              <Upload className="w-3.5 h-3.5" />
              <span>Upload CSV / TXT</span>
              <input
                type="file"
                accept=".csv,.txt"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>

          <Textarea
            rows={3}
            value={recipientsRawText}
            onChange={(e) => setRecipientsRawText(e.target.value)}
            placeholder="alice@example.com, bob@example.com&#10;or paste/upload CSV column with emails..."
          />

          {/* Live Recipient Badges */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            {parsedRecipients.totalDetected > 0 ? (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-md">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {parsedRecipients.totalDetected} valid recipient
                {parsedRecipients.totalDetected === 1 ? "" : "s"} detected
              </span>
            ) : (
              <span className="text-xs text-slate-500 italic">
                Enter emails separated by commas or newlines
              </span>
            )}

            {parsedRecipients.invalidEntries.length > 0 && (
              <span className="inline-flex items-center gap-1 text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-md">
                <AlertCircle className="w-3 h-3" />
                {parsedRecipients.invalidEntries.length} invalid skipped
              </span>
            )}
          </div>
        </div>

        {/* Subject */}
        <Input
          label="Subject Line"
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="e.g. Special Offer: 20% Off Your Next Campaign"
          leftIcon={<FileText className="w-4 h-4" />}
          required
        />

        {/* Body */}
        <Textarea
          label="Email Body / Message"
          rows={4}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Write your email content here (HTML or plain text supported)..."
          required
        />

        {/* Scheduling Controls: Start Time, Delay, & Hourly Limit */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 p-4 bg-slate-950/60 rounded-xl border border-slate-800">
          <Input
            label="Start Time"
            type="datetime-local"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            leftIcon={<Calendar className="w-3.5 h-3.5" />}
            required
          />

          <Input
            label="Delay (Seconds)"
            type="number"
            min="0"
            step="1"
            value={delaySeconds}
            onChange={(e) => setDelaySeconds(parseInt(e.target.value, 10) || 0)}
            leftIcon={<Clock className="w-3.5 h-3.5" />}
            helperText="Per-email stagger"
          />

          <Input
            label="Hourly Limit"
            type="number"
            min="1"
            value={hourlyLimit}
            onChange={(e) => setHourlyLimit(parseInt(e.target.value, 10) || 10)}
            leftIcon={<Gauge className="w-3.5 h-3.5" />}
            helperText="Max emails / hour"
          />
        </div>

        {/* Summary calculation */}
        {parsedRecipients.totalDetected > 0 && (
          <div className="p-3 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-300">
            <p className="font-semibold text-white">Campaign Dispatch Summary:</p>
            <p className="mt-0.5">
              Will enqueue <strong>{parsedRecipients.totalDetected}</strong> delayed job
              {parsedRecipients.totalDetected === 1 ? "" : "s"} in BullMQ starting at{" "}
              <strong>{new Date(startTime || Date.now()).toLocaleString()}</strong> with a{" "}
              <strong>{delaySeconds}s</strong> delay between sends (rate limited to {hourlyLimit}/hr).
            </p>
          </div>
        )}

        {/* Error message */}
        {errorMessage && (
          <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>

            {showServerInput && (
              <div className="mt-2 pt-2 border-t border-rose-500/20 space-y-2">
                <p className="text-slate-300 font-medium">Backend URL Configuration:</p>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={customServerUrl}
                    onChange={(e) => setCustomServerUrl(e.target.value)}
                    placeholder="https://reachinbox-backend-xxxx.onrender.com"
                    className="flex-1 bg-slate-900 border border-slate-700 text-white rounded px-2.5 py-1.5 text-xs font-mono"
                  />
                  <button
                    type="button"
                    onClick={handleSaveCustomServer}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs font-semibold"
                  >
                    Save URL
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>

          <Button
            type="submit"
            variant="primary"
            isLoading={isSubmitting}
            leftIcon={<Send className="w-4 h-4" />}
          >
            Schedule {parsedRecipients.totalDetected > 0 ? `${parsedRecipients.totalDetected} Emails` : "Emails"}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
