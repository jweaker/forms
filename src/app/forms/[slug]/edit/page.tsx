"use client";

import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import { Switch } from "~/components/ui/switch";
import { Badge } from "~/components/ui/badge";
import { Skeleton } from "~/components/ui/skeleton";
import { Separator } from "~/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { toast } from "sonner";
import { useState, useEffect, useMemo } from "react";
import {
  Plus,
  Save,
  Eye,
  Settings,
  GripVertical,
  Edit,
  Copy,
  Trash,
  ArrowLeft,
  ExternalLink,
  Upload,
  Check,
  Archive,
  ArchiveX,
  BarChart3,
  Sparkles,
  Loader2,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { copyToClipboard, getPublicFormUrl } from "~/lib/utils";
import {
  FIELD_TYPE_LABELS,
  type FieldType,
  VALIDATION_TEMPLATES,
  fieldTypeSupportsValidation,
  fieldTypeNeedsOptions,
  fieldTypeSupportsMultiSelect,
  fieldTypeSupportsMinMax,
  fieldTypeSupportsDefaultValue,
  fieldTypeSupportsPlaceholder,
} from "~/lib/field-types";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  deserializeFormFromAI,
  type AIFormStructure,
} from "~/lib/ai-form-utils";

type FormField = {
  id: number;
  createdAt: Date;
  updatedAt: Date | null;
  formId: number;
  label: string;
  type: string;
  required: boolean;
  placeholder: string | null;
  helpText: string | null;
  regexPattern: string | null;
  validationMessage: string | null;
  order: number;
  // New fields
  allowMultiple: boolean | null;
  selectionLimit: number | null;
  minValue: number | null;
  maxValue: number | null;
  defaultValue: string | null;
  options: string | null; // JSON string
};

type FieldDialogMode = "create" | "edit";

