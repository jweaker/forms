import { describe, it, expect } from "vitest";
import {
  FIELD_TYPES,
  FIELD_TYPE_LABELS,
  FIELD_TYPE_OPTIONS,
  FORM_STATUS,
  FORM_STATUS_OPTIONS,
  VALIDATION_TEMPLATES,
  fieldTypeNeedsOptions,
  fieldTypeSupportsValidation,
  fieldTypeSupportsMultiSelect,
  fieldTypeSupportsMinMax,
  fieldTypeSupportsDefaultValue,
  fieldTypeSupportsPlaceholder,
  getFieldTypeLabel,
} from "./field-types";

describe("field-types", () => {
  describe("constants", () => {
    it("should have correct field types", () => {
      expect(FIELD_TYPES.TEXT).toBe("text");
      expect(FIELD_TYPES.TEXTAREA).toBe("textarea");
      expect(FIELD_TYPES.NUMBER).toBe("number");
      expect(FIELD_TYPES.RANGE).toBe("range");
      expect(FIELD_TYPES.DATE).toBe("date");
      expect(FIELD_TYPES.TIME).toBe("time");
      expect(FIELD_TYPES.DATETIME).toBe("datetime-local");
      expect(FIELD_TYPES.SELECT).toBe("select");
      expect(FIELD_TYPES.RADIO).toBe("radio");
      expect(FIELD_TYPES.CHECKBOX).toBe("checkbox");
      expect(FIELD_TYPES.CHECKBOX_GROUP).toBe("checkbox-group");
    });

    it("should have labels for all field types", () => {
      expect(FIELD_TYPE_LABELS.text).toBe("Text Input");
      expect(FIELD_TYPE_LABELS.textarea).toBe("Text Area");
      expect(FIELD_TYPE_LABELS.number).toBe("Number");
      expect(FIELD_TYPE_LABELS.range).toBe("Range Slider");
      expect(FIELD_TYPE_LABELS.date).toBe("Date");
      expect(FIELD_TYPE_LABELS.time).toBe("Time");
      expect(FIELD_TYPE_LABELS["datetime-local"]).toBe("Date & Time");
      expect(FIELD_TYPE_LABELS.select).toBe("Dropdown");
      expect(FIELD_TYPE_LABELS.radio).toBe("Radio Buttons");
      expect(FIELD_TYPE_LABELS.checkbox).toBe("Checkbox");
      expect(FIELD_TYPE_LABELS["checkbox-group"]).toBe("Checkbox Group");
    });

    it("should have field type options array", () => {
      expect(FIELD_TYPE_OPTIONS).toHaveLength(11);
      expect(FIELD_TYPE_OPTIONS[0]).toEqual({
        label: "Text Input",
        value: "text",
      });
    });

    it("should have form status constants", () => {
      expect(FORM_STATUS.DRAFT).toBe("draft");
      expect(FORM_STATUS.PUBLISHED).toBe("published");
      expect(FORM_STATUS.ARCHIVED).toBe("archived");
    });

    it("should have form status options", () => {
      expect(FORM_STATUS_OPTIONS).toHaveLength(3);
      expect(FORM_STATUS_OPTIONS).toContainEqual({
        label: "Draft",
        value: "draft",
      });
    });

    it("should have validation templates", () => {
      expect(VALIDATION_TEMPLATES.EMAIL.pattern).toContain("@");
      expect(VALIDATION_TEMPLATES.EMAIL.message).toContain("email");
      expect(VALIDATION_TEMPLATES.IRAQI_PHONE.pattern).toContain("+964");
      expect(VALIDATION_TEMPLATES.URL.pattern).toContain("https?");
      expect(VALIDATION_TEMPLATES.NUMBER.pattern).toBe("^[0-9]+$");
      expect(VALIDATION_TEMPLATES.ALPHANUMERIC.pattern).toBe("^[a-zA-Z0-9]+$");
      expect(VALIDATION_TEMPLATES.NO_SPACES.pattern).toBe("^\\S+$");
    });
  });

  describe("fieldTypeNeedsOptions", () => {
    it("should return true for select field", () => {
      expect(fieldTypeNeedsOptions("select")).toBe(true);
    });

    it("should return true for radio field", () => {
      expect(fieldTypeNeedsOptions("radio")).toBe(true);
    });

    it("should return true for checkbox-group field", () => {
      expect(fieldTypeNeedsOptions("checkbox-group")).toBe(true);
    });

    it("should return false for text field", () => {
      expect(fieldTypeNeedsOptions("text")).toBe(false);
    });

    it("should return false for number field", () => {
      expect(fieldTypeNeedsOptions("number")).toBe(false);
    });

    it("should return false for checkbox field", () => {
      expect(fieldTypeNeedsOptions("checkbox")).toBe(false);
    });
  });

  describe("fieldTypeSupportsValidation", () => {
    it("should return true for text field", () => {
      expect(fieldTypeSupportsValidation("text")).toBe(true);
    });

    it("should return true for textarea field", () => {
      expect(fieldTypeSupportsValidation("textarea")).toBe(true);
    });

    it("should return false for number field", () => {
      expect(fieldTypeSupportsValidation("number")).toBe(false);
    });

    it("should return false for select field", () => {
      expect(fieldTypeSupportsValidation("select")).toBe(false);
    });

    it("should return false for date field", () => {
      expect(fieldTypeSupportsValidation("date")).toBe(false);
    });
  });

  describe("fieldTypeSupportsMultiSelect", () => {
    it("should return true for select field", () => {
      expect(fieldTypeSupportsMultiSelect("select")).toBe(true);
    });

    it("should return true for checkbox-group field", () => {
      expect(fieldTypeSupportsMultiSelect("checkbox-group")).toBe(true);
    });

    it("should return false for radio field", () => {
      expect(fieldTypeSupportsMultiSelect("radio")).toBe(false);
    });

    it("should return false for text field", () => {
      expect(fieldTypeSupportsMultiSelect("text")).toBe(false);
    });

    it("should return false for checkbox field", () => {
      expect(fieldTypeSupportsMultiSelect("checkbox")).toBe(false);
    });
  });

  describe("fieldTypeSupportsMinMax", () => {
    it("should return true for number field", () => {
      expect(fieldTypeSupportsMinMax("number")).toBe(true);
    });

    it("should return true for range field", () => {
      expect(fieldTypeSupportsMinMax("range")).toBe(true);
    });

    it("should return false for text field", () => {
      expect(fieldTypeSupportsMinMax("text")).toBe(false);
    });

    it("should return false for date field", () => {
      expect(fieldTypeSupportsMinMax("date")).toBe(false);
    });

    it("should return false for select field", () => {
      expect(fieldTypeSupportsMinMax("select")).toBe(false);
    });
  });

  describe("fieldTypeSupportsDefaultValue", () => {
    it("should return true for text field", () => {
      expect(fieldTypeSupportsDefaultValue("text")).toBe(true);
    });

    it("should return true for textarea field", () => {
      expect(fieldTypeSupportsDefaultValue("textarea")).toBe(true);
    });

    it("should return true for number field", () => {
      expect(fieldTypeSupportsDefaultValue("number")).toBe(true);
    });

    it("should return true for range field", () => {
      expect(fieldTypeSupportsDefaultValue("range")).toBe(true);
    });

    it("should return true for checkbox field", () => {
      expect(fieldTypeSupportsDefaultValue("checkbox")).toBe(true);
    });

    it("should return false for select field", () => {
      expect(fieldTypeSupportsDefaultValue("select")).toBe(false);
    });

    it("should return false for radio field", () => {
      expect(fieldTypeSupportsDefaultValue("radio")).toBe(false);
    });

    it("should return false for date field", () => {
      expect(fieldTypeSupportsDefaultValue("date")).toBe(false);
    });
  });

  describe("fieldTypeSupportsPlaceholder", () => {
    it("should return true for text field", () => {
      expect(fieldTypeSupportsPlaceholder("text")).toBe(true);
    });

    it("should return true for textarea field", () => {
      expect(fieldTypeSupportsPlaceholder("textarea")).toBe(true);
    });

    it("should return true for number field", () => {
      expect(fieldTypeSupportsPlaceholder("number")).toBe(true);
    });

    it("should return true for date field", () => {
      expect(fieldTypeSupportsPlaceholder("date")).toBe(true);
    });

    it("should return true for time field", () => {
      expect(fieldTypeSupportsPlaceholder("time")).toBe(true);
    });

    it("should return true for datetime-local field", () => {
      expect(fieldTypeSupportsPlaceholder("datetime-local")).toBe(true);
    });

    it("should return true for select field", () => {
      expect(fieldTypeSupportsPlaceholder("select")).toBe(true);
    });

    it("should return false for radio field", () => {
      expect(fieldTypeSupportsPlaceholder("radio")).toBe(false);
    });

    it("should return false for checkbox field", () => {
      expect(fieldTypeSupportsPlaceholder("checkbox")).toBe(false);
    });

    it("should return false for checkbox-group field", () => {
      expect(fieldTypeSupportsPlaceholder("checkbox-group")).toBe(false);
    });
  });

  describe("getFieldTypeLabel", () => {
    it("should return correct label for known types", () => {
      expect(getFieldTypeLabel("text")).toBe("Text Input");
      expect(getFieldTypeLabel("textarea")).toBe("Text Area");
      expect(getFieldTypeLabel("number")).toBe("Number");
      expect(getFieldTypeLabel("select")).toBe("Dropdown");
    });

    it("should return the type itself for unknown types", () => {
      expect(getFieldTypeLabel("unknown-type")).toBe("unknown-type");
      expect(getFieldTypeLabel("custom")).toBe("custom");
    });

    it("should handle datetime-local correctly", () => {
      expect(getFieldTypeLabel("datetime-local")).toBe("Date & Time");
    });
  });

  describe("validation templates", () => {
    it("should have valid regex patterns", () => {
      Object.values(VALIDATION_TEMPLATES).forEach((template) => {
        expect(() => new RegExp(template.pattern)).not.toThrow();
      });
    });

    it("email pattern should validate valid emails", () => {
      const emailRegex = new RegExp(VALIDATION_TEMPLATES.EMAIL.pattern);
      expect(emailRegex.test("test@example.com")).toBe(true);
      expect(emailRegex.test("user.name+tag@domain.co.uk")).toBe(true);
      expect(emailRegex.test("invalid@")).toBe(false);
      expect(emailRegex.test("@example.com")).toBe(false);
      expect(emailRegex.test("notanemail")).toBe(false);
    });

    it("URL pattern should validate valid URLs", () => {
      const urlRegex = new RegExp(VALIDATION_TEMPLATES.URL.pattern);
      expect(urlRegex.test("https://example.com")).toBe(true);
      expect(urlRegex.test("http://test.org/path")).toBe(true);
      expect(urlRegex.test("example.com")).toBe(false);
      expect(urlRegex.test("not a url")).toBe(false);
    });

    it("number pattern should validate numbers only", () => {
      const numberRegex = new RegExp(VALIDATION_TEMPLATES.NUMBER.pattern);
      expect(numberRegex.test("12345")).toBe(true);
      expect(numberRegex.test("0")).toBe(true);
      expect(numberRegex.test("abc")).toBe(false);
      expect(numberRegex.test("123abc")).toBe(false);
      expect(numberRegex.test("-123")).toBe(false);
    });

    it("alphanumeric pattern should validate letters and numbers", () => {
      const alphanumericRegex = new RegExp(
        VALIDATION_TEMPLATES.ALPHANUMERIC.pattern,
      );
      expect(alphanumericRegex.test("abc123")).toBe(true);
      expect(alphanumericRegex.test("Test123")).toBe(true);
      expect(alphanumericRegex.test("test with space")).toBe(false);
      expect(alphanumericRegex.test("test-123")).toBe(false);
    });

    it("no spaces pattern should reject spaces", () => {
      const noSpacesRegex = new RegExp(VALIDATION_TEMPLATES.NO_SPACES.pattern);
      expect(noSpacesRegex.test("nospaceshere")).toBe(true);
      expect(noSpacesRegex.test("test123")).toBe(true);
      expect(noSpacesRegex.test("has space")).toBe(false);
      expect(noSpacesRegex.test("  ")).toBe(false);
    });

    it("Iraqi phone pattern should validate Iraqi phone numbers", () => {
      const iraqiPhoneRegex = new RegExp(
        VALIDATION_TEMPLATES.IRAQI_PHONE.pattern,
      );
      expect(iraqiPhoneRegex.test("07123456789")).toBe(true);
      expect(iraqiPhoneRegex.test("+9647123456789")).toBe(true);
      expect(iraqiPhoneRegex.test("09123456789")).toBe(false);
      expect(iraqiPhoneRegex.test("7123456789")).toBe(false);
      expect(iraqiPhoneRegex.test("+964612345678")).toBe(false);
    });
  });
});
