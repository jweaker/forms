import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { formFields, forms } from "~/server/db/schema";
import { sanitizeInput } from "~/lib/utils";

export const formFieldsRouter = createTRPCRouter({
  /**
   * Add a new field to a form
   */
  create: protectedProcedure
    .input(
      z.object({
        formId: z.number(),
        label: z.string().min(1).max(256),
        type: z.string().max(100),
        placeholder: z.string().max(256).optional(),
        helpText: z.string().optional(),
        required: z.boolean().default(false),
        regexPattern: z.string().optional(),
        validationMessage: z.string().optional(),
        // Multi-select configuration
        allowMultiple: z.boolean().optional(),
        selectionLimit: z.number().optional(),
        // Number/Range configuration
        minValue: z.number().optional(),
        maxValue: z.number().optional(),
        // Default value
        defaultValue: z.string().optional(),
        // Options with isDefault support
        options: z
          .array(
            z.object({
              label: z.string().min(1).max(256),
              isDefault: z.boolean().optional(),
            }),
          )
          .optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Verify form ownership
      const form = await ctx.db.query.forms.findFirst({
        where: and(
          eq(forms.id, input.formId),
          eq(forms.createdById, ctx.session.user.id),
        ),
      });

      if (!form) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Form not found",
        });
      }

      // Sanitize inputs
      const label = sanitizeInput(input.label, 256) ?? "Untitled Field";
      const placeholder = sanitizeInput(input.placeholder, 256) ?? undefined;
      const helpText = sanitizeInput(input.helpText, 1000) ?? undefined;
      const regexPattern = sanitizeInput(input.regexPattern, 500) ?? undefined;
      const validationMessage =
        sanitizeInput(input.validationMessage, 256) ?? undefined;
      const defaultValue = sanitizeInput(input.defaultValue, 1000) ?? undefined;

      // Get the highest order value to append new field at the end
      const existingFields = await ctx.db.query.formFields.findMany({
        where: eq(formFields.formId, input.formId),
        orderBy: (fields, { desc }) => [desc(fields.order)],
        limit: 1,
      });

      const nextOrder = existingFields[0] ? existingFields[0].order + 1 : 0;

      // Create the field
      const [field] = await ctx.db
        .insert(formFields)
        .values({
          formId: input.formId,
          label,
          type: input.type,
          placeholder,
          helpText,
          required: input.required,
          order: nextOrder,
          regexPattern,
          validationMessage,
          allowMultiple: input.allowMultiple,
          selectionLimit: input.selectionLimit,
          minValue: input.minValue,
          maxValue: input.maxValue,
          defaultValue,
          // Store options as JSON string
          options: input.options ? JSON.stringify(input.options) : null,
        })
        .returning();

      return field;
    }),

  /**
   * Update an existing field
   */
  update: protectedProcedure
    .input(
      z.object({
        fieldId: z.number(),
        label: z.string().min(1).max(256).optional(),
        type: z.string().max(100).optional(),
        placeholder: z.string().max(256).optional(),
        helpText: z.string().optional(),
        required: z.boolean().optional(),
        regexPattern: z.string().optional(),
        validationMessage: z.string().optional(),
        // Multi-select configuration
        allowMultiple: z.boolean().optional(),
        selectionLimit: z.number().optional(),
        // Number/Range configuration
        minValue: z.number().optional(),
        maxValue: z.number().optional(),
        // Default value
        defaultValue: z.string().optional(),
        // Options with isDefault support
        options: z
          .array(
            z.object({
              label: z.string().min(1).max(256),
              isDefault: z.boolean().optional(),
            }),
          )
          .optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Get field and verify form ownership
      const field = await ctx.db.query.formFields.findFirst({
        where: eq(formFields.id, input.fieldId),
        with: {
          form: true,
        },
      });

      if (!field) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Field not found",
        });
      }

      if (field.form.createdById !== ctx.session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to edit this field",
        });
      }

      // Update the field
      await ctx.db
        .update(formFields)
        .set({
          label: input.label,
          type: input.type,
          placeholder: input.placeholder,
          helpText: input.helpText,
          required: input.required,
          regexPattern: input.regexPattern,
          validationMessage: input.validationMessage,
          allowMultiple: input.allowMultiple,
          selectionLimit: input.selectionLimit,
          minValue: input.minValue,
          maxValue: input.maxValue,
          defaultValue: input.defaultValue,
          // Store options as JSON string
          options:
            input.options !== undefined
              ? JSON.stringify(input.options)
              : undefined,
        })
        .where(eq(formFields.id, input.fieldId));

      // Return updated field
      const updated = await ctx.db.query.formFields.findFirst({
        where: eq(formFields.id, input.fieldId),
      });

      return updated;
    }),

  /**
   * Delete a field
   */
  delete: protectedProcedure
    .input(z.object({ fieldId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      // Get field and verify form ownership
      const field = await ctx.db.query.formFields.findFirst({
        where: eq(formFields.id, input.fieldId),
        with: {
          form: true,
        },
      });

      if (!field) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Field not found",
        });
      }

      if (field.form.createdById !== ctx.session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to delete this field",
        });
      }

      await ctx.db.delete(formFields).where(eq(formFields.id, input.fieldId));

      return { success: true };
    }),

  /**
   * Reorder fields within a form
   */
  reorder: protectedProcedure
    .input(
      z.object({
        formId: z.number(),
        fieldIds: z.array(z.number()), // Array of field IDs in the desired order
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Verify form ownership
      const form = await ctx.db.query.forms.findFirst({
        where: and(
          eq(forms.id, input.formId),
          eq(forms.createdById, ctx.session.user.id),
        ),
        with: {
          fields: true,
        },
      });

      if (!form) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Form not found",
        });
      }

      // Verify all field IDs belong to this form
      const formFieldIds = form.fields.map((f) => f.id);
      const allFieldsValid = input.fieldIds.every((id) =>
        formFieldIds.includes(id),
      );

      if (!allFieldsValid) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Some field IDs do not belong to this form",
        });
      }

      // Update order for each field
      await Promise.all(
        input.fieldIds.map((fieldId, index) =>
          ctx.db
            .update(formFields)
            .set({ order: index })
            .where(eq(formFields.id, fieldId)),
        ),
      );

      return { success: true };
    }),

  /**
   * Duplicate a field within the same form
   */
  duplicate: protectedProcedure
    .input(z.object({ fieldId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      // Get field and verify form ownership
      const field = await ctx.db.query.formFields.findFirst({
        where: eq(formFields.id, input.fieldId),
        with: {
          form: true,
        },
      });

      if (!field) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Field not found",
        });
      }

      if (field.form.createdById !== ctx.session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to duplicate this field",
        });
      }

      // Get the highest order value
      const existingFields = await ctx.db.query.formFields.findMany({
        where: eq(formFields.formId, field.formId),
        orderBy: (fields, { desc }) => [desc(fields.order)],
        limit: 1,
      });

      const nextOrder = existingFields[0] ? existingFields[0].order + 1 : 0;

      // Create duplicate field
      const [newField] = await ctx.db
        .insert(formFields)
        .values({
          formId: field.formId,
          label: `${field.label} (Copy)`,
          type: field.type,
          placeholder: field.placeholder,
          helpText: field.helpText,
          required: field.required,
          order: nextOrder,
          regexPattern: field.regexPattern,
          validationMessage: field.validationMessage,
          allowMultiple: field.allowMultiple,
          selectionLimit: field.selectionLimit,
          minValue: field.minValue,
          maxValue: field.maxValue,
          defaultValue: field.defaultValue,
          // Copy options as-is (already JSON string)
          options: field.options,
        })
        .returning();

      return newField;
    }),
});
