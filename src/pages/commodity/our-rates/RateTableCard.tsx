import { useState } from "react";
import { LayoutGrid, PackageOpen, Plus, TableProperties } from "lucide-react";

import type { RateTableLatest } from "@/api/marketRate";
import { usePersistedState } from "@/hooks/usePersistedState";
import { PackIcon, packTypeFromLabel } from "@/components/PackIcon";
import { ViewToggle } from "@/components/ViewToggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { commodityScheme, fmtINR, normalizedRateLabel } from "./helpers";

const VIEW_OPTIONS = [
  { value: "graphical" as const, label: "Graphical", icon: LayoutGrid },
  { value: "tabular" as const, label: "Tabular", icon: TableProperties },
];

function parseRate(v: string | number | null | undefined): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

interface RateTableCardProps {
  table: RateTableLatest | null;
  loading: boolean;
  /** opens the Packaging Setup dialog scrolled to pack sizes */
  onAddPackSize: () => void;
}

/** Excel-style "JIVO RATE" grid from /rates/rate-table/latest/: pack sizes × commodities. */
export function RateTableCard({ table, loading, onAddPackSize }: RateTableCardProps) {
  const [view, setView] = usePersistedState<"graphical" | "tabular">(
    "ourRates.rateTableView", "graphical", ["graphical", "tabular"]
  );
  const [selectedCommodity, setSelectedCommodity] = useState("");

  const commodities = table?.commodities ?? [];
  const rows = table?.rows ?? [];
  const empty = commodities.length === 0 || rows.length === 0;

  const active = commodities.includes(selectedCommodity) ? selectedCommodity : commodities[0] ?? "";
  const scheme = commodityScheme(active);

  return (
    <Card className="card-hover shimmer-hover">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle>Jivo Rate Table</CardTitle>
            <CardDescription>
              Pack-size rates per commodity, built from each commodity's latest market rate
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" className="gap-1.5" onClick={onAddPackSize}>
              <Plus className="h-3.5 w-3.5" />
              Add Pack Size
            </Button>
            <ViewToggle options={VIEW_OPTIONS} value={view} onChange={setView} />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div key={view} className="animate-in fade-in slide-in-from-bottom-1 duration-150">
          {loading && empty ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="rounded-xl border bg-card p-4 flex flex-col items-center gap-3">
                  <Skeleton className="h-14 w-11" />
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-6 w-24" />
                </div>
              ))}
            </div>
          ) : empty ? (
            <div className="flex flex-col items-center gap-2 py-16 text-muted-foreground rounded-xl border bg-card">
              <PackageOpen className="h-10 w-10 stroke-1" />
              <p className="text-sm font-medium">No rate table yet</p>
              <p className="text-xs">Log market rates and define pack sizes to generate the table.</p>
            </div>
          ) : view === "graphical" ? (
            <div className="space-y-4">
              {/* Commodity pill tabs */}
              <div className="flex flex-wrap items-center gap-2">
                {commodities.map((c) => {
                  const isActive = c === active;
                  const s = commodityScheme(c);
                  return (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setSelectedCommodity(c)}
                      className={cn(
                        "rounded-full px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider border transition-all capitalize",
                        isActive
                          ? "text-white shadow-md scale-105 border-transparent"
                          : "bg-transparent text-muted-foreground border-border hover:border-foreground/40"
                      )}
                      style={isActive ? { backgroundColor: s.base } : undefined}
                    >
                      {c}
                    </button>
                  );
                })}
              </div>

              {/* Pack cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
                {rows.map((row) => {
                  const rate = parseRate(row.rates[active]);
                  const available = rate !== null;
                  return (
                    <div
                      key={row.pack_size}
                      className={cn(
                        "rounded-xl border bg-card p-4 flex flex-col items-center text-center gap-2 shadow-sm transition-opacity",
                        available ? "card-hover" : "opacity-40"
                      )}
                    >
                      <PackIcon type={packTypeFromLabel(row.pack_size)} size={56} scheme={scheme} />
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground capitalize">
                        {row.pack_size}
                      </p>
                      {available ? (
                        <>
                          <p className="text-xl font-bold tabular-nums leading-none">₹{fmtINR(rate)}</p>
                          {normalizedRateLabel(rate, row.pack_size) && (
                            <p className="text-[11px] text-muted-foreground tabular-nums">
                              {normalizedRateLabel(rate, row.pack_size)}
                            </p>
                          )}
                        </>
                      ) : (
                        <p className="text-sm font-medium text-muted-foreground">Not available</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table className="text-base">
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[160px] font-bold text-primary text-center bg-primary/10 dark:bg-primary/20 border-b-2 border-primary/30">
                      Jivo Rate
                    </TableHead>
                    {commodities.map((c) => (
                      <TableHead
                        key={c}
                        className="text-center min-w-[120px] font-bold text-foreground bg-muted/60 capitalize border-b-2 border-border/60"
                      >
                        {c}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={row.pack_size} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="font-semibold text-center capitalize bg-muted/40 border-r border-border/60 text-foreground">
                        {row.pack_size}
                      </TableCell>
                      {commodities.map((c) => {
                        const rate = parseRate(row.rates[c]);
                        const normalized = rate !== null ? normalizedRateLabel(rate, row.pack_size) : null;
                        return (
                          <TableCell key={c} className="text-center border-r border-border/30 last:border-r-0">
                            {rate !== null ? (
                              <div className="flex flex-col items-center gap-0.5 py-0.5">
                                <span className="font-semibold text-sm tabular-nums">₹ {fmtINR(rate)}</span>
                                {normalized && (
                                  <span className="text-[10px] text-muted-foreground tabular-nums leading-none">
                                    {normalized}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-muted-foreground/30">—</span>
                            )}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
