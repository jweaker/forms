"use client";

import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Badge } from "~/components/ui/badge";
import { Skeleton } from "~/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "~/components/ui/tabs";
import { toast } from "sonner";
import { useState, useMemo } from "react";
import {
  LayoutGrid,
  List,
  Plus,
  MoreVertical,
  Edit,
  Copy,
  Trash,
  ExternalLink,
  BarChart3,
  Search,
  FileText,
  MessageSquare,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  formatRelativeTime,
  copyToClipboard,
  getPublicFormUrl,
} from "~/lib/utils";
import { UserMenu } from "~/components/user-menu";
import { MySubmissions } from "./my-submissions";

type ViewMode = "grid" | "list";
type DashboardTab = "forms" | "submissions";

export default function DashboardPage() {
  const router = useRouter();
  const [dashboardTab, setDashboardTab] = useState<DashboardTab>("forms");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const { data: forms, isLoading } = api.forms.list.useQuery();
  const createFormMutation = api.forms.create.useMutation({
    onSuccess: (newForm) => {
      if (newForm) {
        toast.success("Form created successfully");
        router.push(`/forms/${newForm.slug}/edit`);
      }
    },
    onError: (error) => {
      toast.error(`Failed to create form: ${error.message}`);
    },
  });

  const deleteFormMutation = api.forms.delete.useMutation({
    onSuccess: () => {
      toast.success("Form deleted successfully");
      void utils.forms.list.invalidate();
    },
    onError: (error) => {
      toast.error(`Failed to delete form: ${error.message}`);
    },
  });

  const duplicateFormMutation = api.forms.duplicate.useMutation({
    onSuccess: (newForm) => {
      if (newForm) {
        toast.success("Form duplicated successfully");
        void utils.forms.list.invalidate();
        router.push(`/forms/${newForm.slug}/edit`);
      }
    },
    onError: (error) => {
      toast.error(`Failed to duplicate form: ${error.message}`);
    },
  });

  const utils = api.useUtils();

  const handleCreateForm = () => {
    createFormMutation.mutate({
      name: "Untitled Form",
      description: "",
      isPublic: false,
      allowAnonymous: true,
    });
  };

  const handleDeleteForm = (id: number, name: string) => {
    toast(
      <div className="flex flex-col gap-2">
        <p className="font-semibold">Delete &quot;{name}&quot;?</p>
        <p className="text-muted-foreground text-sm">
          This action cannot be undone.
        </p>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="destructive"
            onClick={() => {
              deleteFormMutation.mutate({ id });
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
      {
        duration: 10000,
      },
    );
  };

  const handleDuplicateForm = (id: number) => {
    duplicateFormMutation.mutate({ id });
  };

  const handleCopyLink = (slug: string) => {
    const url = getPublicFormUrl(slug);
    void copyToClipboard(url);
    toast.success("Link copied to clipboard");
  };

  // Filter forms based on search query
  const filteredForms = useMemo(() => {
    if (!forms?.items) return [];
    if (!searchQuery.trim()) return forms.items;

    const query = searchQuery.toLowerCase();
    return forms.items.filter(
      (form) =>
        form.name.toLowerCase().includes(query) ||
        (form.description?.toLowerCase().includes(query) ?? false) ||
        form.slug.toLowerCase().includes(query),
    );
  }, [forms?.items, searchQuery]);

  if (isLoading) {
    return (
      <div className="container mx-auto max-w-7xl px-4 py-6">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div className="flex-1">
            <Skeleton className="mb-2 h-8 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-44" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-7xl px-4 py-6">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex-shrink-0">
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground text-sm">
            Manage your forms and submissions
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* User Menu */}
          <UserMenu />
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs
        value={dashboardTab}
        onValueChange={(v: string) => setDashboardTab(v as DashboardTab)}
        className="w-full"
      >
        <TabsList className="mb-6">
          <TabsTrigger value="forms">
            <FileText className="mr-2 h-4 w-4" />
            My Forms
          </TabsTrigger>
          <TabsTrigger value="submissions">
            <MessageSquare className="mr-2 h-4 w-4" />
            My Submissions
          </TabsTrigger>
        </TabsList>

        {/* Forms Tab Content */}
        <TabsContent value="forms">
          {/* Forms Header with Search */}
          <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-1 items-center gap-3">
              {/* Search Bar */}
              {forms && forms.items.length > 0 && (
                <div className="relative flex-1 lg:max-w-md">
                  <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                  <Input
                    placeholder="Search forms..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-10 pl-9"
                  />
                </div>
              )}

              {/* View Toggle */}
              <Tabs
                value={viewMode}
                onValueChange={(v: string) => setViewMode(v as ViewMode)}
                className="flex-shrink-0"
              >
                <TabsList>
                  <TabsTrigger value="grid" className="px-3">
                    <LayoutGrid className="h-4 w-4" />
                  </TabsTrigger>
                  <TabsTrigger value="list" className="px-3">
                    <List className="h-4 w-4" />
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              {/* Create Button */}
              <Button
                onClick={handleCreateForm}
                disabled={createFormMutation.isPending}
                className="flex-shrink-0"
              >
                <Plus className="mr-2 h-4 w-4" />
                New Form
              </Button>
            </div>
          </div>

          {/* Empty State */}
          {!forms || forms.items.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <div className="bg-muted mb-4 rounded-full p-6">
                  <FileText className="text-muted-foreground h-10 w-10" />
                </div>
                <h2 className="mb-2 text-xl font-semibold">No forms yet</h2>
                <p className="text-muted-foreground mb-6 text-center">
                  Get started by creating your first form
                </p>
                <Button
                  onClick={handleCreateForm}
                  disabled={createFormMutation.isPending}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Create Form
                </Button>
              </CardContent>
            </Card>
          ) : filteredForms.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <div className="bg-muted mb-4 rounded-full p-6">
                  <Search className="text-muted-foreground h-10 w-10" />
                </div>
                <h2 className="mb-2 text-xl font-semibold">No forms found</h2>
                <p className="text-muted-foreground mb-4 text-center">
                  Try adjusting your search query
                </p>
                <Button variant="outline" onClick={() => setSearchQuery("")}>
                  Clear Search
                </Button>
              </CardContent>
            </Card>
          ) : viewMode === "grid" ? (
            /* Grid View */
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredForms.map((form) => (
                <Card
                  key={form.id}
                  className="group hover:border-primary/20 flex flex-col pt-2 transition-all hover:shadow-md"
                >
                  <CardHeader className="p-4 pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate text-base leading-tight font-semibold">
                          {form.name}
                        </h3>
                        {form.description && (
                          <p className="text-muted-foreground mt-1 line-clamp-2 text-xs">
                            {form.description}
                          </p>
                        )}
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 flex-shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => handleCopyLink(form.slug)}
                          >
                            <Copy className="mr-2 h-4 w-4" />
                            Copy Link
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() =>
                              window.open(`/f/${form.slug}`, "_blank")
                            }
                          >
                            <ExternalLink className="mr-2 h-4 w-4" />
                            Open Form
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleDuplicateForm(form.id)}
                          >
                            <Copy className="mr-2 h-4 w-4" />
                            Duplicate
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDeleteForm(form.id, form.name)}
                            className="text-destructive"
                          >
                            <Trash className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    {/* Stats and Badge */}
                    <div className="mt-3 flex items-center justify-between text-xs">
                      <Badge
                        variant={
                          form.status === "published" ? "default" : "secondary"
                        }
                        className="text-xs"
                      >
                        {form.status}
                      </Badge>
                      <span className="text-muted-foreground">
                        {formatRelativeTime(form.updatedAt)}
                      </span>
                    </div>
                  </CardHeader>

                  <CardContent className="flex-1 px-4 pt-0 pb-0">
                    {/* Stats */}
                    <div className="text-muted-foreground flex items-center gap-4 text-xs">
                      <div className="flex items-center gap-1.5">
                        <MessageSquare className="h-3.5 w-3.5" />
                        <span>
                          {form.responseCount ?? 0} response
                          {form.responseCount !== 1 ? "s" : ""}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <FileText className="h-3.5 w-3.5" />
                        <span>
                          {form.fields.length} field
                          {form.fields.length !== 1 ? "s" : ""}
                        </span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="mt-3 flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push(`/forms/${form.slug}/edit`)}
                        className="h-8 flex-1 text-xs"
                      >
                        <Edit className="mr-1.5 h-3.5 w-3.5" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          router.push(`/forms/${form.slug}/responses`)
                        }
                        className="h-8 flex-1 text-xs"
                      >
                        <BarChart3 className="mr-1.5 h-3.5 w-3.5" />
                        Responses
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            /* List View */
            <div className="space-y-2">
              {filteredForms.map((form) => (
                <Card
                  key={form.id}
                  className="hover:border-primary/20 p-2 transition-all hover:shadow-md"
                >
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex items-center gap-2">
                        <h3 className="truncate font-semibold">{form.name}</h3>
                        <Badge
                          variant={
                            form.status === "published"
                              ? "default"
                              : "secondary"
                          }
                          className="flex-shrink-0 text-xs"
                        >
                          {form.status}
                        </Badge>
                      </div>
                      <div className="text-muted-foreground flex items-center gap-3 text-xs">
                        <span>{formatRelativeTime(form.updatedAt)}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <MessageSquare className="h-3 w-3" />
                          {form.responseCount ?? 0} response
                          {form.responseCount !== 1 ? "s" : ""}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <FileText className="h-3 w-3" />
                          {form.fields.length} field
                          {form.fields.length !== 1 ? "s" : ""}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-shrink-0 items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          router.push(`/forms/${form.slug}/responses`)
                        }
                        className="h-9"
                      >
                        <BarChart3 className="mr-2 h-4 w-4" />
                        Responses
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push(`/forms/${form.slug}/edit`)}
                        className="h-9"
                      >
                        <Edit className="mr-2 h-4 w-4" />
                        Edit
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => handleCopyLink(form.slug)}
                          >
                            <Copy className="mr-2 h-4 w-4" />
                            Copy Link
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() =>
                              window.open(`/f/${form.slug}`, "_blank")
                            }
                          >
                            <ExternalLink className="mr-2 h-4 w-4" />
                            Open Form
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleDuplicateForm(form.id)}
                          >
                            <Copy className="mr-2 h-4 w-4" />
                            Duplicate
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDeleteForm(form.id, form.name)}
                            className="text-destructive"
                          >
                            <Trash className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Submissions Tab Content */}
        <TabsContent value="submissions">
          <MySubmissions />
        </TabsContent>
      </Tabs>
    </div>
  );
}
