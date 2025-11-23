import { describe, it, expect, beforeEach, vi } from "vitest";
import { isRateLimited, getRateLimitStatus } from "./rate-limit";

describe("rate-limit", () => {
  beforeEach(() => {
    // Clear rate limit store before each test
    vi.clearAllMocks();
  });

  describe("isRateLimited", () => {
    it("should not rate limit first request", () => {
      expect(isRateLimited("user-first")).toBe(false);
    });

    it("should not rate limit within limit", () => {
      const config = { maxRequests: 5, windowMs: 60000 };
      const userId = "user-within-limit";

      for (let i = 0; i < 5; i++) {
        expect(isRateLimited(userId, config)).toBe(false);
      }
    });

    it("should rate limit after exceeding max requests", () => {
      const config = { maxRequests: 3, windowMs: 60000 };

      // First 3 should pass
      expect(isRateLimited("user2", config)).toBe(false);
      expect(isRateLimited("user2", config)).toBe(false);
      expect(isRateLimited("user2", config)).toBe(false);

      // 4th should be rate limited
      expect(isRateLimited("user2", config)).toBe(true);
      expect(isRateLimited("user2", config)).toBe(true);
    });

    it("should use default config if not provided", () => {
      // Default is 10 requests per hour
      for (let i = 0; i < 10; i++) {
        expect(isRateLimited("user3")).toBe(false);
      }

      // 11th should be rate limited
      expect(isRateLimited("user3")).toBe(true);
    });

    it("should track different users separately", () => {
      const config = { maxRequests: 2, windowMs: 60000 };

      expect(isRateLimited("user4", config)).toBe(false);
      expect(isRateLimited("user5", config)).toBe(false);
      expect(isRateLimited("user4", config)).toBe(false);
      expect(isRateLimited("user5", config)).toBe(false);

      // Both should be rate limited now
      expect(isRateLimited("user4", config)).toBe(true);
      expect(isRateLimited("user5", config)).toBe(true);
    });
  });

  describe("getRateLimitStatus", () => {
    it("should return max remaining for new user", () => {
      const status = getRateLimitStatus("newuser", 10);
      expect(status.remaining).toBe(10);
      expect(status.resetAt).toBe(null);
    });

    it("should track remaining requests", () => {
      const config = { maxRequests: 5, windowMs: 60000 };

      isRateLimited("user6", config);
      let status = getRateLimitStatus("user6", 5);
      expect(status.remaining).toBe(4);

      isRateLimited("user6", config);
      status = getRateLimitStatus("user6", 5);
      expect(status.remaining).toBe(3);
    });

    it("should never show negative remaining", () => {
      const config = { maxRequests: 2, windowMs: 60000 };

      isRateLimited("user7", config);
      isRateLimited("user7", config);
      isRateLimited("user7", config); // Exceeds limit

      const status = getRateLimitStatus("user7", 2);
      expect(status.remaining).toBe(0);
    });

    it("should return resetAt timestamp", () => {
      const config = { maxRequests: 5, windowMs: 60000 };

      isRateLimited("user8", config);
      const status = getRateLimitStatus("user8", 5);

      expect(status.resetAt).toBeGreaterThan(Date.now());
      expect(status.resetAt).toBeLessThanOrEqual(Date.now() + 60000);
    });
  });
});
