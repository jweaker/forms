import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { forms } from "~/server/db/schema";

/**
 * Public router for unauthenticated access to forms
 * These endpoints allow anyone to view and submit to public forms
 */
export const publicRouter = createTRPCRouter({
  /**
   * Get a form by slug for public viewing/submission
   */
  getFormBySlug: publicProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ ctx, input }) => {
      const form = await ctx.db.query.forms.findFirst({
        where: eq(forms.slug, input.slug),
        with: {
          fields: {
            orderBy: (fields, { asc }) => [asc(fields.order)],
            with: {
              options: true,
            },
          },
          createdBy: {
            columns: {
              id: true,
              name: true,
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

      // Check if form is public or user is the owner
      if (!form.isPublic && form.createdById !== ctx.session?.user?.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "This form is private",
        });
      }

      // Check if form is published
      if (form.status !== "published") {
        // Allow owner to view unpublished forms
        if (form.createdById !== ctx.session?.user?.id) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "This form is not currently accepting responses",
          });
        }
      }

      return form;
    }),

  /**
   * Check if a form exists and is accessible
   */
  checkFormAccess: publicProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ ctx, input }) => {
      const form = await ctx.db.query.forms.findFirst({
        where: eq(forms.slug, input.slug),
        columns: {
          id: true,
          name: true,
          status: true,
          isPublic: true,
          allowAnonymous: true,
          createdById: true,
        },
      });

      if (!form) {
        return {
          exists: false,
          accessible: false,
          requiresAuth: false,
          isPublished: false,
        };
      }

      const isOwner = form.createdById === ctx.session?.user?.id;
      const isPublic = form.isPublic;
      const isPublished = form.status === "published";
      const requiresAuth = !form.allowAnonymous && !ctx.session?.user;

      return {
        exists: true,
        accessible: isOwner || (isPublic && isPublished),
        requiresAuth,
        isPublished,
        isOwner,
        formName: form.name,
      };
    }),
});
