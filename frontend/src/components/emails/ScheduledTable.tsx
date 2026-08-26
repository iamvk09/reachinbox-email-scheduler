import React from "react";
import { RefreshCw, Plus, Clock, User, Calendar } from "lucide-react";
import { EmailRecord } from "../../types/email";
import { Table, Column } from "../common/Table";
import { Badge } from "../common/Badge";
import { Button } from "../common/Button";
import { formatDateTime, formatRemainingTime } from "../../utils/dateUtils";

export interface ScheduledTableProps {
  emails: EmailRecord[];
  isLoading: boolean;
  onRefresh: () => void;
  onOpenCompose: () => void;
}

export const ScheduledTable: React.FC<ScheduledTableProps> = ({
  emails,
  isLoading,
  onRefresh,
  onOpenCompose,
}) => {
  const columns: Column<EmailRecord>[] = [
    {
      key: "recipient",
      header: "Recipient",
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
        </div>
      ),
    },
    {
      key: "scheduled_time",
      header: "Scheduled For",
      render: (email) => (
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-xs text-slate-300">
            <Calendar className="w-3.5 h-3.5 text-indigo-400" />
            <span>{formatDateTime(email.scheduled_time)}</span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-amber-400 font-medium">
            <Clock className="w-3 h-3" />
            <span>{formatRemainingTime(email.scheduled_time)}</span>
          </div>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      className: "text-right",
          render: (email) => (
            <div className="flex justify-end">
              <Badge
                status={email.status}
                label={email.status === "sending" ? "Sending" : "Pending Dispatch"}
              />
            </div>
          ),
    },

  ];

  return (
    <div className="space-y-4">
      {/* Table toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-base font-semibold text-white">Pending Queued Emails</h3>
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
          Refresh Queue
        </Button>
      </div>

      {/* Table */}
      <Table
        columns={columns}
        data={emails}
        isLoading={isLoading}
        keyExtractor={(item) => item.id}
        emptyState={{
          title: "No pending emails in queue",
          description: "All scheduled emails have been dispatched or none have been created yet.",
          action: (
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Plus className="w-4 h-4" />}
              onClick={onOpenCompose}
            >
              Compose New Email
            </Button>
          ),
        }}
      />
    </div>
  );
};
