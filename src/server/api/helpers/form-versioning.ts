/**
 * Form versioning utilities
 * Handles version-breaking change detection for form fields
 */

type FormField = {
  id: number;
  type: string;
  regexPattern: string | null;
  required: boolean;
  minValue: number | null;
  maxValue: number | null;
};

type IncomingField = {
  id?: number;
  type: string;
  regexPattern?: string | null;
  required: boolean;
  minValue?: number | null;
  maxValue?: number | null;
};

/**
 * Check if type change is data-incompatible
 */
export function isIncompatibleTypeChange(
  oldType: string,
  newType: string,
): boolean {
  if (oldType === newType) return false;

  // Compatible type changes (same data format)
  const compatiblePairs = [
    ["text", "textarea"], // both store text
    ["textarea", "text"], // both store text
    ["text", "email"], // both store text
    ["email", "text"], // both store text
    ["text", "url"], // both store text
    ["url", "text"], // both store text
    ["text", "tel"], // both store text
    ["tel", "text"], // both store text
    ["number", "range"], // both store numbers
    ["range", "number"], // both store numbers
  ];

  return !compatiblePairs.some(([a, b]) => a === oldType && b === newType);
}

/**
 * Check if regex change invalidates existing data
 */
export function hasRegexInvalidation(
  oldRegex: string | null,
  newRegex: string | null,
): boolean {
  // Adding or changing regex can invalidate existing data
  // Removing regex doesn't invalidate data
  if (!oldRegex && newRegex) return true; // Adding new validation
  if (oldRegex && newRegex && oldRegex !== newRegex) return true; // Changing validation
  return false;
}

/**
 * Detect version-breaking changes between existing and incoming fields
 */
export function detectVersionBreakingChanges(
  existingFields: FormField[],
  incomingFields: IncomingField[],
): boolean {
  const existingFieldsMap = new Map(existingFields.map((f) => [f.id, f]));
  const incomingFieldIds = new Set(
    incomingFields.filter((f) => f.id).map((f) => f.id!),
  );

  // Check for deleted fields
  for (const existingField of existingFields) {
    if (!incomingFieldIds.has(existingField.id)) {
      return true; // Field deletion is version-breaking
    }
  }

  // Check for data-incompatible changes
  for (const incomingField of incomingFields) {
    if (incomingField.id) {
      const existingField = existingFieldsMap.get(incomingField.id);
      if (existingField) {
        // Check for incompatible type changes
        if (isIncompatibleTypeChange(existingField.type, incomingField.type)) {
          return true;
        }

        // Check for validation changes that can invalidate data
        if (
          hasRegexInvalidation(
            existingField.regexPattern,
            incomingField.regexPattern ?? null,
          )
        ) {
          return true;
        }

        // Check if field becomes required (can invalidate empty existing data)
        if (!existingField.required && incomingField.required) {
          return true;
        }

        // Check if min/max constraints become stricter
        if (existingField.type === "number" || existingField.type === "range") {
          const oldMin = existingField.minValue;
          const oldMax = existingField.maxValue;
          const newMin = incomingField.minValue ?? null;
          const newMax = incomingField.maxValue ?? null;

          // Min increases or max decreases = stricter constraints
          if (
            (newMin !== null && (oldMin === null || newMin > oldMin)) ||
            (newMax !== null && (oldMax === null || newMax < oldMax))
          ) {
            return true;
          }
        }
      }
    }
  }

  return false;
}

/**
 * Create a version snapshot of a form
 */
export function createFormSnapshot(form: {
  name: string;
  description: string | null;
  fields: Array<{
    id: number;
    label: string;
    type: string;
    placeholder: string | null;
    helpText: string | null;
    required: boolean;
    order: number;
    regexPattern: string | null;
    validationMessage: string | null;
    allowMultiple: boolean | null;
    selectionLimit: number | null;
    minValue: number | null;
    maxValue: number | null;
    defaultValue: string | null;
    options: string | null;
  }>;
}) {
  return {
    name: form.name,
    description: form.description,
    fields: form.fields.map((f) => ({
      id: f.id,
      label: f.label,
      type: f.type,
      placeholder: f.placeholder,
      helpText: f.helpText,
      required: f.required,
      order: f.order,
      regexPattern: f.regexPattern,
      validationMessage: f.validationMessage,
      allowMultiple: f.allowMultiple,
      selectionLimit: f.selectionLimit,
      minValue: f.minValue,
      maxValue: f.maxValue,
      defaultValue: f.defaultValue,
      options: f.options,
    })),
  };
}
