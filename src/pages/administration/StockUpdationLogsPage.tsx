import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  ArrowDownUp,
  Calendar,
  ChevronDown,
  ChevronRight,
  Download,
  History,
  RefreshCw,
  Search,
  User,
} from "lucide-react";
import * as XLSX from "xlsx";

import { getStockLogs, type StockLog } from "@/api/stockStatus";
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

/* ── Types ─────────────────────────────────────────────────── */

interface GroupedLog {
  key: string;
  stock_id: number;
  updated_by: string;
  updated_at: string;
  changes: { field_name: string; old_value: string; new_value: string }[];
}

/* ── Helpers ───────────────────────────────────────────────── */

function groupLogs(logs: StockLog[]): GroupedLog[] {
  const sorted = [...logs].sort(
    (a, b) =>
      new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  );

  const groups: GroupedLog[] = [];

  for (const log of sorted) {
    const ts = new Date(log.updated_at).getTime();
    const existing = groups.find(
      (g) =>
        g.stock_id === log.stock_id &&
        g.updated_by === log.updated_by &&
        Math.abs(new Date(g.updated_at).getTime() - ts) < 2000
    );

    if (existing) {
      existing.changes.push({
        field_name: log.field_name,
        old_value: log.old_value,
        new_value: log.new_value,
      });
    } else {
      groups.push({
        key: `${log.stock_id}-${log.updated_at}`,
        stock_id: log.stock_id,
        updated_by: log.updated_by,
        updated_at: log.updated_at,
        changes: [
          {
            field_name: log.field_name,
            old_value: log.old_value,
            new_value: log.new_value,
          },
        ],
      });
    }
  }

  return groups;
}

