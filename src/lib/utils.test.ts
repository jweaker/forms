import { describe, it, expect } from "vitest";
import { sanitizeHtml, sanitizeInput } from "./utils";

describe("utils - sanitization", () => {
  describe("sanitizeHtml", () => {
    it("should escape HTML special characters", () => {
      const input = '<script>alert("XSS")</script>';
      const expected =
        "&lt;script&gt;alert(&quot;XSS&quot;)&lt;&#x2F;script&gt;";
      expect(sanitizeHtml(input)).toBe(expected);
    });

    it("should escape ampersands", () => {
      expect(sanitizeHtml("Tom & Jerry")).toBe("Tom &amp; Jerry");
    });

    it("should escape less than and greater than", () => {
      expect(sanitizeHtml("5 < 10 > 3")).toBe("5 &lt; 10 &gt; 3");
    });

    it("should escape quotes", () => {
      expect(sanitizeHtml('He said "hello"')).toBe("He said &quot;hello&quot;");
      expect(sanitizeHtml("It's fine")).toBe("It&#x27;s fine");
    });

    it("should escape forward slashes", () => {
      expect(sanitizeHtml("path/to/file")).toBe("path&#x2F;to&#x2F;file");
    });

    it("should handle empty string", () => {
      expect(sanitizeHtml("")).toBe("");
    });

    it("should handle multiple special characters", () => {
      const input = "<div id=\"test\" class='box'>A & B</div>";
      const expected =
        "&lt;div id=&quot;test&quot; class=&#x27;box&#x27;&gt;A &amp; B&lt;&#x2F;div&gt;";
      expect(sanitizeHtml(input)).toBe(expected);
    });

    it("should prevent XSS injection attempts", () => {
      const xssAttempts = [
        "<script>alert(1)</script>",
        "<img src=x onerror=alert(1)>",
        "<svg onload=alert(1)>",
        '<iframe src="javascript:alert(1)">',
      ];

      xssAttempts.forEach((attempt) => {
        const result = sanitizeHtml(attempt);
        // Ensure no raw HTML tags remain (< and > are escaped)
        expect(result).not.toContain("<script");
        expect(result).not.toContain("<img");
        expect(result).not.toContain("<svg");
        expect(result).not.toContain("<iframe");
        // Verify < and > are escaped
        expect(result).toContain("&lt;");
        expect(result).toContain("&gt;");
      });
    });
  });

  describe("sanitizeInput", () => {
    it("should trim whitespace", () => {
      expect(sanitizeInput("  hello world  ")).toBe("hello world");
    });

    it("should return null for null input", () => {
      expect(sanitizeInput(null)).toBe(null);
    });

    it("should return null for undefined input", () => {
      expect(sanitizeInput(undefined)).toBe(null);
    });

    it("should return null for empty string after trim", () => {
      expect(sanitizeInput("   ")).toBe(null);
    });

    it("should truncate to maxLength", () => {
      const input = "a".repeat(100);
      const result = sanitizeInput(input, 50);
      expect(result?.length).toBe(50);
    });

    it("should not truncate if within maxLength", () => {
      const input = "hello world";
      const result = sanitizeInput(input, 50);
      expect(result).toBe("hello world");
    });

    it("should handle maxLength of 0", () => {
      const input = "hello";
      const result = sanitizeInput(input, 0);
      expect(result).toBe(null); // Empty string after truncation returns null
    });

    it("should work without maxLength", () => {
      const input = "  test input  ";
      expect(sanitizeInput(input)).toBe("test input");
    });

    it("should preserve internal whitespace", () => {
      expect(sanitizeInput("hello   world")).toBe("hello   world");
    });

    it("should handle special characters without modification", () => {
      const input = "hello@example.com";
      expect(sanitizeInput(input)).toBe("hello@example.com");
    });
  });
});
