import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { BarChart3, CalendarDays, PackageOpen, RefreshCw, Target, TrendingUp } from "lucide-react";

import {
  getMonthlyPlanning,
  getPlannedMonths,
  type MonthlyPlanningEntry,
  type PlannedMonth,
} from "@/api/sapSync";
import { getErrorMessage } from "@/lib/errors";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

function parseDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatQty(value: number) {
  return Number(value || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 0,
  });
}

function formatMts(value: number) {
  return (Number(value || 0) / 1000).toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  });
}

function getDefaultMonthId(months: PlannedMonth[]) {
  if (months.length === 0) return "";

  const today = new Date();
  const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();

  const currentMonth = months.find((month) => {
    const start = parseDate(month.StartDate);
    const end = parseDate(month.EndDate);
    if (!start || !end) return false;
    const startOnly = new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime();
    const endOnly = new Date(end.getFullYear(), end.getMonth(), end.getDate()).getTime();
    return todayOnly >= startOnly && todayOnly <= endOnly;
  });
  if (currentMonth) return String(currentMonth.AbsID);

  const sorted = [...months].sort((a, b) => {
    const aDate = parseDate(a.StartDate)?.getTime() ?? 0;
    const bDate = parseDate(b.StartDate)?.getTime() ?? 0;
    return bDate - aDate;
  });
  return String(sorted[0].AbsID);
}

