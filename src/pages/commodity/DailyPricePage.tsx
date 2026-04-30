import { useEffect, useMemo, useState } from "react";
import { format, parseISO, subDays } from "date-fns";
import { toast } from "sonner";
import { toastApiError } from "@/lib/errors";
import {
  RefreshCw,
  Save,
  ExternalLink,
  PackageOpen,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Search,
  AlertCircle,
  BarChart3,
  Hash,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

import {
  fetchDailyPrices,
  saveDailyPrices,
  getDailyPricesByDate,
  getDailyPricesByRange,
  getPriceTrends,
  type DbDailyPrice,
  type PriceTrendsResponse,
} from "@/api/dailyPrice";
import Guard from "@/components/Guard";
import { useHasPermission } from "@/hooks/useHasPermission";
import { useDailyPrice } from "@/context/DailyPriceContext";
import { SummaryCard } from "@/components/SummaryCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

/* ── constants ───────────────────────────────────────────── */

const LINE_COLORS = [
  "#2563eb", "#f97316", "#16a34a", "#dc2626",
  "#8b5cf6", "#0891b2", "#d946ef", "#ca8a04",
  "#059669", "#e11d48", "#7c3aed", "#ea580c",
];


function fmtPrice(v: number | string, decimals = 2): string {
  return Number(v).toLocaleString("en-IN", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

/* ── Delta badge component ───────────────────────────────── */

function DeltaBadge({ current, previous }: { current: number; previous: number | null }) {
  if (previous === null) return null;
  const diff = current - previous;
  if (Math.abs(diff) < 0.001) {
    return (
      <span className="inline-flex items-center gap-1 font-bold px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground">
        <Minus className="h-3.5 w-3.5" />₹0.00
      </span>
    );
  }
  const isUp = diff > 0;
  return (
    <span className={cn(
      "inline-flex items-center gap-1 font-bold px-1.5 py-0.5 rounded-md",
      isUp ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
    )}>
      {isUp ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
      ₹{Math.abs(diff).toFixed(2)}
    </span>
  );
}

/* ── Heatmap helper ──────────────────────────────────────── */

function heatmapBg(val: number, min: number, max: number): string {
  if (max === min) return "";
  const intensity = (val - min) / (max - min);
  // High = green tint, Low = red tint
  if (intensity > 0.7) return `rgba(34, 197, 94, ${(intensity - 0.5) * 0.15})`;
  if (intensity < 0.3) return `rgba(239, 68, 68, ${(0.5 - intensity) * 0.12})`;
  return "";
}

/* ── page ─────────────────────────────────────────────────── */

export default function DailyPricePage() {
  const { hasPermission } = useHasPermission();
  const canFetch =
    hasPermission("dailyprice", "fetch") ||
    hasPermission("dailyprice", "sync") ||
    hasPermission("dailyprice", "change");
  const canSave =
    hasPermission("dailyprice", "add") ||
    hasPermission("dailyprice", "change") ||
    hasPermission("dailyprice", "edit");

  const { prices, count, fetched, setPrices, setCount, setFetched } = useDailyPrice();
  const [fetching, setFetching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [justFetched, setJustFetched] = useState(false);

  // Trends chart
  const [trends, setTrends] = useState<PriceTrendsResponse | null>(null);
  const [trendsLoading, setTrendsLoading] = useState(true);
  const [selectedLabels, setSelectedLabels] = useState<Set<string>>(new Set());
  const [trendsStartDate, setTrendsStartDate] = useState(format(subDays(new Date(), 7), "yyyy-MM-dd"));
  const [trendsEndDate, setTrendsEndDate] = useState(format(new Date(), "yyyy-MM-dd"));

  // Saved prices by range
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [rangeData, setRangeData] = useState<DbDailyPrice[]>([]);
  const [rangeLoading, setRangeLoading] = useState(false);
  const [rangeCommodity, setRangeCommodity] = useState("");

  // Search filter
  const [search, setSearch] = useState("");

  // Classic = original Excel-style view; default = aesthetic
  const [classicMode, setClassicMode] = useState(false);
  const [savedClassicMode, setSavedClassicMode] = useState(false);
  const [compareMode, setCompareMode] = useState(false);

  // Previous day prices for delta calculation
  const [prevDayPrices, setPrevDayPrices] = useState<DbDailyPrice[]>([]);

  /* ── data loading ──────────────────────────────────────── */

  async function loadTrends(start?: string, end?: string) {
    setTrendsLoading(true);
    try {
      const data = await getPriceTrends(start || trendsStartDate, end || trendsEndDate);
      setTrends(data);
      // Default: select first commodity
      if (data.datasets.length > 0 && selectedLabels.size === 0) {
        const defaultLabel = data.datasets.find((d) => d.label.toLowerCase().includes("soya refined") && d.label.toLowerCase().includes("resale"));
        setSelectedLabels(new Set(defaultLabel ? [defaultLabel.label] : [data.datasets[0].label]));
      }
    } catch { /* non-critical */ }
    finally { setTrendsLoading(false); }
  }

  async function loadPrevDayPrices() {
    try {
      const yesterdayIso = format(subDays(new Date(), 1), "yyyy-MM-dd");
      const yesterdayData = await getDailyPricesByDate(yesterdayIso);

      if (yesterdayData.length > 0) {
        setPrevDayPrices(yesterdayData);
        return;
      }

      // Fallback: if yesterday is missing, use nearest previous available entry per commodity.
      const fromIso = format(subDays(new Date(), 30), "yyyy-MM-dd");
      const history = await getDailyPricesByRange(fromIso, yesterdayIso);
      const nearestByCommodity = new Map<string, DbDailyPrice>();
      for (const row of history) {
        const existing = nearestByCommodity.get(row.commodity_name);
        if (!existing || row.date > existing.date) {
          nearestByCommodity.set(row.commodity_name, row);
        }
      }
      setPrevDayPrices(Array.from(nearestByCommodity.values()));
    } catch { /* non-critical */ }
  }

  // Auto-fetch on page load if not already cached
  useEffect(() => {
    loadTrends();
    loadPrevDayPrices();
    if (!fetched) {
      handleFetch();
    }
  }, []);

  /* ── handlers ──────────────────────────────────────────── */

  async function handleFetch() {
    setFetching(true);
    try {
      const res = await fetchDailyPrices();
      setPrices(res.preview_data);
      setCount(res.count);
      setFetched(true);
      setJustFetched(true);
      setTimeout(() => setJustFetched(false), 2000);
      toast.success(`Fetched ${res.count} commodity prices`);
    } catch (err) {
      toastApiError(err, "Failed to fetch prices");
    } finally {
      setFetching(false);
    }
  }

  async function handleRangeLoad() {
    if (!fromDate || !toDate) { toast.error("Please select both from and to dates."); return; }
    setRangeLoading(true);
    try {
      const data = await getDailyPricesByRange(fromDate, toDate);
      setRangeData(data);
      if (data.length === 0) toast.info("No saved prices found for the selected range.");
    } catch (err) {
      toastApiError(err, "Failed to load saved prices");
    } finally { setRangeLoading(false); }
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await saveDailyPrices();
      toast.success(res.status);
    } catch (err) {
      toastApiError(err, "Failed to save prices");
    } finally { setSaving(false); }
  }

  /* ── derived data ──────────────────────────────────────── */

  const prevPriceMap = useMemo(() => {
    const map = new Map<string, { factory: number; packing: number; gstKg: number; gstLtr: number }>();
    for (const p of prevDayPrices) {
      map.set(p.commodity_name, {
        factory: Number(p.factory_price),
        packing: Number(p.packing_cost_kg),
        gstKg: Number(p.with_gst_kg),
        gstLtr: Number(p.with_gst_ltr),
      });
    }
    return map;
  }, [prevDayPrices]);

  const rangeRange = useMemo(() => {
    if (rangeData.length === 0) return { min: 0, max: 0 };
    const vals = rangeData.map((p) => Number(p.factory_price));
    return { min: Math.min(...vals), max: Math.max(...vals) };
  }, [rangeData]);

  // Price range for heatmap (factory_kg across current prices)
  const priceRange = useMemo(() => {
    if (prices.length === 0) return { min: 0, max: 0 };
    const vals = prices.map((p) => Number(p.factory_kg));
    return { min: Math.min(...vals), max: Math.max(...vals) };
  }, [prices]);

  // KPI calculations
  const kpis = useMemo(() => {
    if (prices.length === 0) return null;
    const factoryPrices = prices.map((p) => Number(p.factory_kg));
    const avg = factoryPrices.reduce((a, b) => a + b, 0) / factoryPrices.length;
    const highest = prices.reduce((a, b) => Number(a.factory_kg) > Number(b.factory_kg) ? a : b);
    const lowest = prices.reduce((a, b) => Number(a.factory_kg) < Number(b.factory_kg) ? a : b);
    return { avg, highest, lowest, count: prices.length };
  }, [prices]);

  // Filtered prices by search
  const filteredPrices = useMemo(() => {
    if (!search) return prices;
    const q = search.toLowerCase();
    return prices.filter((p) => p.commodity_name.toLowerCase().includes(q));
  }, [prices, search]);

  const rangeCommodities = useMemo(() => {
    return Array.from(new Set(rangeData.map((p) => p.commodity_name))).sort();
  }, [rangeData]);

  // Comparison Pivot Logic
  const uniqueDates = useMemo(() => {
    return Array.from(new Set(rangeData.map((p) => p.date))).sort();
  }, [rangeData]);

  const comparisonPivot = useMemo(() => {
    if (!compareMode) return [];
    const commodities = rangeCommodities;
    return commodities.map((name) => {
      const row: any = { name };
      uniqueDates.forEach((date) => {
        const entry = rangeData.find((d) => d.commodity_name === name && d.date === date);
        row[date] = entry ? Number(entry.factory_price) : null;
      });
      return row;
    });
  }, [compareMode, rangeData, rangeCommodities, uniqueDates]);

  const filteredRangeData = useMemo(() => {
    let data = rangeData;
    if (rangeCommodity) data = data.filter((p) => p.commodity_name === rangeCommodity);
    if (search) {
      const q = search.toLowerCase();
      data = data.filter((p) => p.commodity_name.toLowerCase().includes(q));
    }
    return data;
  }, [rangeData, rangeCommodity, search]);

  // Chart data
  const chartData = useMemo(() => {
    if (!trends) return [];
    return trends.labels.map((label, i) => {
      const row: Record<string, string | number | null> = { date: label };
      for (const ds of trends.datasets) {
        if (selectedLabels.has(ds.label)) row[ds.label] = ds.data[i] ?? null;
      }
      return row;
    });
  }, [trends, selectedLabels]);

  const activeDatasets = trends?.datasets.filter((ds) => selectedLabels.has(ds.label)) ?? [];

  /* ── render ────────────────────────────────────────────── */

  return (
    <Guard resource="dailyprice" action="view" fallback={<div className="p-6 text-sm text-muted-foreground">You do not have permission to view daily prices.</div>}>
    <div className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6 animate-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Daily Commodity Prices</h1>
          <p className="text-sm text-muted-foreground">
            Fetch today's commodity prices from the Google Sheet
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canFetch && (
            <Button className="btn-press" onClick={handleFetch} disabled={fetching}>
              <RefreshCw className={cn("h-4 w-4 mr-2", fetching && "animate-spin")} />
              {fetching ? "Fetching..." : "Fetch Prices"}
            </Button>
          )}
          {canSave && fetched && prices.length > 0 && (
            <Button className="btn-press" onClick={handleSave} disabled={saving} variant="secondary">
              <Save className="h-4 w-4 mr-2" />
              {saving ? "Saving..." : "Save to Database"}
            </Button>
          )}
          <Button className="btn-press" variant="outline" asChild>
            <a
              href="https://docs.google.com/spreadsheets/d/e/2PACX-1vR2LwtfXKkkDiVzOc_T591-4KWwUvKW-ZaJokeixIzHkOyHNSjGv5Ilh3597ZgaMA/pubhtml?gid=655973128&single=true"
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Open Sheet
            </a>
          </Button>
        </div>
      </div>

      {/* Unsaved data warning */}
      {fetched && prices.length > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-200 dark:border-amber-800/40 bg-amber-50/50 dark:bg-amber-950/20 px-4 py-3">
          <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
          <p className="text-xs font-medium text-amber-700 dark:text-amber-300">
            Fetched prices are in preview. Click <strong>"Save to Database"</strong> to persist them.
          </p>
        </div>
      )}

      {/* KPI Summary Cards */}
      {kpis && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <SummaryCard icon={Hash} label="Commodities" value={kpis.count} loading={false} />
          <SummaryCard icon={BarChart3} label="Avg Factory Price" value={`₹ ${fmtPrice(kpis.avg)}`} loading={false} />
          <SummaryCard icon={TrendingUp} label="Highest" value={`₹ ${fmtPrice(Number(kpis.highest.factory_kg))}`} loading={false} />
          <SummaryCard icon={TrendingDown} label="Lowest" value={`₹ ${fmtPrice(Number(kpis.lowest.factory_kg))}`} loading={false} />
        </div>
      )}

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search commodities..."
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Fetched Prices Table */}
      <Card className="card-hover shimmer-hover">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Commodity Prices</CardTitle>
              <CardDescription>
                {fetched
                  ? `${count} commodities fetched${prices.length > 0 ? ` — ${prices[0].fetched_date}` : ""}`
                  : "Click \"Fetch Prices\" to load data from the Google Sheet"}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {fetched && prices.length > 0 && (
                <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-widest animate-pulse border-amber-300 text-amber-600 dark:text-amber-400">
                  LIVE PREVIEW
                </Badge>
              )}
              <button
                onClick={() => setClassicMode((v) => !v)}
                className={cn(
                  "px-2.5 py-1.5 rounded-md border text-xs font-medium transition-colors flex items-center gap-1.5",
                  classicMode
                    ? "bg-amber-100 border-amber-300 text-amber-700 dark:bg-amber-900/30 dark:border-amber-700 dark:text-amber-400"
                    : "border-border hover:bg-muted text-muted-foreground"
                )}
                title={classicMode ? "Switch to aesthetic view" : "Switch to classic view"}
              >
                <BarChart3 className="h-3 w-3" />
                {classicMode ? "Classic" : "Classic"}
              </button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            {classicMode ? (
              /* ── Classic Excel-style view ── */
              <Table className="text-base" style={{ borderCollapse: "separate", borderSpacing: "4px 0" }}>
                <TableHeader>
                  <TableRow className="bg-[#ff9900] hover:bg-[#ff9900]">
                    <TableHead className="w-12 text-center border border-black text-black font-bold">S.No</TableHead>
                    <TableHead className="text-center border border-black text-black font-bold">Commodity</TableHead>
                    <TableHead className="text-center border border-black text-black font-bold">Factory (₹/Kg)</TableHead>
                    <TableHead className="text-center border border-black text-black font-bold">With Packing (₹/Kg)</TableHead>
                    <TableHead className="text-center border border-black text-black font-bold">With GST (₹/Kg)</TableHead>
                    <TableHead className="text-center border border-black text-black font-bold">With GST (₹/Ltr)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPrices.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-16">
                        <div className="flex flex-col items-center gap-2 text-muted-foreground">
                          <PackageOpen className="h-10 w-10 stroke-1" />
                          <p className="text-sm font-medium">{search ? "No commodities match your search" : "No prices loaded"}</p>
                          {!search && <p className="text-xs">Fetch commodity prices from the Google Sheet to see them here.</p>}
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredPrices.map((item, idx) => {
                      const factoryVal = Number(item.factory_kg);
                      const prevVal = prevPriceMap.get(item.commodity_name) ?? null;
                      return (
                        <TableRow key={item.commodity_name} className={cn(justFetched && "animate-in fade-in duration-500")} style={{ animationDelay: `${idx * 50}ms` }}>
                          <TableCell className="font-medium text-center border border-black">{idx + 1}</TableCell>
                          <TableCell className="font-medium text-center border border-black">{item.commodity_name}</TableCell>
                          <TableCell className="text-center border border-black" style={{ backgroundColor: heatmapBg(factoryVal, priceRange.min, priceRange.max) }}>
                            <div className="flex items-center justify-center gap-1.5 flex-nowrap">
                              <span className="font-semibold">{fmtPrice(item.factory_kg)}</span>
                              <DeltaBadge current={factoryVal} previous={prevVal?.factory ?? null} />
                            </div>
                          </TableCell>
                          <TableCell className="text-center border border-black">{fmtPrice(item.packing_kg)}</TableCell>
                          <TableCell className="text-center border border-black">{fmtPrice(item.gst_kg)}</TableCell>
                          <TableCell className="text-center border border-black">{fmtPrice(item.gst_ltr, 2)}</TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            ) : (
              /* ── Aesthetic view ── */
              <Table className="text-base">
                <TableHeader>
                  <TableRow className="bg-muted/60 hover:bg-muted/60">
                    <TableHead className="w-12 text-center font-bold text-foreground">#</TableHead>
                    <TableHead className="font-bold text-foreground">Commodity</TableHead>
                    <TableHead className="text-right font-bold text-foreground">Factory (₹/Kg)</TableHead>
                    <TableHead className="text-right font-bold text-foreground">With Packing</TableHead>
                    <TableHead className="text-right font-bold text-foreground">With GST /Kg</TableHead>
                    <TableHead className="text-right font-bold text-foreground">With GST /Ltr</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPrices.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-16">
                        <div className="flex flex-col items-center gap-2 text-muted-foreground">
                          <PackageOpen className="h-10 w-10 stroke-1" />
                          <p className="text-sm font-medium">{search ? "No commodities match your search" : "No prices loaded"}</p>
                          {!search && <p className="text-xs">Fetch commodity prices from the Google Sheet to see them here.</p>}
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredPrices.map((item, idx) => {
                      const factoryVal = Number(item.factory_kg);
                      const prevVal = prevPriceMap.get(item.commodity_name) ?? null;
                      return (
                        <TableRow
                          key={item.commodity_name}
                          className={cn("hover:bg-muted/30 transition-colors border-b border-border/50", justFetched && "animate-in fade-in duration-500")}
                          style={{ animationDelay: `${idx * 50}ms` }}
                        >
                          <TableCell className="text-center text-muted-foreground text-sm">{idx + 1}</TableCell>
                          <TableCell className="font-semibold">{item.commodity_name}</TableCell>
                          <TableCell
                            className="text-right tabular-nums"
                            style={{ backgroundColor: heatmapBg(factoryVal, priceRange.min, priceRange.max) }}
                          >
                            <div className="flex items-center justify-end gap-1.5 flex-nowrap">
                              <span className="font-bold">{fmtPrice(item.factory_kg)}</span>
                              <DeltaBadge current={factoryVal} previous={prevVal?.factory ?? null} />
                            </div>
                          </TableCell>
                          <TableCell className="text-right tabular-nums text-muted-foreground">{fmtPrice(item.packing_kg)}</TableCell>
                          <TableCell className="text-right tabular-nums text-muted-foreground">{fmtPrice(item.gst_kg)}</TableCell>
                          <TableCell className="text-right tabular-nums text-muted-foreground">{fmtPrice(item.gst_ltr, 2)}</TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Saved Prices by Date — with compare */}
      <Card className="card-hover shimmer-hover">
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle>Saved Prices</CardTitle>
              <CardDescription>
                {rangeData.length > 0
                  ? `${rangeData.length} records from ${fromDate} to ${toDate}`
                  : "Select a date range to view saved prices"}
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <DatePicker value={fromDate} onChange={setFromDate} placeholder="From date" />
              <span className="text-muted-foreground text-sm">to</span>
              <DatePicker value={toDate} onChange={setToDate} placeholder="To date" />
              <Button size="sm" onClick={handleRangeLoad} disabled={rangeLoading}>
                {rangeLoading ? "Loading..." : "Load"}
              </Button>
              {rangeCommodities.length > 0 && (
                <Select value={rangeCommodity || "__all__"} onValueChange={(v) => setRangeCommodity(v === "__all__" ? "" : v)}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="All Commodities" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">All Commodities</SelectItem>
                    {rangeCommodities.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <div className="flex items-center gap-1 border rounded-md p-1 bg-muted/40">
                <button
                  onClick={() => { setCompareMode(false); setSavedClassicMode(false); }}
                  className={cn(
                    "px-3 py-1 text-xs font-semibold rounded transition-all",
                    !compareMode && !savedClassicMode ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  List
                </button>
                <button
                  onClick={() => { setCompareMode(false); setSavedClassicMode(true); }}
                  className={cn(
                    "px-3 py-1 text-xs font-semibold rounded transition-all",
                    !compareMode && savedClassicMode ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Classic
                </button>
                <button
                  onClick={() => setCompareMode(true)}
                  className={cn(
                    "px-3 py-1 text-xs font-semibold rounded transition-all",
                    compareMode ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Compare
                </button>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto relative">
            {compareMode ? (
               /* ── Comparison Pivot Table view ── */
               <div className="min-w-full inline-block align-middle">
                 <Table className="border-separate border-spacing-0">
                   <TableHeader className="sticky top-0 z-20 bg-background">
                     <TableRow>
                       <TableHead className="sticky left-0 z-30 bg-muted/90 backdrop-blur-sm border-b border-r min-w-[200px] font-black text-xs uppercase tracking-tighter">
                         Commodity Name
                       </TableHead>
                       {uniqueDates.map((date) => (
                         <TableHead key={date} className="text-center border-b border-r min-w-[140px] px-4 py-3 bg-muted/30">
                           <div className="flex flex-col items-center gap-0.5">
                             <span className="text-[10px] font-black text-primary uppercase tracking-widest leading-none">
                               {format(parseISO(date), "EEE")}
                             </span>
                             <span className="text-sm font-bold text-foreground tabular-nums tracking-tighter">
                               {format(parseISO(date), "dd MMM")}
                             </span>
                           </div>
                         </TableHead>
                       ))}
                     </TableRow>
                   </TableHeader>
                   <TableBody>
                     {comparisonPivot.length === 0 ? (
                       <TableRow>
                         <TableCell colSpan={uniqueDates.length + 1} className="py-24 text-center">
                           <div className="flex flex-col items-center gap-3 text-muted-foreground">
                             <TrendingUp className="h-10 w-10 stroke-1 opacity-20" />
                             <p className="text-sm font-medium">Select a date range to begin comparison</p>
                           </div>
                         </TableCell>
                       </TableRow>
                     ) : (
                       comparisonPivot.filter(r => !search || r.name.toLowerCase().includes(search.toLowerCase())).map((row) => (
                         <TableRow key={row.name} className="group hover:bg-muted/20 transition-colors">
                           <TableCell className="sticky left-0 z-10 bg-background group-hover:bg-muted/40 transition-colors border-r border-b font-bold text-sm py-3 px-4 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                             {row.name}
                           </TableCell>
                           {uniqueDates.map((date, idx) => {
                             const current = row[date];
                             const prevDate = idx > 0 ? uniqueDates[idx - 1] : null;
                             const previous = prevDate ? row[prevDate] : null;
                             
                             return (
                               <TableCell key={date} className="text-center border-r border-b px-4 py-3 tabular-nums relative overflow-hidden">
                                 <div className="flex flex-col items-center justify-center gap-1">
                                   <span className="font-bold text-sm leading-none">
                                     {current !== null ? `₹${current.toFixed(2)}` : "—"}
                                   </span>
                                   {current !== null && previous !== null && (
                                      <div className={cn(
                                        "text-[10px] font-black px-1.5 py-0.5 rounded flex items-center gap-0.5",
                                        current > previous ? "text-red-600 bg-red-50 dark:bg-red-900/20" : 
                                        current < previous ? "text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20" : 
                                        "text-muted-foreground bg-muted"
                                      )}>
                                        {current > previous ? <ArrowUpRight className="h-2.5 w-2.5" /> : 
                                         current < previous ? <ArrowDownRight className="h-2.5 w-2.5" /> : 
                                         <Minus className="h-2.5 w-2.5" />}
                                        {Math.abs(current - previous).toFixed(2)}
                                      </div>
                                   )}
                                 </div>
                               </TableCell>
                             );
                           })}
                         </TableRow>
                       ))
                     )}
                   </TableBody>
                 </Table>
               </div>
            ) : savedClassicMode ? (
              /* ── Classic Excel-style view ── */
              <Table className="text-base" style={{ borderCollapse: "separate", borderSpacing: "4px 0" }}>
                <TableHeader>
                  <TableRow className="bg-[#ff9900] hover:bg-[#ff9900]">
                    <TableHead className="w-12 text-center border border-black text-black font-bold">S.No</TableHead>
                    <TableHead className="text-center border border-black text-black font-bold">Date</TableHead>
                    <TableHead className="text-center border border-black text-black font-bold">Commodity</TableHead>
                    <TableHead className="text-center border border-black text-black font-bold">Factory (₹/Kg)</TableHead>
                    <TableHead className="text-center border border-black text-black font-bold">With Packing (₹/Kg)</TableHead>
                    <TableHead className="text-center border border-black text-black font-bold">With GST (₹/Kg)</TableHead>
                    <TableHead className="text-center border border-black text-black font-bold">With GST (₹/Ltr)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rangeLoading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: 7 }).map((__, j) => (
                          <TableCell key={j}><div className="h-4 w-16 bg-muted animate-pulse rounded" /></TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : filteredRangeData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="py-16 text-center">
                        <div className="flex flex-col items-center gap-2 text-muted-foreground">
                          <PackageOpen className="h-10 w-10 stroke-1" />
                          <p className="text-sm font-medium">No saved prices</p>
                          <p className="text-xs">Enter a date range and click Load to view saved prices.</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredRangeData.map((item, idx) => {
                      const factoryVal = Number(item.factory_price);
                      return (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium text-center border border-black">{idx + 1}</TableCell>
                          <TableCell className="tabular-nums text-center border border-black text-muted-foreground">{format(parseISO(item.date), "d MMMM yyyy")}</TableCell>
                          <TableCell className="font-medium text-center border border-black">{item.commodity_name}</TableCell>
                          <TableCell
                            className="text-center border border-black"
                            style={{ backgroundColor: heatmapBg(factoryVal, rangeRange.min, rangeRange.max) }}
                          >
                            <span className="font-semibold">{fmtPrice(item.factory_price)}</span>
                          </TableCell>
                          <TableCell className="text-center border border-black">{fmtPrice(item.packing_cost_kg)}</TableCell>
                          <TableCell className="text-center border border-black">{fmtPrice(item.with_gst_kg)}</TableCell>
                          <TableCell className="text-center border border-black">{fmtPrice(item.with_gst_ltr, 2)}</TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            ) : (
              /* ── Aesthetic view ── */
              <Table className="text-base">
                <TableHeader>
                  <TableRow className="bg-muted/60 hover:bg-muted/60">
                    <TableHead className="w-12 text-center font-bold text-foreground">#</TableHead>
                    <TableHead className="font-bold text-foreground">Date</TableHead>
                    <TableHead className="font-bold text-foreground">Commodity</TableHead>
                    <TableHead className="text-right font-bold text-foreground">Factory (₹/Kg)</TableHead>
                    <TableHead className="text-right font-bold text-foreground">With Packing</TableHead>
                    <TableHead className="text-right font-bold text-foreground">With GST /Kg</TableHead>
                    <TableHead className="text-right font-bold text-foreground">With GST /Ltr</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rangeLoading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: 7 }).map((__, j) => (
                          <TableCell key={j}><div className="h-4 w-16 bg-muted animate-pulse rounded" /></TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : filteredRangeData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="py-16 text-center">
                        <div className="flex flex-col items-center gap-2 text-muted-foreground">
                          <PackageOpen className="h-10 w-10 stroke-1" />
                          <p className="text-sm font-medium">No saved prices</p>
                          <p className="text-xs">Enter a date range and click Load to view saved prices.</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredRangeData.map((item, idx) => {
                      const factoryVal = Number(item.factory_price);
                      return (
                        <TableRow key={item.id} className="hover:bg-muted/30 transition-colors border-b border-border/50">
                          <TableCell className="text-center text-muted-foreground text-sm">{idx + 1}</TableCell>
                          <TableCell className="tabular-nums text-muted-foreground">{format(parseISO(item.date), "d MMMM yyyy")}</TableCell>
                          <TableCell className="font-semibold">{item.commodity_name}</TableCell>
                          <TableCell
                            className="text-right tabular-nums"
                            style={{ backgroundColor: heatmapBg(factoryVal, rangeRange.min, rangeRange.max) }}
                          >
                            <span className="font-bold">{fmtPrice(item.factory_price)}</span>
                          </TableCell>
                          <TableCell className="text-right tabular-nums text-muted-foreground">{fmtPrice(item.packing_cost_kg)}</TableCell>
                          <TableCell className="text-right tabular-nums text-muted-foreground">{fmtPrice(item.with_gst_kg)}</TableCell>
                          <TableCell className="text-right tabular-nums text-muted-foreground">{fmtPrice(item.with_gst_ltr, 2)}</TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Price Trends Chart */}
      <Card className="card-hover shimmer-hover overflow-hidden">
        <CardHeader className="pb-2">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-primary/10 rounded-lg">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle>Price Trends</CardTitle>
                <CardDescription>
                  {trends
                    ? `${trends.datasets.length} commodities over ${trends.labels.length} days`
                    : "Loading price trends..."}
                </CardDescription>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <DatePicker value={trendsStartDate} onChange={setTrendsStartDate} placeholder="Start date" />
              <span className="text-muted-foreground text-xs font-bold uppercase tracking-widest">to</span>
              <DatePicker value={trendsEndDate} onChange={setTrendsEndDate} placeholder="End date" />
              <Button size="sm" onClick={() => loadTrends()} disabled={trendsLoading} className="gap-2">
                <RefreshCw className={cn("h-3.5 w-3.5", trendsLoading && "animate-spin")} />
                Update
              </Button>
            </div>
          </div>

          {/* Commodity toggle pills */}
          {!trendsLoading && trends && (
            <div className="flex items-center gap-2 flex-wrap mt-4 pt-4 border-t border-border/50">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-[10px] font-bold uppercase tracking-widest px-2"
                onClick={() => setSelectedLabels(new Set(trends.datasets.map((d) => d.label)))}
              >
                All
              </Button>
              <div className="h-4 w-[1px] bg-border mx-1" />
              {trends.datasets.map((ds, i) => {
                const color = LINE_COLORS[i % LINE_COLORS.length];
                const active = selectedLabels.has(ds.label);
                return (
                  <button
                    key={ds.label}
                    onClick={() => setSelectedLabels((prev) => {
                      const next = new Set(prev);
                      if (next.has(ds.label)) {
                        if (next.size > 1) next.delete(ds.label);
                      } else next.add(ds.label);
                      return next;
                    })}
                    className={cn(
                      "flex items-center gap-2 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider border transition-all duration-300",
                      active ? "text-white shadow-md scale-105" : "bg-transparent text-muted-foreground hover:border-foreground/40"
                    )}
                    style={active ? { backgroundColor: color, borderColor: color } : { borderColor: "hsl(var(--border))" }}
                  >
                    <div className="h-1.5 w-1.5 rounded-full bg-current" />
                    {ds.label}
                  </button>
                );
              })}
            </div>
          )}
        </CardHeader>
        <CardContent className="pt-6">
          {trendsLoading ? (
            <Skeleton className="h-[500px] w-full rounded-md" />
          ) : !trends || trends.datasets.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-16 text-muted-foreground">
              <TrendingUp className="h-10 w-10 stroke-1" />
              <p className="text-sm font-medium">No trend data available</p>
              <p className="text-xs">Save prices for multiple days to see trends.</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={500}>
              <LineChart data={chartData} margin={{ top: 20, right: 40, left: 30, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12, fontWeight: 600, fill: "hsl(var(--muted-foreground))" }}
                  tickLine={false}
                  axisLine={false}
                  padding={{ left: 10, right: 10 }}
                />
                <YAxis
                  tick={{ fontSize: 12, fontWeight: 600, fill: "hsl(var(--muted-foreground))" }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `₹${v}`}
                  domain={[(dataMin: number) => Math.floor(dataMin - 5), (dataMax: number) => Math.ceil(dataMax + 5)]}
                  width={70}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null;
                    return (
                      <div className="rounded-2xl border bg-card shadow-2xl min-w-[220px] overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="bg-muted/50 border-b px-4 py-3">
                          <p className="font-black text-xs uppercase tracking-widest">{label}</p>
                        </div>
                        <div className="p-4 space-y-2.5">
                          {payload.map((p) => (
                            <div key={p.dataKey as string} className="flex items-center justify-between gap-6">
                              <span className="flex items-center gap-2">
                                <div className="h-2 w-2 rounded-full" style={{ backgroundColor: p.color }} />
                                <span className="text-[11px] font-bold uppercase truncate max-w-[120px]">{p.dataKey}</span>
                              </span>
                              <span className="font-black text-sm">₹{(p.value as number)?.toFixed(2) ?? "—"}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  }}
                  wrapperStyle={{ zIndex: 50 }}
                  allowEscapeViewBox={{ x: false, y: false }}
                />
                {activeDatasets.map((ds) => {
                  const colorIdx = trends.datasets.findIndex((d) => d.label === ds.label);
                  return (
                    <Line
                      key={ds.label}
                      type="monotone"
                      dataKey={ds.label}
                      stroke={LINE_COLORS[colorIdx % LINE_COLORS.length]}
                      strokeWidth={2.5}
                      dot={{ r: 4, strokeWidth: 2 }}
                      activeDot={{ r: 7, strokeWidth: 0 }}
                      connectNulls
                    />
                  );
                })}
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
    </Guard>
  );
}
