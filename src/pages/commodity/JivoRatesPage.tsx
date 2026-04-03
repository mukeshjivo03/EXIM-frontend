import { useEffect, useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import { toastApiError } from "@/lib/errors";
import {
  RefreshCw,
  Save,
  PackageOpen,
  TrendingUp,
  Search,
  AlertCircle,
  BarChart3,
  Hash,
  LayoutList,
  Grid3X3,
} from "lucide-react";

import {
  fetchJivoRates,
  saveJivoRates,
  getJivoRatesByRange,
  type DbJivoRate,
} from "@/api/jivoRate";
import { useAuth } from "@/context/AuthContext";
import { useJivoRate } from "@/context/JivoRateContext";
import { SummaryCard } from "@/components/SummaryCard";
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

/* ── helpers ─────────────────────────────────────────────── */

function fmtRate(v: number, decimals = 2): string {
  return Number(v).toLocaleString("en-IN", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function heatmapBg(val: number, min: number, max: number): string {
  if (max === min) return "";
  const intensity = (val - min) / (max - min);
  if (intensity > 0.7) return `rgba(34, 197, 94, ${(intensity - 0.5) * 0.15})`;
  if (intensity < 0.3) return `rgba(239, 68, 68, ${(0.5 - intensity) * 0.12})`;
  return "";
}

/* ── page ─────────────────────────────────────────────────── */

export default function JivoRatesPage() {
  const { email } = useAuth();
  const { preview, count, fetched, setPreview, setCount, setFetched } = useJivoRate();
  const [fetching, setFetching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [justFetched, setJustFetched] = useState(false);

  // Saved rates by range
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [rangeData, setRangeData] = useState<DbJivoRate[]>([]);
  const [rangeLoading, setRangeLoading] = useState(false);
  const [rangeCommodity, setRangeCommodity] = useState("");

  // Search
  const [search, setSearch] = useState("");

  // View mode for fetched rates
  const [viewMode, setViewMode] = useState<"list" | "matrix">("matrix");

  useEffect(() => { if (!fetched) handleFetch(); }, []);

  /* ── handlers ──────────────────────────────────────────── */

  async function handleFetch() {
    setFetching(true);
    try {
      const res = await fetchJivoRates();
      setPreview(res.preview_data);
      setCount(res.count);
      setFetched(true);
      setJustFetched(true);
      setTimeout(() => setJustFetched(false), 2000);
      toast.success(`Fetched ${res.count} Jivo rates`);
    } catch (err) {
      toastApiError(err, "Failed to fetch Jivo rates");
    } finally {
      setFetching(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await saveJivoRates(email ?? "System");
      toast.success(res.status);
    } catch (err) {
      toastApiError(err, "Failed to save Jivo rates");
    } finally { setSaving(false); }
  }

  async function handleRangeLoad() {
    if (!fromDate || !toDate) { toast.error("Please select both from and to dates."); return; }
    setRangeLoading(true);
    try {
      const data = await getJivoRatesByRange(fromDate, toDate);
      setRangeData(data);
      setRangeCommodity("");
      if (data.length === 0) toast.info("No saved rates found for the selected range.");
    } catch (err) {
      toastApiError(err, "Failed to load saved rates");
    } finally { setRangeLoading(false); }
  }

  /* ── derived data ──────────────────────────────────────── */

  const rangeDataRange = useMemo(() => {
    if (rangeData.length === 0) return { min: 0, max: 0 };
    const vals = rangeData.map((p) => p.rate);
    return { min: Math.min(...vals), max: Math.max(...vals) };
  }, [rangeData]);

  const kpis = useMemo(() => {
    if (preview.length === 0) return null;
    const rates = preview.map((p) => p.rate);
    const avg = rates.reduce((a, b) => a + b, 0) / rates.length;
    const highest = preview.reduce((a, b) => a.rate > b.rate ? a : b);
    const commodities = new Set(preview.map((p) => p.commodity)).size;
    return { avg, highest, count: preview.length, commodities };
  }, [preview]);

  const filteredPreview = useMemo(() => {
    if (!search) return preview;
    const q = search.toLowerCase();
    return preview.filter(
      (p) => p.commodity.toLowerCase().includes(q) || p.pack_type.toLowerCase().includes(q)
    );
  }, [preview, search]);

  const matrix = useMemo(() => {
    const data = filteredPreview;
    
    // Explicit ordering for commodities
    const COMMODITY_ORDER = ["soya", "mustard", "sunflower", "cotton refined", "ricebran refined"];
    
    // Explicit ordering for pack types
    const PACK_TYPE_ORDER = [
      "pouch 1ltr",
      "pouch 750g",
      "pouch 700g",
      "bottle 1ltr",
      "15ltr tin",
      "15kg tin",
      "13kg tin"
    ];

    const commodities = Array.from(new Set(data.map((p) => p.commodity.toLowerCase())))
      .sort((a, b) => {
        const indexA = COMMODITY_ORDER.indexOf(a);
        const indexB = COMMODITY_ORDER.indexOf(b);
        if (indexA === -1 && indexB === -1) return a.localeCompare(b);
        if (indexA === -1) return 1;
        if (indexB === -1) return -1;
        return indexA - indexB;
      });

    const packTypes = Array.from(new Set(data.map((p) => p.pack_type.toLowerCase())))
      .sort((a, b) => {
        const indexA = PACK_TYPE_ORDER.indexOf(a);
        const indexB = PACK_TYPE_ORDER.indexOf(b);
        if (indexA === -1 && indexB === -1) {
          // Fallback to numeric sort if not in order
          const toGrams = (s: string) => {
            const m = s.match(/([\d.]+)\s*(g|kg|ml|l|ltr|litre|ton|mt)/i);
            if (!m) return Infinity;
            const n = parseFloat(m[1]);
            const u = m[2].toLowerCase();
            if (u === "kg" || u === "l" || u === "ltr" || u === "litre") return n * 1000;
            if (u === "ton" || u === "mt") return n * 1_000_000;
            return n;
          };
          return toGrams(a) - toGrams(b);
        }
        if (indexA === -1) return 1;
        if (indexB === -1) return -1;
        return indexA - indexB;
      });

    const rateMap = new Map<string, number>();
    for (const p of data) {
      rateMap.set(`${p.commodity.toLowerCase()}||${p.pack_type.toLowerCase()}`, p.rate);
    }
    return { commodities, packTypes, rateMap };
  }, [filteredPreview]);

  const rangeCommodities = useMemo(() =>
    Array.from(new Set(rangeData.map((p) => p.commodity))).sort()
  , [rangeData]);

  const filteredRangeData = useMemo(() => {
    let data = rangeData;
    if (rangeCommodity) data = data.filter((p) => p.commodity === rangeCommodity);
    if (search) {
      const q = search.toLowerCase();
      data = data.filter(
        (p) => p.commodity.toLowerCase().includes(q) || p.pack_type.toLowerCase().includes(q)
      );
    }
    return data;
  }, [rangeData, rangeCommodity, search]);

  /* ── render ────────────────────────────────────────────── */

  return (
    <div className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6 animate-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Jivo Rates</h1>
          <p className="text-sm text-muted-foreground">Fetch and track Jivo commodity rates</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button className="btn-press" onClick={handleFetch} disabled={fetching}>
            <RefreshCw className={cn("h-4 w-4 mr-2", fetching && "animate-spin")} />
            {fetching ? "Fetching..." : "Fetch Rates"}
          </Button>
          {fetched && preview.length > 0 && (
            <Button className="btn-press" onClick={handleSave} disabled={saving} variant="secondary">
              <Save className="h-4 w-4 mr-2" />
              {saving ? "Saving..." : "Save to Database"}
            </Button>
          )}
        </div>
      </div>

      {/* Unsaved data warning */}
      {fetched && preview.length > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-200 dark:border-amber-800/40 bg-amber-50/50 dark:bg-amber-950/20 px-4 py-3">
          <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
          <p className="text-xs font-medium text-amber-700 dark:text-amber-300">
            Fetched rates are in preview. Click <strong>"Save to Database"</strong> to persist them.
          </p>
        </div>
      )}

      {/* KPI Cards */}
      {kpis && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <SummaryCard icon={Hash} label="Total Entries" value={kpis.count} loading={false} />
          <SummaryCard icon={BarChart3} label="Avg Rate" value={`₹ ${fmtRate(kpis.avg)}`} loading={false} />
          <SummaryCard icon={TrendingUp} label="Highest Rate" value={`₹ ${fmtRate(kpis.highest.rate)}`} loading={false} />
          <SummaryCard icon={Hash} label="Commodities" value={kpis.commodities} loading={false} />
        </div>
      )}

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search commodity or pack type..."
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Fetched Rates Table */}
      <Card className="card-hover shimmer-hover">
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div>
              <CardTitle>Jivo Rates</CardTitle>
              <CardDescription>
                {fetched
                  ? `${count} entries fetched${preview.length > 0 ? ` — ${preview[0].date}` : ""}`
                  : `Click "Fetch Rates" to load the latest Jivo rates`}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {fetched && preview.length > 0 && (
                <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-widest animate-pulse border-amber-300 text-amber-600 dark:text-amber-400">
                  LIVE PREVIEW
                </Badge>
              )}
              <div className="flex rounded-md border overflow-hidden">
                <button
                  onClick={() => setViewMode("matrix")}
                  className={cn("px-2 py-1.5 flex items-center gap-1 text-xs transition-colors", viewMode === "matrix" ? "bg-primary text-primary-foreground" : "hover:bg-muted")}
                  title="Matrix view"
                >
                  <Grid3X3 className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={cn("px-2 py-1.5 flex items-center gap-1 text-xs transition-colors", viewMode === "list" ? "bg-primary text-primary-foreground" : "hover:bg-muted")}
                  title="List view"
                >
                  <LayoutList className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            {viewMode === "matrix" ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[160px] font-bold text-foreground text-center border border-border" style={{ backgroundColor: "#93c47d" }}>
                      Jivo Rate
                    </TableHead>
                    {matrix.commodities.map((c) => (
                      <TableHead
                        key={c}
                        className="text-center min-w-[110px] font-bold text-foreground border border-border capitalize"
                        style={{ backgroundColor: "#fff3cc" }}
                      >
                        {c}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {matrix.packTypes.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={matrix.commodities.length + 1} className="py-16 text-center">
                        <div className="flex flex-col items-center gap-2 text-muted-foreground">
                          <PackageOpen className="h-10 w-10 stroke-1" />
                          <p className="text-sm font-medium">
                            {search ? "No entries match your search" : "No rates loaded"}
                          </p>
                          {!search && <p className="text-xs">Click "Fetch Rates" to load the latest Jivo rates.</p>}
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    matrix.packTypes.map((pt) => (
                      <TableRow key={pt} className={cn(justFetched && "animate-in fade-in duration-500", "hover:bg-muted/30 transition-colors")}>
                        <TableCell className="font-bold text-center border border-border capitalize" style={{ backgroundColor: "#ffe699" }}>
                          {pt}
                        </TableCell>
                        {matrix.commodities.map((commodity) => {
                          const rate = matrix.rateMap.get(`${commodity}||${pt}`);
                          return (
                            <TableCell
                              key={commodity}
                              className="text-center border border-border"
                            >
                              {rate != null ? (
                                <span className="font-bold text-sm tabular-nums">
                                  ₹ {fmtRate(rate)}
                                </span>
                              ) : (
                                <span className="text-muted-foreground/40">—</span>
                              )}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">S.No</TableHead>
                    <TableHead>Commodity</TableHead>
                    <TableHead>Pack Type</TableHead>
                    <TableHead className="text-right">Rate (₹)</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPreview.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="py-16 text-center">
                        <div className="flex flex-col items-center gap-2 text-muted-foreground">
                          <PackageOpen className="h-10 w-10 stroke-1" />
                          <p className="text-sm font-medium">
                            {search ? "No entries match your search" : "No rates loaded"}
                          </p>
                          {!search && <p className="text-xs">Click "Fetch Rates" to load the latest Jivo rates.</p>}
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredPreview.map((item, idx) => (
                      <TableRow
                        key={`${item.commodity}-${item.pack_type}-${idx}`}
                        className={cn(justFetched && "animate-in fade-in duration-500")}
                        style={{ animationDelay: `${idx * 50}ms` }}
                      >
                        <TableCell className="font-medium">{idx + 1}</TableCell>
                        <TableCell className="font-medium">{item.commodity}</TableCell>
                        <TableCell>{item.pack_type}</TableCell>
                        <TableCell className="text-right">
                          <span className="font-semibold">{fmtRate(item.rate)}</span>
                        </TableCell>
                        <TableCell className="tabular-nums text-muted-foreground">{format(parseISO(item.date), "d MMMM yyyy")}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Saved Rates by Range */}
      <Card className="card-hover shimmer-hover">
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle>Saved Rates</CardTitle>
              <CardDescription>
                {rangeData.length > 0
                  ? `${rangeData.length} records from ${fromDate} to ${toDate}`
                  : "Select a date range to view saved rates"}
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
                  <SelectTrigger className="w-[160px]">
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
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">S.No</TableHead>
                  <TableHead>Commodity</TableHead>
                  <TableHead>Pack Type</TableHead>
                  <TableHead className="text-right">Rate (₹)</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rangeLoading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 5 }).map((__, j) => (
                        <TableCell key={j}><div className="h-4 w-16 bg-muted animate-pulse rounded" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : filteredRangeData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-16 text-center">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <PackageOpen className="h-10 w-10 stroke-1" />
                        <p className="text-sm font-medium">No saved rates</p>
                        <p className="text-xs">Enter a date range and click Load to view saved rates.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRangeData.map((item, idx) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{idx + 1}</TableCell>
                      <TableCell className="font-medium">{item.commodity}</TableCell>
                      <TableCell>{item.pack_type}</TableCell>
                      <TableCell
                        className="text-right"
                        style={{ backgroundColor: heatmapBg(item.rate, rangeDataRange.min, rangeDataRange.max) }}
                      >
                        <span className="font-semibold">{fmtRate(item.rate)}</span>
                      </TableCell>
                      <TableCell className="tabular-nums text-muted-foreground">{item.date}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
