import { describe, it, expect } from "vitest";
import {
  isIncompatibleTypeChange,
  hasRegexInvalidation,
  detectVersionBreakingChanges,
  createFormSnapshot,
} from "./form-versioning";

describe("form-versioning", () => {
  describe("isIncompatibleTypeChange", () => {
    it("should return false for same type", () => {
      expect(isIncompatibleTypeChange("text", "text")).toBe(false);
      expect(isIncompatibleTypeChange("number", "number")).toBe(false);
    });

    it("should allow text to textarea conversion", () => {
      expect(isIncompatibleTypeChange("text", "textarea")).toBe(false);
      expect(isIncompatibleTypeChange("textarea", "text")).toBe(false);
    });

    it("should allow text to email conversion", () => {
      expect(isIncompatibleTypeChange("text", "email")).toBe(false);
      expect(isIncompatibleTypeChange("email", "text")).toBe(false);
    });

    it("should allow text to url conversion", () => {
      expect(isIncompatibleTypeChange("text", "url")).toBe(false);
      expect(isIncompatibleTypeChange("url", "text")).toBe(false);
    });

    it("should allow text to tel conversion", () => {
      expect(isIncompatibleTypeChange("text", "tel")).toBe(false);
      expect(isIncompatibleTypeChange("tel", "text")).toBe(false);
    });

    it("should allow number to range conversion", () => {
      expect(isIncompatibleTypeChange("number", "range")).toBe(false);
      expect(isIncompatibleTypeChange("range", "number")).toBe(false);
    });

    it("should detect incompatible text to number change", () => {
      expect(isIncompatibleTypeChange("text", "number")).toBe(true);
      expect(isIncompatibleTypeChange("number", "text")).toBe(true);
    });

    it("should detect incompatible text to checkbox change", () => {
      expect(isIncompatibleTypeChange("text", "checkbox")).toBe(true);
      expect(isIncompatibleTypeChange("checkbox", "text")).toBe(true);
    });

    it("should detect incompatible select to text change", () => {
      expect(isIncompatibleTypeChange("select", "text")).toBe(true);
      expect(isIncompatibleTypeChange("text", "select")).toBe(true);
    });

    it("should detect incompatible date to number change", () => {
      expect(isIncompatibleTypeChange("date", "number")).toBe(true);
      expect(isIncompatibleTypeChange("number", "date")).toBe(true);
    });
  });

  describe("hasRegexInvalidation", () => {
    it("should return false when both regex are null", () => {
      expect(hasRegexInvalidation(null, null)).toBe(false);
    });

    it("should return false when removing regex", () => {
      expect(hasRegexInvalidation("^[A-Z]+$", null)).toBe(false);
    });

    it("should return true when adding new regex", () => {
      expect(hasRegexInvalidation(null, "^[0-9]+$")).toBe(true);
    });

    it("should return true when changing regex pattern", () => {
      expect(hasRegexInvalidation("^[A-Z]+$", "^[a-z]+$")).toBe(true);
    });

    it("should return false when regex stays the same", () => {
      expect(hasRegexInvalidation("^[A-Z]+$", "^[A-Z]+$")).toBe(false);
    });
  });

  describe("detectVersionBreakingChanges", () => {
    it("should detect field deletion", () => {
      const existingFields = [
        {
          id: 1,
          type: "text",
          regexPattern: null,
          required: false,
          minValue: null,
          maxValue: null,
        },
        {
          id: 2,
          type: "text",
          regexPattern: null,
          required: false,
          minValue: null,
          maxValue: null,
        },
      ];
      const incomingFields = [{ id: 1, type: "text", required: false }];

      expect(detectVersionBreakingChanges(existingFields, incomingFields)).toBe(
        true,
      );
    });

    it("should not break version when adding new fields", () => {
      const existingFields = [
        {
          id: 1,
          type: "text",
          regexPattern: null,
          required: false,
          minValue: null,
          maxValue: null,
        },
      ];
      const incomingFields = [
        { id: 1, type: "text", required: false },
        { type: "email", required: false }, // New field without ID
      ];

      expect(detectVersionBreakingChanges(existingFields, incomingFields)).toBe(
        false,
      );
    });

    it("should detect incompatible type change", () => {
      const existingFields = [
        {
          id: 1,
          type: "text",
          regexPattern: null,
          required: false,
          minValue: null,
          maxValue: null,
        },
      ];
      const incomingFields = [{ id: 1, type: "number", required: false }];

      expect(detectVersionBreakingChanges(existingFields, incomingFields)).toBe(
        true,
      );
    });

    it("should allow compatible type change", () => {
      const existingFields = [
        {
          id: 1,
          type: "text",
          regexPattern: null,
          required: false,
          minValue: null,
          maxValue: null,
        },
      ];
      const incomingFields = [{ id: 1, type: "textarea", required: false }];

      expect(detectVersionBreakingChanges(existingFields, incomingFields)).toBe(
        false,
      );
    });

    it("should detect making field required", () => {
      const existingFields = [
        {
          id: 1,
          type: "text",
          regexPattern: null,
          required: false,
          minValue: null,
          maxValue: null,
        },
      ];
      const incomingFields = [{ id: 1, type: "text", required: true }];

      expect(detectVersionBreakingChanges(existingFields, incomingFields)).toBe(
        true,
      );
    });

    it("should allow making field optional", () => {
      const existingFields = [
        {
          id: 1,
          type: "text",
          regexPattern: null,
          required: true,
          minValue: null,
          maxValue: null,
        },
      ];
      const incomingFields = [{ id: 1, type: "text", required: false }];

      expect(detectVersionBreakingChanges(existingFields, incomingFields)).toBe(
        false,
      );
    });

    it("should detect adding regex validation", () => {
      const existingFields = [
        {
          id: 1,
          type: "text",
          regexPattern: null,
          required: false,
          minValue: null,
          maxValue: null,
        },
      ];
      const incomingFields = [
        { id: 1, type: "text", required: false, regexPattern: "^[A-Z]+$" },
      ];

      expect(detectVersionBreakingChanges(existingFields, incomingFields)).toBe(
        true,
      );
    });

    it("should detect stricter minValue constraint", () => {
      const existingFields = [
        {
          id: 1,
          type: "number",
          regexPattern: null,
          required: false,
          minValue: 0,
          maxValue: 100,
        },
      ];
      const incomingFields = [
        { id: 1, type: "number", required: false, minValue: 10, maxValue: 100 },
      ];

      expect(detectVersionBreakingChanges(existingFields, incomingFields)).toBe(
        true,
      );
    });

    it("should detect stricter maxValue constraint", () => {
      const existingFields = [
        {
          id: 1,
          type: "number",
          regexPattern: null,
          required: false,
          minValue: 0,
          maxValue: 100,
        },
      ];
      const incomingFields = [
        { id: 1, type: "number", required: false, minValue: 0, maxValue: 50 },
      ];

      expect(detectVersionBreakingChanges(existingFields, incomingFields)).toBe(
        true,
      );
    });

    it("should allow looser minValue constraint", () => {
      const existingFields = [
        {
          id: 1,
          type: "number",
          regexPattern: null,
          required: false,
          minValue: 10,
          maxValue: 100,
        },
      ];
      const incomingFields = [
        { id: 1, type: "number", required: false, minValue: 0, maxValue: 100 },
      ];

      expect(detectVersionBreakingChanges(existingFields, incomingFields)).toBe(
        false,
      );
    });

    it("should allow looser maxValue constraint", () => {
      const existingFields = [
        {
          id: 1,
          type: "number",
          regexPattern: null,
          required: false,
          minValue: 0,
          maxValue: 50,
        },
      ];
      const incomingFields = [
        { id: 1, type: "number", required: false, minValue: 0, maxValue: 100 },
      ];

      expect(detectVersionBreakingChanges(existingFields, incomingFields)).toBe(
        false,
      );
    });

    it("should handle multiple non-breaking changes together", () => {
      const existingFields = [
        {
          id: 1,
          type: "text",
          regexPattern: "^[A-Z]+$",
          required: true,
          minValue: null,
          maxValue: null,
        },
        {
          id: 2,
          type: "number",
          regexPattern: null,
          required: false,
          minValue: 10,
          maxValue: 50,
        },
      ];
      const incomingFields = [
        { id: 1, type: "textarea", required: false, regexPattern: null }, // Compatible type, made optional, removed regex
        { id: 2, type: "range", required: false, minValue: 0, maxValue: 100 }, // Compatible type, looser constraints
      ];

      expect(detectVersionBreakingChanges(existingFields, incomingFields)).toBe(
        false,
      );
    });
  });

  describe("createFormSnapshot", () => {
    it("should create a complete snapshot of form structure", () => {
      const form = {
        name: "Test Form",
        description: "A test form",
        fields: [
          {
            id: 1,
            label: "Name",
            type: "text",
            placeholder: "Enter name",
            helpText: "Your full name",
            required: true,
            order: 0,
            regexPattern: null,
            validationMessage: null,
            allowMultiple: null,
            selectionLimit: null,
            minValue: null,
            maxValue: null,
            defaultValue: null,
            options: null,
          },
          {
            id: 2,
            label: "Age",
            type: "number",
            placeholder: null,
            helpText: null,
            required: false,
            order: 1,
            regexPattern: null,
            validationMessage: null,
            allowMultiple: null,
            selectionLimit: null,
            minValue: 0,
            maxValue: 120,
            defaultValue: null,
            options: null,
          },
        ],
      };

      const snapshot = createFormSnapshot(form);

      expect(snapshot.name).toBe("Test Form");
      expect(snapshot.description).toBe("A test form");
      expect(snapshot.fields).toHaveLength(2);
      expect(snapshot.fields[0]?.label).toBe("Name");
      expect(snapshot.fields[0]?.type).toBe("text");
      expect(snapshot.fields[0]?.required).toBe(true);
      expect(snapshot.fields[1]?.label).toBe("Age");
      expect(snapshot.fields[1]?.minValue).toBe(0);
      expect(snapshot.fields[1]?.maxValue).toBe(120);
    });

    it("should handle empty fields array", () => {
      const form = {
        name: "Empty Form",
        description: null,
        fields: [],
      };

      const snapshot = createFormSnapshot(form);

      expect(snapshot.name).toBe("Empty Form");
      expect(snapshot.description).toBe(null);
      expect(snapshot.fields).toHaveLength(0);
    });

    it("should preserve all field properties", () => {
      const form = {
        name: "Complete Form",
        description: "Test",
        fields: [
          {
            id: 1,
            label: "Test Field",
            type: "select",
            placeholder: "Choose",
            helpText: "Help",
            required: true,
            order: 5,
            regexPattern: "^test$",
            validationMessage: "Invalid",
            allowMultiple: true,
            selectionLimit: 3,
            minValue: 1,
            maxValue: 10,
            defaultValue: "test",
            options: '["A", "B", "C"]',
          },
        ],
      };

      const snapshot = createFormSnapshot(form);
      const field = snapshot.fields[0];

      expect(field?.id).toBe(1);
      expect(field?.label).toBe("Test Field");
      expect(field?.type).toBe("select");
      expect(field?.placeholder).toBe("Choose");
      expect(field?.helpText).toBe("Help");
      expect(field?.required).toBe(true);
      expect(field?.order).toBe(5);
      expect(field?.regexPattern).toBe("^test$");
      expect(field?.validationMessage).toBe("Invalid");
      expect(field?.allowMultiple).toBe(true);
      expect(field?.selectionLimit).toBe(3);
      expect(field?.minValue).toBe(1);
      expect(field?.maxValue).toBe(10);
      expect(field?.defaultValue).toBe("test");
      expect(field?.options).toBe('["A", "B", "C"]');
    });
  });
});
