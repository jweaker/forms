# Forms Backend API Documentation

This document describes all the tRPC routers and their endpoints for the Forms application.

## Overview

The backend consists of 4 main routers:

- **forms** - Managing form creation, editing, and deletion
- **formFields** - Managing fields within forms
- **formResponses** - Handling form submissions and viewing responses
- **public** - Public endpoints for viewing and submitting forms

---

## Forms Router (`api.forms.*`)

### `list`

Get all forms created by the authenticated user with pagination.

**Auth Required:** Yes

**Input:**

```typescript
{
  limit?: number;      // 1-100, default: 20
  offset?: number;     // default: 0
  status?: "draft" | "published" | "archived";
}
```

**Output:**

```typescript
{
  items: Form[];
  total: number;
  hasMore: boolean;
}
```

---

### `getById`

Get a single form by ID with all fields and recent responses.

**Auth Required:** Yes (must be owner)

**Input:**

```typescript
{
  id: number;
}
```

**Output:**

```typescript
Form & {
  responseCount: number;
  fields: FormField[];
  responses: FormResponse[];
}
```

---

### `getBySlug`

Get a form by its slug.

**Auth Required:** Yes (must be owner)

**Input:**

```typescript
{
  slug: string;
}
```

**Output:**

```typescript
Form & {
  fields: FormField[];
}
```

---

### `create`

Create a new form with auto-generated unique slug.

**Auth Required:** Yes

**Input:**

```typescript
{
  name: string;              // min: 1, max: 256
  description?: string;
  isPublic?: boolean;        // default: false
  allowAnonymous?: boolean;  // default: true
}
```

**Output:**

```typescript
Form;
```

---

### `update`

Update form details (not including fields).

**Auth Required:** Yes (must be owner)

**Input:**

```typescript
{
  id: number;
  name?: string;
  description?: string;
  isPublic?: boolean;
  allowAnonymous?: boolean;
  status?: "draft" | "published" | "archived";
}
```

**Output:**

```typescript
Form;
```

---

### `delete`

Delete a form and all its fields and responses.

**Auth Required:** Yes (must be owner)

**Input:**

```typescript
{
  id: number;
}
```

**Output:**

```typescript
{
  success: boolean;
}
```

---

### `duplicate`

Create a copy of a form with all fields (but no responses).

**Auth Required:** Yes (must be owner)

**Input:**

```typescript
{
  id: number;
}
```

**Output:**

```typescript
Form;
```

---

### `getStats`

Get statistics for a form.

**Auth Required:** Yes (must be owner)

**Input:**

```typescript
{
  id: number;
}
```

**Output:**

```typescript
{
  totalResponses: number;
}
```

---

## Form Fields Router (`api.formFields.*`)

### `create`

Add a new field to a form.

**Auth Required:** Yes (must own form)

**Input:**

```typescript
{
  formId: number;
  label: string;              // max: 256
  type: string;               // e.g., "text", "email", "select", "radio"
  placeholder?: string;
  helpText?: string;
  required?: boolean;         // default: false
  regexPattern?: string;      // validation regex
  validationMessage?: string;
  options?: Array<{           // for select, radio, checkbox
    label: string;
    value: string;
  }>;
}
```

**Output:**

```typescript
FormField & {
  options: FormFieldOption[];
}
```

---

### `update`

Update an existing field.

**Auth Required:** Yes (must own form)

**Input:**

```typescript
{
  fieldId: number;
  label?: string;
  type?: string;
  placeholder?: string;
  helpText?: string;
  required?: boolean;
  regexPattern?: string;
  validationMessage?: string;
  options?: Array<{
    label: string;
    value: string;
  }>;
}
```

**Output:**

```typescript
FormField & {
  options: FormFieldOption[];
}
```

---

### `delete`

Delete a field from a form.

**Auth Required:** Yes (must own form)

**Input:**

```typescript
{
  fieldId: number;
}
```

**Output:**

```typescript
{
  success: boolean;
}
```

---

### `reorder`

Change the order of fields in a form.

**Auth Required:** Yes (must own form)

**Input:**

```typescript
{
  formId: number;
  fieldIds: number[];  // Array of field IDs in desired order
}
```

**Output:**

```typescript
{
  success: boolean;
}
```

---

### `duplicate`

Create a copy of a field.

**Auth Required:** Yes (must own form)

**Input:**

```typescript
{
  fieldId: number;
}
```

**Output:**

```typescript
FormField & {
  options: FormFieldOption[];
}
```

---

## Form Responses Router (`api.formResponses.*`)

### `submit`

Submit a response to a form.

**Auth Required:** No (if `allowAnonymous` is true)

**Input:**

```typescript
{
  formId: number;
  fields: Array<{
    fieldId: number;
    value: string;
  }>;
  submitterEmail?: string;
  isAnonymous?: boolean;
  rating?: number;       // 1-5
  comments?: string;
}
```

**Output:**

```typescript
{
  success: boolean;
  responseId: number;
}
```

**Validation:**

- Form must be published
- All required fields must be provided
- Regex patterns are validated
- Anonymous submissions checked against `allowAnonymous`

---

### `list`

