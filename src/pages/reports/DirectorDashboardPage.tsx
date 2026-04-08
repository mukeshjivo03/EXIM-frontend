import { Fragment, useEffect, useMemo, useState } from "react";
import { RefreshCw, BarChart3, Droplets, Scale, PackageCheck, ChevronDown, ChevronRight } from "lucide-react";

import { getDirectorInventory, type DirectorInventoryResponse } from "@/api/dashboard";
import { getVehicleReport, type VehicleReport } from "@/api/stockStatus";
import { getErrorMessage } from "@/lib/errors";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type DirectorRow = {
  key: keyof DirectorInventoryResponse;
  label: string;
  liter: number;
  mts: number;
  statusCode?: string;
};

const ORDER: Array<{ key: keyof DirectorInventoryResponse; label: string; statusCode?: string }> = [
  { key: "finished", label: "Finished" },
  { key: "otw", label: "On The Way", statusCode: "ON_THE_WAY" },
  { key: "under_loading", label: "Under Loading", statusCode: "UNDER_LOADING" },
  { key: "at_refinery", label: "At Refinery", statusCode: "AT_REFINERY" },
  { key: "mundra_port", label: "Mundra Port", statusCode: "MUNDRA_PORT" },
  { key: "on_the_sea", label: "On The Sea", statusCode: "ON_THE_SEA" },
  { key: "in_contract", label: "In Contract", statusCode: "IN_CONTRACT" },
];

function fmtNum(n: number) {
  return n.toLocaleString("en-IN", { maximumFractionDigits: 0 });
}

