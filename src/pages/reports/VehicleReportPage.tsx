import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { RefreshCw, Truck, PackageOpen, BarChart3, AlertTriangle, TrendingUp } from "lucide-react";

import { getVehicleReport, getStockStatuses, type VehicleReport } from "@/api/stockStatus";

// ... rest of imports unchanged

// (I will provide the whole file or at least the relevant parts)
import { getErrorMessage } from "@/lib/errors";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

type StatusKey = "ON_THE_WAY" | "OUT_SIDE_FACTORY" | "UNDER_LOADING" | "IN_CONTRACT";

const TABS: { key: StatusKey; label: string; color: string; badge: string }[] = [
  {
    key: "ON_THE_WAY",
    label: "On The Way",
    color: "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800",
    badge: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  },
  {
    key: "OUT_SIDE_FACTORY",
    label: "Outside Factory",
    color: "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800",
    badge: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
  },
  {
    key: "UNDER_LOADING",
    label: "Under Loading",
    color: "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800",
    badge: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  },
  {
    key: "IN_CONTRACT",
    label: "In Contract",
    color: "bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800",
    badge: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300",
  },
];



function fmtMts(n: number) {
  return n.toLocaleString("en-IN", { minimumFractionDigits: 3, maximumFractionDigits: 3 });
}

type FlatRow = { vehicle_number: string } & VehicleReport["items"][number];

function flattenVehicles(vehicles: VehicleReport[]): FlatRow[] {
  return vehicles.flatMap((v) =>
    v.items.map((item) => ({ vehicle_number: v.vehicle_number, ...item }))
  );
}

function daysRemaining(eta: string | null): number | null {
  if (!eta) return null;
  const diff = new Date(eta).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0);
  return Math.round(diff / 86400000);
}

function fmtDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "—";
  const day = d.getDate();
  const ord = day === 1 || day === 21 || day === 31 ? "st"
            : day === 2 || day === 22 ? "nd"
            : day === 3 || day === 23 ? "rd"
            : "th";
  return `${day}${ord} ${d.toLocaleString("en-IN", { month: "long" })} ${d.getFullYear()}`;
}

