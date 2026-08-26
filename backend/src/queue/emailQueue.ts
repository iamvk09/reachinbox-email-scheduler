import { Queue } from "bullmq";
import { redisConnectionOptions } from "../config/redis";

export const EMAIL_QUEUE_NAME = "email-queue";

export interface EmailJobData {
  emailId: string;
}

export const emailQueue = new Queue<EmailJobData, any, string>(EMAIL_QUEUE_NAME, {
  connection: redisConnectionOptions,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 5000,
    },
    removeOnComplete: {
      age: 86400,
      count: 1000,
    },
    removeOnFail: {
      age: 86400 * 7,
    },
  },
});

