/**
 * Simple in-memory rate limiter for public form submissions
 * Prevents spam without being too aggressive
 */

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const rateLimitStore = new Map<string, RateLimitEntry>();

// Clean up old entries every 10 minutes
setInterval(
  () => {
    const now = Date.now();
    for (const [key, entry] of rateLimitStore.entries()) {
      if (now > entry.resetAt) {
        rateLimitStore.delete(key);
      }
    }
  },
  10 * 60 * 1000,
);

export type RateLimitConfig = {
  maxRequests: number;
  windowMs: number;
};

/**
 * Check if a request should be rate limited
 * @param identifier - Unique identifier (e.g., IP address, user ID)
 * @param config - Rate limit configuration
 * @returns true if rate limit exceeded, false otherwise
 */
export function isRateLimited(
  identifier: string,
  config: RateLimitConfig = {
    maxRequests: 10, // 10 submissions
    windowMs: 60 * 60 * 1000, // per hour (not aggressive)
  },
): boolean {
  const now = Date.now();
  const entry = rateLimitStore.get(identifier);

  if (!entry || now > entry.resetAt) {
    // New entry or expired
    rateLimitStore.set(identifier, {
      count: 1,
      resetAt: now + config.windowMs,
    });
    return false;
  }

  if (entry.count >= config.maxRequests) {
    return true; // Rate limit exceeded
  }

  // Increment count
  entry.count++;
  return false;
}

/**
 * Get remaining requests for an identifier
 */
export function getRateLimitStatus(
  identifier: string,
  maxRequests = 10,
): {
  remaining: number;
  resetAt: number | null;
} {
  const entry = rateLimitStore.get(identifier);
  if (!entry) {
    return { remaining: maxRequests, resetAt: null };
  }

  return {
    remaining: Math.max(0, maxRequests - entry.count),
    resetAt: entry.resetAt,
  };
}
