import nodemailer from "nodemailer";

async function main() {
  console.log("Generating fresh Ethereal Email test account...");
  const account = await nodemailer.createTestAccount();
  console.log("-----------------------------------------");
  console.log("NEW_ETHEREAL_USER=" + account.user);
  console.log("NEW_ETHEREAL_PASS=" + account.pass);
  console.log("-----------------------------------------");

  const transporter = nodemailer.createTransport({
    host: "smtp.ethereal.email",
    port: 587,
    secure: false,
    auth: {
      user: account.user,
      pass: account.pass,
    },
  });

  const info = await transporter.sendMail({
    from: "scheduler@reachinbox.test",
    to: "demo@example.com",
    subject: "Fresh Ethereal Account Test",
    text: "This is a direct test of the fresh Ethereal account.",
    html: "<p>This is a direct test of the fresh Ethereal account.</p>",
  });

  const directUrl = nodemailer.getTestMessageUrl(info);
  console.log("DIRECT_MESSAGE_URL=" + directUrl);
  process.exit(0);
}

main().catch((err) => {
  console.error("Error generating ethereal account:", err);
  process.exit(1);
});
