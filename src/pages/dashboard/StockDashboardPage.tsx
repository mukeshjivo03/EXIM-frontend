import { Fragment, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  RefreshCw,
  Factory,
  PackageOpen,
  EyeOff,
  Eye,
  ChevronRight,
  Info,
  Printer,
} from "lucide-react";

import { getStockDashboard, type StockDashboardFilters, type StockDashboardResponse } from "@/api/dashboard";
import { getItemWiseTankSummary, type ItemWiseTankSummary } from "@/api/tank";
import { getErrorMessage } from "@/lib/errors";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Unit = "KG" | "MTS" | "LTR";

const UNIT_LABELS: Record<Unit, string> = { KG: "KG", MTS: "MTS", LTR: "Liters" };

/** Conversion factor from KG to target unit */
function convertUnit(kg: number, unit: Unit): number {
  if (unit === "MTS") return kg / 1000;
  if (unit === "LTR") return kg * 1.0989; // 1ltr = 1kg * 1.0989
  return kg;
}

function fmtNum(n: number, unit: Unit = "KG", roundingEnabled: boolean = true) {
  const val = convertUnit(n, unit);
  if (val === 0) return "0";
  if (roundingEnabled) return Math.round(val).toLocaleString("en-IN");
  return Number(val.toFixed(3)).toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  });
}

/** Convert liters to the selected display unit */
function convertFromLiters(liters: number, unit: Unit): number {
  if (unit === "KG") return liters / 1.0989;
  if (unit === "MTS") return (liters / 1.0989) / 1000;
  return liters;
}

function fmtLiters(n: number, unit: Unit, roundingEnabled: boolean = true) {
  const val = convertFromLiters(n, unit);
  if (val === 0) return "0";
  if (roundingEnabled) return Math.round(val).toLocaleString("en-IN");
  return Number(val.toFixed(3)).toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  });
}

function fmtAny(val: number, roundingEnabled: boolean) {
  if (val === 0) return "0";
  if (roundingEnabled) return Math.round(val).toLocaleString("en-IN");
  return Number(val.toFixed(3)).toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  });
}

function formatStatusLabel(status: string) {
  return status.replace(/_/g, " ");
}


/* ── status colour palette (cycles if >6 groups) ─────────────── */

const STATUS_PALETTE = [
  { bg: "bg-violet-100/80 dark:bg-violet-900/30", text: "text-violet-700 dark:text-violet-300", subBg: "bg-violet-50/60 dark:bg-violet-900/20" },
  { bg: "bg-sky-100/80 dark:bg-sky-900/30",       text: "text-sky-700 dark:text-sky-300",       subBg: "bg-sky-50/60 dark:bg-sky-900/20" },
  { bg: "bg-rose-100/80 dark:bg-rose-900/30",     text: "text-rose-700 dark:text-rose-300",     subBg: "bg-rose-50/60 dark:bg-rose-900/20" },
  { bg: "bg-teal-100/80 dark:bg-teal-900/30",     text: "text-teal-700 dark:text-teal-300",     subBg: "bg-teal-50/60 dark:bg-teal-900/20" },
  { bg: "bg-orange-100/80 dark:bg-orange-900/30", text: "text-orange-700 dark:text-orange-300", subBg: "bg-orange-50/60 dark:bg-orange-900/20" },
  { bg: "bg-pink-100/80 dark:bg-pink-900/30",     text: "text-pink-700 dark:text-pink-300",     subBg: "bg-pink-50/60 dark:bg-pink-900/20" },
] as const;

/* ── component ────────────────────────────────────────────────── */

