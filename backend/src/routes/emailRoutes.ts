import { Router } from "express";
import {
  handleScheduleEmails,
  handleGetScheduledEmails,
  handleGetSentEmails,
} from "../controllers/emailController";

const router = Router();

// Schedule one or more emails
router.post("/schedule", handleScheduleEmails);

// Retrieve all pending/scheduled emails
router.get("/scheduled", handleGetScheduledEmails);

// Retrieve all delivered / failed emails
router.get("/sent", handleGetSentEmails);

export default router;

