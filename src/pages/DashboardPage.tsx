import { useEffect, useState } from "react";
import { toast } from "sonner";
import { RefreshCw, Droplets, BarChart3, Landmark, TrendingUp } from "lucide-react";

import { AxiosError } from "axios";
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
  type PieLabelRenderProps,
} from "recharts";

import { getCapacityInsights, type CapacityInsight } from "@/api/dashboard";
import { syncBalanceSheet, type BalanceEntry } from "@/api/sapSync";
import { getPriceTrends, type PriceTrendsResponse } from "@/api/dailyPrice";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

/* ── helpers ───────────────────────────────────────────────── */

function fmtNum(n: number, decimals = 0) {
  return n.toLocaleString("en-IN", { maximumFractionDigits: decimals });
}

function truncate(str: string, max = 22) {
  return str.length > max ? str.slice(0, max) + "…" : str;
}

/* ── pie chart helpers ─────────────────────────────────────── */

const FILLED_COLOR = "#3b82f6";
const EMPTY_COLOR  = "#e2e8f0";

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

interface PieTooltipEntry {
  name: string;
  value: number;
  payload: { unit: string };
}

function PieTooltip({ active, payload }: { active?: boolean; payload?: PieTooltipEntry[] }) {
  if (!active || !payload?.length) return null;
  const e = payload[0];
  return (
    <div className="rounded-lg border bg-card shadow-lg px-4 py-3 text-sm">
      <p className="font-semibold mb-1">{e.name}</p>
      <p className="text-muted-foreground">{fmtNum(e.value)} {e.payload.unit}</p>
    </div>
  );
}

/* ── bar chart helpers ─────────────────────────────────────── */

interface BarEntry {
  name: string;       // truncated for axis
  fullName: string;   // full name for tooltip
  balance: number;
  absBalance: number;
  isPositive: boolean;
}

interface BarTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: BarEntry }>;
}

function BarTooltip({ active, payload }: BarTooltipProps) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  const isPos = d.balance >= 0;
  return (
    <div className="rounded-lg border bg-card shadow-lg px-4 py-3 text-sm max-w-xs">
      <p className="font-semibold mb-2 leading-tight">{d.fullName}</p>
      <div className="flex items-center gap-2">
        <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${isPos ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400" : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400"}`}>
          {isPos ? "Receivable" : "Payable"}
        </span>
        <span className={`font-bold ${isPos ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
          ₹ {fmtNum(Math.abs(d.balance), 0)}
        </span>
      </div>
    </div>
  );
}

const PRICE_COLORS = [
  "#3b82f6","#8b5cf6","#f59e0b","#22c55e","#ef4444",
  "#06b6d4","#f97316","#ec4899","#14b8a6","#6366f1","#84cc16","#d97706",
];

/* ── component ─────────────────────────────────────────────── */

