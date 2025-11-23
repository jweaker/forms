"use client";

import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import { Switch } from "~/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Badge } from "~/components/ui/badge";
import { Plus, Trash } from "lucide-react";
import {
  FIELD_TYPE_OPTIONS,
  VALIDATION_TEMPLATES,
  fieldTypeSupportsValidation,
  fieldTypeNeedsOptions,
  fieldTypeSupportsMultiSelect,
  fieldTypeSupportsMinMax,
  fieldTypeSupportsDefaultValue,
  fieldTypeSupportsPlaceholder,
} from "~/lib/field-types";

type FieldOption = {
  label: string;
  isDefault: boolean;
};

type EditingField = {
  id?: number;
  label: string;
  type: string;
  placeholder: string;
  helpText: string;
  required: boolean;
  regexPattern: string;
  validationMessage: string;
  options: FieldOption[];
  allowMultiple: boolean;
  selectionLimit: string;
  minValue: string;
  maxValue: string;
  defaultValue: string;
  order: number;
};

type FieldConfigurationDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingField: EditingField | null;
  onFieldChange: <K extends keyof EditingField>(
    key: K,
    value: EditingField[K],
  ) => void;
  onSaveField: () => void;
  isSaving: boolean;
};

export function FieldConfigurationDialog({
  open,
  onOpenChange,
  editingField,
  onFieldChange,
  onSaveField,
  isSaving,
}: FieldConfigurationDialogProps) {
  if (!editingField) return null;

  const handleAddOption = () => {
    onFieldChange("options", [
      ...editingField.options,
      { label: "", isDefault: false },
    ]);
  };

  const handleRemoveOption = (index: number) => {
    onFieldChange(
      "options",
      editingField.options.filter((_, i) => i !== index),
    );
  };

  const handleOptionChange = (
    index: number,
    key: keyof FieldOption,
    value: string | boolean,
  ) => {
    const newOptions = [...editingField.options];
    newOptions[index] = { ...newOptions[index]!, [key]: value };
    onFieldChange("options", newOptions);
  };

  const applyValidationTemplate = (
    template: keyof typeof VALIDATION_TEMPLATES,
  ) => {
    const t = VALIDATION_TEMPLATES[template];
    onFieldChange("regexPattern", t.pattern);
    onFieldChange("validationMessage", t.message);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            {editingField.id ? "Edit Field" : "Add New Field"}
          </DialogTitle>
          <DialogDescription>
            Configure the field properties and validation rules.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Label */}
          <div className="space-y-2">
            <Label htmlFor="field-label">
              Label <span className="text-red-500">*</span>
            </Label>
            <Input
              id="field-label"
              value={editingField.label}
              onChange={(e) => onFieldChange("label", e.target.value)}
              placeholder="Enter field label"
            />
          </div>

          {/* Type */}
          <div className="space-y-2">
            <Label htmlFor="field-type">
              Field Type <span className="text-red-500">*</span>
            </Label>
            <Select
              value={editingField.type}
              onValueChange={(value) => onFieldChange("type", value)}
            >
              <SelectTrigger id="field-type">
                <SelectValue placeholder="Select field type" />
              </SelectTrigger>
              <SelectContent>
                {FIELD_TYPE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Placeholder */}
          {fieldTypeSupportsPlaceholder(editingField.type) && (
            <div className="space-y-2">
              <Label htmlFor="field-placeholder">Placeholder</Label>
              <Input
                id="field-placeholder"
                value={editingField.placeholder}
                onChange={(e) => onFieldChange("placeholder", e.target.value)}
                placeholder="Enter placeholder text"
              />
            </div>
          )}

          {/* Help Text */}
          <div className="space-y-2">
            <Label htmlFor="field-help">Help Text</Label>
            <Textarea
              id="field-help"
              value={editingField.helpText}
              onChange={(e) => onFieldChange("helpText", e.target.value)}
              placeholder="Additional information for users"
              rows={2}
            />
          </div>

          {/* Required */}
          <div className="flex items-center space-x-2">
            <Switch
              id="field-required"
              checked={editingField.required}
              onCheckedChange={(checked) => onFieldChange("required", checked)}
            />
            <Label htmlFor="field-required">Required field</Label>
          </div>

          {/* Options for select/radio/checkbox-group */}
          {fieldTypeNeedsOptions(editingField.type) && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Options</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddOption}
                >
                  <Plus className="mr-1 h-4 w-4" />
                  Add Option
                </Button>
              </div>
              <div className="space-y-2">
                {editingField.options.map((option, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      value={option.label}
                      onChange={(e) =>
                        handleOptionChange(index, "label", e.target.value)
                      }
                      placeholder={`Option ${index + 1}`}
                      className="flex-1"
                    />
                    <div className="flex items-center gap-1">
                      <Switch
                        checked={option.isDefault}
                        onCheckedChange={(checked) =>
                          handleOptionChange(index, "isDefault", checked)
                        }
                      />
                      <Label className="text-xs">Default</Label>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveOption(index)}
                    >
                      <Trash className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                ))}
              </div>

              {/* Multi-select for select and checkbox-group */}
              {fieldTypeSupportsMultiSelect(editingField.type) && (
                <div className="space-y-2 pt-2">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="field-allow-multiple"
                      checked={editingField.allowMultiple}
                      onCheckedChange={(checked) =>
                        onFieldChange("allowMultiple", checked)
                      }
                    />
                    <Label htmlFor="field-allow-multiple">
                      Allow multiple selections
                    </Label>
                  </div>

                  {editingField.allowMultiple && (
                    <div className="space-y-2">
                      <Label htmlFor="field-selection-limit">
                        Selection Limit (optional)
                      </Label>
                      <Input
                        id="field-selection-limit"
                        type="number"
                        value={editingField.selectionLimit}
                        onChange={(e) =>
                          onFieldChange("selectionLimit", e.target.value)
                        }
                        placeholder="Leave empty for no limit"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Min/Max for number and range */}
          {fieldTypeSupportsMinMax(editingField.type) && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="field-min">Minimum Value</Label>
                <Input
                  id="field-min"
                  type="number"
                  value={editingField.minValue}
                  onChange={(e) => onFieldChange("minValue", e.target.value)}
                  placeholder="Min"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="field-max">Maximum Value</Label>
                <Input
                  id="field-max"
                  type="number"
                  value={editingField.maxValue}
                  onChange={(e) => onFieldChange("maxValue", e.target.value)}
                  placeholder="Max"
                />
              </div>
            </div>
          )}

          {/* Default Value */}
          {fieldTypeSupportsDefaultValue(editingField.type) && (
            <div className="space-y-2">
              <Label htmlFor="field-default">Default Value</Label>
              {editingField.type === "checkbox" ? (
                <div className="flex items-center space-x-2">
                  <Switch
                    id="field-default"
                    checked={editingField.defaultValue === "true"}
                    onCheckedChange={(checked) =>
                      onFieldChange("defaultValue", checked ? "true" : "false")
                    }
                  />
                  <Label htmlFor="field-default">Checked by default</Label>
                </div>
              ) : (
                <Input
                  id="field-default"
                  type={editingField.type === "number" ? "number" : "text"}
                  value={editingField.defaultValue}
                  onChange={(e) =>
                    onFieldChange("defaultValue", e.target.value)
                  }
                  placeholder="Default value"
                />
              )}
            </div>
          )}

          {/* Validation (only for text and textarea) */}
          {fieldTypeSupportsValidation(editingField.type) && (
            <div className="space-y-2">
              <Label>Validation Templates</Label>
              <div className="flex flex-wrap gap-2">
                {Object.entries(VALIDATION_TEMPLATES).map(([key, template]) => (
                  <Badge
                    key={key}
                    variant="outline"
                    className="hover:bg-primary hover:text-primary-foreground cursor-pointer"
                    onClick={() =>
                      applyValidationTemplate(
                        key as keyof typeof VALIDATION_TEMPLATES,
                      )
                    }
                  >
                    {template.label}
                  </Badge>
                ))}
              </div>

              <div className="space-y-2 pt-2">
                <Label htmlFor="field-regex">Custom Regex Pattern</Label>
                <Input
                  id="field-regex"
                  value={editingField.regexPattern}
                  onChange={(e) =>
                    onFieldChange("regexPattern", e.target.value)
                  }
                  placeholder="^[a-zA-Z0-9]+$"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="field-validation-msg">Validation Message</Label>
                <Input
                  id="field-validation-msg"
                  value={editingField.validationMessage}
                  onChange={(e) =>
                    onFieldChange("validationMessage", e.target.value)
                  }
                  placeholder="Error message shown when validation fails"
                />
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button onClick={onSaveField} disabled={isSaving}>
            {isSaving ? "Saving..." : editingField.id ? "Update" : "Add"} Field
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
