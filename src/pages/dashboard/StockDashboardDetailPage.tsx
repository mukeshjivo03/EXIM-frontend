import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { 
  ArrowLeft, 
  RefreshCw, 
  LayoutGrid, 
  ChevronRight, 
  Factory, 
  Truck, 
  Package, 
  Inbox,
  MousePointer2
} from "lucide-react";

import { getStockDashboard, type StockDashboardResponse } from "@/api/dashboard";
import { getErrorMessage } from "@/lib/errors";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Unit = "KG" | "MTS" | "LTR";

const UNIT_LABELS: Record<Unit, string> = { KG: "KG", MTS: "MTS", LTR: "Liters" };

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

const STATUS_ORDER = [
  "IN_CONTRACT",
  "ON_THE_SEA",
  "MUNDRA_PORT",
  "ON_THE_WAY",
  "AT_REFINERY",
  "UNDER_LOADING",
  "OTW_TO_REFINERY",
  "OUT_SIDE_FACTORY",
  "IN_FACTORY"
];

const STATUS_META: Record<string, { label: string; headerBg: string; textColor: string; icon: any }> = {
  IN_FACTORY:       { label: "In Factory",       headerBg: "bg-green-50 dark:bg-green-900/20",   textColor: "text-green-800 dark:text-green-200", icon: Factory },
  OUT_SIDE_FACTORY: { label: "Outside Factory",  headerBg: "bg-emerald-50 dark:bg-emerald-900/20", textColor: "text-emerald-800 dark:text-emerald-200", icon: Truck },
  ON_THE_WAY:       { label: "On The Way",       headerBg: "bg-yellow-50 dark:bg-yellow-900/20", textColor: "text-yellow-800 dark:text-yellow-200", icon: Truck },
  UNDER_LOADING:    { label: "Under Loading",    headerBg: "bg-amber-50 dark:bg-amber-900/20",   textColor: "text-amber-800 dark:text-amber-200", icon: Package },
  AT_REFINERY:      { label: "At Refinery",      headerBg: "bg-pink-50 dark:bg-pink-900/20",     textColor: "text-pink-800 dark:text-pink-200", icon: Factory },
  OTW_TO_REFINERY:  { label: "OTW to Refinery",  headerBg: "bg-rose-50 dark:bg-rose-900/20",     textColor: "text-rose-800 dark:text-rose-200", icon: Truck },
  ON_THE_SEA:       { label: "On The Sea",       headerBg: "bg-blue-50 dark:bg-blue-900/20",     textColor: "text-blue-800 dark:text-blue-200", icon: Package },
  IN_CONTRACT:      { label: "In Contract",      headerBg: "bg-indigo-50 dark:bg-indigo-900/20", textColor: "text-indigo-800 dark:text-indigo-200", icon: Package },
  KANDLA_STORAGE:   { label: "Kandla Storage",   headerBg: "bg-orange-50 dark:bg-orange-900/20", textColor: "text-orange-800 dark:text-orange-200", icon: Factory },
  MUNDRA_PORT:      { label: "Mundra Port",      headerBg: "bg-orange-100 dark:bg-orange-900/40", textColor: "text-orange-900 dark:text-orange-100", icon: Factory },
  IN_TRANSIT:       { label: "In Transit",       headerBg: "bg-sky-50 dark:bg-sky-900/20",       textColor: "text-sky-800 dark:text-sky-200", icon: Package },
  PENDING:          { label: "Pending",          headerBg: "bg-slate-50 dark:bg-slate-900/20",   textColor: "text-slate-800 dark:text-slate-200", icon: LayoutGrid },
  PROCESSING:       { label: "Processing",       headerBg: "bg-purple-50 dark:bg-purple-900/20", textColor: "text-purple-800 dark:text-purple-200", icon: LayoutGrid },
};

