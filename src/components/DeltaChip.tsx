import { cn } from "@/lib/utils";

interface DeltaChipProps {
  current: number;
  previous: number | null;
  size?: "sm" | "md";
  className?: string;
}

/**
 * Rounded-full day-over-day delta pill: ▲ green rise, ▼ red fall, — gray flat.
 * Renders nothing when there is no comparison value.
 */
export function DeltaChip({ current, previous, size = "md", className }: DeltaChipProps) {
  if (previous === null || !Number.isFinite(previous)) return null;
  const diff = current - previous;
  const flat = Math.abs(diff) < 0.005;
  const up = diff > 0;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full font-bold tabular-nums whitespace-nowrap",
        size === "sm" ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-0.5 text-xs",
        flat
          ? "bg-muted text-muted-foreground"
          : up
            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
            : "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400",
        className
      )}
      title={flat ? "No change vs yesterday" : `${up ? "Up" : "Down"} ₹${Math.abs(diff).toFixed(2)} vs yesterday`}
    >
      <span aria-hidden="true" className="text-[0.85em] leading-none">
        {flat ? "—" : up ? "▲" : "▼"}
      </span>
      {Math.abs(diff).toFixed(2)}
    </span>
  );
}
