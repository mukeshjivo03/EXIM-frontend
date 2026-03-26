import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowDownToLine,
  ArrowRightLeft,
  ArrowUpFromLine,
  ChevronDown,
  ChevronRight,
  Container,
  Download,
  Eye,
  Search,
} from "lucide-react";
import * as XLSX from "xlsx";
import { toast } from "sonner";

import { getErrorMessage } from "@/lib/errors";
import { Pagination } from "@/components/Pagination";
import { getTankLogs, type TankLog } from "@/api/tank";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/* ── helpers ─────────────────────────────────────────── */

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function relativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay === 1) return "Yesterday";
  if (diffDay < 7) return `${diffDay}d ago`;
  return "";
}

type LogType = "INWARD" | "OUTWARD" | "TRANSFER";
type FilterType = "ALL" | LogType;
type DateRange = "all" | "today" | "7d" | "30d" | "custom";

function logLabel(type: LogType): string {
  if (type === "INWARD") return "IN";
  if (type === "OUTWARD") return "OUT";
  return "TRANSFER";
}

function logBadgeClass(type: LogType): string {
  if (type === "INWARD")
    return "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/40 dark:text-green-400 dark:border-green-800";
  if (type === "OUTWARD")
    return "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/40 dark:text-orange-400 dark:border-orange-800";
  return "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/40 dark:text-blue-400 dark:border-blue-800";
}

function logIcon(type: LogType) {
  if (type === "INWARD")
    return <ArrowDownToLine className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />;
  if (type === "OUTWARD")
    return <ArrowUpFromLine className="h-3.5 w-3.5 text-orange-600 dark:text-orange-400" />;
  return <ArrowRightLeft className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />;
}

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/* ── component ───────────────────────────────────────── */

