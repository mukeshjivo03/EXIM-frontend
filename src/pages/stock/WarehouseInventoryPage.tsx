import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { RefreshCw, Warehouse, PackageOpen } from "lucide-react";

import { getWarehouseInventory, getFinishedInventory, type WarehouseInventoryItem } from "@/api/sapSync";
import { getErrorMessage } from "@/lib/errors";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

function fmtNum(n: number) {
  return n.toLocaleString("en-IN", { maximumFractionDigits: 0 });
}

// Only these warehouses are shown, in this order
const ALLOWED_WAREHOUSES = ["BH-EC", "BH-GJ", "BH-CRUDE", "GP-FG", "BH-EX", "BH-PF", "BH-PC", "BH-VA"];

// These use the finished-goods inventory API
const FINISHED_WAREHOUSES = new Set(["BH-EC", "GP-FG"]);

const WAREHOUSE_COLORS: Record<string, string> = {
  "BH-EC":    "bg-rose-50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800",
  "BH-GJ":    "bg-violet-50 dark:bg-violet-950/20 border-violet-200 dark:border-violet-800",
  "BH-CRUDE": "bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800",
  "GP-FG":    "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800",
  "BH-EX":    "bg-sky-50 dark:bg-sky-950/20 border-sky-200 dark:border-sky-800",
  "BH-PF":    "bg-pink-50 dark:bg-pink-950/20 border-pink-200 dark:border-pink-800",
  "BH-PC":    "bg-teal-50 dark:bg-teal-950/20 border-teal-200 dark:border-teal-800",
  "BH-VA":    "bg-lime-50 dark:bg-lime-950/20 border-lime-200 dark:border-lime-800",
};

const HEADER_COLORS: Record<string, string> = {
  "BH-EC":    "bg-rose-100 dark:bg-rose-900/30 text-rose-800 dark:text-rose-200",
  "BH-GJ":    "bg-violet-100 dark:bg-violet-900/30 text-violet-800 dark:text-violet-200",
  "BH-CRUDE": "bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-200",
  "GP-FG":    "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-200",
  "BH-EX":    "bg-sky-100 dark:bg-sky-900/30 text-sky-800 dark:text-sky-200",
  "BH-PF":    "bg-pink-100 dark:bg-pink-900/30 text-pink-800 dark:text-pink-200",
  "BH-PC":    "bg-teal-100 dark:bg-teal-900/30 text-teal-800 dark:text-teal-200",
  "BH-VA":    "bg-lime-100 dark:bg-lime-900/30 text-lime-800 dark:text-lime-200",
};

function warehouseColor(wh: string) {
  return WAREHOUSE_COLORS[wh] ?? "bg-muted/30 border-border";
}

function headerColor(wh: string) {
  return HEADER_COLORS[wh] ?? "bg-muted/50 text-foreground";
}

