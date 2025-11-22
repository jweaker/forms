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
import { MultiSelect } from "~/components/ui/multi-select";
import { ThemeToggle } from "~/components/theme-toggle";

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
  options: string | null; // JSON string
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
    if (form && Object.keys(formData).length === 0) {
      const initialData: Record<number, string | boolean | string[]> = {};
      form.fields.forEach((field) => {
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

        // Set default values
        if (field.defaultValue) {
          if (field.type === "checkbox") {
            initialData[field.id] = field.defaultValue === "true";
          } else {
            initialData[field.id] = field.defaultValue;
          }
        } else if (field.allowMultiple) {
          // Initialize multi-select fields with default options
          const defaultOptions = options
            .filter((opt) => opt.isDefault)
            .map((opt) => opt.label);
          initialData[field.id] = defaultOptions;
        } else if (field.type === "checkbox") {
          initialData[field.id] = false;
        } else if (field.type === "range") {
          // Set default for range slider
          const min = field.minValue ?? 0;
          const max = field.maxValue ?? 10;
          initialData[field.id] = Math.floor((min + max) / 2).toString();
        } else if (options.length > 0) {
          // For single-select fields, set first isDefault option
          const defaultOption = options.find((opt) => opt.isDefault);
          if (defaultOption) {
            initialData[field.id] = defaultOption.label;
          }
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
    const fields: { fieldId: number; value: string | string[] }[] = [];
    Object.entries(formData).forEach(([fieldId, value]) => {
      if (Array.isArray(value)) {
        // Multi-select: send as array
        fields.push({
          fieldId: parseInt(fieldId),
          value: value,
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

  // Check if form is not yet open
  const now = new Date();
  if (form.openTime && now < new Date(form.openTime)) {
    const openDate = new Date(form.openTime);
    return (
      <div className="container mx-auto max-w-2xl py-8">
        <Card>
          <CardContent className="py-16 text-center">
            <AlertCircle className="text-muted-foreground mx-auto h-12 w-12" />
            <h2 className="mt-4 text-2xl font-semibold">Form Not Yet Open</h2>
            <p className="text-muted-foreground mt-2">
              This form will open on{" "}
              <strong>
                {openDate.toLocaleDateString()} at{" "}
                {openDate.toLocaleTimeString()}
              </strong>
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check if form is past deadline
  if (form.deadline && now > new Date(form.deadline)) {
    const deadlineDate = new Date(form.deadline);
    return (
      <div className="container mx-auto max-w-2xl py-8">
        <Card>
          <CardContent className="py-16 text-center">
            <AlertCircle className="text-muted-foreground mx-auto h-12 w-12" />
            <h2 className="mt-4 text-2xl font-semibold">Form Closed</h2>
            <p className="text-muted-foreground mt-2">
              This form closed on{" "}
              <strong>
                {deadlineDate.toLocaleDateString()} at{" "}
                {deadlineDate.toLocaleTimeString()}
              </strong>
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="bg-background min-h-screen px-3 py-4 sm:px-4 sm:py-8 lg:px-8">
      <div className="container mx-auto max-w-2xl">
        {/* Header with branding */}
        <div className="mb-4 flex items-center justify-between sm:mb-6">
          <h2 className="text-primary text-lg font-bold sm:text-xl">
            vibeForming
          </h2>
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="text-muted-foreground text-xs sm:text-sm">
              Powered by good vibes
            </span>
            <ThemeToggle />
          </div>
        </div>

        <Card>
          <CardHeader className="space-y-2 p-4 sm:p-6">
            <div className="flex items-start justify-between gap-3 sm:gap-4">
              <div className="min-w-0 flex-1">
                <CardTitle className="text-xl leading-tight sm:text-2xl md:text-3xl">
                  {form.name}
                </CardTitle>
                {form.description && (
                  <p className="text-muted-foreground mt-2 text-sm leading-relaxed sm:text-base">
                    {form.description}
                  </p>
                )}
              </div>
              {/* Show login/user info in top right */}
              {session ? (
                <div className="bg-muted flex flex-shrink-0 items-center gap-1.5 rounded-md px-2 py-1.5 text-xs sm:gap-2">
                  <div className="bg-primary text-primary-foreground flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-medium sm:h-6 sm:w-6 sm:text-xs">
                    {session.user.name?.[0]?.toUpperCase() ?? "U"}
                  </div>
                  <span className="hidden max-w-[100px] truncate sm:inline">
                    {session.user.name}
                  </span>
                </div>
              ) : (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleSignIn}
                  className="h-8 flex-shrink-0 px-2 sm:px-4"
                >
                  <Github className="h-4 w-4 sm:mr-1.5" />
                  <span className="hidden sm:inline">Sign in</span>
                </Button>
              )}
            </div>
            {form.fields.length > 0 && (
              <div className="text-muted-foreground flex flex-wrap items-center gap-1.5 text-[10px] sm:gap-2 sm:text-xs">
                <span>
                  {form.fields.length}{" "}
                  {form.fields.length === 1 ? "field" : "fields"}
                </span>
                <span>•</span>
                <span>
                  {form.fields.filter((f) => f.required).length} required
                </span>
                {!form.allowAnonymous && (
                  <>
                    <span>•</span>
                    <span className="text-primary font-medium">
                      Sign-in required
                    </span>
                  </>
                )}
              </div>
            )}
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            {submitError && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{submitError}</AlertDescription>
              </Alert>
            )}

            {/* Authentication Required Alert - Only show if not signed in and auth is required */}
            {!form.allowAnonymous && !session && (
              <Alert className="border-primary/50 bg-primary/5 mb-4">
                <AlertCircle className="text-primary h-4 w-4" />
                <AlertDescription className="flex flex-col gap-2 text-sm sm:flex-row sm:items-center sm:justify-between">
                  <span>Please sign in to submit this form</span>
                  <Button
                    size="sm"
                    onClick={handleSignIn}
                    className="w-full text-xs sm:w-auto"
                  >
                    <Github className="mr-2 h-3.5 w-3.5" />
                    Sign in with GitHub
                  </Button>
                </AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
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
              <Separator className="my-4 sm:my-6" />

              <div className="space-y-3 sm:space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    Rating{" "}
                    <span className="text-muted-foreground font-normal">
                      (Optional)
                    </span>
                  </Label>
                  <div className="flex items-center gap-1 sm:gap-1.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
                        onMouseEnter={() => setHoveredStar(star)}
                        onMouseLeave={() => setHoveredStar(0)}
                        className="transition-transform hover:scale-110 active:scale-95"
                        aria-label={`Rate ${star} out of 5`}
                      >
                        <Star
                          className={`h-6 w-6 sm:h-7 sm:w-7 ${
                            star <= (hoveredStar || rating)
                              ? "fill-yellow-400 text-yellow-400"
                              : "text-muted-foreground/30"
                          }`}
                        />
                      </button>
                    ))}
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
                    placeholder="Share your thoughts..."
                    rows={3}
                    className="resize-none text-sm"
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={submitMutation.isPending}
                size="lg"
              >
                {submitMutation.isPending ? "Submitting..." : "Submit Response"}
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

  // Parse options from JSON
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
        // Multi-select dropdown with combobox
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

      // Single select dropdown
      return (
        <div className="space-y-2">
          <Select
            value={stringValue || undefined}
            onValueChange={(val) => onChange(val === "__clear__" ? "" : val)}
          >
            <SelectTrigger id={`field-${field.id}`}>
              <SelectValue
                placeholder={field.placeholder ?? "Select an option"}
              />
            </SelectTrigger>
            <SelectContent>
              {stringValue && !field.required && (
                <>
                  <SelectItem value="__clear__">
                    <span className="text-muted-foreground italic">
                      Clear selection
                    </span>
                  </SelectItem>
                  <div className="border-border my-1 border-t" />
                </>
              )}
              {options.map((opt, index) => (
                <SelectItem key={index} value={opt.label}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
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
