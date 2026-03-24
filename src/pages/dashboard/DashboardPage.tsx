import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { 
  RefreshCw, 
  Droplets, 
  BarChart3, 
  Landmark, 
  TrendingUp, 
  AlertCircle, 
  ArrowUpRight, 
  ArrowDownRight, 
  Wallet, 
  FileText,
  MousePointer2,
  Inbox,
  Activity
} from "lucide-react";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ReferenceLine,
  LabelList,
  type PieLabelRenderProps,
} from "recharts";

import { fmtNum } from "@/lib/formatters";
import { getErrorMessage } from "@/lib/errors";
import { getCapacityInsights, type CapacityInsight } from "@/api/dashboard";
import { syncBalanceSheet, type BalanceEntry } from "@/api/sapSync";
import { getPriceTrends, type PriceTrendsResponse } from "@/api/dailyPrice";
import { getStockStatuses } from "@/api/stockStatus";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/* ── Helpers ───────────────────────────────────────────────── */

function truncate(str: string, max = 22) {
  return str.length > max ? str.slice(0, max) + "…" : str;
}

/* ── Visual Constants ─────────────────────────────────────── */

const FILLED_COLOR = "#3b82f6";
const EMPTY_COLOR  = "#94a3b8";

const PRICE_COLORS = [
  "#3b82f6","#8b5cf6","#f59e0b","#22c55e","#ef4444",
  "#06b6d4","#f97316","#ec4899","#14b8a6","#6366f1","#84cc16","#d97706",
];

/* ── Components ────────────────────────────────────────────── */

function CustomPieLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent }: PieLabelRenderProps) {
  if ((percent ?? 0) < 0.04) return null;
  const RADIAN = Math.PI / 180;
  const ir = (innerRadius as number) ?? 0;
  const or = (outerRadius as number) ?? 0;
  const radius = ir + (or - ir) * 0.55;
  const x = (cx as number) + radius * Math.cos(-((midAngle as number) ?? 0) * RADIAN);
  const y = (cy as number) + radius * Math.sin(-((midAngle as number) ?? 0) * RADIAN);
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={14} fontWeight={600}>
      {`${((percent ?? 0) * 100).toFixed(1)}%`}
    </text>
  );
}

function PieTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const e = payload[0];
  return (
    <div className="rounded-lg border bg-card shadow-lg px-4 py-3 text-sm">
      <p className="font-semibold mb-1">{e.name}</p>
      <p className="text-muted-foreground">{fmtNum(e.value)} {e.payload.unit}</p>
    </div>
  );
}

function BarTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  const isPos = d.balance >= 0;
  return (
    <div className="rounded-lg border bg-card shadow-lg px-4 py-3 text-sm max-w-xs">
      <p className="font-semibold mb-2 leading-tight">{d.fullName}</p>
      <div className="flex items-center gap-2">
        <span className={cn(
          "text-xs px-1.5 py-0.5 rounded font-medium",
          isPos ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400" : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400"
        )}>
          {isPos ? "Receivable" : "Payable"}
        </span>
        <span className={cn("font-bold", isPos ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400")}>
          ₹ {fmtNum(Math.abs(d.balance), 0)}
        </span>
      </div>
      <p className="text-[10px] text-muted-foreground mt-2 flex items-center gap-1">
        <MousePointer2 className="h-2 w-2" /> Click to view ledger
      </p>
    </div>
  );
}

/* ── KPI Card Component ───────────────────────────────────── */
function KPICard({ title, value, sub, icon: Icon, trend, color, loading, onClick }: any) {
  return (
    <Card className={cn("card-hover shimmer-hover overflow-hidden relative group", onClick && "cursor-pointer")} onClick={onClick}>
      <CardContent className="p-6">
        <div className="flex justify-between items-start">
          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{title}</p>
            {loading ? (
              <div className="h-8 w-24 bg-muted animate-pulse rounded" />
            ) : (
              <h3 className="text-2xl font-black tracking-tight">{value}</h3>
            )}
            <div className="flex items-center gap-2">
              {trend && (
                <span className={cn(
                  "flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded-full",
                  trend > 0 ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30" : "bg-red-100 text-red-700 dark:bg-red-900/30"
                )}>
                  {trend > 0 ? <ArrowUpRight className="h-3 w-3 mr-0.5" /> : <ArrowDownRight className="h-3 w-3 mr-0.5" />}
                  {Math.abs(trend).toFixed(1)}%
                </span>
              )}
              <p className="text-[10px] text-muted-foreground font-medium uppercase">{sub}</p>
            </div>
          </div>
          <div className={cn("p-3 rounded-2xl transition-all duration-500 group-hover:scale-110", color)}>
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </CardContent>
      {onClick && (
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <MousePointer2 className="h-3 w-3 text-muted-foreground" />
        </div>
      )}
    </Card>
  );
}

/* ── Page Component ────────────────────────────────────────── */

export default function DashboardPage() {
  const navigate = useNavigate();
  const [capacity, setCapacity] = useState<CapacityInsight | null>(null);
  const [capacityLoading, setCapacityLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const [balanceEntries, setBalanceEntries] = useState<BalanceEntry[]>([]);
  const [balanceLoading, setBalanceLoading] = useState(true);

  const [trends, setTrends] = useState<PriceTrendsResponse | null>(null);
  const [trendsLoading, setTrendsLoading] = useState(true);
  const [selectedLabels, setSelectedLabels] = useState<Set<string>>(new Set());

  const [contractsCount, setContractsCount] = useState(0);
  const [contractsLoading, setContractsLoading] = useState(true);

  async function fetchAll() {
    setCapacityLoading(true);
    setBalanceLoading(true);
    setTrendsLoading(true);
    setContractsLoading(true);

    const [capResult, balResult, trendResult, stockResult] = await Promise.allSettled([
      getCapacityInsights(),
      syncBalanceSheet(),
      getPriceTrends(),
      getStockStatuses({ status: "IN_CONTRACT" }),
    ]);

    if (capResult.status === "fulfilled") setCapacity(capResult.value);
    else toast.error(getErrorMessage(capResult.reason, "Capacity error"));
    setCapacityLoading(false);

    if (balResult.status === "fulfilled") setBalanceEntries(balResult.value);
    else toast.error(getErrorMessage(balResult.reason, "Balance error"));
    setBalanceLoading(false);

    if (trendResult.status === "fulfilled") {
      const data = trendResult.value;
      setTrends(data);
      const defaultLabel = data.datasets.find((d) => d.label.toLowerCase().includes("soya refined") && d.label.toLowerCase().includes("resale"));
      setSelectedLabels(new Set(defaultLabel ? [defaultLabel.label] : [data.datasets[0]?.label].filter(Boolean)));
    } else toast.error(getErrorMessage(trendResult.reason, "Trends error"));
    setTrendsLoading(false);

    if (stockResult.status === "fulfilled") setContractsCount(stockResult.value.length);
    setContractsLoading(false);
  }

  useEffect(() => {
    fetchAll();
  }, []);

  /* ── Calculations for KPIs ── */
  const { totalReceivable, totalPayable } = useMemo(() => {
    return balanceEntries.reduce((acc, curr) => {
      if (curr.Balance > 0) acc.totalReceivable += curr.Balance;
      else acc.totalPayable += Math.abs(curr.Balance);
      return acc;
    }, { totalReceivable: 0, totalPayable: 0 });
  }, [balanceEntries]);

  const marketInsight = useMemo(() => {
    if (!trends || trends.datasets.length === 0) return null;
    const insights = trends.datasets.map(ds => {
      const last = ds.data[ds.data.length - 1] ?? 0;
      const prev = ds.data[ds.data.length - 2] ?? last;
      const diff = last - prev;
      const pct = prev !== 0 ? (diff / prev) * 100 : 0;
      return { label: ds.label, last, diff, pct };
    });
    const gainer = [...insights].sort((a, b) => b.pct - a.pct)[0];
    const loser = [...insights].sort((a, b) => a.pct - b.pct)[0];
    return { gainer, loser };
  }, [trends]);

  /* ── Chart Data ── */
  const pieData = capacity
    ? [
        { name: "Filled", value: capacity.filled_capacity, unit: "Liter", color: FILLED_COLOR },
        { name: "Empty",  value: capacity.empty_capacity,  unit: "Liter", color: EMPTY_COLOR  },
      ]
    : [];

  const barData = useMemo(() => {
    if (!balanceEntries.length) return [];
    const sorted = [...balanceEntries].sort((a, b) => a.Balance - b.Balance);
    const bottom5 = sorted.slice(0, 5);
    const top5    = sorted.slice(-5).reverse();
    return [...top5, ...bottom5].map((e) => ({
      name:       truncate(e.CardName, 18),
      fullName:   e.CardName,
      code:       e.CardCode,
      balance:    e.Balance,
      absBalance: Math.abs(e.Balance),
      isPositive: e.Balance >= 0,
    }));
  }, [balanceEntries]);

  const priceChartData = useMemo(() => {
    if (!trends) return [];
    return trends.labels.map((date, i) => {
      const row: Record<string, string | number | null> = { date };
      for (const ds of trends.datasets) {
        if (selectedLabels.has(ds.label)) row[ds.label] = ds.data[i] ?? null;
      }
      return row;
    });
  }, [trends, selectedLabels]);

  const activeDatasets = trends?.datasets.filter((ds) => selectedLabels.has(ds.label)) ?? [];

  const loading = capacityLoading || balanceLoading || trendsLoading || contractsLoading;

  return (
    <div className="p-3 sm:p-4 md:p-6 lg:p-8 space-y-8 lg:space-y-10 animate-page">
      
      {/* Chart Gradients Definitions */}
      <svg width="0" height="0" className="absolute">
        <defs>
          <linearGradient id="barGradientPos" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#22c55e" stopOpacity={1} />
            <stop offset="100%" stopColor="#16a34a" stopOpacity={0.8} />
          </linearGradient>
          <linearGradient id="barGradientNeg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ef4444" stopOpacity={1} />
            <stop offset="100%" stopColor="#dc2626" stopOpacity={0.8} />
          </linearGradient>
        </defs>
      </svg>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-1 font-medium">
            <Activity className="h-3.5 w-3.5 text-emerald-500" />
            Live operational & financial intelligence
          </p>
        </div>
        <Button variant="outline" className="btn-press gap-2 rounded-xl h-11 px-6 shadow-sm border-2" onClick={fetchAll} disabled={loading}>
          <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          Sync Live Data
        </Button>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard 
          title="Outstanding Receivable"
          value={`₹ ${fmtNum(totalReceivable / 10000000, 2)} Cr`}
          sub="Total Dr balance"
          icon={Wallet}
          color="bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600"
          loading={balanceLoading}
          onClick={() => navigate("/exim-account")}
        />
        <KPICard 
          title="Outstanding Payable"
          value={`₹ ${fmtNum(totalPayable / 10000000, 2)} Cr`}
          sub="Total Cr balance"
          icon={Landmark}
          color="bg-red-50 dark:bg-red-950/30 text-red-600"
          loading={balanceLoading}
          onClick={() => navigate("/exim-account")}
        />
        <KPICard 
          title="Active Contracts"
          value={contractsCount}
          sub="Pending shipments"
          icon={FileText}
          color="bg-blue-50 dark:bg-blue-950/30 text-blue-600"
          loading={contractsLoading}
          onClick={() => navigate("/stock/stock-status")}
        />
        <KPICard 
          title="Tank Utilisation"
          value={`${capacity?.filled_percentage.toFixed(1) ?? 0}%`}
          sub={capacity?.filled_percentage && capacity.filled_percentage > 90 ? "Critical Level" : "Normal Level"}
          icon={Droplets}
          color={capacity?.filled_percentage && capacity.filled_percentage > 90 ? "bg-amber-500 text-white animate-pulse" : "bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600"}
          loading={capacityLoading}
          onClick={() => navigate("/stock/tank-monitoring")}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        
        {/* Tank Capacity (25%) */}
        <Card className="xl:col-span-1 card-hover border-none bg-card/50 backdrop-blur-sm shadow-xl">
          <CardHeader>
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              <div>
                <CardTitle>Tank Capacity</CardTitle>
                <CardDescription>Live fill analytics</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {capacityLoading ? (
              <div className="flex items-center justify-center h-48 animate-pulse text-sm text-muted-foreground font-medium">Synchronizing…</div>
            ) : !capacity ? (
              <div className="flex flex-col items-center justify-center h-48 text-muted-foreground gap-2">
                <Inbox className="h-8 w-8 opacity-20" />
                <p className="text-xs font-medium">No capacity data</p>
              </div>
            ) : (
              <>
                <div className="relative group cursor-pointer" onClick={() => navigate("/stock/tank-monitoring")}>
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={95}
                        paddingAngle={4}
                        dataKey="value"
                        labelLine={false}
                        label={CustomPieLabel}
                        onMouseEnter={(_, i) => setActiveIndex(i)}
                        onMouseLeave={() => setActiveIndex(null)}
                        stroke="none"
                      >
                        {pieData.map((entry, i) => (
                          <Cell
                            key={entry.name}
                            fill={entry.color}
                            opacity={activeIndex === null || activeIndex === i ? 1 : 0.45}
                            style={{ transition: "all 0.3s ease" }}
                          />
                        ))}
                      </Pie>
                      <Tooltip content={<PieTooltip />} />
                      <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle">
                        <tspan x="50%" dy="-0.4em" fontSize={24} fontWeight={900} className="fill-foreground">
                          {capacity.filled_percentage.toFixed(1)}%
                        </tspan>
                        <tspan x="50%" dy="1.4em" fontSize={10} fontWeight={700} className="fill-muted-foreground uppercase tracking-widest">Utilised</tspan>
                      </text>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 rounded-full bg-background/50 backdrop-blur-sm -z-10 group-hover:scale-110 transition-transform duration-500" />
                </div>

                <div className="space-y-3 pt-4 border-t border-border/50">
                  {[
                    { label: "Total", val: capacity.total_capacity, color: "text-foreground", icon: Droplets },
                    { label: "Filled", val: capacity.filled_capacity, color: "text-blue-600 dark:text-blue-400", dot: "bg-blue-500" },
                    { label: "Empty", val: capacity.empty_capacity, color: "text-slate-500 dark:text-slate-400", dot: "bg-slate-300 dark:bg-slate-600" }
                  ].map((s) => (
                    <div key={s.label} className="flex items-center justify-between">
                      <span className={cn("text-xs font-bold uppercase tracking-wider flex items-center gap-2", s.color)}>
                        {s.dot ? <div className={cn("h-2 w-2 rounded-full", s.dot)} /> : <s.icon className="h-3.5 w-3.5" />}
                        {s.label}
                      </span>
                      <span className={cn("text-sm font-black", s.color)}>{fmtNum(s.val)} L</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Daily Price Trends (75%) */}
        <Card className="xl:col-span-3 card-hover border-none bg-card/50 backdrop-blur-sm shadow-xl overflow-hidden">
          <CardHeader className="pb-2">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle>Market Intelligence</CardTitle>
                  <CardDescription>Factory Rate trends (₹/Kg)</CardDescription>
                </div>
              </div>
              
              {/* Market Insights Panel */}
              {!trendsLoading && marketInsight && (
                <div className="flex gap-4">
                  <div className="bg-emerald-50 dark:bg-emerald-950/20 px-3 py-1.5 rounded-xl border border-emerald-100 dark:border-emerald-900/30 flex items-center gap-3">
                    <div className="p-1 bg-emerald-500 rounded-full text-white">
                      <ArrowUpRight className="h-3 w-3" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase leading-none mb-1">Top Gainer</p>
                      <p className="text-xs font-black truncate max-w-[80px]">{marketInsight.gainer.label}</p>
                    </div>
                    <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">+{marketInsight.gainer.pct.toFixed(1)}%</span>
                  </div>
                  <div className="bg-red-50 dark:bg-red-950/20 px-3 py-1.5 rounded-xl border border-red-100 dark:border-red-900/30 flex items-center gap-3">
                    <div className="p-1 bg-red-500 rounded-full text-white">
                      <ArrowDownRight className="h-3 w-3" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-red-600 dark:text-red-400 uppercase leading-none mb-1">Least Price</p>
                      <p className="text-xs font-black truncate max-w-[80px]">{marketInsight.loser.label}</p>
                    </div>
                    <span className="text-xs font-black text-red-600 dark:text-red-400">{marketInsight.loser.pct.toFixed(1)}%</span>
                  </div>
                </div>
              )}
            </div>

            {!trendsLoading && trends && (
              <div className="flex items-center gap-2 flex-wrap mt-6 pt-4 border-t border-border/50">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-7 text-[10px] font-bold uppercase tracking-widest px-2"
                  onClick={() => setSelectedLabels(new Set(trends.datasets.map((d) => d.label)))}
                >
                  Select All
                </Button>
                <div className="h-4 w-[1px] bg-border mx-1" />
                {trends.datasets.map((ds, i) => {
                  const color = PRICE_COLORS[i % PRICE_COLORS.length];
                  const active = selectedLabels.has(ds.label);
                  return (
                    <button
                      key={ds.label}
                      onClick={() => setSelectedLabels(prev => {
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
              <div className="flex items-center justify-center h-[450px] animate-pulse font-bold text-muted-foreground tracking-widest">ANALYZING TRENDS…</div>
            ) : priceChartData.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[450px] text-muted-foreground gap-4">
                <Inbox className="h-12 w-12 opacity-10" />
                <p className="font-bold uppercase tracking-widest text-sm">No price data synced</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={450}>
                <BarChart
                  data={priceChartData}
                  margin={{ top: 20, right: 20, left: 0, bottom: 40 }}
                  barCategoryGap="20%"
                  barGap={4}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.4} />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11, fontWeight: 600, fill: "hsl(var(--muted-foreground))" }}
                    tickLine={false}
                    axisLine={false}
                    angle={-35}
                    textAnchor="end"
                    dy={10}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fontWeight: 600, fill: "hsl(var(--muted-foreground))" }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `₹${v}`}
                    domain={['auto', 'auto']}
                  />
                  <Tooltip
                    cursor={{ fill: "hsl(var(--accent))", opacity: 0.2 }}
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
                                <span className="font-black text-sm">₹{(p.value as number).toFixed(2)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    }}
                  />
                  {activeDatasets.map((ds) => {
                    const colorIdx = (trends?.datasets.findIndex((d) => d.label === ds.label) ?? 0);
                    return (
                      <Bar
                        key={ds.label}
                        dataKey={ds.label}
                        fill={PRICE_COLORS[colorIdx % PRICE_COLORS.length]}
                        radius={[4, 4, 0, 0]}
                        maxBarSize={28}
                      />
                    );
                  })}
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Financial Outstanding Row */}
      <Card className="card-hover border-none bg-card/50 backdrop-blur-sm shadow-xl overflow-hidden">
        <CardHeader className="pb-0">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Landmark className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle>Financial Exposure — Top 10 Parties</CardTitle>
                <CardDescription>Receivables vs Payables analysis</CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-6 text-[10px] font-black uppercase tracking-[0.2em] bg-muted/30 px-6 py-3 rounded-2xl">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                <span className="text-emerald-600">Receivable</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
                <span className="text-red-600">Payable</span>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-10">
          {balanceLoading ? (
            <div className="flex items-center justify-center h-[550px] animate-pulse text-muted-foreground font-bold tracking-[0.3em]">AUDITING LEDGERS…</div>
          ) : barData.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[550px] text-muted-foreground gap-4">
              <Inbox className="h-16 w-12 opacity-10" />
              <p className="font-bold uppercase tracking-widest text-sm">No ledger data available</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={550}>
              <BarChart
                data={barData}
                layout="vertical"
                margin={{ top: 5, right: 80, left: 20, bottom: 20 }}
                barCategoryGap="25%"
                onClick={(data) => {
                  if (data && data.activePayload) {
                    const cardCode = data.activePayload[0].payload.code;
                    navigate(`/exim-account?cardCode=${cardCode}`);
                  }
                }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis
                  type="number"
                  tick={{ fontSize: 11, fontWeight: 600, fill: "hsl(var(--muted-foreground))" }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `₹${Math.abs(v) >= 10000000 ? (v / 10000000).toFixed(0) + "Cr" : fmtNum(v)}`}
                  domain={[-100000000, 100000000]}
                  ticks={[-100000000, -80000000, -60000000, -40000000, -20000000, 0, 20000000, 40000000, 60000000, 80000000, 100000000]}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={160}
                  tick={{ fontSize: 11, fontWeight: 700, fill: "hsl(var(--foreground))" }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip 
                  content={<BarTooltip />} 
                  cursor={{ fill: "hsl(var(--accent))", opacity: 0.2 }}
                />
                <Bar 
                  dataKey="balance" 
                  radius={[0, 6, 6, 0]} 
                  maxBarSize={32}
                  className="cursor-pointer"
                >
                  {barData.map((entry, i) => (
                    <Cell
                      key={i}
                      fill={entry.isPositive ? "url(#barGradientPos)" : "url(#barGradientNeg)"}
                    />
                  ))}
                  <LabelList
                    dataKey="balance"
                    content={({ x, y, width, height, value }: any) => {
                      const val = value as number;
                      const isPos = val >= 0;
                      const label = `₹${fmtNum(Math.abs(val), 0)}`;
                      const labelX = isPos ? (x + width + 8) : (x + width - 8);
                      return (
                        <text
                          x={labelX}
                          y={y + height / 2}
                          textAnchor={isPos ? "start" : "end"}
                          dominantBaseline="middle"
                          style={{ fontSize: 11, fontWeight: 900, fill: isPos ? "#10b981" : "#ef4444" }}
                        >
                          {label}
                        </text>
                      );
                    }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
