import React, { useState } from "react";
import { RefreshCw, ExternalLink, Calendar, AlertCircle, Eye, Mail, User } from "lucide-react";
import { EmailRecord } from "../../types/email";
import { Table, Column } from "../common/Table";
import { Badge } from "../common/Badge";
import { Button } from "../common/Button";
import { Modal } from "../common/Modal";
import { formatDateTime } from "../../utils/dateUtils";

export interface SentTableProps {
  emails: EmailRecord[];
  isLoading: boolean;
  onRefresh: () => void;
}

export const SentTable: React.FC<SentTableProps> = ({ emails, isLoading, onRefresh }) => {
  const [selectedEmail, setSelectedEmail] = useState<EmailRecord | null>(null);

  const columns: Column<EmailRecord>[] = [
    {
      key: "recipient",
      header: "Recipient (To)",
      render: (email) => (
        <div>
          <span className="font-semibold text-slate-900 block text-sm">{email.recipient}</span>
          <span className="text-xs text-slate-500 font-medium mt-0.5 inline-block">
            From: <span className="text-slate-700 font-mono">{email.sender}</span>
          </span>
        </div>
      ),
    },
    {
      key: "subject",
      header: "Subject & Message",
      render: (email) => (
        <div className="max-w-xs sm:max-w-md">
          <p className="font-medium text-slate-900 truncate text-sm">{email.subject}</p>
          <p className="text-xs text-slate-500 truncate mt-0.5 line-clamp-1">
            {email.body.replace(/<[^>]*>?/gm, "")}
          </p>
          {email.error_message && (
            <p className="text-xs text-rose-700 flex items-center gap-1.5 mt-1 font-mono bg-rose-50 border border-rose-200 px-2.5 py-1 rounded">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-500" />
              <span>{email.error_message}</span>
            </p>
          )}
        </div>
      ),
    },
    {
      key: "sent_at",
      header: "Sent Time",
      render: (email) => (
        <div className="space-y-0.5">
          <div className="flex items-center gap-1.5 text-xs font-medium text-slate-700">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
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
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setSelectedEmail(email)}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 transition-colors shadow-sm"
            title="Preview full email content"
          >
            <Eye className="w-3.5 h-3.5 text-slate-600" />
            <span>View Email</span>
          </button>

          {email.preview_url ? (
            <a
              href={email.preview_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-colors shadow-sm"
              title="Open in Ethereal Mailbox"
            >
              <span>Ethereal</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          ) : (
            <span className="text-xs text-slate-400 italic">No link</span>
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
          <h3 className="text-base font-semibold text-slate-900">Delivered & Failed Emails</h3>
          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
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
          Refresh
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

      {/* Email Message Detail & Preview Modal */}
      {selectedEmail && (
        <Modal
          isOpen={!!selectedEmail}
          onClose={() => setSelectedEmail(null)}
          title="Delivered Email Preview"
          subtitle={`Campaign message dispatched on ${formatDateTime(selectedEmail.sent_at || selectedEmail.created_at)}`}
          maxWidth="2xl"
        >
          <div className="space-y-4">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5 text-xs">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <span className="text-slate-500 font-medium">Subject:</span>
                <span className="font-semibold text-slate-900 text-sm">{selectedEmail.subject}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">From:</span>
                <span className="font-mono text-slate-800 font-medium flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  {selectedEmail.sender}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">To (Recipient):</span>
                <span className="font-mono text-slate-800 font-medium flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  {selectedEmail.recipient}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Status:</span>
                <Badge status={selectedEmail.status} />
              </div>
            </div>

            {/* Email Body Rendering */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide">
                Email Content Body
              </label>
              <div className="p-4 rounded-xl border border-slate-200 bg-white text-slate-800 text-sm min-h-[140px] whitespace-pre-wrap font-sans leading-relaxed shadow-inner">
                {selectedEmail.body}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-200">
              {selectedEmail.preview_url ? (
                <a
                  href={selectedEmail.preview_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800 underline"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open in Ethereal Mailbox</span>
                </a>
              ) : (
                <div />
              )}

              <Button
                variant="secondary"
                size="sm"
                onClick={() => setSelectedEmail(null)}
              >
                Close Preview
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
