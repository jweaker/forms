"use client";

import * as React from "react";
import { X, ChevronDown, Check } from "lucide-react";
import { cn } from "~/lib/utils";
import { Badge } from "~/components/ui/badge";
import { Input } from "~/components/ui/input";
import { toast } from "sonner";

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
        setSearch(""); // Clear search when closing
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
        toast.error(`Maximum ${maxSelections} selections allowed`);
        return;
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
      <div
        role="combobox"
        aria-expanded={open}
        aria-controls="multi-select-listbox"
        onClick={() => setOpen(!open)}
        className={cn(
          "border-input hover:border-primary/50 flex min-h-11 w-full cursor-pointer items-center justify-between rounded-md border bg-transparent px-3 py-2 text-sm transition-colors",
          selected.length > 0 && "min-h-11",
          open && "ring-primary/20 ring-2",
        )}
      >
        <div className="flex flex-1 flex-wrap gap-1.5">
          {selected.length === 0 ? (
            <span className="text-muted-foreground text-sm">{placeholder}</span>
          ) : (
            selected.map((value) => {
              const option = options.find((opt) => opt.value === value);
              return (
                <Badge
                  key={value}
                  variant="secondary"
                  className="bg-primary/10 text-primary hover:bg-primary/20 gap-1 rounded-md px-2 py-0.5 text-xs font-medium"
                >
                  {option?.label ?? value}
                  <span
                    className="ring-offset-background focus:ring-ring hover:bg-primary/20 ml-0.5 inline-flex cursor-pointer rounded-full transition-colors outline-none focus:ring-2 focus:ring-offset-2"
                    onClick={(e) => handleRemove(value, e)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        handleRemove(value, e as unknown as React.MouseEvent);
                      }
                    }}
                    aria-label={`Remove ${option?.label ?? value}`}
                  >
                    <X className="h-3 w-3" />
                  </span>
                </Badge>
              );
            })
          )}
        </div>
        <ChevronDown
          className={cn(
            "ml-2 h-4 w-4 shrink-0 opacity-50 transition-transform duration-200",
            open && "rotate-180",
          )}
        />
      </div>

      {open && (
        <div
          id="multi-select-listbox"
          role="listbox"
          className="bg-popover text-popover-foreground animate-in fade-in-0 zoom-in-95 absolute z-50 mt-2 w-full rounded-lg border shadow-lg"
        >
          <div className="p-3">
            <Input
              placeholder="Search options..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 text-sm"
              autoFocus
            />
          </div>
          <div className="max-h-64 overflow-auto px-2 pb-2">
            {selected.length > 0 && (
              <div className="mb-2 px-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onChange([]);
                  }}
                  className="text-muted-foreground hover:text-foreground text-xs underline transition-colors"
                >
                  Clear all
                </button>
              </div>
            )}
            {filteredOptions.length === 0 ? (
              <div className="text-muted-foreground py-8 text-center">
                <p className="text-sm font-medium">No options found</p>
                <p className="text-xs">Try a different search term</p>
              </div>
            ) : (
              <div className="space-y-0.5">
                {filteredOptions.map((option) => {
                  const isSelected = selected.includes(option.value);
                  const isDisabled =
                    !isSelected &&
                    maxSelections !== undefined &&
                    selected.length >= maxSelections;

                  return (
                    <button
                      key={option.value}
                      type="button"
                      className={cn(
                        "hover:bg-accent w-full rounded-md px-3 py-2.5 text-left text-sm transition-colors",
                        "flex items-center justify-between gap-2",
                        isSelected && "bg-accent",
                        isDisabled && "cursor-not-allowed opacity-50",
                      )}
                      onClick={() => !isDisabled && handleSelect(option.value)}
                      disabled={isDisabled}
                    >
                      <span className="flex-1 font-medium">{option.label}</span>
                      {isSelected && (
                        <Check className="text-primary h-4 w-4 flex-shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          {maxSelections && (
            <div className="bg-muted/30 border-t px-3 py-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground font-medium">
                  Selected
                </span>
                <span
                  className={cn(
                    "font-semibold",
                    selected.length >= maxSelections
                      ? "text-destructive"
                      : "text-primary",
                  )}
                >
                  {selected.length} / {maxSelections}
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
