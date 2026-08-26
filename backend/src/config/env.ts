import dotenv from "dotenv";

dotenv.config();

export const env = {
  NODE_ENV: process.env.NODE_ENV || "development",
  PORT: parseInt(process.env.PORT || "4000", 10),
  DATABASE_URL:
    process.env.DATABASE_URL ||
    "postgresql://scheduler:scheduler@localhost:5432/scheduler?schema=public",
  REDIS_HOST: process.env.REDIS_HOST || "localhost",
  REDIS_PORT: parseInt(process.env.REDIS_PORT || "6379", 10),
  REDIS_PASSWORD: process.env.REDIS_PASSWORD || undefined,
  WORKER_CONCURRENCY: parseInt(process.env.WORKER_CONCURRENCY || "5", 10),
  MIN_SEND_DELAY_MS: parseInt(process.env.MIN_SEND_DELAY_MS || "1000", 10),
  MAX_EMAILS_PER_HOUR_PER_SENDER: parseInt(
    process.env.MAX_EMAILS_PER_HOUR_PER_SENDER || "10",
    10
  ),
  ETHEREAL_USER: process.env.ETHEREAL_USER || undefined,
  ETHEREAL_PASS: process.env.ETHEREAL_PASS || undefined,
};

