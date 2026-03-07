import { useEffect, useState } from "react";
import { AxiosError } from "axios";
import { toast } from "sonner";
import { RefreshCw, Save, ExternalLink, PackageOpen, Calendar, TrendingUp } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

import {
  fetchDailyPrices,
  saveDailyPrices,
  getDailyPricesByDate,
  getPriceTrends,
  type DbDailyPrice,
  type PriceTrendsResponse,
} from "@/api/dailyPrice";
import { useDailyPrice } from "@/context/DailyPriceContext";
import { Skeleton } from "@/components/ui/skeleton";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const LINE_COLORS = [
  "#2563eb", // blue
  "#f97316", // orange
  "#16a34a", // green
  "#dc2626", // red
  "#8b5cf6", // violet
  "#0891b2", // cyan
  "#d946ef", // fuchsia
  "#ca8a04", // yellow
];

function getPast7Days(): { value: string; label: string }[] {
  const days: { value: string; label: string }[] = [];
  const today = new Date();
  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const iso = d.toISOString().slice(0, 10);
    const label = d.toLocaleDateString("en-IN", {
      weekday: "short",
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
    days.push({ value: iso, label: i === 0 ? `${label} (Today)` : label });
  }
  return days;
}

export default function DailyPricePage() {
  const { prices, count, fetched, setPrices, setCount, setFetched } = useDailyPrice();
  const [fetching, setFetching] = useState(false);
  const [saving, setSaving] = useState(false);

  // Trends chart
  const [trends, setTrends] = useState<PriceTrendsResponse | null>(null);
  const [trendsLoading, setTrendsLoading] = useState(true);

  useEffect(() => {
    async function loadTrends() {
      setTrendsLoading(true);
      try {
        const data = await getPriceTrends();
        setTrends(data);
      } catch {
        // non-critical
      } finally {
        setTrendsLoading(false);
      }
    }
    loadTrends();
  }, []);

  // Transform trends API response into Recharts row format
  const chartData = trends
    ? trends.labels.map((label, i) => {
        const row: Record<string, string | number> = { date: label };
        for (const ds of trends.datasets) {
          row[ds.label] = ds.data[i] ?? null;
        }
        return row;
      })
    : [];

  // DB saved prices filter
  const past7Days = getPast7Days();
  const [selectedDate, setSelectedDate] = useState("");
  const [dbPrices, setDbPrices] = useState<DbDailyPrice[]>([]);
  const [dbLoading, setDbLoading] = useState(false);

  async function handleFetch() {
    setFetching(true);
    try {
      const res = await fetchDailyPrices();
      setPrices(res.preview_data);
      setCount(res.count);
      setFetched(true);
      toast.success(`Fetched ${res.count} commodity prices`);
    } catch (err) {
      const msg =
        err instanceof AxiosError
          ? err.response?.data?.detail ?? err.message
          : "Failed to fetch prices";
      toast.error(msg);
    } finally {
      setFetching(false);
    }
  }

  async function handleDateFilter(date: string) {
    setSelectedDate(date);
    if (!date) {
      setDbPrices([]);
      return;
    }
    setDbLoading(true);
    try {
      const data = await getDailyPricesByDate(date);
      setDbPrices(data);
      if (data.length === 0) {
        toast.info(`No saved prices found for ${date}`);
      }
    } catch (err) {
      const msg =
        err instanceof AxiosError
          ? err.response?.data?.detail ?? err.message
          : "Failed to load saved prices";
      toast.error(msg);
    } finally {
      setDbLoading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await saveDailyPrices();
      toast.success(res.status);
    } catch (err) {
      const msg =
        err instanceof AxiosError
          ? err.response?.data?.detail ?? err.message
          : "Failed to save prices";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-6 space-y-6 animate-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Daily Commodity Prices</h1>
          <p className="text-sm text-muted-foreground">
            Fetch today's commodity prices from the Google Sheet
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button className="btn-press" onClick={handleFetch} disabled={fetching}>
            <RefreshCw className={`h-4 w-4 mr-2 ${fetching ? "animate-spin" : ""}`} />
            {fetching ? "Fetching..." : "Fetch Prices"}
          </Button>
          {fetched && prices.length > 0 && (
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

      {/* Table Card */}
      <Card className="card-hover shimmer-hover">
        <CardHeader>
          <CardTitle>Commodity Prices</CardTitle>
          <CardDescription>
            {fetched
              ? `${count} commodities fetched${prices.length > 0 ? ` — ${prices[0].fetched_date}` : ""}`
              : "Click \"Fetch Prices\" to load data from the Google Sheet"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Commodity</TableHead>
                  <TableHead className="text-right">Factory (₹/Kg)</TableHead>
                  <TableHead className="text-right">With Packing (₹/Kg)</TableHead>
                  <TableHead className="text-right">With GST (₹/Kg)</TableHead>
                  <TableHead className="text-right">With GST (₹/Ltr)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {prices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-16">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <PackageOpen className="h-10 w-10 stroke-1" />
                        <p className="text-sm font-medium">No prices loaded</p>
                        <p className="text-xs">
                          Fetch commodity prices from the Google Sheet to see them here.
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  prices.map((item, idx) => (
                    <TableRow key={item.commodity_name}>
                      <TableCell className="font-medium">{idx + 1}</TableCell>
                      <TableCell>{item.commodity_name}</TableCell>
                      <TableCell className="text-right">
                        {Number(item.factory_kg).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-right">
                        {Number(item.packing_kg).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-right">
                        {Number(item.gst_kg).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-right">
                        {Number(item.gst_ltr).toLocaleString("en-IN", { minimumFractionDigits: 4, maximumFractionDigits: 4 })}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Saved Prices by Date */}
      <Card className="card-hover shimmer-hover">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Saved Prices</CardTitle>
              <CardDescription>
                {selectedDate
                  ? `${dbPrices.length} commodities for ${selectedDate}`
                  : "Select a date to view saved prices from the database"}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <Select value={selectedDate || "__none__"} onValueChange={(v) => handleDateFilter(v === "__none__" ? "" : v)}>
                <SelectTrigger className="w-[220px]">
                  <SelectValue placeholder="Select date" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Select date</SelectItem>
                  {past7Days.map((d) => (
                    <SelectItem key={d.value} value={d.value}>
                      {d.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Commodity</TableHead>
                  <TableHead className="text-right">Factory (₹/Kg)</TableHead>
                  <TableHead className="text-right">With Packing (₹/Kg)</TableHead>
                  <TableHead className="text-right">With GST (₹/Kg)</TableHead>
                  <TableHead className="text-right">With GST (₹/Ltr)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dbLoading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><div className="h-4 w-6 bg-muted animate-pulse rounded" /></TableCell>
                      <TableCell><div className="h-4 w-32 bg-muted animate-pulse rounded" /></TableCell>
                      <TableCell><div className="h-4 w-16 bg-muted animate-pulse rounded ml-auto" /></TableCell>
                      <TableCell><div className="h-4 w-16 bg-muted animate-pulse rounded ml-auto" /></TableCell>
                      <TableCell><div className="h-4 w-16 bg-muted animate-pulse rounded ml-auto" /></TableCell>
                      <TableCell><div className="h-4 w-16 bg-muted animate-pulse rounded ml-auto" /></TableCell>
                    </TableRow>
                  ))
                ) : dbPrices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-16">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <PackageOpen className="h-10 w-10 stroke-1" />
                        <p className="text-sm font-medium">No saved prices</p>
                        <p className="text-xs">
                          {selectedDate
                            ? `No prices found for ${selectedDate}.`
                            : "Select a date from the dropdown to view saved prices."}
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  dbPrices.map((item, idx) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{idx + 1}</TableCell>
                      <TableCell>{item.commodity_name}</TableCell>
                      <TableCell className="text-right">
                        {Number(item.factory_price).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-right">
                        {Number(item.packing_cost_kg).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-right">
                        {Number(item.with_gst_kg).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-right">
                        {Number(item.with_gst_ltr).toLocaleString("en-IN", { minimumFractionDigits: 4, maximumFractionDigits: 4 })}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Price Trends Chart */}
      <Card className="card-hover shimmer-hover">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Price Trends
          </CardTitle>
          <CardDescription>
            {trends
              ? `${trends.datasets.length} commodities over ${trends.labels.length} days`
              : "Loading price trends..."}
          </CardDescription>
        </CardHeader>
        <CardContent>
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
                  tick={{ fontSize: 14 }}
                  tickLine={false}
                  axisLine={false}
                  padding={{ left: 10, right: 10 }}
                />
                <YAxis
                  tick={{ fontSize: 14 }}
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
                      <div
                        className="bg-card border border-border"
                        style={{
                          borderRadius: 8,
                          boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                          minWidth: 180,
                          maxWidth: 280,
                          overflow: "hidden",
                          opacity: 1,
                        }}
                      >
                        <div
                          className="bg-muted border-b border-border text-foreground"
                          style={{
                            padding: "8px 14px",
                            fontWeight: 700,
                            fontSize: 14,
                          }}
                        >
                          {label}
                        </div>
                        <div style={{ padding: "6px 0" }}>
                          {payload.map((entry, idx) => (
                            <div
                              key={idx}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                gap: 12,
                                padding: "4px 14px",
                                fontSize: 14,
                                color: "inherit",
                              }}
                            >
                              <span style={{ display: "flex", alignItems: "center", gap: 6, overflow: "hidden" }}>
                                <span
                                  style={{
                                    width: 10,
                                    height: 10,
                                    borderRadius: "50%",
                                    backgroundColor: entry.color,
                                    flexShrink: 0,
                                  }}
                                />
                                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                  {entry.name}
                                </span>
                              </span>
                              <span style={{ fontWeight: 600, whiteSpace: "nowrap" }}>
                                {entry.value != null ? `₹${Number(entry.value).toFixed(2)}` : "—"}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  }}
                  wrapperStyle={{ zIndex: 50, opacity: "1 !important" }}
                  allowEscapeViewBox={{ x: false, y: false }}
                />
                <Legend wrapperStyle={{ fontSize: "14px", paddingTop: "24px" }} />
                {trends.datasets.map((ds, i) => (
                  <Line
                    key={ds.label}
                    type="monotone"
                    dataKey={ds.label}
                    stroke={LINE_COLORS[i % LINE_COLORS.length]}
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                    connectNulls
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
