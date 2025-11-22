import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import { Slider } from "~/components/ui/slider";
import { Checkbox } from "~/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "~/components/ui/radio-group";
import { Badge } from "~/components/ui/badge";

type FormFieldType = {
  id: number;
  label: string;
  type: string;
  required: boolean;
  placeholder: string | null;
  helpText: string | null;
  order: number;
  allowMultiple: boolean | null;
  selectionLimit: number | null;
  minValue: number | null;
  maxValue: number | null;
  defaultValue: string | null;
  options: string | null;
};

interface FormFieldDisplayProps {
  field: FormFieldType;
  value: string | string[];
}

export function FormFieldDisplay({ field, value }: FormFieldDisplayProps) {
  // Parse value - could be JSON array or string
  let displayValues: string[];
  try {
    const parsed = JSON.parse(String(value)) as string[] | string;
    if (Array.isArray(parsed)) {
      displayValues = parsed;
    } else {
      displayValues = [String(value)];
    }
  } catch {
    // Not JSON, use as-is
    displayValues = Array.isArray(value) ? value : [String(value)];
  }

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

  const stringValue = Array.isArray(displayValues)
    ? (displayValues[0] ?? "")
    : displayValues;

  switch (field.type) {
    case "textarea":
      return (
        <Textarea
          value={stringValue}
          readOnly
          disabled
          rows={4}
          className="resize-none"
        />
      );

    case "select":
      if (field.allowMultiple) {
        // Multi-select: show as badges
        return (
          <div className="flex flex-wrap gap-2">
            {displayValues.map((val, idx) => (
              <Badge key={idx} variant="secondary">
                {val}
              </Badge>
            ))}
          </div>
        );
      }

      // Single select: show value in disabled input
      return <Input value={stringValue} readOnly disabled />;

    case "radio":
      return (
        <RadioGroup value={stringValue} disabled>
          {options.map((opt, index) => (
            <div key={index} className="flex items-center space-x-2">
              <RadioGroupItem
                value={opt.label}
                id={`field-display-${field.id}-${index}`}
                disabled
              />
              <Label
                htmlFor={`field-display-${field.id}-${index}`}
                className="font-normal"
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
                id={`field-display-${field.id}-${index}`}
                checked={displayValues.includes(opt.label)}
                disabled
              />
              <Label
                htmlFor={`field-display-${field.id}-${index}`}
                className="font-normal"
              >
                {opt.label}
              </Label>
            </div>
          ))}
        </div>
      );

    case "checkbox":
      const isChecked =
        stringValue === "true" ||
        stringValue === "Yes" ||
        stringValue === "yes";
      return (
        <div className="flex items-center space-x-2">
          <Checkbox
            id={`field-display-${field.id}`}
            checked={isChecked}
            disabled
          />
          <Label htmlFor={`field-display-${field.id}`} className="font-normal">
            {field.label}
          </Label>
        </div>
      );

    case "range":
      const min = field.minValue ?? 0;
      const max = field.maxValue ?? 10;
      const rangeValue = parseFloat(stringValue) || min;
      return (
        <div className="space-y-2">
          <Slider
            min={min}
            max={max}
            step={1}
            value={[rangeValue]}
            disabled
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
          type="number"
          value={stringValue}
          readOnly
          disabled
          min={field.minValue ?? undefined}
          max={field.maxValue ?? undefined}
        />
      );

    case "date":
    case "time":
    case "datetime-local":
      return <Input type={field.type} value={stringValue} readOnly disabled />;

    default:
      return <Input type={field.type} value={stringValue} readOnly disabled />;
  }
}
