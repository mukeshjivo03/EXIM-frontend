import { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, Clock, RefreshCw, Search, TrendingUp, Users } from "lucide-react";
import { toast } from "sonner";

import { getCustomerAgingBalance, type CustomerAgingEntry } from "@/api/sapSync";
import Guard from "@/components/Guard";
import { Pagination } from "@/components/Pagination";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getErrorMessage } from "@/lib/errors";

type SortKey = "CardCode" | "CardName" | "DocNum" | "DocDate" | "Days_Difference" | "DocTotal" | "PaidToDate" | "Balance" | "Outstanding Amount";
type SortDir = "asc" | "desc";

const COLS = 14;

function getRowId(row: CustomerAgingEntry): string {
  return `${row.CardCode}|${row.DocNum}|${row.DocDate}|${row.ShipToCode}`;
}

function fmtNum(v: number | null | undefined) {
  if (v === null || v === undefined) return "-";
  return v.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(v: string | null | undefined) {
  if (!v) return "-";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("en-IN");
}

export default function CustomerAgingPage() {
  const [rows, setRows] = useState<CustomerAgingEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [bucketFilter, setBucketFilter] = useState("ALL");
  const [syncedAt, setSyncedAt] = useState<Date | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("Days_Difference");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const perPage = 20;

  async function loadData() {
    setError("");
    setLoading(rows.length === 0);
    setSyncing(rows.length > 0);
    try {
      const data = await getCustomerAgingBalance();
      setRows(data);
      setSyncedAt(new Date());
      toast.success(`Loaded ${data.length} customer aging records`);
    } catch (err) {
      const msg = getErrorMessage(err, "Failed to load customer aging balance");
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

  const buckets = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => {
      if (r.Aging) set.add(r.Aging);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [rows]);

  const filteredBase = useMemo(() => {
    const q = search.trim().toLowerCase();
    const searched = q
      ? rows.filter((r) =>
          r.CardCode?.toLowerCase().includes(q) ||
          r.CardName?.toLowerCase().includes(q) ||
          r.SlpName?.toLowerCase().includes(q) ||
          String(r.DocNum ?? "").includes(q) ||
          String(r.Aging ?? "").toLowerCase().includes(q) ||
          String(r.Days_Difference ?? "").includes(q) ||
          String(r.DocTotal ?? "").includes(q) ||
          String(r.PaidToDate ?? "").includes(q) ||
          String(r.Balance ?? "").includes(q) ||
          String(r["Outstanding Amount"] ?? "").includes(q) ||
          String(r.DocDate ?? "").toLowerCase().includes(q)
        )
      : rows;

    return searched.filter((r) => {
      const docDateOnly = r.DocDate ? String(r.DocDate).slice(0, 10) : "";
      const passStart = !startDate || (docDateOnly && docDateOnly >= startDate);
      const passEnd = !endDate || (docDateOnly && docDateOnly <= endDate);
      const passBucket = bucketFilter === "ALL" || r.Aging === bucketFilter;
      return passStart && passEnd && passBucket;
    });
  }, [rows, search, startDate, endDate, bucketFilter]);

  const filtered = useMemo(() => {
    return [...filteredBase].sort((a, b) => {
      const va = a[sortKey];
      const vb = b[sortKey];
      let cmp = 0;
      if (sortKey === "DocDate") {
        cmp = new Date(String(va ?? "1970-01-01")).getTime() - new Date(String(vb ?? "1970-01-01")).getTime();
      } else if (typeof va === "number" || va === null) {
        cmp = Number(va ?? 0) - Number(vb ?? 0);
      } else {
        cmp = String(va ?? "").localeCompare(String(vb ?? ""));
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [filteredBase, sortKey, sortDir]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(filtered.length / perPage)), [filtered.length]);
  const paginated = useMemo(() => filtered.slice((page - 1) * perPage, page * perPage), [filtered, page]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const stats = useMemo(() => {
    const useSelected = selectedRows.size > 0;
    const target = useSelected ? filteredBase.filter((r) => selectedRows.has(getRowId(r))) : filteredBase;
    const receivable = target.reduce((s, r) => s + Number(r.Balance ?? 0), 0);
    const stale = target.filter((r) => Number(r.Days_Difference ?? 0) > 120).length;
    return { total: target.length, receivable, stale, useSelected };
  }, [filteredBase, selectedRows]);

  const selectedVisibleCount = useMemo(
    () => filtered.filter((r) => selectedRows.has(getRowId(r))).length,
    [filtered, selectedRows]
  );
  const allVisibleSelected = filtered.length > 0 && selectedVisibleCount === filtered.length;

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setSortDir(["DocNum", "Days_Difference", "DocTotal", "PaidToDate", "Balance", "Outstanding Amount"].includes(key) ? "desc" : "asc");
  }

  function SortIcon({ column }: { column: SortKey }) {
    if (sortKey !== column) return <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground/50" />;
    return sortDir === "asc" ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />;
  }

  function toggleRow(rowId: string) {
    const next = new Set(selectedRows);
    if (next.has(rowId)) next.delete(rowId);
    else next.add(rowId);
    setSelectedRows(next);
  }

  function toggleSelectAll() {
    const next = new Set(selectedRows);
    if (allVisibleSelected) {
      filtered.forEach((r) => next.delete(getRowId(r)));
    } else {
      filtered.forEach((r) => next.add(getRowId(r)));
    }
    setSelectedRows(next);
  }

  return (
    <Guard resource="customer_balance_sheet" action="view" fallback={<div className="p-6 text-sm text-muted-foreground">You do not have permission to view customer aging.</div>}>
      <div className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6 animate-page">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">Customer Aging</h1>
            <p className="text-sm text-muted-foreground">
              Customer aging balance from SAP
              {syncedAt && (
                <span className="text-muted-foreground/60">
                  {" "}
                  · Last synced {syncedAt.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                </span>
              )}
            </p>
          </div>
          <Button className="h-9 btn-press" onClick={loadData} disabled={syncing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? "animate-spin" : ""}`} />
            {syncing ? "Syncing..." : "Sync Customer Aging"}
          </Button>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
          <Card className="card-hover"><CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0"><CardTitle className="text-sm font-medium text-muted-foreground">Total Records</CardTitle><Users className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><p className="text-base sm:text-lg md:text-2xl font-bold">{stats.total}</p></CardContent></Card>
          <Card className="card-hover"><CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0"><CardTitle className="text-sm font-medium text-muted-foreground">Total Balance</CardTitle><TrendingUp className="h-4 w-4 text-green-500" /></CardHeader><CardContent><p className="text-base sm:text-lg md:text-2xl font-bold text-green-600 dark:text-green-400">₹ {fmtNum(stats.receivable)}</p></CardContent></Card>
          <Card className="card-hover"><CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0"><CardTitle className="text-sm font-medium text-muted-foreground">Over 120 Days</CardTitle><Clock className="h-4 w-4 text-orange-500" /></CardHeader><CardContent><p className="text-base sm:text-lg md:text-2xl font-bold">{stats.stale}</p></CardContent></Card>
        </div>

        <Card className="card-hover shimmer-hover">
          <CardHeader>
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <CardTitle>Customer Aging Details</CardTitle>
                <CardDescription>{filtered.length} record{filtered.length !== 1 ? "s" : ""}</CardDescription>
              </div>
              {selectedRows.size > 0 && (
                <Button variant="outline" size="sm" onClick={() => setSelectedRows(new Set())}>
                  Clear Selection ({selectedVisibleCount || selectedRows.size})
                </Button>
              )}
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by code/name/sales/doc/aging"
                  className="pl-8"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                />
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <div className="w-[160px]">
                  <DatePicker
                    value={startDate}
                    onChange={(v) => {
                      setStartDate(v || "");
                      setPage(1);
                    }}
                  />
                </div>
                <div className="w-[160px]">
                  <DatePicker
                    value={endDate}
                    onChange={(v) => {
                      setEndDate(v || "");
                      setPage(1);
                    }}
                  />
                </div>
                <select
                  value={bucketFilter}
                  onChange={(e) => {
                    setBucketFilter(e.target.value);
                    setPage(1);
                  }}
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="ALL">All Buckets</option>
                  {buckets.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
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
                        aria-label="Select all rows"
                      />
                    </TableHead>
                    <TableHead>S.No</TableHead>
                    <TableHead><button type="button" className="flex items-center gap-1" onClick={() => handleSort("CardCode")}>Code<SortIcon column="CardCode" /></button></TableHead>
                    <TableHead><button type="button" className="flex items-center gap-1" onClick={() => handleSort("CardName")}>Name<SortIcon column="CardName" /></button></TableHead>
                    <TableHead>Sales Rep</TableHead>
                    <TableHead><button type="button" className="flex items-center gap-1" onClick={() => handleSort("DocNum")}>Document No<SortIcon column="DocNum" /></button></TableHead>
                    <TableHead><button type="button" className="flex items-center gap-1" onClick={() => handleSort("DocDate")}>Date<SortIcon column="DocDate" /></button></TableHead>
                    <TableHead className="text-right"><button type="button" className="flex items-center gap-1 ml-auto" onClick={() => handleSort("Days_Difference")}>Days<SortIcon column="Days_Difference" /></button></TableHead>
                    <TableHead>Bucket</TableHead>
                    <TableHead className="text-right"><button type="button" className="flex items-center gap-1 ml-auto" onClick={() => handleSort("DocTotal")}>Amount<SortIcon column="DocTotal" /></button></TableHead>
                    <TableHead className="text-right"><button type="button" className="flex items-center gap-1 ml-auto" onClick={() => handleSort("PaidToDate")}>Paid<SortIcon column="PaidToDate" /></button></TableHead>
                    <TableHead className="text-right"><button type="button" className="flex items-center gap-1 ml-auto" onClick={() => handleSort("Balance")}>Balance<SortIcon column="Balance" /></button></TableHead>
                    <TableHead className="text-right"><button type="button" className="flex items-center gap-1 ml-auto" onClick={() => handleSort("Outstanding Amount")}>Outstanding<SortIcon column="Outstanding Amount" /></button></TableHead>
                    <TableHead>Ship To</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    Array.from({ length: 6 }).map((_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: COLS }).map((__, j) => (
                          <TableCell key={j}><Skeleton className="h-4 w-20" /></TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : paginated.length === 0 ? (
                    <TableRow><TableCell colSpan={COLS} className="py-16 text-center text-muted-foreground">No records found.</TableCell></TableRow>
                  ) : (
                    paginated.map((row, i) => (
                      <TableRow key={`${row.CardCode}-${row.DocNum ?? "no-doc"}-${i}`}>
                        <TableCell>
                          <Checkbox
                            checked={selectedRows.has(getRowId(row))}
                            onCheckedChange={() => toggleRow(getRowId(row))}
                            aria-label={`Select row ${i + 1}`}
                          />
                        </TableCell>
                        <TableCell>{(page - 1) * perPage + i + 1}</TableCell>
                        <TableCell className="font-mono text-xs">{row.CardCode ?? "-"}</TableCell>
                        <TableCell className="font-medium">{row.CardName ?? "-"}</TableCell>
                        <TableCell>{row.SlpName ?? "-"}</TableCell>
                        <TableCell>{row.DocNum ?? "-"}</TableCell>
                        <TableCell>{fmtDate(row.DocDate)}</TableCell>
                        <TableCell className="text-right">{row.Days_Difference ?? "-"}</TableCell>
                        <TableCell><Badge variant="outline">{row.Aging ?? "-"}</Badge></TableCell>
                        <TableCell className="text-right">{fmtNum(row.DocTotal)}</TableCell>
                        <TableCell className="text-right">{fmtNum(row.PaidToDate)}</TableCell>
                        <TableCell className={`text-right font-semibold ${Number(row.Balance ?? 0) >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>{fmtNum(row.Balance)}</TableCell>
                        <TableCell className={`text-right font-semibold ${Number(row["Outstanding Amount"] ?? 0) >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                          {fmtNum(row["Outstanding Amount"])}
                        </TableCell>
                        <TableCell className="max-w-[260px] truncate" title={row.ShipToCode ?? ""}>{row.ShipToCode ?? "-"}</TableCell>
                      </TableRow>
                    ))
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
    </Guard>
  );
}

