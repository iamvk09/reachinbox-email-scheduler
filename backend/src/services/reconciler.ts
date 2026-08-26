import { prisma } from "../db/prisma";
import { emailQueue } from "../queue/emailQueue";

export async function reconcileScheduledEmails(): Promise<{
  checkedCount: number;
  reenqueuedCount: number;
  existingQueueCount: number;
}> {
  const existingJobs = await emailQueue.getJobs([
    "active",
    "delayed",
    "waiting",
    "prioritized",
  ]);

  const queuedEmailIds = new Set<string>();
  for (const job of existingJobs) {
    if (job.data?.emailId) {
      queuedEmailIds.add(job.data.emailId);
    }
  }
  const pendingEmails = await prisma.email.findMany({
    where: {
      status: "pending",
    },
    orderBy: {
      scheduled_time: "asc",
    },
  });

  let reenqueuedCount = 0;
  const now = Date.now();

  for (const email of pendingEmails) {
    if (queuedEmailIds.has(email.id)) continue;

    const delay = Math.max(0, email.scheduled_time.getTime() - now);
    await emailQueue.add("send-email", { emailId: email.id }, {
      delay,
      jobId: `email-${email.id}`,
    });
    reenqueuedCount++;
  }

  console.log(`[reconcile] ${pendingEmails.length} pending, ${reenqueuedCount} queued`);

  return {
    checkedCount: pendingEmails.length,
    reenqueuedCount,
    existingQueueCount: queuedEmailIds.size,
  };
}
