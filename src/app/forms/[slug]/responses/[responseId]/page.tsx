"use client";

import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader } from "~/components/ui/card";
import { Skeleton } from "~/components/ui/skeleton";
import { toast } from "sonner";
import {
  ArrowLeft,
  Star,
  Trash,
  History,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { formatRelativeTime } from "~/lib/utils";
import { FormFieldDisplay } from "~/components/form-field-display";
import { Label } from "~/components/ui/label";
import { Badge } from "~/components/ui/badge";
import { Separator } from "~/components/ui/separator";
import { useState } from "react";

export default function ResponseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const responseId = parseInt(params.responseId as string);
  const [showHistory, setShowHistory] = useState(false);
  const [expandedVersions, setExpandedVersions] = useState<Set<number>>(
    new Set(),
  );

  const { data: response, isLoading } = api.formResponses.getById.useQuery({
    responseId,
  });

  // Get the form version that matches this response
  const responseVersion = response?.formVersion ?? 1;
  const { data: formVersion, isLoading: isLoadingVersion } =
    api.forms.getFormVersion.useQuery(
      {
        formId: response?.form.id ?? 0,
        version: responseVersion,
      },
      {
        enabled: !!response?.form.id,
      },
    );

  const { data: history } = api.formResponses.getHistory.useQuery(
    { responseId },
    { enabled: !!response },
  );

  const deleteResponseMutation = api.formResponses.delete.useMutation({
    onSuccess: () => {
      toast.success("Response deleted successfully");
      router.push(`/forms/${slug}/responses`);
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

  const handleBack = () => {
    // Check if there's a referrer and it's from our app
    if (document.referrer?.includes(window.location.host)) {
      router.back();
    } else {
      // Default to form responses page
      router.push(`/forms/${slug}/responses`);
    }
  };

  const toggleVersionExpanded = (versionId: number) => {
    setExpandedVersions((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(versionId)) {
        newSet.delete(versionId);
      } else {
        newSet.add(versionId);
      }
      return newSet;
    });
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
          <Button className="mt-4" onClick={handleBack}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-3xl px-3 py-4 sm:px-4 sm:py-8">
      {/* Header */}
      <div className="mb-4 flex items-center gap-2 sm:mb-6 sm:gap-3">
        <Button
          variant="ghost"
          size="icon"
          asChild
          className="h-8 w-8 sm:h-10 sm:w-10"
        >
          <Link href={`/forms/${slug}/responses`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-bold sm:text-2xl">
            {response.form.name}
          </h1>
          <p className="text-muted-foreground text-xs sm:text-sm">
            Response Details
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleDelete}
          className="h-8 w-8 sm:h-10 sm:w-10"
        >
          <Trash className="h-4 w-4" />
        </Button>
      </div>

      {/* Main Content Card */}
      <Card>
        {/* Submission Info */}
        <CardHeader className="border-b p-4 sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
            <div className="space-y-1">
              <p className="text-xs font-medium sm:text-sm">Submitted by</p>
              <p className="text-muted-foreground text-sm">
                {response.createdBy?.name ??
                  response.submitterEmail ??
                  "Anonymous"}
              </p>
              {response.createdBy?.email && (
                <p className="text-muted-foreground text-xs">
                  {response.createdBy.email}
                </p>
              )}
            </div>
            <div className="space-y-1 sm:text-right">
              <p className="text-xs font-medium sm:text-sm">Submitted</p>
              <p className="text-muted-foreground text-sm">
                {formatRelativeTime(response.createdAt)}
              </p>
              <Badge variant="outline" className="mt-1 text-xs">
                Version {responseVersion}
              </Badge>
            </div>
          </div>
        </CardHeader>

        <CardContent className="divide-y p-0">
          {/* Rating and Comments Section */}
          {(response.rating ?? response.comments) && (
            <div className="space-y-3 p-4 sm:space-y-4 sm:p-6">
              {response.rating && (
                <div className="space-y-2">
                  <p className="text-xs font-medium sm:text-sm">Rating</p>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`h-4 w-4 sm:h-5 sm:w-5 ${
                          star <= response.rating!
                            ? "fill-yellow-400 text-yellow-400"
                            : "text-muted-foreground/30"
                        }`}
                      />
                    ))}
                    <span className="text-muted-foreground ml-2 text-xs sm:text-sm">
                      {response.rating} / 5
                    </span>
                  </div>
                </div>
              )}
              {response.comments && (
                <div className="space-y-2">
                  <p className="text-xs font-medium sm:text-sm">Comments</p>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {response.comments}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Form Responses */}
          {response.responseFields.length === 0 ? (
            <div className="text-muted-foreground py-8 text-center text-xs sm:py-12 sm:text-sm">
              No field responses found
            </div>
          ) : (
            <div className="space-y-4 p-4 sm:space-y-6 sm:p-6">
              {response.responseFields.map((responseField) => {
                // Try to get field definition from the version snapshot
                const versionField = formVersion?.fields.find(
                  (f) => f.id === responseField.formFieldId,
                );
                // Fallback to current form field if version field not found
                const field = versionField ?? responseField.formField;

                // Only show "Field changed" badge if version is loaded and field wasn't found
                const showFieldChangedBadge =
                  !isLoadingVersion && !versionField;

                return (
                  <div key={responseField.formFieldId} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Label className="text-sm font-medium">
                        {field.label}
                        {field.required && (
                          <span
                            className="text-muted-foreground ml-1 text-xs font-normal"
                            aria-label="Required field"
                          >
                            (required)
                          </span>
                        )}
                      </Label>
                      {showFieldChangedBadge && (
                        <Badge
                          variant="secondary"
                          className="bg-amber-100 text-xs text-amber-800 dark:bg-amber-900 dark:text-amber-100"
                        >
                          Field changed
                        </Badge>
                      )}
                    </div>
                    <FormFieldDisplay
                      field={field}
                      value={responseField.value}
                    />
                    {field.helpText && (
                      <p className="text-muted-foreground text-xs">
                        {field.helpText}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Edit History Section */}
          {history && history.length > 0 && (
            <>
              <Separator />
              <div className="p-4 sm:p-6">
                <button
                  onClick={() => setShowHistory(!showHistory)}
                  className="text-muted-foreground hover:text-foreground flex w-full items-center justify-between text-xs font-medium transition-colors sm:text-sm"
                >
                  <div className="flex items-center gap-2">
                    <History className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    <span>Edit History ({history.length})</span>
                  </div>
                  {showHistory ? (
                    <ChevronUp className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  )}
                </button>

                {showHistory && (
                  <div className="mt-4 space-y-4">
                    {history.map((historyItem, index) => {
                      let historyData: {
                        fields: Array<{
                          fieldId: number;
                          fieldLabel: string;
                          value: string;
                        }>;
                        rating?: number | null;
                        comments?: string | null;
                      };
                      try {
                        historyData = JSON.parse(
                          historyItem.data,
                        ) as typeof historyData;
                      } catch {
                        return null;
                      }

                      const isExpanded = expandedVersions.has(historyItem.id);
                      const isLatestHistory = index === 0;

                      // Compare with current response to find changed fields
                      const changedFieldIds = new Set<number>();
                      if (isLatestHistory) {
                        response.responseFields.forEach((currentField) => {
                          const historyField = historyData.fields.find(
                            (f) => f.fieldId === currentField.formField.id,
                          );
                          if (
                            historyField &&
                            historyField.value !== currentField.value
                          ) {
                            changedFieldIds.add(currentField.formField.id);
                          }
                        });
                        // Check rating and comments changes
                        if (historyData.rating !== response.rating) {
                          changedFieldIds.add(-1); // Special ID for rating
                        }
                        if (historyData.comments !== response.comments) {
                          changedFieldIds.add(-2); // Special ID for comments
                        }
                      } else {
                        // Compare with previous version
                        const nextVersion = history[index - 1];
                        if (nextVersion) {
                          try {
                            const nextData = JSON.parse(
                              nextVersion.data,
                            ) as typeof historyData;
                            historyData.fields.forEach((field) => {
                              const nextField = nextData.fields.find(
                                (f) => f.fieldId === field.fieldId,
                              );
                              if (
                                nextField &&
                                nextField.value !== field.value
                              ) {
                                changedFieldIds.add(field.fieldId);
                              }
                            });
                            if (historyData.rating !== nextData.rating) {
                              changedFieldIds.add(-1);
                            }
                            if (historyData.comments !== nextData.comments) {
                              changedFieldIds.add(-2);
                            }
                          } catch {
                            // Ignore
                          }
                        }
                      }

                      return (
                        <Card
                          key={historyItem.id}
                          className="bg-muted/50 border-2"
                        >
                          <CardContent className="p-4">
                            <div className="mb-3 flex items-start justify-between">
                              <div>
                                <p className="text-sm font-medium">
                                  Version {history.length - index}
                                </p>
                                <p className="text-muted-foreground text-xs">
                                  Edited by{" "}
                                  {historyItem.editedBy?.name ?? "Unknown"}{" "}
                                  {formatRelativeTime(historyItem.createdAt)}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                {changedFieldIds.size > 0 && (
                                  <Badge
                                    variant="secondary"
                                    className="bg-amber-100 text-xs text-amber-800 dark:bg-amber-900 dark:text-amber-100"
                                  >
                                    {changedFieldIds.size} change
                                    {changedFieldIds.size !== 1 ? "s" : ""}
                                  </Badge>
                                )}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    toggleVersionExpanded(historyItem.id)
                                  }
                                  className="h-auto p-1"
                                >
                                  {isExpanded ? (
                                    <ChevronUp className="h-4 w-4" />
                                  ) : (
                                    <ChevronDown className="h-4 w-4" />
                                  )}
                                </Button>
                              </div>
                            </div>

                            {/* Show rating and comments if they existed */}
                            {(historyData.rating ?? historyData.comments) && (
                              <div
                                className={`mb-3 space-y-2 rounded-md p-3 text-sm ${
                                  changedFieldIds.has(-1) ||
                                  changedFieldIds.has(-2)
                                    ? "border border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/20"
                                    : "bg-background"
                                }`}
                              >
                                {historyData.rating && (
                                  <div className="flex items-center gap-2">
                                    <span className="text-muted-foreground">
                                      Rating:
                                    </span>
                                    <div className="flex items-center gap-1">
                                      {[1, 2, 3, 4, 5].map((i) => (
                                        <Star
                                          key={i}
                                          className={`h-3 w-3 ${
                                            i <= historyData.rating!
                                              ? "fill-yellow-400 text-yellow-400"
                                              : "text-muted-foreground/30"
                                          }`}
                                        />
                                      ))}
                                      <span className="text-muted-foreground ml-1 text-xs">
                                        {historyData.rating}/5
                                      </span>
                                    </div>
                                  </div>
                                )}
                                {historyData.comments && (
                                  <div>
                                    <span className="text-muted-foreground">
                                      Comments:
                                    </span>
                                    <p className="text-muted-foreground mt-1 text-xs">
                                      {historyData.comments}
                                    </p>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Show all fields or preview */}
                            <div className="space-y-2">
                              {!isExpanded ? (
                                <>
                                  {historyData.fields
                                    .slice(0, 2)
                                    .map((field) => {
                                      let displayValue = field.value;
                                      try {
                                        const parsed = JSON.parse(
                                          field.value,
                                        ) as string[] | string;
                                        if (Array.isArray(parsed)) {
                                          displayValue = parsed.join(", ");
                                        }
                                      } catch {
                                        // Not JSON, use as-is
                                      }

                                      const isChanged = changedFieldIds.has(
                                        field.fieldId,
                                      );

                                      return (
                                        <div
                                          key={field.fieldId}
                                          className={`truncate rounded p-2 text-xs ${
                                            isChanged
                                              ? "border border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/20"
                                              : ""
                                          }`}
                                        >
                                          <span className="font-medium">
                                            {field.fieldLabel}:
                                          </span>{" "}
                                          <span className="text-muted-foreground">
                                            {displayValue}
                                          </span>
                                        </div>
                                      );
                                    })}
                                  {historyData.fields.length > 2 && (
                                    <p className="text-muted-foreground text-xs">
                                      +{historyData.fields.length - 2} more
                                      fields (click to expand)
                                    </p>
                                  )}
                                </>
                              ) : (
                                <>
                                  {historyData.fields.map((field) => {
                                    let displayValue = field.value;
                                    const formField =
                                      response.responseFields.find(
                                        (rf) =>
                                          rf.formField.id === field.fieldId,
                                      )?.formField;

                                    try {
                                      const parsed = JSON.parse(field.value) as
                                        | string[]
                                        | string;
                                      if (Array.isArray(parsed)) {
                                        displayValue = parsed.join(", ");
                                      }
                                    } catch {
                                      // Not JSON, use as-is
                                    }

                                    const isChanged = changedFieldIds.has(
                                      field.fieldId,
                                    );

                                    return (
                                      <div
                                        key={field.fieldId}
                                        className={`space-y-1 rounded p-3 ${
                                          isChanged
                                            ? "border border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/20"
                                            : "bg-background"
                                        }`}
                                      >
                                        <Label className="text-xs font-medium">
                                          {field.fieldLabel}
                                        </Label>
                                        {formField ? (
                                          <FormFieldDisplay
                                            field={formField}
                                            value={field.value}
                                          />
                                        ) : (
                                          <p className="text-muted-foreground text-sm">
                                            {displayValue}
                                          </p>
                                        )}
                                      </div>
                                    );
                                  })}
                                </>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
