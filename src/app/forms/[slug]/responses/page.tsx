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
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { formatDate, formatRelativeTime } from "~/lib/utils";

export default function ResponsesPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const { data: form, isLoading: formLoading } = api.forms.getBySlug.useQuery(
    {
      slug,
    },
    {
      enabled: !!slug,
    },
  );
  const { data: responsesData, isLoading: responsesLoading } =
    api.formResponses.list.useQuery(
      {
        formId: form?.id ?? 0,
        limit: 100,
      },
      {
        enabled: !!form?.id,
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

  const responses = responsesData?.items ?? [];
  const totalResponses = responsesData?.total ?? 0;

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/dashboard")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{form.name}</h1>
            <p className="text-muted-foreground">Form Responses</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => router.push(`/forms/${slug}/edit`)}
          >
            Edit Form
          </Button>
          <Button onClick={handleExportCSV} disabled={responses.length === 0}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Responses
            </CardTitle>
            <FileText className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalResponses}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Form Fields</CardTitle>
            <Calendar className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{form.fields.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Status</CardTitle>
            <Badge
              variant={form.status === "published" ? "default" : "secondary"}
            >
              {form.status}
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="text-muted-foreground text-sm">
              {form.status === "published"
                ? "Accepting responses"
                : "Not accepting responses"}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Responses ({totalResponses})</CardTitle>
        </CardHeader>
        <CardContent>
          {responses.length === 0 ? (
            <div className="text-muted-foreground py-16 text-center">
              <FileText className="mx-auto mb-4 h-12 w-12 opacity-50" />
              <p className="text-lg font-medium">No responses yet</p>
              <p className="mt-1 text-sm">
                Responses will appear here once users submit your form.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Submitted</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Rating</TableHead>
                    <TableHead>IP Address</TableHead>
                    {form.fields.slice(0, 2).map((field) => (
                      <TableHead key={field.id}>{field.label}</TableHead>
                    ))}
                    {form.fields.length > 2 && (
                      <TableHead>+{form.fields.length - 2} more</TableHead>
                    )}
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {responses.map((response) => {
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
                      fieldValues.set(responseField.formFieldId, displayValue);
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
                        {form.fields.slice(0, 2).map((field) => (
                          <TableCell key={field.id}>
                            <div className="max-w-[200px] truncate text-sm">
                              {fieldValues.get(field.id) ?? "-"}
                            </div>
                          </TableCell>
                        ))}
                        {form.fields.length > 2 && (
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
          )}
        </CardContent>
      </Card>
    </div>
  );
}
