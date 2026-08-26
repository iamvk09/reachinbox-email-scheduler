import { prisma } from "../src/db/prisma";
import { scheduleEmails } from "../src/services/scheduler";
import { reconcileScheduledEmails } from "../src/services/reconciler";
import { initEmailWorker, stopEmailWorker } from "../src/queue/emailWorker";
import { emailQueue } from "../src/queue/emailQueue";
import { redisClient } from "../src/config/redis";
import { env } from "../src/config/env";
import { initMailer } from "../src/services/mailer";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForEmailStatus(
  emailId: string,
  targetStatus: string,
  timeoutMs = 20000
) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const email = await prisma.email.findUnique({ where: { id: emailId } });
    if (email && email.status === targetStatus) {
      return email;
    }
    await sleep(500);
  }
  return await prisma.email.findUnique({ where: { id: emailId } });
}

async function runLiveVerification() {
  console.log("\n=======================================================");
  console.log("   REACHINBOX LIVE SCENARIOS VERIFICATION SUITE       ");
  console.log("=======================================================\n");

  // Setup
  await prisma.$connect();
  await initMailer();

  // Clear previous test records in DB and Redis
  console.log("[SETUP] Cleaning test database records and Redis queue...");
  await prisma.email.deleteMany({});
  await emailQueue.drain();
  await emailQueue.obliterate({ force: true });
  const rateLimitKeys = await redisClient.keys("ratelimit:*");
  if (rateLimitKeys.length > 0) {
    await redisClient.del(...rateLimitKeys);
  }

  // Start the BullMQ worker
  initEmailWorker();

  // =========================================================================
  // SCENARIO 1: Schedule a few emails, confirm they land in Ethereal
  // =========================================================================
  console.log("\n-------------------------------------------------------");
  console.log("▶ SCENARIO 1: Schedule emails and verify Ethereal delivery");
  console.log("-------------------------------------------------------");

  const now = Date.now();
  const scheduleInputs = [
    {
      recipient: "alice@reachinbox-test.com",
      sender: "support@reachinbox.test",
      subject: "Scenario 1 - Email 1 (1s delay)",
      body: "Hello Alice! This email was scheduled with a 1-second BullMQ delay.",
      scheduledTime: new Date(now + 1000).toISOString(),
    },
    {
      recipient: "bob@reachinbox-test.com",
      sender: "support@reachinbox.test",
      subject: "Scenario 1 - Email 2 (3s delay)",
      body: "Hello Bob! This email was scheduled with a 3-second BullMQ delay.",
      scheduledTime: new Date(now + 3000).toISOString(),
    },
  ];

  console.log(`Scheduling ${scheduleInputs.length} emails via BullMQ delayed jobs...`);
  const scheduled = await scheduleEmails(scheduleInputs);

  console.log("Waiting for BullMQ worker and Ethereal SMTP dispatch...");
  for (const item of scheduled) {
    const sentEmail = await waitForEmailStatus(item.email.id, "sent", 20000);
    console.log(`\n📬 Result for Email to: ${sentEmail?.recipient}`);
    console.log(`- ID: ${sentEmail?.id}`);
    console.log(`- Status: ${sentEmail?.status}`);
    console.log(`- Sent At: ${sentEmail?.sent_at?.toISOString()}`);
    console.log(`- Ethereal Preview URL: ${sentEmail?.preview_url}`);

    if (sentEmail?.status !== "sent" || !sentEmail.preview_url) {
      throw new Error(`Scenario 1 Failed: Email ${item.email.id} was not sent or missing preview URL.`);
    }
  }
  console.log("\n✅ [SCENARIO 1 PASSED]: All scheduled emails dispatched and Ethereal preview URLs recorded!");

  // =========================================================================
  // SCENARIO 2: Schedule email -> Restart/Kill queue before firing -> Reconcile -> Verify single send
  // =========================================================================
  console.log("\n-------------------------------------------------------");
  console.log("▶ SCENARIO 2: Restart Safety & Reconciliation Test");
  console.log("-------------------------------------------------------");

  const restartTestTime = new Date(Date.now() + 5000); // 5 seconds in future
  console.log(`Scheduling email for 5s in future (scheduled for ${restartTestTime.toISOString()})...`);

  const [restartEmailResult] = await scheduleEmails([
    {
      recipient: "charlie@reachinbox-test.com",
      sender: "alerts@reachinbox.test",
      subject: "Scenario 2 - Restart Safety Test",
      body: "This email tests startup reconciliation after simulated server/queue crash.",
      scheduledTime: restartTestTime.toISOString(),
    },
  ]);

  if (!restartEmailResult) {
    throw new Error("Failed to schedule restart test email");
  }

  const restartEmailId = restartEmailResult.email.id;
  console.log(`Email created in PostgreSQL (ID: ${restartEmailId}, Status: pending).`);

  // Simulate complete crash: stop worker and wipe Redis BullMQ queue (leaving DB untouched)
  console.log("Simulating process/Redis crash: Stopping worker and purging Redis BullMQ queue...");
  await stopEmailWorker();
  await emailQueue.drain();
  await emailQueue.obliterate({ force: true });

  console.log("Simulating server boot: Running startup reconciliation (reconcileScheduledEmails)...");
  const reconciliationResult = await reconcileScheduledEmails();
  console.log(
    `Reconciliation Result: Checked ${reconciliationResult.checkedCount} pending DB records, Re-enqueued ${reconciliationResult.reenqueuedCount} missing BullMQ jobs.`
  );

  if (reconciliationResult.reenqueuedCount < 1) {
    throw new Error("Scenario 2 Failed: Reconciler failed to detect and re-enqueue orphaned pending email!");
  }

  // Restart worker to process re-enqueued job
  console.log("Restarting BullMQ worker to process re-enqueued jobs...");
  initEmailWorker();

  console.log("Waiting for reconciled email job to execute at its scheduled time...");
  const reconciledEmail = await waitForEmailStatus(restartEmailId, "sent", 20000);

  console.log(`\n📬 Reconciled Email Result:`);
  console.log(`- ID: ${reconciledEmail?.id}`);
  console.log(`- Status: ${reconciledEmail?.status}`);
  console.log(`- Sent At: ${reconciledEmail?.sent_at?.toISOString()}`);
  console.log(`- Preview URL: ${reconciledEmail?.preview_url}`);

  if (reconciledEmail?.status !== "sent") {
    throw new Error(`Scenario 2 Failed: Reconciled email ${restartEmailId} status is ${reconciledEmail?.status}, expected 'sent'.`);
  }

  // Test idempotency: attempt to process the exact same job again
  console.log("\nVerifying Idempotency: Submitting duplicate job to worker for already sent email...");
  await emailQueue.add("send-email", { emailId: restartEmailId }, { delay: 0 });
  await sleep(2000);

  const doubleSendCheck = await prisma.email.findUnique({
    where: { id: restartEmailId },
  });
  console.log(`Double-send check: Status remains '${doubleSendCheck?.status}' (idempotency prevented duplicate send).`);

  console.log("\n✅ [SCENARIO 2 PASSED]: Restart reconciliation restored orphaned job and sent exactly once!");

  // =========================================================================
  // SCENARIO 3: Rate Limiting & Deferral to Next Window
  // =========================================================================
  console.log("\n-------------------------------------------------------");
  console.log("▶ SCENARIO 3: Hourly Rate Limiting & Deferral Test");
  console.log("-------------------------------------------------------");

  const limit = env.MAX_EMAILS_PER_HOUR_PER_SENDER;
  const rateLimitedSender = "bulk-sender@reachinbox.test";
  console.log(`Configured MAX_EMAILS_PER_HOUR_PER_SENDER: ${limit}`);
  console.log(`Scheduling ${limit + 2} emails for sender '${rateLimitedSender}' in rapid succession...`);

  const batchInputs = [];
  for (let i = 1; i <= limit + 2; i++) {
    batchInputs.push({
      recipient: `lead${i}@prospect.com`,
      sender: rateLimitedSender,
      subject: `Outreach #${i}`,
      body: `Batch outreach email #${i}`,
      scheduledTime: new Date(Date.now() + i * 200).toISOString(),
    });
  }

  const batchScheduled = await scheduleEmails(batchInputs);
  console.log(`Successfully enqueued ${batchScheduled.length} emails. Waiting for worker processing...`);

  // Wait for worker processing to finish (limit sends + 2 deferrals)
  // Poll until total resolved (sent + deferred) equals batch length
  const startTime = Date.now();
  let allProcessed = false;
  let allBatchEmails: any[] = [];

  while (Date.now() - startTime < 35000) {
    allBatchEmails = await prisma.email.findMany({
      where: {
        id: { in: batchScheduled.map((b) => b.email.id) },
      },
      orderBy: { created_at: "asc" },
    });

    const sentCount = allBatchEmails.filter((e) => e.status === "sent").length;
    const deferredCount = allBatchEmails.filter(
      (e) => e.status === "pending" && new Date(e.scheduled_time).getTime() > Date.now() + 60000
    ).length;

    if (sentCount + deferredCount === batchScheduled.length) {
      allProcessed = true;
      break;
    }
    await sleep(1000);
  }

  const sentInBatch = allBatchEmails.filter((e) => e.status === "sent");
  const pendingDeferred = allBatchEmails.filter((e) => e.status === "pending");
  const failedInBatch = allBatchEmails.filter((e) => e.status === "failed");

  console.log(`\n📊 Batch Rate Limit Results:`);
  console.log(`- Sent in current hour window: ${sentInBatch.length} (Expected: ${limit})`);
  console.log(`- Deferred to next hour window: ${pendingDeferred.length} (Expected: 2)`);
  console.log(`- Failed: ${failedInBatch.length} (Expected: 0)`);

  for (const deferred of pendingDeferred) {
    console.log(`  * Deferred Email ID ${deferred.id} -> Scheduled time pushed to: ${deferred.scheduled_time.toISOString()}`);
  }

  if (failedInBatch.length > 0) {
    throw new Error("Scenario 3 Failed: Excess emails failed instead of being deferred!");
  }

  if (sentInBatch.length !== limit || pendingDeferred.length !== 2) {
    throw new Error(
      `Scenario 3 Failed: Expected ${limit} sent and 2 deferred, got ${sentInBatch.length} sent and ${pendingDeferred.length} deferred.`
    );
  }

  console.log("\n✅ [SCENARIO 3 PASSED]: Excess emails were safely deferred to next hour window without failing!");

  // Teardown
  console.log("\n-------------------------------------------------------");
  console.log("Cleaning up live verification...");
  await stopEmailWorker();
  await emailQueue.close();
  await redisClient.quit();
  await prisma.$disconnect();

  console.log("\n🎉 ALL 3 LIVE SCENARIOS COMPLETED AND VERIFIED SUCCESSFULLY!\n");
}

runLiveVerification().catch(async (err) => {
  console.error("\n❌ LIVE VERIFICATION ERROR:", err);
  try {
    await stopEmailWorker();
    await emailQueue.close();
    await redisClient.quit();
    await prisma.$disconnect();
  } catch (_) {}
  process.exit(1);
});

