import { TRPCError } from "@trpc/server";
import { and, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { forms, formResponses } from "~/server/db/schema";

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
            with: {
              options: true,
            },
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
            with: {
              options: true,
            },
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
        description: z.string().optional(),
        isPublic: z.boolean().optional(),
        allowAnonymous: z.boolean().optional(),
        allowMultipleSubmissions: z.boolean().optional(),
        status: z.enum(["draft", "published", "archived"]).optional(),
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

      // If name is changing, regenerate slug
      let slug = existing.slug;
      if (input.name && input.name !== existing.name) {
        slug = generateSlug(input.name);
        let counter = 1;

        // Check if new slug exists
        while (true) {
          const slugExists = await ctx.db.query.forms.findFirst({
            where: and(eq(forms.slug, slug), eq(forms.id, input.id)),
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
          slug: input.name ? slug : undefined,
          description: input.description,
          isPublic: input.isPublic,
          allowAnonymous: input.allowAnonymous,
          allowMultipleSubmissions: input.allowMultipleSubmissions,
          status: input.status,
        })
        .where(eq(forms.id, input.id))
        .returning();

      return updated;
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
            with: {
              options: true,
            },
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
});
