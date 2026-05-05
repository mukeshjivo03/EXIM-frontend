import { useEffect, useMemo, useState } from "react";
import { ReceiptText, Search, CircleDollarSign, Wallet, Clock } from "lucide-react";

import { getOpenArs, type OpenArEntry } from "@/api/sapSync";
import { getErrorMessage } from "@/lib/errors";
import Guard from "@/components/Guard";
import { Pagination } from "@/components/Pagination";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

const COLS = 15;

function fmtDate(value: string | null): string {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("en-IN");
}

function fmtNum(value: number): string {
  return Number(value ?? 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

function fmtInr(value: number): string {
  return `₹ ${fmtNum(value)}`;
}

export default function OpenArsPage() {
  const [rows, setRows] = useState<OpenArEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const perPage = 20;

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError("");
      try {
        const data = await getOpenArs();
        setRows(data);
      } catch (err) {
        setError(getErrorMessage(err, "Failed to load Open ARs"));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) =>
      String(row["Invoice Num"] ?? "").includes(q) ||
      (row["Vendor Code"] ?? "").toLowerCase().includes(q) ||
      (row["Vendor Name"] ?? "").toLowerCase().includes(q) ||
      (row.Comments ?? "").toLowerCase().includes(q)
    );
  }, [rows, search]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(filtered.length / perPage)), [filtered.length]);
  const paginated = useMemo(() => filtered.slice((page - 1) * perPage, page * perPage), [filtered, page]);

  const totalInvoice = useMemo(
    () => filtered.reduce((sum, row) => sum + Number(row["Invoice Total"] ?? 0), 0),
    [filtered]
  );
  const avgDaysOpen = useMemo(() => {
    if (!filtered.length) return 0;
    const totalDays = filtered.reduce((sum, row) => sum + Number(row["Days Open"] ?? 0), 0);
    return totalDays / filtered.length;
  }, [filtered]);
  const customerCount = useMemo(
    () => new Set(filtered.map((row) => row["Vendor Code"]).filter(Boolean)).size,
    [filtered]
  );

  return (
    <Guard resource="customer_balance_sheet" action="view" fallback={<div className="p-6 text-sm text-muted-foreground">You do not have permission to view Open ARs.</div>}>
      <div className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6 animate-page">
        <div className="flex items-center gap-2">
          <ReceiptText className="h-5 w-5 text-muted-foreground" />
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">Open ARs</h1>
            <p className="text-sm text-muted-foreground">Open customer receivable invoices from SAP</p>
          </div>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="border-none bg-emerald-50/60 dark:bg-emerald-950/20 shadow-sm">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wider text-emerald-700 dark:text-emerald-300">Total Invoice</p>
                <p className="text-xl font-bold mt-1">{fmtInr(totalInvoice)}</p>
              </div>
              <CircleDollarSign className="h-5 w-5 text-emerald-600" />
            </CardContent>
          </Card>
          <Card className="border-none bg-blue-50/60 dark:bg-blue-950/20 shadow-sm">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wider text-blue-700 dark:text-blue-300">Customers</p>
                <p className="text-xl font-bold mt-1">{customerCount}</p>
              </div>
              <Wallet className="h-5 w-5 text-blue-600" />
            </CardContent>
          </Card>
          <Card className="border-none bg-amber-50/60 dark:bg-amber-950/20 shadow-sm">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wider text-amber-700 dark:text-amber-300">Avg Days Open</p>
                <p className="text-xl font-bold mt-1">{fmtNum(avgDaysOpen)}</p>
              </div>
              <Clock className="h-5 w-5 text-amber-600" />
            </CardContent>
          </Card>
        </div>

        <Card className="card-hover shimmer-hover">
          <CardHeader>
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <CardTitle>Open AR List</CardTitle>
                <CardDescription>
                  {filtered.length} record{filtered.length !== 1 ? "s" : ""}
                  {search ? ` (filtered from ${rows.length})` : ""}
                </CardDescription>
              </div>
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search invoice no / customer code / customer name"
                  value={search}
                  className="pl-8"
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
                    <TableHead>Invoice No</TableHead>
                    <TableHead>Invoice Date</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Customer Code</TableHead>
                    <TableHead>Customer Name</TableHead>
                    <TableHead className="text-right">Invoice Total</TableHead>
                    <TableHead className="text-right">Days Open</TableHead>
                    <TableHead>Comments</TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead>Ship To</TableHead>
                    <TableHead>Dispatch Date</TableHead>
                    <TableHead>Bilty No</TableHead>
                    <TableHead>Bilty Date</TableHead>
                    <TableHead>Vehicle No</TableHead>
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
                        No Open AR records found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginated.map((row, i) => (
                      <TableRow key={`${row["Invoice Num"]}-${row["Vendor Code"]}`} className="hover:bg-muted/40">
                        <TableCell>{(page - 1) * perPage + i + 1}</TableCell>
                        <TableCell className="font-medium">{row["Invoice Num"] ?? "-"}</TableCell>
                        <TableCell>{fmtDate(row["Invoice Date"])}</TableCell>
                        <TableCell>{fmtDate(row["Invoice Due Date"])}</TableCell>
                        <TableCell className="font-mono text-xs">{row["Vendor Code"] ?? "-"}</TableCell>
                        <TableCell>{row["Vendor Name"] ?? "-"}</TableCell>
                        <TableCell className="text-right font-semibold">{fmtInr(row["Invoice Total"] ?? 0)}</TableCell>
                        <TableCell className="text-right">
                          <Badge variant="outline">{row["Days Open"] ?? "-"}</Badge>
                        </TableCell>
                        <TableCell className="max-w-[260px] truncate" title={row.Comments ?? ""}>{row.Comments ?? "-"}</TableCell>
                        <TableCell className="max-w-[260px] truncate" title={row.Address ?? ""}>{row.Address ?? "-"}</TableCell>
                        <TableCell className="max-w-[220px] truncate" title={row.ShipToCode ?? ""}>{row.ShipToCode ?? "-"}</TableCell>
                        <TableCell>{fmtDate(row["Dispatch Date"])}</TableCell>
                        <TableCell>{row["Bilty Num"] ?? "-"}</TableCell>
                        <TableCell>{fmtDate(row["Bilty Date"])}</TableCell>
                        <TableCell>{row["Vehicle Number"] ?? "-"}</TableCell>
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