export default function TankLogsPage() {
  const [logs, setLogs] = useState<TankLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filters
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<FilterType>("ALL");
  const [dateRange, setDateRange] = useState<DateRange>("all");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  // View dialog
  const [viewTarget, setViewTarget] = useState<TankLog | null>(null);

  // Expandable rows
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

  // Pagination
  const [page, setPage] = useState(1);
  const perPage = 20;

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getTankLogs();
      // Deduplicate transfer logs: backend creates two entries per transfer
      // (one per tank). Keep only the source-side entry so each transfer
      // shows as a single "from → to" row.
      const seen = new Set<string>();
      const deduped = data.filter((log) => {
        if (log.log_type !== "TRANSFER") return true;
        const src = log.source_tank_code;
        const dst = log.destination_tank_code;
        if (!src || !dst) return true;
        // Build a key from both tanks + quantity + timestamp (truncated to minute)
        const ts = log.created_at.slice(0, 16);
        const key = [src, dst, log.quantity, ts].sort().join("|");
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      setLogs(
        deduped.sort(
          (a, b) =>
            new Date(b.created_at).getTime() -
            new Date(a.created_at).getTime()
        )
      );
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load tank logs"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Reset page on filter change
  useEffect(() => {
    setPage(1);
  }, [search, typeFilter, dateRange, customFrom, customTo]);

  /* ── filtering ──────────────────────────────────── */

  const filteredLogs = useMemo(() => {
    const now = new Date();
    return logs.filter((log) => {
      // Type filter
      if (typeFilter !== "ALL" && log.log_type !== typeFilter) return false;

      // Search
      if (search.trim()) {
        const q = search.toLowerCase();
        if (
          !log.tank_code.toLowerCase().includes(q) &&
          !log.created_by.toLowerCase().includes(q) &&
          !log.remarks?.toLowerCase().includes(q) &&
          !(log.source_tank_code?.toLowerCase().includes(q)) &&
          !(log.destination_tank_code?.toLowerCase().includes(q))
        )
          return false;
      }

      // Date range
      const logDate = new Date(log.created_at);
      if (dateRange === "today") {
        if (logDate < startOfDay(now)) return false;
      } else if (dateRange === "7d") {
        const d = new Date(now);
        d.setDate(d.getDate() - 7);
        if (logDate < startOfDay(d)) return false;
      } else if (dateRange === "30d") {
        const d = new Date(now);
        d.setDate(d.getDate() - 30);
        if (logDate < startOfDay(d)) return false;
      } else if (dateRange === "custom") {
        if (customFrom && logDate < new Date(customFrom)) return false;
        if (customTo) {
          const to = new Date(customTo);
          to.setHours(23, 59, 59, 999);
          if (logDate > to) return false;
        }
      }

      return true;
    });
  }, [logs, search, typeFilter, dateRange, customFrom, customTo]);

  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / perPage));
  const paginatedLogs = filteredLogs.slice(
    (page - 1) * perPage,
    page * perPage
  );

  /* ── summary stats ──────────────────────────────── */

  const stats = useMemo(() => {
    const inward = filteredLogs.filter((l) => l.log_type === "INWARD");
    const outward = filteredLogs.filter((l) => l.log_type === "OUTWARD");
    const transfer = filteredLogs.filter((l) => l.log_type === "TRANSFER");
    const inVol = inward.reduce((s, l) => s + Number(l.quantity), 0);
    const outVol = outward.reduce((s, l) => s + Number(l.quantity), 0);
    const transferVol = transfer.reduce((s, l) => s + Number(l.quantity), 0);
    return {
      total: filteredLogs.length,
      inCount: inward.length,
      outCount: outward.length,
      transferCount: transfer.length,
      inVol,
      outVol,
      transferVol,
      netVol: inVol - outVol,
    };
  }, [filteredLogs]);

  /* ── expand toggle ──────────────────────────────── */

  function toggleExpand(id: number) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  /* ── excel export ───────────────────────────────── */

  function handleExport() {
    if (filteredLogs.length === 0) {
      toast.error("No logs to export.");
      return;
    }

    const rows = filteredLogs.map((log) => ({
      "Tank Code": log.tank_code,
      "Log Type": log.log_type,
      ...(log.log_type === "TRANSFER"
        ? {
            "Source Tank": log.source_tank_code || "",
            "Destination Tank": log.destination_tank_code || "",
          }
        : {}),
      "Quantity (L)": Number(log.quantity),
      Remarks: log.remarks || "",
      "Created At": formatDate(log.created_at),
      "Created By": log.created_by,
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Tank Logs");
    XLSX.writeFile(
      wb,
      `Tank_Logs_${new Date().toISOString().slice(0, 10)}.xlsx`
    );
    toast.success("Exported to Excel");
  }

  /* ── render ─────────────────────────────────────── */

  return (
    <div className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6 animate-page">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Tank Logs</h1>
          <p className="text-sm text-muted-foreground">
            Inward, outward, and transfer operation logs
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={handleExport}
          disabled={loading || filteredLogs.length === 0}
        >
          <Download className="h-4 w-4" />
          Export Excel
        </Button>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {/* Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-xs text-muted-foreground">Total Logs</p>
            <p className="text-2xl font-bold mt-0.5">
              {loading ? <Skeleton className="h-8 w-16" /> : stats.total}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <ArrowDownToLine className="h-3 w-3 text-green-600" /> Inward
            </p>
            {loading ? (
              <Skeleton className="h-8 w-20 mt-1" />
            ) : (
              <>
                <p className="text-2xl font-bold mt-0.5 text-green-600 dark:text-green-400">
                  {stats.inCount}
                </p>
                <p className="text-xs text-muted-foreground">
                  {stats.inVol.toLocaleString("en-IN")} L
                </p>
              </>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <ArrowUpFromLine className="h-3 w-3 text-orange-600" /> Outward
            </p>
            {loading ? (
              <Skeleton className="h-8 w-20 mt-1" />
            ) : (
              <>
                <p className="text-2xl font-bold mt-0.5 text-orange-600 dark:text-orange-400">
                  {stats.outCount}
                </p>
                <p className="text-xs text-muted-foreground">
                  {stats.outVol.toLocaleString("en-IN")} L
                </p>
              </>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <ArrowRightLeft className="h-3 w-3 text-blue-600" /> Transfer
            </p>
            {loading ? (
              <Skeleton className="h-8 w-20 mt-1" />
            ) : (
              <>
                <p className="text-2xl font-bold mt-0.5 text-blue-600 dark:text-blue-400">
                  {stats.transferCount}
                </p>
                <p className="text-xs text-muted-foreground">
                  {stats.transferVol.toLocaleString("en-IN")} L
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Table Card */}
      <Card className="card-hover shimmer-hover">
        <CardHeader>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <CardTitle>Logs</CardTitle>
              <CardDescription>
                {filteredLogs.length}
                {filteredLogs.length !== logs.length
                  ? ` of ${logs.length}`
                  : ""}{" "}
                log entries
              </CardDescription>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search logs..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 h-9 w-44 sm:w-52"
                />
              </div>
              {/* Date range */}
              <Select
                value={dateRange}
                onValueChange={(v) => setDateRange(v as DateRange)}
              >
                <SelectTrigger className="h-9 w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All time</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="7d">Last 7 days</SelectItem>
                  <SelectItem value="30d">Last 30 days</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Custom date inputs */}
          {dateRange === "custom" && (
            <div className="flex items-center gap-2 mt-3">
              <Input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="h-9 w-40"
              />
              <span className="text-sm text-muted-foreground">to</span>
              <Input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="h-9 w-40"
              />
            </div>
          )}

          {/* Type filter tabs */}
          <div className="flex gap-1 mt-3">
            {(
              [
                { key: "ALL", label: "All" },
                { key: "INWARD", label: "Inward" },
                { key: "OUTWARD", label: "Outward" },
                { key: "TRANSFER", label: "Transfer" },
              ] as { key: FilterType; label: string }[]
            ).map((tab) => (
              <button
                key={tab.key}
                type="button"
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  typeFilter === tab.key
                    ? tab.key === "INWARD"
                      ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400"
                      : tab.key === "OUTWARD"
                        ? "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400"
                        : tab.key === "TRANSFER"
                          ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400"
                          : "bg-muted text-foreground"
                    : "text-muted-foreground hover:bg-muted"
                }`}
                onClick={() => setTypeFilter(tab.key)}
              >
                {tab.label}
                {!loading && (
                  <span className="ml-1.5 text-xs opacity-70">
                    {tab.key === "ALL"
                      ? logs.length
                      : logs.filter((l) => l.log_type === tab.key).length}
                  </span>
                )}
              </button>
            ))}
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {loading ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10" />
                    <TableHead>Tank Code</TableHead>
                    <TableHead>Log Type</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Created By</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <Skeleton className="h-4 w-4" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-16" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-5 w-20" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-20" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-28" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-32" />
                      </TableCell>
                      <TableCell className="text-right">
                        <Skeleton className="h-8 w-8 ml-auto" />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10" />
                    <TableHead>Tank Code</TableHead>
                    <TableHead>Log Type</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Created By</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedLogs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="py-16">
                        <div className="flex flex-col items-center gap-3 text-muted-foreground">
                          <Container className="h-10 w-10 stroke-1" />
                          <p className="font-medium">
                            {search.trim() ||
                            typeFilter !== "ALL" ||
                            dateRange !== "all"
                              ? "No logs match your filters"
                              : "No tank logs yet"}
                          </p>
                          <p className="text-sm">
                            {search.trim() ||
                            typeFilter !== "ALL" ||
                            dateRange !== "all"
                              ? "Try adjusting your search or filters."
                              : "Logs will appear here when tank operations are performed."}
                          </p>
                          {(search.trim() ||
                            typeFilter !== "ALL" ||
                            dateRange !== "all") && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setSearch("");
                                setTypeFilter("ALL");
                                setDateRange("all");
                              }}
                            >
                              Clear all filters
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedLogs.map((log) => {
                      const hasConsumptions =
                        log.log_type === "OUTWARD" &&
                        log.consumptions?.length > 0;
                      const isExpanded = expandedIds.has(log.id);
                      const rel = relativeTime(log.created_at);

                      return (
                        <>
                          <TableRow
                            key={log.id}
                            className={
                              isExpanded ? "border-b-0 bg-muted/30" : ""
                            }
                          >
                            {/* Expand toggle */}
                            <TableCell className="w-10">
                              {hasConsumptions ? (
                                <button
                                  type="button"
                                  className="p-0.5 rounded hover:bg-muted transition-colors"
                                  onClick={() => toggleExpand(log.id)}
                                >
                                  {isExpanded ? (
                                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                  ) : (
                                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                  )}
                                </button>
                              ) : null}
                            </TableCell>
                            <TableCell className="font-medium">
                              {log.log_type === "TRANSFER" &&
                              log.source_tank_code &&
                              log.destination_tank_code ? (
                                <div className="flex items-center gap-1.5 text-sm">
                                  <span className="font-semibold">{log.source_tank_code}</span>
                                  <span className="text-blue-500">→</span>
                                  <span className="font-semibold">{log.destination_tank_code}</span>
                                </div>
                              ) : (
                                log.tank_code
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className={`gap-1 ${logBadgeClass(log.log_type)}`}
                              >
                                {logIcon(log.log_type)}
                                {logLabel(log.log_type)}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1.5">
                                {logIcon(log.log_type)}
                                <span className="font-medium">
                                  {Number(log.quantity).toLocaleString(
                                    "en-IN"
                                  )}{" "}
                                  L
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div>
                                <p>{formatDate(log.created_at)}</p>
                                {rel && (
                                  <p className="text-xs text-muted-foreground">
                                    {rel}
                                  </p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>{log.created_by}</TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => setViewTarget(log)}
                                title="View details"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>

                          {/* Expanded consumptions row */}
                          {hasConsumptions && isExpanded && (
                            <TableRow
                              key={`${log.id}-expand`}
                              className="bg-muted/30"
                            >
                              <TableCell colSpan={7} className="p-0">
                                <div className="px-6 py-3 pl-12">
                                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                                    Consumptions (
                                    {log.consumptions.length})
                                  </p>
                                  <div className="rounded-md border bg-background">
                                    <Table>
                                      <TableHeader>
                                        <TableRow>
                                          <TableHead>Layer ID</TableHead>
                                          <TableHead>Vendor</TableHead>
                                          <TableHead>Qty Consumed</TableHead>
                                          <TableHead>Rate</TableHead>
                                          <TableHead>Total Value</TableHead>
                                        </TableRow>
                                      </TableHeader>
                                      <TableBody>
                                        {log.consumptions.map((c) => {
                                          const qty = Number(
                                            c.quantity_consumed
                                          );
                                          const rate = Number(c.rate);
                                          return (
                                            <TableRow key={c.id}>
                                              <TableCell>
                                                {c.layer_id}
                                              </TableCell>
                                              <TableCell>
                                                {c.vendor_name || "—"}
                                              </TableCell>
                                              <TableCell>
                                                {qty.toLocaleString(
                                                  "en-IN"
                                                )}{" "}
                                                L
                                              </TableCell>
                                              <TableCell>
                                                &#8377;{" "}
                                                {rate.toLocaleString(
                                                  "en-IN"
                                                )}
                                              </TableCell>
                                              <TableCell>
                                                &#8377;{" "}
                                                {(
                                                  qty * rate
                                                ).toLocaleString("en-IN")}
                                              </TableCell>
                                            </TableRow>
                                          );
                                        })}
                                      </TableBody>
                                    </Table>
                                  </div>
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination */}
          {!loading && (
            <Pagination
              page={page}
              totalPages={totalPages}
              totalItems={filteredLogs.length}
              perPage={perPage}
              onPageChange={setPage}
            />
          )}
        </CardContent>
      </Card>

      {/* View Dialog */}
      <Dialog open={!!viewTarget} onOpenChange={() => setViewTarget(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Container className="h-5 w-5" />
              Tank Log Details
            </DialogTitle>
            <DialogDescription>Log #{viewTarget?.id}</DialogDescription>
          </DialogHeader>

          {viewTarget && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {viewTarget.log_type === "TRANSFER" &&
                viewTarget.source_tank_code &&
                viewTarget.destination_tank_code ? (
                  <div className="col-span-2">
                    <p className="text-xs text-muted-foreground mb-1">Transfer Route</p>
                    <div className="flex items-center gap-2 rounded-md bg-blue-50 dark:bg-blue-900/20 px-3 py-2">
                      <span className="font-semibold">{viewTarget.source_tank_code}</span>
                      <span className="text-blue-500 font-bold">→</span>
                      <span className="font-semibold">{viewTarget.destination_tank_code}</span>
                    </div>
                  </div>
                ) : (
                  <div>
                    <p className="text-xs text-muted-foreground">Tank Code</p>
                    <p className="font-medium">{viewTarget.tank_code}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-muted-foreground">Log Type</p>
                  <Badge
                    variant="outline"
                    className={`gap-1 ${logBadgeClass(viewTarget.log_type)}`}
                  >
                    {logIcon(viewTarget.log_type)}
                    {logLabel(viewTarget.log_type)}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Quantity</p>
                  <p className="font-medium">
                    {Number(viewTarget.quantity).toLocaleString("en-IN")} L
                  </p>
                </div>
                {viewTarget.log_type === "INWARD" && (
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Tank Layer ID
                    </p>
                    <p className="font-medium">
                      {viewTarget.tank_layer_id ?? "—"}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-muted-foreground">Created At</p>
                  <p className="font-medium">
                    {formatDate(viewTarget.created_at)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Created By</p>
                  <p className="font-medium">{viewTarget.created_by}</p>
                </div>
                {viewTarget.remarks && (
                  <div className="col-span-2">
                    <p className="text-xs text-muted-foreground">Remarks</p>
                    <p className="font-medium">{viewTarget.remarks}</p>
                  </div>
                )}
              </div>

              <Separator />

              {/* Consumptions (only for OUTWARD) */}
              {viewTarget.log_type === "OUTWARD" && (
                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                    Consumptions ({viewTarget.consumptions.length})
                  </h3>
                  {viewTarget.consumptions.length === 0 ? (
                    <p className="text-muted-foreground text-center py-4">
                      No consumptions
                    </p>
                  ) : (
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Layer ID</TableHead>
                            <TableHead>Vendor</TableHead>
                            <TableHead>Qty Consumed</TableHead>
                            <TableHead>Rate</TableHead>
                            <TableHead>Total Value</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {viewTarget.consumptions.map((c) => {
                            const qty = Number(c.quantity_consumed);
                            const rate = Number(c.rate);
                            return (
                              <TableRow key={c.id}>
                                <TableCell>{c.layer_id}</TableCell>
                                <TableCell>
                                  {c.vendor_name || "—"}
                                </TableCell>
                                <TableCell>
                                  {qty.toLocaleString("en-IN")} L
                                </TableCell>
                                <TableCell>
                                  &#8377; {rate.toLocaleString("en-IN")}
                                </TableCell>
                                <TableCell>
                                  &#8377;{" "}
                                  {(qty * rate).toLocaleString("en-IN")}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setViewTarget(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
