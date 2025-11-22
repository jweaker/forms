// Utilities for serializing and deserializing forms for AI generation

type FormField = {
  id: number;
  createdAt: Date;
  updatedAt: Date | null;
  formId: number;
  label: string;
  type: string;
  required: boolean;
  placeholder: string | null;
  helpText: string | null;
  regexPattern: string | null;
  validationMessage: string | null;
  order: number;
  allowMultiple: boolean | null;
  selectionLimit: number | null;
  minValue: number | null;
  maxValue: number | null;
  defaultValue: string | null;
  options: string | null; // JSON string
};

type Form = {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  status: string;
  isPublic: boolean;
  allowAnonymous: boolean;
  allowMultipleSubmissions: boolean;
  fields: FormField[];
};

export type AIFormField = {
  label: string;
  type: string;
  required: boolean;
  order: number;
  placeholder: string | null;
  helpText: string | null;
  regexPattern: string | null;
  validationMessage: string | null;
  options: Array<{ label: string; isDefault: boolean }> | null;
  allowMultiple: boolean | null;
  selectionLimit: number | null;
  minValue: number | null;
  maxValue: number | null;
  defaultValue: string | null;
};

export type AIFormStructure = {
  name: string;
  slug: string;
  description: string | null;
  status: "draft" | "published" | "archived";
  isPublic: boolean;
  allowAnonymous: boolean;
  allowMultipleSubmissions: boolean;
  fields: AIFormField[];
};

/**
 * Serialize a form from database format to AI format
 * Removes internal fields like IDs and timestamps
 * Parses JSON options strings into objects
 */
export function serializeFormForAI(form: Form): AIFormStructure {
  return {
    name: form.name,
    slug: form.slug,
    description: form.description,
    status: form.status as "draft" | "published" | "archived",
    isPublic: form.isPublic,
    allowAnonymous: form.allowAnonymous,
    allowMultipleSubmissions: form.allowMultipleSubmissions,
    fields: form.fields
      .sort((a, b) => a.order - b.order)
      .map((field) => {
        let parsedOptions: Array<{ label: string; isDefault: boolean }> | null =
          null;

        if (field.options) {
          try {
            parsedOptions = JSON.parse(field.options) as Array<{
              label: string;
              isDefault: boolean;
            }>;
          } catch {
            parsedOptions = null;
          }
        }

        return {
          label: field.label,
          type: field.type,
          required: field.required,
          order: field.order,
          placeholder: field.placeholder,
          helpText: field.helpText,
          regexPattern: field.regexPattern,
          validationMessage: field.validationMessage,
          options: parsedOptions,
          allowMultiple: field.allowMultiple,
          selectionLimit: field.selectionLimit,
          minValue: field.minValue,
          maxValue: field.maxValue,
          defaultValue: field.defaultValue,
        };
      }),
  };
}

/**
 * Validate a single field and return validation errors
 */