export default function StockDashboardPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<StockDashboardResponse | null>(null);
  const [optionsData, setOptionsData] = useState<StockDashboardResponse | null>(null);
  const [tankSummary, setTankSummary] = useState<ItemWiseTankSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<StockDashboardFilters>({ rmcode: "", vendor: "", status: "" });
  
  // UX States
  const [hideZeroRows, setHideZeroRows] = useState(false);
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);
  const [hoveredCol, setHoveredCol] = useState<string | null>(null);

  const [unit, setUnit] = useState<Unit>(() => {
    const saved = localStorage.getItem("stock_dashboard_unit");
    return (saved === "KG" || saved === "MTS" || saved === "LTR") ? saved : "MTS";
  });

  const [roundingEnabled, setRoundingEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem("stock_dashboard_rounding");
    return saved === null ? true : saved === "true";
  });

  useEffect(() => {
    localStorage.setItem("stock_dashboard_unit", unit);
  }, [unit]);

  useEffect(() => {
    localStorage.setItem("stock_dashboard_rounding", String(roundingEnabled));
  }, [roundingEnabled]);

  const tankQtyMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of tankSummary?.items ?? []) {
      map.set(item.tank_item_code, item.quantity_in_liters);
    }
    return map;
  }, [tankSummary]);

  const tankNameMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const item of tankSummary?.items ?? []) {
      if (item.tank_item_name) {
        map.set(item.tank_item_code, item.tank_item_name);
      }
    }
    return map;
  }, [tankSummary]);

  const tankInFactoryTotal = tankSummary?.total_quantity ?? 0;

  async function fetchData(activeFilters: StockDashboardFilters = filters) {
    setLoading(true);
    try {
      const [res, tankData] = await Promise.all([
        getStockDashboard({ ...activeFilters, rounding: roundingEnabled }),
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
    async function initialLoad() {
      setLoading(true);
      try {
        const [res, tankData] = await Promise.all([
          getStockDashboard({ rounding: roundingEnabled }),
          getItemWiseTankSummary(),
        ]);
        setData(res);
        setOptionsData(res);
        setTankSummary(tankData);
      } catch (err) {
        toast.error(getErrorMessage(err, "Failed to load stock dashboard"));
      } finally {
        setLoading(false);
      }
    }
    initialLoad();
  }, [roundingEnabled]);

  const hasFilters = Boolean(filters.rmcode || filters.vendor || filters.status);

  const availableRmItems = useMemo(() => {
    const source = optionsData ?? data;
    if (!source) return [];
    const seen = new Set<string>();
    return source.items
      .filter((item) => { if (seen.has(item.item_code)) return false; seen.add(item.item_code); return true; })
      .sort((a, b) => (a.item_name || a.item_code).localeCompare(b.item_name || b.item_code));
  }, [optionsData, data]);

  const availableStatuses = useMemo(() => {
    const source = optionsData ?? data;
    if (!source) return [];
    return [
      ...new Set(
        Object.keys(source.totals.status_vendor_totals)
          .map((key) => key.split("__")[0])
          .filter(Boolean)
      ),
    ].sort();
  }, [optionsData, data]);

  const availableVendors = useMemo(() => {
    const source = optionsData ?? data;
    if (!source) return [];
    return [
      ...new Set(
        Object.keys(source.totals.status_vendor_totals)
          .map((key) => key.split("__")[1])
          .filter(Boolean)
      ),
    ].sort();
  }, [optionsData, data]);

  function updateFilter(patch: Partial<StockDashboardFilters>) {
    const next = { ...filters, ...patch };
    setFilters(next);
    fetchData(next);
  }

  function clearFilters() {
    const cleared: StockDashboardFilters = { rmcode: "", vendor: "", status: "" };
    setFilters(cleared);
    fetchData(cleared);
  }

  /* ── Calculations & Derived Data ── */

  const colKeys = useMemo(() => {
    if (!data) return [];
    const keys = Object.keys(data.totals.status_vendor_totals);
    // When filtering by a specific status, show all returned columns as-is.
    // In the default unfiltered view, hide COMPLETED / DELIVERED to keep the matrix tidy.
    if (filters.status) return keys;
    return keys.filter(
      (key) =>
        !key.toLowerCase().startsWith("completed__") &&
        !key.toLowerCase().startsWith("delivered__")
    );
  }, [data, filters.status]);

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

  // When filtering by status, In Factory and Outside Factory are irrelevant — hide them
  const showFactoryCols = !filters.status;





  // Max value for heatmapping
  const maxCellValue = useMemo(() => {
    if (!data) return 0;
    let max = 0;
    data.items.forEach(item => {
      max = Math.max(max, item.outside_factory, ...Object.values(item.status_data));
    });
    return max;
  }, [data]);

  // Top Insights
  const insights = useMemo(() => {
    if (!data) return null;
    const topItem = [...data.items].sort((a, b) => b.total - a.total)[0];
    return { topItem };
  }, [data]);

  // Filtered rows based on hideZeroRows — includes tank-only items
  const displayItems = useMemo(() => {
    if (!data) return [];

    // When any filter is active, show exactly what the API returned — no synthetic tank rows
    if (filters.status || filters.rmcode || filters.vendor) {
      if (!hideZeroRows) return data.items;
      return data.items.filter((item) => item.total > 0);
    }

    // Build set of item codes already in the stock table
    const stockItemCodes = new Set(data.items.map((i) => i.item_code));

    // Synthetic rows for tank items not in stock table
    const tankOnlyRows: typeof data.items = (tankSummary?.items ?? [])
      .filter((t) => !stockItemCodes.has(t.tank_item_code))
      .map((t) => ({
        item_code: t.tank_item_code,
        item_name: t.tank_item_name || "",
        in_factory: 0,
        outside_factory: 0,
        status_data: {},
        total: 0,
      }));

    const merged = [...data.items, ...tankOnlyRows];

    if (!hideZeroRows) return merged;
    return merged.filter(item => {
      const tankVal = tankQtyMap.get(item.item_code) ?? 0;
      return tankVal > 0 || item.total > 0;
    });
  }, [data, hideZeroRows, tankQtyMap, tankSummary, filters.status, filters.rmcode, filters.vendor]);

  /* ── Print ───────────────────────────────────────────────── */

  /** Strip RM prefix for cleaner print display: RM000 → , RM00 → , RM0 → , RM → */
  function printRmCode(code: string): string {
    return code.replace(/^RM0{0,3}/, "");
  }

  function handlePrint() {
    if (!data) return;

    const EU: Unit = "MTS";
    const vendorCols = statusGroups.flatMap((g) =>
      g.vendors.map(({ key, vendor }) => ({ key, vendor, status: g.status }))
    );

    const td = (content: string | number, style = "") =>
      `<td style="border:1px solid #ccc;padding:5px 8px;text-align:center;${style}">${content}</td>`;
    const th = (content: string | number, extra = "") =>
      `<th style="border:1px solid #999;padding:6px 8px;text-align:center;${extra}">${content}</th>`;

    const fmt = (val: number) => fmtAny(val, roundingEnabled);

    // Row 0 — group headers (pink)
    let row0Cells = th("In Factory", "background:#F4CCCC;font-weight:bold;") +
      th("Qty MTS", "background:#F4CCCC;font-weight:bold;") +
      th("Outside Factory", "background:#F4CCCC;font-weight:bold;");
    for (const group of statusGroups) {
      row0Cells += `<th colspan="${group.vendors.length}" style="border:1px solid #999;padding:6px 8px;text-align:center;background:#F4CCCC;font-weight:bold;">${group.status.replace(/_/g, " ")}</th>`;
    }
    row0Cells += th("Total MTS", "background:#F4CCCC;font-weight:bold;");

    // Row 1 — sub-headers (green)
    let row1Cells = th("Name", "background:#B6D7A8;font-weight:bold;") +
      th("Qty MTS", "background:#B6D7A8;font-weight:bold;") +
      th("Outside Factory", "background:#B6D7A8;font-weight:bold;");
    for (const { vendor } of vendorCols) {
      row1Cells += th(vendor, "background:#B6D7A8;font-weight:bold;");
    }
    row1Cells += th("", "background:#B6D7A8;");

    // Data rows — custom fixed order with separator gaps for print
    const PRINT_ORDER: (string | "__GAP__")[] = [
      "RM0CDRO", "RM00C01", "RM00CPC", "RM00C02",
      "RM00SBR", "RM00SBD", "RM0SB02",
      "RMMKG01", "RM0GNCP",
      "RM000SF", "RM00SF2", "RM00MDO", "RM000MR",
      "RMMKG02", "RM00GNR", "RMGNR02", "RM00GD",
      "RM00RBR", "RM00RBD", "RM0RB02",
      "RM00CSR", "RMCSR02", "RM00VNP", "RM0CCNT",
      "RM0SESM", "RMSESMT",
      "__GAP__",
      "RM00P02", "RM00P03", "RM0EV02", "RM0EL02", "RMSOLIVE",
      "__GAP__",
      "RM00P01", "RM0EL01", "RM0EV01", "RM0HOSF",
    ];

    const itemMap = new Map(displayItems.map((item) => [item.item_code, item]));
    const totalCols = 3 + vendorCols.length + 1; // name + infactory + outside + vendors + total

    // Build ordered list: items from PRINT_ORDER first, then any remaining items
    const orderedCodes = PRINT_ORDER.filter((c) => c === "__GAP__" || itemMap.has(c));
    const orderedSet = new Set(PRINT_ORDER.filter((c) => c !== "__GAP__"));
    const extraItems = displayItems.filter((item) => !orderedSet.has(item.item_code));

    function buildItemRow(item: typeof displayItems[0]) {
      const tankVal  = tankQtyMap.get(item.item_code) ?? 0;
      const statusKg = colKeys.reduce((sum, k) => sum + (item.status_data[k] ?? 0), 0);
      const rowTotal = convertFromLiters(tankVal, EU) + convertUnit(item.outside_factory + statusKg, EU);

      let cells = td(printRmCode(item.item_code), "font-weight:bold;text-align:left;") +
        td(fmt(convertFromLiters(tankVal, EU))) +
        td(fmt(convertUnit(item.outside_factory, EU)));
      for (const { key } of vendorCols) {
        cells += td(fmt(convertUnit(item.status_data[key] ?? 0, EU)));
      }
      cells += td(fmt(rowTotal), "font-weight:bold;");
      return `<tr>${cells}</tr>`;
    }

    const gapRow = `<tr><td colspan="${totalCols}" style="border:none;height:12px;"></td></tr>`;

    let dataRowsHtml = orderedCodes.map((code) => {
      if (code === "__GAP__") return gapRow;
      const item = itemMap.get(code);
      return item ? buildItemRow(item) : "";
    }).join("");

    // Append any items not in the predefined order
    if (extraItems.length > 0) {
      dataRowsHtml += gapRow + extraItems.map(buildItemRow).join("");
    }

    // Grand total row
    const gtTotal = convertFromLiters(tankInFactoryTotal, EU) +
      convertUnit((data.totals.outside_factory ?? 0) + colKeys.reduce((s, k) => s + (data.totals.status_vendor_totals[k] ?? 0), 0), EU);

    let gtCells = td("Grand Total", "background:#CFE2F3;font-weight:bold;") +
      td(fmt(convertFromLiters(tankInFactoryTotal, EU)), "background:#CFE2F3;font-weight:bold;") +
      td(fmt(convertUnit(data.totals.outside_factory, EU)), "background:#CFE2F3;font-weight:bold;");
    for (const group of statusGroups) {
      const st = data.totals.status_totals?.[group.status] ??
        group.vendors.reduce((sum, v) => sum + (data.totals.status_vendor_totals[v.key] ?? 0), 0);
      gtCells += `<td colspan="${group.vendors.length}" style="border:1px solid #ccc;padding:5px 8px;text-align:center;background:#CFE2F3;font-weight:bold;">${fmt(convertUnit(st, EU))}</td>`;
    }
    gtCells += td(fmt(gtTotal), "background:#CFE2F3;font-weight:bold;");

    const html = `<!DOCTYPE html><html><head><title>Stock Dashboard</title>
<style>
  body { font-family: Arial, sans-serif; font-size: 11px; margin: 16px; }
  h2 { margin-bottom: 8px; }
  table { border-collapse: collapse; width: 100%; }
  @media print { body { margin: 8px; } }
</style></head><body>
<h2>Stock Dashboard — MTS — ${new Date().toLocaleDateString("en-IN")}</h2>
<table>
  <thead>
    <tr>${row0Cells}</tr>
    <tr>${row1Cells}</tr>
  </thead>
  <tbody>${dataRowsHtml}<tr>${gtCells}</tr></tbody>
</table>
</body></html>`;

    const win = window.open("", "_blank");
    if (!win) { toast.error("Pop-up blocked. Allow pop-ups and try again."); return; }
    win.document.write(html);
    win.document.close();
    win.focus();
    win.print();
  }

  return (
    <div className="p-3 sm:p-4 md:p-6 space-y-6 lg:space-y-8 animate-page pb-20">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl tracking-tight">Stock Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Multi-dimensional inventory analytics</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-muted/50 p-1 rounded-xl border border-foreground/30/50">
            <Button 
              variant={roundingEnabled ? "secondary" : "ghost"} 
              size="sm" 
              className="h-8 rounded-lg gap-1.5 text-xs uppercase tracking-wider"
              onClick={() => setRoundingEnabled(!roundingEnabled)}
            >
              {roundingEnabled ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
              {roundingEnabled ? "Rounding On" : "Rounding Off"}
            </Button>
            <div className="w-[1px] h-4 bg-border mx-1" />
            <Button 
              variant={hideZeroRows ? "secondary" : "ghost"} 
              size="sm" 
              className="h-8 rounded-lg gap-1.5 text-xs uppercase tracking-wider"
              onClick={() => setHideZeroRows(!hideZeroRows)}
            >
              {hideZeroRows ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
              {hideZeroRows ? "Showing Active" : "Hide Empty"}
            </Button>
            <div className="w-[1px] h-4 bg-border mx-1" />
            <div className="flex items-center">
              {(["KG", "MTS", "LTR"] as Unit[]).map((u) => (
                <button
                  key={u}
                  onClick={() => setUnit(u)}
                  className={cn(
                    "px-3 py-1 text-xs uppercase tracking-wider transition-all rounded-lg",
                    unit === u ? "bg-primary text-primary-foreground shadow-lg" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {UNIT_LABELS[u]}
                </button>
              ))}
            </div>
          </div>
          <Button variant="outline" className="btn-press gap-2 rounded-xl border-2" onClick={() => fetchData(filters)} disabled={loading}>
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            Refresh
          </Button>
          <Button variant="outline" className="btn-press gap-2 rounded-xl border-2" onClick={handlePrint} disabled={!data}>
            <Printer className="h-4 w-4" />
            Print
          </Button>
        </div>
      </div>

      {/* ── Summary & Insights ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="card-hover border-none bg-blue-50/50 dark:bg-blue-950/20 shadow-sm">
          <CardContent className="p-5 flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-wider text-blue-600 dark:text-blue-400">In Factory</p>
              <Factory className="h-4 w-4 text-blue-500" />
            </div>
            <h3 className="text-2xl font-bold">{data ? fmtLiters(tankInFactoryTotal, unit, roundingEnabled) : "—"}</h3>
            <p className="text-xs text-muted-foreground uppercase">{UNIT_LABELS[unit]} Volume</p>
          </CardContent>
        </Card>

        <Card className="card-hover border-none bg-amber-50/50 dark:bg-amber-950/20 shadow-sm">
          <CardContent className="p-5 flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-wider text-amber-600 dark:text-amber-400">Outside Factory</p>
              <PackageOpen className="h-4 w-4 text-amber-500" />
            </div>
            <h3 className="text-2xl font-bold">{data ? fmtNum(data.summary.outside_factory_total, unit, roundingEnabled) : "—"}</h3>
            <p className="text-xs text-muted-foreground uppercase">Logistical Stock</p>
          </CardContent>
        </Card>

        {/* Insight Badges */}
        <Card className="card-hover border-none bg-indigo-50/50 dark:bg-indigo-950/20 shadow-sm overflow-hidden relative group">
          <CardContent className="p-5 flex flex-col gap-1">
            <p className="text-xs uppercase tracking-wider text-indigo-600 dark:text-indigo-400">Top Item</p>
            {loading ? <Skeleton className="h-6 w-20" /> : (
              <h3 className="text-xl font-bold truncate">{(insights?.topItem?.item_name || insights?.topItem?.item_code) ?? "—"}</h3>
            )}
            <div className="flex items-center gap-1.5">
              <Badge variant="outline" className="text-[10px] h-4 bg-white/50 dark:bg-black/20 border-none px-1.5">BY VOLUME</Badge>
            </div>
            <Info className="absolute -bottom-2 -right-2 h-12 w-12 text-indigo-500/10 group-hover:scale-110 transition-transform" />
          </CardContent>
        </Card>
      </div>

      {/* ── Filters ── */}
      <Card className="border shadow-sm">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-xs uppercase tracking-wider text-muted-foreground">RM Code</label>
              <select
                className="w-full h-10 rounded-md border bg-background px-3 text-sm"
                value={filters.rmcode ?? ""}
                onChange={(e) => updateFilter({ rmcode: e.target.value })}
                disabled={loading}
              >
                <option value="">All Items</option>
                {availableRmItems.map((item) => (
                  <option key={item.item_code} value={item.item_code}>{item.item_name || item.item_code}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs uppercase tracking-wider text-muted-foreground">Vendor</label>
              <select
                className="w-full h-10 rounded-md border bg-background px-3 text-sm"
                value={filters.vendor ?? ""}
                onChange={(e) => updateFilter({ vendor: e.target.value })}
                disabled={loading}
              >
                <option value="">All Vendors</option>
                {availableVendors.map((vendor) => (
                  <option key={vendor} value={vendor}>{vendor}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs uppercase tracking-wider text-muted-foreground">Status</label>
              <select
                className="w-full h-10 rounded-md border bg-background px-3 text-sm"
                value={filters.status ?? ""}
                onChange={(e) => updateFilter({ status: e.target.value })}
                disabled={loading}
              >
                <option value="">All Statuses</option>
                {availableStatuses.map((status) => (
                  <option key={status} value={status}>{formatStatusLabel(status)}</option>
                ))}
              </select>
            </div>
          </div>
          {hasFilters && (
            <div className="mt-4">
              <Button variant="outline" size="sm" onClick={clearFilters} disabled={loading}>
                Clear Filters
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Table Matrix ── */}
      <Card className="border shadow-xl bg-card overflow-hidden">
        <CardHeader className="border-b bg-muted/30">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Inventory Matrix</CardTitle>
              <CardDescription className="text-xs">RM × Status × Vendor Pivot</CardDescription>
            </div>
            <div className="flex items-center gap-4 text-xs uppercase tracking-wider text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <div className="h-2 w-2 rounded-full bg-blue-500/20 border border-blue-500/50" />
                <span>Hover Row/Col to highlight</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-2 w-2 rounded-full bg-primary/40 shadow-[0_0_8px_rgba(var(--primary),0.4)]" />
                <span>Heatmap intensity</span>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-4">
              {Array.from({ length: 10 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : (
            <div
              className="overflow-x-auto scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent"
              style={{ scrollSnapType: "x proximity", scrollPaddingLeft: 190 }}
            >
              <table className="w-full table-fixed text-base" style={{ borderCollapse: "separate", borderSpacing: 0 }}>
                <colgroup>
                  <col style={{ width: 190 }} />
                  {showFactoryCols && <>
                    <col style={{ width: 120 }} />
                    <col style={{ width: 2 }} />
                    <col style={{ width: 120 }} />
                    <col style={{ width: 2 }} />
                  </>}
                  {/* status group cols + inter-group spacers */}
                  {statusGroups.map((group, gi) => (
                    <Fragment key={group.status}>
                      {group.vendors.map(({ key }) => <col key={key} style={{ width: 145 }} />)}
                      {gi < statusGroups.length - 1 && <col style={{ width: 2 }} />}
                    </Fragment>
                  ))}
                  <col style={{ width: 170 }} />
                </colgroup>

                {/* ── SPACER HELPER ─────────────────────────── */}
                {/* reusable spacer cell styles applied inline below */}

                <thead>
                  {/* Row 1 — Status / column group headers */}
                  <tr className="bg-muted/40 border-b">
                    <th className="sticky left-0 z-30 bg-muted/60 backdrop-blur-md px-4 py-4 text-center uppercase tracking-wider border border-foreground/30 text-base" rowSpan={2}>
                      RM NAME
                    </th>
                    {showFactoryCols && <>
                      <th
                        onClick={() => navigate("/stock-dashboard/IN_FACTORY")}
                        onMouseEnter={() => setHoveredCol("IN_FACTORY")}
                        onMouseLeave={() => setHoveredCol(null)}
                        className={cn(
                          "px-2 py-3 text-center border border-foreground/30 cursor-pointer transition-colors group",
                          hoveredCol === "IN_FACTORY" ? "bg-green-50/60 dark:bg-green-900/20" : "bg-muted/20"
                        )}
                        style={{ scrollSnapAlign: "start" }}
                      >
                        <div className="flex flex-col items-center gap-1">
                          <span className="text-green-600 text-base uppercase tracking-wider font-semibold">In Factory</span>
                          <ChevronRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-all text-green-500" />
                        </div>
                      </th>
                      {/* spacer */}
                      <th className="p-0 bg-background border-x-0" rowSpan={2} />
                      <th
                        onClick={() => navigate("/stock-dashboard/OUT_SIDE_FACTORY")}
                        onMouseEnter={() => setHoveredCol("OUT_SIDE_FACTORY")}
                        onMouseLeave={() => setHoveredCol(null)}
                        className={cn(
                          "px-2 py-3 text-center border border-foreground/30 cursor-pointer transition-colors group",
                          hoveredCol === "OUT_SIDE_FACTORY" ? "bg-amber-50/60 dark:bg-amber-900/20" : "bg-muted/20"
                        )}
                      >
                        <div className="flex flex-col items-center gap-1">
                          <span className="text-amber-600 text-base uppercase tracking-wider font-semibold">Outside</span>
                          <ChevronRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-all text-amber-500" />
                        </div>
                      </th>
                      {/* spacer */}
                      <th className="p-0 bg-background border-x-0" rowSpan={2} />
                    </>}
                    {/* status groups */}
                    {statusGroups.map((group, gi) => {
                      const palette = STATUS_PALETTE[gi % STATUS_PALETTE.length];
                      return (
                        <Fragment key={group.status}>
                          <th
                            colSpan={group.vendors.length}
                            onClick={() => navigate(`/stock-dashboard/${group.status}`)}
                            onMouseEnter={() => setHoveredCol(group.status)}
                            onMouseLeave={() => setHoveredCol(null)}
                            className={cn(
                              "px-2 py-3 text-center border border-foreground/30 cursor-pointer transition-all hover:brightness-95 group text-base font-semibold uppercase tracking-wider",
                              palette.bg,
                              palette.text,
                              hoveredCol === group.status && "ring-2 ring-inset ring-current/30 z-10 shadow-lg"
                            )}
                            style={{ scrollSnapAlign: "start" }}
                          >
                            <div className="flex items-center justify-center gap-1">
                              <span className="truncate">{group.status.replace(/_/g, " ")}</span>
                              <ChevronRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-all" />
                            </div>
                          </th>
                          {gi < statusGroups.length - 1 && (
                            <th className="p-0 bg-background border-x-0" rowSpan={2} />
                          )}
                        </Fragment>
                      );
                    })}
                    <th className="px-4 py-3 text-center bg-muted/40 border border-foreground/30 uppercase tracking-wider text-base font-semibold" rowSpan={2}>
                      TOTAL
                    </th>
                  </tr>
                  {/* Row 2 — Vendor sub-headers */}
                  <tr className="border-b shadow-sm">
                    {showFactoryCols && <>
                      <th className="border border-foreground/30 bg-muted/20 py-1 text-sm text-center text-muted-foreground uppercase" />
                      <th className="border border-foreground/30 bg-muted/20 py-1 text-sm text-center text-muted-foreground uppercase" />
                    </>}
                    {statusGroups.map((group, gi) => {
                      const palette = STATUS_PALETTE[gi % STATUS_PALETTE.length];
                      return group.vendors.map(({ key, vendor }) => (
                        <th
                          key={key}
                          title={vendor}
                          onMouseEnter={() => setHoveredCol(key)}
                          onMouseLeave={() => setHoveredCol(null)}
                          className={cn(
                            "px-2 py-2 text-center text-base font-semibold truncate transition-colors uppercase tracking-wider border border-foreground/30",
                            palette.subBg,
                            palette.text,
                            hoveredCol === key ? "brightness-90" : ""
                          )}
                        >
                          {vendor}
                        </th>
                      ));
                    })}
                  </tr>
                </thead>

                <tbody>
                  {displayItems.map((item) => {
                    const tankVal = tankQtyMap.get(item.item_code) ?? 0;
                    const statusKg = colKeys.reduce((sum, k) => sum + (item.status_data[k] ?? 0), 0);
                    const grandTotal = showFactoryCols
                      ? convertFromLiters(tankVal, unit) + convertUnit(item.outside_factory + statusKg, unit)
                      : convertUnit(statusKg, unit);
                    return (
                      <tr
                        key={item.item_code}
                        onMouseEnter={() => setHoveredRow(item.item_code)}
                        onMouseLeave={() => setHoveredRow(null)}
                        className={cn(
                          "border-b transition-all group/row",
                          "bg-card",
                          hoveredRow === item.item_code ? "bg-muted/30 shadow-inner scale-[1.002] z-10 relative" : ""
                        )}
                      >
                        <td className={cn(
                          "sticky left-0 z-20 px-4 py-3 text-sm text-left border border-foreground/30 transition-colors",
                          hoveredRow === item.item_code ? "bg-primary text-primary-foreground shadow-xl" : "bg-card"
                        )}>
                          {item.item_name || tankNameMap.get(item.item_code) || item.item_code}
                        </td>
                        {showFactoryCols && <>
                          {/* IN FACTORY */}
                          <td className="px-2 py-3 text-center tabular-nums transition-all border border-foreground/30 bg-background">
                            {tankVal > 0
                              ? <span className="text-blue-600 dark:text-blue-400">{fmtLiters(tankVal, unit, roundingEnabled)}</span>
                              : <span className="opacity-20">·</span>}
                          </td>
                          {/* spacer */}
                          <td className="p-0 bg-background border-x-0" />
                          {/* OUTSIDE */}
                          <td className="px-2 py-3 text-center tabular-nums transition-all border border-foreground/30 bg-background">
                            {item.outside_factory > 0
                              ? <span className="text-amber-600 dark:text-amber-400">{fmtNum(item.outside_factory, unit, roundingEnabled)}</span>
                              : <span className="opacity-20">·</span>}
                          </td>
                          {/* spacer */}
                          <td className="p-0 bg-background border-x-0" />
                        </>}
                        {/* status groups */}
                        {statusGroups.map((group, gi) => (
                          <Fragment key={group.status}>
                            {group.vendors.map(({ key }) => {
                              const val = item.status_data[key] ?? 0;
                              const intensity = maxCellValue > 0 ? val / maxCellValue : 0;
                              const status = key.split("__")[0];
                              return (
                                <td
                                  key={key}
                                  className={cn(
                                    "px-2 py-3 text-center tabular-nums transition-all relative group/cell border border-foreground/30",
                                    hoveredCol === key || hoveredCol === status ? "bg-muted/50" : ""
                                  )}
                                >
                                  {val > 0 ? (
                                    <>
                                      <div className="absolute inset-0 bg-primary pointer-events-none transition-opacity duration-500" style={{ opacity: intensity * 0.4 }} />
                                      <span className="relative z-10 group-hover/cell:scale-110 transition-transform inline-block">{fmtNum(val, unit, roundingEnabled)}</span>
                                    </>
                                  ) : <span className="opacity-20">·</span>}
                                </td>
                              );
                            })}
                            {gi < statusGroups.length - 1 && (
                              <td className="p-0 bg-background border-x-0" />
                            )}
                          </Fragment>
                        ))}
                        <td className="px-4 py-3 text-center tabular-nums text-base font-semibold bg-muted/20 border border-foreground/30">
                          {fmtAny(grandTotal, roundingEnabled)}
                        </td>
                      </tr>
                    );
                  })}

                  {/* Grand Total Row */}
                  <tr className="bg-muted/50 text-base border-t-2 border-border font-semibold">
                    <td className="sticky left-0 z-30 bg-muted/60 px-4 py-4 text-center border border-foreground/30 uppercase tracking-wider">Grand Total</td>
                    {showFactoryCols && <>
                      <td className="px-2 py-4 text-center tabular-nums border border-foreground/30 text-blue-600 dark:text-blue-400">
                        {fmtLiters(tankInFactoryTotal, unit, roundingEnabled)}
                      </td>
                      <td className="p-0 bg-background border-x-0" />
                      <td className="px-2 py-4 text-center tabular-nums border border-foreground/30 text-amber-600 dark:text-amber-400">
                        {fmtNum(data?.totals.outside_factory ?? 0, unit, roundingEnabled)}
                      </td>
                      <td className="p-0 bg-background border-x-0" />
                    </>}
                    {statusGroups.map((group, gi) => (
                      <Fragment key={group.status}>
                        <td
                          colSpan={group.vendors.length}
                          className="px-2 py-4 text-center tabular-nums border border-foreground/30 font-semibold"
                        >
                          {fmtNum(
                            data?.totals.status_totals?.[group.status] ??
                            group.vendors.reduce(
                              (sum, v) => sum + (data?.totals.status_vendor_totals[v.key] ?? 0),
                              0
                            ),
                            unit,
                            roundingEnabled
                          )}
                        </td>
                        {gi < statusGroups.length - 1 && (
                          <td className="p-0 bg-background border-x-0" />
                        )}
                      </Fragment>
                    ))}
                    <td className="px-4 py-4 text-center tabular-nums bg-primary text-primary-foreground font-bold border border-foreground/30">
                      {fmtAny(
                        showFactoryCols
                          ? convertFromLiters(tankInFactoryTotal, unit) +
                            convertUnit(
                              (data?.totals.outside_factory ?? 0) +
                              colKeys.reduce((sum, k) => sum + (data?.totals.status_vendor_totals[k] ?? 0), 0),
                              unit
                            )
                          : convertUnit(data?.totals.grand_total ?? 0, unit),
                        roundingEnabled
                      )}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
