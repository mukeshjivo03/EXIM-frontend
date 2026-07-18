import { PackageOpen } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import { CommodityCard, LADDER_COLORS } from "./CommodityCard";
import type { EnrichedRate } from "./useMarketRates";

const LEGEND = [
  { label: "Factory", color: LADDER_COLORS.factory },
  { label: "Packing +14", color: LADDER_COLORS.packing },
  { label: "GST 0.5%", color: LADDER_COLORS.gst },
];

interface GraphicalViewProps {
  rows: EnrichedRate[];
  loading: boolean;
  hasSearch: boolean;
  onSelect: (row: EnrichedRate) => void;
}

export function GraphicalView({ rows, loading, hasSearch, onSelect }: GraphicalViewProps) {
  if (loading && rows.length === 0) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-xl border bg-card p-4 space-y-3">
            <div className="flex justify-between">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-14 rounded-full" />
            </div>
            <div className="flex justify-between items-end">
              <Skeleton className="h-8 w-24" />
              <Skeleton className="h-6 w-[72px]" />
            </div>
            <Skeleton className="h-2 w-full rounded-full" />
            <Skeleton className="h-3 w-3/4" />
          </div>
        ))}
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-16 text-muted-foreground rounded-xl border bg-card">
        <PackageOpen className="h-10 w-10 stroke-1" />
        <p className="text-sm font-medium">
          {hasSearch ? "No commodities match your search" : "No rates logged today"}
        </p>
        {!hasSearch && <p className="text-xs">Click "Log Today's Rates" to record them.</p>}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {rows.map((row) => (
          <CommodityCard key={row.commodityId} row={row} onClick={() => onSelect(row)} />
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-4 px-1">
        {LEGEND.map((item) => (
          <span key={item.label} className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
            {item.label}
          </span>
        ))}
      </div>
    </div>
  );
}
