import { Fragment, useEffect, useMemo, useState } from "react";
import { RefreshCw, BarChart3, Droplets, Scale, PackageCheck, ChevronDown, ChevronRight, FileSpreadsheet, LayoutDashboard } from "lucide-react";

import {
  getDirectorInventory,
  type DirectorFinishedInventory,
  type DirectorInventoryLiter,
  type DirectorInventoryResponse,
} from "@/api/dashboard";
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
  key: DirectorStageKey | "at_factory";
  label: string;
  liter: number;
  mts: number;
  statusCode?: string;
  breakdown?: Array<{ label: string; liter: number; mts: number }>;
};

type DirectorStageKey = Exclude<keyof DirectorInventoryResponse, "at_factory">;

const ORDER: Array<{ key: DirectorStageKey; label: string; statusCode?: string }> = [
  { key: "finished", label: "Finished Goods" },
  { key: "otw", label: "On The Way", statusCode: "ON_THE_WAY" },
  { key: "under_loading", label: "Under Loading", statusCode: "UNDER_LOADING" },
  { key: "at_refinery", label: "At Refinery", statusCode: "AT_REFINERY" },
  { key: "mundra_port", label: "At Mundra Port", statusCode: "MUNDRA_PORT" },
  { key: "on_the_sea", label: "On The Sea", statusCode: "ON_THE_SEA" },
  { key: "in_contract", label: "In Contract / Booking", statusCode: "IN_CONTRACT" },
];

function fmtNum(n: number) {
  return n.toLocaleString("en-IN", { maximumFractionDigits: 0 });
}

function getLiterValue(liter: DirectorInventoryLiter): number {
  if (typeof liter === "number") return Number(liter);
  if (liter && typeof liter === "object") return Number(liter.total_liter ?? 0);
  return 0;
}

function isFinishedWithBreakdown(
  finished: DirectorFinishedInventory
): finished is { total: { liter: DirectorInventoryLiter; mts: number } } & Record<string, { liter: DirectorInventoryLiter; mts: number }> {
  return typeof finished === "object" && finished !== null && "total" in finished;
}

function getFinishedRowData(finished: DirectorFinishedInventory): Pick<DirectorRow, "liter" | "mts" | "breakdown"> {
  if (!isFinishedWithBreakdown(finished)) {
    return {
      liter: getLiterValue(finished.liter),
      mts: Number(finished.mts ?? 0),
    };
  }

  const breakdown = Object.entries(finished)
    .filter(([warehouse]) => warehouse !== "total")
    .map(([warehouse, bucket]) => ({
      label: warehouse,
      liter: getLiterValue(bucket.liter),
      mts: Number(bucket.mts ?? 0),
    }));

  return {
    liter: getLiterValue(finished.total?.liter),
    mts: Number(finished.total?.mts ?? 0),
    breakdown: breakdown.length > 0 ? breakdown : undefined,
  };
}

