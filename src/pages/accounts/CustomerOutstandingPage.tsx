import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Clock,
  RefreshCw,
  Scale,
  Search,
  TrendingDown,
  TrendingUp,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { getCustomerOutstanding, type CustomerOutstandingEntry } from "@/api/sapSync";
import { getErrorMessage } from "@/lib/errors";
import { cn } from "@/lib/utils";
import { Pagination } from "@/components/Pagination";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";

const COLS = 14;
type SortKey =
  | "CardCode"
  | "CardName"
  | "SlpName"
  | "Outstanding Amount"
  | "Outstanding After 1-Apr-26"
  | "Outstanding Before 1-Apr-26"
  | "DocNum"
  | "InvoiceDate"
  | "Since_Last_Invoice"
  | "InvoiceAmount"
  | "Transaction_Date"
  | "Transaction_Amount"
  | "Since_Last_Transaction";
type SortDir = "asc" | "desc";

function fmtDate(value: string | null): string {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("en-IN");
}

function fmtNum(value: number | null): string {
  if (value === null || value === undefined) return "-";
  return value.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function txAgeBadgeClass(value: number | null): string {
  if (value === null || value === undefined) return "bg-muted text-muted-foreground border-border";
  if (value > 25) return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800";
  if (value > 15) return "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border-orange-200 dark:border-orange-800";
  if (value > 7) return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800";
  return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800";
}

function outstandingBeforeFirstApril(row: CustomerOutstandingEntry): number {
  return Number(row["Outstanding Amount"] ?? 0) - Number(row["Outstanding After 1-Apr-26"] ?? 0);
}

function getRowId(row: CustomerOutstandingEntry): string {
  return `${row.CardCode}|${row.DocNum}|${row.InvoiceDate}`;
}

export default function CustomerOutstandingPage() {
  const [rows, setRows] = useState<CustomerOutstandingEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [syncedAt, setSyncedAt] = useState<Date | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("Outstanding Amount");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [showAll, setShowAll] = useState(false);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const navigate = useNavigate();
  const perPage = 20;

  async function loadData() {
    setError("");
    setLoading(rows.length === 0);
    setSyncing(rows.length > 0);
    try {
      const data = await getCustomerOutstanding();
      setRows(data);
      setSyncedAt(new Date());
      toast.success(`Loaded ${data.length} customer outstanding entries`);
    } catch (err) {
      const msg = getErrorMessage(err, "Failed to load customer outstanding");
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
      setSyncing(false);
    }
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    let base = rows;

    if (!showAll) {
      base = base.filter((row) => Number(row["Outstanding Amount"] ?? 0) > 0);
    }

    const q = search.trim().toLowerCase();
    if (q) {
      base = base.filter((row) =>
        row.CardCode?.toLowerCase().includes(q) ||
        row.CardName?.toLowerCase().includes(q) ||
        row.SlpName?.toLowerCase().includes(q) ||
        String(row.DocNum ?? "").includes(q)
      );
    }

    return [...base].sort((a, b) => {
      const va = sortKey === "Outstanding Before 1-Apr-26" ? outstandingBeforeFirstApril(a) : a[sortKey];
      const vb = sortKey === "Outstanding Before 1-Apr-26" ? outstandingBeforeFirstApril(b) : b[sortKey];
      let cmp = 0;
      if (typeof va === "number" || va === null) {
        cmp = Number(va ?? 0) - Number(vb ?? 0);
      } else if (sortKey === "InvoiceDate" || sortKey === "Transaction_Date") {
        cmp = new Date(String(va ?? "1970-01-01")).getTime() - new Date(String(vb ?? "1970-01-01")).getTime();
      } else {
        cmp = String(va ?? "").localeCompare(String(vb ?? ""));
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [rows, search, sortKey, sortDir, showAll]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(filtered.length / perPage)), [filtered.length]);
  const paginated = useMemo(() => filtered.slice((page - 1) * perPage, page * perPage), [filtered, page]);
  const selectedVisibleCount = useMemo(() => filtered.filter((r) => selectedRows.has(getRowId(r))).length, [filtered, selectedRows]);
  const allVisibleSelected = filtered.length > 0 && selectedVisibleCount === filtered.length;

  const stats = useMemo(() => {
    const isSelectionActive = selectedRows.size > 0;
    const targetRows = isSelectionActive
      ? rows.filter((r) => selectedRows.has(getRowId(r)))
      : rows;

    const receivable = targetRows
      .filter((r) => Number(r["Outstanding Amount"] ?? 0) > 0)
      .reduce((s, r) => s + Number(r["Outstanding Amount"] ?? 0), 0);
    
    const payable = targetRows
      .filter((r) => Number(r["Outstanding Amount"] ?? 0) < 0)
      .reduce((s, r) => s + Number(r["Outstanding Amount"] ?? 0), 0);
    
    const net = targetRows.reduce((s, r) => s + Number(r["Outstanding Amount"] ?? 0), 0);
    
    const stale = targetRows.filter(
      (r) => (r.Since_Last_Transaction ?? r.Since_Last_Invoice ?? 0) > 25
    ).length;

    return {
      count: targetRows.length,
      receivable,
      payable,
      net,
      stale,
      isSelectionActive
    };
  }, [rows, selectedRows]);

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setSortDir(key === "Outstanding Amount" || key === "Outstanding After 1-Apr-26" || key === "Outstanding Before 1-Apr-26" ? "desc" : "asc");
  }

  function SortIcon({ column }: { column: SortKey }) {
    if (sortKey !== column) return <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground/50" />;
    return sortDir === "asc" ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />;
  }

  const toggleSelectAll = () => {
    const allFilteredSelected = filtered.length > 0 && filtered.every((r) => selectedRows.has(getRowId(r)));
    const next = new Set(selectedRows);
    if (allFilteredSelected) {
      filtered.forEach((r) => next.delete(getRowId(r)));
    } else {
      filtered.forEach((r) => next.add(getRowId(r)));
    }
    setSelectedRows(next);
  };

  const toggleRow = (rowId: string) => {
    const next = new Set(selectedRows);
    if (next.has(rowId)) {
      next.delete(rowId);
    } else {
      next.add(rowId);
    }
    setSelectedRows(next);
  };

  return (
    <div className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6 animate-page">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Customer Outstanding</h1>
          <p className="text-sm text-muted-foreground">
            Customer outstanding details from SAP
            {syncedAt && (
              <span className="text-muted-foreground/60">
                {" "}
                · Last synced{" "}
                {syncedAt.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <Button 
            variant={showAll ? "secondary" : "outline"}
            size="sm"
            className="h-9 px-4"
            onClick={() => {
              setShowAll(!showAll);
              setPage(1);
            }}
          >
            {showAll ? "Showing All Records" : "Show All Records"}
          </Button>
          <Button className="h-9 btn-press" onClick={loadData} disabled={syncing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? "animate-spin" : ""}`} />
            {syncing ? "Syncing..." : "Sync Customer Outstanding"}
          </Button>
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <Card className={cn("card-hover transition-all duration-300", stats.isSelectionActive && "ring-2 ring-primary bg-primary/5 shadow-md")}>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {stats.isSelectionActive ? "Selected Parties" : "Total Parties"}
            </CardTitle>
            <Users className={cn("h-4 w-4 text-muted-foreground", stats.isSelectionActive && "text-primary")} />
          </CardHeader>
          <CardContent><p className="text-base sm:text-lg md:text-2xl font-bold">{stats.count}</p></CardContent>
        </Card>
        <Card className={cn("card-hover transition-all duration-300", stats.isSelectionActive && "ring-2 ring-primary bg-primary/5 shadow-md")}>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {stats.isSelectionActive ? "Selected Receivable" : "Total Receivable"}
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent><p className="text-base sm:text-lg md:text-2xl font-bold text-green-600 dark:text-green-400">₹ {fmtNum(stats.receivable)}</p></CardContent>
        </Card>
        <Card className={cn("card-hover transition-all duration-300", stats.isSelectionActive && "ring-2 ring-primary bg-primary/5 shadow-md")}>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {stats.isSelectionActive ? "Selected Payable" : "Total Payable"}
            </CardTitle>
            <TrendingDown className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent><p className="text-base sm:text-lg md:text-2xl font-bold text-red-600 dark:text-red-400">₹ {fmtNum(Math.abs(stats.payable))}</p></CardContent>
        </Card>
        <Card className={cn("card-hover transition-all duration-300", stats.isSelectionActive && "ring-2 ring-primary bg-primary/5 shadow-md")}>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {stats.isSelectionActive ? "Selected Net" : "Net Balance"}
            </CardTitle>
            <Scale className={cn("h-4 w-4 text-muted-foreground", stats.isSelectionActive && "text-primary")} />
          </CardHeader>
          <CardContent>
            <p className={`text-base sm:text-lg md:text-2xl font-bold ${stats.net >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
              ₹ {fmtNum(stats.net)}
            </p>
          </CardContent>
        </Card>
        <Card className={cn("card-hover transition-all duration-300", stats.isSelectionActive && "ring-2 ring-primary bg-primary/5 shadow-md")}>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {stats.isSelectionActive ? "Selected Stale" : "Stale (>25d)"}
            </CardTitle>
            <Clock className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent><p className="text-base sm:text-lg md:text-2xl font-bold">{stats.stale}</p></CardContent>
        </Card>
      </div>

      <Card className="card-hover shimmer-hover">
        <CardHeader>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <div>
                <CardTitle>Customer Outstanding</CardTitle>
                <CardDescription>
                  {filtered.length} record{filtered.length !== 1 ? "s" : ""}
                  {search ? ` (filtered from ${rows.length})` : ""}
                </CardDescription>
              </div>
              {selectedRows.size > 0 && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setSelectedRows(new Set())}
                  className="h-8 text-xs bg-primary/5 border-primary/20 text-primary"
                >
                  Clear Selection ({selectedVisibleCount || selectedRows.size})
                </Button>
              )}
            </div>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search card code/name/sales/doc no"
                className="pl-8"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px]">
                    <Checkbox 
                      checked={allVisibleSelected ? true : selectedVisibleCount > 0 ? "indeterminate" : false}
                      onCheckedChange={toggleSelectAll}
                      aria-label="Select all"
                    />
                  </TableHead>
                  <TableHead>S.No</TableHead>
                  <TableHead>Customer Code</TableHead>
                  <TableHead>Customer Name</TableHead>
                  <TableHead>Sales Employee</TableHead>
                  <TableHead className="text-right">
                    <button type="button" className="flex items-center gap-1 ml-auto" onClick={() => handleSort("Outstanding Amount")}>
                      Total Outstanding
                      <SortIcon column="Outstanding Amount" />
                    </button>
                  </TableHead>
                  <TableHead className="text-right">
                    <button type="button" className="flex items-center gap-1 ml-auto" onClick={() => handleSort("Outstanding After 1-Apr-26")}>
                      Outstanding After 1st April
                      <SortIcon column="Outstanding After 1-Apr-26" />
                    </button>
                  </TableHead>
                  <TableHead className="text-right">
                    <button type="button" className="flex items-center gap-1 ml-auto" onClick={() => handleSort("Outstanding Before 1-Apr-26")}>
                      Outstanding Before 1st April
                      <SortIcon column="Outstanding Before 1-Apr-26" />
                    </button>
                  </TableHead>
                  <TableHead>Invoice No</TableHead>
                  <TableHead>Invoice Date</TableHead>
                  <TableHead className="text-right">Days (Invoice)</TableHead>
                  <TableHead className="text-right">Invoice Amount</TableHead>
                  <TableHead>Last Payment Date</TableHead>
                  <TableHead className="text-right">Last Payment Amount</TableHead>
                  <TableHead className="text-right">Days (Payment)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-4" /></TableCell>
                      {Array.from({ length: COLS }).map((__, j) => (
                        <TableCell key={j}><Skeleton className="h-4 w-20" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : paginated.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={COLS + 1} className="py-16 text-center text-muted-foreground">
                      No records found.
                    </TableCell>
                  </TableRow>
                ) : (
                  paginated.map((row, i) => {
                    const rowId = getRowId(row);
                    const isSelected = selectedRows.has(rowId);
                    
                    const handleNavigate = (e: React.MouseEvent) => {
                      e.stopPropagation();
                      navigate(`/accounts/customer-outstanding/${encodeURIComponent(row.CardCode)}`, {
                        state: {
                          entry: {
                            CardCode: row.CardCode,
                            CardName: row.CardName,
                            Balance: row["Outstanding Amount"],
                            "Last Transaction Date": row.Transaction_Date,
                            "Last Transanction Amount": row.Transaction_Amount,
                          },
                        },
                      });
                    };

                    return (
                      <TableRow
                        key={`${row.CardCode}-${row.DocNum ?? "no-doc"}-${i}`}
                        className={cn("hover:bg-muted/40 cursor-pointer transition-colors", isSelected && "bg-primary/5 hover:bg-primary/10")}
                        onClick={() => toggleRow(rowId)}
                      >
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Checkbox 
                            checked={isSelected}
                            onCheckedChange={() => toggleRow(rowId)}
                            aria-label={`Select row ${i}`}
                          />
                        </TableCell>
                        <TableCell>{(page - 1) * perPage + i + 1}</TableCell>
                        <TableCell className="font-mono text-xs text-primary hover:underline" onClick={handleNavigate}>
                          {row.CardCode ?? "-"}
                        </TableCell>
                        <TableCell className="font-medium hover:text-primary transition-colors" onClick={handleNavigate}>
                          {row.CardName ?? "-"}
                        </TableCell>
                        <TableCell>{row.SlpName ?? "-"}</TableCell>
                        <TableCell className={`text-right font-semibold ${Number(row["Outstanding Amount"] ?? 0) < 0 ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"}`}>
                          <div className="flex items-center justify-end gap-1.5">
                            <Badge variant="outline" className={`text-[10px] px-1 py-0 ${Number(row["Outstanding Amount"] ?? 0) >= 0 ? "border-green-300 text-green-600 dark:border-green-700 dark:text-green-400" : "border-red-300 text-red-600 dark:border-red-700 dark:text-red-400"}`}>
                              {Number(row["Outstanding Amount"] ?? 0) >= 0 ? "DR" : "CR"}
                            </Badge>
                            {fmtNum(row["Outstanding Amount"])}
                          </div>
                        </TableCell>
                        <TableCell className={`text-right font-medium ${Number(row["Outstanding After 1-Apr-26"] ?? 0) < 0 ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"}`}>
                          {fmtNum(row["Outstanding After 1-Apr-26"])}
                        </TableCell>
                        <TableCell className={`text-right font-medium ${outstandingBeforeFirstApril(row) < 0 ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"}`}>
                          {fmtNum(outstandingBeforeFirstApril(row))}
                        </TableCell>
                        <TableCell>{row.DocNum ?? "-"}</TableCell>
                        <TableCell className="whitespace-nowrap">{fmtDate(row.InvoiceDate)}</TableCell>
                        <TableCell className="text-right">{row.Since_Last_Invoice ?? "-"}</TableCell>
                        <TableCell className="text-right font-medium">{fmtNum(row.InvoiceAmount)}</TableCell>
                        <TableCell className="whitespace-nowrap">{fmtDate(row.Transaction_Date)}</TableCell>
                        <TableCell className="text-right">{fmtNum(row.Transaction_Amount)}</TableCell>
                        <TableCell className="text-right">
                          <Badge
                            variant="outline"
                            className={`text-xs font-semibold tabular-nums min-w-[40px] justify-center ${txAgeBadgeClass(row.Since_Last_Transaction)}`}
                          >
                            {row.Since_Last_Transaction ?? "-"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
          {!loading && (
            <Pagination
              page={page}
              totalPages={totalPages}
              totalItems={filtered.length}
              perPage={perPage}
              onPageChange={setPage}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
