import React from "react";
import { Inbox, Loader2 } from "lucide-react";

export interface Column<T> {
  key: string;
  header: string;
  render?: (item: T) => React.ReactNode;
  className?: string;
}

export interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  isLoading?: boolean;
  emptyState?: {
    title: string;
    description: string;
    action?: React.ReactNode;
  };
  keyExtractor: (item: T) => string;
}

export function Table<T>({
  columns,
  data,
  isLoading = false,
  emptyState,
  keyExtractor,
}: TableProps<T>) {
  return (
    <div className="w-full overflow-hidden rounded-lg border border-slate-200 bg-white">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-700">
          <thead className="bg-slate-50 text-xs font-medium uppercase tracking-wide text-slate-500 border-b border-slate-200">
            <tr>
              {columns.map((col) => (
                <th key={col.key} className={`px-5 py-3.5 ${col.className || ""}`}>
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              <tr>
                <td colSpan={columns.length} className="px-5 py-16 text-center">
                  <div className="flex flex-col items-center justify-center gap-3">
                    <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                    <p className="text-sm text-slate-500 font-medium">Fetching emails...</p>
                  </div>
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-5 py-16 text-center">
                  <div className="flex flex-col items-center justify-center max-w-sm mx-auto">
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center mb-3 text-slate-500">
                      <Inbox className="w-6 h-6" />
                    </div>
                    <h4 className="text-base font-medium text-slate-800">
                      {emptyState?.title || "No data found"}
                    </h4>
                    <p className="text-xs text-slate-500 mt-1 mb-4">
                      {emptyState?.description || "There are currently no records to display."}
                    </p>
                    {emptyState?.action}
                  </div>
                </td>
              </tr>
            ) : (
              data.map((item) => (
                <tr
                  key={keyExtractor(item)}
                  className="hover:bg-slate-50 transition-colors group"
                >
                  {columns.map((col) => (
                    <td key={col.key} className={`px-5 py-4 ${col.className || ""}`}>
                      {col.render ? col.render(item) : (item as any)[col.key]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
