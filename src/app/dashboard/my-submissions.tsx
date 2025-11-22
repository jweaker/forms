"use client";

import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { Skeleton } from "~/components/ui/skeleton";
import { Input } from "~/components/ui/input";
import { Edit, ExternalLink, FileText, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { formatRelativeTime } from "~/lib/utils";
import { useState, useMemo } from "react";

export function MySubmissions() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const { data: submissionsData, isLoading } =
    api.formResponses.mySubmissions.useQuery({
      limit: 50,
    });

  const submissions = useMemo(
    () => submissionsData?.items ?? [],
    [submissionsData?.items],
  );

  // Filter submissions based on search query
  const filteredSubmissions = useMemo(() => {
    if (!searchQuery.trim()) return submissions;

    const query = searchQuery.toLowerCase();
    return submissions.filter((submission) => {
      // Search in form name
      if (submission.form.name.toLowerCase().includes(query)) return true;

      // Search in response field values
      return submission.responseFields.some((field) => {
        const label = field.formField.label.toLowerCase();
        const value = field.value.toLowerCase();
        return label.includes(query) || value.includes(query);
      });
    });
  }, [submissions, searchQuery]);

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-10 w-full max-w-md" />
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
    );
  }

  if (submissions.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-16">
          <div className="bg-muted mb-4 rounded-full p-6">
            <FileText className="text-muted-foreground h-10 w-10" />
          </div>
          <h2 className="mb-2 text-xl font-semibold">No submissions yet</h2>
          <p className="text-muted-foreground text-center">
            Forms you submit will appear here
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {/* Search bar */}
      <div className="relative max-w-md">
        <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
        <Input
          type="text"
          placeholder="Search submissions..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Results count */}
      {searchQuery && (
        <p className="text-muted-foreground text-sm">
          Found {filteredSubmissions.length} of {submissions.length} submission
          {submissions.length !== 1 ? "s" : ""}
        </p>
      )}

      {/* No results message */}
      {filteredSubmissions.length === 0 && searchQuery && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Search className="text-muted-foreground mb-3 h-8 w-8" />
            <p className="text-muted-foreground text-sm">
              No submissions found matching &quot;{searchQuery}&quot;
            </p>
          </CardContent>
        </Card>
      )}

      {/* Submissions list */}
      {filteredSubmissions.map((submission) => {
        const form = submission.form;
        const canEdit = form.allowEditing;

        return (
          <Card
            key={submission.id}
            className="hover:border-primary/20 cursor-pointer transition-all hover:shadow-md"
            onClick={() =>
              router.push(`/forms/${form.slug}/responses/${submission.id}`)
            }
          >
            <CardContent className="flex items-start justify-between gap-4 p-3">
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex items-center gap-2">
                  <h3 className="truncate font-semibold">{form.name}</h3>
                  <div className="text-muted-foreground flex items-center gap-2 text-xs">
                    <span>•</span>
                    <span className="whitespace-nowrap">
                      {formatRelativeTime(submission.createdAt)}
                    </span>
                    {submission.rating && (
                      <>
                        <span>•</span>
                        <span className="whitespace-nowrap">
                          ⭐ {submission.rating}/5
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Show first 2 field responses */}
                {submission.responseFields.length > 0 && (
                  <div className="text-muted-foreground mt-2 space-y-0.5 text-sm">
                    {submission.responseFields.slice(0, 2).map((field) => {
                      let displayValue = field.value;
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

                      return (
                        <div key={field.id} className="truncate text-xs">
                          <span className="font-medium">
                            {field.formField.label}:
                          </span>{" "}
                          {displayValue}
                        </div>
                      );
                    })}
                    {submission.responseFields.length > 2 && (
                      <div className="text-xs opacity-60">
                        +{submission.responseFields.length - 2} more
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div
                className="flex flex-shrink-0 gap-1"
                onClick={(e) => e.stopPropagation()}
              >
                {canEdit && (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() =>
                      router.push(`/f/${form.slug}/edit/${submission.id}`)
                    }
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => window.open(`/f/${form.slug}`, "_blank")}
                  title="Open form in new tab"
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}

      {submissionsData?.hasMore && !searchQuery && (
        <div className="text-muted-foreground text-center text-sm">
          Showing {submissions.length} of {submissionsData.total} submissions
        </div>
      )}
    </div>
  );
}
