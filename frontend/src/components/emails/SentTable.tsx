import React from "react";
import { RefreshCw, ExternalLink, User, Calendar, AlertCircle } from "lucide-react";
import { EmailRecord } from "../../types/email";
import { Table, Column } from "../common/Table";
import { Badge } from "../common/Badge";
import { Button } from "../common/Button";
import { formatDateTime } from "../../utils/dateUtils";

export interface SentTableProps {
  emails: EmailRecord[];
  isLoading: boolean;
  onRefresh: () => void;
}

export const SentTable: React.FC<SentTableProps> = ({ emails, isLoading, onRefresh }) => {
  const columns: Column<EmailRecord>[] = [
    {
      key: "recipient",
      header: "Recipient & Sender",
      render: (email) => (
        <div>
          <span className="font-semibold text-slate-100 block">{email.recipient}</span>
          <span className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
            <User className="w-3 h-3 text-slate-500 inline" />
            From: {email.sender}
          </span>
        </div>
      ),
    },
    {
      key: "subject",
      header: "Subject & Message",
      render: (email) => (
        <div className="max-w-xs sm:max-w-md">
          <p className="font-medium text-slate-200 truncate">{email.subject}</p>
          <p className="text-xs text-slate-400 truncate mt-0.5 line-clamp-1">
            {email.body.replace(/<[^>]*>?/gm, "")}
          </p>
          {email.error_message && (
            <p className="text-[11px] text-rose-400 flex items-center gap-1 mt-1 font-mono bg-rose-500/10 px-2 py-0.5 rounded">
              <AlertCircle className="w-3 h-3 shrink-0" />
              {email.error_message}
            </p>
          )}
        </div>
      ),
    },
    {
      key: "sent_at",
      header: "Sent At",
      render: (email) => (
        <div className="space-y-0.5">
          <div className="flex items-center gap-1.5 text-xs text-slate-300">
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            <span>{formatDateTime(email.sent_at || email.created_at)}</span>
          </div>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (email) => <Badge status={email.status} />,
    },
    {
      key: "actions",
      header: "Preview & Link",
      className: "text-right",
      render: (email) => (
        <div className="flex justify-end">
          {email.preview_url ? (
            <a
              href={email.preview_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 transition-colors"
            >
              <span>Ethereal Preview</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          ) : (
            <span className="text-xs text-slate-500 italic">No link available</span>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* Table toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-base font-semibold text-white">Delivered & Processed Emails</h3>
          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
            {emails.length}
          </span>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={onRefresh}
          isLoading={isLoading}
          leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />}
        >
          Refresh Log
        </Button>
      </div>

      {/* Table */}
      <Table
        columns={columns}
        data={emails}
        isLoading={isLoading}
        keyExtractor={(item) => item.id}
        emptyState={{
          title: "No sent emails recorded",
          description: "Delivered emails with Ethereal preview links will appear here once dispatched.",
        }}
      />
    </div>
  );
};

