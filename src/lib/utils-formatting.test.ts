import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { formatDate, formatRelativeTime, truncate } from "./utils";

describe("utils - formatting", () => {
  describe("formatDate", () => {
    it("should format date correctly", () => {
      const date = new Date("2024-01-15T10:30:00Z");
      const result = formatDate(date);

      expect(result).toContain("Jan");
      expect(result).toContain("15");
      expect(result).toContain("2024");
    });

    it("should return N/A for null date", () => {
      expect(formatDate(null)).toBe("N/A");
    });

    it("should return N/A for undefined date", () => {
      expect(formatDate(undefined)).toBe("N/A");
    });

    it("should handle different dates consistently", () => {
      const date1 = new Date("2024-12-25T00:00:00Z");
      const date2 = new Date("2023-06-01T12:00:00Z");

      const result1 = formatDate(date1);
      const result2 = formatDate(date2);

      expect(result1).toBeTruthy();
      expect(result2).toBeTruthy();
      expect(result1).not.toBe(result2);
    });
  });

  describe("formatRelativeTime", () => {
    beforeEach(() => {
      // Mock Date.now() to have consistent test results
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2024-01-15T12:00:00Z"));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("should return 'just now' for very recent dates", () => {
      const date = new Date("2024-01-15T11:59:50Z"); // 10 seconds ago
      expect(formatRelativeTime(date)).toBe("just now");
    });

    it("should return 'just now' for dates less than 60 seconds ago", () => {
      const date = new Date("2024-01-15T11:59:30Z"); // 30 seconds ago
      expect(formatRelativeTime(date)).toBe("just now");
    });

    it("should return minutes for recent dates", () => {
      const date = new Date("2024-01-15T11:55:00Z"); // 5 minutes ago
      expect(formatRelativeTime(date)).toBe("5m ago");
    });

    it("should return minutes for dates less than 60 minutes ago", () => {
      const date = new Date("2024-01-15T11:15:00Z"); // 45 minutes ago
      expect(formatRelativeTime(date)).toBe("45m ago");
    });

    it("should return hours for dates less than 24 hours ago", () => {
      const date = new Date("2024-01-15T08:00:00Z"); // 4 hours ago
      expect(formatRelativeTime(date)).toBe("4h ago");
    });

    it("should return days for dates less than 7 days ago", () => {
      const date = new Date("2024-01-12T12:00:00Z"); // 3 days ago
      expect(formatRelativeTime(date)).toBe("3d ago");
    });

    it("should return formatted date for dates 7+ days ago", () => {
      const date = new Date("2024-01-01T12:00:00Z"); // 14 days ago
      const result = formatRelativeTime(date);

      expect(result).not.toBe("just now");
      expect(result).not.toContain("ago");
      expect(result).toContain("Jan");
    });

    it("should return N/A for null date", () => {
      expect(formatRelativeTime(null)).toBe("N/A");
    });

    it("should return N/A for undefined date", () => {
      expect(formatRelativeTime(undefined)).toBe("N/A");
    });

    it("should handle edge case of exactly 1 minute ago", () => {
      const date = new Date("2024-01-15T11:59:00Z"); // 1 minute ago
      expect(formatRelativeTime(date)).toBe("1m ago");
    });

    it("should handle edge case of exactly 1 hour ago", () => {
      const date = new Date("2024-01-15T11:00:00Z"); // 1 hour ago
      expect(formatRelativeTime(date)).toBe("1h ago");
    });

    it("should handle edge case of exactly 1 day ago", () => {
      const date = new Date("2024-01-14T12:00:00Z"); // 1 day ago
      expect(formatRelativeTime(date)).toBe("1d ago");
    });
  });

  describe("truncate", () => {
    it("should not truncate string shorter than limit", () => {
      expect(truncate("hello", 10)).toBe("hello");
    });

    it("should not truncate string equal to limit", () => {
      expect(truncate("hello", 5)).toBe("hello");
    });

    it("should truncate string longer than limit", () => {
      expect(truncate("hello world", 5)).toBe("hello...");
    });

    it("should add ellipsis when truncating", () => {
      const result = truncate("This is a long string", 10);
      expect(result).toBe("This is a ...");
      expect(result.length).toBe(13); // 10 chars + "..."
    });

    it("should handle length of 0", () => {
      expect(truncate("hello", 0)).toBe("...");
    });

    it("should handle length of 1", () => {
      expect(truncate("hello", 1)).toBe("h...");
    });

    it("should handle empty string", () => {
      expect(truncate("", 10)).toBe("");
    });

    it("should preserve exact characters before ellipsis", () => {
      const text = "abcdefghij";
      const result = truncate(text, 5);
      expect(result).toBe("abcde...");
    });

    it("should handle very long strings", () => {
      const longText = "a".repeat(1000);
      const result = truncate(longText, 50);
      expect(result.length).toBe(53); // 50 + "..."
      expect(result.endsWith("...")).toBe(true);
    });

    it("should handle special characters", () => {
      const text = "Hello! @#$ World";
      const result = truncate(text, 10);
      expect(result).toBe("Hello! @#$...");
    });

    it("should handle Unicode characters", () => {
      const text = "Hello 👋 World 🌍";
      const result = truncate(text, 10);
      expect(result.length).toBeGreaterThan(10); // Unicode might affect length
      expect(result.endsWith("...")).toBe(true);
    });
  });
});
