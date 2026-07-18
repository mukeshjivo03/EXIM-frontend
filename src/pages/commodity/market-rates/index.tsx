import { useEffect, useMemo, useState } from "react";
import { format, parseISO, subDays } from "date-fns";
import {
  ClipboardEdit,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Search,
  AlertCircle,
  BarChart3,
  Hash,
  PackageOpen,
  LayoutGrid,
  TableProperties,
  Grid3X3,
  type LucideIcon,
} from "lucide-react";

import { useAuth } from "@/context/AuthContext";
import { usePersistedState } from "@/hooks/usePersistedState";
import { SummaryCard } from "@/components/SummaryCard";
import { ViewToggle } from "@/components/ViewToggle";
import { RangeBar } from "@/components/RangeBar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { DatePicker } from "@/components/ui/date-picker";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

import { useMarketRates } from "./useMarketRates";
import { fmtINR } from "./CommodityCard";
import { GraphicalView } from "./GraphicalView";
import { TabularView } from "./TabularView";
import { RateLogDialog } from "./RateLogDialog";
import { RatesHeatmap } from "./RatesHeatmap";
import { RateLadderDrawer, type DrawerTarget } from "./RateLadderDrawer";

const VIEW_OPTIONS = [
  { value: "graphical" as const, label: "Graphical", icon: LayoutGrid },
  { value: "tabular" as const, label: "Tabular", icon: TableProperties },
];

const HISTORY_VIEW_OPTIONS = [
  { value: "heatmap" as const, label: "Heatmap", icon: Grid3X3 },
  { value: "table" as const, label: "Table", icon: TableProperties },
];

