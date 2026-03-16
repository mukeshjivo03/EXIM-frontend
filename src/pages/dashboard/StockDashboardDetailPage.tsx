import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, RefreshCw } from "lucide-react";

import { getStockDashboard, type StockDashboardResponse } from "@/api/dashboard";
import { getErrorMessage } from "@/lib/errors";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

type Unit = "KG" | "MTS" | "LTR";

const UNIT_LABELS: Record<Unit, string> = { KG: "KG", MTS: "MTS", LTR: "Liters" };

function convertUnit(kg: number, unit: Unit): number {
  if (unit === "MTS") return kg / 1000;
  if (unit === "LTR") return kg * 1.1;
  return kg;
}

function fmtNum(n: number, unit: Unit = "KG") {
  const val = convertUnit(n, unit);
  return val.toLocaleString("en-IN", {
    minimumFractionDigits: unit === "MTS" ? 2 : 0,
    maximumFractionDigits: unit === "MTS" ? 2 : 0,
  });
}

const STATUS_META: Record<string, { label: string; headerBg: string; textColor: string }> = {
  IN_FACTORY:       { label: "In Factory",       headerBg: "bg-green-100 dark:bg-green-900/40",   textColor: "text-green-800 dark:text-green-200" },
  OUT_SIDE_FACTORY: { label: "Outside Factory",  headerBg: "bg-green-100 dark:bg-green-900/40",   textColor: "text-green-800 dark:text-green-200" },
  ON_THE_WAY:       { label: "On The Way",       headerBg: "bg-yellow-100 dark:bg-yellow-900/40", textColor: "text-yellow-800 dark:text-yellow-200" },
  UNDER_LOADING:    { label: "Under Loading",    headerBg: "bg-yellow-100 dark:bg-yellow-900/40", textColor: "text-yellow-800 dark:text-yellow-200" },
  AT_REFINERY:      { label: "At Refinery",      headerBg: "bg-pink-100 dark:bg-pink-900/40",     textColor: "text-pink-800 dark:text-pink-200" },
  OTW_TO_REFINERY:  { label: "OTW to Refinery",  headerBg: "bg-pink-100 dark:bg-pink-900/40",     textColor: "text-pink-800 dark:text-pink-200" },
  ON_THE_SEA:       { label: "On The Sea",       headerBg: "bg-blue-100 dark:bg-blue-900/40",     textColor: "text-blue-800 dark:text-blue-200" },
  IN_CONTRACT:      { label: "In Contract",      headerBg: "bg-indigo-100 dark:bg-indigo-900/40", textColor: "text-indigo-800 dark:text-indigo-200" },
  KANDLA_STORAGE:   { label: "Kandla Storage",   headerBg: "bg-orange-100 dark:bg-orange-900/40", textColor: "text-orange-800 dark:text-orange-200" },
  MUNDRA_PORT:      { label: "Mundra Port",      headerBg: "bg-orange-100 dark:bg-orange-900/40", textColor: "text-orange-800 dark:text-orange-200" },
  IN_TRANSIT:       { label: "In Transit",       headerBg: "bg-blue-100 dark:bg-blue-900/40",     textColor: "text-blue-800 dark:text-blue-200" },
  PENDING:          { label: "Pending",          headerBg: "bg-amber-100 dark:bg-amber-900/40",   textColor: "text-amber-800 dark:text-amber-200" },
  PROCESSING:       { label: "Processing",       headerBg: "bg-purple-100 dark:bg-purple-900/40", textColor: "text-purple-800 dark:text-purple-200" },
  COMPLETED:        { label: "Completed",        headerBg: "bg-green-100 dark:bg-green-900/40",   textColor: "text-green-800 dark:text-green-200" },
  DELIVERED:        { label: "Delivered",        headerBg: "bg-teal-100 dark:bg-teal-900/40",     textColor: "text-teal-800 dark:text-teal-200" },
};

