import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowDownToLine,
  ArrowRightLeft,
  ArrowUpFromLine,
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
  const [dateRange, setDateRange] = useState<DateRange>("all");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  // View dialog
  const [viewTarget, setViewTarget] = useState<TankLog | null>(null);

  // Pagination
  const [page, setPage] = useState(1);
  const perPage = 20;

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getTankLogs();
      setLogs(
        data.sort(
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
  }, [search, dateRange, customFrom, customTo]);

  /* ── filtering ──────────────────────────────────── */

  const filteredLogs = useMemo(() => {
    const now = new Date();
    return logs.filter((log) => {
      // Search
      if (search.trim()) {
        const q = search.toLowerCase();
        if (
          !(log.vehicle_number?.toLowerCase().includes(q)) &&
          !(log.party?.toLowerCase().includes(q)) &&
          !log.created_by.toLowerCase().includes(q)
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
  }, [logs, search, dateRange, customFrom, customTo]);

  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / perPage));
  const paginatedLogs = filteredLogs.slice(
    (page - 1) * perPage,
    page * perPage
  );

  /* ── excel export ───────────────────────────────── */

  function handleExport() {
    if (filteredLogs.length === 0) {
      toast.error("No logs to export.");
      return;
    }

    const rows = filteredLogs.map((log) => ({
      "Vehicle Number": log.vehicle_number || "—",
      "Party": log.party || "—",
      "Log Type": log.log_type,
      "Rate (₹)": log.rate ? Number(log.rate) : "",
      "Value (₹)": log.rate ? Number(log.rate) * Number(log.quantity) : "",
      "Quantity (L)": Number(log.quantity),
      "Created At": formatDate(log.created_at),
      "Created By": log.created_by,
      "Stock Status ID": log.stock_status ?? "",
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

        </CardHeader>

        <CardContent className="space-y-4">
          {loading ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vehicle Number</TableHead>
                    <TableHead>Party</TableHead>
                    <TableHead>Log Type</TableHead>
                    <TableHead>Rate (&#8377;)</TableHead>
                    <TableHead>Value (&#8377;)</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Created By</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 9 }).map((_, j) => (
                        <TableCell key={j}>
                          <Skeleton className="h-4 w-16" />
                        </TableCell>
                      ))}
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
                    <TableHead>Vehicle Number</TableHead>
                    <TableHead>Party</TableHead>
                    <TableHead>Log Type</TableHead>
                    <TableHead>Rate (&#8377;)</TableHead>
                    <TableHead>Value (&#8377;)</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Created By</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedLogs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="py-16">
                        <div className="flex flex-col items-center gap-3 text-muted-foreground">
                          <Container className="h-10 w-10 stroke-1" />
                          <p className="font-medium">
                            {search.trim() ||
                            dateRange !== "all"
                              ? "No logs match your filters"
                              : "No tank logs yet"}
                          </p>
                          <p className="text-sm">
                            {search.trim() ||
                            dateRange !== "all"
                              ? "Try adjusting your search or filters."
                              : "Logs will appear here when tank operations are performed."}
                          </p>
                          {(search.trim() ||
                            dateRange !== "all") && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setSearch("");
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
                      const rel = relativeTime(log.created_at);
                      const rate = Number(log.rate ?? 0);
                      const qty = Number(log.quantity);
                      const value = rate * qty;

                      return (
                        <TableRow key={log.id}>
                          <TableCell className="font-medium">
                            {log.vehicle_number || "—"}
                          </TableCell>
                          <TableCell>
                            {log.party || "—"}
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
                          <TableCell className="tabular-nums">
                            {log.rate != null ? `₹ ${rate.toLocaleString("en-IN")}` : "—"}
                          </TableCell>
                          <TableCell className="tabular-nums font-medium">
                            {log.rate != null ? `₹ ${value.toLocaleString("en-IN")}` : "—"}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5">
                              {logIcon(log.log_type)}
                              <span className="font-medium">
                                {qty.toLocaleString("en-IN")} L
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

          {viewTarget && (() => {
            const rate = Number(viewTarget.rate ?? 0);
            const qty = Number(viewTarget.quantity);
            const value = rate * qty;

            return (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Vehicle Number</p>
                    <p className="font-medium">{viewTarget.vehicle_number || "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Party</p>
                    <p className="font-medium">{viewTarget.party || "—"}</p>
                  </div>
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
                    <p className="text-xs text-muted-foreground">Rate</p>
                    <p className="font-medium">
                      {viewTarget.rate != null ? `₹ ${rate.toLocaleString("en-IN")}` : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Value</p>
                    <p className="font-medium">
                      {viewTarget.rate != null ? `₹ ${value.toLocaleString("en-IN")}` : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Quantity</p>
                    <p className="font-medium">
                      {qty.toLocaleString("en-IN")} L
                    </p>
                  </div>

                  <Separator className="col-span-2" />

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
                  {viewTarget.stock_status != null && (
                    <div>
                      <p className="text-xs text-muted-foreground">Stock Status ID</p>
                      <p className="font-medium">{viewTarget.stock_status}</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

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
