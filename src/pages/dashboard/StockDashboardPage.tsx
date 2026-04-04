import { Fragment, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  RefreshCw,
  Factory,
  PackageOpen,
  EyeOff,
  Eye,
  ChevronRight,
  Info,
  Download,
} from "lucide-react";
import * as XLSX from "xlsx";

import { getStockDashboard, type StockDashboardResponse } from "@/api/dashboard";
import { getItemWiseTankSummary, type ItemWiseTankSummary } from "@/api/tank";
import { getErrorMessage } from "@/lib/errors";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Unit = "KG" | "MTS" | "LTR";

const UNIT_LABELS: Record<Unit, string> = { KG: "KG", MTS: "MTS", LTR: "Liters" };

/** Conversion factor from KG to target unit */
function convertUnit(kg: number, unit: Unit): number {
  if (unit === "MTS") return kg / 1000;
  if (unit === "LTR") return kg * 1.0989; // 1ltr = 1kg * 1.0989
  return kg;
}

function fmtNum(n: number, unit: Unit = "KG") {
  const val = convertUnit(n, unit);
  return val.toLocaleString("en-IN", {
    minimumFractionDigits: unit === "MTS" ? 2 : 0,
    maximumFractionDigits: unit === "MTS" ? 2 : 0,
  });
}

/** Convert liters to the selected display unit */
function convertFromLiters(liters: number, unit: Unit): number {
  if (unit === "KG") return liters / 1.0989;
  if (unit === "MTS") return (liters / 1.0989) / 1000;
  return liters;
}

function fmtLiters(n: number, unit: Unit) {
  const val = convertFromLiters(n, unit);
  return val.toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}


/* ── helpers ─────────────────────────────────────────────────── */

/* ── component ────────────────────────────────────────────────── */

