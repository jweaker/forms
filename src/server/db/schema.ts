import { relations, sql } from "drizzle-orm";
import { index, sqliteTable } from "drizzle-orm/sqlite-core";

export const forms = sqliteTable(
  "forms",
  (d) => ({
    id: d.integer({ mode: "number" }).primaryKey({ autoIncrement: true }),
    name: d.text({ length: 256 }).notNull(),
    slug: d.text({ length: 256 }).notNull().unique(),
    description: d.text(),
    status: d.text({ length: 50 }).default("draft").notNull(), // draft, published, archived
    isPublic: d.integer({ mode: "boolean" }).default(false).notNull(),
    allowAnonymous: d.integer({ mode: "boolean" }).default(true).notNull(),
    createdById: d
      .text({ length: 255 })
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: d
      .integer({ mode: "timestamp" })
      .default(sql`(unixepoch())`)
      .notNull(),
    updatedAt: d.integer({ mode: "timestamp" }).$onUpdate(() => new Date()),
  }),
  (t) => [
    index("forms_created_by_idx").on(t.createdById),
    index("forms_name_idx").on(t.name),
    index("forms_slug_idx").on(t.slug),
    index("forms_status_idx").on(t.status),
  ],
);
export const formFields = sqliteTable(
  "form_fields",
  (d) => ({
    id: d.integer({ mode: "number" }).primaryKey({ autoIncrement: true }),
    formId: d
      .integer({ mode: "number" })
      .notNull()
      .references(() => forms.id, { onDelete: "cascade" }),
    label: d.text({ length: 256 }).notNull(),
    type: d.text({ length: 100 }).notNull(),
    placeholder: d.text({ length: 256 }),
    helpText: d.text(),
    required: d.integer({ mode: "boolean" }).default(false).notNull(),
    order: d.integer({ mode: "number" }).notNull().default(0),
    regexPattern: d.text(), // For validation
    validationMessage: d.text(),
    createdAt: d
      .integer({ mode: "timestamp" })
      .default(sql`(unixepoch())`)
      .notNull(),
    updatedAt: d.integer({ mode: "timestamp" }).$onUpdate(() => new Date()),
  }),
  (t) => [
    index("form_fields_form_id_idx").on(t.formId),
    index("form_fields_order_idx").on(t.formId, t.order),
  ],
);
export const formFieldOptions = sqliteTable(
  "form_field_options",
  (d) => ({
    id: d.integer({ mode: "number" }).primaryKey({ autoIncrement: true }),
    formFieldId: d
      .integer({ mode: "number" })
      .notNull()
      .references(() => formFields.id, { onDelete: "cascade" }),
    optionLabel: d.text({ length: 256 }).notNull(),
    optionValue: d.text({ length: 256 }).notNull(),
    createdAt: d
      .integer({ mode: "timestamp" })
      .default(sql`(unixepoch())`)
      .notNull(),
    updatedAt: d.integer({ mode: "timestamp" }).$onUpdate(() => new Date()),
  }),
  (t) => [index("form_field_options_field_id_idx").on(t.formFieldId)],
);
// export const formResponsesFields = sqliteTable();
export const formResponses = sqliteTable(
  "form_responses",
  (d) => ({
    id: d.integer({ mode: "number" }).primaryKey({ autoIncrement: true }),
    formId: d
      .integer({ mode: "number" })
      .notNull()
      .references(() => forms.id, { onDelete: "cascade" }),
    // Nullable for guest submissions
    createdById: d
      .text({ length: 255 })
      .references(() => user.id, { onDelete: "set null" }),
    // For guest/anonymous submissions
    submitterEmail: d.text({ length: 255 }),
    isAnonymous: d.integer({ mode: "boolean" }).default(false).notNull(),
    ipAddress: d.text({ length: 255 }),
    createdAt: d
      .integer({ mode: "timestamp" })
      .default(sql`(unixepoch())`)
      .notNull(),
    updatedAt: d.integer({ mode: "timestamp" }).$onUpdate(() => new Date()),
    rating: d.integer({ mode: "number" }),
    comments: d.text(),
  }),
  (t) => [
    index("form_responses_created_by_idx").on(t.createdById),
    index("form_responses_form_id_idx").on(t.formId),
    index("form_responses_submitter_email_idx").on(t.submitterEmail),
  ],
);
export const formResponseFields = sqliteTable(
  "form_response_fields",
  (d) => ({
    id: d.integer({ mode: "number" }).primaryKey({ autoIncrement: true }),
    formResponseId: d
      .integer({ mode: "number" })
      .notNull()
      .references(() => formResponses.id, { onDelete: "cascade" }),
    formFieldId: d
      .integer({ mode: "number" })
      .notNull()
      .references(() => formFields.id, { onDelete: "cascade" }),
    value: d.text().notNull(),
    createdAt: d
      .integer({ mode: "timestamp" })
      .default(sql`(unixepoch())`)
      .notNull(),
    updatedAt: d.integer({ mode: "timestamp" }).$onUpdate(() => new Date()),
  }),
  (t) => [index("form_response_fields_response_id_idx").on(t.formResponseId)],
);

