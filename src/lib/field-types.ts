// Field type definitions and configurations

export const FIELD_TYPES = {
  // Text inputs (validation via regex)
  TEXT: "text",
  TEXTAREA: "textarea",

  // Numeric and date inputs
  NUMBER: "number",
  RANGE: "range",
  DATE: "date",
  TIME: "time",
  DATETIME: "datetime-local",

  // Selection
  SELECT: "select",
  RADIO: "radio",
  CHECKBOX: "checkbox",
  CHECKBOX_GROUP: "checkbox-group",
} as const;

export type FieldType = (typeof FIELD_TYPES)[keyof typeof FIELD_TYPES];

// Create a display mapping for field types
export const FIELD_TYPE_LABELS: Record<string, string> = {
  text: "Text Input",
  textarea: "Text Area",
  number: "Number",
  range: "Range Slider",
  date: "Date",
  time: "Time",
  "datetime-local": "Date & Time",
  select: "Dropdown",
  radio: "Radio Buttons",
  checkbox: "Checkbox",
  "checkbox-group": "Checkbox Group",
};

export const FIELD_TYPE_OPTIONS = [
  { label: "Text Input", value: FIELD_TYPES.TEXT },
  { label: "Text Area", value: FIELD_TYPES.TEXTAREA },
  { label: "Number", value: FIELD_TYPES.NUMBER },
  { label: "Range Slider", value: FIELD_TYPES.RANGE },
  { label: "Date", value: FIELD_TYPES.DATE },
  { label: "Time", value: FIELD_TYPES.TIME },
  { label: "Date & Time", value: FIELD_TYPES.DATETIME },
  { label: "Dropdown", value: FIELD_TYPES.SELECT },
  { label: "Radio Buttons", value: FIELD_TYPES.RADIO },
  { label: "Checkbox", value: FIELD_TYPES.CHECKBOX },
  { label: "Checkbox Group", value: FIELD_TYPES.CHECKBOX_GROUP },
];

// Form status
export const FORM_STATUS = {
  DRAFT: "draft",
  PUBLISHED: "published",
  ARCHIVED: "archived",
} as const;

export type FormStatus = (typeof FORM_STATUS)[keyof typeof FORM_STATUS];

export const FORM_STATUS_OPTIONS = [
  { label: "Draft", value: FORM_STATUS.DRAFT },
  { label: "Published", value: FORM_STATUS.PUBLISHED },
  { label: "Archived", value: FORM_STATUS.ARCHIVED },
];

// Validation templates (for text and textarea only)
export const VALIDATION_TEMPLATES = {
  EMAIL: {
    label: "Email",
    pattern: "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$",
    message: "Please enter a valid email address",
  },
  IRAQI_PHONE: {
    label: "Iraqi Phone",
    pattern: "^(\\+964|0)(7[0-9]{9})$",
    message: "Please enter a valid Iraqi phone number (e.g., 07XXXXXXXXX)",
  },
  URL: {
    label: "URL",
    pattern: "^https?://[^\\s/$.?#].[^\\s]*$",
    message: "Please enter a valid URL (e.g., https://example.com)",
  },
  NUMBER: {
    label: "Numbers Only",
    pattern: "^[0-9]+$",
    message: "Please enter only numbers",
  },
  ALPHANUMERIC: {
    label: "Alphanumeric",
    pattern: "^[a-zA-Z0-9]+$",
    message: "Please enter only letters and numbers",
  },
  NO_SPACES: {
    label: "No Spaces",
    pattern: "^\\S+$",
    message: "Spaces are not allowed",
  },
} as const;

// Field types that support options (select, radio, checkbox-group)
export const FIELD_TYPES_WITH_OPTIONS = [
  FIELD_TYPES.SELECT,
  FIELD_TYPES.RADIO,
  FIELD_TYPES.CHECKBOX_GROUP,
];

// Field types that support regex validation
export const FIELD_TYPES_WITH_VALIDATION = [
  FIELD_TYPES.TEXT,
  FIELD_TYPES.TEXTAREA,
];

// Field types that support multi-select
export const FIELD_TYPES_WITH_MULTI_SELECT = [
  FIELD_TYPES.SELECT,
  FIELD_TYPES.CHECKBOX_GROUP,
];

// Field types that support min/max values
export const FIELD_TYPES_WITH_MIN_MAX = [FIELD_TYPES.NUMBER, FIELD_TYPES.RANGE];

// Field types that support default values
export const FIELD_TYPES_WITH_DEFAULT_VALUE = [
  FIELD_TYPES.TEXT,
  FIELD_TYPES.TEXTAREA,
  FIELD_TYPES.NUMBER,
  FIELD_TYPES.RANGE,
  FIELD_TYPES.CHECKBOX,
];

// Check if field type needs options
export function fieldTypeNeedsOptions(type: string): boolean {
  return (FIELD_TYPES_WITH_OPTIONS as readonly string[]).includes(type);
}

// Check if field type supports regex validation
export function fieldTypeSupportsValidation(type: string): boolean {
  return (FIELD_TYPES_WITH_VALIDATION as readonly string[]).includes(type);
}

// Check if field type supports multi-select
export function fieldTypeSupportsMultiSelect(type: string): boolean {
  return (FIELD_TYPES_WITH_MULTI_SELECT as readonly string[]).includes(type);
}

// Check if field type supports min/max
export function fieldTypeSupportsMinMax(type: string): boolean {
  return (FIELD_TYPES_WITH_MIN_MAX as readonly string[]).includes(type);
}

// Check if field type supports default value
export function fieldTypeSupportsDefaultValue(type: string): boolean {
  return (FIELD_TYPES_WITH_DEFAULT_VALUE as readonly string[]).includes(type);
}

// Get label for field type
export function getFieldTypeLabel(type: string): string {
  return FIELD_TYPE_LABELS[type] ?? type;
}
