import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL:
    process.env.NEXT_PUBLIC_BETTER_AUTH_BASE_URL ?? "http://localhost:3000",
});

export type Session = typeof authClient.$Infer.Session;
