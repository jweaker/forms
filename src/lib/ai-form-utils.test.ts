import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  serializeFormForAI,
  deserializeFormFromAI,
  validateAIFormStructure,
  type AIFormStructure,
} from "./ai-form-utils";

describe("ai-form-utils", () => {
  // Mock console methods to avoid noise in tests
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(vi.fn());
    vi.spyOn(console, "warn").mockImplementation(vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("serializeFormForAI", () => {
    it("should serialize basic form structure", () => {
      const form = {
        id: 1,
        name: "Test Form",
        slug: "test-form",
        description: "A test form",
        status: "draft",
        isPublic: true,
        allowAnonymous: false,
        allowMultipleSubmissions: true,
        fields: [],
      };

      const result = serializeFormForAI(form);

      expect(result.name).toBe("Test Form");
      expect(result.slug).toBe("test-form");
      expect(result.description).toBe("A test form");
      expect(result.status).toBe("draft");
      expect(result.isPublic).toBe(true);
      expect(result.allowAnonymous).toBe(false);
      expect(result.allowMultipleSubmissions).toBe(true);
      expect(result.fields).toEqual([]);
    });

    it("should serialize fields and sort by order", () => {
      const form = {
        id: 1,
        name: "Test",
        slug: "test",
        description: null,
        status: "draft",
        isPublic: true,
        allowAnonymous: true,
        allowMultipleSubmissions: true,
        fields: [
          {
            id: 2,
            createdAt: new Date(),
            updatedAt: null,
            formId: 1,
            label: "Last Field",
            type: "text",
            required: false,
            placeholder: null,
            helpText: null,
            regexPattern: null,
            validationMessage: null,
            order: 2,
            allowMultiple: null,
            selectionLimit: null,
            minValue: null,
            maxValue: null,
            defaultValue: null,
            options: null,
          },
          {
            id: 1,
            createdAt: new Date(),
            updatedAt: null,
            formId: 1,
            label: "First Field",
            type: "email",
            required: true,
            placeholder: "Enter email",
            helpText: "Your email address",
            regexPattern: null,
            validationMessage: null,
            order: 0,
            allowMultiple: null,
            selectionLimit: null,
            minValue: null,
            maxValue: null,
            defaultValue: null,
            options: null,
          },
        ],
      };

      const result = serializeFormForAI(form);

      expect(result.fields).toHaveLength(2);
      expect(result.fields[0]?.label).toBe("First Field");
      expect(result.fields[1]?.label).toBe("Last Field");
    });

    it("should parse options JSON string into objects", () => {
      const form = {
        id: 1,
        name: "Test",
        slug: "test",
        description: null,
        status: "draft",
        isPublic: true,
        allowAnonymous: true,
        allowMultipleSubmissions: true,
        fields: [
          {
            id: 1,
            createdAt: new Date(),
            updatedAt: null,
            formId: 1,
            label: "Choose",
            type: "select",
            required: false,
            placeholder: null,
            helpText: null,
            regexPattern: null,
            validationMessage: null,
            order: 0,
            allowMultiple: null,
            selectionLimit: null,
            minValue: null,
            maxValue: null,
            defaultValue: null,
            options:
              '[{"label":"Option A","isDefault":false},{"label":"Option B","isDefault":true}]',
          },
        ],
      };

      const result = serializeFormForAI(form);

      expect(result.fields[0]?.options).toEqual([
        { label: "Option A", isDefault: false },
        { label: "Option B", isDefault: true },
      ]);
    });

    it("should handle invalid options JSON gracefully", () => {
      const form = {
        id: 1,
        name: "Test",
        slug: "test",
        description: null,
        status: "draft",
        isPublic: true,
        allowAnonymous: true,
        allowMultipleSubmissions: true,
        fields: [
          {
            id: 1,
            createdAt: new Date(),
            updatedAt: null,
            formId: 1,
            label: "Bad Options",
            type: "select",
            required: false,
            placeholder: null,
            helpText: null,
            regexPattern: null,
            validationMessage: null,
            order: 0,
            allowMultiple: null,
            selectionLimit: null,
            minValue: null,
            maxValue: null,
            defaultValue: null,
            options: "invalid json {",
          },
        ],
      };

      const result = serializeFormForAI(form);

      expect(result.fields[0]?.options).toBe(null);
    });

    it("should remove internal fields like id and timestamps", () => {
      const form = {
        id: 999,
        name: "Test",
        slug: "test",
        description: null,
        status: "draft",
        isPublic: true,
        allowAnonymous: true,
        allowMultipleSubmissions: true,
        fields: [
          {
            id: 123,
            createdAt: new Date("2024-01-01"),
            updatedAt: new Date("2024-01-02"),
            formId: 999,
            label: "Field",
            type: "text",
            required: false,
            placeholder: null,
            helpText: null,
            regexPattern: null,
            validationMessage: null,
            order: 0,
            allowMultiple: null,
            selectionLimit: null,
            minValue: null,
            maxValue: null,
            defaultValue: null,
            options: null,
          },
        ],
      };

      const result = serializeFormForAI(form);
      const field = result.fields[0];

      expect(field).not.toHaveProperty("id");
      expect(field).not.toHaveProperty("createdAt");
      expect(field).not.toHaveProperty("updatedAt");
      expect(field).not.toHaveProperty("formId");
    });
  });

  describe("validateAIFormStructure", () => {
    it("should validate valid AI form structure", () => {
      const validForm = {
        form: {
          name: "Test Form",
          slug: "test-form",
          description: "Test",
          status: "draft",
          isPublic: true,
          allowAnonymous: false,
          allowMultipleSubmissions: true,
          fields: [
            {
              label: "Name",
              type: "text",
              required: true,
              order: 0,
              placeholder: null,
              helpText: null,
              regexPattern: null,
              validationMessage: null,
              options: null,
              allowMultiple: null,
              selectionLimit: null,
              minValue: null,
              maxValue: null,
              defaultValue: null,
            },
          ],
        },
      };

      expect(validateAIFormStructure(validForm)).toBe(true);
    });

    it("should reject non-object input", () => {
      expect(validateAIFormStructure(null)).toBe(false);
      expect(validateAIFormStructure(undefined)).toBe(false);
      expect(validateAIFormStructure("string")).toBe(false);
      expect(validateAIFormStructure(123)).toBe(false);
    });

    it("should reject missing form object", () => {
      expect(validateAIFormStructure({})).toBe(false);
      expect(validateAIFormStructure({ form: null })).toBe(false);
    });

    it("should reject invalid form name", () => {
      const invalidForm = {
        form: {
          name: "",
          slug: "test",
          description: null,
          status: "draft",
          isPublic: true,
          allowAnonymous: true,
          allowMultipleSubmissions: true,
          fields: [{ label: "Test", type: "text", required: false, order: 0 }],
        },
      };

      expect(validateAIFormStructure(invalidForm)).toBe(false);
    });

    it("should reject form name exceeding 256 characters", () => {
      const invalidForm = {
        form: {
          name: "a".repeat(257),
          slug: "test",
          description: null,
          status: "draft",
          isPublic: true,
          allowAnonymous: true,
          allowMultipleSubmissions: true,
          fields: [{ label: "Test", type: "text", required: false, order: 0 }],
        },
      };

      expect(validateAIFormStructure(invalidForm)).toBe(false);
    });

    it("should reject invalid slug format", () => {
      const invalidForm = {
        form: {
          name: "Test",
          slug: "Test With Spaces",
          description: null,
          status: "draft",
          isPublic: true,
          allowAnonymous: true,
          allowMultipleSubmissions: true,
          fields: [{ label: "Test", type: "text", required: false, order: 0 }],
        },
      };

      expect(validateAIFormStructure(invalidForm)).toBe(false);
    });

    it("should accept valid slug with hyphens and numbers", () => {
      const validForm = {
        form: {
          name: "Test",
          slug: "test-form-123",
          description: null,
          status: "draft",
          isPublic: true,
          allowAnonymous: true,
          allowMultipleSubmissions: true,
          fields: [{ label: "Test", type: "text", required: false, order: 0 }],
        },
      };

      expect(validateAIFormStructure(validForm)).toBe(true);
    });

    it("should reject invalid status", () => {
      const invalidForm = {
        form: {
          name: "Test",
          slug: "test",
          description: null,
          status: "invalid",
          isPublic: true,
          allowAnonymous: true,
          allowMultipleSubmissions: true,
          fields: [{ label: "Test", type: "text", required: false, order: 0 }],
        },
      };

      expect(validateAIFormStructure(invalidForm)).toBe(false);
    });

    it("should accept all valid status values", () => {
      const statuses = ["draft", "published", "archived"];

      statuses.forEach((status) => {
        const validForm = {
          form: {
            name: "Test",
            slug: "test",
            description: null,
            status,
            isPublic: true,
            allowAnonymous: true,
            allowMultipleSubmissions: true,
            fields: [
              { label: "Test", type: "text", required: false, order: 0 },
            ],
          },
        };

        expect(validateAIFormStructure(validForm)).toBe(true);
      });
    });

    it("should reject non-array fields", () => {
      const invalidForm = {
        form: {
          name: "Test",
          slug: "test",
          description: null,
          status: "draft",
          isPublic: true,
          allowAnonymous: true,
          allowMultipleSubmissions: true,
          fields: "not an array",
        },
      };

      expect(validateAIFormStructure(invalidForm)).toBe(false);
    });

    it("should allow empty fields array", () => {
      const validForm = {
        form: {
          name: "Test",
          slug: "test",
          description: null,
          status: "draft",
          isPublic: true,
          allowAnonymous: true,
          allowMultipleSubmissions: true,
          fields: [],
        },
      };

      expect(validateAIFormStructure(validForm)).toBe(true);
    });

    it("should reject form with all invalid fields", () => {
      const invalidForm = {
        form: {
          name: "Test",
          slug: "test",
          description: null,
          status: "draft",
          isPublic: true,
          allowAnonymous: true,
          allowMultipleSubmissions: true,
          fields: [
            { label: "", type: "invalid", required: "wrong", order: "bad" },
          ],
        },
      };

      expect(validateAIFormStructure(invalidForm)).toBe(false);
    });
  });

  describe("deserializeFormFromAI", () => {
    it("should deserialize basic form structure", () => {
      const aiForm: AIFormStructure = {
        name: "Survey",
        slug: "survey-2024",
        description: "Annual survey",
        status: "published",
        isPublic: true,
        allowAnonymous: false,
        allowMultipleSubmissions: false,
        fields: [],
      };

      const result = deserializeFormFromAI(aiForm);

      expect(result.form.name).toBe("Survey");
      expect(result.form.slug).toBe("survey-2024");
      expect(result.form.description).toBe("Annual survey");
      expect(result.form.status).toBe("published");
      expect(result.warnings).toEqual([]);
    });

    it("should filter out invalid fields and add warnings", () => {
      const aiForm: AIFormStructure = {
        name: "Test",
        slug: "test",
        description: null,
        status: "draft",
        isPublic: true,
        allowAnonymous: true,
        allowMultipleSubmissions: true,
        fields: [
          {
            label: "Valid",
            type: "text",
            required: true,
            order: 0,
            placeholder: null,
            helpText: null,
            regexPattern: null,
            validationMessage: null,
            options: null,
            allowMultiple: null,
            selectionLimit: null,
            minValue: null,
            maxValue: null,
            defaultValue: null,
          },
          {
            label: "",
            type: "text",
            required: true,
            order: 1,
            placeholder: null,
            helpText: null,
            regexPattern: null,
            validationMessage: null,
            options: null,
            allowMultiple: null,
            selectionLimit: null,
            minValue: null,
            maxValue: null,
            defaultValue: null,
          },
        ],
      };

      const result = deserializeFormFromAI(aiForm);

      expect(result.fields).toHaveLength(1);
      expect(result.fields[0]?.label).toBe("Valid");
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0]).toContain("Invalid or missing label");
    });

    it("should re-sequence field order after filtering", () => {
      const aiForm: AIFormStructure = {
        name: "Test",
        slug: "test",
        description: null,
        status: "draft",
        isPublic: true,
        allowAnonymous: true,
        allowMultipleSubmissions: true,
        fields: [
          {
            label: "Field A",
            type: "text",
            required: false,
            order: 0,
            placeholder: null,
            helpText: null,
            regexPattern: null,
            validationMessage: null,
            options: null,
            allowMultiple: null,
            selectionLimit: null,
            minValue: null,
            maxValue: null,
            defaultValue: null,
          },
          {
            label: "Invalid Field",
            type: "invalid-type",
            required: false,
            order: 1,
            placeholder: null,
            helpText: null,
            regexPattern: null,
            validationMessage: null,
            options: null,
            allowMultiple: null,
            selectionLimit: null,
            minValue: null,
            maxValue: null,
            defaultValue: null,
          },
          {
            label: "Field B",
            type: "text",
            required: false,
            order: 2,
            placeholder: null,
            helpText: null,
            regexPattern: null,
            validationMessage: null,
            options: null,
            allowMultiple: null,
            selectionLimit: null,
            minValue: null,
            maxValue: null,
            defaultValue: null,
          },
        ],
      };

      const result = deserializeFormFromAI(aiForm);

      expect(result.fields).toHaveLength(2);
      expect(result.fields[0]?.order).toBe(0);
      expect(result.fields[1]?.order).toBe(1);
    });

    it("should validate select field requires options", () => {
      const aiForm: AIFormStructure = {
        name: "Test",
        slug: "test",
        description: null,
        status: "draft",
        isPublic: true,
        allowAnonymous: true,
        allowMultipleSubmissions: true,
        fields: [
          {
            label: "Choose",
            type: "select",
            required: false,
            order: 0,
            placeholder: null,
            helpText: null,
            regexPattern: null,
            validationMessage: null,
            options: null,
            allowMultiple: null,
            selectionLimit: null,
            minValue: null,
            maxValue: null,
            defaultValue: null,
          },
        ],
      };

      const result = deserializeFormFromAI(aiForm);

      expect(result.fields).toHaveLength(0);
      expect(result.warnings[0]).toContain("requires non-empty options array");
    });

    it("should validate min/max constraints for number fields", () => {
      const aiForm: AIFormStructure = {
        name: "Test",
        slug: "test",
        description: null,
        status: "draft",
        isPublic: true,
        allowAnonymous: true,
        allowMultipleSubmissions: true,
        fields: [
          {
            label: "Age",
            type: "number",
            required: false,
            order: 0,
            placeholder: null,
            helpText: null,
            regexPattern: null,
            validationMessage: null,
            options: null,
            allowMultiple: null,
            selectionLimit: null,
            minValue: 100,
            maxValue: 10,
            defaultValue: null,
          },
        ],
      };

      const result = deserializeFormFromAI(aiForm);

      expect(result.fields).toHaveLength(0);
      expect(result.warnings[0]).toContain(
        "minValue must be less than maxValue",
      );
    });

    it("should validate regex patterns", () => {
      const aiForm: AIFormStructure = {
        name: "Test",
        slug: "test",
        description: null,
        status: "draft",
        isPublic: true,
        allowAnonymous: true,
        allowMultipleSubmissions: true,
        fields: [
          {
            label: "Code",
            type: "text",
            required: false,
            order: 0,
            placeholder: null,
            helpText: null,
            regexPattern: "[invalid(regex",
            validationMessage: null,
            options: null,
            allowMultiple: null,
            selectionLimit: null,
            minValue: null,
            maxValue: null,
            defaultValue: null,
          },
        ],
      };

      const result = deserializeFormFromAI(aiForm);

      expect(result.fields).toHaveLength(0);
      expect(result.warnings[0]).toContain("Invalid regex pattern");
    });
  });
});
