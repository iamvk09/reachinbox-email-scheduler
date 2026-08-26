import { redisClient } from "../config/redis";
import { env } from "../config/env";

export interface RateLimitCheckResult {
  allowed: boolean;
  currentCount: number;
  limit: number;
  nextAvailableDate?: Date;
  delayMs?: number;
}

/**
 * Checks and increments the sender's hourly email counter in Redis.
 *
 * Uses atomic Redis INCR against a time-bucketed key:
 *   ratelimit:{sender}:{hour_window_timestamp}
 *
 * If the limit is exceeded:
 *   - The counter is decremented back so it accurately reflects only granted email sends.
 *   - Returns allowed: false with the calculated delay to the start of the next hour.
 *
 * This guarantees multi-worker concurrency safety across distributed instances.
 */
export async function checkAndIncrementSenderRateLimit(
  sender: string,
  requestedLimit?: number | null
): Promise<RateLimitCheckResult> {
  const limit = Math.min(
    requestedLimit ?? env.MAX_EMAILS_PER_HOUR_PER_SENDER,
    env.MAX_EMAILS_PER_HOUR_PER_SENDER
  );
  const now = Date.now();
  const oneHourMs = 60 * 60 * 1000;
  const currentHourStartMs = Math.floor(now / oneHourMs) * oneHourMs;
  const redisKey = `ratelimit:${sender.toLowerCase()}:${currentHourStartMs}`;

  const currentCount = await redisClient.incr(redisKey);

  // Set TTL of 2 hours (7200s) on key creation so old windows are cleanly garbage-collected
  if (currentCount === 1) {
    await redisClient.expire(redisKey, 7200);
  }

  if (currentCount > limit) {
    // Decrement back since we are deferring this email send
    await redisClient.decr(redisKey);

    const nextHourStartMs = currentHourStartMs + oneHourMs;
    // Add small 500ms safety buffer to ensure we land just inside the new window
    const delayMs = Math.max(1000, nextHourStartMs - Date.now() + 500);
    const nextAvailableDate = new Date(nextHourStartMs);

    return {
      allowed: false,
      currentCount: limit,
      limit,
      nextAvailableDate,
      delayMs,
    };
  }

  return {
    allowed: true,
    currentCount,
    limit,
  };
}
