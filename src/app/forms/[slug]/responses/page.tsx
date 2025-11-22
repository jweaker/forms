"use client";

import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Skeleton } from "~/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { toast } from "sonner";
import {
  ArrowLeft,
  Download,
  Eye,
  Trash,
  MoreVertical,
  FileText,
  Calendar,
  User,
  Star,
  Filter,
  Search,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { formatDate, formatRelativeTime } from "~/lib/utils";
import { useState, useMemo } from "react";
import { Input } from "~/components/ui/input";

export default function ResponsesPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const [versionFilter, setVersionFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const { data: form, isLoading: formLoading } = api.forms.getBySlug.useQuery(
    {
      slug,
    },
    {
      enabled: !!slug,
    },
  );

  // Get all available versions from version history
  const { data: versionHistory } = api.forms.getVersionHistory.useQuery(
    { formId: form?.id ?? 0 },
    { enabled: !!form?.id },
  );

  // Get the form version for the filtered version (if filtering)
  const { data: filteredFormVersion } = api.forms.getFormVersion.useQuery(
    {
      formId: form?.id ?? 0,
      version:
        versionFilter === "all"
          ? (form?.currentVersion ?? 1)
          : parseInt(versionFilter),
    },
    {
      enabled: !!form?.id,
    },
  );

  const { data: responsesData, isLoading: responsesLoading } =
    api.formResponses.list.useQuery(
      {
        formId: form?.id ?? 0,
        limit: 100,
        version: versionFilter === "all" ? undefined : parseInt(versionFilter),
      },
      {
        enabled: !!form?.id,
        refetchOnMount: true,
      },
    );

  const deleteResponseMutation = api.formResponses.delete.useMutation({
    onSuccess: () => {
      toast.success("Response deleted successfully");
      if (form?.id) {
        void utils.formResponses.list.invalidate({ formId: form.id });
      }
    },
    onError: (error) => {
      toast.error(`Failed to delete response: ${error.message}`);
    },
  });

  const utils = api.useUtils();

  // Get responses data - must be before any conditional returns (Rules of Hooks)
  const responses = responsesData?.items ?? [];
  const totalResponses = responsesData?.total ?? 0;

  // Use filtered version fields if filtering, otherwise use current form fields
  const displayFields = filteredFormVersion?.fields ?? form?.fields ?? [];

  // Get unique versions - from version history and current form
  const availableVersions = useMemo(() => {
    const versions = new Set<number>();

    // Add current version
    if (form?.currentVersion) {
      versions.add(form.currentVersion);
    }

    // Add versions from history
    if (versionHistory) {
      versionHistory.forEach((vh) => versions.add(vh.version));
    }

    // Add versions from responses (in case of data inconsistency)
    responses.forEach((response) => {
      if (response.formVersion) {
        versions.add(response.formVersion);
      }
    });

    return Array.from(versions).sort((a, b) => b - a); // Sort descending
  }, [form?.currentVersion, versionHistory, responses]);

  // Filter responses based on search query
  const filteredResponses = useMemo(() => {
    if (!searchQuery.trim()) return responses;

    const query = searchQuery.toLowerCase();
    return responses.filter((response) => {
      // Search in user info
      const userName = response.createdBy?.name?.toLowerCase() ?? "";
      const userEmail =
        response.createdBy?.email?.toLowerCase() ??
        response.submitterEmail?.toLowerCase() ??
        "";
      if (userName.includes(query) || userEmail.includes(query)) return true;

      // Search in response field values
      return response.responseFields.some((field) => {
        const value = field.value.toLowerCase();
        return value.includes(query);
      });
    });
  }, [responses, searchQuery]);

  const handleDeleteResponse = (responseId: number) => {
    if (confirm("Are you sure you want to delete this response?")) {
      deleteResponseMutation.mutate({ responseId });
    }
  };

  const handleExportCSV = async () => {
    if (!form?.id) return;
    try {
      const { data, headers } = await utils.client.formResponses.export.query({
        formId: form.id,
      });

      // Convert data to CSV format
      const csvRows = [];
      // Add headers
      csvRows.push(headers.join(","));
      // Add data rows
      for (const row of data) {
        const values = headers.map((header) => {
          const value = row[header] ?? "";
          // Escape values that contain commas, quotes, or newlines
          if (
            value.includes(",") ||
            value.includes('"') ||
            value.includes("\n")
          ) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        });
        csvRows.push(values.join(","));
      }
      const csvContent = csvRows.join("\n");

      // Create a blob from the CSV data and trigger download
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const timestamp = new Date().toISOString().split("T")[0];
      a.download = `form-responses-${slug}-${timestamp}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success("CSV exported successfully");
    } catch {
      toast.error("Failed to export responses");
    }
  };

  if (formLoading || responsesLoading) {
    return (
      <div className="container mx-auto py-8">
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

  if (!form) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Form not found</h1>
          <Button className="mt-4" onClick={() => router.push("/dashboard")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-3 py-4 sm:px-4 sm:py-8">
      <div className="mb-6 flex flex-col gap-3 sm:mb-8 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 sm:gap-4">
          <Button
            variant="ghost"
            size="icon"
            asChild
            className="h-8 w-8 sm:h-10 sm:w-10"
          >
            <Link href="/dashboard">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-xl font-bold sm:text-3xl">{form.name}</h1>
            <p className="text-muted-foreground text-xs sm:text-sm">
              Form Responses
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {availableVersions.length > 0 && (
            <Select value={versionFilter} onValueChange={setVersionFilter}>
              <SelectTrigger className="h-8 w-[140px] text-xs sm:h-10 sm:w-[180px] sm:text-sm">
                <Filter className="mr-1.5 h-3.5 w-3.5 sm:mr-2 sm:h-4 sm:w-4" />
                <SelectValue placeholder="All versions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All versions</SelectItem>
                {availableVersions.map((version) => (
                  <SelectItem key={version} value={version.toString()}>
                    Version {version}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button
            variant="outline"
            asChild
            className="h-8 flex-1 text-xs sm:h-10 sm:flex-initial sm:text-sm"
          >
            <Link href={`/forms/${slug}/edit`} prefetch={true}>
              <span className="hidden sm:inline">Edit Form</span>
              <span className="sm:hidden">Edit</span>
            </Link>
          </Button>
          <Button
            onClick={handleExportCSV}
            disabled={responses.length === 0}
            className="h-8 flex-1 text-xs sm:h-10 sm:flex-initial sm:text-sm"
          >
            <Download className="mr-1.5 h-3.5 w-3.5 sm:mr-2 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Export CSV</span>
            <span className="sm:hidden">Export</span>
          </Button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="mb-4 sm:mb-6">
        <div className="relative">
          <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
          <Input
            placeholder="Search by user, email, or response content..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9 pl-9 sm:h-10"
          />
        </div>
      </div>

      <div className="mb-4 grid gap-2 sm:mb-6 sm:gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 pb-2 sm:p-6">
            <CardTitle className="text-xs font-medium sm:text-sm">
              Total Responses
            </CardTitle>
            <FileText className="text-muted-foreground h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </CardHeader>
          <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
            <div className="text-xl font-bold sm:text-2xl">
              {totalResponses}
            </div>
            {versionFilter !== "all" && (
              <p className="text-muted-foreground mt-1 text-xs">
                For version {versionFilter}
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 pb-2 sm:p-6">
            <CardTitle className="text-xs font-medium sm:text-sm">
              {versionFilter === "all" ? "Current Version" : "Viewing Version"}
            </CardTitle>
            <Calendar className="text-muted-foreground h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </CardHeader>
          <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
            <div className="text-xl font-bold sm:text-2xl">
              v
              {versionFilter === "all"
                ? (form.currentVersion ?? 1)
                : versionFilter}
            </div>
            <p className="text-muted-foreground mt-1 text-xs">
              {displayFields.length} field
              {displayFields.length !== 1 ? "s" : ""}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 pb-2 sm:p-6">
            <CardTitle className="text-xs font-medium sm:text-sm">
              Status
            </CardTitle>
            <Badge
              variant={form.status === "published" ? "default" : "secondary"}
              className="text-[10px] sm:text-xs"
            >
              {form.status}
            </Badge>
          </CardHeader>
          <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
            <div className="text-muted-foreground text-xs sm:text-sm">
              {form.status === "published"
                ? "Accepting responses"
                : "Not accepting responses"}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base sm:text-lg">
            Responses ({filteredResponses.length}
            {searchQuery && ` of ${totalResponses}`})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredResponses.length === 0 ? (
            <div className="text-muted-foreground py-12 text-center sm:py-16">
              <FileText className="mx-auto mb-4 h-10 w-10 opacity-50 sm:h-12 sm:w-12" />
              <p className="text-base font-medium sm:text-lg">
                {searchQuery ? "No matching responses" : "No responses yet"}
              </p>
              <p className="mt-1 text-xs sm:text-sm">
                {searchQuery
                  ? "Try adjusting your search query"
                  : "Responses will appear here once users submit your form."}
              </p>
            </div>
          ) : (
            <>
              {/* Mobile Card View */}
              <div className="space-y-3 md:hidden">
                {filteredResponses.map((response) => {
                  const fieldValues = new Map<number, string>();
                  for (const responseField of response.responseFields) {
                    let displayValue: string;
                    try {
                      const parsed = JSON.parse(responseField.value) as
                        | string[]
                        | string;
                      if (Array.isArray(parsed)) {
                        displayValue = parsed.join(", ");
                      } else {
                        displayValue = responseField.value;
                      }
                    } catch {
                      displayValue = responseField.value;
                    }
                    fieldValues.set(responseField.formFieldId, displayValue);
                  }

                  return (
                    <Card key={response.id} className="border">
                      <CardContent className="p-4">
                        <div className="mb-3 flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <User className="text-muted-foreground h-4 w-4" />
                              <span className="text-sm font-medium">
                                {response.createdBy?.name ??
                                  response.submitterEmail ??
                                  "Anonymous"}
                              </span>
                            </div>
                            <div className="text-muted-foreground mt-1 flex items-center gap-2 text-xs">
                              <span>
                                {formatRelativeTime(response.createdAt)}
                              </span>
                              {availableVersions.length > 1 && (
                                <>
                                  <span>•</span>
                                  <Badge
                                    variant="outline"
                                    className="text-[10px]"
                                  >
                                    v{response.formVersion ?? 1}
                                  </Badge>
                                </>
                              )}
                              {response.rating && (
                                <>
                                  <span>•</span>
                                  <div className="flex items-center gap-1">
                                    <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                                    <span>{response.rating}/5</span>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                              >
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() =>
                                  router.push(
                                    `/forms/${slug}/responses/${response.id}`,
                                  )
                                }
                              >
                                <Eye className="mr-2 h-4 w-4" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() =>
                                  handleDeleteResponse(response.id)
                                }
                                className="text-destructive"
                              >
                                <Trash className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>

                        {/* Show first 2 fields */}
                        {displayFields.slice(0, 2).map((field) => (
                          <div key={field.id} className="mt-2 border-t pt-2">
                            <p className="text-muted-foreground text-xs font-medium">
                              {field.label}
                            </p>
                            <p className="mt-1 line-clamp-2 text-sm">
                              {fieldValues.get(field.id) ?? "-"}
                            </p>
                          </div>
                        ))}

                        {displayFields.length > 2 && (
                          <Button
                            variant="link"
                            size="sm"
                            className="mt-2 h-auto p-0 text-xs"
                            onClick={() =>
                              router.push(
                                `/forms/${slug}/responses/${response.id}`,
                              )
                            }
                          >
                            View all {displayFields.length} fields →
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {/* Desktop Table View */}
              <div className="hidden overflow-x-auto md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Submitted</TableHead>
                      <TableHead>User</TableHead>
                      {availableVersions.length > 1 && (
                        <TableHead>Version</TableHead>
                      )}
                      <TableHead>Rating</TableHead>
                      <TableHead>IP Address</TableHead>
                      {displayFields.slice(0, 2).map((field) => (
                        <TableHead key={field.id}>{field.label}</TableHead>
                      ))}
                      {displayFields.length > 2 && (
                        <TableHead>+{displayFields.length - 2} more</TableHead>
                      )}
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredResponses.map((response) => {
                      // Create map of field ID to display value
                      const fieldValues = new Map<number, string>();
                      for (const responseField of response.responseFields) {
                        // Parse value - could be JSON array or string
                        let displayValue: string;
                        try {
                          const parsed = JSON.parse(responseField.value) as
                            | string[]
                            | string;
                          if (Array.isArray(parsed)) {
                            // Multi-select: join array values
                            displayValue = parsed.join(", ");
                          } else {
                            displayValue = responseField.value;
                          }
                        } catch {
                          // Not JSON, use as-is
                          displayValue = responseField.value;
                        }
                        fieldValues.set(
                          responseField.formFieldId,
                          displayValue,
                        );
                      }

                      return (
                        <TableRow key={response.id}>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="text-sm">
                                {formatRelativeTime(response.createdAt)}
                              </span>
                              <span className="text-muted-foreground text-xs">
                                {formatDate(response.createdAt)}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <User className="text-muted-foreground h-4 w-4" />
                              <div className="flex flex-col">
                                <span className="text-sm">
                                  {response.createdBy?.name ??
                                    response.submitterEmail ??
                                    "Anonymous"}
                                </span>
                                {response.createdBy?.email && (
                                  <span className="text-muted-foreground text-xs">
                                    {response.createdBy.email}
                                  </span>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          {availableVersions.length > 1 && (
                            <TableCell>
                              <Badge variant="outline" className="text-xs">
                                v{response.formVersion ?? 1}
                              </Badge>
                            </TableCell>
                          )}
                          <TableCell>
                            <div className="flex items-center gap-1">
                              {response.rating ? (
                                <>
                                  <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                                  <span className="text-sm">
                                    {response.rating}/5
                                  </span>
                                </>
                              ) : (
                                <span className="text-muted-foreground text-xs">
                                  -
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-muted-foreground font-mono text-xs">
                              {response.ipAddress ?? "-"}
                            </span>
                          </TableCell>
                          {displayFields.slice(0, 2).map((field) => (
                            <TableCell key={field.id}>
                              <div className="max-w-[200px] truncate text-sm">
                                {fieldValues.get(field.id) ?? "-"}
                              </div>
                            </TableCell>
                          ))}
                          {displayFields.length > 2 && (
                            <TableCell>
                              <span className="text-muted-foreground text-xs">
                                ...
                              </span>
                            </TableCell>
                          )}
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() =>
                                    router.push(
                                      `/forms/${slug}/responses/${response.id}`,
                                    )
                                  }
                                >
                                  <Eye className="mr-2 h-4 w-4" />
                                  View Details
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() =>
                                    handleDeleteResponse(response.id)
                                  }
                                  className="text-destructive"
                                >
                                  <Trash className="mr-2 h-4 w-4" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
