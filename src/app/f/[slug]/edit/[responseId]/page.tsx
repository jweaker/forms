"use client";

import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import { Skeleton } from "~/components/ui/skeleton";
import { Separator } from "~/components/ui/separator";
import { Slider } from "~/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Checkbox } from "~/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "~/components/ui/radio-group";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { AlertCircle, Star, ArrowLeft } from "lucide-react";
import { MultiSelect } from "~/components/ui/multi-select";

type FormField = {
  id: number;
  label: string;
  type: string;
  required: boolean;
  placeholder: string | null;
  helpText: string | null;
  regexPattern: string | null;
  validationMessage: string | null;
  order: number;
  allowMultiple: boolean | null;
  selectionLimit: number | null;
  minValue: number | null;
  maxValue: number | null;
  defaultValue: string | null;
  options: string | null;
};

export default function EditSubmissionPage() {
  const params = useParams();
  const router = useRouter();
  const responseId = parseInt(params.responseId as string);

  const {
    data: response,
    isLoading,
    error,
  } = api.formResponses.getForEdit.useQuery({ responseId });

  const updateMutation = api.formResponses.update.useMutation({
    onSuccess: () => {
      toast.success("Response updated successfully");
      router.push("/dashboard?tab=submissions");
    },
    onError: (error) => {
      toast.error(`Failed to update response: ${error.message}`);
      setSubmitError(error.message);
    },
  });

  const [formData, setFormData] = useState<
    Record<string, string | boolean | string[]>
  >({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [rating, setRating] = useState<number>(0);
  const [comment, setComment] = useState<string>("");
  const [hoveredStar, setHoveredStar] = useState<number>(0);

  // Initialize form data with existing response values
  useEffect(() => {
    if (response && Object.keys(formData).length === 0) {
      const initialData: Record<number, string | boolean | string[]> = {};

      // Populate with existing response field values
      response.responseFields.forEach((responseField) => {
        const fieldId = responseField.formFieldId;
        const field = response.form.fields.find((f) => f.id === fieldId);

        if (!field) return;

        // Parse the value
        try {
          const parsed = JSON.parse(responseField.value) as string[] | string;
          if (Array.isArray(parsed)) {
            initialData[fieldId] = parsed;
          } else if (field.type === "checkbox") {
            initialData[fieldId] = responseField.value === "Yes";
          } else {
            initialData[fieldId] = responseField.value;
          }
        } catch {
          // Not JSON
          if (field.type === "checkbox") {
            initialData[fieldId] = responseField.value === "Yes";
          } else {
            initialData[fieldId] = responseField.value;
          }
        }
      });

      // Set rating and comments
      setRating(response.rating ?? 0);
      setComment(response.comments ?? "");

      setFormData(initialData);
    }
  }, [response, formData]);

  const handleFieldChange = (
    fieldId: number,
    value: string | boolean | string[],
  ) => {
    setFormData({ ...formData, [fieldId]: value });
    if (fieldErrors[fieldId]) {
      const newErrors = { ...fieldErrors };
      delete newErrors[fieldId];
      setFieldErrors(newErrors);
    }
  };

  const validateField = (
    field: FormField,
    value: string | boolean | string[] | undefined,
  ): string | null => {
    if (field.required) {
      if (typeof value === "boolean") {
        if (!value && field.type === "checkbox") {
          return `${field.label} is required`;
        }
      } else if (Array.isArray(value)) {
        if (value.length === 0) {
          return `${field.label} is required`;
        }
      } else if (!value || value.trim() === "") {
        return `${field.label} is required`;
      }
    }

    if (Array.isArray(value) && field.selectionLimit) {
      if (value.length > field.selectionLimit) {
        return `You can select at most ${field.selectionLimit} option(s)`;
      }
    }

    if (typeof value === "boolean" || Array.isArray(value)) return null;
    if (!value) return null;

    if (field.regexPattern) {
      try {
        const regex = new RegExp(field.regexPattern);
        if (!regex.test(value)) {
          return field.validationMessage ?? `Invalid ${field.label}`;
        }
      } catch {
        // Invalid regex pattern - skip validation
      }
    }

    if ((field.type === "number" || field.type === "range") && value) {
      const numValue = parseFloat(value);
      if (!isNaN(numValue)) {
        if (field.minValue !== null && numValue < field.minValue) {
          return `${field.label} must be at least ${field.minValue}`;
        }
        if (field.maxValue !== null && numValue > field.maxValue) {
          return `${field.label} must be at most ${field.maxValue}`;
        }
      }
    }

    return null;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!response) return;

    // Validate all fields
    const errors: Record<string, string> = {};
    response.form.fields.forEach((field) => {
      const value =
        formData[field.id] ??
        (field.type === "checkbox" ? false : field.allowMultiple ? [] : "");
      const error = validateField(field, value);
      if (error) {
        errors[field.id] = error;
      }
    });

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      toast.error("Please fix the errors in the form");
      return;
    }

    // Convert formData to the expected format
    const fields: { fieldId: number; value: string | string[] }[] = [];
    Object.entries(formData).forEach(([fieldId, value]) => {
      if (Array.isArray(value)) {
        fields.push({
          fieldId: parseInt(fieldId),
          value: value,
        });
      } else {
        fields.push({
          fieldId: parseInt(fieldId),
          value: typeof value === "boolean" ? (value ? "Yes" : "No") : value,
        });
      }
    });

    updateMutation.mutate({
      responseId,
      fields,
      rating: rating > 0 ? rating : undefined,
      comments: comment || undefined,
    });
  };

  if (isLoading) {
    return (
      <div className="container mx-auto max-w-2xl py-8">
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="mt-2 h-4 w-full" />
          </CardHeader>
          <CardContent className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-1/4" />
                <Skeleton className="h-10 w-full" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !response) {
    return (
      <div className="container mx-auto max-w-2xl py-8">
        <Card>
          <CardContent className="py-16 text-center">
            <AlertCircle className="text-muted-foreground mx-auto h-12 w-12" />
            <h2 className="mt-4 text-2xl font-semibold">
              Cannot edit response
            </h2>
            <p className="text-muted-foreground mt-2">
              {error?.message ??
                "The response you are trying to edit does not exist or you do not have permission to edit it."}
            </p>
            <Button className="mt-4" asChild>
              <Link href="/dashboard?tab=submissions" prefetch={true}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Submissions
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const form = response.form;

  return (
    <div className="bg-background min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      <div className="container mx-auto max-w-2xl">
        <Card>
          <CardHeader className="space-y-2">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <CardTitle className="text-2xl sm:text-3xl">
                  Edit Submission: {form.name}
                </CardTitle>
                {form.description && (
                  <p className="text-muted-foreground mt-2 text-sm sm:text-base">
                    {form.description}
                  </p>
                )}
              </div>
              <Button size="sm" variant="ghost" asChild>
                <Link href="/dashboard?tab=submissions" prefetch={true}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Link>
              </Button>
            </div>
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-sm">
                You are editing a previous submission. Changes will be saved to
                the history.
              </AlertDescription>
            </Alert>
          </CardHeader>
          <CardContent>
            {submitError && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{submitError}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {form.fields.map((field) => (
                <div key={field.id} className="space-y-2">
                  <Label
                    htmlFor={`field-${field.id}`}
                    className="text-sm font-medium"
                  >
                    {field.label}
                    {field.required && (
                      <span
                        className="text-destructive ml-1"
                        aria-label="Required"
                      >
                        *
                      </span>
                    )}
                  </Label>
                  {renderFormField(field, formData[field.id], (value) =>
                    handleFieldChange(field.id, value),
                  )}
                  {field.helpText && (
                    <p className="text-muted-foreground text-xs">
                      {field.helpText}
                    </p>
                  )}
                  {fieldErrors[field.id] && (
                    <p className="text-destructive flex items-center gap-1 text-xs">
                      <AlertCircle className="h-3 w-3" />
                      {fieldErrors[field.id]}
                    </p>
                  )}
                </div>
              ))}

              {/* Rating and Comment Section */}
              <Separator className="my-6" />

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    Rating{" "}
                    <span className="text-muted-foreground font-normal">
                      (Optional)
                    </span>
                  </Label>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
                        onMouseEnter={() => setHoveredStar(star)}
                        onMouseLeave={() => setHoveredStar(0)}
                        className="transition-transform hover:scale-110"
                        aria-label={`Rate ${star} out of 5`}
                      >
                        <Star
                          className={`h-7 w-7 transition-colors sm:h-8 sm:w-8 ${
                            star <= (hoveredStar || rating)
                              ? "fill-yellow-400 text-yellow-400"
                              : "text-muted-foreground/40"
                          }`}
                        />
                      </button>
                    ))}
                    {rating > 0 && (
                      <span className="text-muted-foreground ml-2 text-sm">
                        {rating} / 5
                      </span>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="comment" className="text-sm font-medium">
                    Comments{" "}
                    <span className="text-muted-foreground font-normal">
                      (Optional)
                    </span>
                  </Label>
                  <Textarea
                    id="comment"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Any additional comments or feedback..."
                    rows={3}
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={updateMutation.isPending}
              >
                {updateMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function renderFormField(
  field: FormField,
  value: string | boolean | string[] | undefined,
  onChange: (value: string | boolean | string[]) => void,
) {
  const stringValue = typeof value === "string" ? value : "";
  const booleanValue = typeof value === "boolean" ? value : false;
  const arrayValue = Array.isArray(value) ? value : [];

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
          id={`field-${field.id}`}
          placeholder={field.placeholder ?? ""}
          value={stringValue}
          onChange={(e) => onChange(e.target.value)}
          rows={4}
        />
      );

    case "select":
      if (field.allowMultiple) {
        return (
          <MultiSelect
            options={options.map((opt) => ({
              label: opt.label,
              value: opt.label,
            }))}
            selected={arrayValue}
            onChange={(newValue) => onChange(newValue)}
            placeholder={field.placeholder ?? "Select options..."}
            maxSelections={field.selectionLimit ?? undefined}
          />
        );
      }

      return (
        <Select value={stringValue} onValueChange={onChange}>
          <SelectTrigger id={`field-${field.id}`}>
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
        <RadioGroup value={stringValue} onValueChange={onChange}>
          {options.map((opt, index) => (
            <div key={index} className="flex items-center space-x-2">
              <RadioGroupItem
                value={opt.label}
                id={`field-${field.id}-${index}`}
              />
              <Label
                htmlFor={`field-${field.id}-${index}`}
                className="cursor-pointer font-normal"
              >
                {opt.label}
              </Label>
            </div>
          ))}
        </RadioGroup>
      );

    case "checkbox-group":
      return (
        <div className="space-y-2">
          {options.map((opt, index) => (
            <div key={index} className="flex items-center space-x-2">
              <Checkbox
                id={`field-${field.id}-${index}`}
                checked={arrayValue.includes(opt.label)}
                onCheckedChange={(checked) => {
                  if (checked) {
                    if (
                      field.selectionLimit &&
                      arrayValue.length >= field.selectionLimit
                    ) {
                      toast.error(
                        `You can select at most ${field.selectionLimit} option(s)`,
                      );
                      return;
                    }
                    onChange([...arrayValue, opt.label]);
                  } else {
                    onChange(arrayValue.filter((v) => v !== opt.label));
                  }
                }}
              />
              <Label
                htmlFor={`field-${field.id}-${index}`}
                className="cursor-pointer font-normal"
              >
                {opt.label}
              </Label>
            </div>
          ))}
          {field.selectionLimit && (
            <p className="text-muted-foreground text-xs">
              Select up to {field.selectionLimit} option(s)
            </p>
          )}
        </div>
      );

    case "checkbox":
      return (
        <div className="flex items-center space-x-2">
          <Checkbox
            id={`field-${field.id}`}
            checked={booleanValue}
            onCheckedChange={(checked) => onChange(checked === true)}
          />
          <Label
            htmlFor={`field-${field.id}`}
            className="cursor-pointer font-normal"
          >
            {field.label}
          </Label>
        </div>
      );

    case "range":
      const min = field.minValue ?? 0;
      const max = field.maxValue ?? 10;
      const rangeValue = stringValue ? parseFloat(stringValue) : min;
      return (
        <div className="space-y-2">
          <Slider
            id={`field-${field.id}`}
            min={min}
            max={max}
            step={1}
            value={[rangeValue]}
            onValueChange={(values) => onChange(values[0]!.toString())}
            className="w-full"
          />
          <div className="text-muted-foreground flex justify-between text-xs">
            <span>{min}</span>
            <span className="font-semibold">{rangeValue}</span>
            <span>{max}</span>
          </div>
        </div>
      );

    case "number":
      return (
        <Input
          id={`field-${field.id}`}
          type="number"
          placeholder={field.placeholder ?? ""}
          value={stringValue}
          min={field.minValue ?? undefined}
          max={field.maxValue ?? undefined}
          onChange={(e) => onChange(e.target.value)}
        />
      );

    case "date":
    case "time":
    case "datetime-local":
      return (
        <Input
          id={`field-${field.id}`}
          type={field.type}
          value={stringValue}
          onChange={(e) => onChange(e.target.value)}
        />
      );

    default:
      return (
        <Input
          id={`field-${field.id}`}
          type={field.type}
          placeholder={field.placeholder ?? ""}
          value={stringValue}
          onChange={(e) => onChange(e.target.value)}
        />
      );
  }
}
