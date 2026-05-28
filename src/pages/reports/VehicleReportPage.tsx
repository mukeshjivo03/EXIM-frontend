import { Fragment, useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import { RefreshCw, Truck, PackageOpen, BarChart3, AlertTriangle, TrendingUp, ChevronDown, FileDown } from "lucide-react";

import { getVehicleReport, getStockStatuses, type VehicleReport } from "@/api/stockStatus";
import { getErrorMessage } from "@/lib/errors";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
  const [y, m, d] = eta.split("-").map(Number);
  const etaDate = new Date(y, m - 1, d);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((etaDate.getTime() - today.getTime()) / 86400000);
}

function fmtDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "-";
  const day = d.getDate();
  const ord = day === 1 || day === 21 || day === 31 ? "st"
    : day === 2 || day === 22 ? "nd"
    : day === 3 || day === 23 ? "rd"
    : "th";
  return `${day}${ord} ${d.toLocaleString("en-IN", { month: "long" })} ${d.getFullYear()}`;
}

function fmtRate(rate?: number | null): string {
  if (rate === null || rate === undefined || Number.isNaN(Number(rate))) return "-";
  return Number(rate).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function excelDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-IN");
}

function autosizeColumns(rows: Record<string, unknown>[]) {
  if (rows.length === 0) return [];
  const keys = Object.keys(rows[0]);
  return keys.map((key) => ({
    wch: Math.min(
      Math.max(
        key.length,
        ...rows.map((row) => String(row[key] ?? "").length)
      ) + 2,
      40
    ),
  }));
}

function buildExcelRows(statusLabel: string, vehicles: VehicleReport[]) {
  return vehicles.flatMap((vehicle, vehicleIndex) =>
    vehicle.items.map((item, itemIndex) => {
      const days = daysRemaining(item.eta);
      return {
        "S.No": `${vehicleIndex + 1}${vehicle.items.length > 1 ? `.${itemIndex + 1}` : ""}`,
        Status: statusLabel,
        "Vehicle No.": vehicle.vehicle_number || "-",
        Transporter: vehicle.transporter || "-",
        "Vendor Code": item.vendor_code || "-",
        Vendor: item.vendor_name || "-",
        "Item Code": item.item_code || "-",
        Item: item.item_name || "-",
        Rate: item.rate ?? "",
        "Qty (Litre)": item.total_quantity_in_litre,
        "Qty (MTS)": item.total_quantity_in_mts,
        "Days Remaining": days ?? "",
        ETA: excelDate(item.eta),
        "Job Work": item.job_work || "-",
      };
    })
  );
}

function appendJsonSheet(workbook: XLSX.WorkBook, name: string, rows: Record<string, unknown>[]) {
  const fallbackRows = [{ Message: "No data" }];
  const sheetRows = rows.length > 0 ? rows : fallbackRows;
  const sheet = XLSX.utils.json_to_sheet(sheetRows);
  sheet["!cols"] = autosizeColumns(sheetRows);
  XLSX.utils.book_append_sheet(workbook, sheet, name.slice(0, 31));
}

