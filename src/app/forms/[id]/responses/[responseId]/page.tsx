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
    <div className="container mx-auto max-w-4xl py-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push(`/forms/${formId}/responses`)}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Response Details</h1>
            <p className="text-muted-foreground">
              {response.form.name} - Response #{response.id}
            </p>
          </div>
        </div>
        <Button variant="destructive" size="sm" onClick={handleDelete}>
          <Trash className="mr-2 h-4 w-4" />
          Delete
        </Button>
      </div>

      <div className="space-y-6">
        {/* Metadata Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Submission Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <p className="text-muted-foreground text-sm">Submitted By</p>
                <p className="font-medium">
                  {response.createdBy?.name ?? "Anonymous"}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-muted-foreground text-sm">Email</p>
                <p className="flex items-center gap-2 font-medium">
                  <Mail className="h-4 w-4" />
                  {response.createdBy?.email ??
                    response.submitterEmail ??
                    "N/A"}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-muted-foreground text-sm">Submitted At</p>
                <p className="flex items-center gap-2 font-medium">
                  <Calendar className="h-4 w-4" />
                  {formatDate(response.createdAt)}
                  <span className="text-muted-foreground text-xs">
                    ({formatRelativeTime(response.createdAt)})
                  </span>
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-muted-foreground text-sm">IP Address</p>
                <p className="flex items-center gap-2 font-mono text-sm font-medium">
                  <Network className="h-4 w-4" />
                  {response.ipAddress ?? "Unknown"}
                </p>
              </div>
            </div>

            {response.rating && (
              <div className="space-y-1">
                <p className="text-muted-foreground text-sm">Rating</p>
                <div className="flex items-center gap-2">
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
                  <span className="text-muted-foreground ml-2 text-sm">
                    {response.rating} / 5
                  </span>
                </div>
              </div>
            )}

            {response.comments && (
              <div className="space-y-1">
                <p className="text-muted-foreground text-sm">Comments</p>
                <div className="bg-muted flex items-start gap-2 rounded-lg p-3">
                  <MessageSquare className="text-muted-foreground mt-0.5 h-4 w-4" />
                  <p className="text-sm">{response.comments}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Form Responses Card */}
        <Card>
          <CardHeader>
            <CardTitle>Form Responses</CardTitle>
          </CardHeader>
          <CardContent>
            {response.responseFields.length === 0 ? (
              <p className="text-muted-foreground py-8 text-center">
                No field responses found
              </p>
            ) : (
              <div className="space-y-6">
                {(() => {
                  // Group response fields by formFieldId for multi-select handling
                  const groupedFields = new Map<
                    number,
                    {
                      formField: (typeof response.responseFields)[0]["formField"];
                      values: string[];
                    }
                  >();

                  for (const field of response.responseFields) {
                    const existing = groupedFields.get(field.formFieldId);
                    if (existing) {
                      existing.values.push(field.value);
                    } else {
                      groupedFields.set(field.formFieldId, {
                        formField: field.formField,
                        values: [field.value],
                      });
                    }
                  }

                  return Array.from(groupedFields.values()).map(
                    ({ formField, values }, index) => (
                      <div key={formField.id}>
                        {index > 0 && <Separator className="my-6" />}
                        <div className="space-y-2">
                          <div className="flex items-start justify-between">
                            <div className="space-y-1">
                              <Label className="text-base font-semibold">
                                {formField.label}
                              </Label>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-xs">
                                  {formField.type}
                                </Badge>
                                {formField.required && (
                                  <Badge
                                    variant="destructive"
                                    className="text-xs"
                                  >
                                    Required
                                  </Badge>
                                )}
                                {values.length > 1 && (
                                  <Badge
                                    variant="secondary"
                                    className="text-xs"
                                  >
                                    Multi-select
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                          {formField.helpText && (
                            <p className="text-muted-foreground text-sm">
                              {formField.helpText}
                            </p>
                          )}
                          <div className="bg-muted mt-3 rounded-lg p-4">
                            {values.length === 1 ? (
                              <p className="break-words whitespace-pre-wrap">
                                {values[0]}
                              </p>
                            ) : (
                              <ul className="list-inside list-disc space-y-1">
                                {values.map((value, i) => (
                                  <li key={i} className="break-words">
                                    {value}
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        </div>
                      </div>
                    ),
                  );
                })()}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
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