export default function StockDashboardPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<StockDashboardResponse | null>(null);
  const [tankSummary, setTankSummary] = useState<ItemWiseTankSummary | null>(null);
  const [loading, setLoading] = useState(true);
  
  // UX States
  const [hideZeroRows, setHideZeroRows] = useState(false);
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);
  const [hoveredCol, setHoveredCol] = useState<string | null>(null);

  const [unit, setUnit] = useState<Unit>(() => {
    const saved = localStorage.getItem("stock_dashboard_unit");
    return (saved === "KG" || saved === "MTS" || saved === "LTR") ? saved : "MTS";
  });

  useEffect(() => {
    localStorage.setItem("stock_dashboard_unit", unit);
  }, [unit]);

  const tankQtyMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of tankSummary?.items ?? []) {
      map.set(item.tank_item_code, item.quantity_in_liters);
    }
    return map;
  }, [tankSummary]);

  const tankInFactoryTotal = tankSummary?.total_quantity ?? 0;

  async function fetchData() {
    setLoading(true);
    try {
      const [res, tankData] = await Promise.all([
        getStockDashboard(),
        getItemWiseTankSummary(),
      ]);
      setData(res);
      setTankSummary(tankData);
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to load stock dashboard"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, []);

  /* ── Calculations & Derived Data ── */

  const colKeys = useMemo(
    () =>
      data
        ? Object.keys(data.totals.status_vendor_totals).filter(
            (key) => !key.startsWith("COMPLETED__") && !key.startsWith("DELIVERED__") && !key.startsWith("completed__")
          )
        : [],
    [data]
  );

  const statusGroups = useMemo(() => {
    const groups: { status: string; vendors: { key: string; vendor: string }[] }[] = [];
    const seen = new Map<string, number>();
    for (const key of colKeys) {
      const [status, vendor] = key.split("__");
      if (seen.has(status)) {
        groups[seen.get(status)!].vendors.push({ key, vendor });
      } else {
        seen.set(status, groups.length);
        groups.push({ status, vendors: [{ key, vendor }] });
      }
    }
    return groups;
  }, [colKeys]);





  // Max value for heatmapping
  const maxCellValue = useMemo(() => {
    if (!data) return 0;
    let max = 0;
    data.items.forEach(item => {
      max = Math.max(max, item.outside_factory, ...Object.values(item.status_data));
    });
    return max;
  }, [data]);

  // Top Insights
  const insights = useMemo(() => {
    if (!data) return null;
    const topItem = [...data.items].sort((a, b) => b.total - a.total)[0];
    return { topItem };
  }, [data]);

  // Filtered rows based on hideZeroRows — includes tank-only items
  const displayItems = useMemo(() => {
    if (!data) return [];

    // Build set of item codes already in the stock table
    const stockItemCodes = new Set(data.items.map((i) => i.item_code));

    // Synthetic rows for tank items not in stock table
    const tankOnlyRows: typeof data.items = (tankSummary?.items ?? [])
      .filter((t) => !stockItemCodes.has(t.tank_item_code))
      .map((t) => ({
        item_code: t.tank_item_code,
        in_factory: 0,
        outside_factory: 0,
        status_data: {},
        total: 0,
      }));

    const merged = [...data.items, ...tankOnlyRows];

    if (!hideZeroRows) return merged;
    return merged.filter(item => {
      const tankVal = tankQtyMap.get(item.item_code) ?? 0;
      return tankVal > 0 || item.total > 0;
    });
  }, [data, hideZeroRows, tankQtyMap, tankSummary]);

  /* ── Export to Excel ─────────────────────────────────────── */

  function exportToExcel() {
    if (!data) return;

    const rows: Record<string, string | number>[] = [];

    for (const item of displayItems) {
      const tankVal = tankQtyMap.get(item.item_code) ?? 0;
      const row: Record<string, string | number> = { "RM Code": item.item_code };
      row["In Factory"] = unit === "LTR" ? tankVal : Number(convertFromLiters(tankVal, unit).toFixed(3));
      row["Outside Factory"] = Number(convertUnit(item.outside_factory, unit).toFixed(3));

      for (const group of statusGroups) {
        for (const { key, vendor } of group.vendors) {
          const colLabel = `${group.status.replace(/_/g, " ")} — ${vendor}`;
          row[colLabel] = Number(convertUnit(item.status_data[key] ?? 0, unit).toFixed(3));
        }
      }

      const grandTotal = convertFromLiters(tankVal, unit) + convertUnit(item.outside_factory + colKeys.reduce((sum, k) => sum + (item.status_data[k] ?? 0), 0), unit);
      row["Total"] = Math.round(grandTotal);
      rows.push(row);
    }

    // Grand total row
    const totalRow: Record<string, string | number> = { "RM Code": "GRAND TOTAL" };
    totalRow["In Factory"] = Number(convertFromLiters(tankInFactoryTotal, unit).toFixed(3));
    totalRow["Outside Factory"] = Number(convertUnit(data.totals.outside_factory, unit).toFixed(3));
    for (const group of statusGroups) {
      for (const { key, vendor } of group.vendors) {
        const colLabel = `${group.status.replace(/_/g, " ")} — ${vendor}`;
        totalRow[colLabel] = Number(convertUnit(data.totals.status_vendor_totals[key] ?? 0, unit).toFixed(3));
      }
    }
    totalRow["Total"] = Number(convertUnit(data.totals.grand_total, unit).toFixed(3));
    rows.push(totalRow);

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Stock Dashboard");
    XLSX.writeFile(wb, `Stock_Dashboard_${UNIT_LABELS[unit]}_${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast.success("Exported to Excel");
  }

  return (
    <div className="p-3 sm:p-4 md:p-6 space-y-6 lg:space-y-8 animate-page pb-20">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl tracking-tight">Stock Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Multi-dimensional inventory analytics</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-muted/50 p-1 rounded-xl border border-foreground/30/50">
            <Button 
              variant={hideZeroRows ? "secondary" : "ghost"} 
              size="sm" 
              className="h-8 rounded-lg gap-1.5 text-xs uppercase tracking-wider"
              onClick={() => setHideZeroRows(!hideZeroRows)}
            >
              {hideZeroRows ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
              {hideZeroRows ? "Showing Active" : "Hide Empty"}
            </Button>
            <div className="w-[1px] h-4 bg-border mx-1" />
            <div className="flex items-center">
              {(["KG", "MTS", "LTR"] as Unit[]).map((u) => (
                <button
                  key={u}
                  onClick={() => setUnit(u)}
                  className={cn(
                    "px-3 py-1 text-xs uppercase tracking-wider transition-all rounded-lg",
                    unit === u ? "bg-primary text-primary-foreground shadow-lg" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {UNIT_LABELS[u]}
                </button>
              ))}
            </div>
          </div>
          <Button variant="outline" className="btn-press gap-2 rounded-xl border-2" onClick={fetchData} disabled={loading}>
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            Refresh
          </Button>
          <Button variant="outline" className="btn-press gap-2 rounded-xl border-2" onClick={exportToExcel} disabled={!data}>
            <Download className="h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* ── Summary & Insights ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="card-hover border-none bg-blue-50/50 dark:bg-blue-950/20 shadow-sm">
          <CardContent className="p-5 flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-wider text-blue-600 dark:text-blue-400">In Factory</p>
              <Factory className="h-4 w-4 text-blue-500" />
            </div>
            <h3 className="text-2xl font-bold">{data ? fmtLiters(tankInFactoryTotal, unit) : "—"}</h3>
            <p className="text-xs text-muted-foreground uppercase">{UNIT_LABELS[unit]} Volume</p>
          </CardContent>
        </Card>

        <Card className="card-hover border-none bg-amber-50/50 dark:bg-amber-950/20 shadow-sm">
          <CardContent className="p-5 flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-wider text-amber-600 dark:text-amber-400">Outside Factory</p>
              <PackageOpen className="h-4 w-4 text-amber-500" />
            </div>
            <h3 className="text-2xl font-bold">{data ? fmtNum(data.summary.outside_factory_total, unit) : "—"}</h3>
            <p className="text-xs text-muted-foreground uppercase">Logistical Stock</p>
          </CardContent>
        </Card>

        {/* Insight Badges */}
        <Card className="card-hover border-none bg-indigo-50/50 dark:bg-indigo-950/20 shadow-sm overflow-hidden relative group">
          <CardContent className="p-5 flex flex-col gap-1">
            <p className="text-xs uppercase tracking-wider text-indigo-600 dark:text-indigo-400">Top Item</p>
            {loading ? <Skeleton className="h-6 w-20" /> : (
              <h3 className="text-xl font-bold truncate">{insights?.topItem?.item_code ?? "—"}</h3>
            )}
            <div className="flex items-center gap-1.5">
              <Badge variant="outline" className="text-[10px] h-4 bg-white/50 dark:bg-black/20 border-none px-1.5">BY VOLUME</Badge>
            </div>
            <Info className="absolute -bottom-2 -right-2 h-12 w-12 text-indigo-500/10 group-hover:scale-110 transition-transform" />
          </CardContent>
        </Card>
      </div>

      {/* ── Table Matrix ── */}
      <Card className="border shadow-xl bg-card overflow-hidden">
        <CardHeader className="border-b bg-muted/30">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Inventory Matrix</CardTitle>
              <CardDescription className="text-xs">RM × Status × Vendor Pivot</CardDescription>
            </div>
            <div className="flex items-center gap-4 text-xs uppercase tracking-wider text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <div className="h-2 w-2 rounded-full bg-blue-500/20 border border-blue-500/50" />
                <span>Hover Row/Col to highlight</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-2 w-2 rounded-full bg-primary/40 shadow-[0_0_8px_rgba(var(--primary),0.4)]" />
                <span>Heatmap intensity</span>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-4">
              {Array.from({ length: 10 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent">
              <table className="w-full table-fixed text-base" style={{ borderCollapse: "separate", borderSpacing: 0 }}>
                <colgroup>
                  <col style={{ width: 190 }} />
                  {/* IN FACTORY + spacer */}
                  <col style={{ width: 120 }} />
                  <col style={{ width: 2 }} />
                  {/* OUTSIDE + spacer */}
                  <col style={{ width: 120 }} />
                  <col style={{ width: 2 }} />
                  {/* status group cols + inter-group spacers */}
                  {statusGroups.map((group, gi) => (
                    <Fragment key={group.status}>
                      {group.vendors.map(({ key }) => <col key={key} style={{ width: 145 }} />)}
                      {gi < statusGroups.length - 1 && <col style={{ width: 2 }} />}
                    </Fragment>
                  ))}
                  <col style={{ width: 170 }} />
                </colgroup>

                {/* ── SPACER HELPER ─────────────────────────── */}
                {/* reusable spacer cell styles applied inline below */}

                <thead>
                  {/* Row 1 — Status / column group headers */}
                  <tr className="bg-muted/40 border-b">
                    <th className="sticky left-0 z-30 bg-muted/60 backdrop-blur-md px-4 py-4 text-center uppercase tracking-wider border border-foreground/30 text-base" rowSpan={2}>
                      RM CODE
                    </th>
                    <th
                      onClick={() => navigate("/stock-dashboard/IN_FACTORY")}
                      onMouseEnter={() => setHoveredCol("IN_FACTORY")}
                      onMouseLeave={() => setHoveredCol(null)}
                      className={cn(
                        "px-2 py-3 text-center border border-foreground/30 cursor-pointer transition-colors group",
                        hoveredCol === "IN_FACTORY" ? "bg-green-50/60 dark:bg-green-900/20" : "bg-muted/20"
                      )}
                    >
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-green-600 text-base uppercase tracking-wider font-semibold">In Factory</span>
                        <ChevronRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-all text-green-500" />
                      </div>
                    </th>
                    {/* spacer */}
                    <th className="p-0 bg-white dark:bg-white border-x-0" rowSpan={2} />
                    <th
                      onClick={() => navigate("/stock-dashboard/OUT_SIDE_FACTORY")}
                      onMouseEnter={() => setHoveredCol("OUT_SIDE_FACTORY")}
                      onMouseLeave={() => setHoveredCol(null)}
                      className={cn(
                        "px-2 py-3 text-center border border-foreground/30 cursor-pointer transition-colors group",
                        hoveredCol === "OUT_SIDE_FACTORY" ? "bg-amber-50/60 dark:bg-amber-900/20" : "bg-muted/20"
                      )}
                    >
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-amber-600 text-base uppercase tracking-wider font-semibold">Outside</span>
                        <ChevronRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-all text-amber-500" />
                      </div>
                    </th>
                    {/* spacer */}
                    <th className="p-0 bg-white dark:bg-white border-x-0" rowSpan={2} />
                    {/* status groups */}
                    {statusGroups.map((group, gi) => {
                      return (
                        <Fragment key={group.status}>
                          <th
                            colSpan={group.vendors.length}
                            onClick={() => navigate(`/stock-dashboard/${group.status}`)}
                            onMouseEnter={() => setHoveredCol(group.status)}
                            onMouseLeave={() => setHoveredCol(null)}
                            className={cn(
                              "px-2 py-3 text-center border border-foreground/30 cursor-pointer transition-all hover:brightness-95 group text-base font-semibold uppercase tracking-wider bg-muted/20",
                              hoveredCol === group.status && "ring-2 ring-inset ring-primary/20 z-10 shadow-lg"
                            )}
                          >
                            <div className="flex items-center justify-center gap-1">
                              <span className="truncate">{group.status.replace(/_/g, " ")}</span>
                              <ChevronRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-all" />
                            </div>
                          </th>
                          {gi < statusGroups.length - 1 && (
                            <th className="p-0 bg-white dark:bg-white border-x-0" rowSpan={2} />
                          )}
                        </Fragment>
                      );
                    })}
                    <th className="px-4 py-3 text-center bg-muted/40 border border-foreground/30 uppercase tracking-wider text-base font-semibold" rowSpan={2}>
                      TOTAL
                    </th>
                  </tr>
                  {/* Row 2 — Vendor sub-headers */}
                  <tr className="border-b shadow-sm">
                    <th className="border border-foreground/30 bg-muted/20 py-1 text-sm text-center text-muted-foreground uppercase" />
                    <th className="border border-foreground/30 bg-muted/20 py-1 text-sm text-center text-muted-foreground uppercase" />
                    {statusGroups.map((group) => {
                      return group.vendors.map(({ key, vendor }) => (
                        <th
                          key={key}
                          title={vendor}
                          onMouseEnter={() => setHoveredCol(key)}
                          onMouseLeave={() => setHoveredCol(null)}
                          className={cn(
                            "px-2 py-2 text-center text-base font-semibold truncate transition-colors uppercase tracking-wider border border-foreground/30 bg-muted/20",
                            hoveredCol === key ? "brightness-90" : ""
                          )}
                        >
                          {vendor}
                        </th>
                      ));
                    })}
                  </tr>
                </thead>

                <tbody>
                  {displayItems.map((item) => {
                    const tankVal = tankQtyMap.get(item.item_code) ?? 0;
                    const grandTotal = convertFromLiters(tankVal, unit) + convertUnit(
                      item.outside_factory + colKeys.reduce((sum, k) => sum + (item.status_data[k] ?? 0), 0),
                      unit
                    );
                    return (
                      <tr
                        key={item.item_code}
                        onMouseEnter={() => setHoveredRow(item.item_code)}
                        onMouseLeave={() => setHoveredRow(null)}
                        className={cn(
                          "border-b transition-all group/row",
                          "bg-card",
                          hoveredRow === item.item_code ? "bg-muted/30 shadow-inner scale-[1.002] z-10 relative" : ""
                        )}
                      >
                        <td className={cn(
                          "sticky left-0 z-20 px-4 py-3 font-mono text-base text-center border border-foreground/30 transition-colors",
                          hoveredRow === item.item_code ? "bg-primary text-primary-foreground shadow-xl" : "bg-card"
                        )}>
                          {item.item_code}
                        </td>
                        {/* IN FACTORY */}
                        <td className={cn(
                          "px-2 py-3 text-center tabular-nums transition-all border border-foreground/30",
                          "bg-white"
                        )}>
                          {tankVal > 0
                            ? <span className="text-blue-600 dark:text-blue-400">{fmtLiters(tankVal, unit)}</span>
                            : <span className="opacity-20">·</span>}
                        </td>
                        {/* spacer */}
                        <td className="p-0 bg-white dark:bg-white border-x-0" />
                        {/* OUTSIDE */}
                        <td className={cn(
                          "px-2 py-3 text-center tabular-nums transition-all border border-foreground/30",
                          "bg-white"
                        )}>
                          {item.outside_factory > 0
                            ? <span className="text-amber-600 dark:text-amber-400">{fmtNum(item.outside_factory, unit)}</span>
                            : <span className="opacity-20">·</span>}
                        </td>
                        {/* spacer */}
                        <td className="p-0 bg-white dark:bg-white border-x-0" />
                        {/* status groups */}
                        {statusGroups.map((group, gi) => (
                          <Fragment key={group.status}>
                            {group.vendors.map(({ key }) => {
                              const val = item.status_data[key] ?? 0;
                              const intensity = maxCellValue > 0 ? val / maxCellValue : 0;
                              const status = key.split("__")[0];
                              return (
                                <td
                                  key={key}
                                  className={cn(
                                    "px-2 py-3 text-center tabular-nums transition-all relative group/cell border border-foreground/30",
                                    hoveredCol === key || hoveredCol === status ? "bg-muted/50" : ""
                                  )}
                                >
                                  {val > 0 ? (
                                    <>
                                      <div className="absolute inset-0 bg-primary pointer-events-none transition-opacity duration-500" style={{ opacity: intensity * 0.4 }} />
                                      <span className="relative z-10 group-hover/cell:scale-110 transition-transform inline-block">{fmtNum(val, unit)}</span>
                                    </>
                                  ) : <span className="opacity-20">·</span>}
                                </td>
                              );
                            })}
                            {gi < statusGroups.length - 1 && (
                              <td className="p-0 bg-white dark:bg-white border-x-0" />
                            )}
                          </Fragment>
                        ))}
                        <td className="px-4 py-3 text-center tabular-nums text-base font-semibold bg-muted/20 border border-foreground/30">
                          {Math.round(grandTotal).toLocaleString("en-IN")}
                        </td>
                      </tr>
                    );
                  })}

                  {/* Grand Total Row */}
                  <tr className="bg-muted/50 text-base border-t-2 border-border font-semibold">
                    <td className="sticky left-0 z-30 bg-muted/60 px-4 py-4 text-center border border-foreground/30 uppercase tracking-wider">Grand Total</td>
                    <td className="px-2 py-4 text-center tabular-nums border border-foreground/30 text-blue-600 dark:text-blue-400">
                      {fmtLiters(tankInFactoryTotal, unit)}
                    </td>
                    <td className="p-0 bg-white dark:bg-white border-x-0" />
                    <td className="px-2 py-4 text-center tabular-nums border border-foreground/30 text-amber-600 dark:text-amber-400">
                      {fmtNum(data?.totals.outside_factory ?? 0, unit)}
                    </td>
                    <td className="p-0 bg-white dark:bg-white border-x-0" />
                    {statusGroups.map((group, gi) => (
                      <Fragment key={group.status}>
                        {group.vendors.map(({ key }) => (
                          <td key={key} className="px-2 py-4 text-center tabular-nums border border-foreground/30">
                            {fmtNum(data?.totals.status_vendor_totals[key] ?? 0, unit)}
                          </td>
                        ))}
                        {gi < statusGroups.length - 1 && (
                          <td className="p-0 bg-white dark:bg-white border-x-0" />
                        )}
                      </Fragment>
                    ))}
                    <td className="px-4 py-4 text-center tabular-nums bg-primary text-primary-foreground font-bold border border-foreground/30">
                      {Math.round(
                        convertFromLiters(tankInFactoryTotal, unit) +
                        convertUnit(
                          (data?.totals.outside_factory ?? 0) +
                          colKeys.reduce((sum, k) => sum + (data?.totals.status_vendor_totals[k] ?? 0), 0),
                          unit
                        )
                      ).toLocaleString("en-IN")}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
