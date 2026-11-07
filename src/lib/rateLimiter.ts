/**
 * ClaimKavach — In-Memory IP Rate Limiter
 * Limits extraction calls to 10 requests per 10 minutes per IP.
 */

interface RateLimitRecord {
  count: number;
  resetTimeMs: number;
}

const ipRequestMap = new Map<string, RateLimitRecord>();

const WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const MAX_REQUESTS = 10;

/**
 * Checks if a given IP is within rate limits.
 */
export function checkRateLimit(ip: string): {
  allowed: boolean;
  remaining: number;
  resetTimeMs: number;
} {
  const now = Date.now();
  const record = ipRequestMap.get(ip);

  // Periodic cleanup of expired entries
  if (ipRequestMap.size > 1000) {
    for (const [key, value] of ipRequestMap.entries()) {
      if (value.resetTimeMs < now) {
        ipRequestMap.delete(key);
      }
    }
  }

  if (!record || record.resetTimeMs < now) {
    ipRequestMap.set(ip, {
      count: 1,
      resetTimeMs: now + WINDOW_MS,
    });
    return {
      allowed: true,
      remaining: MAX_REQUESTS - 1,
      resetTimeMs: now + WINDOW_MS,
    };
  }

  if (record.count >= MAX_REQUESTS) {
    return {
      allowed: false,
      remaining: 0,
      resetTimeMs: record.resetTimeMs,
    };
  }

  record.count += 1;
  return {
    allowed: true,
    remaining: MAX_REQUESTS - record.count,
    resetTimeMs: record.resetTimeMs,
  };
}
