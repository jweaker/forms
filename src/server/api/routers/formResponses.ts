import { TRPCError } from "@trpc/server";
import { and, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";

import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";
import {
  formResponseFields,
  formResponses,
  forms,
  formResponseHistory,
} from "~/server/db/schema";

export const formResponsesRouter = createTRPCRouter({
  /**
   * Submit a response to a form (authenticated or anonymous)
   */
  submit: publicProcedure
    .input(
      z.object({
        formId: z.number(),
        fields: z.array(
          z.object({
            fieldId: z.number(),
            value: z.union([z.string(), z.array(z.string())]), // string for single, array for multi-select
          }),
        ),
        submitterEmail: z.string().email().optional(),
        isAnonymous: z.boolean().default(false),
        rating: z.number().min(1).max(5).optional(),
        comments: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Get form to check if submissions are allowed
      const form = await ctx.db.query.forms.findFirst({
        where: eq(forms.id, input.formId),
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

      // Check if form is published
      if (form.status !== "published") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This form is not accepting responses",
        });
      }

      // Check if form is not yet open
      if (form.openTime && new Date() < form.openTime) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This form is not yet open for responses",
        });
      }

      // Check if deadline has passed
      if (form.deadline && new Date() > form.deadline) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "This form is no longer accepting responses (deadline passed)",
        });
      }

      // Check if anonymous submissions are allowed
      if (!ctx.session?.user && !form.allowAnonymous) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "This form requires authentication to submit",
        });
      }

      // Check if multiple submissions are allowed
      if (!form.allowMultipleSubmissions && ctx.session?.user) {
        const existingResponse = await ctx.db.query.formResponses.findFirst({
          where: and(
            eq(formResponses.formId, input.formId),
            eq(formResponses.createdById, ctx.session.user.id),
          ),
        });

        if (existingResponse) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "You have already submitted this form",
          });
        }
      }

      // Validate required fields
      const requiredFieldIds = form.fields
        .filter((f) => f.required)
        .map((f) => f.id);

      const submittedFieldIds = input.fields.map((f) => f.fieldId);
      const missingRequiredFields = requiredFieldIds.filter(
        (id) => !submittedFieldIds.includes(id),
      );

      if (missingRequiredFields.length > 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Missing required fields",
        });
      }

      // Validate field types and constraints
      for (const field of input.fields) {
        const formField = form.fields.find((f) => f.id === field.fieldId);
        if (!formField) continue;

        const fieldValue = field.value;
        const isMultiSelect = Array.isArray(fieldValue);

        // Validate regex pattern for text fields
        if (formField.regexPattern && typeof fieldValue === "string") {
          const regex = new RegExp(formField.regexPattern);
          if (!regex.test(fieldValue)) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message:
                formField.validationMessage ??
                `Invalid value for ${formField.label}`,
            });
          }
        }

        // Validate number/range min/max
        if (
          (formField.type === "number" || formField.type === "range") &&
          typeof fieldValue === "string"
        ) {
          const numValue = parseFloat(fieldValue);
          if (isNaN(numValue)) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: `Invalid number for ${formField.label}`,
            });
          }
          if (formField.minValue !== null && numValue < formField.minValue) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: `${formField.label} must be at least ${formField.minValue}`,
            });
          }
          if (formField.maxValue !== null && numValue > formField.maxValue) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: `${formField.label} must be at most ${formField.maxValue}`,
            });
          }
        }

        // Validate selection limit for multi-select fields
        if (
          isMultiSelect &&
          formField.allowMultiple &&
          (formField.type === "select" || formField.type === "checkbox-group")
        ) {
          if (
            formField.selectionLimit &&
            fieldValue.length > formField.selectionLimit
          ) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: `${formField.label} allows a maximum of ${formField.selectionLimit} selections`,
            });
          }
        }

        // Validate that selected values exist in options (for select/radio/checkbox-group)
        if (
          formField.type === "select" ||
          formField.type === "radio" ||
          formField.type === "checkbox-group"
        ) {
          const options = formField.options
            ? (JSON.parse(formField.options) as Array<{
                label: string;
                isDefault?: boolean;
              }>)
            : [];
          const validOptions = options.map((opt) => opt.label);

          const valuesToCheck = isMultiSelect ? fieldValue : [fieldValue];
          for (const value of valuesToCheck) {
            if (!validOptions.includes(value)) {
              throw new TRPCError({
                code: "BAD_REQUEST",
                message: `Invalid option selected for ${formField.label}`,
              });
            }
          }
        }
      }

      // Create the response
      // Extract IP address from headers
      const forwardedFor = ctx.headers.get("x-forwarded-for");
      const realIp = ctx.headers.get("x-real-ip");
      const ipAddress = forwardedFor?.split(",")[0] ?? realIp ?? "unknown";

      const [response] = await ctx.db
        .insert(formResponses)
        .values({
          formId: input.formId,
          formVersion: form.currentVersion, // Store the current form version
          createdById: ctx.session?.user?.id,
          submitterEmail: input.submitterEmail,
          isAnonymous: input.isAnonymous,
          rating: input.rating,
          comments: input.comments,
          ipAddress,
        })
        .returning();

      // Insert field responses
      if (input.fields.length > 0) {
        await ctx.db.insert(formResponseFields).values(
          input.fields.map((field) => ({
            formResponseId: response!.id,
            formFieldId: field.fieldId,
            // Convert array to JSON string for multi-select, keep string as-is for single values
            value: Array.isArray(field.value)
              ? JSON.stringify(field.value)
              : field.value,
          })),
        );
      }

      return {
        success: true,
        responseId: response!.id,
      };
    }),

  /**
   * Update an existing response (if form allows editing and user owns response)
   */
  update: protectedProcedure
    .input(
      z.object({
        responseId: z.number(),
        fields: z.array(
          z.object({
            fieldId: z.number(),
            value: z.union([z.string(), z.array(z.string())]),
          }),
        ),
        rating: z.number().min(1).max(5).optional(),
        comments: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Get the existing response
      const existingResponse = await ctx.db.query.formResponses.findFirst({
        where: eq(formResponses.id, input.responseId),
        with: {
          form: {
            with: {
              fields: true,
            },
          },
          responseFields: {
            with: {
              formField: true,
            },
          },
        },
      });

      if (!existingResponse) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Response not found",
        });
      }

      // Check if user owns this response
      if (existingResponse.createdById !== ctx.session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to edit this response",
        });
      }

      // Check if form allows editing
      if (!existingResponse.form.allowEditing) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This form does not allow editing submissions",
        });
      }

      // Validate fields (similar to submit)
      const form = existingResponse.form;
      const requiredFieldIds = form.fields
        .filter((f) => f.required)
        .map((f) => f.id);

      const submittedFieldIds = input.fields.map((f) => f.fieldId);
      const missingRequiredFields = requiredFieldIds.filter(
        (id) => !submittedFieldIds.includes(id),
      );

      if (missingRequiredFields.length > 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Missing required fields",
        });
      }

      // Save current state to history before updating
      const historyData = {
        fields: existingResponse.responseFields.map((rf) => ({
          fieldId: rf.formFieldId,
          fieldLabel: rf.formField.label,
          value: rf.value,
        })),
        rating: existingResponse.rating,
        comments: existingResponse.comments,
      };

      await ctx.db.insert(formResponseHistory).values({
        formResponseId: input.responseId,
        data: JSON.stringify(historyData),
        editedById: ctx.session.user.id,
      });

      // Update the response metadata
      await ctx.db
        .update(formResponses)
        .set({
          rating: input.rating,
          comments: input.comments,
          updatedAt: new Date(),
        })
        .where(eq(formResponses.id, input.responseId));

      // Delete old field values and insert new ones
      await ctx.db
        .delete(formResponseFields)
        .where(eq(formResponseFields.formResponseId, input.responseId));

      if (input.fields.length > 0) {
        await ctx.db.insert(formResponseFields).values(
          input.fields.map((field) => ({
            formResponseId: input.responseId,
            formFieldId: field.fieldId,
            value: Array.isArray(field.value)
              ? JSON.stringify(field.value)
              : field.value,
          })),
        );
      }

      return {
        success: true,
        responseId: input.responseId,
      };
    }),

  /**
   * Get a response for editing (user must own the response)
   */
  getForEdit: protectedProcedure
    .input(z.object({ responseId: z.number() }))
    .query(async ({ ctx, input }) => {
      const response = await ctx.db.query.formResponses.findFirst({
        where: eq(formResponses.id, input.responseId),
        with: {
          form: {
            with: {
              fields: {
                orderBy: (fields, { asc }) => [asc(fields.order)],
              },
            },
          },
          responseFields: {
            with: {
              formField: true,
            },
          },
        },
      });

      if (!response) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Response not found",
        });
      }

      // Check if user owns this response
      if (response.createdById !== ctx.session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to edit this response",
        });
      }

      // Check if form allows editing
      if (!response.form.allowEditing) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This form does not allow editing submissions",
        });
      }

      return response;
    }),

  /**
   * Get all responses for a form (owner only)
   */
  list: protectedProcedure
    .input(
      z.object({
        formId: z.number(),
        limit: z.number().min(1).max(100).default(20),
        offset: z.number().min(0).default(0),
        version: z.number().optional(), // Optional version filter
      }),
    )
    .query(async ({ ctx, input }) => {
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

      // Build where clause with optional version filter
      const whereClause = input.version
        ? and(
            eq(formResponses.formId, input.formId),
            eq(formResponses.formVersion, input.version),
          )
        : eq(formResponses.formId, input.formId);

      // Get responses with pagination
      const responses = await ctx.db.query.formResponses.findMany({
        where: whereClause,
        orderBy: [desc(formResponses.createdAt)],
        limit: input.limit,
        offset: input.offset,
        with: {
          responseFields: {
            with: {
              formField: true,
            },
          },
          createdBy: {
            columns: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      // Get total count
      const countResult = await ctx.db
        .select({ count: sql<number>`count(*)` })
        .from(formResponses)
        .where(whereClause);

      const total = countResult[0]?.count ?? 0;

      return {
        items: responses,
        total,
        hasMore: input.offset + input.limit < total,
      };
    }),

  /**
   * Get a single response by ID (owner only)
   */
  getById: protectedProcedure
    .input(z.object({ responseId: z.number() }))
    .query(async ({ ctx, input }) => {
      const response = await ctx.db.query.formResponses.findFirst({
        where: eq(formResponses.id, input.responseId),
        with: {
          form: true,
          responseFields: {
            with: {
              formField: true,
            },
          },
          createdBy: {
            columns: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      if (!response) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Response not found",
        });
      }

      // Verify form ownership
      if (response.form.createdById !== ctx.session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to view this response",
        });
      }

      return response;
    }),

  /**
   * Delete a response (owner only)
   */
  delete: protectedProcedure
    .input(z.object({ responseId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      // Get response and verify form ownership
      const response = await ctx.db.query.formResponses.findFirst({
        where: eq(formResponses.id, input.responseId),
        with: {
          form: true,
        },
      });

      if (!response) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Response not found",
        });
      }

      if (response.form.createdById !== ctx.session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to delete this response",
        });
      }

      await ctx.db
        .delete(formResponses)
        .where(eq(formResponses.id, input.responseId));

      return { success: true };
    }),

  /**
   * Export responses as CSV data (owner only)
   */
  export: protectedProcedure
    .input(z.object({ formId: z.number() }))
    .query(async ({ ctx, input }) => {
      // Verify form ownership
      const form = await ctx.db.query.forms.findFirst({
        where: and(
          eq(forms.id, input.formId),
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

      // Get all responses
      const responses = await ctx.db.query.formResponses.findMany({
        where: eq(formResponses.formId, input.formId),
        orderBy: [desc(formResponses.createdAt)],
        with: {
          responseFields: {
            with: {
              formField: true,
            },
          },
          createdBy: {
            columns: {
              name: true,
              email: true,
            },
          },
        },
      });

      // Transform data for CSV export
      const csvData = responses.map((response) => {
        const row: Record<string, string> = {
          "Response ID": response.id.toString(),
          "Submitted At": response.createdAt?.toISOString() ?? "",
          "Submitter Name": response.createdBy?.name ?? "Anonymous",
          "Submitter Email":
            response.createdBy?.email ?? response.submitterEmail ?? "N/A",
          Rating: response.rating?.toString() ?? "",
          Comments: response.comments ?? "",
        };

        // Add field values (parse JSON arrays if needed)
        for (const field of form.fields) {
          const responseField = response.responseFields.find(
            (rf) => rf.formFieldId === field.id,
          );
          if (!responseField) {
            row[field.label] = "";
          } else {
            // Try to parse as JSON array (for multi-select), otherwise use as-is
            try {
              const parsed = JSON.parse(responseField.value) as unknown;
              if (Array.isArray(parsed)) {
                row[field.label] = parsed.join(", ");
              } else {
                row[field.label] = responseField.value;
              }
            } catch {
              // Not JSON, use as-is
              row[field.label] = responseField.value;
            }
          }
        }

        return row;
      });

      return {
        data: csvData,
        headers: [
          "Response ID",
          "Submitted At",
          "Submitter Name",
          "Submitter Email",
          "Rating",
          "Comments",
          ...form.fields.map((f) => f.label),
        ],
      };
    }),

  /**
   * Get response statistics for a form
   */
  getStats: protectedProcedure
    .input(z.object({ formId: z.number() }))
    .query(async ({ ctx, input }) => {
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

      // Get total responses
      const totalResult = await ctx.db
        .select({ count: sql<number>`count(*)` })
        .from(formResponses)
        .where(eq(formResponses.formId, input.formId));

      // Get anonymous vs authenticated
      const anonymousResult = await ctx.db
        .select({ count: sql<number>`count(*)` })
        .from(formResponses)
        .where(
          and(
            eq(formResponses.formId, input.formId),
            eq(formResponses.isAnonymous, true),
          ),
        );

      // Get average rating
      const avgRatingResult = await ctx.db
        .select({ avg: sql<number>`avg(${formResponses.rating})` })
        .from(formResponses)
        .where(eq(formResponses.formId, input.formId));

      return {
        total: totalResult[0]?.count ?? 0,
        anonymous: anonymousResult[0]?.count ?? 0,
        authenticated:
          (totalResult[0]?.count ?? 0) - (anonymousResult[0]?.count ?? 0),
        averageRating: avgRatingResult[0]?.avg ?? null,
      };
    }),

  /**
   * Get current user's own submissions
   */
  mySubmissions: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(20),
        offset: z.number().min(0).default(0),
      }),
    )
    .query(async ({ ctx, input }) => {
      // Get responses created by the current user
      const responses = await ctx.db.query.formResponses.findMany({
        where: eq(formResponses.createdById, ctx.session.user.id),
        orderBy: [desc(formResponses.createdAt)],
        limit: input.limit,
        offset: input.offset,
        with: {
          form: {
            columns: {
              id: true,
              name: true,
              slug: true,
              allowEditing: true,
            },
          },
          responseFields: {
            with: {
              formField: true,
            },
          },
        },
      });

      // Get total count
      const countResult = await ctx.db
        .select({ count: sql<number>`count(*)` })
        .from(formResponses)
        .where(eq(formResponses.createdById, ctx.session.user.id));

      const total = countResult[0]?.count ?? 0;

      return {
        items: responses,
        total,
        hasMore: input.offset + input.limit < total,
      };
    }),

  /**
   * Get edit history for a response (owner only)
   */
  getHistory: protectedProcedure
    .input(z.object({ responseId: z.number() }))
    .query(async ({ ctx, input }) => {
      // Get the response to verify ownership
      const response = await ctx.db.query.formResponses.findFirst({
        where: eq(formResponses.id, input.responseId),
        with: {
          form: true,
        },
      });

      if (!response) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Response not found",
        });
      }

      // Verify form ownership
      if (response.form.createdById !== ctx.session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to view this response history",
        });
      }

      // Get history records
      const history = await ctx.db.query.formResponseHistory.findMany({
        where: eq(formResponseHistory.formResponseId, input.responseId),
        orderBy: [desc(formResponseHistory.createdAt)],
        with: {
          editedBy: {
            columns: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      return history;
    }),
});