/** Summary card variant with the commodity name + a 7-day range bar. */
function RangeSummaryCard({
  icon: Icon, label, value, name, min, max, current,
}: {
  icon: LucideIcon; label: string; value: string; name: string; min: number; max: number; current: number;
}) {
  return (
    <Card>
      <CardContent className="pt-4 pb-3 px-3 sm:pt-6 sm:pb-5 sm:px-5">
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          <div className="rounded-lg bg-orange-50 dark:bg-orange-900/50 p-2 sm:p-3 shrink-0">
            <Icon className="h-5 w-5 sm:h-6 sm:w-6 text-orange-600 dark:text-orange-400" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs sm:text-sm text-muted-foreground">{label}</p>
            <p className="text-base sm:text-lg md:text-2xl font-bold mt-0.5 tabular-nums">{value}</p>
            <p className="text-[11px] text-muted-foreground truncate">{name}</p>
            <div className="mt-2 flex items-center gap-2">
              <span className="text-[9px] text-muted-foreground tabular-nums shrink-0">{fmtINR(min)}</span>
              <RangeBar value={current} min={min} max={max} className="flex-1" />
              <span className="text-[9px] text-muted-foreground tabular-nums shrink-0">{fmtINR(max)}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function MarketRatesPage() {
  const { email } = useAuth();
  const {
    commodities,
    rates,
    byCommodity,
    todayByCommodity,
    latestByCommodity,
    todayRows,
    commodityName,
    idsAvailable,
    loading,
    error,
    reload,
    ensureHistoryFrom,
  } = useMarketRates();

  const [viewMode, setViewMode] = usePersistedState<"graphical" | "tabular">(
    "marketRates.viewMode", "graphical", ["graphical", "tabular"]
  );
  const [historyView, setHistoryView] = usePersistedState<"heatmap" | "table">(
    "marketRates.historyView", "heatmap", ["heatmap", "table"]
  );
  const [search, setSearch] = useState("");
  const [drawerTarget, setDrawerTarget] = useState<DrawerTarget | null>(null);
  const [logOpen, setLogOpen] = useState(false);

  // History range — refetches with an earlier start_date when the picker goes past the loaded window
  const [fromDate, setFromDate] = useState(format(subDays(new Date(), 14), "yyyy-MM-dd"));
  const [toDate, setToDate] = useState(format(new Date(), "yyyy-MM-dd"));

  useEffect(() => {
    ensureHistoryFrom(fromDate);
  }, [fromDate, ensureHistoryFrom]);

  const filteredRows = useMemo(() => {
    if (!search) return todayRows;
    const q = search.toLowerCase();
    return todayRows.filter((r) => r.name.toLowerCase().includes(q));
  }, [todayRows, search]);

  const kpis = useMemo(() => {
    if (todayRows.length === 0) return null;
    const avg = todayRows.reduce((a, r) => a + r.factory, 0) / todayRows.length;
    const highest = todayRows.reduce((a, b) => (a.factory > b.factory ? a : b));
    const lowest = todayRows.reduce((a, b) => (a.factory < b.factory ? a : b));
    return { avg, highest, lowest };
  }, [todayRows]);

  const historyRows = useMemo(() => {
    return rates
      .filter((r) => r.commodity !== null && r.date >= fromDate && r.date <= toDate)
      .filter((r) => !search || commodityName(r.commodity).toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => b.date.localeCompare(a.date) || commodityName(a.commodity).localeCompare(commodityName(b.commodity)));
  }, [rates, fromDate, toDate, search, commodityName]);

  return (
    <div className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6 animate-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Market Rates</h1>
          <p className="text-sm text-muted-foreground tabular-nums">
            {todayRows.length > 0
              ? `${todayRows.length} commodities · ${format(new Date(), "d MMM yyyy")} · vs ${format(subDays(new Date(), 1), "d MMM")}`
              : "Log factory rates manually — packing, GST and per-litre prices are derived automatically"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button className="btn-press" onClick={() => setLogOpen(true)}>
            <ClipboardEdit className="h-4 w-4 mr-2" />
            Log Today's Rates
          </Button>
          <Button className="btn-press" variant="outline" onClick={() => void reload()} disabled={loading}>
            <RefreshCw className={loading ? "h-4 w-4 mr-2 animate-spin" : "h-4 w-4 mr-2"} />
            Refresh
          </Button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-red-200 dark:border-red-900/40 bg-red-50/50 dark:bg-red-950/20 px-4 py-3">
          <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 shrink-0" />
          <p className="text-xs font-medium text-red-700 dark:text-red-300">
            Failed to load market rates. Check that the Commodity Rates API is reachable, then hit Refresh.
          </p>
        </div>
      )}

      {/* KPI Summary Cards */}
      {kpis && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <SummaryCard icon={Hash} label="Commodities" value={todayRows.length} loading={false} />
          <SummaryCard icon={BarChart3} label="Avg Factory Price" value={`₹ ${fmtINR(kpis.avg)}`} loading={false} />
          <RangeSummaryCard
            icon={TrendingUp}
            label="Highest"
            value={`₹ ${fmtINR(kpis.highest.factory)}`}
            name={kpis.highest.name}
            min={kpis.highest.weekMin}
            max={kpis.highest.weekMax}
            current={kpis.highest.factory}
          />
          <RangeSummaryCard
            icon={TrendingDown}
            label="Lowest"
            value={`₹ ${fmtINR(kpis.lowest.factory)}`}
            name={kpis.lowest.name}
            min={kpis.lowest.weekMin}
            max={kpis.lowest.weekMax}
            current={kpis.lowest.factory}
          />
        </div>
      )}

      {/* Search + view toggle */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative max-w-sm flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search commodities..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <ViewToggle options={VIEW_OPTIONS} value={viewMode} onChange={setViewMode} />
      </div>

      {/* Today's rates */}
      <Card className="card-hover shimmer-hover">
        <CardHeader>
          <CardTitle>Today's Rates</CardTitle>
          <CardDescription>
            {todayRows.length > 0
              ? `${todayRows.length} commodities logged for ${format(new Date(), "d MMM yyyy")}`
              : "Rates logged today appear here with deltas and 7-day trends"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div key={viewMode} className="animate-in fade-in slide-in-from-bottom-1 duration-150">
            {viewMode === "graphical" ? (
              <GraphicalView
                rows={filteredRows}
                loading={loading}
                hasSearch={!!search}
                onSelect={(row) => setDrawerTarget({ commodityId: row.commodityId, name: row.name })}
              />
            ) : (
              <div className="rounded-md border overflow-x-auto">
                <TabularView
                  rows={filteredRows}
                  hasSearch={!!search}
                  onSelect={(row) => setDrawerTarget({ commodityId: row.commodityId, name: row.name })}
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Logged history — heatmap / table */}
      <Card className="card-hover shimmer-hover">
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle>Logged History</CardTitle>
              <CardDescription>
                {historyRows.length > 0
                  ? `${historyRows.length} entries from ${format(parseISO(fromDate), "d MMM")} to ${format(parseISO(toDate), "d MMM yyyy")}`
                  : "Pick a date range to review logged rates"}
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <DatePicker value={fromDate} onChange={setFromDate} placeholder="From date" />
              <span className="text-muted-foreground text-sm">to</span>
              <DatePicker value={toDate} onChange={setToDate} placeholder="To date" />
              <ViewToggle options={HISTORY_VIEW_OPTIONS} value={historyView} onChange={setHistoryView} />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div key={historyView} className="rounded-md border overflow-hidden animate-in fade-in slide-in-from-bottom-1 duration-150">
            {loading && rates.length === 0 ? (
              <div className="p-4 space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-7 w-full" />
                ))}
              </div>
            ) : historyView === "heatmap" ? (
              <RatesHeatmap
                byCommodity={byCommodity}
                commodityName={commodityName}
                from={fromDate}
                to={toDate}
                onCellClick={(commodityId, name, date) => setDrawerTarget({ commodityId, name, date })}
              />
            ) : (
              <div className="overflow-x-auto">
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
                    {historyRows.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="py-16 text-center">
                          <div className="flex flex-col items-center gap-2 text-muted-foreground">
                            <PackageOpen className="h-10 w-10 stroke-1" />
                            <p className="text-sm font-medium">No logged rates in this range</p>
                            <p className="text-xs">Log factory rates or widen the date range.</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      historyRows.map((item, idx) => (
                        <TableRow
                          key={item.id ?? `${item.commodity}-${item.date}-${idx}`}
                          className="hover:bg-muted/30 transition-colors border-b border-border/50 cursor-pointer"
                          onClick={() =>
                            item.commodity !== null &&
                            setDrawerTarget({ commodityId: item.commodity, name: commodityName(item.commodity), date: item.date })
                          }
                        >
                          <TableCell className="text-center text-muted-foreground text-sm">{idx + 1}</TableCell>
                          <TableCell className="tabular-nums text-muted-foreground">{format(parseISO(item.date), "d MMM yyyy")}</TableCell>
                          <TableCell className="font-semibold">{commodityName(item.commodity)}</TableCell>
                          <TableCell className="text-right tabular-nums font-bold">{fmtINR(Number(item.factory_kg))}</TableCell>
                          <TableCell className="text-right tabular-nums text-muted-foreground">{fmtINR(Number(item.with_packing))}</TableCell>
                          <TableCell className="text-right tabular-nums text-muted-foreground">{fmtINR(Number(item.with_gst_kg))}</TableCell>
                          <TableCell className="text-right tabular-nums text-muted-foreground">{fmtINR(Number(item.with_gst_ltr))}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Rate logging modal */}
      <RateLogDialog
        open={logOpen}
        onOpenChange={setLogOpen}
        commodities={commodities}
        todayByCommodity={todayByCommodity}
        latestByCommodity={latestByCommodity}
        idsAvailable={idsAvailable}
        loading={loading}
        createdBy={email ?? "frontend"}
        onSaved={() => void reload()}
      />

      {/* Detail drawer */}
      <RateLadderDrawer
        target={drawerTarget}
        history={drawerTarget ? byCommodity.get(drawerTarget.commodityId) ?? [] : []}
        onClose={() => setDrawerTarget(null)}
      />
    </div>
  );
}