function fmtEta(eta: string | null) {
  if (!eta) return "—";
  const d = new Date(eta);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function isTransportStatus(statusCode?: string) {
  return statusCode === "ON_THE_WAY" || statusCode === "UNDER_LOADING";
}

function getVehicleMts(v: VehicleReport): number {
  const row = v as VehicleReport & { quantity_in_mts?: number; mts?: number };
  return Number(row.quantity_in_mts ?? row.mts ?? 0);
}

export default function DirectorDashboardPage() {
  const [data, setData] = useState<DirectorInventoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [vehicleReports, setVehicleReports] = useState<Partial<Record<DirectorStageKey, VehicleReport[]>>>({});
  const [expanded, setExpanded] = useState<Set<DirectorStageKey | "at_factory">>(new Set());
  const [compactView, setCompactView] = useState(false);

  const today = new Date();
  const dateStr = `${String(today.getDate()).padStart(2, "0")}-${String(today.getMonth() + 1).padStart(2, "0")}-${today.getFullYear()}`;

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
      setVehicleReports(Object.fromEntries(reports) as Partial<Record<DirectorStageKey, VehicleReport[]>>);
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
    const orderedRows = ORDER.map(({ key, label, statusCode }) => {
      if (key === "finished") {
        const finishedData = getFinishedRowData(data.finished);
        return {
          key,
          label,
          liter: finishedData.liter,
          mts: finishedData.mts,
          breakdown: finishedData.breakdown,
          statusCode,
        };
      }
      return {
        key,
        label,
        liter: getLiterValue(data[key].liter),
        mts: Number(data[key].mts ?? 0),
        statusCode,
      };
    });
    const inTankLiter = getLiterValue(data.at_factory.in_tank?.liter);
    const outsideFactoryLiter = getLiterValue(data.at_factory.outside_factory?.liter);
    const atFactoryLiter = Number(data.at_factory.total?.total_lts ?? inTankLiter + outsideFactoryLiter);
    const atFactoryMts = Number(data.at_factory.total?.total_mts ?? Number(data.at_factory.in_tank?.mts ?? 0) + Number(data.at_factory.outside_factory?.mts ?? 0));
    const atFactoryRow: DirectorRow = {
      key: "at_factory",
      label: "At Factory",
      liter: atFactoryLiter,
      mts: atFactoryMts,
      breakdown: [
        { label: "In Tank", liter: inTankLiter, mts: Number(data.at_factory.in_tank?.mts ?? 0) },
        { label: "Outside Factory", liter: outsideFactoryLiter, mts: Number(data.at_factory.outside_factory?.mts ?? 0) },
      ],
    };
    const [first, ...rest] = orderedRows;
    if (!first) return orderedRows;
    return [first, atFactoryRow, ...rest];
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

  function toggleExpand(key: DirectorStageKey | "at_factory") {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  return (
    <div className="p-3 sm:p-4 md:p-6 space-y-6 animate-page">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Director Dashboard</h1>
          <p className="text-base text-muted-foreground">Inventory snapshot by stage</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={compactView ? "default" : "outline"}
            onClick={() => setCompactView(!compactView)}
            className="btn-press gap-2"
          >
            {compactView ? (
              <><LayoutDashboard className="h-4 w-4" /> Dashboard</>
            ) : (
              <><FileSpreadsheet className="h-4 w-4" /> Report View</>
            )}
          </Button>
          <Button onClick={fetchData} disabled={loading} className="btn-press gap-2">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            {loading ? "Loading..." : "Refresh"}
          </Button>
        </div>
      </div>

      {compactView ? (
        /* ── Compact Report View ─────────────────────────────── */
        <Card className="overflow-hidden border-0 shadow-lg w-full max-w-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-lg" style={{ borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th
                    colSpan={3}
                    className="text-white text-center py-5 px-6 text-2xl font-extrabold tracking-[0.15em] uppercase"
                    style={{ backgroundColor: "#1a3a6c" }}
                  >
                    OIL STATUS {dateStr}
                  </th>
                </tr>
                <tr>
                  <th className="px-6 py-4 text-left font-extrabold text-base uppercase tracking-widest text-white" style={{ backgroundColor: "#1a3a6c", border: "1px solid rgba(255,255,255,0.15)", minWidth: 240 }}>STATUS</th>
                  <th className="px-6 py-4 text-right font-extrabold text-base uppercase tracking-widest text-white" style={{ backgroundColor: "#1a3a6c", border: "1px solid rgba(255,255,255,0.15)", minWidth: 180 }}>IN LTR</th>
                  <th className="px-6 py-4 text-right font-extrabold text-base uppercase tracking-widest text-white" style={{ backgroundColor: "#1a3a6c", border: "1px solid rgba(255,255,255,0.15)", minWidth: 140 }}>IN MTS</th>
                </tr>
              </thead>
              <tbody>
                {loading
                  ? Array.from({ length: 8 }).map((_, i) => (
                      <tr key={i}>
                        <td className="px-6 py-4" style={{ border: "1px solid #e2e8f0" }}><div className="h-6 w-36 bg-muted animate-pulse rounded" /></td>
                        <td className="px-6 py-4" style={{ border: "1px solid #e2e8f0" }}><div className="h-6 w-24 bg-muted animate-pulse rounded ml-auto" /></td>
                        <td className="px-6 py-4" style={{ border: "1px solid #e2e8f0" }}><div className="h-6 w-16 bg-muted animate-pulse rounded ml-auto" /></td>
                      </tr>
                    ))
                  : rows.map((row) => (
                      <tr key={row.key} className="hover:bg-blue-50/60 dark:hover:bg-blue-950/20 transition-colors">
                        <td className="px-6 py-4 font-semibold uppercase text-base tracking-wide" style={{ border: "1px solid #cbd5e1" }}>
                          {row.label}
                        </td>
                        <td className="px-6 py-4 text-right tabular-nums text-lg" style={{ border: "1px solid #cbd5e1" }}>
                          {row.liter > 0 ? fmtNum(row.liter) : <span className="text-slate-400">-</span>}
                        </td>
                        <td className="px-6 py-4 text-right tabular-nums text-lg" style={{ border: "1px solid #cbd5e1" }}>
                          {row.mts > 0 ? fmtNum(row.mts) : <span className="text-slate-400">-</span>}
                        </td>
                      </tr>
                    ))}
              </tbody>
              <tfoot>
                <tr className="text-white font-extrabold">
                  <td className="px-6 py-5 text-base uppercase tracking-widest" style={{ backgroundColor: "#1a3a6c", border: "1px solid rgba(255,255,255,0.15)" }}>
                    TOTAL
                  </td>
                  <td className="px-6 py-5 text-right tabular-nums text-xl" style={{ backgroundColor: "#1a3a6c", border: "1px solid rgba(255,255,255,0.15)" }}>
                    {loading ? "—" : fmtNum(totals.liter)}
                  </td>
                  <td className="px-6 py-5 text-right tabular-nums text-xl" style={{ backgroundColor: "#1a3a6c", border: "1px solid rgba(255,255,255,0.15)" }}>
                    {loading ? "—" : fmtNum(totals.mts)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </Card>
      ) : (
        <>
          {/* ── KPI Cards ───────────────────────────────────── */}
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

          {/* ── Stage-Wise Inventory Table ───────────────────── */}
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
                      const canExpand = Boolean(row.statusCode || row.breakdown);
                      const isOpen = expanded.has(row.key);
                      const reportRows = row.statusCode ? vehicleReports[row.key as DirectorStageKey] ?? [] : [];

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

                          {canExpand && isOpen && row.breakdown && (
                            <tr className="border-b bg-muted/20">
                              <td colSpan={3} className="px-4 py-3">
                                <div className="rounded-md border overflow-x-auto bg-background/70">
                                  <table className="w-full text-sm">
                                    <thead>
                                      <tr className="bg-muted/50 border-b">
                                        <th className="px-3 py-2 text-left font-semibold">Source</th>
                                        <th className="px-3 py-2 text-right font-semibold">Liter</th>
                                        <th className="px-3 py-2 text-right font-semibold">MTS</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {row.breakdown.map((b) => (
                                        <tr key={`${row.key}-${b.label}`} className="border-b last:border-b-0">
                                          <td className="px-3 py-2">{b.label}</td>
                                          <td className="px-3 py-2 text-right tabular-nums">{fmtNum(b.liter)}</td>
                                          <td className="px-3 py-2 text-right tabular-nums">{fmtNum(b.mts)}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </td>
                            </tr>
                          )}

                          {canExpand && isOpen && row.statusCode && (
                            <tr className="border-b bg-muted/20">
                              <td colSpan={3} className="px-4 py-3">
                                <div className="rounded-md border overflow-x-auto bg-background/70">
                                  <table className="w-full text-sm">
                                    <thead>
                                      <tr className="bg-muted/50 border-b">
                                        <th className="px-3 py-2 text-left font-semibold">Item</th>
                                        <th className="px-3 py-2 text-right font-semibold">Qty (LTR)</th>
                                        <th className="px-3 py-2 text-right font-semibold">MTS</th>
                                        {isTransportStatus(row.statusCode) && (
                                          <>
                                            <th className="px-3 py-2 text-left font-semibold">Vehicle No</th>
                                            <th className="px-3 py-2 text-left font-semibold">ETA</th>
                                            <th className="px-3 py-2 text-left font-semibold">Refinery</th>
                                          </>
                                        )}
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {reportRows.length === 0 ? (
                                        <tr>
                                          <td colSpan={isTransportStatus(row.statusCode) ? 6 : 3} className="px-3 py-4 text-center text-muted-foreground">
                                            No vehicle rows for this status
                                          </td>
                                        </tr>
                                      ) : (
                                        reportRows.map((v, idx) => (
                                          <tr key={`${row.key}-${idx}`} className="border-b last:border-b-0">
                                            <td className="px-3 py-2">{v.item_name || "—"}</td>
                                            <td className="px-3 py-2 text-right tabular-nums">{fmtNum(Number(v.quantity_in_litre ?? 0))}</td>
                                            <td className="px-3 py-2 text-right tabular-nums">{fmtNum(getVehicleMts(v))}</td>
                                            {isTransportStatus(row.statusCode) && (
                                              <>
                                                <td className="px-3 py-2">{v.vehicle_number || "—"}</td>
                                                <td className="px-3 py-2">{fmtEta(v.eta ?? null)}</td>
                                                <td className="px-3 py-2">{v.job_work || "—"}</td>
                                              </>
                                            )}
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
        </>
      )}
    </div>
  );
}