export default function DashboardPage() {
  const [capacity, setCapacity] = useState<CapacityInsight | null>(null);
  const [capacityLoading, setCapacityLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const [balanceEntries, setBalanceEntries] = useState<BalanceEntry[]>([]);
  const [balanceLoading, setBalanceLoading] = useState(true);

  const [trends, setTrends] = useState<PriceTrendsResponse | null>(null);
  const [trendsLoading, setTrendsLoading] = useState(true);
  const [selectedLabels, setSelectedLabels] = useState<Set<string>>(new Set());

  async function fetchAll() {
    setCapacityLoading(true);
    setBalanceLoading(true);
    setTrendsLoading(true);

    const [capResult, balResult, trendResult] = await Promise.allSettled([
      getCapacityInsights(),
      syncBalanceSheet(),
      getPriceTrends(),
    ]);

    if (capResult.status === "fulfilled") {
      setCapacity(capResult.value);
    } else {
      const err = capResult.reason;
      toast.error(err instanceof AxiosError ? (err.response?.data?.detail ?? err.message) : "Failed to load capacity data");
    }
    setCapacityLoading(false);

    if (balResult.status === "fulfilled") {
      setBalanceEntries(balResult.value);
    } else {
      const err = balResult.reason;
      toast.error(err instanceof AxiosError ? (err.response?.data?.detail ?? err.message) : "Failed to load balance data");
    }
    setBalanceLoading(false);

    if (trendResult.status === "fulfilled") {
      const data = trendResult.value;
      setTrends(data);
      setSelectedLabels(new Set(data.datasets.map((d) => d.label)));
    } else {
      const err = trendResult.reason;
      toast.error(err instanceof AxiosError ? (err.response?.data?.detail ?? err.message) : "Failed to load price trends");
    }
    setTrendsLoading(false);
  }

  useEffect(() => {
    fetchAll();
  }, []);

  function toggleLabel(label: string) {
    setSelectedLabels((prev) => {
      const next = new Set(prev);
      if (next.has(label)) {
        if (next.size === 1) return prev;
        next.delete(label);
      } else {
        next.add(label);
      }
      return next;
    });
  }

  /* ── pie data ── */
  const pieData = capacity
    ? [
        { name: "Filled", value: capacity.filled_capacity, unit: "Liter", color: FILLED_COLOR },
        { name: "Empty",  value: capacity.empty_capacity,  unit: "Liter", color: EMPTY_COLOR  },
      ]
    : [];

  /* ── top/bottom 5 bar data ── */
  const barData: BarEntry[] = (() => {
    if (!balanceEntries.length) return [];
    const sorted = [...balanceEntries].sort((a, b) => a.Balance - b.Balance);
    const bottom5 = sorted.slice(0, 5);
    const top5    = sorted.slice(-5).reverse();
    return [...top5, ...bottom5].map((e) => ({
      name:       truncate(e.CardName),
      fullName:   e.CardName,
      balance:    e.Balance,
      absBalance: Math.abs(e.Balance),
      isPositive: e.Balance >= 0,
    }));
  })();

  /* ── grouped bar chart data (dates × selected commodities) ── */
  const priceChartData: Record<string, string | number | null>[] = (() => {
    if (!trends) return [];
    return trends.labels.map((date, i) => {
      const row: Record<string, string | number | null> = { date };
      for (const ds of trends.datasets) {
        if (selectedLabels.has(ds.label)) row[ds.label] = ds.data[i] ?? null;
      }
      return row;
    });
  })();

  const activeDatasets = trends?.datasets.filter((ds) => selectedLabels.has(ds.label)) ?? [];

  const loading = capacityLoading || balanceLoading || trendsLoading;

  return (
    <div className="p-6 space-y-6 animate-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Operational insights at a glance</p>
        </div>
        <Button variant="outline" className="btn-press gap-2" onClick={fetchAll} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* ── Row 1: Tank Capacity ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 card-hover shimmer-hover">
          <CardHeader>
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              <div>
                <CardTitle>Tank Capacity Utilisation</CardTitle>
                <CardDescription>Current fill level across all tanks</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {capacityLoading ? (
              <div className="flex items-center justify-center h-72 text-muted-foreground text-sm animate-pulse">Loading…</div>
            ) : !capacity ? (
              <div className="flex items-center justify-center h-72 text-muted-foreground text-sm">No data available</div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={120}
                    paddingAngle={3}
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
                        style={{ cursor: "pointer", transition: "opacity 0.2s" }}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<PieTooltip />} />
                  <Legend formatter={(v) => <span className="text-sm font-medium">{v}</span>} />
                  <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle">
                    <tspan x="50%" dy="-0.4em" fontSize={22} fontWeight={700} fill="currentColor">
                      {capacity.filled_percentage.toFixed(1)}%
                    </tspan>
                    <tspan x="50%" dy="1.4em" fontSize={12} fill="#94a3b8">utilised</tspan>
                  </text>
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <div className="flex flex-col gap-4">
          <Card className="card-hover flex-1">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Droplets className="h-4 w-4" />
                Total Capacity
              </CardTitle>
            </CardHeader>
            <CardContent>
              {capacityLoading ? <div className="h-8 w-24 bg-muted animate-pulse rounded" /> : (
                <>
                  <p className="text-3xl font-bold">{capacity ? fmtNum(capacity.total_capacity) : "—"}</p>
                  <p className="text-xs text-muted-foreground mt-1">Liter</p>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="card-hover flex-1 border-blue-200 dark:border-blue-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2 text-blue-600 dark:text-blue-400">
                <div className="h-3 w-3 rounded-full bg-blue-500" />
                Filled Capacity
              </CardTitle>
            </CardHeader>
            <CardContent>
              {capacityLoading ? <div className="h-8 w-24 bg-muted animate-pulse rounded" /> : (
                <>
                  <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                    {capacity ? fmtNum(capacity.filled_capacity) : "—"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Liter &mdash; {capacity?.filled_percentage.toFixed(1)}% of total
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="card-hover flex-1 border-slate-200 dark:border-slate-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2 text-slate-500 dark:text-slate-400">
                <div className="h-3 w-3 rounded-full bg-slate-300 dark:bg-slate-600" />
                Empty Capacity
              </CardTitle>
            </CardHeader>
            <CardContent>
              {capacityLoading ? <div className="h-8 w-24 bg-muted animate-pulse rounded" /> : (
                <>
                  <p className="text-3xl font-bold text-slate-500 dark:text-slate-400">
                    {capacity ? fmtNum(capacity.empty_capacity) : "—"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Liter &mdash; {capacity?.empty_percentage.toFixed(1)}% of total
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── Row 2: Daily Price Trends ── */}
      <Card className="card-hover shimmer-hover">
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              <div>
                <CardTitle>Daily Price — Factory Rate (₹/Kg)</CardTitle>
                <CardDescription>
                  {trends ? `${trends.labels.length} days · Toggle commodities to compare` : "Price trends across dates"}
                </CardDescription>
              </div>
            </div>
            {!trendsLoading && trends && (
              <div className="flex items-center gap-1.5 flex-wrap justify-end max-w-lg">
                <button
                  onClick={() => setSelectedLabels(new Set(trends.datasets.map((d) => d.label)))}
                  className="text-xs text-primary underline-offset-2 hover:underline"
                >
                  All
                </button>
                <span className="text-muted-foreground text-xs">|</span>
                {trends.datasets.map((ds, i) => {
                  const color = PRICE_COLORS[i % PRICE_COLORS.length];
                  const active = selectedLabels.has(ds.label);
                  return (
                    <button
                      key={ds.label}
                      onClick={() => toggleLabel(ds.label)}
                      title={ds.label}
                      className={`flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium border transition-all ${
                        active ? "text-white shadow-sm" : "bg-transparent text-muted-foreground hover:border-foreground/40"
                      }`}
                      style={active ? { backgroundColor: color, borderColor: color } : { borderColor: "hsl(var(--border))" }}
                    >
                      <span className="inline-block h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: active ? "white" : color }} />
                      {ds.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {trendsLoading ? (
            <div className="flex items-center justify-center h-72 text-muted-foreground text-sm animate-pulse">Loading…</div>
          ) : priceChartData.length === 0 ? (
            <div className="flex items-center justify-center h-72 text-muted-foreground text-sm">No price data available</div>
          ) : (
            <ResponsiveContainer width="100%" height={320}>
              <BarChart
                data={priceChartData}
                margin={{ top: 8, right: 16, left: 8, bottom: 40 }}
                barCategoryGap="20%"
                barGap={2}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  angle={-40}
                  textAnchor="end"
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `₹${v}`}
                  domain={([dataMin, dataMax]: readonly [number, number]): [number, number] => {
                    const pad = (dataMax - dataMin) * 0.08 || 5;
                    return [Math.floor(dataMin - pad), Math.ceil(dataMax + pad)];
                  }}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null;
                    return (
                      <div className="rounded-lg border bg-card shadow-lg px-4 py-3 text-sm min-w-[160px]">
                        <p className="font-semibold mb-2 text-xs text-muted-foreground">{label}</p>
                        {payload.map((p) => (
                          <div key={p.dataKey as string} className="flex items-center justify-between gap-4 py-0.5">
                            <span className="flex items-center gap-1.5">
                              <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: p.color }} />
                              <span className="text-xs">{p.dataKey}</span>
                            </span>
                            <span className="font-bold text-xs">₹{(p.value as number).toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    );
                  }}
                  cursor={{ fill: "hsl(var(--accent))", opacity: 0.4 }}
                />
                {activeDatasets.map((ds, i) => (
                  <Bar
                    key={ds.label}
                    dataKey={ds.label}
                    fill={PRICE_COLORS[i % PRICE_COLORS.length]}
                    fillOpacity={0.85}
                    radius={[3, 3, 0, 0]}
                    maxBarSize={20}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* ── Row 3: Dr/Cr Top 10 Parties ── */}
      <Card className="card-hover shimmer-hover">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Landmark className="h-5 w-5 text-primary" />
            <div>
              <CardTitle>Dr/Cr Outstanding — Top 10 Parties</CardTitle>
              <CardDescription>
                Top 5 receivables (green) &amp; top 5 payables (red) by outstanding balance
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {balanceLoading ? (
            <div className="flex items-center justify-center h-80 text-muted-foreground text-sm animate-pulse">Loading…</div>
          ) : barData.length === 0 ? (
            <div className="flex items-center justify-center h-80 text-muted-foreground text-sm">No balance data available</div>
          ) : (
            <ResponsiveContainer width="100%" height={420}>
              <BarChart
                data={barData}
                layout="vertical"
                margin={{ top: 8, right: 60, left: 8, bottom: 8 }}
                barCategoryGap="20%"
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                <XAxis
                  type="number"
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `₹${Math.abs(v) >= 10000000 ? (Math.abs(v) / 10000000).toFixed(2) + "Cr" : fmtNum(Math.abs(v))}`}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={160}
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                />
                <ReferenceLine x={0} stroke="hsl(var(--border))" strokeWidth={2} />
                <Tooltip content={<BarTooltip />} cursor={{ fill: "hsl(var(--accent))", opacity: 0.4 }} />
                <Bar dataKey="balance" radius={[0, 4, 4, 0]} maxBarSize={28}>
                  {barData.map((entry, i) => (
                    <Cell
                      key={i}
                      fill={entry.isPositive ? "#22c55e" : "#ef4444"}
                      fillOpacity={0.85}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}

          {/* Legend */}
          {!balanceLoading && barData.length > 0 && (
            <div className="flex items-center justify-center gap-6 mt-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-3 w-3 rounded bg-green-500" />
                Receivable (Party owes to company)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-3 w-3 rounded bg-red-500" />
                Payable (company owes to party)
              </span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
