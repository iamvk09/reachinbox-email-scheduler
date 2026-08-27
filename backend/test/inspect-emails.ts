import { prisma } from "../src/db/prisma";

async function inspect() {
  const emails = await prisma.email.findMany({
    orderBy: { created_at: "desc" },
    take: 10,
  });

  console.log(`\n======================================================`);
  console.log(`  DATABASE AUDIT: LATEST ${emails.length} EMAIL RECORDS`);
  console.log(`======================================================\n`);

  for (const email of emails) {
    console.log(`📨 [EMAIL RECORD ${email.id.slice(0, 8)}]`);
    console.log(`   From:         ${email.sender}`);
    console.log(`   To:           ${email.recipient}`);
    console.log(`   Subject:      ${email.subject}`);
    console.log(`   Body:         ${email.body}`);
    console.log(`   Status:       ${email.status.toUpperCase()}`);
    console.log(`   Scheduled:    ${email.scheduled_time.toISOString()}`);
    console.log(`   Sent At:      ${email.sent_at ? email.sent_at.toISOString() : "Not sent yet"}`);
    console.log(`   Preview Link: ${email.preview_url || "None"}`);
    if (email.error_message) {
      console.log(`   Error:        ${email.error_message}`);
    }
    console.log(`------------------------------------------------------\n`);
  }

  process.exit(0);
}

inspect().catch((err) => {
  console.error("Error inspecting database:", err);
  process.exit(1);
});

