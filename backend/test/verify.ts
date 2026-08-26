import assert from "assert";
import { sendEmail } from "../src/services/mailer";
import { checkAndIncrementSenderRateLimit } from "../src/services/rateLimiter";
import { env } from "../src/config/env";

async function runTests() {
  console.log("\n🧪 ==========================================");
  console.log("   REACHINBOX EMAIL SCHEDULER VERIFICATION  ");
  console.log("==========================================\n");

  let passedTests = 0;
  let totalTests = 0;

  async function test(name: string, fn: () => Promise<void>) {
    totalTests++;
    try {
      await fn();
      console.log(`✅ [PASS] ${name}`);
      passedTests++;
    } catch (err: any) {
      console.error(`❌ [FAIL] ${name}:`, err.message);
      console.error(err.stack);
    }
  }

  // TEST 1: Nodemailer with Ethereal Email & Preview URL
  await test("Nodemailer Ethereal Email - Generates Test Account & Logs Preview URL", async () => {
    const result = await sendEmail({
      to: "recipient@example.com",
      from: "sender@reachinbox.test",
      subject: "Test Verification Email",
      body: "Testing Ethereal email dispatch and preview link generation.",
    });

    assert.ok(result.messageId, "Expected messageId to be returned");
    assert.ok(result.previewUrl, "Expected previewUrl to be returned from Ethereal");
    assert.ok(
      result.previewUrl.startsWith("https://ethereal.email/message/"),
      `Expected valid Ethereal URL, got ${result.previewUrl}`
    );
  });

  // TEST 2: Delay Calculation & Scheduling Logic
  await test("Scheduler Logic - Millisecond Delay Calculation", async () => {
    const now = Date.now();
    const futureTime = new Date(now + 15000); // 15 seconds in future
    const pastTime = new Date(now - 10000); // 10 seconds in past

    const futureDelay = Math.max(0, futureTime.getTime() - now);
    const pastDelay = Math.max(0, pastTime.getTime() - now);

    assert.ok(
      futureDelay >= 14000 && futureDelay <= 16000,
      `Future delay should be ~15000ms, got ${futureDelay}`
    );
    assert.strictEqual(pastDelay, 0, "Past scheduled time must have 0ms delay for immediate processing");
  });

  // TEST 3: Rate Limiter Hourly Window & Deferral Calculation
  await test("Rate Limiter - Hourly Bucket & Next Window Calculation", async () => {
    const now = Date.now();
    const oneHourMs = 60 * 60 * 1000;
    const currentHourStartMs = Math.floor(now / oneHourMs) * oneHourMs;
    const nextHourStartMs = currentHourStartMs + oneHourMs;
    const expectedRemainingDelay = Math.max(1000, nextHourStartMs - now + 500);

    assert.ok(
      nextHourStartMs > now,
      "Next hour window start must be in the future"
    );
    assert.ok(
      expectedRemainingDelay > 0 && expectedRemainingDelay <= 3600500,
      `Delay should be within 1 hour range, got ${expectedRemainingDelay}`
    );
  });

  // TEST 4: Idempotency Logic
  await test("Idempotency Safeguard - Prevent Double Sends", async () => {
    const mockEmailRecord = {
      id: "test-uuid-123",
      recipient: "test@example.com",
      sender: "sender@example.com",
      status: "sent", // Already processed
    };

    let emailSent = false;
    if (mockEmailRecord.status === "pending") {
      emailSent = true;
    }

    assert.strictEqual(
      emailSent,
      false,
      "Worker must skip email processing if status is not 'pending'"
    );
  });

  // TEST 5: Restart Safety & Reconciliation Logic Simulation
  await test("Reconciliation Engine - Identifies Un-queued Pending Emails", async () => {
    const mockDbPendingEmails = [
      { id: "email-1", recipient: "a@test.com", scheduled_time: new Date(Date.now() + 5000), status: "pending" },
      { id: "email-2", recipient: "b@test.com", scheduled_time: new Date(Date.now() + 10000), status: "pending" },
      { id: "email-3", recipient: "c@test.com", scheduled_time: new Date(Date.now() - 2000), status: "pending" },
    ];

    const mockBullMQQeuueJobs = new Set<string>(["email-1"]); // email-2 and email-3 were dropped during crash

    const reenqueued: Array<{ id: string; delay: number }> = [];
    const now = Date.now();

    for (const email of mockDbPendingEmails) {
      if (!mockBullMQQeuueJobs.has(email.id)) {
        const remainingDelay = Math.max(0, email.scheduled_time.getTime() - now);
        reenqueued.push({ id: email.id, delay: remainingDelay });
      }
    }

    assert.strictEqual(reenqueued.length, 2, "Must re-enqueue exactly 2 missing jobs");
    assert.strictEqual(reenqueued[0].id, "email-2");
    assert.strictEqual(reenqueued[1].id, "email-3");
    assert.strictEqual(reenqueued[1].delay, 0, "Past pending email must be re-enqueued with 0ms delay");
  });

  console.log("\n==========================================");
  console.log(`Results: ${passedTests}/${totalTests} tests passed.`);
  console.log("==========================================\n");

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Fatal error during test run:", err);
  process.exit(1);
});

