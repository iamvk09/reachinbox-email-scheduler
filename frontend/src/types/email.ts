export type EmailStatus = "pending" | "sending" | "sent" | "failed";

export interface EmailRecord {
  id: string;
  recipient: string;
  subject: string;
  body: string;
  sender: string;
  hourly_limit: number | null;
  scheduled_time: string;
  status: EmailStatus;
  sent_at: string | null;
  preview_url: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
  delayMs?: number;
  jobId?: string;
}

export interface ScheduleEmailPayloadItem {
  recipient: string;
  subject: string;
  body: string;
  sender: string;
  scheduledTime: string;
  hourlyLimit?: number;
}


export interface ApiResponse<T> {
  success: boolean;
  count?: number;
  data: T;
  error?: string;
}

export interface UserProfile {
  name: string;
  email: string;
  picture?: string;
}

