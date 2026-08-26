import { apiRequest } from "./client";
import {
  ApiResponse,
  EmailRecord,
  ScheduleEmailPayloadItem,
} from "../types/email";

export async function fetchScheduledEmails(): Promise<EmailRecord[]> {
  const res = await apiRequest<ApiResponse<EmailRecord[]>>("/api/emails/scheduled");
  return res.data;
}

export async function fetchSentEmails(): Promise<EmailRecord[]> {
  const res = await apiRequest<ApiResponse<EmailRecord[]>>("/api/emails/sent");
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