function formatFieldName(name: string): string {
  return name
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatValue(field: string, value: string): string {
  if (field === "status") return value.replace(/_/g, " ");
  return value;
}

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

type DateRange = "all" | "today" | "7d" | "30d" | "custom";

export default function StockUpdationLogsPage() {
  const [logs, setLogs] = useState<StockLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [search, setSearch] = useState("");
  const [userFilter, setUserFilter] = useState("ALL");
  const [dateRange, setDateRange] = useState<DateRange>("all");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  // Expandable rows
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());

  // Pagination
  const [page, setPage] = useState(1);
  const perPage = 20;

  const fetchLogs = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError("");
    try {
      const data = await getStockLogs();
      setLogs(data);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load stock updation logs"));
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
  }, [search, userFilter, dateRange, customFrom, customTo]);

  /* ── Grouped & filtered data ─────────────────────────────── */

  const grouped = useMemo(() => groupLogs(logs), [logs]);

  // Unique users for filter dropdown
  const uniqueUsers = useMemo(() => {
    const users = new Set(grouped.map((g) => g.updated_by));
    return Array.from(users).sort();
  }, [grouped]);

  const filteredGroups = useMemo(() => {
    const now = new Date();
    return grouped.filter((group) => {
      // User filter
      if (userFilter !== "ALL" && group.updated_by !== userFilter) return false;

      // Search
      if (search.trim()) {
        const q = search.toLowerCase();
        if (
          !String(group.stock_id).includes(q) &&
          !group.updated_by.toLowerCase().includes(q) &&
          !group.changes.some(
            (c) =>
              c.field_name.toLowerCase().includes(q) ||
              c.old_value.toLowerCase().includes(q) ||
              c.new_value.toLowerCase().includes(q)
          )
        )
          return false;
      }

      // Date range
      const logDate = new Date(group.updated_at);
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
  }, [grouped, search, userFilter, dateRange, customFrom, customTo]);

  const totalPages = Math.max(1, Math.ceil(filteredGroups.length / perPage));
  const paginatedGroups = filteredGroups.slice(
    (page - 1) * perPage,
    page * perPage
  );

  /* ── Summary stats ───────────────────────────────────────── */

  const stats = useMemo(() => {
    const uniqueStocks = new Set(filteredGroups.map((g) => g.stock_id)).size;
    const uniqueUsersCount = new Set(filteredGroups.map((g) => g.updated_by))
      .size;
    const totalChanges = filteredGroups.reduce(
      (sum, g) => sum + g.changes.length,
      0
    );

    // Most active user
    const userCounts: Record<string, number> = {};
    for (const g of filteredGroups) {
      userCounts[g.updated_by] = (userCounts[g.updated_by] || 0) + 1;
    }
    const topUser = Object.entries(userCounts).sort(
      (a, b) => b[1] - a[1]
    )[0];

    return {
      totalUpdates: filteredGroups.length,
      uniqueStocks,
      uniqueUsers: uniqueUsersCount,
      totalChanges,
      topUser: topUser ? topUser[0] : "—",
      topUserCount: topUser ? topUser[1] : 0,
    };
  }, [filteredGroups]);

  /* ── Row expand toggle ───────────────────────────────────── */

  function toggleExpand(key: string) {
    setExpandedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  /* ── Excel export ────────────────────────────────────────── */

  function handleExport() {
    const rows = filteredGroups.flatMap((group) =>
      group.changes.map((change) => ({
        "Stock ID": group.stock_id,
        "Updated By": group.updated_by,
        "Updated At": fmtDateTime(group.updated_at),
        Field: formatFieldName(change.field_name),
        "Old Value": change.old_value,
        "New Value": change.new_value,
      }))
    );
    if (rows.length === 0) {
      toast.error("No data to export.");
      return;
    }
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Stock Updation Logs");
    XLSX.writeFile(
      wb,
      `Stock_Updation_Logs_${new Date().toISOString().slice(0, 10)}.xlsx`
    );
    toast.success("Exported to Excel");
  }

  /* ── Filters active? ─────────────────────────────────────── */

  const hasFilters =
    search.trim() !== "" || userFilter !== "ALL" || dateRange !== "all";

  function clearFilters() {
    setSearch("");
    setUserFilter("ALL");
    setDateRange("all");
    setCustomFrom("");
    setCustomTo("");
  }

  return (
    <div className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6 animate-page">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">
            Stock Updation Logs
          </h1>
          <p className="text-sm text-muted-foreground">
            View history of stock record changes
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={handleExport}
            disabled={filteredGroups.length === 0}
          >
            <Download className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Export</span>
          </Button>
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
      </div>

      {/* Error */}
      {error && <p className="text-sm text-destructive">{error}</p>}

      {/* Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-orange-50 dark:bg-orange-900/50 p-2 shrink-0">
                <History className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Updates</p>
                {loading ? (
                  <Skeleton className="h-7 w-16 mt-1" />
                ) : (
                  <p className="text-lg font-bold">{stats.totalUpdates}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-blue-50 dark:bg-blue-900/50 p-2 shrink-0">
                <ArrowDownUp className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Fields Changed</p>
                {loading ? (
                  <Skeleton className="h-7 w-16 mt-1" />
                ) : (
                  <p className="text-lg font-bold">{stats.totalChanges}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-green-50 dark:bg-green-900/50 p-2 shrink-0">
                <Search className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">
                  Stocks Modified
                </p>
                {loading ? (
                  <Skeleton className="h-7 w-16 mt-1" />
                ) : (
                  <p className="text-lg font-bold">{stats.uniqueStocks}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-purple-50 dark:bg-purple-900/50 p-2 shrink-0">
                <User className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Most Active</p>
                {loading ? (
                  <Skeleton className="h-7 w-16 mt-1" />
                ) : (
                  <p className="text-lg font-bold truncate max-w-[120px]" title={stats.topUser}>
                    {stats.topUser.split("@")[0]}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table Card */}
      <Card className="card-hover shimmer-hover">
        <CardHeader>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <CardTitle>Change History</CardTitle>
              <CardDescription>
                {filteredGroups.length}
                {hasFilters ? ` of ${grouped.length}` : ""} update
                {filteredGroups.length !== 1 ? "s" : ""} recorded
                {hasFilters ? " matching filters" : ""}
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
                  className="pl-8 h-9 w-44 sm:w-52"
                />
              </div>

              {/* User filter */}
              <Select value={userFilter} onValueChange={setUserFilter}>
                <SelectTrigger className="h-9 w-40">
                  <User className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                  <SelectValue placeholder="All Users" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Users</SelectItem>
                  {uniqueUsers.map((user) => (
                    <SelectItem key={user} value={user}>
                      {user.split("@")[0]}
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

          {/* Active filters indicator */}
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
                    <TableHead className="w-10" />
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Stock ID</TableHead>
                    <TableHead>Updated By</TableHead>
                    <TableHead>Updated At</TableHead>
                    <TableHead>Changes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <Skeleton className="h-4 w-4" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-6" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-5 w-12" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-32" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-28" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-48" />
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
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Stock ID</TableHead>
                    <TableHead>Updated By</TableHead>
                    <TableHead>Updated At</TableHead>
                    <TableHead>Changes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedGroups.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-16">
                        <div className="flex flex-col items-center gap-2 text-muted-foreground">
                          <History className="h-10 w-10 stroke-1" />
                          <p className="font-medium">
                            {hasFilters
                              ? "No logs match your filters"
                              : "No stock updation logs found"}
                          </p>
                          <p className="text-sm">
                            {hasFilters
                              ? "Try adjusting your search or filters."
                              : "Changes to stock records will appear here."}
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
                    paginatedGroups.map((group, i) => {
                      const isExpanded = expandedKeys.has(group.key);
                      const hasMultiple = group.changes.length > 1;
                      const visibleChanges = isExpanded
                        ? group.changes
                        : group.changes.slice(0, 1);

                      return (
                        <TableRow key={group.key}>
                          {/* Expand toggle */}
                          <TableCell className="pr-0">
                            {hasMultiple ? (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => toggleExpand(group.key)}
                              >
                                {isExpanded ? (
                                  <ChevronDown className="h-4 w-4" />
                                ) : (
                                  <ChevronRight className="h-4 w-4" />
                                )}
                              </Button>
                            ) : null}
                          </TableCell>

                          <TableCell className="font-medium">
                            {(page - 1) * perPage + i + 1}
                          </TableCell>

                          <TableCell>
                            <Badge variant="outline" className="font-mono">
                              {group.stock_id}
                            </Badge>
                          </TableCell>

                          <TableCell>{group.updated_by.split("@")[0]}</TableCell>

                          <TableCell
                            title={fmtDateTime(group.updated_at)}
                            className="cursor-default"
                          >
                            <span className="text-muted-foreground">
                              {relativeTime(group.updated_at)}
                            </span>
                          </TableCell>

                          <TableCell>
                            <div className="flex flex-col gap-1.5">
                              {visibleChanges.map((change, j) => (
                                <div
                                  key={j}
                                  className="flex items-center gap-2 text-sm flex-wrap"
                                >
                                  <Badge
                                    variant="secondary"
                                    className="text-xs font-normal shrink-0"
                                  >
                                    {formatFieldName(change.field_name)}
                                  </Badge>
                                  <span className="text-red-500/80 line-through">
                                    {formatValue(
                                      change.field_name,
                                      change.old_value
                                    ) || "—"}
                                  </span>
                                  <span className="text-muted-foreground">
                                    &rarr;
                                  </span>
                                  <span className="text-green-600 dark:text-green-400 font-medium">
                                    {formatValue(
                                      change.field_name,
                                      change.new_value
                                    ) || "—"}
                                  </span>
                                </div>
                              ))}
                              {!isExpanded && hasMultiple && (
                                <button
                                  type="button"
                                  className="text-xs text-muted-foreground hover:text-foreground transition-colors text-left cursor-pointer"
                                  onClick={() => toggleExpand(group.key)}
                                >
                                  +{group.changes.length - 1} more change
                                  {group.changes.length - 1 > 1 ? "s" : ""}
                                </button>
                              )}
                            </div>
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
              totalItems={filteredGroups.length}
              perPage={perPage}
              onPageChange={setPage}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
