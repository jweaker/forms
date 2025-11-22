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
import { AlertCircle, Star, Github } from "lucide-react";
import { authClient } from "~/server/better-auth/client";

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
  options: {
    id: number;
    formFieldId: number;
    optionLabel: string;
    isDefault: boolean;
    order: number;
    createdAt: Date;
    updatedAt: Date | null;
  }[];
};

export default function PublicFormPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  // Get session using better-auth
  const { data: session } = authClient.useSession();

  const {
    data: form,
    isLoading,
    error,
  } = api.public.getFormBySlug.useQuery({ slug });
  const submitMutation = api.formResponses.submit.useMutation({
    onSuccess: () => {
      router.push(`/f/${slug}/success`);
    },
    onError: (error) => {
      toast.error(`Failed to submit form: ${error.message}`);
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

  // Initialize form data with default values
  useEffect(() => {
    if (form?.fields && Object.keys(formData).length === 0) {
      const initialData: Record<string, string | boolean | string[]> = {};
      form.fields.forEach((field) => {
        if (field.defaultValue !== null && field.defaultValue !== undefined) {
          if (field.type === "checkbox") {
            initialData[field.id] = field.defaultValue === "true";
          } else if (field.allowMultiple && field.options.length > 0) {
            // For multi-select, set default selected options
            const defaultOptions = field.options
              .filter((opt) => opt.isDefault)
              .map((opt) => opt.optionLabel);
            initialData[field.id] = defaultOptions;
          } else {
            initialData[field.id] = field.defaultValue;
          }
        } else if (field.allowMultiple) {
          // Initialize multi-select fields with default options
          const defaultOptions = field.options
            .filter((opt) => opt.isDefault)
            .map((opt) => opt.optionLabel);
          initialData[field.id] = defaultOptions;
        } else if (field.type === "checkbox") {
          initialData[field.id] = false;
        } else if (field.type === "range") {
          // Set default for range slider
          const min = field.minValue ?? 0;
          const max = field.maxValue ?? 10;
          initialData[field.id] = Math.floor((min + max) / 2).toString();
        }
      });
      setFormData(initialData);
    }
  }, [form, formData]);

  const handleFieldChange = (
    fieldId: number,
    value: string | boolean | string[],
  ) => {
    setFormData({ ...formData, [fieldId]: value });
    // Clear field error when user starts typing
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
    // Check required
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

    // Check selection limit for multi-select
    if (Array.isArray(value) && field.selectionLimit) {
      if (value.length > field.selectionLimit) {
        return `You can select at most ${field.selectionLimit} option(s)`;
      }
    }

    // Skip validation for boolean or array values
    if (typeof value === "boolean" || Array.isArray(value)) return null;
    if (!value) return null;

    // Check regex pattern
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

    // Check min/max for number and range fields
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

    // Check if form requires authentication
    if (!form?.allowAnonymous && !session) {
      setSubmitError("Please sign in to submit this form");
      toast.error("Authentication required");
      return;
    }

    // Validate all fields
    const errors: Record<string, string> = {};
    form?.fields.forEach((field) => {
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
    // For multi-select fields (arrays), we'll send multiple field entries
    const fields: { fieldId: number; value: string }[] = [];
    Object.entries(formData).forEach(([fieldId, value]) => {
      if (Array.isArray(value)) {
        // Multi-select: create one entry per selected value
        value.forEach((val) => {
          fields.push({
            fieldId: parseInt(fieldId),
            value: val,
          });
        });
      } else {
        // Single value
        fields.push({
          fieldId: parseInt(fieldId),
          value: typeof value === "boolean" ? (value ? "Yes" : "No") : value,
        });
      }
    });

    if (form) {
      submitMutation.mutate({
        formId: form.id,
        fields,
        rating: rating > 0 ? rating : undefined,
        comments: comment || undefined,
      });
    }
  };

  const handleSignIn = async () => {
    try {
      await authClient.signIn.social({
        provider: "github",
        callbackURL: `/f/${slug}`,
      });
    } catch (error) {
      toast.error("Failed to sign in");
      console.error(error);
    }
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

  if (error || !form) {
    return (
      <div className="container mx-auto max-w-2xl py-8">
        <Card>
          <CardContent className="py-16 text-center">
            <AlertCircle className="text-muted-foreground mx-auto h-12 w-12" />
            <h2 className="mt-4 text-2xl font-semibold">Form not found</h2>
            <p className="text-muted-foreground mt-2">
              The form you are looking for does not exist or has been removed.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (form.status !== "published") {
    return (
      <div className="container mx-auto max-w-2xl py-8">
        <Card>
          <CardContent className="py-16 text-center">
            <AlertCircle className="text-muted-foreground mx-auto h-12 w-12" />
            <h2 className="mt-4 text-2xl font-semibold">Form not available</h2>
            <p className="text-muted-foreground mt-2">
              This form is not currently accepting responses.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-2xl py-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl">{form.name}</CardTitle>
          {form.description && (
            <p className="text-muted-foreground mt-2">{form.description}</p>
          )}
        </CardHeader>
        <CardContent>
          {submitError && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{submitError}</AlertDescription>
            </Alert>
          )}

          {/* Authentication Required Alert */}
          {!form.allowAnonymous && !session && (
            <Alert className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="flex items-center justify-between">
                <span>This form requires authentication to submit</span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleSignIn}
                  className="ml-4"
                >
                  <Github className="mr-2 h-4 w-4" />
                  Sign in with GitHub
                </Button>
              </AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {form.fields.map((field) => (
              <div key={field.id} className="space-y-2">
                <Label htmlFor={`field-${field.id}`}>
                  {field.label}
                  {field.required && (
                    <span className="text-destructive ml-1">*</span>
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
                  <p className="text-destructive text-xs">
                    {fieldErrors[field.id]}
                  </p>
                )}
              </div>
            ))}

            {/* Rating and Comment Section */}
            <Separator className="my-6" />

            <div className="space-y-6">
              <div className="space-y-2">
                <Label>Rating (Optional)</Label>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      onMouseEnter={() => setHoveredStar(star)}
                      onMouseLeave={() => setHoveredStar(0)}
                      className="transition-colors"
                    >
                      <Star
                        className={`h-8 w-8 ${
                          star <= (hoveredStar || rating)
                            ? "fill-yellow-400 text-yellow-400"
                            : "text-gray-300"
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
                <Label htmlFor="comment">Comments (Optional)</Label>
                <Textarea
                  id="comment"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Any additional comments or feedback..."
                  rows={4}
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={
                submitMutation.isPending || (!form.allowAnonymous && !session)
              }
            >
              {submitMutation.isPending ? "Submitting..." : "Submit"}
            </Button>
          </form>
        </CardContent>
      </Card>
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
        // Multi-select dropdown (rendered as checkboxes)
        return (
          <div className="space-y-2 rounded-md border p-3">
            {field.options.map((opt) => (
              <div key={opt.id} className="flex items-center space-x-2">
                <Checkbox
                  id={`field-${field.id}-${opt.id}`}
                  checked={arrayValue.includes(opt.optionLabel)}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      // Check selection limit
                      if (
                        field.selectionLimit &&
                        arrayValue.length >= field.selectionLimit
                      ) {
                        toast.error(
                          `You can select at most ${field.selectionLimit} option(s)`,
                        );
                        return;
                      }
                      onChange([...arrayValue, opt.optionLabel]);
                    } else {
                      onChange(arrayValue.filter((v) => v !== opt.optionLabel));
                    }
                  }}
                />
                <Label
                  htmlFor={`field-${field.id}-${opt.id}`}
                  className="cursor-pointer font-normal"
                >
                  {opt.optionLabel}
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
      }

      // Single select dropdown
      return (
        <Select value={stringValue} onValueChange={onChange}>
          <SelectTrigger id={`field-${field.id}`}>
            <SelectValue
              placeholder={field.placeholder ?? "Select an option"}
            />
          </SelectTrigger>
          <SelectContent>
            {field.options.map((opt) => (
              <SelectItem key={opt.id} value={opt.optionLabel}>
                {opt.optionLabel}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );

    case "radio":
      return (
        <RadioGroup value={stringValue} onValueChange={onChange}>
          {field.options.map((opt) => (
            <div key={opt.id} className="flex items-center space-x-2">
              <RadioGroupItem
                value={opt.optionLabel}
                id={`field-${field.id}-${opt.id}`}
              />
              <Label
                htmlFor={`field-${field.id}-${opt.id}`}
                className="cursor-pointer font-normal"
              >
                {opt.optionLabel}
              </Label>
            </div>
          ))}
        </RadioGroup>
      );

    case "checkbox-group":
      return (
        <div className="space-y-2">
          {field.options.map((opt) => (
            <div key={opt.id} className="flex items-center space-x-2">
              <Checkbox
                id={`field-${field.id}-${opt.id}`}
                checked={arrayValue.includes(opt.optionLabel)}
                onCheckedChange={(checked) => {
                  if (checked) {
                    // Check selection limit
                    if (
                      field.selectionLimit &&
                      arrayValue.length >= field.selectionLimit
                    ) {
                      toast.error(
                        `You can select at most ${field.selectionLimit} option(s)`,
                      );
                      return;
                    }
                    onChange([...arrayValue, opt.optionLabel]);
                  } else {
                    onChange(arrayValue.filter((v) => v !== opt.optionLabel));
                  }
                }}
              />
              <Label
                htmlFor={`field-${field.id}-${opt.id}`}
                className="cursor-pointer font-normal"
              >
                {opt.optionLabel}
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