export default function VehicleReportPage() {
  const [activeTab, setActiveTab] = useState<StatusKey>("ON_THE_WAY");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  function toggleExpand(vehicleKey: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(vehicleKey)) next.delete(vehicleKey);
      else next.add(vehicleKey);
      return next;
    });
  }

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
          vehicle_number: s.vehicle_number || "-",
          transporter: s.transporter || null,
          items: [
            {
              item_code: s.item_code,
              item_name: s.item_name || s.item_code,
              vendor_code: s.vendor_code,
              vendor_name: s.vendor_name || s.vendor_code,
              total_quantity_in_litre: parseFloat(s.quantity_in_litre || "0"),
              total_quantity_in_mts: parseFloat(s.quantity) / 1000,
              eta: s.eta || null,
              status: s.status,
              job_work: s.job_work_vendor || null,
              rate: Number.parseFloat(s.rate || "0"),
            },
          ],
        }));
      } else {
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

  function downloadExcel() {
    const workbook = XLSX.utils.book_new();
    const generatedOn = new Date().toLocaleString("en-IN");

    const summaryRows = TABS.map((t) => {
      const items = flattenVehicles(data[t.key]);
      return {
        Status: t.label,
        Vehicles: data[t.key].length,
        Items: items.length,
        "Qty (MTS)": items.reduce((sum, row) => sum + row.total_quantity_in_mts, 0),
        "Overdue Items": items.filter((row) => {
          const days = daysRemaining(row.eta);
          return days !== null && days < 0;
        }).length,
        "Generated On": generatedOn,
      };
    });

    appendJsonSheet(workbook, "Summary", summaryRows);

    TABS.forEach((t) => {
      appendJsonSheet(workbook, t.label, buildExcelRows(t.label, data[t.key]));
    });

    const allRows = TABS.flatMap((t) => buildExcelRows(t.label, data[t.key]));
    appendJsonSheet(workbook, "All Vehicles", allRows);

    XLSX.writeFile(workbook, `vehicle-report-${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast.success("Vehicle report Excel downloaded");
  }

  const tab = TABS.find((t) => t.key === activeTab)!;
  const rawVehicles = data[activeTab];
  const rows = flattenVehicles(rawVehicles);

  const sortedVehicles = useMemo(() => {
    return [...rawVehicles].sort((a, b) => {
      const worstA = Math.min(...a.items.map((i) => daysRemaining(i.eta) ?? Infinity));
      const worstB = Math.min(...b.items.map((i) => daysRemaining(i.eta) ?? Infinity));
      if (worstA === Infinity && worstB === Infinity) return 0;
      if (worstA === Infinity) return 1;
      if (worstB === Infinity) return -1;
      return worstA - worstB;
    });
  }, [rawVehicles]);

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
    <div className="p-2.5 sm:p-4 md:p-6 space-y-5 sm:space-y-6 animate-page">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight">Vehicle Report</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">Live vehicle-wise stock movement by status</p>
        </div>
        <div className="flex w-full flex-wrap items-center justify-start sm:justify-end gap-2 sm:gap-3">
          <Button
            onClick={downloadExcel}
            variant="outline"
            className="btn-press h-8 sm:h-9 gap-1.5 sm:gap-2 px-2.5 sm:px-3 rounded-lg sm:rounded-xl border-2 text-[10px] sm:text-xs"
            disabled={Object.values(loading).some(Boolean)}
          >
            <FileDown className="h-4 w-4" />
            Download Excel
          </Button>
          <Button onClick={refreshAll} variant="outline" className="btn-press h-8 sm:h-9 gap-1.5 sm:gap-2 px-2.5 sm:px-3 rounded-lg sm:rounded-xl border-2 text-[10px] sm:text-xs">
            <RefreshCw className="h-4 w-4" />
            Refresh All
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        <Card className="border-none bg-blue-50/60 dark:bg-blue-950/20 shadow-sm">
          <CardContent className="p-3 sm:p-4 flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <p className="text-[10px] sm:text-xs uppercase tracking-wide sm:tracking-wider text-blue-600 dark:text-blue-400">Total Vehicles</p>
              <Truck className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-500" />
            </div>
            {Object.values(loading).some(Boolean)
              ? <div className="h-8 w-16 bg-blue-200/50 dark:bg-blue-800/30 animate-pulse rounded mt-1" />
              : <h3 className="text-base sm:text-2xl font-bold leading-tight">{insights.totalVehicles}</h3>}
            <p className="text-[9px] sm:text-xs text-muted-foreground">across all statuses</p>
          </CardContent>
        </Card>

        <Card className="border-none bg-emerald-50/60 dark:bg-emerald-950/20 shadow-sm">
          <CardContent className="p-3 sm:p-4 flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <p className="text-[10px] sm:text-xs uppercase tracking-wide sm:tracking-wider text-emerald-600 dark:text-emerald-400">Total Quantity</p>
              <BarChart3 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-emerald-500" />
            </div>
            {Object.values(loading).some(Boolean)
              ? <div className="h-8 w-24 bg-emerald-200/50 dark:bg-emerald-800/30 animate-pulse rounded mt-1" />
              : <h3 className="text-base sm:text-2xl font-bold tabular-nums leading-tight">{fmtMts(insights.totalMtsAll)} <span className="text-[10px] sm:text-sm font-normal text-muted-foreground">MTS</span></h3>}
          </CardContent>
        </Card>

        <Card className={`border-none shadow-sm ${insights.overdueCount > 0 ? "bg-red-50/60 dark:bg-red-950/20" : "bg-green-50/60 dark:bg-green-950/20"}`}>
          <CardContent className="p-3 sm:p-4 flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <p className={`text-[10px] sm:text-xs uppercase tracking-wide sm:tracking-wider ${insights.overdueCount > 0 ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"}`}>Overdue</p>
              <AlertTriangle className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${insights.overdueCount > 0 ? "text-red-500" : "text-green-500"}`} />
            </div>
            {Object.values(loading).some(Boolean)
              ? <div className="h-8 w-12 bg-muted/30 animate-pulse rounded mt-1" />
              : <h3 className="text-base sm:text-2xl font-bold leading-tight">{insights.overdueCount}</h3>}
            <p className="text-[9px] sm:text-xs text-muted-foreground">vehicles past ETA</p>
          </CardContent>
        </Card>

        <Card className="border-none bg-violet-50/60 dark:bg-violet-950/20 shadow-sm">
          <CardContent className="p-3 sm:p-4 flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <p className="text-[10px] sm:text-xs uppercase tracking-wide sm:tracking-wider text-violet-600 dark:text-violet-400">Busiest Status</p>
              <TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-violet-500" />
            </div>
            {Object.values(loading).some(Boolean)
              ? <div className="h-8 w-28 bg-violet-200/50 dark:bg-violet-800/30 animate-pulse rounded mt-1" />
              : <h3 className="text-sm sm:text-lg font-bold leading-tight">{insights.topTab.label}</h3>}
            <p className="text-[9px] sm:text-xs text-muted-foreground">{data[insights.topTab.key].length} vehicles</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => {
          const count = data[t.key].length;
          const isActive = activeTab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={cn(
                "flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl border text-[10px] sm:text-sm font-medium transition-all",
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

      <Card className={cn("border-2", tab.color)}>
        <CardHeader className="pb-2.5 sm:pb-3 px-4 sm:px-6">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm sm:text-base">{tab.label}</CardTitle>
              <CardDescription className="text-[10px] sm:text-xs">
                {isLoading ? "Loading..." : `${sortedVehicles.length} vehicles · ${fmtMts(totalMts)} MTS`}
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
          ) : sortedVehicles.length === 0 ? (
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
                    <TableHead>Transporter</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead className="text-right">Rate</TableHead>
                    <TableHead className="text-right">Qty (MTS)</TableHead>
                    <TableHead>Days</TableHead>
                    <TableHead>ETA</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedVehicles.map((v, vIdx) => {
                    const isMulti = v.items.length > 1;
                    const vehicleKey = `${v.vehicle_number}-${vIdx}`;
                    const isOpen = expanded.has(vehicleKey);
                    const vehicleTotalMts = v.items.reduce((s, i) => s + i.total_quantity_in_mts, 0);
                    const worstEta = v.items.reduce<string | null>((worst, i) => {
                      if (!i.eta) return worst;
                      if (!worst) return i.eta;
                      return new Date(i.eta) < new Date(worst) ? i.eta : worst;
                    }, null);
                    const worstDays = daysRemaining(worstEta);

                    const daysCell = (
                      <TableCell className="tabular-nums">
                        {(() => {
                          if (worstDays === null) return <span className="text-sm text-muted-foreground">-</span>;
                          return (
                            <span className={cn(
                              "text-sm font-medium",
                              worstDays < 0 ? "text-red-600 dark:text-red-400" :
                              worstDays <= 2 ? "text-orange-600 dark:text-orange-400" :
                              worstDays <= 5 ? "text-yellow-600 dark:text-yellow-500" :
                              "text-green-600 dark:text-green-400"
                            )}>
                              {worstDays < 0 ? `${Math.abs(worstDays)}d overdue` : `${worstDays}d`}
                            </span>
                          );
                        })()}
                      </TableCell>
                    );

                    if (!isMulti) {
                      const item = v.items[0];
                      return (
                        <TableRow key={vehicleKey} className={vIdx % 2 === 0 ? "" : "bg-muted/20"}>
                          <TableCell className="text-muted-foreground">{vIdx + 1}</TableCell>
                          <TableCell>
                            <span className="font-mono text-sm bg-muted/50 px-2 py-0.5 rounded">{v.vehicle_number || "-"}</span>
                          </TableCell>
                          <TableCell className="text-sm">{v.transporter || "-"}</TableCell>
                          <TableCell className="text-sm">{item.vendor_name || "-"}</TableCell>
                          <TableCell>{item.item_name}</TableCell>
                          <TableCell className="text-right tabular-nums">{fmtRate(item.rate)}</TableCell>
                          <TableCell className="text-right tabular-nums">{fmtMts(item.total_quantity_in_mts)}</TableCell>
                          {daysCell}
                          <TableCell className="text-sm text-muted-foreground">{fmtDate(item.eta)}</TableCell>
                        </TableRow>
                      );
                    }

                    return (
                      <Fragment key={vehicleKey}>
                        <TableRow
                          className={cn(
                            "cursor-pointer transition-colors hover:bg-muted/40",
                            vIdx % 2 === 0 ? "" : "bg-muted/20",
                            isOpen && "bg-muted/30"
                          )}
                          onClick={() => toggleExpand(vehicleKey)}
                        >
                          <TableCell className="text-muted-foreground">{vIdx + 1}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform duration-200", isOpen && "rotate-180")} />
                              <span className="font-mono text-sm bg-muted/50 px-2 py-0.5 rounded">{v.vehicle_number || "-"}</span>
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">{v.items.length} items</Badge>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">{v.transporter || "-"}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{v.items.length} vendors</TableCell>
                          <TableCell className="text-sm text-muted-foreground">Mixed Items / Rates</TableCell>
                          <TableCell className="text-right text-sm text-muted-foreground">-</TableCell>
                          <TableCell className="text-right tabular-nums font-medium">{fmtMts(vehicleTotalMts)}</TableCell>
                          {daysCell}
                          <TableCell className="text-sm text-muted-foreground">{fmtDate(worstEta)}</TableCell>
                        </TableRow>
                        {isOpen && v.items.map((item, iIdx) => (
                          <TableRow key={`${vehicleKey}-${iIdx}`} className="bg-muted/10 border-l-4 border-l-primary/30 animate-in fade-in slide-in-from-top-1 duration-200">
                            <TableCell />
                            <TableCell className="pl-10 text-xs text-muted-foreground font-mono">{v.vehicle_number || "-"}</TableCell>
                            <TableCell className="text-sm">{v.transporter || "-"}</TableCell>
                            <TableCell className="text-sm">{item.vendor_name || "-"}</TableCell>
                            <TableCell className="text-sm">{item.item_name}</TableCell>
                            <TableCell className="text-right tabular-nums text-sm">{fmtRate(item.rate)}</TableCell>
                            <TableCell className="text-right tabular-nums text-sm">{fmtMts(item.total_quantity_in_mts)}</TableCell>
                            <TableCell className="tabular-nums">
                              {(() => {
                                const d = daysRemaining(item.eta);
                                if (d === null) return <span className="text-sm text-muted-foreground">-</span>;
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
                            <TableCell className="text-sm text-muted-foreground">{fmtDate(item.eta)}</TableCell>
                          </TableRow>
                        ))}
                      </Fragment>
                    );
                  })}
                </TableBody>
                <tfoot>
                  <tr className="border-t-2 bg-muted/40 font-medium">
                    <td colSpan={6} className="px-2.5 sm:px-4 py-2.5 sm:py-3 text-[10px] sm:text-sm uppercase tracking-wide sm:tracking-wider">Grand Total</td>
                    <td className="px-2.5 sm:px-4 py-2.5 sm:py-3 text-right tabular-nums text-[10px] sm:text-sm">{fmtMts(totalMts)}</td>
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

