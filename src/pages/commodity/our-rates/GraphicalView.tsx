import { PackageOpen } from "lucide-react";

import { PackIcon, packTypeFromLabel } from "@/components/PackIcon";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { commodityScheme, fmtINR } from "./helpers";
import type { OurRatesMatrix } from "./useOurRates";

interface GraphicalViewProps {
  matrix: OurRatesMatrix;
  selectedCommodity: number | null;
  onSelectCommodity: (fk: number) => void;
  loading: boolean;
}

export function GraphicalView({ matrix, selectedCommodity, onSelectCommodity, loading }: GraphicalViewProps) {
  if (loading && matrix.commodities.length === 0) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="rounded-xl border bg-card p-4 flex flex-col items-center gap-3">
            <Skeleton className="h-14 w-11" />
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-6 w-24" />
          </div>
        ))}
      </div>
    );
  }

  if (matrix.commodities.length === 0 || matrix.packings.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-16 text-muted-foreground rounded-xl border bg-card">
        <PackageOpen className="h-10 w-10 stroke-1" />
        <p className="text-sm font-medium">No basic rates for this date</p>
        <p className="text-xs">Rates appear once market rates and packing margins are combined by the backend.</p>
      </div>
    );
  }

  const active = matrix.commodities.find((c) => c.fk === selectedCommodity) ?? matrix.commodities[0];
  const scheme = commodityScheme(active.name);

  return (
    <div className="space-y-4">
      {/* Commodity pill tabs */}
      <div className="flex flex-wrap items-center gap-2">
        {matrix.commodities.map((c) => {
          const isActive = c.fk === active.fk;
          const s = commodityScheme(c.name);
          return (
            <button
              key={c.fk}
              type="button"
              onClick={() => onSelectCommodity(c.fk)}
              className={cn(
                "rounded-full px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider border transition-all capitalize",
                isActive
                  ? "text-white shadow-md scale-105 border-transparent"
                  : "bg-transparent text-muted-foreground border-border hover:border-foreground/40"
              )}
              style={isActive ? { backgroundColor: s.base } : undefined}
            >
              {c.name}
            </button>
          );
        })}
      </div>

      {/* Packing cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
        {matrix.packings.map((p) => {
          const price = matrix.valueMap.get(`${active.fk}||${p.id}`);
          const available = price !== undefined;
          return (
            <div
              key={p.id}
              className={cn(
                "rounded-xl border bg-card p-4 flex flex-col items-center text-center gap-2 shadow-sm transition-opacity",
                available ? "card-hover" : "opacity-40"
              )}
            >
              <PackIcon type={packTypeFromLabel(p.name)} size={56} scheme={scheme} />
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground capitalize">{p.name}</p>
              {available ? (
                <>
                  <p className="text-xl font-bold tabular-nums leading-none">
                    ₹{fmtINR(price.kg)}
                    <span className="ml-1 text-[10px] font-medium text-muted-foreground align-baseline">/Kg</span>
                  </p>
                  <p className="text-[11px] text-muted-foreground tabular-nums">≈ ₹{fmtINR(price.ltr)} / Ltr</p>
                  <p className="text-[10px] text-muted-foreground/70 tabular-nums">Margin ₹{fmtINR(p.margin)}</p>
                </>
              ) : (
                <p className="text-sm font-medium text-muted-foreground">Not available</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
