import { Request, Response } from "express";
import { prisma } from "../db/prisma";
import { scheduleEmails, ScheduleEmailInput } from "../services/scheduler";

export async function handleScheduleEmails(req: Request, res: Response): Promise<void> {
  try {
    let items: ScheduleEmailInput[] = [];

    // Support both direct array `[{...}]` and object payload `{ emails: [{...}] }`
    if (Array.isArray(req.body)) {
      items = req.body;
    } else if (req.body && Array.isArray(req.body.emails)) {
      items = req.body.emails;
    } else if (req.body && req.body.recipient) {
      items = [req.body];
    } else {
      res.status(400).json({
        success: false,
        error:
          "Invalid request payload. Expected an array of email objects or an object with an 'emails' array.",
      });
      return;
    }

    if (items.length === 0) {
      res.status(400).json({
        success: false,
        error: "Array of emails cannot be empty.",
      });
      return;
    }

    const scheduled = await scheduleEmails(items);

    res.status(201).json({
      success: true,
      count: scheduled.length,
      data: scheduled.map((s) => ({
        ...s.email,
        delayMs: s.delayMs,
        jobId: s.jobId,
      })),
    });
  } catch (error: any) {
    console.error("[CONTROLLER] Failed to schedule emails:", error.message);
    res.status(400).json({
      success: false,
      error: error.message || "Failed to schedule emails.",
    });
  }
}

export async function handleGetScheduledEmails(req: Request, res: Response): Promise<void> {
  try {
    const scheduledEmails = await prisma.email.findMany({
      where: {
        status: {
          in: ["pending", "sending"],
        },
      },
      orderBy: {
        scheduled_time: "asc",
      },
    });

    res.status(200).json({
      success: true,
      count: scheduledEmails.length,
      data: scheduledEmails,
    });
  } catch (error: any) {
    console.error("[CONTROLLER] Failed to get scheduled emails:", error.message);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to retrieve scheduled emails.",
    });
  }
}

export async function handleGetSentEmails(req: Request, res: Response): Promise<void> {
  try {
    const sentEmails = await prisma.email.findMany({
      where: {
        status: {
          in: ["sent", "failed"],
        },
      },
      orderBy: [
        { sent_at: "desc" },
        { created_at: "desc" },
      ],
    });

    res.status(200).json({
      success: true,
      count: sentEmails.length,
      data: sentEmails,
    });
  } catch (error: any) {
    console.error("[CONTROLLER] Failed to get sent emails:", error.message);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to retrieve sent emails.",
    });
  }
}
