import nodemailer, { Transporter } from "nodemailer";
import { env } from "../config/env";

let transporter: Transporter | null = null;
let etherealUser: string | null = null;

export async function initMailer(): Promise<Transporter> {
  if (transporter) {
    return transporter;
  }

  if (env.ETHEREAL_USER && env.ETHEREAL_PASS) {
    etherealUser = env.ETHEREAL_USER;
    transporter = nodemailer.createTransport({
      host: "smtp.ethereal.email",
      port: 587,
      secure: false,
      auth: {
        user: env.ETHEREAL_USER,
        pass: env.ETHEREAL_PASS,
      },
    });
    console.log(`[MAILER] Using configured Ethereal account: ${etherealUser}`);
  } else {
    console.log("[MAILER] Generating temporary Ethereal test account...");
    const testAccount = await nodemailer.createTestAccount();
    etherealUser = testAccount.user;
    transporter = nodemailer.createTransport({
      host: "smtp.ethereal.email",
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
    console.log(`[MAILER] Generated Ethereal test account: ${testAccount.user}`);
  }

  return transporter;
}

export interface SendEmailParams {
  to: string;
  from: string;
  subject: string;
  body: string;
}

export interface SendEmailResult {
  messageId: string;
  previewUrl: string | null;
}

export async function sendEmail({
  to,
  from,
  subject,
  body,
}: SendEmailParams): Promise<SendEmailResult> {
  const mailer = await initMailer();

  const info = await mailer.sendMail({
    from,
    to,
    subject,
    text: body,
    html: body.includes("<") ? body : `<p>${body.replace(/\n/g, "<br/>")}</p>`,
  });

  const previewUrl = nodemailer.getTestMessageUrl(info) || null;

  console.log(`[MAILER] ========================================`);
  console.log(`[MAILER] Email successfully sent!`);
  console.log(`[MAILER] From: ${from}`);
  console.log(`[MAILER] To: ${to}`);
  console.log(`[MAILER] Subject: ${subject}`);
  console.log(`[MAILER] Message ID: ${info.messageId}`);
  if (previewUrl) {
    console.log(`[MAILER] Preview URL: ${previewUrl}`);
  }
  console.log(`[MAILER] ========================================`);

  return {
    messageId: info.messageId,
    previewUrl,
  };
}

