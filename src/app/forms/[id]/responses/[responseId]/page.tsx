"use client";

import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Skeleton } from "~/components/ui/skeleton";
import { Separator } from "~/components/ui/separator";
import { toast } from "sonner";
import {
  ArrowLeft,
  User,
  Calendar,
  Mail,
  Star,
  MessageSquare,
  Network,
  Trash,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { formatDate, formatRelativeTime } from "~/lib/utils";

export default function ResponseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const formId = parseInt(params.id as string);
  const responseId = parseInt(params.responseId as string);

  const { data: response, isLoading } = api.formResponses.getById.useQuery({
    responseId,
  });

  const deleteResponseMutation = api.formResponses.delete.useMutation({
    onSuccess: () => {
      toast.success("Response deleted successfully");
      router.push(`/forms/${formId}/responses`);
    },
    onError: (error) => {
      toast.error(`Failed to delete response: ${error.message}`);
    },
  });

  const handleDelete = () => {
    toast(
      <div className="flex flex-col gap-2">
        <p className="font-semibold">Delete this response?</p>
        <p className="text-muted-foreground text-sm">
          This action cannot be undone.
        </p>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="destructive"
            onClick={() => {
              deleteResponseMutation.mutate({ responseId });
              toast.dismiss();
            }}
          >
            Delete
          </Button>
          <Button size="sm" variant="outline" onClick={() => toast.dismiss()}>
            Cancel
          </Button>
        </div>
      </div>,
      { duration: 10000 },
    );
  };

  if (isLoading) {
    return (
      <div className="container mx-auto max-w-4xl py-8">
        <Skeleton className="mb-8 h-10 w-64" />
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!response) {
    return (
      <div className="container mx-auto max-w-4xl py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Response not found</h1>
          <Button
            className="mt-4"
            onClick={() => router.push(`/forms/${formId}/responses`)}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Responses
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-6xl py-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push(`/forms/${formId}/responses`)}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{response.form.name}</h1>
            <p className="text-muted-foreground text-sm">
              Submitted {formatRelativeTime(response.createdAt)} by{" "}
              {response.createdBy?.name ?? response.submitterEmail ?? "Anonymous"}
            </p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={handleDelete}>
          <Trash className="h-4 w-4" />
        </Button>
      </div>

      {/* Rating and Comments Section */}
      {(response.rating || response.comments) && (
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="space-y-4">
              {response.rating && (
                <div className="flex items-center gap-3">
                  <span className="text-muted-foreground text-sm font-medium">
                    Rating:
                  </span>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`h-5 w-5 ${
                          star <= response.rating!
                            ? "fill-yellow-400 text-yellow-400"
                            : "text-gray-300"
                        }`}
                      />
                    ))}
                  </div>
                </div>
              )}
              {response.comments && (
                <div className="space-y-2">
                  <p className="text-muted-foreground text-sm font-medium">
                    Comments:
                  </p>
                  <p className="text-sm leading-relaxed">{response.comments}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Form Responses Grid */}
      {response.responseFields.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <p className="text-muted-foreground text-center">
              No responses found
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {response.responseFields.map((field) => {
            // Parse value - could be JSON array or string
            let values: string[];
            try {
              const parsed = JSON.parse(field.value);
              if (Array.isArray(parsed)) {
                values = parsed;
              } else {
                values = [field.value];
              }
            } catch {
              // Not JSON, use as-is
              values = [field.value];
            }

            // Check if this is a checkbox field (boolean value)
            const isCheckbox = field.formField.type === "checkbox";
            const checkboxValue = isCheckbox && (field.value === "true" || field.value === "Yes");

            return (
              <Card key={field.formField.id} className="overflow-hidden">
                <CardHeader className="bg-muted/50 pb-3">
                  <CardTitle className="text-sm font-medium">
                    {field.formField.label}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  {isCheckbox ? (
                    <div className="flex items-center gap-2">
                      <div className={`flex h-5 w-5 items-center justify-center rounded border-2 ${
                        checkboxValue 
                          ? "bg-primary border-primary" 
                          : "border-muted-foreground"
                      }`}>
                        {checkboxValue && (
                          <svg
                            className="h-3 w-3 text-white"
                            fill="none"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="3"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        )}
                      </div>
                      <span className="text-muted-foreground text-sm">
                        {checkboxValue ? "Checked" : "Not checked"}
                      </span>
                    </div>
                  ) : values.length === 1 ? (
                    <p className="break-words whitespace-pre-wrap text-sm leading-relaxed">
                      {values[0]}
                    </p>
                  ) : (
                    <ul className="space-y-1.5">
                      {values.map((value, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <span className="text-muted-foreground mt-1.5 h-1 w-1 flex-shrink-0 rounded-full bg-current" />
                          <span className="break-words">{value}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Label({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <label className={className}>{children}</label>;
}