Get all responses for a form with pagination.

**Auth Required:** Yes (must own form)

**Input:**

```typescript
{
  formId: number;
  limit?: number;    // 1-100, default: 20
  offset?: number;   // default: 0
}
```

**Output:**

```typescript
{
  items: FormResponse[];
  total: number;
  hasMore: boolean;
}
```

---

### `getById`

Get a single response with all field values.

**Auth Required:** Yes (must own form)

**Input:**

```typescript
{
  responseId: number;
}
```

**Output:**

```typescript
FormResponse & {
  form: Form;
  responseFields: FormResponseField[];
  createdBy?: User;
}
```

---

### `delete`

Delete a response.

**Auth Required:** Yes (must own form)

**Input:**

```typescript
{
  responseId: number;
}
```

**Output:**

```typescript
{
  success: boolean;
}
```

---

### `export`

Export all responses as CSV-ready data.

**Auth Required:** Yes (must own form)

**Input:**

```typescript
{
  formId: number;
}
```

**Output:**

```typescript
{
  data: Record<string, string>[];
  headers: string[];
}
```

**Response Format:**
Each row includes: Response ID, Submitted At, Submitter Name, Submitter Email, Rating, Comments, and all field values.

---

### `getStats`

Get response statistics for a form.

**Auth Required:** Yes (must own form)

**Input:**

```typescript
{
  formId: number;
}
```

**Output:**

```typescript
{
  total: number;
  anonymous: number;
  authenticated: number;
  averageRating: number | null;
}
```

---

## Public Router (`api.public.*`)

### `getFormBySlug`

Get a form by slug for public viewing/submission.

**Auth Required:** No

**Input:**

```typescript
{
  slug: string;
}
```

**Output:**

```typescript
Form & {
  fields: FormField[];
  createdBy: {
    id: string;
    name: string;
  };
}
```

**Access Rules:**

- Form must be public OR user must be the owner
- Form must be published (unless user is owner)

---

### `checkFormAccess`

Check if a form exists and is accessible.

**Auth Required:** No

**Input:**

```typescript
{
  slug: string;
}
```

**Output:**

```typescript
{
  exists: boolean;
  accessible: boolean;
  requiresAuth: boolean;
  isPublished: boolean;
  isOwner?: boolean;
  formName?: string;
}
```

---

## Database Schema Summary

### Forms

- `id`, `name`, `slug` (unique), `description`, `status` (draft/published/archived)
- `isPublic`, `allowAnonymous`, `createdById`, `createdAt`, `updatedAt`

### Form Fields

- `id`, `formId`, `label`, `type`, `placeholder`, `helpText`, `required`, `order`
- `regexPattern`, `validationMessage`, `createdAt`, `updatedAt`

### Form Field Options

- `id`, `formFieldId`, `optionLabel`, `optionValue`, `createdAt`, `updatedAt`

### Form Responses

- `id`, `formId`, `createdById`, `submitterEmail`, `isAnonymous`, `ipAddress`
- `rating`, `comments`, `createdAt`, `updatedAt`

### Form Response Fields

- `id`, `formResponseId`, `formFieldId`, `value`, `createdAt`, `updatedAt`

---

## Usage Examples

### Creating a Form with Fields

```typescript
// 1. Create form
const form = await api.forms.create.mutate({
  name: "Customer Feedback",
  description: "Tell us about your experience",
  isPublic: true,
  allowAnonymous: true,
});

// 2. Add fields
await api.formFields.create.mutate({
  formId: form.id,
  label: "Your Name",
  type: "text",
  required: true,
});

await api.formFields.create.mutate({
  formId: form.id,
  label: "How satisfied are you?",
  type: "radio",
  required: true,
  options: [
    { label: "Very Satisfied", value: "5" },
    { label: "Satisfied", value: "4" },
    { label: "Neutral", value: "3" },
    { label: "Unsatisfied", value: "2" },
    { label: "Very Unsatisfied", value: "1" },
  ],
});

// 3. Publish form
await api.forms.update.mutate({
  id: form.id,
  status: "published",
});
```

### Submitting a Response

```typescript
await api.formResponses.submit.mutate({
  formId: 1,
  fields: [
    { fieldId: 1, value: "John Doe" },
    { fieldId: 2, value: "5" },
  ],
  rating: 5,
  comments: "Great service!",
});
```

### Viewing Responses

```typescript
const responses = await api.formResponses.list.query({
  formId: 1,
  limit: 20,
  offset: 0,
});

const stats = await api.formResponses.getStats.query({
  formId: 1,
});

const csvData = await api.formResponses.export.query({
  formId: 1,
});
```

---

## Error Handling

All endpoints use tRPC error codes:

- `UNAUTHORIZED` - Not logged in when required
- `FORBIDDEN` - Not authorized to access resource
- `NOT_FOUND` - Resource doesn't exist
- `BAD_REQUEST` - Invalid input or business logic violation

---

## Future Enhancements

Potential additions marked with `// TODO:` in code:

- Field-level statistics
- Response completion time tracking
- Conditional field logic
- File upload fields
- Email notifications
- Response editing
- Form templates
- Collaborative form editing