export default function StockDashboardDetailPage() {
  const { status } = useParams<{ status: string }>();
  const navigate = useNavigate();

  const [data, setData] = useState<StockDashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [unit, setUnit] = useState<Unit>("MTS");

  async function fetchData() {
    setLoading(true);
    try {
      console.log("Fetching stock dashboard for status:", status);
      const res = await getStockDashboard();
      console.log("Stock dashboard response received:", !!res);
      setData(res);
    } catch (err) {
      console.error("Stock Detail Fetch Error:", err);
      toast.error(getErrorMessage(err, "Failed to load stock data"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, [status]);

  const meta = STATUS_META[status ?? ""] ?? { label: status ?? "", headerBg: "bg-muted/40", textColor: "", icon: LayoutGrid };
  const PageIcon = meta.icon;

  /* For IN_FACTORY / OUT_SIDE_FACTORY there's no vendor breakdown */
  const isSimpleStatus = status === "IN_FACTORY" || status === "OUT_SIDE_FACTORY";

  /* Vendor columns that belong to this status */
  const vendorKeys = useMemo(() => {
    if (!data || isSimpleStatus) return [];
    return Object.keys(data.totals.status_vendor_totals).filter(
      (key) => key.startsWith(`${status}__`)
    );
  }, [data, status, isSimpleStatus]);

  /* Rows: only items that have a non-zero quantity for this status */
  const rows = useMemo(() => {
    if (!data) return [];
    return data.items.filter((item) => {
      if (status === "IN_FACTORY") return item.in_factory > 0;
      if (status === "OUT_SIDE_FACTORY") return item.outside_factory > 0;
      return vendorKeys.some((k) => (item.status_data[k] ?? 0) > 0);
    });
  }, [data, status, vendorKeys, isSimpleStatus]);

  const grandTotal = useMemo(() => {
    if (!data) return 0;
    if (status === "IN_FACTORY") return data.totals.in_factory;
    if (status === "OUT_SIDE_FACTORY") return data.totals.outside_factory;
    return vendorKeys.reduce((sum, k) => sum + (data.totals.status_vendor_totals[k] ?? 0), 0);
  }, [data, status, vendorKeys]);

  return (
    <div className="p-3 sm:p-4 md:p-6 lg:p-8 space-y-8 animate-page">
      
      {/* ── Status Workflow Stepper ── */}
      <div className="bg-card/50 backdrop-blur-sm border rounded-2xl p-4 overflow-x-auto shadow-sm">
        <div className="flex items-center min-w-max gap-2">
          {STATUS_ORDER.map((s, idx) => {
            const isActive = s === status;
            const sMeta = STATUS_META[s];
            if (!sMeta) return null;
            const StatusIcon = sMeta.icon;
            return (
              <div key={s} className="flex items-center gap-2">
                <button
                  onClick={() => navigate(`/stock-dashboard/${s}`)}
                  className={cn(
                    "flex flex-col items-center gap-1.5 px-4 py-2 rounded-xl transition-all",
                    isActive 
                      ? "bg-primary text-primary-foreground shadow-lg scale-105 z-10" 
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <StatusIcon className={cn("h-4 w-4", isActive ? "animate-pulse" : "opacity-50")} />
                  <span className="text-[10px] font-black uppercase tracking-widest">{sMeta.label}</span>
                </button>
                {idx < STATUS_ORDER.length - 1 && (
                  <ChevronRight className="h-4 w-4 text-muted-foreground/30" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            size="icon" 
            onClick={() => navigate("/stock-dashboard")} 
            className="h-12 w-12 rounded-2xl shadow-sm border-2"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-black tracking-tight">{meta.label}</h1>
            <p className="text-sm text-muted-foreground font-medium mt-1 flex items-center gap-2">
              <PageIcon className="h-4 w-4 opacity-50" />
              Detailed item-wise inventory breakdown
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-muted/50 p-1 rounded-xl border border-border/50">
            {(["KG", "MTS", "LTR"] as Unit[]).map((u) => (
              <button
                key={u}
                onClick={() => setUnit(u)}
                className={cn(
                  "px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest transition-all rounded-lg",
                  unit === u ? "bg-primary text-primary-foreground shadow-md" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {UNIT_LABELS[u]}
              </button>
            ))}
          </div>
          <Button variant="outline" className="btn-press gap-2 rounded-xl h-11 border-2" onClick={fetchData} disabled={loading}>
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </div>

      {/* ── Visual Stats Summary ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className={cn("rounded-3xl p-6 flex flex-col justify-between shadow-xl border-none", meta.headerBg)}>
          <p className={cn("text-[10px] font-black uppercase tracking-[0.2em]", meta.textColor)}>Active Items</p>
          <div className="flex items-end justify-between mt-2">
            <h3 className={cn("text-4xl font-black tracking-tighter", meta.textColor)}>{rows.length}</h3>
            <LayoutGrid className={cn("h-8 w-8 opacity-20", meta.textColor)} />
          </div>
        </div>
        <div className={cn("rounded-3xl p-6 flex flex-col justify-between shadow-xl border-none", meta.headerBg)}>
          <p className={cn("text-[10px] font-black uppercase tracking-[0.2em]", meta.textColor)}>Total Volume</p>
          <div className="flex items-end justify-between mt-2">
            <h3 className={cn("text-4xl font-black tracking-tighter", meta.textColor)}>{fmtNum(grandTotal, unit)}</h3>
            <p className={cn("text-xs font-bold uppercase", meta.textColor)}>{UNIT_LABELS[unit]}</p>
          </div>
        </div>
        <div className="rounded-3xl p-6 flex flex-col justify-between shadow-xl border-none bg-indigo-50 dark:bg-indigo-950/20">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600 dark:text-indigo-400">Status Type</p>
          <div className="flex items-end justify-between mt-2">
            <h3 className="text-2xl font-black tracking-tight text-indigo-800 dark:text-indigo-200">
              {isSimpleStatus ? "Single Category" : "Vendor Breakdown"}
            </h3>
            <ChevronRight className="h-8 w-8 text-indigo-500 opacity-20" />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="-mx-6 lg:mx-0">
        <Card className="border-none shadow-2xl bg-card/50 backdrop-blur-sm overflow-hidden">
          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 space-y-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full rounded-xl" />
                ))}
              </div>
            ) : !data || rows.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-4">
                <Inbox className="h-12 w-12 opacity-10" />
                <p className="font-bold uppercase tracking-widest text-sm">No stock found for this status</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className={cn("border-b-2", meta.headerBg)}>
                      <th className="sticky left-0 z-10 px-8 py-5 text-left font-black uppercase tracking-[0.2em] border-r bg-muted/20 backdrop-blur-md text-xs">
                        Item Code
                      </th>
                      {isSimpleStatus ? (
                        <th className={cn("px-8 py-5 text-right font-black uppercase tracking-[0.2em] text-xs", meta.textColor)}>
                          Quantity ({UNIT_LABELS[unit]})
                        </th>
                      ) : (
                        <>
                          {vendorKeys.map((key) => (
                            <th key={key} className={cn("px-8 py-5 text-right font-black uppercase tracking-[0.2em] text-xs border-r last:border-r-0", meta.textColor)}>
                              {key.split("__")[1]}
                            </th>
                          ))}
                          <th className="px-8 py-5 text-right font-black uppercase tracking-[0.2em] text-xs bg-primary text-primary-foreground shadow-2xl">
                            TOTAL
                          </th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((item, idx) => {
                      const rowTotal = isSimpleStatus
                        ? (status === "IN_FACTORY" ? item.in_factory : item.outside_factory)
                        : vendorKeys.reduce((sum, k) => sum + (item.status_data[k] ?? 0), 0);

                      return (
                        <tr
                          key={item.item_code}
                          className={cn(
                            "border-b transition-all group hover:bg-primary/5",
                            idx % 2 === 0 ? "bg-card" : "bg-muted/10"
                          )}
                        >
                          <td className="sticky left-0 z-10 px-8 py-5 font-mono font-black border-r bg-inherit shadow-sm text-sm group-hover:text-primary transition-colors">
                            {item.item_code}
                          </td>
                          {isSimpleStatus ? (
                            <td className="px-8 py-5 text-right tabular-nums text-sm font-black">
                              {fmtNum(rowTotal, unit)}
                            </td>
                          ) : (
                            <>
                              {vendorKeys.map((key) => {
                                const val = item.status_data[key] ?? 0;
                                return (
                                  <td key={key} className="px-8 py-5 text-right tabular-nums text-sm font-medium border-r last:border-r-0">
                                    {val > 0 ? (
                                      <span className="font-black text-foreground">{fmtNum(val, unit)}</span>
                                    ) : (
                                      <span className="opacity-10">·</span>
                                    )}
                                  </td>
                                );
                              })}
                              <td className="px-8 py-5 text-right tabular-nums font-black bg-muted/30 text-sm">
                                {fmtNum(rowTotal, unit)}
                              </td>
                            </>
                          )}
                        </tr>
                      );
                    })}

                    {/* Totals row */}
                    <tr className="bg-muted/80 backdrop-blur-md font-black border-t-2 border-primary/20">
                      <td className="sticky left-0 z-10 px-8 py-6 uppercase tracking-widest border-r bg-inherit text-xs">
                        Grand Total
                      </td>
                      {isSimpleStatus ? (
                        <td className="px-8 py-6 text-right tabular-nums text-primary text-lg">
                          {fmtNum(grandTotal, unit)}
                        </td>
                      ) : (
                        <>
                          {vendorKeys.map((key) => (
                            <td key={key} className="px-8 py-6 text-right tabular-nums border-r last:border-r-0 text-sm">
                              {fmtNum(data?.totals.status_vendor_totals[key] ?? 0, unit)}
                            </td>
                          ))}
                          <td className="px-8 py-6 text-right tabular-nums bg-primary text-primary-foreground shadow-2xl text-xl rounded-bl-3xl">
                            {fmtNum(grandTotal, unit)}
                          </td>
                        </>
                      )}
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Navigation Hint */}
      <div className="flex items-center justify-center gap-2 text-muted-foreground animate-bounce pt-4">
        <MousePointer2 className="h-4 w-4" />
        <p className="text-[10px] font-bold uppercase tracking-widest">Click on any status in the workflow to switch view</p>
      </div>
    </div>
  );
}
