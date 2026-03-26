import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Calendar,
  FileText,
  RefreshCw,
  Search,
} from "lucide-react";

import { getSyncLogs, type SyncLog } from "@/api/sapSync";
import { fmtDateTime } from "@/lib/formatters";
import { getErrorMessage } from "@/lib/errors";
import { Pagination } from "@/components/Pagination";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/* ── Constants ─────────────────────────────────────────────── */

const SYNC_TYPE_LABELS: Record<string, string> = {
  PRT: "Party",
  ITM: "Item",
};

const STATUS_LABELS: Record<string, string> = {
  FLD: "Failed",
  SUC: "Success",
  RUN: "Running",
};

const STATUS_VARIANT: Record<
  string,
  "destructive" | "default" | "secondary" | "outline"
> = {
  FLD: "destructive",
  SUC: "default",
  RUN: "secondary",
};

const ROW_TINT: Record<string, string> = {
  FLD: "bg-red-50/50 dark:bg-red-900/10",
  SUC: "bg-green-50/30 dark:bg-green-900/5",
  RUN: "",
};

/* ── Types ─────────────────────────────────────────────────── */

type SortKey =
  | "sync_type"
  | "status"
  | "triggered_by"
  | "started_at"
  | "completed_at"
  | "records_procesed"
  | "records_created"
  | "records_updated";
type SortDir = "asc" | "desc";
type DateRange = "all" | "today" | "7d" | "30d" | "custom";

/* ── Helpers ───────────────────────────────────────────────── */

function startOfDay(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return fmtDateTime(iso);
}

/* ── Component ─────────────────────────────────────────────── */