function validateField(
  field: unknown,
  index: number,
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!field || typeof field !== "object") {
    return { valid: false, errors: [`Field ${index}: Not an object`] };
  }

  const fieldObj = field as Record<string, unknown>;

  // Check required properties
  if (typeof fieldObj.label !== "string" || fieldObj.label.length === 0) {
    errors.push(`Field ${index}: Invalid or missing label`);
  } else if (fieldObj.label.length > 256) {
    errors.push(`Field ${index}: Label exceeds 256 characters`);
  }

  if (typeof fieldObj.type !== "string") {
    errors.push(`Field ${index}: Invalid or missing type`);
  } else {
    const validTypes = [
      "text",
      "textarea",
      "number",
      "range",
      "date",
      "time",
      "datetime-local",
      "select",
      "radio",
      "checkbox",
      "checkbox-group",
    ];
    if (!validTypes.includes(fieldObj.type)) {
      errors.push(`Field ${index}: Invalid field type "${fieldObj.type}"`);
    }
  }

  if (typeof fieldObj.required !== "boolean") {
    errors.push(`Field ${index}: Invalid or missing required property`);
  }

  if (typeof fieldObj.order !== "number") {
    errors.push(`Field ${index}: Invalid or missing order`);
  }

  // Validate options for fields that require them
  const optionBasedTypes = ["select", "radio", "checkbox-group"];
  if (
    typeof fieldObj.type === "string" &&
    optionBasedTypes.includes(fieldObj.type)
  ) {
    if (!Array.isArray(fieldObj.options) || fieldObj.options.length === 0) {
      errors.push(
        `Field ${index}: Type "${fieldObj.type}" requires non-empty options array`,
      );
    } else {
      // Validate each option
      fieldObj.options.forEach((option: unknown, optIndex: number) => {
        if (!option || typeof option !== "object") {
          errors.push(`Field ${index}: Option ${optIndex} is not an object`);
        } else {
          const opt = option as Record<string, unknown>;
          if (typeof opt.label !== "string") {
            errors.push(`Field ${index}: Option ${optIndex} missing label`);
          }
          if (typeof opt.isDefault !== "boolean") {
            errors.push(
              `Field ${index}: Option ${optIndex} missing isDefault`,
            );
          }
        }
      });

      // Check isDefault rules for single-select
      if (
        fieldObj.type === "radio" ||
        (fieldObj.type === "select" && !fieldObj.allowMultiple)
      ) {
        const defaultCount = (
          fieldObj.options as Array<Record<string, unknown>>
        ).filter((opt) => opt.isDefault === true).length;
        if (defaultCount > 1) {
          errors.push(
            `Field ${index}: Single-select field cannot have multiple default options`,
          );
        }
      }
    }
  }

  // Validate min/max for number and range fields
  if (fieldObj.type === "number" || fieldObj.type === "range") {
    if (fieldObj.minValue !== null && typeof fieldObj.minValue !== "number") {
      errors.push(`Field ${index}: minValue must be a number or null`);
    }
    if (fieldObj.maxValue !== null && typeof fieldObj.maxValue !== "number") {
      errors.push(`Field ${index}: maxValue must be a number or null`);
    }
    if (
      typeof fieldObj.minValue === "number" &&
      typeof fieldObj.maxValue === "number" &&
      fieldObj.minValue >= fieldObj.maxValue
    ) {
      errors.push(`Field ${index}: minValue must be less than maxValue`);
    }
  }

  // Validate regex pattern
  if (
    fieldObj.regexPattern !== null &&
    typeof fieldObj.regexPattern === "string" &&
    fieldObj.regexPattern.length > 0
  ) {
    try {
      new RegExp(fieldObj.regexPattern);
    } catch {
      errors.push(`Field ${index}: Invalid regex pattern`);
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Deserialize a form from AI format back to application format
 * Handles invalid fields gracefully by filtering them out and logging warnings
 */
export function deserializeFormFromAI(aiForm: AIFormStructure): {
  form: {
    name: string;
    slug: string;
    description: string | undefined;
    status: string;
    isPublic: boolean;
    allowAnonymous: boolean;
    allowMultipleSubmissions: boolean;
  };
  fields: Array<{
    label: string;
    type: string;
    required: boolean;
    order: number;
    placeholder?: string;
    helpText?: string;
    regexPattern?: string;
    validationMessage?: string;
    options?: Array<{ label: string; isDefault: boolean }>;
    allowMultiple?: boolean;
    selectionLimit?: number;
    minValue?: number;
    maxValue?: number;
    defaultValue?: string;
  }>;
  warnings: string[];
} {
  const warnings: string[] = [];
  const validFields: Array<{
    label: string;
    type: string;
    required: boolean;
    order: number;
    placeholder?: string;
    helpText?: string;
    regexPattern?: string;
    validationMessage?: string;
    options?: Array<{ label: string; isDefault: boolean }>;
    allowMultiple?: boolean;
    selectionLimit?: number;
    minValue?: number;
    maxValue?: number;
    defaultValue?: string;
  }> = [];

  // Validate and filter fields
  aiForm.fields.forEach((field, index) => {
    const validation = validateField(field, index);

    if (!validation.valid) {
      warnings.push(
        `Skipping field ${index} (${(field as { label?: string }).label ?? "unknown"}): ${validation.errors.join(", ")}`,
      );
    } else {
      validFields.push({
        label: field.label,
        type: field.type,
        required: field.required,
        order: field.order,
        placeholder: field.placeholder ?? undefined,
        helpText: field.helpText ?? undefined,
        regexPattern: field.regexPattern ?? undefined,
        validationMessage: field.validationMessage ?? undefined,
        options: field.options ?? undefined,
        allowMultiple: field.allowMultiple ?? undefined,
        selectionLimit: field.selectionLimit ?? undefined,
        minValue: field.minValue ?? undefined,
        maxValue: field.maxValue ?? undefined,
        defaultValue: field.defaultValue ?? undefined,
      });
    }
  });

  // Re-sequence order for valid fields
  validFields.forEach((field, index) => {
    field.order = index;
  });

  return {
    form: {
      name: aiForm.name,
      slug: aiForm.slug,
      description: aiForm.description ?? undefined,
      status: aiForm.status,
      isPublic: aiForm.isPublic,
      allowAnonymous: aiForm.allowAnonymous,
      allowMultipleSubmissions: aiForm.allowMultipleSubmissions,
    },
    fields: validFields,
    warnings,
  };
}

/**
 * Validate AI response structure
 * Returns validation result with detailed error messages
 */
export function validateAIFormStructure(
  data: unknown,
): data is { form: AIFormStructure } {
  if (!data || typeof data !== "object") {
    console.error("AI response validation: Not an object");
    return false;
  }

  const obj = data as Record<string, unknown>;
  if (!obj.form || typeof obj.form !== "object") {
    console.error("AI response validation: Missing or invalid 'form' object");
    return false;
  }

  const form = obj.form as Record<string, unknown>;

  // Check required form fields
  if (typeof form.name !== "string" || form.name.length === 0) {
    console.error("AI response validation: Invalid form name");
    return false;
  }
  if (form.name.length > 256) {
    console.error("AI response validation: Form name exceeds 256 characters");
    return false;
  }

  if (typeof form.slug !== "string" || form.slug.length === 0) {
    console.error("AI response validation: Invalid form slug");
    return false;
  }
  if (form.slug.length > 256) {
    console.error("AI response validation: Form slug exceeds 256 characters");
    return false;
  }
  if (!/^[a-z0-9-]+$/.test(form.slug)) {
    console.error(
      "AI response validation: Form slug contains invalid characters (must be lowercase letters, numbers, and hyphens)",
    );
    return false;
  }

  if (typeof form.status !== "string") {
    console.error("AI response validation: Invalid form status");
    return false;
  }
  if (!["draft", "published", "archived"].includes(form.status)) {
    console.error(
      `AI response validation: Invalid status value "${form.status}" (must be draft, published, or archived)`,
    );
    return false;
  }

  if (typeof form.isPublic !== "boolean") {
    console.error("AI response validation: Invalid isPublic value");
    return false;
  }
  if (typeof form.allowAnonymous !== "boolean") {
    console.error("AI response validation: Invalid allowAnonymous value");
    return false;
  }
  if (typeof form.allowMultipleSubmissions !== "boolean") {
    console.error(
      "AI response validation: Invalid allowMultipleSubmissions value",
    );
    return false;
  }

  // Check fields array
  if (!Array.isArray(form.fields)) {
    console.error("AI response validation: fields must be an array");
    return false;
  }

  // Allow empty fields array (form without fields)
  if (form.fields.length === 0) {
    console.warn(
      "AI response validation: Form has no fields, but this is allowed",
    );
    return true;
  }

  const validFieldTypes = [
    "text",
    "textarea",
    "number",
    "range",
    "date",
    "time",
    "datetime-local",
    "select",
    "radio",
    "checkbox",
    "checkbox-group",
  ];

  // Validate that at least ONE valid field exists
  let hasValidField = false;

  for (let i = 0; i < form.fields.length; i++) {
    const field: unknown = form.fields[i];
    if (!field || typeof field !== "object") {
      console.warn(`AI response validation: Field ${i} is not an object`);
      continue;
    }

    const fieldObj = field as Record<string, unknown>;

    // Check required field properties
    if (typeof fieldObj.label !== "string" || fieldObj.label.length === 0) {
      console.warn(`AI response validation: Field ${i} has invalid label`);
      continue;
    }

    if (typeof fieldObj.type !== "string") {
      console.warn(`AI response validation: Field ${i} has invalid type`);
      continue;
    }

    if (!validFieldTypes.includes(fieldObj.type)) {
      console.warn(
        `AI response validation: Field ${i} has invalid type "${fieldObj.type}"`,
      );
      continue;
    }

    if (typeof fieldObj.required !== "boolean") {
      console.warn(
        `AI response validation: Field ${i} has invalid required value`,
      );
      continue;
    }

    if (typeof fieldObj.order !== "number") {
      console.warn(`AI response validation: Field ${i} has invalid order`);
      continue;
    }

    // If we reach here, at least this field has valid basic structure
    hasValidField = true;
  }

  if (!hasValidField) {
    console.error(
      "AI response validation: No valid fields found in the form",
    );
    return false;
  }

  return true;
}
