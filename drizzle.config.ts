import { type Config } from "drizzle-kit";

import { env } from "~/env";
console.log("Database URL:", env.DATABASE_URL);
console.log("Database Auth Token:", env.DATABASE_AUTH_TOKEN);

export default {
  schema: "./src/server/db/schema.ts",
  dialect: "turso",
  dbCredentials: {
    url: env.DATABASE_URL,
    authToken: env.DATABASE_AUTH_TOKEN,
  },
  tablesFilter: ["forms_*"],
} satisfies Config;