export default function VehicleReportPage() {
  const [activeTab, setActiveTab] = useState<StatusKey>("ON_THE_WAY");
  const [data, setData] = useState<Record<StatusKey, VehicleReport[]>>({
    ON_THE_WAY: [],
    OUT_SIDE_FACTORY: [],
    UNDER_LOADING: [],
    IN_CONTRACT: [],
  });
  const [loading, setLoading] = useState<Record<StatusKey, boolean>>({
    ON_THE_WAY: true,
    OUT_SIDE_FACTORY: true,
    UNDER_LOADING: true,
    IN_CONTRACT: true,
  });

  async function fetchStatus(status: StatusKey) {
    setLoading((prev) => ({ ...prev, [status]: true }));
    try {
      let res: VehicleReport[];
      if (status === "IN_CONTRACT") {
        const stockStatuses = await getStockStatuses({ status: "IN_CONTRACT" });
        res = stockStatuses.map((s) => ({
        vehicle_number: s.vehicle_number || "—",
        items: [
        {
        item_code: s.item_code,
        item_name: s.item_name || s.item_code,
        vendor_name: s.vendor_name || s.vendor_code,
        total_quantity_in_litre: parseFloat(s.quantity_in_litre || "0"),
        total_quantity_in_mts: parseFloat(s.quantity) / 1000,
        eta: s.eta || null,
        status: s.status,
        job_work: s.job_work_vendor || null,
        },
        ],
        }));      } else {
        res = await getVehicleReport(status);
      }
      setData((prev) => ({ ...prev, [status]: res }));
    } catch (err) {
      toast.error(getErrorMessage(err, `Failed to load ${status} report`));
    } finally {
      setLoading((prev) => ({ ...prev, [status]: false }));
    }
  }

  useEffect(() => {
    TABS.forEach((t) => fetchStatus(t.key));
  }, []);

  function refreshAll() {
    TABS.forEach((t) => fetchStatus(t.key));
  }

  const tab = TABS.find((t) => t.key === activeTab)!;
  const vehicles = data[activeTab];
  const rows = flattenVehicles(vehicles);
  const isLoading = loading[activeTab];
  const totalMts = rows.reduce((s, r) => s + r.total_quantity_in_mts, 0);

  const insights = useMemo(() => {
    const allVehicles = TABS.flatMap((t) => data[t.key]);
    const totalVehicles = allVehicles.length;
    const allItems = flattenVehicles(allVehicles);
    const totalMtsAll = allItems.reduce((s, r) => s + r.total_quantity_in_mts, 0);
    const overdueCount = allItems.filter((r) => {
      const d = daysRemaining(r.eta);
      return d !== null && d < 0;
    }).length;
    const topTab = TABS.reduce((best, t) =>
      data[t.key].length > data[best.key].length ? t : best, TABS[0]
    );
    return { totalVehicles, totalMtsAll, overdueCount, topTab };
  }, [data]);

  return (
    <div className="p-3 sm:p-4 md:p-6 space-y-6 animate-page">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Vehicle Report</h1>
          <p className="text-sm text-muted-foreground">Live vehicle-wise stock movement by status</p>
        </div>
        <Button onClick={refreshAll} variant="outline" className="btn-press gap-2">
          <RefreshCw className="h-4 w-4" />
          Refresh All
        </Button>
      </div>

      {/* Insight cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-none bg-blue-50/60 dark:bg-blue-950/20 shadow-sm">
          <CardContent className="p-4 flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-wider text-blue-600 dark:text-blue-400">Total Vehicles</p>
              <Truck className="h-4 w-4 text-blue-500" />
            </div>
            {Object.values(loading).some(Boolean)
              ? <div className="h-8 w-16 bg-blue-200/50 dark:bg-blue-800/30 animate-pulse rounded mt-1" />
              : <h3 className="text-2xl font-bold">{insights.totalVehicles}</h3>}
            <p className="text-xs text-muted-foreground">across all statuses</p>
          </CardContent>
        </Card>

        <Card className="border-none bg-emerald-50/60 dark:bg-emerald-950/20 shadow-sm">
          <CardContent className="p-4 flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Total Quantity</p>
              <BarChart3 className="h-4 w-4 text-emerald-500" />
            </div>
            {Object.values(loading).some(Boolean)
              ? <div className="h-8 w-24 bg-emerald-200/50 dark:bg-emerald-800/30 animate-pulse rounded mt-1" />
              : <h3 className="text-2xl font-bold tabular-nums">{fmtMts(insights.totalMtsAll)} <span className="text-sm font-normal text-muted-foreground">MTS</span></h3>}
          </CardContent>
        </Card>

        <Card className={`border-none shadow-sm ${insights.overdueCount > 0 ? "bg-red-50/60 dark:bg-red-950/20" : "bg-green-50/60 dark:bg-green-950/20"}`}>
          <CardContent className="p-4 flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <p className={`text-xs uppercase tracking-wider ${insights.overdueCount > 0 ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"}`}>Overdue</p>
              <AlertTriangle className={`h-4 w-4 ${insights.overdueCount > 0 ? "text-red-500" : "text-green-500"}`} />
            </div>
            {Object.values(loading).some(Boolean)
              ? <div className="h-8 w-12 bg-muted/30 animate-pulse rounded mt-1" />
              : <h3 className="text-2xl font-bold">{insights.overdueCount}</h3>}
            <p className="text-xs text-muted-foreground">vehicles past ETA</p>
          </CardContent>
        </Card>

        <Card className="border-none bg-violet-50/60 dark:bg-violet-950/20 shadow-sm">
          <CardContent className="p-4 flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-wider text-violet-600 dark:text-violet-400">Busiest Status</p>
              <TrendingUp className="h-4 w-4 text-violet-500" />
            </div>
            {Object.values(loading).some(Boolean)
              ? <div className="h-8 w-28 bg-violet-200/50 dark:bg-violet-800/30 animate-pulse rounded mt-1" />
              : <h3 className="text-lg font-bold leading-tight">{insights.topTab.label}</h3>}
            <p className="text-xs text-muted-foreground">{data[insights.topTab.key].length} vehicles</p>
          </CardContent>
        </Card>
      </div>

      {/* Status tabs */}
      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => {
          const count = data[t.key].length;
          const isActive = activeTab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium transition-all",
                isActive
                  ? t.color + " shadow-sm"
                  : "bg-muted/30 text-muted-foreground border-border hover:border-foreground/30"
              )}
            >
              <Truck className="h-3.5 w-3.5" />
              {t.label}
              {!loading[t.key] && (
                <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 h-4", isActive && t.badge)}>
                  {count}
                </Badge>
              )}
            </button>
          );
        })}
      </div>

      {/* Table card */}
      <Card className={cn("border-2", tab.color)}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">{tab.label}</CardTitle>
              <CardDescription>
                {isLoading ? "Loading..." : `${vehicles.length} vehicles · ${fmtMts(totalMts)} MTS`}
              </CardDescription>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => fetchStatus(activeTab)} disabled={isLoading}>
              <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-2">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full rounded" />)}
            </div>
          ) : rows.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
              <PackageOpen className="h-10 w-10 stroke-1" />
              <p className="text-sm font-medium">No vehicles in this status</p>
            </div>
          ) : (
            <div className="rounded-b-xl overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">S.No</TableHead>
                    <TableHead>Vehicle No.</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead className="text-right">Qty (MTS)</TableHead>
                    <TableHead>Days</TableHead>
                    <TableHead>ETA</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r, idx) => (
                    <TableRow key={idx} className={idx % 2 === 0 ? "" : "bg-muted/20"}>
                      <TableCell className="text-muted-foreground">{idx + 1}</TableCell>
                      <TableCell>
                        <span className="font-mono text-sm bg-muted/50 px-2 py-0.5 rounded">
                          {r.vehicle_number || "—"}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm">{r.vendor_name || "—"}</TableCell>
                      <TableCell>{r.item_name}</TableCell>
                      <TableCell className="text-right tabular-nums">{fmtMts(r.total_quantity_in_mts)}</TableCell>
                      <TableCell className="tabular-nums">
                        {(() => {
                          const d = daysRemaining(r.eta);
                          if (d === null) return <span className="text-sm text-muted-foreground">—</span>;
                          return (
                            <span className={cn(
                              "text-sm font-medium",
                              d < 0 ? "text-red-600 dark:text-red-400" :
                              d <= 2 ? "text-orange-600 dark:text-orange-400" :
                              d <= 5 ? "text-yellow-600 dark:text-yellow-500" :
                              "text-green-600 dark:text-green-400"
                            )}>
                              {d < 0 ? `${Math.abs(d)}d overdue` : `${d}d`}
                            </span>
                          );
                        })()}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{fmtDate(r.eta)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <tfoot>
                  <tr className="border-t-2 bg-muted/40 font-medium">
                    <td colSpan={4} className="px-4 py-3 text-sm uppercase tracking-wider">Grand Total</td>
                    <td className="px-4 py-3 text-right tabular-nums text-sm">{fmtMts(totalMts)}</td>
                    <td colSpan={2} />
                  </tr>
                </tfoot>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
