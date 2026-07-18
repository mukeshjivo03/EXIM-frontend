import { cn } from "@/lib/utils";

interface RangeBarProps {
  value: number;
  min: number;
  max: number;
  className?: string;
}

/**
 * Thin horizontal track with a dot showing where `value` sits between
 * `min` and `max` (e.g. today's price within the 7-day range).
 */
export function RangeBar({ value, min, max, className }: RangeBarProps) {
  const pct = max > min ? Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100)) : 50;
  return (
    <div className={cn("relative h-1 w-full rounded-full bg-muted", className)}>
      <div
        className="absolute inset-y-0 left-0 rounded-full bg-primary/25"
        style={{ width: `${pct}%` }}
      />
      <div
        className="absolute top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full bg-primary border-2 border-background shadow-sm"
        style={{ left: `calc(${pct}% - 5px)` }}
      />
    </div>
  );
}
