import { RedisOptions as BullRedisOptions } from "bullmq";
import Redis, { RedisOptions as IORedisOptions } from "ioredis";
import { env } from "./env";

export const redisConnectionOptions: BullRedisOptions = {
  host: env.REDIS_HOST,
  port: env.REDIS_PORT,
  password: env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null, // Required by BullMQ
  enableReadyCheck: false,
  retryStrategy(times: number) {
    return Math.min(times * 200, 2000);
  },
};

export const redisClient = new Redis(redisConnectionOptions as IORedisOptions);

redisClient.on("connect", () => {
  console.log(`[REDIS] Connected successfully to ${env.REDIS_HOST}:${env.REDIS_PORT}`);
});

redisClient.on("error", (err) => {
  console.error("[REDIS] Connection error:", err.message);
});

