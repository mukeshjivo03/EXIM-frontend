import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export interface ViewToggleOption<T extends string> {
  value: T;
  label: string;
  icon?: LucideIcon;
}

interface ViewToggleProps<T extends string> {
  options: ViewToggleOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}

/**
 * Segmented control matching the Tank Monitoring GRID / BY PRODUCT / BY STATUS
 * toggle style. Generic over the option value union.
 */
export function ViewToggle<T extends string>({ options, value, onChange, className }: ViewToggleProps<T>) {
  return (
    <div
      className={cn(
        "flex items-center gap-1 bg-muted/50 p-1 rounded-lg sm:rounded-xl border border-border/50",
        className
      )}
    >
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={cn(
            "px-2.5 sm:px-3 py-1 text-[10px] font-bold uppercase tracking-wide sm:tracking-widest transition-all rounded-md sm:rounded-lg flex items-center gap-1.5",
            value === opt.value
              ? "bg-primary text-primary-foreground shadow-lg"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {opt.icon && <opt.icon className="h-3 w-3" />}
          {opt.label}
        </button>
      ))}
    </div>
  );
}
