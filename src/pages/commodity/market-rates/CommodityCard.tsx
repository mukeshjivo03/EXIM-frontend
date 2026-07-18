import { Badge } from "@/components/ui/badge";
import { DeltaChip } from "@/components/DeltaChip";
import { Sparkline } from "@/components/Sparkline";
import { cn } from "@/lib/utils";
import type { EnrichedRate } from "./useMarketRates";

export const LADDER_COLORS = {
  factory: "#14b8a6", // teal-500
  packing: "#fb923c", // coral / orange-400
  gst: "#8b5cf6", // violet-500
} as const;

export function fmtINR(v: number, decimals = 2): string {
  return v.toLocaleString("en-IN", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

interface CommodityCardProps {
  row: EnrichedRate;
  onClick: () => void;
}

export function CommodityCard({ row, onClick }: CommodityCardProps) {
  // Build-up segments proportional to the final ₹/Kg price (server-computed values).
  const packStep = Math.max(0, row.packing - row.factory);
  const gstStep = Math.max(0, row.gstKg - row.packing);
  const total = row.factory + packStep + gstStep || 1;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full text-left rounded-xl border bg-card p-4 shadow-sm card-hover transition-colors",
        row.isHighest
          ? "border-blue-300 dark:border-blue-800"
          : row.isLowest
            ? "border-red-200 dark:border-red-900/60"
            : "border-border"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <p className="font-semibold text-sm truncate">{row.name}</p>
          {row.isHighest && (
            <Badge className="shrink-0 bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border-none text-[9px] px-1.5 py-0 uppercase tracking-wider">
              Highest
            </Badge>
          )}
          {row.isLowest && (
            <Badge className="shrink-0 bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 border-none text-[9px] px-1.5 py-0 uppercase tracking-wider">
              Lowest
            </Badge>
          )}
        </div>
        <DeltaChip current={row.factory} previous={row.prevFactory} size="sm" className="shrink-0" />
      </div>

      <div className="mt-2 flex items-end justify-between gap-3">
        <p className="text-2xl font-semibold tabular-nums leading-none">
          ₹{fmtINR(row.factory)}
          <span className="ml-1 text-[10px] font-medium text-muted-foreground align-baseline">/Kg</span>
        </p>
        <Sparkline data={row.spark} width={72} height={26} className="shrink-0" />
      </div>

      <div className="my-3 border-t border-border/60" />

      <div className="flex h-2 w-full overflow-hidden rounded-full">
        <div style={{ width: `${(row.factory / total) * 100}%`, backgroundColor: LADDER_COLORS.factory }} />
        <div style={{ width: `${(packStep / total) * 100}%`, backgroundColor: LADDER_COLORS.packing }} />
        <div style={{ width: `${(gstStep / total) * 100}%`, backgroundColor: LADDER_COLORS.gst }} />
      </div>
      <p className="mt-2 text-[10px] text-muted-foreground tabular-nums truncate">
        Pack {fmtINR(row.packing)} · GST/kg {fmtINR(row.gstKg)} · Ltr {fmtINR(row.gstLtr)}
      </p>
    </button>
  );
}
