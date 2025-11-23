import { describe, it, expect } from "vitest";
import {
  generateBaseSlug,
  generateUniqueSlugSuffix,
  generateUniqueSlug,
  ensureUniqueSlug,
} from "./slug-utils";

describe("slug-utils", () => {
  describe("generateBaseSlug", () => {
    it("should convert text to lowercase slug", () => {
      expect(generateBaseSlug("Hello World")).toBe("hello-world");
    });

    it("should remove special characters", () => {
      expect(generateBaseSlug("Hello @#$ World!")).toBe("hello-world");
    });

    it("should replace spaces with hyphens", () => {
      expect(generateBaseSlug("multiple   spaces   here")).toBe(
        "multiple-spaces-here",
      );
    });

    it("should remove leading/trailing hyphens", () => {
      expect(generateBaseSlug("  -hello-world-  ")).toBe("hello-world");
    });

    it("should replace multiple hyphens with single hyphen", () => {
      expect(generateBaseSlug("hello---world")).toBe("hello-world");
    });

    it("should truncate long text to 200 chars", () => {
      const longText = "a".repeat(300);
      const slug = generateBaseSlug(longText);
      expect(slug.length).toBe(200);
    });

    it("should handle empty string", () => {
      expect(generateBaseSlug("")).toBe("");
    });

    it("should handle only special characters", () => {
      expect(generateBaseSlug("@#$%^&*()")).toBe("");
    });
  });

  describe("generateUniqueSlugSuffix", () => {
    it("should generate a suffix with timestamp and random chars", () => {
      const suffix = generateUniqueSlugSuffix();
      expect(suffix).toMatch(/^[a-z0-9]+-[a-z0-9]{4}$/);
    });

    it("should generate unique suffixes on consecutive calls", () => {
      const suffix1 = generateUniqueSlugSuffix();
      const suffix2 = generateUniqueSlugSuffix();
      expect(suffix1).not.toBe(suffix2);
    });
  });

  describe("generateUniqueSlug", () => {
    it("should generate slug from text", () => {
      expect(generateUniqueSlug("My Form")).toBe("my-form");
    });

    it("should use fallback for empty text", () => {
      const slug = generateUniqueSlug("");
      expect(slug).toMatch(/^form-[a-z0-9]+-[a-z0-9]{4}$/);
    });

    it("should use fallback for special characters only", () => {
      const slug = generateUniqueSlug("@#$%^&");
      expect(slug).toMatch(/^form-[a-z0-9]+-[a-z0-9]{4}$/);
    });
  });

  describe("ensureUniqueSlug", () => {
    it("should return base slug if not taken", async () => {
      const checkExists = async (_slug: string) => false;
      const result = await ensureUniqueSlug("my-form", checkExists);
      expect(result).toBe("my-form");
    });

    it("should try incremental numbers if base is taken", async () => {
      const taken = new Set(["my-form", "my-form-1"]);
      const checkExists = async (testSlug: string) => taken.has(testSlug);

      const result = await ensureUniqueSlug("my-form", checkExists);
      expect(result).toBe("my-form-2");
    });

    it("should use timestamp suffix after 5 attempts", async () => {
      // Simulate all incremental slugs being taken
      const checkExists = async (testSlug: string) => {
        const regex = /^my-form(-[0-9])?$/;
        return regex.exec(testSlug) !== null;
      };

      const result = await ensureUniqueSlug("my-form", checkExists);
      expect(result).toMatch(/^my-form-[a-z0-9]+-[a-z0-9]{4}$/);
    });

    it("should handle async database checks correctly", async () => {
      let checkCount = 0;
      const checkExists = async (_slug: string) => {
        checkCount++;
        // Simulate first 3 checks returning true (taken)
        return checkCount <= 3;
      };

      const result = await ensureUniqueSlug("test", checkExists);
      expect(result).toBe("test-3");
      expect(checkCount).toBe(4); // Initial + 3 attempts
    });
  });
});
