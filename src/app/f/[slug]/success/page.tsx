"use client";

import { Card, CardContent } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Skeleton } from "~/components/ui/skeleton";
import { CheckCircle2 } from "lucide-react";
import { useParams } from "next/navigation";
import { api } from "~/trpc/react";

export default function SuccessPage() {
  const params = useParams();
  const slug = params.slug as string;

  const { data: form, isLoading } = api.public.getFormBySlug.useQuery({ slug });

  if (isLoading) {
    return (
      <div className="container mx-auto max-w-2xl py-8">
        <Card>
          <CardContent className="py-16">
            <Skeleton className="mx-auto mb-6 h-16 w-16 rounded-full" />
            <Skeleton className="mx-auto mb-2 h-8 w-48" />
            <Skeleton className="mx-auto mb-8 h-4 w-64" />
            <Skeleton className="mx-auto h-10 w-48" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-2xl py-8">
      <Card>
        <CardContent className="py-16 text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <CheckCircle2 className="h-10 w-10 text-green-600" />
          </div>
          <h1 className="mb-2 text-3xl font-bold">Thank you!</h1>
          <p className="text-muted-foreground mb-8">
            Your response has been submitted successfully.
          </p>
          {form?.allowMultipleSubmissions && (
            <Button onClick={() => (window.location.href = `/f/${slug}`)}>
              Submit another response
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
