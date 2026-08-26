import { Job, Worker } from "bullmq";
import { redisConnectionOptions } from "../config/redis";
import { env } from "../config/env";
import { prisma } from "../db/prisma";
import { sendEmail } from "../services/mailer";
import { checkAndIncrementSenderRateLimit } from "../services/rateLimiter";
import { EMAIL_QUEUE_NAME, EmailJobData, emailQueue } from "./emailQueue";

let emailWorker: Worker<EmailJobData, any, string> | null = null;

export async function processEmailJob(job: Job<EmailJobData, any, string>): Promise<void> {
  const { emailId } = job.data;
  const email = await prisma.email.findUnique({
    where: { id: emailId },
  });

  if (!email || email.status !== "pending") return;

  const claim = await prisma.email.updateMany({
    where: { id: email.id, status: "pending" },
    data: { status: "sending" },
  });

  if (claim.count !== 1) return;

  const rateLimit = await checkAndIncrementSenderRateLimit(email.sender, email.hourly_limit);

  if (!rateLimit.allowed) {
    const nextDate = rateLimit.nextAvailableDate || new Date(Date.now() + 3600000);
    const delay = rateLimit.delayMs || 3600000;
    await prisma.email.update({
      where: { id: email.id },
      data: {
        scheduled_time: nextDate,
        status: "pending",
      },
    });

    await emailQueue.add(
      "send-email",
      { emailId: email.id },
      {
        delay,
        jobId: `email-${email.id}-${nextDate.getTime()}`,
      }
    );

    return;
  }

  try {
    const result = await sendEmail({
      to: email.recipient,
      from: email.sender,
      subject: email.subject,
      body: email.body,
    });

    await prisma.email.update({
      where: { id: email.id },
      data: {
        status: "sent",
        sent_at: new Date(),
        preview_url: result.previewUrl,
        error_message: null,
      },
    });

  } catch (error: any) {
    await prisma.email.update({
      where: { id: email.id },
      data: {
        status: "failed",
        error_message: error.message || "Unknown error during email dispatch",
      },
    });

    throw error;
  }
}

export function initEmailWorker(): Worker<EmailJobData, any, string> {
  if (emailWorker) {
    return emailWorker;
  }

  emailWorker = new Worker<EmailJobData, any, string>(
    EMAIL_QUEUE_NAME,
    async (job) => {
      await processEmailJob(job);
    },
    {
      connection: redisConnectionOptions,
      concurrency: env.WORKER_CONCURRENCY,
      limiter: {
        max: 1,
        duration: env.MIN_SEND_DELAY_MS,
      },
    }
  );

  emailWorker.on("failed", (job, err) => {
    console.error(`[worker] ${job?.id} failed: ${err.message}`);
  });

  emailWorker.on("error", (err) => {
    console.error("[worker] error:", err.message);
  });

  return emailWorker;
}

export async function stopEmailWorker(): Promise<void> {
  if (emailWorker) {
    await emailWorker.close();
    emailWorker = null;
  }
}
