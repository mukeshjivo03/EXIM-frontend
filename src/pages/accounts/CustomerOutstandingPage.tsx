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
import { Pagination } from "@/components/Pagination";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

const COLS = 12;
type SortKey =
  | "CardCode"
  | "CardName"
  | "SlpName"
  | "Outstanding Amount"
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
    const q = search.trim().toLowerCase();
    const base = !q ? rows : rows.filter((row) =>
      row.CardCode?.toLowerCase().includes(q) ||
      row.CardName?.toLowerCase().includes(q) ||
      row.SlpName?.toLowerCase().includes(q) ||
      String(row.DocNum ?? "").includes(q)
    );
    return [...base].sort((a, b) => {
      const va = a[sortKey];
      const vb = b[sortKey];
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
  }, [rows, search, sortKey, sortDir]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(filtered.length / perPage)), [filtered.length]);
  const paginated = useMemo(() => filtered.slice((page - 1) * perPage, page * perPage), [filtered, page]);
  const totalReceivable = useMemo(
    () => rows.filter((r) => Number(r["Outstanding Amount"] ?? 0) > 0).reduce((s, r) => s + Number(r["Outstanding Amount"] ?? 0), 0),
    [rows]
  );
  const totalPayable = useMemo(
    () => rows.filter((r) => Number(r["Outstanding Amount"] ?? 0) < 0).reduce((s, r) => s + Number(r["Outstanding Amount"] ?? 0), 0),
    [rows]
  );
  const netBalance = useMemo(() => rows.reduce((s, r) => s + Number(r["Outstanding Amount"] ?? 0), 0), [rows]);
  const staleCount = useMemo(
    () => rows.filter((r) => (r.Since_Last_Transaction ?? r.Since_Last_Invoice ?? 0) > 25).length,
    [rows]
  );

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setSortDir(key === "Outstanding Amount" ? "desc" : "asc");
  }

  function SortIcon({ column }: { column: SortKey }) {
    if (sortKey !== column) return <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground/50" />;
    return sortDir === "asc" ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />;
  }

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
        <Button className="btn-press" onClick={loadData} disabled={syncing}>
          <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? "animate-spin" : ""}`} />
          {syncing ? "Syncing..." : "Sync Customer Outstanding"}
        </Button>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <Card className="card-hover">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Parties</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><p className="text-base sm:text-lg md:text-2xl font-bold">{rows.length}</p></CardContent>
        </Card>
        <Card className="card-hover">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Receivable</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent><p className="text-base sm:text-lg md:text-2xl font-bold text-green-600 dark:text-green-400">₹ {fmtNum(totalReceivable)}</p></CardContent>
        </Card>
        <Card className="card-hover">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Payable</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent><p className="text-base sm:text-lg md:text-2xl font-bold text-red-600 dark:text-red-400">₹ {fmtNum(Math.abs(totalPayable))}</p></CardContent>
        </Card>
        <Card className="card-hover">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Net Balance</CardTitle>
            <Scale className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className={`text-base sm:text-lg md:text-2xl font-bold ${netBalance >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
              ₹ {fmtNum(netBalance)}
            </p>
          </CardContent>
        </Card>
        <Card className="card-hover">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Stale (&gt;25d)</CardTitle>
            <Clock className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent><p className="text-base sm:text-lg md:text-2xl font-bold">{staleCount}</p></CardContent>
        </Card>
      </div>

      <Card className="card-hover shimmer-hover">
        <CardHeader>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <CardTitle>Customer Outstanding</CardTitle>
              <CardDescription>
                {filtered.length} record{filtered.length !== 1 ? "s" : ""}
                {search ? ` (filtered from ${rows.length})` : ""}
              </CardDescription>
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
                  <TableHead>S.No</TableHead>
                  <TableHead><button type="button" className="flex items-center gap-1" onClick={() => handleSort("CardCode")}>Customer Code<SortIcon column="CardCode" /></button></TableHead>
                  <TableHead><button type="button" className="flex items-center gap-1" onClick={() => handleSort("CardName")}>Customer Name<SortIcon column="CardName" /></button></TableHead>
                  <TableHead><button type="button" className="flex items-center gap-1" onClick={() => handleSort("SlpName")}>Sales Employee<SortIcon column="SlpName" /></button></TableHead>
                  <TableHead className="text-right"><button type="button" className="flex items-center gap-1 ml-auto" onClick={() => handleSort("Outstanding Amount")}>Outstanding<SortIcon column="Outstanding Amount" /></button></TableHead>
                  <TableHead><button type="button" className="flex items-center gap-1" onClick={() => handleSort("DocNum")}>Invoice No<SortIcon column="DocNum" /></button></TableHead>
                  <TableHead><button type="button" className="flex items-center gap-1" onClick={() => handleSort("InvoiceDate")}>Invoice Date<SortIcon column="InvoiceDate" /></button></TableHead>
                  <TableHead className="text-right"><button type="button" className="flex items-center gap-1 ml-auto" onClick={() => handleSort("Since_Last_Invoice")}>Days (Invoice)<SortIcon column="Since_Last_Invoice" /></button></TableHead>
                  <TableHead className="text-right"><button type="button" className="flex items-center gap-1 ml-auto" onClick={() => handleSort("InvoiceAmount")}>Invoice Amount<SortIcon column="InvoiceAmount" /></button></TableHead>
                  <TableHead><button type="button" className="flex items-center gap-1" onClick={() => handleSort("Transaction_Date")}>Last Payment Date<SortIcon column="Transaction_Date" /></button></TableHead>
                  <TableHead className="text-right"><button type="button" className="flex items-center gap-1 ml-auto" onClick={() => handleSort("Transaction_Amount")}>Last Payment Amount<SortIcon column="Transaction_Amount" /></button></TableHead>
                  <TableHead className="text-right"><button type="button" className="flex items-center gap-1 ml-auto" onClick={() => handleSort("Since_Last_Transaction")}>Days (Payment)<SortIcon column="Since_Last_Transaction" /></button></TableHead>
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
                  <TableRow>
                    <TableCell colSpan={COLS} className="py-16 text-center text-muted-foreground">
                      No records found.
                    </TableCell>
                  </TableRow>
                ) : (
                  paginated.map((row, i) => (
                    <TableRow
                      key={`${row.CardCode}-${row.DocNum ?? "no-doc"}-${i}`}
                      className="hover:bg-muted/40 cursor-pointer"
                      onClick={() =>
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
                        })
                      }
                    >
                      <TableCell>{(page - 1) * perPage + i + 1}</TableCell>
                      <TableCell className="font-mono text-xs">{row.CardCode ?? "-"}</TableCell>
                      <TableCell>{row.CardName ?? "-"}</TableCell>
                      <TableCell>{row.SlpName ?? "-"}</TableCell>
                      <TableCell className={`text-right font-medium ${Number(row["Outstanding Amount"] ?? 0) < 0 ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"}`}>
                        <div className="flex items-center justify-end gap-1.5">
                          <Badge variant="outline" className={`text-[10px] px-1 py-0 ${Number(row["Outstanding Amount"] ?? 0) >= 0 ? "border-green-300 text-green-600 dark:border-green-700 dark:text-green-400" : "border-red-300 text-red-600 dark:border-red-700 dark:text-red-400"}`}>
                            {Number(row["Outstanding Amount"] ?? 0) >= 0 ? "DR" : "CR"}
                          </Badge>
                          {fmtNum(row["Outstanding Amount"])}
                        </div>
                      </TableCell>
                      <TableCell>{row.DocNum ?? "-"}</TableCell>
                      <TableCell>{fmtDate(row.InvoiceDate)}</TableCell>
                      <TableCell className="text-right">{row.Since_Last_Invoice ?? "-"}</TableCell>
                      <TableCell className="text-right">{fmtNum(row.InvoiceAmount)}</TableCell>
                      <TableCell>{fmtDate(row.Transaction_Date)}</TableCell>
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
  );
}