export default function FormBuilderPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const { data: form, isLoading } = api.forms.getBySlug.useQuery({ slug });
  const updateFormMutation = api.forms.update.useMutation({
    onSuccess: (updatedForm) => {
      toast.success("Form updated successfully");

      // If slug changed, navigate to new URL without reload
      if (updatedForm && updatedForm.slug !== slug) {
        router.replace(`/forms/${updatedForm.slug}/edit`);
      } else {
        void utils.forms.getBySlug.invalidate({ slug });
      }
    },
    onError: (error) => {
      toast.error(`Failed to update form: ${error.message}`);
    },
  });

  const createFieldMutation = api.formFields.create.useMutation({
    onSuccess: () => {
      toast.success("Field created successfully");
      void utils.forms.getBySlug.invalidate({ slug });
      setFieldDialogOpen(false);
      resetFieldDialog();
    },
    onError: (error) => {
      toast.error(`Failed to create field: ${error.message}`);
    },
  });

  const updateFieldMutation = api.formFields.update.useMutation({
    onSuccess: () => {
      toast.success("Field updated successfully");
      void utils.forms.getBySlug.invalidate({ slug });
      setFieldDialogOpen(false);
      resetFieldDialog();
    },
    onError: (error) => {
      toast.error(`Failed to update field: ${error.message}`);
    },
  });

  const deleteFieldMutation = api.formFields.delete.useMutation({
    onSuccess: () => {
      toast.success("Field deleted successfully");
      void utils.forms.getBySlug.invalidate({ slug });
    },
    onError: (error) => {
      toast.error(`Failed to delete field: ${error.message}`);
    },
  });

  const reorderFieldsMutation = api.formFields.reorder.useMutation({
    onSuccess: () => {
      void utils.forms.getBySlug.invalidate({ slug });
    },
    onError: (error) => {
      toast.error(`Failed to reorder fields: ${error.message}`);
    },
  });

  const duplicateFieldMutation = api.formFields.duplicate.useMutation({
    onSuccess: () => {
      toast.success("Field duplicated successfully");
      void utils.forms.getBySlug.invalidate({ slug });
    },
    onError: (error) => {
      toast.error(`Failed to duplicate field: ${error.message}`);
    },
  });

  const utils = api.useUtils();

  // Form state
  const [formName, setFormName] = useState("");
  const [formSlug, setFormSlug] = useState("");
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [formDescription, setFormDescription] = useState("");
  const [formStatus, setFormStatus] = useState<
    "draft" | "published" | "archived"
  >("draft");
  const [allowAnonymous, setAllowAnonymous] = useState(true);
  const [allowMultipleSubmissions, setAllowMultipleSubmissions] =
    useState(true);
  const [allowEditing, setAllowEditing] = useState(false);

  // Field dialog state
  const [fieldDialogOpen, setFieldDialogOpen] = useState(false);
  const [fieldDialogMode, setFieldDialogMode] =
    useState<FieldDialogMode>("create");
  const [editingFieldId, setEditingFieldId] = useState<number | null>(null);
  const [fieldLabel, setFieldLabel] = useState("");
  const [fieldType, setFieldType] = useState<FieldType>("text");
  const [fieldRequired, setFieldRequired] = useState(false);
  const [fieldPlaceholder, setFieldPlaceholder] = useState("");
  const [fieldHelpText, setFieldHelpText] = useState("");
  const [fieldRegexPattern, setFieldRegexPattern] = useState("");
  const [fieldValidationMessage, setFieldValidationMessage] = useState("");
  const [fieldOptions, setFieldOptions] = useState<
    { label: string; isDefault: boolean }[]
  >([{ label: "", isDefault: false }]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  // New field configuration
  const [fieldAllowMultiple, setFieldAllowMultiple] = useState(false);
  const [fieldSelectionLimit, setFieldSelectionLimit] = useState<string>("");
  const [fieldMinValue, setFieldMinValue] = useState<string>("");
  const [fieldMaxValue, setFieldMaxValue] = useState<string>("");
  const [fieldDefaultValue, setFieldDefaultValue] = useState<string>("");

  // AI Generation state
  const [aiDialogOpen, setAiDialogOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  useEffect(() => {
    if (form) {
      setFormName(form.name);
      setFormSlug(form.slug);
      setFormDescription(form.description ?? "");
      setFormStatus(form.status as "draft" | "published" | "archived");
      setAllowAnonymous(form.allowAnonymous);
      setAllowMultipleSubmissions(form.allowMultipleSubmissions ?? true);
      setAllowEditing(form.allowEditing ?? false);
      // Reset slug manually edited flag when form loads
      setSlugManuallyEdited(false);
    }
  }, [form]);

  // Helper function to generate slug from name
  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "") // Remove special characters
      .replace(/\s+/g, "-") // Replace spaces with hyphens
      .replace(/-+/g, "-") // Replace multiple hyphens with single hyphen
      .replace(/^-+|-+$/g, ""); // Remove leading/trailing hyphens
  };

  // Auto-generate slug from name if not manually edited
  useEffect(() => {
    if (!slugManuallyEdited && formName) {
      setFormSlug(generateSlug(formName));
    }
  }, [formName, slugManuallyEdited]);

  // Keyboard shortcut for AI dialog (Cmd/Ctrl + K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setAiDialogOpen(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Check if form has changes
  const hasChanges = useMemo(() => {
    if (!form) return false;
    return (
      formName !== form.name ||
      formSlug !== form.slug ||
      formDescription !== (form.description ?? "") ||
      formStatus !== form.status ||
      allowAnonymous !== form.allowAnonymous ||
      allowMultipleSubmissions !== (form.allowMultipleSubmissions ?? true) ||
      allowEditing !== (form.allowEditing ?? false)
    );
  }, [
    form,
    formName,
    formSlug,
    formDescription,
    formStatus,
    allowAnonymous,
    allowMultipleSubmissions,
    allowEditing,
  ]);

  const resetFieldDialog = () => {
    setFieldLabel("");
    setFieldType("text");
    setFieldRequired(false);
    setFieldPlaceholder("");
    setFieldHelpText("");
    setFieldRegexPattern("");
    setFieldValidationMessage("");
    setFieldOptions([{ label: "", isDefault: false }]);
    setEditingFieldId(null);
    setSelectedTemplate("");
    setFieldAllowMultiple(false);
    setFieldSelectionLimit("");
    setFieldMinValue("");
    setFieldMaxValue("");
    setFieldDefaultValue("");
  };

  const handleOpenCreateField = () => {
    resetFieldDialog();
    setFieldDialogMode("create");
    setFieldDialogOpen(true);
  };

  const handleOpenEditField = (field: FormField) => {
    setFieldDialogMode("edit");
    setEditingFieldId(field.id);
    setFieldLabel(field.label);
    setFieldType(field.type as FieldType);
    setFieldRequired(field.required);
    setFieldPlaceholder(field.placeholder ?? "");
    setFieldHelpText(field.helpText ?? "");
    setFieldRegexPattern(field.regexPattern ?? "");
    setFieldValidationMessage(field.validationMessage ?? "");

    // Parse JSON options
    if (field.options) {
      try {
        const parsedOptions = JSON.parse(field.options) as Array<{
          label: string;
          isDefault?: boolean;
        }>;
        setFieldOptions(
          parsedOptions.map((opt) => ({
            label: opt.label,
            isDefault: opt.isDefault ?? false,
          })),
        );
      } catch {
        setFieldOptions([{ label: "", isDefault: false }]);
      }
    } else {
      setFieldOptions([{ label: "", isDefault: false }]);
    }

    setSelectedTemplate("");
    setFieldAllowMultiple(field.allowMultiple ?? false);
    setFieldSelectionLimit(
      field.selectionLimit ? field.selectionLimit.toString() : "",
    );
    setFieldMinValue(field.minValue ? field.minValue.toString() : "");
    setFieldMaxValue(field.maxValue ? field.maxValue.toString() : "");
    setFieldDefaultValue(field.defaultValue ?? "");
    setFieldDialogOpen(true);
  };

  const handleFieldTypeChange = (newType: FieldType) => {
    setFieldType(newType);

    // Clear regex validation when switching to a type that doesn't support it
    if (!fieldTypeSupportsValidation(newType)) {
      setFieldRegexPattern("");
      setFieldValidationMessage("");
      setSelectedTemplate("");
    }

    // Clear options when switching away from option-based fields
    if (!fieldTypeNeedsOptions(newType)) {
      setFieldOptions([{ label: "", isDefault: false }]);
    }

    // Clear multi-select settings when switching to non-multi-select fields
    if (!fieldTypeSupportsMultiSelect(newType)) {
      setFieldAllowMultiple(false);
      setFieldSelectionLimit("");
    }

    // Clear min/max when switching away from number/range fields
    if (!fieldTypeSupportsMinMax(newType)) {
      setFieldMinValue("");
      setFieldMaxValue("");
    }

    // Clear placeholder when switching to fields that don't support it
    if (!fieldTypeSupportsPlaceholder(newType)) {
      setFieldPlaceholder("");
    }

    // Set default min/max for range slider
    if (newType === "range") {
      if (!fieldMinValue) setFieldMinValue("0");
      if (!fieldMaxValue) setFieldMaxValue("10");
    }

    // Clear default value when switching to fields that don't support it
    if (!fieldTypeSupportsDefaultValue(newType)) {
      setFieldDefaultValue("");
    }
  };

  const handleSaveField = () => {
    if (!fieldLabel.trim()) {
      toast.error("Field label is required");
      return;
    }

    const hasOptions = fieldTypeNeedsOptions(fieldType);
    const validOptions = fieldOptions.filter((opt) => opt.label.trim());

    if (hasOptions && validOptions.length === 0) {
      toast.error("At least one option is required for this field type");
      return;
    }

    // Validate min/max for number and range fields
    if (fieldTypeSupportsMinMax(fieldType)) {
      const min = fieldMinValue ? parseFloat(fieldMinValue) : undefined;
      const max = fieldMaxValue ? parseFloat(fieldMaxValue) : undefined;

      if (min !== undefined && max !== undefined && min >= max) {
        toast.error("Maximum value must be greater than minimum value");
        return;
      }
    }

    // Validate selection limit
    if (
      fieldAllowMultiple &&
      fieldSelectionLimit &&
      parseInt(fieldSelectionLimit) < 1
    ) {
      toast.error("Selection limit must be at least 1");
      return;
    }

    // Only send regex validation for text/textarea fields
    const supportsValidation = fieldTypeSupportsValidation(fieldType);

    const fieldData = {
      label: fieldLabel,
      type: fieldType,
      required: fieldRequired,
      placeholder: fieldPlaceholder || undefined,
      helpText: fieldHelpText || undefined,
      regexPattern: supportsValidation
        ? fieldRegexPattern || undefined
        : undefined,
      validationMessage: supportsValidation
        ? fieldValidationMessage || undefined
        : undefined,
      options: hasOptions ? validOptions : undefined,
      allowMultiple: fieldTypeSupportsMultiSelect(fieldType)
        ? fieldAllowMultiple
        : undefined,
      selectionLimit:
        fieldAllowMultiple && fieldSelectionLimit
          ? parseInt(fieldSelectionLimit)
          : undefined,
      minValue: fieldMinValue ? parseFloat(fieldMinValue) : undefined,
      maxValue: fieldMaxValue ? parseFloat(fieldMaxValue) : undefined,
      defaultValue: fieldDefaultValue || undefined,
    };

    if (fieldDialogMode === "create") {
      if (!form) return;
      createFieldMutation.mutate({
        formId: form.id,
        ...fieldData,
      });
    } else if (editingFieldId) {
      updateFieldMutation.mutate({
        fieldId: editingFieldId,
        ...fieldData,
      });
    }
  };

  const handleDeleteField = (fieldId: number) => {
    toast(
      <div className="flex flex-col gap-2">
        <p className="font-semibold">Delete this field?</p>
        <p className="text-muted-foreground text-sm">
          This action cannot be undone.
        </p>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="destructive"
            onClick={() => {
              deleteFieldMutation.mutate({ fieldId });
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

  const handleDuplicateField = (fieldId: number) => {
    duplicateFieldMutation.mutate({ fieldId });
  };

  const handleSaveForm = () => {
    if (!form) return;
    updateFormMutation.mutate({
      id: form.id,
      name: formName,
      slug: formSlug,
      description: formDescription || undefined,
      status: formStatus,
      isPublic: true, // All forms are public now
      allowAnonymous,
      allowMultipleSubmissions,
      allowEditing,
    });
  };

  const handlePublish = async () => {
    if (!form) return;
    // Save any pending changes first, then publish
    try {
      const updatedForm = await updateFormMutation.mutateAsync({
        id: form.id,
        name: formName,
        slug: formSlug,
        description: formDescription || undefined,
        status: "published",
        isPublic: true,
        allowAnonymous,
        allowMultipleSubmissions,
        allowEditing,
      });
      setFormStatus("published");

      // If slug changed, navigate to new URL
      if (updatedForm && updatedForm.slug !== slug) {
        router.replace(`/forms/${updatedForm.slug}/edit`);
      }
    } catch {
      // Error is already handled by mutation's onError
    }
  };

  const handleUnpublish = async () => {
    if (!form) return;
    try {
      const updatedForm = await updateFormMutation.mutateAsync({
        id: form.id,
        name: formName,
        slug: formSlug,
        description: formDescription || undefined,
        status: "draft",
        isPublic: true,
        allowAnonymous,
        allowMultipleSubmissions,
      });
      setFormStatus("draft");

      // If slug changed, navigate to new URL
      if (updatedForm && updatedForm.slug !== slug) {
        router.replace(`/forms/${updatedForm.slug}/edit`);
      }
    } catch {
      // Error is already handled by mutation's onError
    }
  };

  const handleArchive = async () => {
    if (!form) return;
    try {
      const updatedForm = await updateFormMutation.mutateAsync({
        id: form.id,
        name: formName,
        slug: formSlug,
        description: formDescription || undefined,
        status: "draft",
        isPublic: true,
        allowAnonymous,
        allowMultipleSubmissions,
        allowEditing,
      });
      setFormStatus("archived");

      // If slug changed, navigate to new URL
      if (updatedForm && updatedForm.slug !== slug) {
        router.replace(`/forms/${updatedForm.slug}/edit`);
      }
    } catch {
      // Error is already handled by mutation's onError
    }
  };

  const handleUnarchive = async () => {
    if (!form) return;
    try {
      const updatedForm = await updateFormMutation.mutateAsync({
        id: form.id,
        name: formName,
        slug: formSlug,
        description: formDescription || undefined,
        status: "draft",
        isPublic: true,
        allowAnonymous,
        allowMultipleSubmissions,
        allowEditing,
      });
      setFormStatus("draft");

      // If slug changed, navigate to new URL
      if (updatedForm && updatedForm.slug !== slug) {
        router.replace(`/forms/${updatedForm.slug}/edit`);
      }
    } catch {
      // Error is already handled by mutation's onError
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id && form?.fields) {
      const oldIndex = form.fields.findIndex((field) => field.id === active.id);
      const newIndex = form.fields.findIndex((field) => field.id === over.id);

      const newOrder = arrayMove(form.fields, oldIndex, newIndex);
      const fieldIds = newOrder.map((field) => field.id);

      reorderFieldsMutation.mutate({ formId: form.id, fieldIds });
    }
  };

  const handleCopyLink = () => {
    if (form) {
      const url = getPublicFormUrl(form.slug);
      void copyToClipboard(url);
      toast.success("Link copied to clipboard");
    }
  };

  const handleApplyValidationTemplate = (
    template: keyof typeof VALIDATION_TEMPLATES,
  ) => {
    const validationTemplate = VALIDATION_TEMPLATES[template];
    setFieldRegexPattern(validationTemplate.pattern);
    setFieldValidationMessage(validationTemplate.message);
    setSelectedTemplate(template);
    toast.success(`Applied ${validationTemplate.label} validation`);
  };

  const handleAIGenerate = async () => {
    if (!form) {
      toast.error("Form not found");
      return;
    }

    const trimmedPrompt = aiPrompt.trim();

    // Validate prompt
    if (!trimmedPrompt) {
      toast.error("Please enter a prompt");
      return;
    }

    if (trimmedPrompt.length < 10) {
      setAiError(
        "Please provide a more detailed description (at least 10 characters)",
      );
      return;
    }

    if (trimmedPrompt.length > 2000) {
      setAiError("Prompt is too long. Please keep it under 2000 characters.");
      return;
    }

    setAiLoading(true);
    setAiError(null);

    try {
      // Call API - backend will append existing form to prompt if needed
      const response = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: trimmedPrompt,
          formSlug: form.slug, // Backend uses this to fetch and append form to prompt
        }),
      });

      if (!response.ok) {
        const error: unknown = await response.json();
        const errorObj = error as { error?: string; details?: string };
        const errorMessage = errorObj.details
          ? `${errorObj.error ?? "Failed to generate form"}\n\n${errorObj.details}`
          : (errorObj.error ?? "Failed to generate form");
        throw new Error(errorMessage);
      }

      const data = (await response.json()) as { form: AIFormStructure };
      const aiFormStructure = data.form;

      // Validate that we got fields back
      if (!aiFormStructure.fields || aiFormStructure.fields.length === 0) {
        throw new Error(
          "AI did not generate any fields. Please try again with a more specific prompt.",
        );
      }

      // Deserialize AI response to app format
      const { form: formData, fields: fieldsData } =
        deserializeFormFromAI(aiFormStructure);

      // Show progress toast
      const progressToast = toast.loading("Updating form...");

      try {
        // Update form settings
        const updatedForm = await updateFormMutation.mutateAsync({
          id: form.id,
          name: formData.name,
          slug: formData.slug,
          description: formData.description,
          status: form.status as "draft" | "published" | "archived",
          isPublic: form.isPublic,
          allowAnonymous: formData.allowAnonymous,
          allowMultipleSubmissions: formData.allowMultipleSubmissions,
        });

        // Update local form state to reflect changes immediately
        setFormName(formData.name);
        setFormSlug(formData.slug);
        setFormDescription(formData.description ?? "");
        setAllowAnonymous(formData.allowAnonymous);
        setAllowMultipleSubmissions(formData.allowMultipleSubmissions);

        // Delete all existing fields
        if (form.fields.length > 0) {
          toast.loading("Removing old fields...", { id: progressToast });
          await Promise.all(
            form.fields.map((field) =>
              deleteFieldMutation.mutateAsync({ fieldId: field.id }),
            ),
          );
        }

        // Create new fields from AI response
        if (fieldsData.length > 0) {
          toast.loading(
            `Creating ${fieldsData.length} field${fieldsData.length > 1 ? "s" : ""}...`,
            { id: progressToast },
          );

          for (const field of fieldsData) {
            await createFieldMutation.mutateAsync({
              formId: form.id,
              label: field.label,
              type: field.type,
              required: field.required,
              placeholder: field.placeholder,
              helpText: field.helpText,
              defaultValue: field.defaultValue,
              options: field.options,
              regexPattern: field.regexPattern,
              validationMessage: field.validationMessage,
              allowMultiple: field.allowMultiple,
              selectionLimit: field.selectionLimit,
              minValue: field.minValue,
              maxValue: field.maxValue,
            });
          }
        }

        toast.success("Form generated successfully!", { id: progressToast });
        setAiDialogOpen(false);
        setAiPrompt("");
        setAiError(null);

        // Refresh form data
        const finalSlug = updatedForm?.slug ?? formData.slug;
        await utils.forms.getBySlug.invalidate({ slug: finalSlug });

        // Navigate to new slug if it changed
        if (updatedForm && updatedForm.slug !== slug) {
          router.replace(`/forms/${updatedForm.slug}/edit`);
        }
      } catch (updateError) {
        toast.dismiss(progressToast);
        throw updateError;
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to generate form";
      setAiError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setAiLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto max-w-7xl px-4 py-6">
        <Skeleton className="mb-6 h-10 w-64" />
        <div className="grid gap-6 lg:grid-cols-[1fr,400px]">
          <div className="space-y-4">
            <Skeleton className="h-64" />
            <Skeleton className="h-96" />
          </div>
          <Skeleton className="hidden h-[600px] lg:block" />
        </div>
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
    <div className="container mx-auto max-w-7xl px-4 py-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/dashboard")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{form.name}</h1>
            <div className="text-muted-foreground mt-1 flex items-center gap-2 text-sm">
              <Badge
                variant={form.status === "published" ? "default" : "secondary"}
                className="text-xs"
              >
                {form.status}
              </Badge>
              <span>•</span>
              <span>{form.fields.length} fields</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/forms/${slug}/responses`)}
          >
            <BarChart3 className="mr-2 h-3.5 w-3.5" />
            Responses
          </Button>
          <Button variant="outline" size="sm" onClick={handleCopyLink}>
            <Copy className="mr-2 h-3.5 w-3.5" />
            Copy Link
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(`/f/${form.slug}`, "_blank")}
          >
            <ExternalLink className="mr-2 h-3.5 w-3.5" />
            Preview
          </Button>

          {/* Status control buttons */}
          {formStatus === "published" ? (
            <Button
              variant="outline"
              size="sm"
              onClick={handleUnpublish}
              disabled={updateFormMutation.isPending}
            >
              <ArchiveX className="mr-2 h-3.5 w-3.5" />
              Unpublish
            </Button>
          ) : formStatus === "archived" ? (
            <Button
              variant="outline"
              size="sm"
              onClick={handleUnarchive}
              disabled={updateFormMutation.isPending}
            >
              <ArchiveX className="mr-2 h-3.5 w-3.5" />
              Unarchive
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={handlePublish}
              disabled={updateFormMutation.isPending}
            >
              <Upload className="mr-2 h-3.5 w-3.5" />
              Publish
            </Button>
          )}

          {formStatus !== "archived" && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleArchive}
              disabled={updateFormMutation.isPending}
            >
              <Archive className="mr-2 h-3.5 w-3.5" />
              Archive
            </Button>
          )}

          <Button
            size="sm"
            onClick={handleSaveForm}
            disabled={!hasChanges || updateFormMutation.isPending}
          >
            <Save className="mr-2 h-3.5 w-3.5" />
            Save
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr,380px]">
        {/* Main Content */}
        <div className="space-y-4">
          {/* Form Settings */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Settings className="h-4 w-4" />
                Form Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="form-name">Form Name</Label>
                  <Input
                    id="form-name"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="My Form"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="form-slug">Slug (URL Path)</Label>
                  <Input
                    id="form-slug"
                    value={formSlug}
                    onChange={(e) => {
                      setFormSlug(e.target.value);
                      setSlugManuallyEdited(true);
                    }}
                    placeholder="my-form"
                  />
                  <p className="text-muted-foreground text-xs">
                    URL: /f/{formSlug || "your-slug"}
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="form-description">Description</Label>
                <Textarea
                  id="form-description"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Optional description for your form"
                  rows={2}
                  className="resize-none"
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <Label>Allow Anonymous Submissions</Label>
                  <p className="text-muted-foreground text-xs">
                    Users don&apos;t need to sign in
                  </p>
                </div>
                <Switch
                  checked={allowAnonymous}
                  onCheckedChange={setAllowAnonymous}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Allow Multiple Submissions</Label>
                  <p className="text-muted-foreground text-xs">
                    Users can submit more than once
                  </p>
                </div>
                <Switch
                  checked={allowMultipleSubmissions}
                  onCheckedChange={setAllowMultipleSubmissions}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Allow Editing Submissions</Label>
                  <p className="text-muted-foreground text-xs">
                    Users can edit their previous submissions
                  </p>
                </div>
                <Switch
                  checked={allowEditing}
                  onCheckedChange={setAllowEditing}
                />
              </div>
            </CardContent>
          </Card>

          {/* Form Fields */}
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Form Fields</CardTitle>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setAiDialogOpen(true)}
                    className="relative"
                  >
                    <Sparkles className="mr-2 h-3.5 w-3.5" />
                    AI Generate
                    <kbd className="bg-muted ml-2 hidden rounded border px-1.5 py-0.5 font-mono text-xs sm:inline-block">
                      ⌘K
                    </kbd>
                  </Button>
                  <Button size="sm" onClick={handleOpenCreateField}>
                    <Plus className="mr-2 h-3.5 w-3.5" />
                    Add Field
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {form.fields.length === 0 ? (
                <div className="text-muted-foreground py-12 text-center">
                  <Sparkles className="text-muted-foreground/50 mx-auto mb-4 h-12 w-12" />
                  <p className="mb-2 text-lg font-medium">No fields yet</p>
                  <p className="text-muted-foreground mb-4 text-sm">
                    Get started by using AI to generate your form or add fields
                    manually.
                  </p>
                  <div className="flex justify-center gap-2">
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => setAiDialogOpen(true)}
                    >
                      <Sparkles className="mr-2 h-3.5 w-3.5" />
                      Generate with AI
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleOpenCreateField}
                    >
                      <Plus className="mr-2 h-3.5 w-3.5" />
                      Add Field Manually
                    </Button>
                  </div>
                  <p className="text-muted-foreground mt-4 text-xs">
                    Tip: Press{" "}
                    <kbd className="bg-muted rounded border px-1.5 py-0.5 font-mono text-xs">
                      ⌘K
                    </kbd>{" "}
                    to open AI generator
                  </p>
                </div>
              ) : (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={form.fields.map((f) => f.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-2">
                      {form.fields.map((field) => (
                        <SortableFieldItem
                          key={field.id}
                          field={field}
                          onEdit={() => handleOpenEditField(field)}
                          onDuplicate={() => handleDuplicateField(field.id)}
                          onDelete={() => handleDeleteField(field.id)}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Preview Sidebar - Desktop Only */}
        <Card className="sticky top-6 hidden h-fit lg:block">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Eye className="h-4 w-4" />
              Live Preview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-bold">
                  {formName || "Untitled Form"}
                </h2>
                {formDescription && (
                  <p className="text-muted-foreground mt-2 text-sm">
                    {formDescription}
                  </p>
                )}
              </div>
              {form.fields.length > 0 && (
                <div className="space-y-4">
                  {form.fields.map((field) => (
                    <div key={field.id} className="space-y-1.5">
                      <Label className="text-sm">
                        {field.label}
                        {field.required && (
                          <span className="text-destructive ml-1">*</span>
                        )}
                      </Label>
                      {renderPreviewField(field)}
                      {field.helpText && (
                        <p className="text-muted-foreground text-xs">
                          {field.helpText}
                        </p>
                      )}
                    </div>
                  ))}
                  <Button className="w-full" size="sm">
                    Submit
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Field Dialog */}
      <Dialog open={fieldDialogOpen} onOpenChange={setFieldDialogOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {fieldDialogMode === "create" ? "Add Field" : "Edit Field"}
            </DialogTitle>
            <DialogDescription>
              Configure the field properties and validation rules.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Basic Info */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="field-label">
                  Label <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="field-label"
                  value={fieldLabel}
                  onChange={(e) => setFieldLabel(e.target.value)}
                  placeholder="e.g., Full Name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="field-type">
                  Field Type <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={fieldType}
                  onValueChange={(v: string) =>
                    handleFieldTypeChange(v as FieldType)
                  }
                >
                  <SelectTrigger id="field-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(FIELD_TYPE_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                id="field-required"
                checked={fieldRequired}
                onCheckedChange={setFieldRequired}
              />
              <Label htmlFor="field-required" className="cursor-pointer">
                Required field
              </Label>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {fieldTypeSupportsPlaceholder(fieldType) && (
                <div className="space-y-2">
                  <Label htmlFor="field-placeholder">Placeholder</Label>
                  <Input
                    id="field-placeholder"
                    value={fieldPlaceholder}
                    onChange={(e) => setFieldPlaceholder(e.target.value)}
                    placeholder="e.g., Enter your name"
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="field-help">Help Text</Label>
                <Input
                  id="field-help"
                  value={fieldHelpText}
                  onChange={(e) => setFieldHelpText(e.target.value)}
                  placeholder="Additional help or instructions"
                />
              </div>
            </div>

            {/* Options for select/radio/checkbox-group */}
            {fieldTypeNeedsOptions(fieldType) && (
              <div className="space-y-2">
                <Label>
                  Options <span className="text-destructive">*</span>
                </Label>
                <div className="space-y-2">
                  {fieldOptions.map((option, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        value={option.label}
                        onChange={(e) => {
                          const newOptions = [...fieldOptions];
                          newOptions[index] = {
                            ...newOptions[index]!,
                            label: e.target.value,
                          };
                          setFieldOptions(newOptions);
                        }}
                        placeholder={`Option ${index + 1}`}
                        className="flex-1"
                      />
                      {fieldTypeSupportsMultiSelect(fieldType) && (
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={option.isDefault}
                            onCheckedChange={(checked) => {
                              const newOptions = [...fieldOptions];

                              // If single-select (not allowMultiple), uncheck all others
                              if (checked && !fieldAllowMultiple) {
                                newOptions.forEach((opt, i) => {
                                  newOptions[i] = {
                                    ...opt,
                                    isDefault: i === index,
                                  };
                                });
                              } else {
                                newOptions[index] = {
                                  ...newOptions[index]!,
                                  isDefault: checked,
                                };
                              }

                              setFieldOptions(newOptions);
                            }}
                          />
                          <Label className="text-xs">Default</Label>
                        </div>
                      )}
                      {fieldOptions.length > 1 && (
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => {
                            setFieldOptions(
                              fieldOptions.filter((_, i) => i !== index),
                            );
                          }}
                        >
                          <Trash className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    onClick={() =>
                      setFieldOptions([
                        ...fieldOptions,
                        { label: "", isDefault: false },
                      ])
                    }
                    className="w-full"
                    size="sm"
                  >
                    <Plus className="mr-2 h-3.5 w-3.5" />
                    Add Option
                  </Button>
                </div>
              </div>
            )}

            {/* Multi-select configuration for dropdown and checkbox-group */}
            {fieldTypeSupportsMultiSelect(fieldType) && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Switch
                    id="allow-multiple"
                    checked={fieldAllowMultiple}
                    onCheckedChange={setFieldAllowMultiple}
                  />
                  <Label htmlFor="allow-multiple" className="cursor-pointer">
                    Allow multiple selections
                  </Label>
                </div>
                {fieldAllowMultiple && (
                  <div className="space-y-2">
                    <Label htmlFor="selection-limit">
                      Selection Limit (Optional)
                    </Label>
                    <Input
                      id="selection-limit"
                      type="number"
                      min="1"
                      value={fieldSelectionLimit}
                      onChange={(e) => setFieldSelectionLimit(e.target.value)}
                      placeholder="No limit"
                    />
                    <p className="text-muted-foreground text-xs">
                      Leave empty for no limit
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Min/Max for number and range fields */}
            {fieldTypeSupportsMinMax(fieldType) && (
              <div className="space-y-3">
                <Label className="text-sm font-medium">
                  Value Range (Optional)
                </Label>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="min-value">Minimum Value</Label>
                    <Input
                      id="min-value"
                      type="number"
                      value={fieldMinValue}
                      onChange={(e) => setFieldMinValue(e.target.value)}
                      placeholder={fieldType === "range" ? "0" : ""}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="max-value">Maximum Value</Label>
                    <Input
                      id="max-value"
                      type="number"
                      value={fieldMaxValue}
                      onChange={(e) => setFieldMaxValue(e.target.value)}
                      placeholder={fieldType === "range" ? "10" : ""}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Default value for applicable fields */}
            {fieldTypeSupportsDefaultValue(fieldType) && (
              <div className="space-y-2">
                <Label htmlFor="default-value">Default Value (Optional)</Label>
                {fieldType === "checkbox" ? (
                  <div className="flex items-center gap-2">
                    <Switch
                      id="default-value"
                      checked={fieldDefaultValue === "true"}
                      onCheckedChange={(checked) =>
                        setFieldDefaultValue(checked ? "true" : "false")
                      }
                    />
                    <Label htmlFor="default-value" className="cursor-pointer">
                      Checked by default
                    </Label>
                  </div>
                ) : fieldType === "textarea" ? (
                  <Textarea
                    id="default-value"
                    value={fieldDefaultValue}
                    onChange={(e) => setFieldDefaultValue(e.target.value)}
                    placeholder="Default text..."
                  />
                ) : (
                  <Input
                    id="default-value"
                    type={
                      fieldType === "number" || fieldType === "range"
                        ? "number"
                        : "text"
                    }
                    value={fieldDefaultValue}
                    onChange={(e) => setFieldDefaultValue(e.target.value)}
                    placeholder={`Default ${FIELD_TYPE_LABELS[fieldType]?.toLowerCase() ?? "value"}...`}
                  />
                )}
              </div>
            )}

            {/* Validation - Only for text and textarea */}
            {fieldTypeSupportsValidation(fieldType) && (
              <div className="space-y-3">
                <Separator />
                <div>
                  <Label className="text-sm font-medium">
                    Validation (Optional)
                  </Label>
                  <p className="text-muted-foreground text-xs">
                    Use a template or create custom regex validation
                  </p>
                </div>

                {/* Validation Templates */}
                <div className="space-y-2">
                  <Label className="text-muted-foreground text-xs">
                    Quick Templates
                  </Label>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {Object.entries(VALIDATION_TEMPLATES).map(
                      ([key, template]) => (
                        <Button
                          key={key}
                          variant={
                            selectedTemplate === key ? "default" : "outline"
                          }
                          size="sm"
                          onClick={() =>
                            handleApplyValidationTemplate(
                              key as keyof typeof VALIDATION_TEMPLATES,
                            )
                          }
                          className="justify-start"
                        >
                          {selectedTemplate === key && (
                            <Check className="mr-2 h-3 w-3" />
                          )}
                          <div className="truncate text-left text-xs">
                            {template.label}
                          </div>
                        </Button>
                      ),
                    )}
                  </div>
                </div>

                {/* Custom Validation */}
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="validation-pattern" className="text-xs">
                      Custom Regex Pattern
                    </Label>
                    <Input
                      id="validation-pattern"
                      value={fieldRegexPattern}
                      onChange={(e) => {
                        setFieldRegexPattern(e.target.value);
                        setSelectedTemplate("");
                      }}
                      placeholder="^[A-Za-z]+$"
                      className="font-mono text-xs"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="validation-message" className="text-xs">
                      Error Message
                    </Label>
                    <Input
                      id="validation-message"
                      value={fieldValidationMessage}
                      onChange={(e) => {
                        setFieldValidationMessage(e.target.value);
                        setSelectedTemplate("");
                      }}
                      placeholder="Invalid format"
                      className="text-xs"
                    />
                  </div>
                </div>
                {(fieldRegexPattern || selectedTemplate) && (
                  <div className="bg-muted rounded-md p-3">
                    <p className="text-muted-foreground text-xs">
                      <strong>Active:</strong>{" "}
                      {selectedTemplate
                        ? VALIDATION_TEMPLATES[
                            selectedTemplate as keyof typeof VALIDATION_TEMPLATES
                          ].message
                        : fieldValidationMessage || "Custom validation"}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFieldDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveField}
              disabled={
                createFieldMutation.isPending || updateFieldMutation.isPending
              }
            >
              {fieldDialogMode === "create" ? "Add Field" : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AI Generation Dialog */}
      <Dialog open={aiDialogOpen} onOpenChange={setAiDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="text-primary h-5 w-5" />
              AI Form Generation
            </DialogTitle>
            <DialogDescription>
              {form.fields.length > 0
                ? "Describe how you'd like to modify this form. The AI will intelligently update your form based on your instructions."
                : "Describe the form you want to create. The AI will generate a complete form with appropriate fields based on your description."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {form.fields.length > 0 && (
              <div className="bg-muted rounded-lg p-3 text-sm">
                <p className="mb-1 flex items-center gap-2 font-medium">
                  <Sparkles className="h-4 w-4" />
                  Edit Mode Active
                </p>
                <p className="text-muted-foreground">
                  Current form has{" "}
                  <strong>
                    {form.fields.length} field
                    {form.fields.length !== 1 ? "s" : ""}
                  </strong>
                  . You can add, remove, or modify fields while keeping the rest
                  intact.
                </p>
              </div>
            )}

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="ai-prompt">Your Instructions</Label>
                <span
                  className={`text-xs ${aiPrompt.length > 2000 ? "text-destructive" : "text-muted-foreground"}`}
                >
                  {aiPrompt.length} / 2000
                </span>
              </div>
              <Textarea
                id="ai-prompt"
                placeholder={
                  form.fields.length > 0
                    ? 'Examples:\n• "Add a phone number field after email"\n• "Make the address field optional"\n• "Remove the company field"\n• "Add validation to the email field"'
                    : 'Examples:\n• "Create a job application form with name, email, resume upload, and cover letter"\n• "Make a customer feedback survey with ratings"\n• "Build a registration form for an event"'
                }
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                disabled={aiLoading}
                rows={6}
                className="resize-none"
              />
              <p className="text-muted-foreground text-xs">
                {form.fields.length > 0
                  ? "Be specific about what you want to change. The AI will preserve fields you don't mention."
                  : "Describe the purpose and required fields. The AI will create an appropriate form structure."}
              </p>
            </div>

            {aiError && (
              <div className="bg-destructive/10 text-destructive rounded-lg p-3 text-sm">
                <p className="mb-1 font-medium">Error</p>
                <p>{aiError}</p>
              </div>
            )}

            {aiLoading && (
              <div className="bg-primary/10 text-primary rounded-lg p-3 text-sm">
                <p className="mb-1 flex items-center gap-2 font-medium">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating form...
                </p>
                <p className="text-muted-foreground">
                  This may take a few seconds. Please wait while the AI
                  processes your request.
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                if (!aiLoading) {
                  setAiDialogOpen(false);
                  setAiPrompt("");
                  setAiError(null);
                }
              }}
              disabled={aiLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAIGenerate}
              disabled={aiLoading || !aiPrompt.trim()}
            >
              {aiLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Generate Form
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SortableFieldItem({
  field,
  onEdit,
  onDuplicate,
  onDelete,
}: {
  field: FormField;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: field.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-card flex items-center gap-3 rounded-lg border p-3"
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing"
      >
        <GripVertical className="text-muted-foreground h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium">{field.label}</span>
          <Badge variant="outline" className="flex-shrink-0 text-xs">
            {FIELD_TYPE_LABELS[field.type] ?? field.type}
          </Badge>
          {field.required && (
            <Badge variant="destructive" className="flex-shrink-0 text-xs">
              Required
            </Badge>
          )}
        </div>
        {field.helpText && (
          <p className="text-muted-foreground mt-1 truncate text-xs">
            {field.helpText}
          </p>
        )}
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
            <Edit className="h-3.5 w-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={onEdit}>
            <Edit className="mr-2 h-4 w-4" />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onDuplicate}>
            <Copy className="mr-2 h-4 w-4" />
            Duplicate
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onDelete} className="text-destructive">
            <Trash className="mr-2 h-4 w-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function renderPreviewField(field: FormField) {
  // Parse options if they exist
  let options: Array<{ label: string; isDefault?: boolean }> = [];
  if (field.options) {
    try {
      options = JSON.parse(field.options) as Array<{
        label: string;
        isDefault?: boolean;
      }>;
    } catch {
      options = [];
    }
  }

  switch (field.type) {
    case "textarea":
      return (
        <Textarea
          placeholder={field.placeholder ?? ""}
          disabled
          rows={2}
          className="resize-none text-sm"
        />
      );
    case "select":
      return (
        <Select disabled>
          <SelectTrigger className="text-sm">
            <SelectValue
              placeholder={field.placeholder ?? "Select an option"}
            />
          </SelectTrigger>
          <SelectContent>
            {options.map((opt, index) => (
              <SelectItem key={index} value={opt.label}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    case "radio":
      return (
        <div className="space-y-2">
          {options.map((opt, index) => (
            <div key={index} className="flex items-center space-x-2">
              <input type="radio" disabled className="h-3.5 w-3.5" />
              <Label className="text-sm">{opt.label}</Label>
            </div>
          ))}
        </div>
      );
    case "checkbox-group":
      return (
        <div className="space-y-2">
          {options.map((opt, index) => (
            <div key={index} className="flex items-center space-x-2">
              <input type="checkbox" disabled className="h-3.5 w-3.5" />
              <Label className="text-sm">{opt.label}</Label>
            </div>
          ))}
        </div>
      );
    case "checkbox":
      return (
        <div className="flex items-center space-x-2">
          <input type="checkbox" disabled className="h-3.5 w-3.5" />
          <Label className="text-sm">
            {field.placeholder ?? "Check to confirm"}
          </Label>
        </div>
      );
    case "range":
      return (
        <div className="space-y-2">
          <input
            type="range"
            disabled
            min={field.minValue ?? 0}
            max={field.maxValue ?? 10}
            className="w-full"
          />
          <div className="text-muted-foreground flex justify-between text-xs">
            <span>{field.minValue ?? 0}</span>
            <span>{field.maxValue ?? 10}</span>
          </div>
        </div>
      );
    case "number":
      return (
        <Input
          type="number"
          placeholder={field.placeholder ?? ""}
          disabled
          min={field.minValue ?? undefined}
          max={field.maxValue ?? undefined}
          className="text-sm"
        />
      );
    default:
      return (
        <Input
          type={field.type}
          placeholder={field.placeholder ?? ""}
          disabled
          className="text-sm"
        />
      );
  }
}
