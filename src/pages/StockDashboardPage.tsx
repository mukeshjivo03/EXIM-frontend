import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { RefreshCw, Factory, PackageOpen, Layers } from "lucide-react";

import { getStockDashboard, type StockDashboardResponse } from "@/api/dashboard";
import { getErrorMessage } from "@/lib/errors";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

type Unit = "KG" | "MTS" | "LTR";

const UNIT_LABELS: Record<Unit, string> = { KG: "KG", MTS: "MT", LTR: "Liters" };

/** Conversion factor from KG to target unit */
function convertUnit(kg: number, unit: Unit): number {
  if (unit === "MTS") return kg / 1000;
  if (unit === "LTR") return kg * 1.1; // approx oil density ~0.91 kg/L → 1 kg ≈ 1.1 L
  return kg;
}

function fmtNum(n: number, unit: Unit = "KG") {
  const val = convertUnit(n, unit);
  return val.toLocaleString("en-IN", {
    minimumFractionDigits: unit === "MTS" ? 2 : 0,
    maximumFractionDigits: unit === "MTS" ? 2 : 0,
  });
}

/* ── helpers ─────────────────────────────────────────────────── */

const STATUS_META: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive"; className: string }> = {
  IN_TRANSIT:  { label: "In Transit",  variant: "default",     className: "bg-blue-500 text-white border-blue-500" },
  PENDING:     { label: "Pending",     variant: "secondary",   className: "bg-amber-500 text-white border-amber-500" },
  PROCESSING:  { label: "Processing",  variant: "default",     className: "bg-purple-500 text-white border-purple-500" },
  COMPLETED:   { label: "Completed",   variant: "default",     className: "bg-green-500 text-white border-green-500" },
  DELIVERED:   { label: "Delivered",   variant: "default",     className: "bg-teal-500 text-white border-teal-500" },
};

function StatusBadge({ status }: { status: string }) {
  const meta = STATUS_META[status];
  if (!meta) return <Badge variant="outline" className="text-xs px-2 py-0.5">{status}</Badge>;
  return (
    <Badge className={`text-xs px-2 py-0.5 font-semibold ${meta.className}`}>
      {meta.label}
    </Badge>
  );
}

/* ── component ────────────────────────────────────────────────── */

export default function StockDashboardPage() {
  const [data, setData] = useState<StockDashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [unit, setUnit] = useState<Unit>("KG");

  async function fetchData() {
    setLoading(true);
    try {
      const res = await getStockDashboard();
      setData(res);
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to load stock dashboard"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, []);

  /* Derive ordered column keys from totals (preserves server order) */
  const colKeys = useMemo(() => (data ? Object.keys(data.totals.status_vendor_totals) : []), [data]);

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
            {loading ? <Skeleton className="h-8 w-24" /> : <p className="text-2xl font-bold">{data ? `${fmtNum(data.summary.in_factory_total, unit)} ${UNIT_LABELS[unit]}` : "—"}</p>}
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
          <div className="overflow-x-auto border-y shadow-sm">
              <table className="w-full text-base">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="sticky left-0 z-10 bg-muted/40 px-5 py-4 text-left font-bold whitespace-nowrap border-r text-base">
                      Item Code
                    </th>
                    <th className="px-5 py-4 text-right font-bold whitespace-nowrap border-r text-base">
                      In Factory
                    </th>
                    <th className="px-5 py-4 text-right font-bold whitespace-nowrap border-r text-base">
                      Outside Factory
                    </th>
                    {colKeys.map((key) => {
                      const [status, vendor] = key.split("__");
                      return (
                        <th key={key} className="px-5 py-3 text-center font-medium border-r last:border-r-0 min-w-[180px]">
                          <div className="flex flex-col items-center gap-1.5">
                            <StatusBadge status={status} />
                            <span className="text-xs text-muted-foreground font-normal leading-snug max-w-[160px] truncate" title={vendor}>
                              {vendor}
                            </span>
                          </div>
                        </th>
                      );
                    })}
                    <th className="px-5 py-4 text-right font-bold whitespace-nowrap border-l bg-muted/60 text-base">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((item, idx) => (
                    <tr
                      key={item.item_code}
                      className={`border-b transition-colors hover:bg-accent/30 ${idx % 2 === 0 ? "" : "bg-muted/20"}`}
                    >
                      <td className="sticky left-0 z-10 px-5 py-4 font-mono font-semibold whitespace-nowrap border-r bg-card text-base">
                        {item.item_code}
                      </td>
                      <td className="px-5 py-4 text-right tabular-nums border-r text-base">
                        {item.in_factory > 0 ? (
                          <span className="text-blue-600 dark:text-blue-400 font-semibold">{fmtNum(item.in_factory, unit)}</span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-right tabular-nums border-r text-base">
                        {item.outside_factory > 0 ? (
                          <span className="text-amber-600 dark:text-amber-400 font-semibold">{fmtNum(item.outside_factory, unit)}</span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      {colKeys.map((key) => {
                        const val = item.status_data[key] ?? 0;
                        return (
                          <td key={key} className="px-5 py-4 text-right tabular-nums border-r last:border-r-0 text-base">
                            {val > 0 ? (
                              <span className="font-semibold">{fmtNum(val, unit)}</span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                        );
                      })}
                      <td className="px-5 py-4 text-right tabular-nums font-bold border-l bg-muted/20 text-base">
                        {fmtNum(item.total, unit)}
                      </td>
                    </tr>
                  ))}

                  {/* Totals row */}
                  <tr className="border-t-2 bg-muted/40 font-bold text-base">
                    <td className="sticky left-0 z-10 px-5 py-4 whitespace-nowrap border-r bg-muted/40">
                      Total
                    </td>
                    <td className="px-5 py-4 text-right tabular-nums border-r text-blue-600 dark:text-blue-400">
                      {fmtNum(data.totals.in_factory, unit)}
                    </td>
                    <td className="px-5 py-4 text-right tabular-nums border-r text-amber-600 dark:text-amber-400">
                      {fmtNum(data.totals.outside_factory, unit)}
                    </td>
                    {colKeys.map((key) => (
                      <td key={key} className="px-5 py-4 text-right tabular-nums border-r last:border-r-0">
                        {fmtNum(data.totals.status_vendor_totals[key] ?? 0, unit)}
                      </td>
                    ))}
                    <td className="px-5 py-4 text-right tabular-nums font-bold border-l bg-muted/60 text-primary text-lg">
                      {fmtNum(data.totals.grand_total, unit)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
      </div>
    </div>
  );
}
