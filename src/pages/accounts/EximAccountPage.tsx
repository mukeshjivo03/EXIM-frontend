import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Crown,
  Download,
  PackageOpen,
  RefreshCw,
  Scale,
  Search,
  TrendingDown,
  TrendingUp,
  Users,
} from "lucide-react";

import { syncBalanceSheet, type BalanceEntry } from "@/api/sapSync";
import { fmtDecimal, fmtDate } from "@/lib/formatters";
import { getErrorMessage } from "@/lib/errors";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  TableFooter,
} from "@/components/ui/table";

/* ── Types ─────────────────────────────────────────────────── */

type BalanceType = "ALL" | "DR" | "CR";
type SortKey =
  | "CardCode"
  | "CardName"
  | "Balance"
  | "LastDate"
  | "LastAmount";
type SortDir = "asc" | "desc";

/* ── Module-level cache ────────────────────────────────────── */

let cachedEntries: BalanceEntry[] = [];
let hasSynced = false;
let lastSyncTime: Date | null = null;

/* ── Component ─────────────────────────────────────────────── */

export default function EximAccountPage() {
  const [entries, setEntries] = useState<BalanceEntry[]>(cachedEntries);
  const [synced, setSynced] = useState(hasSynced);
  const [syncing, setSyncing] = useState(false);
  const [syncedAt, setSyncedAt] = useState<Date | null>(lastSyncTime);

  // Filters
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<BalanceType>("ALL");

  // Sort
  const [sortKey, setSortKey] = useState<SortKey>("Balance");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  useEffect(() => { if (!hasSynced) handleSync(); }, []);

  /* ── Sync ────────────────────────────────────────────────── */

  async function handleSync() {
    setSyncing(true);
    try {
      const data = await syncBalanceSheet();
      const sorted = [...data].sort((a, b) => a.Balance - b.Balance);
      cachedEntries = sorted;
      hasSynced = true;
      const now = new Date();
      lastSyncTime = now;
      setEntries(sorted);
      setSynced(true);
      setSyncedAt(now);
      toast.success(`Loaded ${sorted.length} outstanding entries`);
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to fetch balance sheet"));
    } finally {
      setSyncing(false);
    }
  }

  /* ── CSV Export ──────────────────────────────────────────── */

  function exportCSV() {
    const rows = filteredEntries.map((e, i) => [
      i + 1,
      e.CardCode,
      `"${e.CardName.replace(/"/g, '""')}"`,
      e.Balance,
      e["Last Transaction Date"]
        ? fmtDate(e["Last Transaction Date"])
        : "",
      e["Last Transanction Amount"],
    ]);
    const header = [
      "S.No",
      "Card Code",
      "Card Name",
      "Balance (₹)",
      "Last Trans. Date",
      "Last Trans. Amt (₹)",
    ];
    const csv = [header.join(","), ...rows.map((r) => r.join(","))].join(
      "\n"
    );
    const blob = new Blob(["\uFEFF" + csv], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "dr_cr_outstanding.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  /* ── Filtering ───────────────────────────────────────────── */

  const filteredEntries = useMemo(() => {
    let result = [...entries];

    // Type filter
    if (typeFilter === "DR") result = result.filter((e) => e.Balance > 0);
    else if (typeFilter === "CR") result = result.filter((e) => e.Balance < 0);

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (e) =>
          e.CardCode.toLowerCase().includes(q) ||
          e.CardName.toLowerCase().includes(q) ||
          String(e.Balance).includes(q)
      );
    }

    // Sort
    result.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "CardCode":
          cmp = a.CardCode.localeCompare(b.CardCode);
          break;
        case "CardName":
          cmp = a.CardName.localeCompare(b.CardName);
          break;
        case "Balance":
          cmp = a.Balance - b.Balance;
          break;
        case "LastDate": {
          const da = a["Last Transaction Date"]
            ? new Date(a["Last Transaction Date"]).getTime()
            : 0;
          const db = b["Last Transaction Date"]
            ? new Date(b["Last Transaction Date"]).getTime()
            : 0;
          cmp = da - db;
          break;
        }
        case "LastAmount":
          cmp =
            a["Last Transanction Amount"] - b["Last Transanction Amount"];
          break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });

    return result;
  }, [entries, search, typeFilter, sortKey, sortDir]);

  /* ── Summary stats ───────────────────────────────────────── */

  const totalReceivable = entries
    .filter((e) => e.Balance > 0)
    .reduce((s, e) => s + e.Balance, 0);
  const totalPayable = entries
    .filter((e) => e.Balance < 0)
    .reduce((s, e) => s + e.Balance, 0);
  const netBalance = entries.reduce((s, e) => s + e.Balance, 0);

  // Filtered totals for footer
  const filteredReceivable = filteredEntries
    .filter((e) => e.Balance > 0)
    .reduce((s, e) => s + e.Balance, 0);
  const filteredPayable = filteredEntries
    .filter((e) => e.Balance < 0)
    .reduce((s, e) => s + e.Balance, 0);
  const filteredNet = filteredEntries.reduce((s, e) => s + e.Balance, 0);

  /* ── Top 5 debtors/creditors ─────────────────────────────── */

  const top5Ids = useMemo(() => {
    const sorted = [...entries].sort(
      (a, b) => Math.abs(b.Balance) - Math.abs(a.Balance)
    );
    return new Set(sorted.slice(0, 5).map((e) => e.CardCode));
  }, [entries]);

  /* ── Max absolute balance (for bar width) ────────────────── */

  const maxAbsBalance = useMemo(() => {
    if (entries.length === 0) return 1;
    return Math.max(...entries.map((e) => Math.abs(e.Balance)), 1);
  }, [entries]);

  /* ── Sort handler ────────────────────────────────────────── */

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "Balance" ? "asc" : "asc");
    }
  }

  function SortIcon({ column }: { column: SortKey }) {
    if (sortKey !== column)
      return <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground/50" />;
    return sortDir === "asc" ? (
      <ArrowUp className="h-3.5 w-3.5" />
    ) : (
      <ArrowDown className="h-3.5 w-3.5" />
    );
  }

  /* ── Filters active ──────────────────────────────────────── */

  const hasFilters = search.trim() !== "" || typeFilter !== "ALL";

  function clearFilters() {
    setSearch("");
    setTypeFilter("ALL");
  }

  return (
    <div className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6 animate-page">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">
            Dr/Cr Outstanding
          </h1>
          <p className="text-sm text-muted-foreground">
            Dr/Cr outstanding balances from SAP
            {syncedAt && (
              <span className="text-muted-foreground/60">
                {" "}
                &middot; Last synced{" "}
                {syncedAt.toLocaleTimeString("en-IN", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            className="btn-press"
            onClick={handleSync}
            disabled={syncing}
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${syncing ? "animate-spin" : ""}`}
            />
            {syncing ? "Syncing..." : "Sync Balance Sheet"}
          </Button>
          {synced && entries.length > 0 && (
            <Button
              variant="outline"
              className="btn-press gap-2"
              onClick={exportCSV}
            >
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card className="card-hover">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Parties
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-base sm:text-lg md:text-2xl font-bold break-words">
              {entries.length}
            </p>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Receivable
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <p className="text-base sm:text-lg md:text-2xl font-bold break-words text-green-600 dark:text-green-400 truncate">
              ₹ {fmtDecimal(totalReceivable)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {entries.filter((e) => e.Balance > 0).length} parties
            </p>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Payable
            </CardTitle>
            <TrendingDown className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <p className="text-base sm:text-lg md:text-2xl font-bold break-words text-red-600 dark:text-red-400 truncate">
              ₹ {fmtDecimal(Math.abs(totalPayable))}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {entries.filter((e) => e.Balance < 0).length} parties
            </p>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Net Balance
            </CardTitle>
            <Scale className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p
              className={`text-base sm:text-lg md:text-2xl font-bold break-words truncate ${
                netBalance >= 0
                  ? "text-green-600 dark:text-green-400"
                  : "text-red-600 dark:text-red-400"
              }`}
            >
              ₹ {fmtDecimal(netBalance)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Table Card */}
      <Card className="card-hover shimmer-hover">
        <CardHeader>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <CardTitle>Dr/Cr Outstanding</CardTitle>
              <CardDescription>
                {synced
                  ? hasFilters
                    ? `${filteredEntries.length} of ${entries.length} parties`
                    : `${entries.length} parties`
                  : 'Click "Sync Balance Sheet" to load outstanding balances from SAP'}
              </CardDescription>
            </div>
            {synced && entries.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search parties..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-8 h-9 w-48 sm:w-56"
                  />
                </div>

                {/* Type filter */}
                <Select
                  value={typeFilter}
                  onValueChange={(v) => setTypeFilter(v as BalanceType)}
                >
                  <SelectTrigger className="h-9 w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Balances</SelectItem>
                    <SelectItem value="DR">
                      Receivable (DR)
                    </SelectItem>
                    <SelectItem value="CR">
                      Payable (CR)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Active filters */}
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

        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">S.No</TableHead>
                  <TableHead>
                    <button
                      type="button"
                      className="flex items-center gap-1 cursor-pointer hover:text-foreground transition-colors"
                      onClick={() => handleSort("CardCode")}
                    >
                      Card Code
                      <SortIcon column="CardCode" />
                    </button>
                  </TableHead>
                  <TableHead>
                    <button
                      type="button"
                      className="flex items-center gap-1 cursor-pointer hover:text-foreground transition-colors"
                      onClick={() => handleSort("CardName")}
                    >
                      Card Name
                      <SortIcon column="CardName" />
                    </button>
                  </TableHead>
                  <TableHead className="text-right">
                    <button
                      type="button"
                      className="flex items-center gap-1 cursor-pointer hover:text-foreground transition-colors ml-auto"
                      onClick={() => handleSort("Balance")}
                    >
                      Balance (₹)
                      <SortIcon column="Balance" />
                    </button>
                  </TableHead>
                  <TableHead className="w-[120px]" />
                  <TableHead className="text-right">
                    <button
                      type="button"
                      className="flex items-center gap-1 cursor-pointer hover:text-foreground transition-colors ml-auto"
                      onClick={() => handleSort("LastDate")}
                    >
                      Last Trans. Date
                      <SortIcon column="LastDate" />
                    </button>
                  </TableHead>
                  <TableHead className="text-right">
                    <button
                      type="button"
                      className="flex items-center gap-1 cursor-pointer hover:text-foreground transition-colors ml-auto"
                      onClick={() => handleSort("LastAmount")}
                    >
                      Last Trans. Amt (₹)
                      <SortIcon column="LastAmount" />
                    </button>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEntries.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7}>
                      <div className="flex flex-col items-center gap-2 text-muted-foreground py-12">
                        <PackageOpen className="h-10 w-10 stroke-1" />
                        <p className="font-medium">
                          {hasFilters
                            ? "No parties match your filters"
                            : "No data loaded"}
                        </p>
                        <p className="text-sm">
                          {hasFilters
                            ? "Try adjusting your search or filter."
                            : "Sync the balance sheet from SAP to see outstanding entries."}
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
                  filteredEntries.map((entry, idx) => {
                    const isTop5 = top5Ids.has(entry.CardCode);
                    const barPct =
                      (Math.abs(entry.Balance) / maxAbsBalance) * 100;
                    const isPositive = entry.Balance >= 0;

                    return (
                      <TableRow
                        key={entry.CardCode}
                        className={isTop5 ? "bg-amber-50/50 dark:bg-amber-900/10" : ""}
                      >
                        <TableCell className="font-medium">
                          {idx + 1}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-xs">
                              {entry.CardCode}
                            </span>
                            {isTop5 && (
                              <Crown className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{entry.CardName}</TableCell>
                        <TableCell
                          className={`text-right font-semibold ${
                            entry.Balance < 0
                              ? "text-red-600 dark:text-red-400"
                              : "text-green-600 dark:text-green-400"
                          }`}
                        >
                          <div className="flex items-center justify-end gap-1.5">
                            <Badge
                              variant="outline"
                              className={`text-[10px] px-1 py-0 ${
                                isPositive
                                  ? "border-green-300 text-green-600 dark:border-green-700 dark:text-green-400"
                                  : "border-red-300 text-red-600 dark:border-red-700 dark:text-red-400"
                              }`}
                            >
                              {isPositive ? "DR" : "CR"}
                            </Badge>
                            {entry.Balance < 0 ? "-" : ""}₹{" "}
                            {fmtDecimal(Math.abs(entry.Balance))}
                          </div>
                        </TableCell>

                        {/* Balance bar */}
                        <TableCell className="px-2">
                          <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                isPositive
                                  ? "bg-green-500/60"
                                  : "bg-red-500/60"
                              }`}
                              style={{ width: `${Math.max(barPct, 2)}%` }}
                            />
                          </div>
                        </TableCell>

                        <TableCell className="text-right text-sm">
                          {fmtDate(entry["Last Transaction Date"])}
                        </TableCell>
                        <TableCell className="text-right">
                          ₹{" "}
                          {fmtDecimal(entry["Last Transanction Amount"])}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>

              {/* Totals footer */}
              {filteredEntries.length > 0 && (
                <TableFooter>
                  <TableRow className="font-semibold">
                    <TableCell colSpan={3} className="text-right">
                      Totals
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="space-y-0.5">
                        <p className="text-green-600 dark:text-green-400">
                          DR: ₹ {fmtDecimal(filteredReceivable)}
                        </p>
                        <p className="text-red-600 dark:text-red-400">
                          CR: ₹ {fmtDecimal(Math.abs(filteredPayable))}
                        </p>
                        <p
                          className={
                            filteredNet >= 0
                              ? "text-green-600 dark:text-green-400"
                              : "text-red-600 dark:text-red-400"
                          }
                        >
                          Net: ₹ {fmtDecimal(filteredNet)}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell />
                    <TableCell />
                    <TableCell />
                  </TableRow>
                </TableFooter>
              )}
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
