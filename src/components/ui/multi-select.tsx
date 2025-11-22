"use client";

import * as React from "react";
import { X, ChevronDown } from "lucide-react";
import { cn } from "~/lib/utils";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";
import { Label } from "~/components/ui/label";
import { Input } from "~/components/ui/input";

export interface MultiSelectOption {
  label: string;
  value: string;
}

interface MultiSelectProps {
  options: MultiSelectOption[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
  maxSelections?: number;
  className?: string;
}

export function MultiSelect({
  options,
  selected,
  onChange,
  placeholder = "Select options...",
  maxSelections,
  className,
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter((item) => item !== value));
    } else {
      if (maxSelections && selected.length >= maxSelections) {
        return; // Don't select if limit reached
      }
      onChange([...selected, value]);
    }
  };

  const handleRemove = (value: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(selected.filter((item) => item !== value));
  };

  const filteredOptions = options.filter((option) =>
    option.label.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <Button
        type="button"
        variant="outline"
        role="combobox"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className={cn(
          "w-full justify-between",
          selected.length > 0 ? "h-auto min-h-10" : "h-10",
        )}
      >
        <div className="flex flex-1 flex-wrap gap-1">
          {selected.length === 0 ? (
            <span className="text-muted-foreground">{placeholder}</span>
          ) : (
            selected.map((value) => {
              const option = options.find((opt) => opt.value === value);
              return (
                <Badge key={value} variant="secondary" className="mr-1">
                  {option?.label ?? value}
                  <button
                    className="ring-offset-background focus:ring-ring ml-1 rounded-full outline-none focus:ring-2 focus:ring-offset-2"
                    onClick={(e) => handleRemove(value, e)}
                    type="button"
                  >
                    <X className="text-muted-foreground hover:text-foreground h-3 w-3" />
                  </button>
                </Badge>
              );
            })
          )}
        </div>
        <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </Button>

      {open && (
        <div className="bg-popover text-popover-foreground absolute z-50 mt-1 w-full rounded-md border p-2 shadow-md">
          <Input
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="mb-2 h-8"
          />
          <div className="max-h-60 overflow-auto">
            {filteredOptions.length === 0 ? (
              <p className="text-muted-foreground py-6 text-center text-sm">
                No options found
              </p>
            ) : (
              <div className="space-y-1">
                {filteredOptions.map((option) => {
                  const isSelected = selected.includes(option.value);
                  const isDisabled =
                    !isSelected &&
                    maxSelections !== undefined &&
                    selected.length >= maxSelections;

                  return (
                    <div
                      key={option.value}
                      className={cn(
                        "hover:bg-accent flex cursor-pointer items-center space-x-2 rounded-sm px-2 py-1.5",
                        isDisabled && "cursor-not-allowed opacity-50",
                      )}
                      onClick={() => !isDisabled && handleSelect(option.value)}
                    >
                      <Checkbox
                        id={`multi-select-${option.value}`}
                        checked={isSelected}
                        disabled={isDisabled}
                        className="pointer-events-none"
                      />
                      <Label
                        htmlFor={`multi-select-${option.value}`}
                        className="flex-1 cursor-pointer text-sm font-normal"
                      >
                        {option.label}
                      </Label>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          {maxSelections && (
            <div className="text-muted-foreground mt-2 border-t pt-2 text-xs">
              {selected.length} / {maxSelections} selected
            </div>
          )}
        </div>
      )}
    </div>
  );
}
