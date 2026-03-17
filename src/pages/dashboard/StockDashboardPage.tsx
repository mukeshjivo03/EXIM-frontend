import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { RefreshCw, Factory, PackageOpen, Layers } from "lucide-react";

import { getStockDashboard, type StockDashboardResponse } from "@/api/dashboard";
import { getItemWiseTankSummary, type ItemWiseTankSummary } from "@/api/tank";
import { getErrorMessage } from "@/lib/errors";
import { Button } from "@/components/ui/button";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

type Unit = "KG" | "MTS" | "LTR";

const UNIT_LABELS: Record<Unit, string> = { KG: "KG", MTS: "MTS", LTR: "Liters" };

/** Conversion factor from KG to target unit */
function convertUnit(kg: number, unit: Unit): number {
  if (unit === "MTS") return kg / 1000;
  if (unit === "LTR") return kg / 0.910; // oil density 0.910 kg/L
  return kg;
}


function fmtNum(n: number, unit: Unit = "KG") {
  const val = convertUnit(n, unit);
  const decimals = unit === "MTS" ? 3 : unit === "LTR" ? 2 : 2;
  return val.toLocaleString("en-IN", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/** Convert liters to the selected display unit */
function convertFromLiters(liters: number, unit: Unit): number {
  if (unit === "KG") return liters * 0.910;
  if (unit === "MTS") return (liters * 0.910) / 1000;
  return liters; // LTR
}

function fmtLiters(n: number, unit: Unit) {
  const val = convertFromLiters(n, unit);
  const decimals = unit === "MTS" ? 3 : unit === "LTR" ? 2 : 2;
  return val.toLocaleString("en-IN", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}


/* ── helpers ─────────────────────────────────────────────────── */

const STATUS_META: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive"; className: string; headerBg: string }> = {
  IN_FACTORY:      { label: "In Factory",      variant: "default",   className: "bg-green-500 text-white border-green-500",  headerBg: "bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-200" },
  OUT_SIDE_FACTORY:{ label: "Outside Factory", variant: "default",   className: "bg-green-500 text-white border-green-500",  headerBg: "bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-200" },
  ON_THE_WAY:      { label: "On The Way",      variant: "default",   className: "bg-yellow-500 text-white border-yellow-500",headerBg: "bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-200" },
  UNDER_LOADING:   { label: "Under Loading",   variant: "default",   className: "bg-yellow-500 text-white border-yellow-500",headerBg: "bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-200" },
  AT_REFINERY:     { label: "At Refinery",     variant: "default",   className: "bg-pink-500 text-white border-pink-500",    headerBg: "bg-pink-100 dark:bg-pink-900/40 text-pink-800 dark:text-pink-200" },
  OTW_TO_REFINERY: { label: "OTW to Refinery", variant: "default",   className: "bg-pink-500 text-white border-pink-500",    headerBg: "bg-pink-100 dark:bg-pink-900/40 text-pink-800 dark:text-pink-200" },
  ON_THE_SEA:      { label: "On The Sea",      variant: "default",   className: "bg-blue-500 text-white border-blue-500",    headerBg: "bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200" },
  IN_CONTRACT:     { label: "In Contract",     variant: "default",   className: "bg-indigo-500 text-white border-indigo-500",headerBg: "bg-indigo-100 dark:bg-indigo-900/40 text-indigo-800 dark:text-indigo-200" },
  KANDLA_STORAGE:  { label: "Kandla Storage",  variant: "default",   className: "bg-orange-500 text-white border-orange-500",headerBg: "bg-orange-100 dark:bg-orange-900/40 text-orange-800 dark:text-orange-200" },
  MUNDRA_PORT:     { label: "Mundra Port",     variant: "default",   className: "bg-orange-500 text-white border-orange-500",headerBg: "bg-orange-100 dark:bg-orange-900/40 text-orange-800 dark:text-orange-200" },
  IN_TRANSIT:      { label: "In Transit",      variant: "default",   className: "bg-blue-500 text-white border-blue-500",    headerBg: "bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200" },
  PENDING:         { label: "Pending",         variant: "secondary", className: "bg-amber-500 text-white border-amber-500",  headerBg: "bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200" },
  PROCESSING:      { label: "Processing",      variant: "default",   className: "bg-purple-500 text-white border-purple-500",headerBg: "bg-purple-100 dark:bg-purple-900/40 text-purple-800 dark:text-purple-200" },
  COMPLETED:       { label: "Completed",       variant: "default",   className: "bg-green-500 text-white border-green-500",  headerBg: "bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-200" },
  DELIVERED:       { label: "Delivered",        variant: "default",   className: "bg-teal-500 text-white border-teal-500",    headerBg: "bg-teal-100 dark:bg-teal-900/40 text-teal-800 dark:text-teal-200" },
};

/* ── component ────────────────────────────────────────────────── */

export default function StockDashboardPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<StockDashboardResponse | null>(null);
  const [tankSummary, setTankSummary] = useState<ItemWiseTankSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [unit, setUnit] = useState<Unit>("KG");

  // Map item_code → quantity in liters from tank data
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

  /* Derive ordered column keys, excluding COMPLETED status */
  const colKeys = useMemo(
    () =>
      data
        ? Object.keys(data.totals.status_vendor_totals).filter(
            (key) => !key.startsWith("COMPLETED__")
          )
        : [],
    [data]
  );

  /* Group colKeys by status for spanning headers */
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

  return (
    <div className="p-6 space-y-6 animate-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Stock Dashboard</h1>
          <p className="text-sm text-muted-foreground">Overview of raw material stock across statuses and vendors</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center border rounded-md overflow-hidden">
            {(["KG", "MTS", "LTR"] as Unit[]).map((u) => (
              <button
                key={u}
                onClick={() => setUnit(u)}
                className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                  unit === u
                    ? "bg-primary text-primary-foreground"
                    : "bg-background hover:bg-muted text-muted-foreground"
                }`}
              >
                {UNIT_LABELS[u]}
              </button>
            ))}
          </div>
          <Button variant="outline" className="btn-press gap-2" onClick={fetchData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* ── Summary Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="card-hover">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">In Factory</CardTitle>
            <div className="rounded-md bg-blue-50 dark:bg-blue-900/50 p-2">
              <Factory className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-8 w-24" /> : <p className="text-2xl font-bold">{data ? `${fmtLiters(tankInFactoryTotal, unit)} ${UNIT_LABELS[unit]}` : "—"}</p>}
          </CardContent>
        </Card>
        <Card className="card-hover">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Outside Factory</CardTitle>
            <div className="rounded-md bg-amber-50 dark:bg-amber-900/50 p-2">
              <PackageOpen className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-8 w-24" /> : <p className="text-2xl font-bold">{data ? `${fmtNum(data.summary.outside_factory_total, unit)} ${UNIT_LABELS[unit]}` : "—"}</p>}
          </CardContent>
        </Card>
        <Card className="card-hover">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Items</CardTitle>
            <div className="rounded-md bg-green-50 dark:bg-green-900/50 p-2">
              <Layers className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-8 w-24" /> : <p className="text-2xl font-bold">{data ? `${data.summary.active_items} item codes` : "—"}</p>}
          </CardContent>
        </Card>
      </div>

      {/* ── Detail Table ── */}
      <div className="-mx-6">
        <div className="px-6 mb-3">
          <h2 className="text-lg font-bold">Stock Detail — Item × Status × Vendor</h2>
          <p className="text-sm text-muted-foreground">Quantities per item broken down by status and vendor. Grand total shown in the last column.</p>
        </div>
        {loading ? (
          <div className="px-6 space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : !data || data.items.length === 0 ? (
          <div className="mx-6 flex items-center justify-center h-40 text-muted-foreground text-sm border rounded-md">
            No stock data available
          </div>
        ) : (
          <div className="border-y shadow-sm overflow-x-auto">
              <table className="w-full table-fixed text-xs">
                <colgroup>
                  <col style={{ width: 110 }} />
                  <col style={{ width: `${90 / (colKeys.length + 3)}%` }} />
                  <col style={{ width: `${90 / (colKeys.length + 3)}%` }} />
                  {colKeys.map((k) => <col key={k} style={{ width: `${90 / (colKeys.length + 3)}%` }} />)}
                  <col style={{ width: 72 }} />
                </colgroup>
                <thead>
                  {/* Row 1: Status group headers */}
                  <tr className="border-b">
                    <th rowSpan={2} className="sticky left-0 z-10 bg-muted/40 px-2 py-2 text-left font-bold border-r text-xs">
                      Item Code
                    </th>
                    <th rowSpan={2} onClick={() => navigate("/stock-dashboard/IN_FACTORY")} className="px-1 py-2 text-center font-bold border-r text-xs bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-200 cursor-pointer hover:brightness-95 select-none leading-tight">
                      In<br/>Factory
                    </th>
                    <th rowSpan={2} onClick={() => navigate("/stock-dashboard/OUT_SIDE_FACTORY")} className="px-1 py-2 text-center font-bold border-r text-xs bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-200 cursor-pointer hover:brightness-95 select-none leading-tight">
                      Outside<br/>Factory
                    </th>
                    {statusGroups.map((group) => {
                      const meta = STATUS_META[group.status];
                      const headerBg = meta?.headerBg ?? "bg-muted/40";
                      const label = meta?.label ?? group.status.replace(/_/g, " ");
                      return (
                        <th
                          key={group.status}
                          colSpan={group.vendors.length}
                          onClick={() => navigate(`/stock-dashboard/${group.status}`)}
                          className={`px-1 py-2 text-center font-bold border-r text-xs cursor-pointer hover:brightness-95 select-none leading-tight ${headerBg}`}
                        >
                          {label.toUpperCase()}
                        </th>
                      );
                    })}
                    <th rowSpan={2} className="px-1 py-2 text-center font-bold border-l bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200 text-xs">
                      TOTAL
                    </th>
                  </tr>
                  {/* Row 2: Vendor sub-headers */}
                  <tr className="border-b bg-muted/20">
                    {statusGroups.map((group) =>
                      group.vendors.map(({ key, vendor }) => (
                        <th key={key} title={vendor} className="px-2 py-2 text-center font-medium border-r last:border-r-0 text-xs text-muted-foreground overflow-hidden">
                          <span className="block truncate">{vendor}</span>
                        </th>
                      ))
                    )}
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((item, idx) => (
                    <tr
                      key={item.item_code}
                      className={`border-b transition-colors hover:bg-accent/30 ${idx % 2 === 0 ? "" : "bg-muted/20"}`}
                    >
                      <td className="sticky left-0 z-10 px-2 py-1.5 font-mono font-semibold truncate border-r bg-card text-xs">
                        {item.item_code}
                      </td>
                      <td className="px-1 py-1.5 text-center tabular-nums border-r text-xs" title={fmtLiters(tankQtyMap.get(item.item_code) ?? 0, unit)}>
                        {(tankQtyMap.get(item.item_code) ?? 0) > 0 ? (
                          <span className="text-blue-600 dark:text-blue-400 font-semibold">{fmtLiters(tankQtyMap.get(item.item_code) ?? 0, unit)}</span>
                        ) : (
                          <span className="text-muted-foreground/40">·</span>
                        )}
                      </td>
                      <td className="px-1 py-1.5 text-center tabular-nums border-r text-xs" title={fmtNum(item.outside_factory, unit)}>
                        {item.outside_factory > 0 ? (
                          <span className="text-amber-600 dark:text-amber-400 font-semibold">{fmtNum(item.outside_factory, unit)}</span>
                        ) : (
                          <span className="text-muted-foreground/40">·</span>
                        )}
                      </td>
                      {colKeys.map((key) => {
                        const val = item.status_data[key] ?? 0;
                        return (
                          <td key={key} className="px-1 py-1.5 text-center tabular-nums border-r last:border-r-0 text-xs" title={val > 0 ? fmtNum(val, unit) : undefined}>
                            {val > 0 ? (
                              <span className="font-semibold">{fmtNum(val, unit)}</span>
                            ) : (
                              <span className="text-muted-foreground/40">·</span>
                            )}
                          </td>
                        );
                      })}
                      {(() => {
                        const tankVal = convertFromLiters(tankQtyMap.get(item.item_code) ?? 0, unit);
                        const restVal = convertUnit(item.outside_factory + colKeys.reduce((sum, k) => sum + (item.status_data[k] ?? 0), 0), unit);
                        const total = tankVal + restVal;
                        const decimals = unit === "MTS" ? 3 : 2;
                        const formatted = total.toLocaleString("en-IN", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
                        return (
                          <td className="px-1 py-1.5 text-center tabular-nums font-bold border-l bg-muted/20 text-xs" title={formatted}>
                            {formatted}
                          </td>
                        );
                      })()}
                    </tr>
                  ))}

                  {/* Totals row */}
                  <tr className="border-t-2 bg-muted/40 font-bold text-xs">
                    <td className="sticky left-0 z-10 px-2 py-1.5 border-r bg-muted/40">Total</td>
                    <td className="px-1 py-1.5 text-center tabular-nums border-r text-blue-600 dark:text-blue-400" title={fmtLiters(tankInFactoryTotal, unit)}>
                      {fmtLiters(tankInFactoryTotal, unit)}
                    </td>
                    <td className="px-1 py-1.5 text-center tabular-nums border-r text-amber-600 dark:text-amber-400" title={fmtNum(data.totals.outside_factory, unit)}>
                      {fmtNum(data.totals.outside_factory, unit)}
                    </td>
                    {colKeys.map((key) => (
                      <td key={key} className="px-1 py-1.5 text-center tabular-nums border-r last:border-r-0" title={fmtNum(data.totals.status_vendor_totals[key] ?? 0, unit)}>
                        {fmtNum(data.totals.status_vendor_totals[key] ?? 0, unit)}
                      </td>
                    ))}
                    {(() => {
                      const tankVal = convertFromLiters(tankInFactoryTotal, unit);
                      const restVal = convertUnit(data.totals.outside_factory + colKeys.reduce((sum, k) => sum + (data.totals.status_vendor_totals[k] ?? 0), 0), unit);
                      const total = tankVal + restVal;
                      const decimals = unit === "MTS" ? 3 : 2;
                      const formatted = total.toLocaleString("en-IN", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
                      return (
                        <td className="px-1 py-1.5 text-center tabular-nums font-bold border-l bg-muted/60 text-primary" title={formatted}>
                          {formatted}
                        </td>
                      );
                    })()}
                  </tr>
                </tbody>
              </table>
            </div>
          )}
      </div>
    </div>
  );
}
