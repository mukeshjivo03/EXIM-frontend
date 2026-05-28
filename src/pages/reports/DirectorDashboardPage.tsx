import { Fragment, useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx-js-style";
import { RefreshCw, BarChart3, Droplets, Scale, PackageCheck, ChevronDown, ChevronRight, FileSpreadsheet, LayoutDashboard, FileDown } from "lucide-react";

import {
  getDirectorInventory,
  type DirectorFinishedInventory,
  type DirectorInventoryLiter,
  type DirectorInventoryResponse,
} from "@/api/dashboard";
import { getVehicleReport, type VehicleReport, type VehicleReportItem } from "@/api/stockStatus";

type FlatVehicleRow = { vehicle_number: string } & VehicleReportItem;

function flattenVehicleReport(vehicles: VehicleReport[]): FlatVehicleRow[] {
  return vehicles.flatMap((v) =>
    v.items.map((item) => ({ vehicle_number: v.vehicle_number, ...item }))
  );
}
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

function getVehicleMts(v: FlatVehicleRow): number {
  return Number(v.total_quantity_in_mts ?? 0);
}

export default function DirectorDashboardPage() {
  const [data, setData] = useState<DirectorInventoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [vehicleReports, setVehicleReports] = useState<Partial<Record<DirectorStageKey, FlatVehicleRow[]>>>({});
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
            return [o.key, flattenVehicleReport(rows)] as const;
          })
        ),
      ]);
      setData(inventory);
      setVehicleReports(Object.fromEntries(reports) as Partial<Record<DirectorStageKey, FlatVehicleRow[]>>);
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

  function downloadReportExcel() {
    const workbook = XLSX.utils.book_new();
    const tableRows = rows.map((row) => [
      row.label.toUpperCase(),
      row.liter > 0 ? row.liter : "",
      row.mts > 0 ? row.mts : "",
    ]);
    const sheet = XLSX.utils.aoa_to_sheet([
      [`OIL STATUS ${dateStr}`, "", ""],
      ["STATUS", "IN LTR", "IN MTS"],
      ...tableRows,
      ["TOTAL", totals.liter, totals.mts],
    ]);

    sheet["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 2 } }];
    sheet["!cols"] = [{ wch: 28 }, { wch: 18 }, { wch: 14 }];

    const darkBlue = "1A3A6C";
    const borderColor = "CBD5E1";
    const headerBorderColor = "FFFFFF";
    const titleStyle = {
      font: { bold: true, color: { rgb: "FFFFFF" }, sz: 16 },
      fill: { fgColor: { rgb: darkBlue } },
      alignment: { horizontal: "center", vertical: "center" },
      border: {
        top: { style: "thin", color: { rgb: headerBorderColor } },
        bottom: { style: "thin", color: { rgb: headerBorderColor } },
        left: { style: "thin", color: { rgb: headerBorderColor } },
        right: { style: "thin", color: { rgb: headerBorderColor } },
      },
    };
    const headerStyle = {
      font: { bold: true, color: { rgb: "FFFFFF" } },
      fill: { fgColor: { rgb: darkBlue } },
      alignment: { horizontal: "center", vertical: "center" },
      border: {
        top: { style: "thin", color: { rgb: headerBorderColor } },
        bottom: { style: "thin", color: { rgb: headerBorderColor } },
        left: { style: "thin", color: { rgb: headerBorderColor } },
        right: { style: "thin", color: { rgb: headerBorderColor } },
      },
    };
    const bodyStyle = {
      border: {
        top: { style: "thin", color: { rgb: borderColor } },
        bottom: { style: "thin", color: { rgb: borderColor } },
        left: { style: "thin", color: { rgb: borderColor } },
        right: { style: "thin", color: { rgb: borderColor } },
      },
    };
    const footerStyle = {
      font: { bold: true, color: { rgb: "FFFFFF" } },
      fill: { fgColor: { rgb: darkBlue } },
      border: {
        top: { style: "thin", color: { rgb: headerBorderColor } },
        bottom: { style: "thin", color: { rgb: headerBorderColor } },
        left: { style: "thin", color: { rgb: headerBorderColor } },
        right: { style: "thin", color: { rgb: headerBorderColor } },
      },
    };

    ["A1", "B1", "C1"].forEach((cell) => {
      if (!sheet[cell]) sheet[cell] = { t: "s", v: "" };
      sheet[cell].s = titleStyle;
    });
    ["A2", "B2", "C2"].forEach((cell) => {
      sheet[cell].s = headerStyle;
    });

    for (let rowIndex = 3; rowIndex <= rows.length + 2; rowIndex += 1) {
      ["A", "B", "C"].forEach((col, colIndex) => {
        const cell = sheet[`${col}${rowIndex}`];
        if (!cell) return;
        cell.s = {
          ...bodyStyle,
          font: { bold: colIndex === 0 },
          alignment: { horizontal: colIndex === 0 ? "left" : "right" },
          numFmt: colIndex === 0 ? undefined : "#,##0",
        };
      });
    }

    const totalRow = rows.length + 3;
    ["A", "B", "C"].forEach((col, colIndex) => {
      const cell = sheet[`${col}${totalRow}`];
      if (!cell) return;
      cell.s = {
        ...footerStyle,
        alignment: { horizontal: colIndex === 0 ? "left" : "right" },
        numFmt: colIndex === 0 ? undefined : "#,##0",
      };
    });

    XLSX.utils.book_append_sheet(workbook, sheet, `Oil Status ${dateStr}`.slice(0, 31));
    XLSX.writeFile(workbook, `director-report-${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast.success("Director report Excel downloaded");
  }

  return (
    <div className="p-2.5 sm:p-4 md:p-6 space-y-5 sm:space-y-6 animate-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight">Director Dashboard</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">Inventory snapshot by stage</p>
        </div>
        <div className="flex w-full flex-wrap items-center justify-start sm:justify-end gap-2 sm:gap-3">
          <Button
            variant="outline"
            onClick={downloadReportExcel}
            disabled={loading}
            className="btn-press h-8 sm:h-9 gap-1.5 sm:gap-2 px-2.5 sm:px-3 rounded-lg sm:rounded-xl border-2 text-[10px] sm:text-xs"
          >
            <FileDown className="h-4 w-4" />
            Download Excel
          </Button>
          <Button
            variant={compactView ? "default" : "outline"}
            onClick={() => setCompactView(!compactView)}
            className="btn-press h-8 sm:h-9 gap-1.5 sm:gap-2 px-2.5 sm:px-3 rounded-lg sm:rounded-xl border-2 text-[10px] sm:text-xs"
          >
            {compactView ? (
              <><LayoutDashboard className="h-4 w-4" /> Dashboard</>
            ) : (
              <><FileSpreadsheet className="h-4 w-4" /> Report View</>
            )}
          </Button>
          <Button onClick={fetchData} disabled={loading} className="btn-press h-8 sm:h-9 gap-1.5 sm:gap-2 px-2.5 sm:px-3 rounded-lg sm:rounded-xl border-2 text-[10px] sm:text-xs">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            {loading ? "Loading..." : "Refresh"}
          </Button>
        </div>
      </div>

      {compactView ? (
        /* ── Compact Report View ─────────────────────────────── */
        <Card className="overflow-hidden border-0 shadow-lg w-full max-w-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-xs sm:text-lg" style={{ borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th
                    colSpan={3}
                    className="text-white text-center py-3 sm:py-5 px-3 sm:px-6 text-sm sm:text-2xl font-extrabold tracking-wide sm:tracking-[0.15em] uppercase"
                    style={{ backgroundColor: "#1a3a6c" }}
                  >
                    OIL STATUS {dateStr}
                  </th>
                </tr>
                <tr>
                  <th className="px-3 sm:px-6 py-2.5 sm:py-4 text-left font-extrabold text-[10px] sm:text-base uppercase tracking-wide sm:tracking-widest text-white" style={{ backgroundColor: "#1a3a6c", border: "1px solid rgba(255,255,255,0.15)", minWidth: 180 }}>STATUS</th>
                  <th className="px-3 sm:px-6 py-2.5 sm:py-4 text-right font-extrabold text-[10px] sm:text-base uppercase tracking-wide sm:tracking-widest text-white" style={{ backgroundColor: "#1a3a6c", border: "1px solid rgba(255,255,255,0.15)", minWidth: 130 }}>IN LTR</th>
                  <th className="px-3 sm:px-6 py-2.5 sm:py-4 text-right font-extrabold text-[10px] sm:text-base uppercase tracking-wide sm:tracking-widest text-white" style={{ backgroundColor: "#1a3a6c", border: "1px solid rgba(255,255,255,0.15)", minWidth: 110 }}>IN MTS</th>
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
                        <td className="px-3 sm:px-6 py-2.5 sm:py-4 font-semibold uppercase text-[11px] sm:text-base tracking-wide" style={{ border: "1px solid #cbd5e1" }}>
                          {row.label}
                        </td>
                        <td className="px-3 sm:px-6 py-2.5 sm:py-4 text-right tabular-nums text-xs sm:text-lg" style={{ border: "1px solid #cbd5e1" }}>
                          {row.liter > 0 ? fmtNum(row.liter) : <span className="text-slate-400">-</span>}
                        </td>
                        <td className="px-3 sm:px-6 py-2.5 sm:py-4 text-right tabular-nums text-xs sm:text-lg" style={{ border: "1px solid #cbd5e1" }}>
                          {row.mts > 0 ? fmtNum(row.mts) : <span className="text-slate-400">-</span>}
                        </td>
                      </tr>
                    ))}
              </tbody>
              <tfoot>
                <tr className="text-white font-extrabold">
                  <td className="px-3 sm:px-6 py-3 sm:py-5 text-[11px] sm:text-base uppercase tracking-wide sm:tracking-widest" style={{ backgroundColor: "#1a3a6c", border: "1px solid rgba(255,255,255,0.15)" }}>
                    TOTAL
                  </td>
                  <td className="px-3 sm:px-6 py-3 sm:py-5 text-right tabular-nums text-sm sm:text-xl" style={{ backgroundColor: "#1a3a6c", border: "1px solid rgba(255,255,255,0.15)" }}>
                    {loading ? "—" : fmtNum(totals.liter)}
                  </td>
                  <td className="px-3 sm:px-6 py-3 sm:py-5 text-right tabular-nums text-sm sm:text-xl" style={{ backgroundColor: "#1a3a6c", border: "1px solid rgba(255,255,255,0.15)" }}>
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
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-4">
            <Card className="border-none bg-blue-50/60 dark:bg-blue-950/20">
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] sm:text-sm font-bold uppercase tracking-wide sm:tracking-wider text-blue-600 dark:text-blue-400">Total Liter</p>
                  <Droplets className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-500" />
                </div>
                <p className="text-base sm:text-3xl font-extrabold mt-1 leading-tight">{loading ? "—" : fmtNum(totals.liter)}</p>
              </CardContent>
            </Card>
            <Card className="border-none bg-emerald-50/60 dark:bg-emerald-950/20">
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] sm:text-sm font-bold uppercase tracking-wide sm:tracking-wider text-emerald-600 dark:text-emerald-400">Total MTS</p>
                  <Scale className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-emerald-500" />
                </div>
                <p className="text-base sm:text-3xl font-extrabold mt-1 leading-tight">{loading ? "—" : fmtNum(totals.mts)}</p>
              </CardContent>
            </Card>
            <Card className="col-span-2 lg:col-span-1 border-none bg-violet-50/60 dark:bg-violet-950/20">
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] sm:text-sm font-bold uppercase tracking-wide sm:tracking-wider text-violet-600 dark:text-violet-400">Active Stages</p>
                  <PackageCheck className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-violet-500" />
                </div>
                <p className="text-base sm:text-3xl font-extrabold mt-1 leading-tight">
                  {loading ? "—" : rows.filter((r) => r.liter > 0 || r.mts > 0).length}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* ── Stage-Wise Inventory Table ───────────────────── */}
            <Card className="card-hover shimmer-hover">
              <CardHeader className="px-4 sm:px-6">
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                  Stage-Wise Inventory
                </CardTitle>
                <CardDescription className="text-[10px] sm:text-xs">Data source: `/director-inventorty/`</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border overflow-x-auto">
                  <table className="w-full text-xs sm:text-base">
                    <thead>
                      <tr className="bg-muted/50 border-b">
                        <th className="px-2.5 sm:px-4 py-2.5 sm:py-3 text-left text-[10px] sm:text-sm font-semibold uppercase tracking-wide sm:tracking-wider text-muted-foreground">Stage</th>
                        <th className="px-2.5 sm:px-4 py-2.5 sm:py-3 text-right text-[10px] sm:text-sm font-semibold uppercase tracking-wide sm:tracking-wider text-muted-foreground">Liter</th>
                        <th className="px-2.5 sm:px-4 py-2.5 sm:py-3 text-right text-[10px] sm:text-sm font-semibold uppercase tracking-wide sm:tracking-wider text-muted-foreground">MTS</th>
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
                            <td className="px-2.5 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-base font-medium">
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
                            <td className="px-2.5 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-base text-right tabular-nums">{loading ? "—" : fmtNum(row.liter)}</td>
                            <td className="px-2.5 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-base text-right tabular-nums">{loading ? "—" : fmtNum(row.mts)}</td>
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
                                            <td className="px-3 py-2 text-right tabular-nums">{fmtNum(Number(v.total_quantity_in_litre ?? 0))}</td>
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
                      <td className="px-2.5 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-base font-extrabold">Grand Total</td>
                      <td className="px-2.5 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-base text-right font-extrabold tabular-nums">{loading ? "—" : fmtNum(totals.liter)}</td>
                      <td className="px-2.5 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-base text-right font-extrabold tabular-nums">{loading ? "—" : fmtNum(totals.mts)}</td>
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
