import { useEffect, useState } from "react";
import { toast } from "sonner";
import { RefreshCw, Truck, PackageOpen } from "lucide-react";

import { getVehicleReport, type VehicleReport } from "@/api/stockStatus";
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

function fmtLtr(n: number) {
  return n.toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

function fmtMts(n: number) {
  return (n / 1098.9).toLocaleString("en-IN", { minimumFractionDigits: 3, maximumFractionDigits: 3 });
}

function daysRemaining(eta: string | null): number | null {
  if (!eta) return null;
  const diff = new Date(eta).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0);
  return Math.round(diff / 86400000);
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
      const res = await getVehicleReport(status);
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
  const rows = data[activeTab];
  const isLoading = loading[activeTab];
  const totalLtr = rows.reduce((s, r) => s + r.quantity_in_litre, 0);

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
                {isLoading ? "Loading..." : `${rows.length} vehicles · ${fmtLtr(totalLtr)} LTR · ${fmtMts(totalLtr)} MTS`}
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
                    <TableHead>Item</TableHead>
                    <TableHead className="text-right">Qty (LTR)</TableHead>
                    <TableHead className="text-right">Qty (MTS)</TableHead>
                    <TableHead>Days</TableHead>
                    <TableHead>ETA</TableHead>
                    <TableHead>Refinery</TableHead>
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
                      <TableCell>{r.item_name}</TableCell>
                      <TableCell className="text-right tabular-nums">{fmtLtr(r.quantity_in_litre)}</TableCell>
                      <TableCell className="text-right tabular-nums">{fmtMts(r.quantity_in_litre)}</TableCell>
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
                      <TableCell className="text-sm text-muted-foreground">{r.eta ?? "—"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{r.job_work ?? "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <tfoot>
                  <tr className="border-t-2 bg-muted/40 font-medium">
                    <td colSpan={3} className="px-4 py-3 text-sm uppercase tracking-wider">Grand Total</td>
                    <td className="px-4 py-3 text-right tabular-nums text-sm">{fmtLtr(totalLtr)}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-sm">{fmtMts(totalLtr)}</td>
                    <td colSpan={3} />
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