export default function PlanningReportPage() {
  const [months, setMonths] = useState<PlannedMonth[]>([]);
  const [selectedMonthId, setSelectedMonthId] = useState("");
  const [rows, setRows] = useState<MonthlyPlanningEntry[]>([]);
  const [monthsLoading, setMonthsLoading] = useState(true);
  const [planningLoading, setPlanningLoading] = useState(false);

  async function fetchMonths() {
    setMonthsLoading(true);
    try {
      const data = await getPlannedMonths();
      const sorted = [...data].sort((a, b) => {
        const aDate = parseDate(a.StartDate)?.getTime() ?? 0;
        const bDate = parseDate(b.StartDate)?.getTime() ?? 0;
        return bDate - aDate;
      });
      setMonths(sorted);
      setSelectedMonthId((current) => current || getDefaultMonthId(sorted));
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to load planned months"));
      setMonths([]);
      setSelectedMonthId("");
    } finally {
      setMonthsLoading(false);
    }
  }

  async function fetchPlanning(monthId: string) {
    const id = Number(monthId);
    if (!id) {
      setRows([]);
      return;
    }

    setPlanningLoading(true);
    try {
      const data = await getMonthlyPlanning(id);
      setRows([...data].sort((a, b) => Number(b.Quantity || 0) - Number(a.Quantity || 0)));
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to load monthly planning"));
      setRows([]);
    } finally {
      setPlanningLoading(false);
    }
  }

  useEffect(() => {
    fetchMonths();
  }, []);

  useEffect(() => {
    if (selectedMonthId) fetchPlanning(selectedMonthId);
  }, [selectedMonthId]);

  const selectedMonth = months.find((month) => String(month.AbsID) === selectedMonthId) || null;

  const summary = useMemo(() => {
    const total = rows.reduce((sum, row) => sum + Number(row.Quantity || 0), 0);
    const top = rows[0] || null;
    const average = rows.length > 0 ? total / rows.length : 0;
    return { total, top, average };
  }, [rows]);

  const maxQuantity = rows.reduce((max, row) => Math.max(max, Number(row.Quantity || 0)), 0);
  const isLoading = monthsLoading || planningLoading;

  return (
    <div className="p-2.5 sm:p-4 md:p-6 space-y-5 sm:space-y-6 animate-page">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight">PLANNING</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Select current or previous planning month
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
          <Select value={selectedMonthId} onValueChange={setSelectedMonthId} disabled={monthsLoading || months.length === 0}>
            <SelectTrigger className="h-9 w-full sm:w-[280px]">
              <SelectValue placeholder={monthsLoading ? "Loading months..." : "Select planning month"} />
            </SelectTrigger>
            <SelectContent>
              {months.map((month) => (
                <SelectItem key={month.AbsID} value={String(month.AbsID)}>
                  {month.Code.toUpperCase()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            onClick={() => selectedMonthId ? fetchPlanning(selectedMonthId) : fetchMonths()}
            variant="outline"
            className="btn-press h-9 gap-2 rounded-xl border-2 text-xs"
            disabled={isLoading}
          >
            <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </div>

      {selectedMonth && (
        <Card className="border bg-muted/20 shadow-sm">
          <CardContent className="p-3 sm:p-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <CalendarDays className="h-4 w-4 text-primary shrink-0" />
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Planning Month</p>
            </div>
            <Badge variant="secondary" className="rounded-full text-sm font-bold">
              {selectedMonth.Code.toUpperCase()}
            </Badge>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        <Card className="border-none bg-sky-50/70 dark:bg-sky-950/20 shadow-sm">
          <CardContent className="p-3 sm:p-4 flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <p className="text-[10px] sm:text-xs uppercase tracking-wide text-sky-600 dark:text-sky-400">Total Qty</p>
              <Target className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-sky-500" />
            </div>
            {isLoading ? <Skeleton className="h-8 w-24" /> : <h3 className="text-base sm:text-2xl font-bold tabular-nums">{formatQty(summary.total)}</h3>}
            <p className="text-[9px] sm:text-xs text-muted-foreground">{formatMts(summary.total)} MTS</p>
          </CardContent>
        </Card>

        <Card className="border-none bg-emerald-50/70 dark:bg-emerald-950/20 shadow-sm">
          <CardContent className="p-3 sm:p-4 flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <p className="text-[10px] sm:text-xs uppercase tracking-wide text-emerald-600 dark:text-emerald-400">Sub Groups</p>
              <BarChart3 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-emerald-500" />
            </div>
            {isLoading ? <Skeleton className="h-8 w-12" /> : <h3 className="text-base sm:text-2xl font-bold">{rows.length}</h3>}
            <p className="text-[9px] sm:text-xs text-muted-foreground">planned categories</p>
          </CardContent>
        </Card>

        <Card className="border-none bg-amber-50/70 dark:bg-amber-950/20 shadow-sm">
          <CardContent className="p-3 sm:p-4 flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <p className="text-[10px] sm:text-xs uppercase tracking-wide text-amber-600 dark:text-amber-400">Top Group</p>
              <TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-amber-500" />
            </div>
            {isLoading ? <Skeleton className="h-8 w-24" /> : <h3 className="text-sm sm:text-lg font-bold truncate">{summary.top?.U_Sub_Group || "-"}</h3>}
            <p className="text-[9px] sm:text-xs text-muted-foreground">{summary.top ? formatQty(summary.top.Quantity) : "No planning"}</p>
          </CardContent>
        </Card>

        <Card className="border-none bg-violet-50/70 dark:bg-violet-950/20 shadow-sm">
          <CardContent className="p-3 sm:p-4 flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <p className="text-[10px] sm:text-xs uppercase tracking-wide text-violet-600 dark:text-violet-400">Average</p>
              <CalendarDays className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-violet-500" />
            </div>
            {isLoading ? <Skeleton className="h-8 w-20" /> : <h3 className="text-base sm:text-2xl font-bold tabular-nums">{formatQty(summary.average)}</h3>}
            <p className="text-[9px] sm:text-xs text-muted-foreground">per subgroup</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3 px-4 sm:px-6">
          <CardTitle className="text-base sm:text-lg">MONTHLY PLANNING</CardTitle>
          <CardDescription className="text-[10px] sm:text-xs">
            {selectedMonth ? `${selectedMonth.Code.toUpperCase()} planning quantities` : "Select a planning month"}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-2">
              {Array.from({ length: 8 }).map((_, index) => (
                <Skeleton key={index} className="h-12 w-full rounded" />
              ))}
            </div>
          ) : rows.length > 0 ? (
            <>
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/60 text-[11px] uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="w-16 px-3 py-3 text-left font-bold">Rank</th>
                      <th className="w-[28%] px-3 py-3 text-left font-bold">Sub Group</th>
                      <th className="px-3 py-3 text-left font-bold">Planning</th>
                      <th className="w-[16%] px-3 py-3 text-right font-bold">Quantity</th>
                      <th className="w-[14%] px-3 py-3 text-right font-bold">MTS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {rows.map((row, index) => {
                      const pct = maxQuantity > 0 ? Math.max(3, (Number(row.Quantity || 0) / maxQuantity) * 100) : 0;
                      return (
                        <tr key={row.U_Sub_Group} className="hover:bg-muted/30">
                          <td className="px-3 py-3 text-muted-foreground">{index + 1}</td>
                          <td className="px-3 py-3 font-semibold">{row.U_Sub_Group}</td>
                          <td className="px-3 py-3">
                            <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                              <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                            </div>
                          </td>
                          <td className="px-3 py-3 text-right font-semibold tabular-nums">{formatQty(row.Quantity)}</td>
                          <td className="px-3 py-3 text-right text-muted-foreground tabular-nums">{formatMts(row.Quantity)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="md:hidden space-y-3 p-4">
                {rows.map((row, index) => {
                  const pct = maxQuantity > 0 ? Math.max(3, (Number(row.Quantity || 0) / maxQuantity) * 100) : 0;
                  return (
                    <div key={row.U_Sub_Group} className="rounded-xl border bg-card p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-bold truncate">{row.U_Sub_Group}</p>
                          <p className="text-xs text-muted-foreground">Rank {index + 1}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold tabular-nums">{formatQty(row.Quantity)}</p>
                          <p className="text-xs text-muted-foreground">{formatMts(row.Quantity)} MTS</p>
                        </div>
                      </div>
                      <div className="mt-3 h-2.5 rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
              <PackageOpen className="h-10 w-10 stroke-1" />
              <div className="text-center">
                <p className="text-sm font-semibold text-foreground">No planning found</p>
                <p className="text-xs mt-1">This month does not have monthly planning rows.</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
