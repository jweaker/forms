import { TRPCError } from "@trpc/server";
import { and, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import {
  forms,
  formResponses,
  formFields,
  formVersionHistory,
} from "~/server/db/schema";

// Helper function to generate slug from name
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "") // Remove special characters
    .replace(/\s+/g, "-") // Replace spaces with hyphens
    .replace(/-+/g, "-") // Replace multiple hyphens with single hyphen
    .substring(0, 256); // Limit to schema length
}

export const formsRouter = createTRPCRouter({
  /**
   * Get all forms created by the authenticated user
   */
  list: protectedProcedure
    .input(
      z
        .object({
          limit: z.number().min(1).max(100).default(20),
          offset: z.number().min(0).default(0),
          status: z.enum(["draft", "published", "archived"]).optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const { limit = 20, offset = 0, status } = input ?? {};

      const conditions = [eq(forms.createdById, ctx.session.user.id)];
      if (status) {
        conditions.push(eq(forms.status, status));
      }

      const items = await ctx.db.query.forms.findMany({
        where: and(...conditions),
        orderBy: [desc(forms.updatedAt)],
        limit,
        offset,
        with: {
          fields: {
            orderBy: (fields, { asc }) => [asc(fields.order)],
          },
        },
      });

      // Get response counts for each form
      const itemsWithCounts = await Promise.all(
        items.map(async (item) => {
          const responseCountResult = await ctx.db
            .select({ count: sql<number>`count(*)` })
            .from(formResponses)
            .where(eq(formResponses.formId, item.id));

          return {
            ...item,
            responseCount: responseCountResult[0]?.count ?? 0,
          };
        }),
      );

      // Get total count for pagination
      const countResult = await ctx.db
        .select({ count: sql<number>`count(*)` })
        .from(forms)
        .where(and(...conditions));

      const total = countResult[0]?.count ?? 0;

      return {
        items: itemsWithCounts,
        total,
        hasMore: offset + limit < total,
      };
    }),

  /**
   * Get a single form by ID (only if user owns it)
   */
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const form = await ctx.db.query.forms.findFirst({
        where: and(
          eq(forms.id, input.id),
          eq(forms.createdById, ctx.session.user.id),
        ),
        with: {
          fields: {
            orderBy: (fields, { asc }) => [asc(fields.order)],
          },
          responses: {
            orderBy: (responses, { desc }) => [desc(responses.createdAt)],
            limit: 10, // Latest 10 responses for overview
          },
        },
      });

      if (!form) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Form not found",
        });
      }

      // Get total response count
      const countResult = await ctx.db
        .select({ responseCount: sql<number>`count(*)` })
        .from(forms)
        .where(eq(forms.id, input.id));

      return {
        ...form,
        responseCount: countResult[0]?.responseCount ?? 0,
      };
    }),

  /**
   * Get a form by slug (only if user owns it)
   */
  getBySlug: protectedProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ ctx, input }) => {
      const form = await ctx.db.query.forms.findFirst({
        where: and(
          eq(forms.slug, input.slug),
          eq(forms.createdById, ctx.session.user.id),
        ),
        with: {
          fields: {
            orderBy: (fields, { asc }) => [asc(fields.order)],
          },
        },
      });

      if (!form) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Form not found",
        });
      }

      return form;
    }),

  /**
   * Create a new form
   */
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(256),
        description: z.string().optional(),
        isPublic: z.boolean().default(false),
        allowAnonymous: z.boolean().default(true),
        allowEditing: z.boolean().default(false),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Generate unique slug
      let slug = generateSlug(input.name);
      let counter = 1;

      // Check if slug exists, append counter if needed
      while (true) {
        const existing = await ctx.db.query.forms.findFirst({
          where: eq(forms.slug, slug),
        });

        if (!existing) break;

        slug = `${generateSlug(input.name)}-${counter}`;
        counter++;
      }

      const [form] = await ctx.db
        .insert(forms)
        .values({
          name: input.name,
          slug,
          description: input.description,
          isPublic: input.isPublic,
          allowAnonymous: input.allowAnonymous,
          allowEditing: input.allowEditing,
          status: "draft",
          createdById: ctx.session.user.id,
        })
        .returning();

      return form;
    }),

  /**
   * Update form details (not fields)
   */
  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().min(1).max(256).optional(),
        slug: z.string().min(1).max(256).optional(),
        description: z.string().optional(),
        isPublic: z.boolean().optional(),
        allowAnonymous: z.boolean().optional(),
        allowMultipleSubmissions: z.boolean().optional(),
        allowEditing: z.boolean().optional(),
        status: z.enum(["draft", "published", "archived"]).optional(),
        openTime: z.date().nullable().optional(),
        deadline: z.date().nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Verify ownership
      const existing = await ctx.db.query.forms.findFirst({
        where: and(
          eq(forms.id, input.id),
          eq(forms.createdById, ctx.session.user.id),
        ),
      });

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Form not found",
        });
      }

      // Handle slug changes
      let slug = existing.slug;
      if (input.slug !== undefined && input.slug !== existing.slug) {
        // User provided a custom slug
        slug = generateSlug(input.slug);

        // Check if slug is already taken by another form
        const slugExists = await ctx.db.query.forms.findFirst({
          where: and(
            eq(forms.slug, slug),
            // Not the current form
            sql`${forms.id} != ${input.id}`,
          ),
        });

        if (slugExists) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              "This slug is already taken. Please choose a different one.",
          });
        }
      } else if (input.name && input.name !== existing.name && !input.slug) {
        // Auto-generate slug from name if name changed but no custom slug provided
        slug = generateSlug(input.name);
        let counter = 1;

        // Check if new slug exists
        while (true) {
          const slugExists = await ctx.db.query.forms.findFirst({
            where: and(eq(forms.slug, slug), sql`${forms.id} != ${input.id}`),
          });

          if (!slugExists) break;

          slug = `${generateSlug(input.name)}-${counter}`;
          counter++;
        }
      }

      const [updated] = await ctx.db
        .update(forms)
        .set({
          name: input.name,
          slug: slug !== existing.slug ? slug : undefined,
          description: input.description,
          isPublic: input.isPublic,
          allowAnonymous: input.allowAnonymous,
          allowMultipleSubmissions: input.allowMultipleSubmissions,
          allowEditing: input.allowEditing,
          status: input.status,
          openTime: input.openTime !== undefined ? input.openTime : undefined,
          deadline: input.deadline !== undefined ? input.deadline : undefined,
        })
        .where(eq(forms.id, input.id))
        .returning();

      return updated;
    }),

  /**
   * Batch save form fields with versioning support
   * Detects version-breaking changes (type change or deletion) and creates new version if needed
   */
  batchSaveFields: protectedProcedure
    .input(
      z.object({
        formId: z.number(),
        fields: z.array(
          z.object({
            id: z.number().optional(), // undefined for new fields
            label: z.string().min(1).max(256),
            type: z.string().min(1).max(100),
            placeholder: z.string().max(256).nullable().optional(),
            helpText: z.string().nullable().optional(),
            required: z.boolean(),
            order: z.number(),
            regexPattern: z.string().nullable().optional(),
            validationMessage: z.string().nullable().optional(),
            allowMultiple: z.boolean().nullable().optional(),
            selectionLimit: z.number().nullable().optional(),
            minValue: z.number().nullable().optional(),
            maxValue: z.number().nullable().optional(),
            defaultValue: z.string().nullable().optional(),
            options: z.string().nullable().optional(),
          }),
        ),
        openTime: z.date().nullable().optional(),
        deadline: z.date().nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Verify ownership
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

      // Helper function to check if type change is data-incompatible
      const isIncompatibleTypeChange = (
        oldType: string,
        newType: string,
      ): boolean => {
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

        return !compatiblePairs.some(
          ([a, b]) => a === oldType && b === newType,
        );
      };

      // Helper function to check if regex change invalidates existing data
      const hasRegexInvalidation = (
        oldRegex: string | null,
        newRegex: string | null,
      ): boolean => {
        // Adding or changing regex can invalidate existing data
        // Removing regex doesn't invalidate data
        if (!oldRegex && newRegex) return true; // Adding new validation
        if (oldRegex && newRegex && oldRegex !== newRegex) return true; // Changing validation
        return false;
      };

      // Detect version-breaking changes
      const existingFieldsMap = new Map(form.fields.map((f) => [f.id, f]));
      const incomingFieldIds = new Set(
        input.fields.filter((f) => f.id).map((f) => f.id!),
      );

      let hasVersionBreakingChange = false;

      // Check for deleted fields
      for (const existingField of form.fields) {
        if (!incomingFieldIds.has(existingField.id)) {
          hasVersionBreakingChange = true;
          break;
        }
      }

      // Check for data-incompatible changes
      if (!hasVersionBreakingChange) {
        for (const incomingField of input.fields) {
          if (incomingField.id) {
            const existingField = existingFieldsMap.get(incomingField.id);
            if (existingField) {
              // Check for incompatible type changes
              if (
                isIncompatibleTypeChange(existingField.type, incomingField.type)
              ) {
                hasVersionBreakingChange = true;
                break;
              }

              // Check for validation changes that can invalidate data
              if (
                hasRegexInvalidation(
                  existingField.regexPattern,
                  incomingField.regexPattern ?? null,
                )
              ) {
                hasVersionBreakingChange = true;
                break;
              }

              // Check if field becomes required (can invalidate empty existing data)
              if (!existingField.required && incomingField.required) {
                hasVersionBreakingChange = true;
                break;
              }

              // Check if min/max constraints become stricter
              if (
                existingField.type === "number" ||
                existingField.type === "range"
              ) {
                const oldMin = existingField.minValue;
                const oldMax = existingField.maxValue;
                const newMin = incomingField.minValue ?? null;
                const newMax = incomingField.maxValue ?? null;

                // Min increases or max decreases = stricter constraints
                if (
                  (newMin !== null && (oldMin === null || newMin > oldMin)) ||
                  (newMax !== null && (oldMax === null || newMax < oldMax))
                ) {
                  hasVersionBreakingChange = true;
                  break;
                }
              }
            }
          }
        }
      }

      let newVersion = form.currentVersion;

      // If version-breaking change detected, increment version and create snapshot
      if (hasVersionBreakingChange) {
        newVersion = form.currentVersion + 1;

        // Create version snapshot
        const snapshot = {
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

        await ctx.db.insert(formVersionHistory).values({
          formId: form.id,
          version: form.currentVersion,
          snapshot: JSON.stringify(snapshot),
          createdById: ctx.session.user.id,
        });

        // Update form version
        await ctx.db
          .update(forms)
          .set({ currentVersion: newVersion })
          .where(eq(forms.id, form.id));
      }

      // Update openTime and deadline if provided
      if (input.openTime !== undefined || input.deadline !== undefined) {
        await ctx.db
          .update(forms)
          .set({
            openTime: input.openTime !== undefined ? input.openTime : undefined,
            deadline: input.deadline !== undefined ? input.deadline : undefined,
          })
          .where(eq(forms.id, form.id));
      }

      // Delete removed fields
      const fieldsToDelete = form.fields.filter(
        (f) => !incomingFieldIds.has(f.id),
      );
      for (const field of fieldsToDelete) {
        await ctx.db.delete(formFields).where(eq(formFields.id, field.id));
      }

      // Update existing fields and create new ones
      const updatedFields = [];
      for (const field of input.fields) {
        if (field.id) {
          // Update existing field
          const [updated] = await ctx.db
            .update(formFields)
            .set({
              label: field.label,
              type: field.type,
              placeholder: field.placeholder,
              helpText: field.helpText,
              required: field.required,
              order: field.order,
              regexPattern: field.regexPattern,
              validationMessage: field.validationMessage,
              allowMultiple: field.allowMultiple,
              selectionLimit: field.selectionLimit,
              minValue: field.minValue,
              maxValue: field.maxValue,
              defaultValue: field.defaultValue,
              options: field.options,
              version: newVersion, // Update version
            })
            .where(eq(formFields.id, field.id))
            .returning();
          updatedFields.push(updated);
        } else {
          // Create new field
          const [created] = await ctx.db
            .insert(formFields)
            .values({
              formId: form.id,
              label: field.label,
              type: field.type,
              placeholder: field.placeholder,
              helpText: field.helpText,
              required: field.required,
              order: field.order,
              regexPattern: field.regexPattern,
              validationMessage: field.validationMessage,
              allowMultiple: field.allowMultiple,
              selectionLimit: field.selectionLimit,
              minValue: field.minValue,
              maxValue: field.maxValue,
              defaultValue: field.defaultValue,
              options: field.options,
              version: newVersion, // Set version
            })
            .returning();
          updatedFields.push(created);
        }
      }

      return {
        success: true,
        versionChanged: hasVersionBreakingChange,
        newVersion,
        fields: updatedFields,
      };
    }),

  /**
   * Delete a form (cascades to fields and responses)
   */
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      // Verify ownership
      const existing = await ctx.db.query.forms.findFirst({
        where: and(
          eq(forms.id, input.id),
          eq(forms.createdById, ctx.session.user.id),
        ),
      });

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Form not found",
        });
      }

      await ctx.db.delete(forms).where(eq(forms.id, input.id));

      return { success: true };
    }),

  /**
   * Duplicate a form (with all fields but no responses)
   */
  duplicate: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      // Get original form with fields
      const original = await ctx.db.query.forms.findFirst({
        where: and(
          eq(forms.id, input.id),
          eq(forms.createdById, ctx.session.user.id),
        ),
        with: {
          fields: {
            orderBy: (fields, { asc }) => [asc(fields.order)],
          },
        },
      });

      if (!original) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Form not found",
        });
      }

      // Generate unique slug for duplicate
      let slug = `${original.slug}-copy`;
      let counter = 1;

      while (true) {
        const existing = await ctx.db.query.forms.findFirst({
          where: eq(forms.slug, slug),
        });

        if (!existing) break;

        slug = `${original.slug}-copy-${counter}`;
        counter++;
      }

      // Create new form
      const [newForm] = await ctx.db
        .insert(forms)
        .values({
          name: `${original.name} (Copy)`,
          slug,
          description: original.description,
          isPublic: original.isPublic,
          allowAnonymous: original.allowAnonymous,
          allowEditing: original.allowEditing,
          status: "draft", // Always start as draft
          createdById: ctx.session.user.id,
        })
        .returning();

      // TODO: Copy fields and options
      // This would require importing formFields and formFieldOptions schemas
      // and creating the fields with their options

      return newForm;
    }),

  /**
   * Get form statistics
   */
  getStats: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      // Verify ownership
      const form = await ctx.db.query.forms.findFirst({
        where: and(
          eq(forms.id, input.id),
          eq(forms.createdById, ctx.session.user.id),
        ),
        with: {
          fields: {
            orderBy: (fields, { asc }) => [asc(fields.order)],
          },
        },
      });

      if (!form) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Form not found",
        });
      }

      // Get various statistics
      const [totalResponses] = await ctx.db
        .select({ count: sql<number>`count(*)` })
        .from(forms)
        .where(eq(forms.id, input.id));

      // TODO: Add more statistics like:
      // - Anonymous vs authenticated responses
      // - Responses per day/week/month
      // - Average completion time
      // - Field-level statistics

      return {
        totalResponses: totalResponses?.count ?? 0,
      };
    }),

  /**
   * Get all versions of a form (from version history)
   */
  getVersionHistory: protectedProcedure
    .input(z.object({ formId: z.number() }))
    .query(async ({ ctx, input }) => {
      // Verify ownership
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

      // Get all version snapshots
      const { formVersionHistory } = await import("~/server/db/schema");
      const versions = await ctx.db.query.formVersionHistory.findMany({
        where: eq(formVersionHistory.formId, input.formId),
        orderBy: (versionHistory, { desc }) => [desc(versionHistory.version)],
      });

      return versions;
    }),

  /**
   * Get form structure for a specific version
   */
  getFormVersion: protectedProcedure
    .input(z.object({ formId: z.number(), version: z.number() }))
    .query(async ({ ctx, input }) => {
      // Verify ownership
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

      // If requesting current version, return current fields
      if (input.version === form.currentVersion) {
        return {
          version: form.currentVersion,
          name: form.name,
          description: form.description,
          fields: form.fields,
        };
      }

      // Otherwise, get from version history
      const { formVersionHistory } = await import("~/server/db/schema");
      const versionSnapshot = await ctx.db.query.formVersionHistory.findFirst({
        where: and(
          eq(formVersionHistory.formId, input.formId),
          eq(formVersionHistory.version, input.version),
        ),
      });

      if (!versionSnapshot) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Version not found",
        });
      }

      // Parse the snapshot data
      try {
        const snapshot = JSON.parse(versionSnapshot.snapshot) as {
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
        };

        return {
          version: input.version,
          ...snapshot,
        };
      } catch {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to parse version snapshot",
        });
      }
    }),
});
