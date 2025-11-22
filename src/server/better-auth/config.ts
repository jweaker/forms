import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";

import { env } from "~/env";
import { db } from "~/server/db";

console.log("Better Auth Config:", {
  baseURL: env.BETTER_AUTH_BASE_URL ?? "http://localhost:3000",
  hasSecret: !!env.BETTER_AUTH_SECRET,
  secretLength: env.BETTER_AUTH_SECRET?.length,
  githubClientId: env.BETTER_AUTH_GITHUB_CLIENT_ID,
  googleClientId: env.BETTER_AUTH_GOOGLE_CLIENT_ID,
});

/**
 * Cache the auth instance in development to avoid creating a new instance on every HMR update.
 * This is critical for OAuth state management.
 */
const globalForAuth = globalThis as unknown as {
  auth: ReturnType<typeof betterAuth> | undefined;
};

export const auth =
  globalForAuth.auth ??
  betterAuth({
    database: drizzleAdapter(db, {
      provider: "sqlite",
    }),
    baseURL: env.BETTER_AUTH_BASE_URL ?? "http://localhost:3000",
    secret: env.BETTER_AUTH_SECRET,
    trustedOrigins: [
      "http://localhost:3000",
      "https://vibeforming.com",
      ...(env.BETTER_AUTH_BASE_URL ? [env.BETTER_AUTH_BASE_URL] : []),
    ],
    account: {
      skipStateCookieCheck: true,
    },
    advanced: {
      cookiePrefix: "better-auth",
      useSecureCookies: env.NODE_ENV === "production",
      crossSubDomainCookies: {
        enabled: false,
      },
      defaultCookieAttributes: {
        sameSite: "lax",
        httpOnly: true,
        secure: env.NODE_ENV === "production",
        path: "/",
      },
    },
    emailAndPassword: {
      enabled: true,
    },
    socialProviders: {
      github: {
        clientId: env.BETTER_AUTH_GITHUB_CLIENT_ID,
        clientSecret: env.BETTER_AUTH_GITHUB_CLIENT_SECRET,
      },
      google: {
        clientId: env.BETTER_AUTH_GOOGLE_CLIENT_ID,
        clientSecret: env.BETTER_AUTH_GOOGLE_CLIENT_SECRET,
      },
    },
  });

if (env.NODE_ENV !== "production") {
  globalForAuth.auth = auth;
}

export type Session = typeof auth.$Infer.Session;
