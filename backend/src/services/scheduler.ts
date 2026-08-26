import { prisma } from "../db/prisma";
import { emailQueue } from "../queue/emailQueue";
import { env } from "../config/env";
import { Email } from "@prisma/client";

export interface ScheduleEmailInput {
  recipient: string;
  subject: string;
  body: string;
  sender: string;
  scheduledTime: string | Date;
  hourlyLimit?: number;
}

export interface ScheduledEmailResult {
  email: Email;
  delayMs: number;
  jobId: string;
}

function readScheduleInput(input: ScheduleEmailInput) {
  const requiredFields = ["recipient", "subject", "body", "sender"] as const;
  for (const field of requiredFields) {
    if (!input[field] || typeof input[field] !== "string") {
      throw new Error(`Missing or invalid '${field}' field.`);
    }
  }

  const scheduledAt = new Date(input.scheduledTime);
  if (Number.isNaN(scheduledAt.getTime())) {
    throw new Error("'scheduledTime' must be a valid date.");
  }

  const hourlyLimit = input.hourlyLimit ?? env.MAX_EMAILS_PER_HOUR_PER_SENDER;
  if (!Number.isInteger(hourlyLimit) || hourlyLimit < 1) {
    throw new Error("'hourlyLimit' must be a positive integer.");
  }
  if (hourlyLimit > env.MAX_EMAILS_PER_HOUR_PER_SENDER) {
    throw new Error(`'hourlyLimit' cannot exceed ${env.MAX_EMAILS_PER_HOUR_PER_SENDER}.`);
  }

  return { scheduledAt, hourlyLimit };
}

export async function scheduleEmails(
  inputs: ScheduleEmailInput[]
): Promise<ScheduledEmailResult[]> {
  if (!Array.isArray(inputs) || inputs.length === 0) {
    throw new Error("At least one email is required.");
  }

  return Promise.all(inputs.map(async (item) => {
    const { scheduledAt, hourlyLimit } = readScheduleInput(item);
    const emailRecord = await prisma.email.create({
      data: {
        recipient: item.recipient.trim(),
        subject: item.subject.trim(),
        body: item.body,
        sender: item.sender.trim(),
        hourly_limit: hourlyLimit,
        scheduled_time: scheduledAt,
        status: "pending",
      },
    });

    const delayMs = Math.max(0, scheduledAt.getTime() - Date.now());
    const jobId = `email-${emailRecord.id}`;

    await emailQueue.add(
      "send-email",
      { emailId: emailRecord.id },
      {
        delay: delayMs,
        jobId,
      }
    );

    return {
      email: emailRecord,
      delayMs,
      jobId,
    };
  }));
}