export default function SyncLogsPage() {
  const [logs, setLogs] = useState<SyncLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [selectedError, setSelectedError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [dateRange, setDateRange] = useState<DateRange>("all");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  // Sort
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  // Pagination
  const [page, setPage] = useState(1);
  const perPage = 20;

  /* ── Fetch ───────────────────────────────────────────────── */

  const fetchLogs = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError("");
    try {
      const data = await getSyncLogs();
      setLogs(
        (data ?? []).sort(
          (a, b) =>
            new Date(b.started_at).getTime() -
            new Date(a.started_at).getTime()
        )
      );
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load sync logs"));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Reset page on filter change
  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, typeFilter, dateRange, customFrom, customTo]);

  /* ── Unique filter options ───────────────────────────────── */

  const uniqueTypes = useMemo(
    () => [...new Set(logs.map((l) => l.sync_type).filter(Boolean))].sort(),
    [logs]
  );

  const uniqueStatuses = useMemo(
    () => [...new Set(logs.map((l) => l.status).filter(Boolean))].sort(),
    [logs]
  );

  /* ── Filtered & sorted ───────────────────────────────────── */

  const filteredLogs = useMemo(() => {
    const now = new Date();
    let result = [...logs];

    // Status filter
    if (statusFilter !== "ALL")
      result = result.filter((l) => l.status === statusFilter);

    // Type filter
    if (typeFilter !== "ALL")
      result = result.filter((l) => l.sync_type === typeFilter);

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (l) =>
          (SYNC_TYPE_LABELS[l.sync_type] ?? l.sync_type)
            .toLowerCase()
            .includes(q) ||
          (STATUS_LABELS[l.status] ?? l.status).toLowerCase().includes(q) ||
          l.triggered_by?.toLowerCase().includes(q) ||
          l.error_message?.toLowerCase().includes(q)
      );
    }

    // Date range
    result = result.filter((l) => {
      const logDate = new Date(l.started_at);
      if (dateRange === "today") {
        return logDate >= startOfDay(now);
      } else if (dateRange === "7d") {
        const d = new Date(now);
        d.setDate(d.getDate() - 7);
        return logDate >= startOfDay(d);
      } else if (dateRange === "30d") {
        const d = new Date(now);
        d.setDate(d.getDate() - 30);
        return logDate >= startOfDay(d);
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

    // Sort
    if (sortKey) {
      result.sort((a, b) => {
        let cmp = 0;
        const numericKeys = [
          "records_procesed",
          "records_created",
          "records_updated",
        ];
        if (numericKeys.includes(sortKey)) {
          cmp =
            (Number(a[sortKey as keyof SyncLog]) || 0) -
            (Number(b[sortKey as keyof SyncLog]) || 0);
        } else if (sortKey === "started_at" || sortKey === "completed_at") {
          const aTime = a[sortKey]
            ? new Date(a[sortKey] as string).getTime()
            : 0;
          const bTime = b[sortKey]
            ? new Date(b[sortKey] as string).getTime()
            : 0;
          cmp = aTime - bTime;
        } else {
          cmp = String(a[sortKey as keyof SyncLog] ?? "").localeCompare(
            String(b[sortKey as keyof SyncLog] ?? "")
          );
        }
        return sortDir === "asc" ? cmp : -cmp;
      });
    }

    return result;
  }, [
    logs,
    search,
    statusFilter,
    typeFilter,
    dateRange,
    customFrom,
    customTo,
    sortKey,
    sortDir,
  ]);

  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / perPage));
  const paginatedLogs = filteredLogs.slice(
    (page - 1) * perPage,
    page * perPage
  );

  const hasFilters =
    search.trim() !== "" ||
    statusFilter !== "ALL" ||
    typeFilter !== "ALL" ||
    dateRange !== "all";

  /* ── Sort handler ────────────────────────────────────────── */

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  function SortIcon({ column }: { column: SortKey }) {
    if (sortKey !== column)
      return (
        <ArrowUpDown className="h-3 w-3 text-muted-foreground/50 ml-1 inline" />
      );
    return sortDir === "asc" ? (
      <ArrowUp className="h-3 w-3 ml-1 inline" />
    ) : (
      <ArrowDown className="h-3 w-3 ml-1 inline" />
    );
  }

  function clearFilters() {
    setSearch("");
    setStatusFilter("ALL");
    setTypeFilter("ALL");
    setDateRange("all");
    setCustomFrom("");
    setCustomTo("");
  }

  return (
    <div className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6 animate-page">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Sync Logs</h1>
          <p className="text-sm text-muted-foreground">
            View sync operation history
          </p>
        </div>
        <Button
          variant="outline"
          size="icon"
          className="h-9 w-9"
          onClick={() => fetchLogs(true)}
          disabled={refreshing}
          title="Refresh"
        >
          <RefreshCw
            className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
          />
        </Button>
      </div>

      {/* Error */}
      {error && <p className="text-sm text-destructive">{error}</p>}

      {/* Table Card */}
      <Card className="card-hover shimmer-hover">
        <CardHeader>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <CardTitle>Sync History</CardTitle>
              <CardDescription>
                {filteredLogs.length}
                {hasFilters ? ` of ${logs.length}` : ""} sync operation
                {filteredLogs.length !== 1 ? "s" : ""} recorded
              </CardDescription>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 h-9 w-44 sm:w-48"
                />
              </div>

              {/* Status filter */}
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-9 w-36">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Statuses</SelectItem>
                  {uniqueStatuses.map((s) => (
                    <SelectItem key={s} value={s}>
                      {STATUS_LABELS[s] ?? s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Type filter */}
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="h-9 w-36">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Types</SelectItem>
                  {uniqueTypes.map((t) => (
                    <SelectItem key={t} value={t}>
                      {SYNC_TYPE_LABELS[t] ?? t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Date range */}
              <Select
                value={dateRange}
                onValueChange={(v) => setDateRange(v as DateRange)}
              >
                <SelectTrigger className="h-9 w-36">
                  <Calendar className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="7d">Last 7 Days</SelectItem>
                  <SelectItem value="30d">Last 30 Days</SelectItem>
                  <SelectItem value="custom">Custom Range</SelectItem>
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
              <span className="text-muted-foreground text-sm">to</span>
              <Input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="h-9 w-40"
              />
            </div>
          )}

          {hasFilters && (
            <div className="mt-2">
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground"
                onClick={clearFilters}
              >
                Clear all filters
              </Button>
            </div>
          )}
        </CardHeader>

        <CardContent className="space-y-4">
          {loading ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Sync Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Triggered By</TableHead>
                    <TableHead>Started At</TableHead>
                    <TableHead>Completed At</TableHead>
                    <TableHead className="text-right">Processed</TableHead>
                    <TableHead className="text-right">Created</TableHead>
                    <TableHead className="text-right">Updated</TableHead>
                    <TableHead>Error</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-6" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-14" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                      <TableCell className="text-right"><Skeleton className="h-4 w-8 ml-auto" /></TableCell>
                      <TableCell className="text-right"><Skeleton className="h-4 w-8 ml-auto" /></TableCell>
                      <TableCell className="text-right"><Skeleton className="h-4 w-8 ml-auto" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
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
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>
                      <button type="button" className="flex items-center cursor-pointer hover:text-foreground transition-colors" onClick={() => handleSort("sync_type")}>
                        Sync Type<SortIcon column="sync_type" />
                      </button>
                    </TableHead>
                    <TableHead>
                      <button type="button" className="flex items-center cursor-pointer hover:text-foreground transition-colors" onClick={() => handleSort("status")}>
                        Status<SortIcon column="status" />
                      </button>
                    </TableHead>
                    <TableHead>
                      <button type="button" className="flex items-center cursor-pointer hover:text-foreground transition-colors" onClick={() => handleSort("triggered_by")}>
                        Triggered By<SortIcon column="triggered_by" />
                      </button>
                    </TableHead>
                    <TableHead>
                      <button type="button" className="flex items-center cursor-pointer hover:text-foreground transition-colors" onClick={() => handleSort("started_at")}>
                        Started At<SortIcon column="started_at" />
                      </button>
                    </TableHead>
                    <TableHead>
                      <button type="button" className="flex items-center cursor-pointer hover:text-foreground transition-colors" onClick={() => handleSort("completed_at")}>
                        Completed At<SortIcon column="completed_at" />
                      </button>
                    </TableHead>
                    <TableHead className="text-right">
                      <button type="button" className="flex items-center cursor-pointer hover:text-foreground transition-colors ml-auto" onClick={() => handleSort("records_procesed")}>
                        Processed<SortIcon column="records_procesed" />
                      </button>
                    </TableHead>
                    <TableHead className="text-right">
                      <button type="button" className="flex items-center cursor-pointer hover:text-foreground transition-colors ml-auto" onClick={() => handleSort("records_created")}>
                        Created<SortIcon column="records_created" />
                      </button>
                    </TableHead>
                    <TableHead className="text-right">
                      <button type="button" className="flex items-center cursor-pointer hover:text-foreground transition-colors ml-auto" onClick={() => handleSort("records_updated")}>
                        Updated<SortIcon column="records_updated" />
                      </button>
                    </TableHead>
                    <TableHead>Error</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedLogs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="py-16">
                        <div className="flex flex-col items-center gap-3 text-muted-foreground">
                          <FileText className="h-10 w-10 stroke-1" />
                          <p className="font-medium">
                            {hasFilters
                              ? "No logs match your filters"
                              : "No sync logs found"}
                          </p>
                          <p className="text-sm">
                            {hasFilters
                              ? "Try adjusting your search or filters."
                              : "Sync operations will appear here once triggered."}
                          </p>
                          {hasFilters && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={clearFilters}
                            >
                              Clear filters
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedLogs.map((log, i) => (
                      <TableRow
                        key={log.id}
                        className={ROW_TINT[log.status] ?? ""}
                      >
                        <TableCell className="font-medium">
                          {(page - 1) * perPage + i + 1}
                        </TableCell>
                        <TableCell>
                          {SYNC_TYPE_LABELS[log.sync_type] ?? log.sync_type}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={STATUS_VARIANT[log.status] ?? "outline"}
                          >
                            {STATUS_LABELS[log.status] ?? log.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {log.triggered_by?.split("@")[0] || "—"}
                        </TableCell>
                        <TableCell
                          title={
                            log.started_at ? fmtDateTime(log.started_at) : ""
                          }
                          className="cursor-default"
                        >
                          <span className="text-muted-foreground">
                            {log.started_at ? relativeTime(log.started_at) : "—"}
                          </span>
                        </TableCell>
                        <TableCell
                          title={
                            log.completed_at
                              ? fmtDateTime(log.completed_at)
                              : ""
                          }
                          className="cursor-default"
                        >
                          <span className="text-muted-foreground">
                            {log.completed_at
                              ? relativeTime(log.completed_at)
                              : "—"}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          {log.records_procesed}
                        </TableCell>
                        <TableCell className="text-right">
                          {log.records_created}
                        </TableCell>
                        <TableCell className="text-right">
                          {log.records_updated}
                        </TableCell>
                        <TableCell className="max-w-xs text-xs text-muted-foreground">
                          {log.error_message ? (
                            <button
                              className="truncate block max-w-xs text-left hover:text-foreground transition-colors cursor-pointer"
                              onClick={() =>
                                setSelectedError(log.error_message)
                              }
                            >
                              {log.error_message}
                            </button>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                      </TableRow>
                    ))
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

      {/* Error Detail Dialog */}
      <Dialog
        open={!!selectedError}
        onOpenChange={() => setSelectedError(null)}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Error Details</DialogTitle>
            <DialogDescription>
              Full error message from the sync operation.
            </DialogDescription>
          </DialogHeader>
          <pre className="whitespace-pre-wrap break-words text-sm bg-muted p-4 rounded-md max-h-80 overflow-y-auto">
            {selectedError}
          </pre>
        </DialogContent>
      </Dialog>
    </div>
  );
}