// Better Auth core tables
export const user = sqliteTable("user", (d) => ({
  id: d
    .text({ length: 255 })
    .notNull()
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: d.text({ length: 255 }),
  email: d.text({ length: 255 }).notNull().unique(),
  emailVerified: d.integer({ mode: "boolean" }).default(false),
  image: d.text({ length: 255 }),
  createdAt: d
    .integer({ mode: "timestamp" })
    .default(sql`(unixepoch())`)
    .notNull(),
  updatedAt: d.integer({ mode: "timestamp" }).$onUpdate(() => new Date()),
}));

export const userRelations = relations(user, ({ many }) => ({
  account: many(account),
  session: many(session),
}));

export const account = sqliteTable(
  "account",
  (d) => ({
    id: d
      .text({ length: 255 })
      .notNull()
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: d
      .text({ length: 255 })
      .notNull()
      .references(() => user.id),
    accountId: d.text({ length: 255 }).notNull(),
    providerId: d.text({ length: 255 }).notNull(),
    accessToken: d.text(),
    refreshToken: d.text(),
    accessTokenExpiresAt: d.integer({ mode: "timestamp" }),
    refreshTokenExpiresAt: d.integer({ mode: "timestamp" }),
    scope: d.text({ length: 255 }),
    idToken: d.text(),
    password: d.text(),
    createdAt: d
      .integer({ mode: "timestamp" })
      .default(sql`(unixepoch())`)
      .notNull(),
    updatedAt: d.integer({ mode: "timestamp" }).$onUpdate(() => new Date()),
  }),
  (t) => [index("account_user_id_idx").on(t.userId)],
);

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, { fields: [account.userId], references: [user.id] }),
}));

export const session = sqliteTable(
  "session",
  (d) => ({
    id: d
      .text({ length: 255 })
      .notNull()
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: d
      .text({ length: 255 })
      .notNull()
      .references(() => user.id),
    token: d.text({ length: 255 }).notNull().unique(),
    expiresAt: d.integer({ mode: "timestamp" }).notNull(),
    ipAddress: d.text({ length: 255 }),
    userAgent: d.text({ length: 255 }),
    createdAt: d
      .integer({ mode: "timestamp" })
      .default(sql`(unixepoch())`)
      .notNull(),
    updatedAt: d.integer({ mode: "timestamp" }).$onUpdate(() => new Date()),
  }),
  (t) => [index("session_user_id_idx").on(t.userId)],
);

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, { fields: [session.userId], references: [user.id] }),
}));

// Form relations
export const formsRelations = relations(forms, ({ one, many }) => ({
  createdBy: one(user, { fields: [forms.createdById], references: [user.id] }),
  fields: many(formFields),
  responses: many(formResponses),
}));

export const formFieldsRelations = relations(formFields, ({ one, many }) => ({
  form: one(forms, { fields: [formFields.formId], references: [forms.id] }),
  options: many(formFieldOptions),
  responseFields: many(formResponseFields),
}));

export const formFieldOptionsRelations = relations(
  formFieldOptions,
  ({ one }) => ({
    formField: one(formFields, {
      fields: [formFieldOptions.formFieldId],
      references: [formFields.id],
    }),
  }),
);

export const formResponsesRelations = relations(
  formResponses,
  ({ one, many }) => ({
    form: one(forms, {
      fields: [formResponses.formId],
      references: [forms.id],
    }),
    createdBy: one(user, {
      fields: [formResponses.createdById],
      references: [user.id],
    }),
    responseFields: many(formResponseFields),
  }),
);

export const formResponseFieldsRelations = relations(
  formResponseFields,
  ({ one }) => ({
    formResponse: one(formResponses, {
      fields: [formResponseFields.formResponseId],
      references: [formResponses.id],
    }),
    formField: one(formFields, {
      fields: [formResponseFields.formFieldId],
      references: [formFields.id],
    }),
  }),
);

export const verification = sqliteTable(
  "verification",
  (d) => ({
    id: d
      .text({ length: 255 })
      .notNull()
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    identifier: d.text({ length: 255 }).notNull(),
    value: d.text({ length: 255 }).notNull(),
    expiresAt: d.integer({ mode: "timestamp" }).notNull(),
    createdAt: d
      .integer({ mode: "timestamp" })
      .default(sql`(unixepoch())`)
      .notNull(),
    updatedAt: d.integer({ mode: "timestamp" }).$onUpdate(() => new Date()),
  }),
  (t) => [index("verification_identifier_idx").on(t.identifier)],
);