export default function WarehouseInventoryPage() {
  const [items, setItems] = useState<WarehouseInventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWarehouses, setSelectedWarehouses] = useState<Set<string>>(new Set(["BH-CRUDE"]));

  async function fetchData() {
    setLoading(true);
    try {
      const [regular, finished] = await Promise.all([
        getWarehouseInventory(),
        getFinishedInventory(),
      ]);
      // Merge: finished warehouses use finished API, rest use regular
      const regularFiltered = regular.filter((i) => !FINISHED_WAREHOUSES.has(i.Warehouse));
      setItems([...regularFiltered, ...finished]);
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to load warehouse inventory"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchData(); }, []);

  // Fixed ordered list — only show allowed warehouses
  const allWarehouses = ALLOWED_WAREHOUSES;

  function toggleWarehouse(wh: string) {
    setSelectedWarehouses((prev) => {
      const next = new Set(prev);
      if (next.has(wh)) {
        if (next.size === 1) return prev; // keep at least one
        next.delete(wh);
      } else {
        next.add(wh);
      }
      return next;
    });
  }

  function selectAll() {
    setSelectedWarehouses(new Set(allWarehouses));
  }

  function selectNone() {
    setSelectedWarehouses(new Set([allWarehouses[0]]));
  }

  // Group items by warehouse, only selected ones
  const grouped = useMemo(() => {
    const map = new Map<string, WarehouseInventoryItem[]>();
    for (const wh of allWarehouses) {
      if (!selectedWarehouses.has(wh)) continue;
      const rows = items.filter((i) => i.Warehouse === wh && i.Total > 0);
      map.set(wh, rows);
    }
    return map;
  }, [items, allWarehouses, selectedWarehouses]);

  // Grand total across all selected warehouses
  const overallTotal = useMemo(() => {
    let sum = 0;
    grouped.forEach((rows) => rows.forEach((r) => (sum += r.Total)));
    return sum;
  }, [grouped]);

  return (
    <div className="p-3 sm:p-4 md:p-6 space-y-6 animate-page">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Warehouse Inventory</h1>
          <p className="text-sm text-muted-foreground">Live inventory by warehouse and category from SAP</p>
        </div>
        <Button onClick={fetchData} disabled={loading} className="btn-press gap-2">
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          {loading ? "Loading..." : "Refresh"}
        </Button>
      </div>

      {/* Warehouse filter pills */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <CardTitle className="text-sm font-medium text-muted-foreground">Filter Warehouses</CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={selectAll}>All</Button>
              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={selectNone}>Reset</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-7 w-20 rounded-full" />)}
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {allWarehouses.map((wh) => (
                <button
                  key={wh}
                  onClick={() => toggleWarehouse(wh)}
                  className={`px-3 py-1 rounded-full text-sm border transition-all font-medium ${
                    selectedWarehouses.has(wh)
                      ? headerColor(wh) + " border-transparent shadow-sm"
                      : "bg-muted/30 text-muted-foreground border-border hover:border-foreground/30"
                  }`}
                >
                  {wh}
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Overall total */}
      {!loading && overallTotal > 0 && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Warehouse className="h-4 w-4" />
          <span>
            Total across {selectedWarehouses.size} warehouse{selectedWarehouses.size !== 1 ? "s" : ""}:{" "}
            <span className="font-semibold text-foreground">{fmtNum(overallTotal)} LTR</span>
          </span>
        </div>
      )}

      {/* Warehouse cards */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-64 rounded-xl" />
          ))}
        </div>
      ) : grouped.size === 0 ? (
        <div className="flex flex-col items-center gap-3 text-muted-foreground py-20">
          <PackageOpen className="h-12 w-12 stroke-1" />
          <p className="font-medium">No data available</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {[...grouped.entries()].map(([wh, rows]) => {
            const total = rows.reduce((s, r) => s + r.Total, 0);
            const allRows = items.filter((i) => i.Warehouse === wh);
            const categoryCount = allRows.length;
            const nonZeroCount = rows.length;

            return (
              <Card key={wh} className={`border-2 ${warehouseColor(wh)}`}>
                <CardHeader className={`rounded-t-xl px-4 py-3 ${headerColor(wh)}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Warehouse className="h-4 w-4" />
                      <CardTitle className="text-base font-semibold">{wh}</CardTitle>
                    </div>
                    <Badge variant="outline" className="text-xs font-normal bg-white/50 dark:bg-black/20">
                      {nonZeroCount}/{categoryCount} categories
                    </Badge>
                  </div>
                  <CardDescription className="text-current opacity-70 text-xs mt-0.5">
                    Grand Total: <span className="font-semibold">{fmtNum(total)} LTR</span>
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  {rows.length === 0 ? (
                    <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
                      <PackageOpen className="h-8 w-8 stroke-1 opacity-40" />
                      <p className="text-sm">No stock in this warehouse</p>
                    </div>
                  ) : (
                    <table className="w-full">
                      <thead>
                        <tr className="border-b text-xs uppercase tracking-wider text-muted-foreground">
                          <th className="px-4 py-2 text-left font-medium">Category</th>
                          <th className="px-4 py-2 text-right font-medium">Total (LTR)</th>
                          <th className="px-4 py-2 text-right font-medium">Share</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows
                          .sort((a, b) => b.Total - a.Total)
                          .map((row, idx) => {
                            const share = total > 0 ? (row.Total / total) * 100 : 0;
                            return (
                              <tr
                                key={idx}
                                className="border-b last:border-b-0 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                              >
                                <td className="px-4 py-2.5 text-sm">{row.Category}</td>
                                <td className="px-4 py-2.5 text-sm text-right tabular-nums font-medium">
                                  {fmtNum(row.Total)}
                                </td>
                                <td className="px-4 py-2.5 text-right">
                                  <div className="flex items-center justify-end gap-2">
                                    <div className="w-16 h-1.5 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
                                      <div
                                        className="h-full rounded-full bg-current opacity-40"
                                        style={{ width: `${share}%` }}
                                      />
                                    </div>
                                    <span className="text-xs tabular-nums text-muted-foreground w-10 text-right">
                                      {share.toFixed(1)}%
                                    </span>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                      <tfoot>
                        <tr className="border-t-2 font-semibold bg-black/5 dark:bg-white/5">
                          <td className="px-4 py-2.5 text-sm">Grand Total</td>
                          <td className="px-4 py-2.5 text-sm text-right tabular-nums">{fmtNum(total)}</td>
                          <td className="px-4 py-2.5 text-right text-xs text-muted-foreground">100%</td>
                        </tr>
                      </tfoot>
                    </table>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
