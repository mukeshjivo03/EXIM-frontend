import { useMemo } from "react";
import { format, parseISO } from "date-fns";
import { PackageOpen } from "lucide-react";

import type { MarketRate } from "@/api/marketRate";
import { fmtINR } from "./CommodityCard";

/**
 * Day-over-day cell tint: green shades = price DROP, red shades = RISE,
 * neutral for flat / first column. Intensity scales with |%| capped at 3%.
 */
function cellBg(pct: number | null): string {
  if (pct === null || Math.abs(pct) < 0.01) return "transparent";
  const intensity = Math.min(Math.abs(pct) / 3, 1);
  const alpha = 0.08 + 0.34 * intensity;
  return pct > 0 ? `rgba(239, 68, 68, ${alpha})` : `rgba(16, 185, 129, ${alpha})`;
}

interface RatesHeatmapProps {
  /** commodity FK → history rows (asc by date, deduped) */
  byCommodity: Map<number, MarketRate[]>;
  commodityName: (fk: number | null) => string;
  /** restrict to dates within [from, to] when set (YYYY-MM-DD) */
  from?: string;
  to?: string;
  onCellClick: (commodityId: number, name: string, date: string) => void;
}

export function RatesHeatmap({ byCommodity, commodityName, from, to, onCellClick }: RatesHeatmapProps) {
  const grid = useMemo(() => {
    const inRange = (d: string) => (!from || d >= from) && (!to || d <= to);
    const dateSet = new Set<string>();
    const rows: { id: number; name: string; values: Map<string, number> }[] = [];
    for (const [fk, list] of byCommodity) {
      const values = new Map<string, number>();
      for (const r of list) {
        if (!inRange(r.date)) continue;
        values.set(r.date, Number(r.factory_kg));
        dateSet.add(r.date);
      }
      if (values.size > 0) rows.push({ id: fk, name: commodityName(fk), values });
    }
    rows.sort((a, b) => a.name.localeCompare(b.name));
    return { dates: Array.from(dateSet).sort(), rows };
  }, [byCommodity, commodityName, from, to]);

  if (grid.rows.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-16 text-muted-foreground">
        <PackageOpen className="h-10 w-10 stroke-1" />
        <p className="text-sm font-medium">No logged rates</p>
        <p className="text-xs">Log factory rates (or widen the date range) to see the heatmap.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="border-collapse text-xs w-full">
        <thead>
          <tr>
            <th className="sticky left-0 z-10 bg-background text-left font-bold text-foreground px-3 py-2 border-b border-r min-w-[150px]">
              Commodity
            </th>
            {grid.dates.map((date) => (
              <th key={date} className="px-2 py-2 border-b text-center font-semibold text-muted-foreground min-w-[68px] whitespace-nowrap">
                {format(parseISO(date), "d MMM")}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {grid.rows.map((row) => (
            <tr key={row.id} className="group">
              <td className="sticky left-0 z-10 bg-background group-hover:bg-muted/40 transition-colors font-semibold px-3 py-1.5 border-b border-r whitespace-nowrap">
                {row.name}
              </td>
              {grid.dates.map((date, di) => {
                const value = row.values.get(date);
                let prev: number | undefined;
                for (let i = di - 1; i >= 0; i--) {
                  prev = row.values.get(grid.dates[i]);
                  if (prev !== undefined) break;
                }
                const pct = value !== undefined && prev !== undefined && prev !== 0 ? ((value - prev) / prev) * 100 : null;
                const tooltip =
                  value === undefined
                    ? `${row.name} · ${format(parseISO(date), "d MMM yyyy")}: no data`
                    : `${row.name} · ${format(parseISO(date), "d MMM yyyy")}: ₹${fmtINR(value)}${
                        pct !== null ? ` (${pct > 0 ? "▲" : pct < 0 ? "▼" : "—"} ${Math.abs(pct).toFixed(2)}%)` : ""
                      }`;
                return (
                  <td key={date} className="border-b p-0 text-center">
                    {value === undefined ? (
                      <span className="block px-2 py-1.5 text-muted-foreground/30">—</span>
                    ) : (
                      <button
                        type="button"
                        title={tooltip}
                        onClick={() => onCellClick(row.id, row.name, date)}
                        className="block w-full px-2 py-1.5 tabular-nums font-medium hover:ring-1 hover:ring-inset hover:ring-primary/60 transition-shadow"
                        style={{ backgroundColor: cellBg(pct) }}
                      >
                        {fmtINR(value)}
                      </button>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex items-center gap-4 px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: "rgba(16,185,129,0.4)" }} /> Price drop
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: "rgba(239,68,68,0.4)" }} /> Price rise
        </span>
        <span>Intensity capped at ±3%</span>
      </div>
    </div>
  );
}
