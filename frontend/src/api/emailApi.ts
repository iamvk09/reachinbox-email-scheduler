import { apiRequest } from "./client";
import {
  ApiResponse,
  EmailRecord,
  ScheduleEmailPayloadItem,
} from "../types/email";

export async function fetchScheduledEmails(sender?: string): Promise<EmailRecord[]> {
  const query = sender && sender !== "all" ? `?sender=${encodeURIComponent(sender)}` : "";
  const res = await apiRequest<ApiResponse<EmailRecord[]>>(`/api/emails/scheduled${query}`);
  return res.data;
}

export async function fetchSentEmails(sender?: string): Promise<EmailRecord[]> {
  const query = sender && sender !== "all" ? `?sender=${encodeURIComponent(sender)}` : "";
  const res = await apiRequest<ApiResponse<EmailRecord[]>>(`/api/emails/sent${query}`);
  return res.data;
}

export async function scheduleEmailsApi(
  payload: ScheduleEmailPayloadItem[]
): Promise<EmailRecord[]> {
  const res = await apiRequest<ApiResponse<EmailRecord[]>>("/api/emails/schedule", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return res.data;
}