export default function StockDashboardDetailPage() {
  const { status } = useParams<{ status: string }>();
  const navigate = useNavigate();

  const [data, setData] = useState<StockDashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [unit, setUnit] = useState<Unit>("KG");

  async function fetchData() {
    setLoading(true);
    try {
      const res = await getStockDashboard();
      setData(res);
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to load stock data"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, [status]);

  const meta = STATUS_META[status ?? ""] ?? { label: status ?? "", headerBg: "bg-muted/40", textColor: "" };

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

  /* Column totals */
  const colTotals = useMemo(() => {
    if (!data) return {};
    if (status === "IN_FACTORY") return { total: data.totals.in_factory };
    if (status === "OUT_SIDE_FACTORY") return { total: data.totals.outside_factory };
    return Object.fromEntries(vendorKeys.map((k) => [k, data.totals.status_vendor_totals[k] ?? 0]));
  }, [data, status, vendorKeys]);

  const grandTotal = useMemo(() => {
    if (!data) return 0;
    if (status === "IN_FACTORY") return data.totals.in_factory;
    if (status === "OUT_SIDE_FACTORY") return data.totals.outside_factory;
    return vendorKeys.reduce((sum, k) => sum + (data.totals.status_vendor_totals[k] ?? 0), 0);
  }, [data, status, vendorKeys]);

  return (
    <div className="p-6 space-y-6 animate-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/stock-dashboard")} className="btn-press">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className={`text-2xl font-bold`}>{meta.label}</h1>
            <p className="text-sm text-muted-foreground">Item-wise stock breakdown for this status</p>
          </div>
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

      {/* Table */}
      <div className="-mx-6">
        {loading ? (
          <div className="px-6 space-y-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : !data || rows.length === 0 ? (
          <div className="mx-6 flex items-center justify-center h-40 text-muted-foreground text-sm border rounded-md">
            No stock data for this status
          </div>
        ) : (
          <div className="overflow-x-auto border-y shadow-sm">
            <table className="w-full text-base">
              <thead>
                <tr className={`border-b ${meta.headerBg}`}>
                  <th className="sticky left-0 z-10 px-5 py-3 text-left font-bold whitespace-nowrap border-r bg-muted/40 text-base">
                    Item Code
                  </th>
                  {isSimpleStatus ? (
                    <th className={`px-5 py-3 text-center font-bold whitespace-nowrap border-r text-base ${meta.textColor}`}>
                      Quantity ({UNIT_LABELS[unit]})
                    </th>
                  ) : (
                    <>
                      {vendorKeys.map((key) => {
                        const vendor = key.split("__")[1];
                        return (
                          <th key={key} className={`px-5 py-3 text-center font-bold whitespace-nowrap border-r text-base ${meta.textColor}`}>
                            {vendor}
                          </th>
                        );
                      })}
                      <th className="px-5 py-3 text-center font-bold whitespace-nowrap border-l bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200 text-base">
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
                      className={`border-b transition-colors hover:bg-accent/30 ${idx % 2 === 0 ? "" : "bg-muted/20"}`}
                    >
                      <td className="sticky left-0 z-10 px-5 py-4 font-mono font-semibold whitespace-nowrap border-r bg-card text-base">
                        {item.item_code}
                      </td>
                      {isSimpleStatus ? (
                        <td className="px-5 py-4 text-right tabular-nums border-r text-base font-semibold">
                          {fmtNum(rowTotal, unit)}
                        </td>
                      ) : (
                        <>
                          {vendorKeys.map((key) => {
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
                            {fmtNum(rowTotal, unit)}
                          </td>
                        </>
                      )}
                    </tr>
                  );
                })}

                {/* Totals row */}
                <tr className="border-t-2 bg-muted/40 font-bold text-base">
                  <td className="sticky left-0 z-10 px-5 py-4 whitespace-nowrap border-r bg-muted/40">
                    Total
                  </td>
                  {isSimpleStatus ? (
                    <td className="px-5 py-4 text-right tabular-nums border-r text-primary">
                      {fmtNum(grandTotal, unit)}
                    </td>
                  ) : (
                    <>
                      {vendorKeys.map((key) => (
                        <td key={key} className="px-5 py-4 text-right tabular-nums border-r last:border-r-0">
                          {fmtNum(colTotals[key] ?? 0, unit)}
                        </td>
                      ))}
                      <td className="px-5 py-4 text-right tabular-nums font-bold border-l bg-muted/60 text-primary text-lg">
                        {fmtNum(grandTotal, unit)}
                      </td>
                    </>
                  )}
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
