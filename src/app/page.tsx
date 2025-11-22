import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "~/server/better-auth";
import { getSession } from "~/server/better-auth/server";
import { HydrateClient } from "~/trpc/server";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Github } from "lucide-react";

export default async function Home() {
  const session = await getSession();

  // Redirect to dashboard if already logged in
  if (session) {
    redirect("/dashboard");
  }

  return (
    <HydrateClient>
      <main className="bg-background flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1 text-center">
            <CardTitle className="text-3xl font-bold">Forms App</CardTitle>
            <CardDescription>
              Sign in to create and manage your forms
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form>
              <Button
                className="w-full"
                size="lg"
                formAction={async () => {
                  "use server";
                  const res = await auth.api.signInSocial({
                    headers: await headers(),
                    body: {
                      provider: "github",
                      callbackURL: "/dashboard",
                    },
                  });
                  if (!res.url) {
                    throw new Error("No URL returned from signInSocial");
                  }
                  redirect(res.url);
                }}
              >
                <Github className="mr-2 h-5 w-5" />
                Sign in with GitHub
              </Button>
            </form>
            <p className="text-muted-foreground text-center text-xs">
              By signing in, you agree to create and manage forms
            </p>
          </CardContent>
        </Card>
      </main>
    </HydrateClient>
  );
}