function fmtEta(eta: string | null) {
  if (!eta) return "—";
  const d = new Date(eta);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export default function DirectorDashboardPage() {
  const [data, setData] = useState<DirectorInventoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [vehicleReports, setVehicleReports] = useState<Partial<Record<keyof DirectorInventoryResponse, VehicleReport[]>>>({});
  const [expanded, setExpanded] = useState<Set<keyof DirectorInventoryResponse>>(new Set());

  async function fetchData() {
    setLoading(true);
    try {
      const [inventory, reports] = await Promise.all([
        getDirectorInventory(),
        Promise.all(
          ORDER.filter((o) => o.statusCode).map(async (o) => {
            const rows = await getVehicleReport(o.statusCode!);
            return [o.key, rows] as const;
          })
        ),
      ]);
      setData(inventory);
      setVehicleReports(Object.fromEntries(reports) as Partial<Record<keyof DirectorInventoryResponse, VehicleReport[]>>);
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to load director inventory"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, []);

  const rows = useMemo<DirectorRow[]>(() => {
    if (!data) return [];
    return ORDER.map(({ key, label, statusCode }) => ({
      key,
      label,
      liter: Number(data[key]?.liter ?? 0),
      mts: Number(data[key]?.mts ?? 0),
      statusCode,
    }));
  }, [data]);

  const totals = useMemo(() => {
    return rows.reduce(
      (acc, row) => {
        acc.liter += row.liter;
        acc.mts += row.mts;
        return acc;
      },
      { liter: 0, mts: 0 }
    );
  }, [rows]);

  function toggleExpand(key: keyof DirectorInventoryResponse) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  return (
    <div className="p-3 sm:p-4 md:p-6 space-y-6 animate-page">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Director Dashboard</h1>
          <p className="text-base text-muted-foreground">Inventory snapshot by stage</p>
        </div>
        <Button onClick={fetchData} disabled={loading} className="btn-press gap-2">
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          {loading ? "Loading..." : "Refresh"}
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-none bg-blue-50/60 dark:bg-blue-950/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">Total Liter</p>
              <Droplets className="h-4 w-4 text-blue-500" />
            </div>
            <p className="text-3xl font-extrabold mt-1">{loading ? "—" : fmtNum(totals.liter)}</p>
          </CardContent>
        </Card>
        <Card className="border-none bg-emerald-50/60 dark:bg-emerald-950/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Total MTS</p>
              <Scale className="h-4 w-4 text-emerald-500" />
            </div>
            <p className="text-3xl font-extrabold mt-1">{loading ? "—" : fmtNum(totals.mts)}</p>
          </CardContent>
        </Card>
        <Card className="border-none bg-violet-50/60 dark:bg-violet-950/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold uppercase tracking-wider text-violet-600 dark:text-violet-400">Active Stages</p>
              <PackageCheck className="h-4 w-4 text-violet-500" />
            </div>
            <p className="text-3xl font-extrabold mt-1">
              {loading ? "—" : rows.filter((r) => r.liter > 0 || r.mts > 0).length}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="card-hover shimmer-hover">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Stage-Wise Inventory
          </CardTitle>
          <CardDescription>Data source: `/director-inventorty/`</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-muted/50 border-b">
                  <th className="px-4 py-3 text-left text-sm font-semibold uppercase tracking-wider text-muted-foreground">Stage</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold uppercase tracking-wider text-muted-foreground">Liter</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold uppercase tracking-wider text-muted-foreground">MTS</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const canExpand = Boolean(row.statusCode);
                  const isOpen = expanded.has(row.key);
                  const reportRows = vehicleReports[row.key] ?? [];

                  return (
                    <Fragment key={row.key}>
                      <tr
                        className={`border-b transition-colors ${canExpand ? "cursor-pointer hover:bg-muted/30" : "hover:bg-muted/30"}`}
                        onClick={canExpand ? () => toggleExpand(row.key) : undefined}
                      >
                        <td className="px-4 py-3 text-base font-medium">
                          <div className="flex items-center gap-2">
                            {canExpand && (
                              <span
                                className="inline-flex h-6 w-6 items-center justify-center rounded-md border"
                                title={isOpen ? "Collapse" : "Expand"}
                              >
                                {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                              </span>
                            )}
                            <span>{row.label}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-base text-right tabular-nums">{loading ? "—" : fmtNum(row.liter)}</td>
                        <td className="px-4 py-3 text-base text-right tabular-nums">{loading ? "—" : fmtNum(row.mts)}</td>
                      </tr>

                      {canExpand && isOpen && (
                        <tr className="border-b bg-muted/20">
                          <td colSpan={3} className="px-4 py-3">
                            <div className="rounded-md border overflow-x-auto bg-background/70">
                              <table className="w-full text-sm">
                                <thead>
                                  <tr className="bg-muted/50 border-b">
                                    <th className="px-3 py-2 text-left font-semibold">S.No</th>
                                    <th className="px-3 py-2 text-left font-semibold">Vehicle No</th>
                                    <th className="px-3 py-2 text-left font-semibold">Item</th>
                                    <th className="px-3 py-2 text-right font-semibold">Qty (LTR)</th>
                                    <th className="px-3 py-2 text-left font-semibold">ETA</th>
                                    <th className="px-3 py-2 text-left font-semibold">Refinery</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {reportRows.length === 0 ? (
                                    <tr>
                                      <td colSpan={6} className="px-3 py-4 text-center text-muted-foreground">
                                        No vehicle rows for this status
                                      </td>
                                    </tr>
                                  ) : (
                                    reportRows.map((v, idx) => (
                                      <tr key={`${row.key}-${idx}`} className="border-b last:border-b-0">
                                        <td className="px-3 py-2 tabular-nums">{idx + 1}</td>
                                        <td className="px-3 py-2">{v.vehicle_number || "—"}</td>
                                        <td className="px-3 py-2">{v.item_name || "—"}</td>
                                        <td className="px-3 py-2 text-right tabular-nums">{fmtNum(Number(v.quantity_in_litre ?? 0))}</td>
                                        <td className="px-3 py-2">{fmtEta(v.eta ?? null)}</td>
                                        <td className="px-3 py-2">{v.job_work || "—"}</td>
                                      </tr>
                                    ))
                                  )}
                                </tbody>
                              </table>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-muted/70 border-t-2">
                  <td className="px-4 py-3 text-base font-extrabold">Grand Total</td>
                  <td className="px-4 py-3 text-base text-right font-extrabold tabular-nums">{loading ? "—" : fmtNum(totals.liter)}</td>
                  <td className="px-4 py-3 text-base text-right font-extrabold tabular-nums">{loading ? "—" : fmtNum(totals.mts)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
