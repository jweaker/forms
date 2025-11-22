import { formFieldsRouter } from "~/server/api/routers/formFields";
import { formResponsesRouter } from "~/server/api/routers/formResponses";
import { formsRouter } from "~/server/api/routers/forms";
import { publicRouter } from "~/server/api/routers/public";
import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  forms: formsRouter,
  formFields: formFieldsRouter,
  formResponses: formResponsesRouter,
  public: publicRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;

/**
 * Create a server-side caller for the tRPC API.
 * @example
 * const trpc = createCaller(createContext);
 * const res = await trpc.forms.list();
 *       ^? Form[]
 */
export const createCaller = createCallerFactory(appRouter);
