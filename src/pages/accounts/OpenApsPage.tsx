import { useEffect, useMemo, useState } from "react";
import { ReceiptText, Search, Filter, CircleDollarSign, Wallet, Building2 } from "lucide-react";

import { getOpenAps, type OpenApEntry } from "@/api/sapSync";
import { getErrorMessage } from "@/lib/errors";
import Guard from "@/components/Guard";
import { Pagination } from "@/components/Pagination";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker";
import { Badge } from "@/components/ui/badge";

const COLS = 14;

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

function fmtUsd(value: number): string {
  return `$ ${fmtNum(value)}`;
}

export default function OpenApsPage() {
  const [rows, setRows] = useState<OpenApEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [vendor, setVendor] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const perPage = 20;

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError("");
      try {
        const data = await getOpenAps();
        setRows(data);
      } catch (err) {
        setError(getErrorMessage(err, "Failed to load Open APs"));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const vendorOptions = useMemo(
    () => [...new Set(rows.map((r) => r["Vendor Name"]).filter(Boolean))].sort(),
    [rows]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((row) => {
      const rowVendor = row["Vendor Name"] ?? "";
      const rowInvoiceNo = String(row["Invoice Number"] ?? "");
      const rowDate = row["Invoice Date"] ? new Date(row["Invoice Date"]) : null;

      const matchesSearch =
        !q ||
        rowVendor.toLowerCase().includes(q) ||
        rowInvoiceNo.includes(q) ||
        (row["Vendor Code"] ?? "").toLowerCase().includes(q);

      const matchesVendor = !vendor || rowVendor === vendor;
      const matchesInvoice = !invoiceNumber || rowInvoiceNo.includes(invoiceNumber.trim());

      let matchesFrom = true;
      let matchesTo = true;
      if (fromDate) {
        const from = new Date(fromDate);
        matchesFrom = !!rowDate && rowDate >= from;
      }
      if (toDate) {
        const to = new Date(toDate);
        to.setHours(23, 59, 59, 999);
        matchesTo = !!rowDate && rowDate <= to;
      }

      return matchesSearch && matchesVendor && matchesInvoice && matchesFrom && matchesTo;
    });
  }, [rows, search, vendor, invoiceNumber, fromDate, toDate]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(filtered.length / perPage)), [filtered.length]);
  const paginated = useMemo(() => filtered.slice((page - 1) * perPage, page * perPage), [filtered, page]);

  const hasFilters = !!(search || vendor || invoiceNumber || fromDate || toDate);
  const totalInr = useMemo(
    () => filtered.reduce((sum, row) => sum + Number(row["Total Invoice Amount (INR)"] ?? 0), 0),
    [filtered]
  );
  const totalPaid = useMemo(
    () => filtered.reduce((sum, row) => sum + Number(row["Amount Paid So Far"] ?? 0), 0),
    [filtered]
  );
  const vendorCount = useMemo(
    () => new Set(filtered.map((row) => row["Vendor Code"]).filter(Boolean)).size,
    [filtered]
  );

  function clearFilters() {
    setSearch("");
    setVendor("");
    setInvoiceNumber("");
    setFromDate("");
    setToDate("");
    setPage(1);
  }

  return (
    <Guard resource="sync_balance_sheet" action="view" fallback={<div className="p-6 text-sm text-muted-foreground">You do not have permission to view Open APs.</div>}>
    <div className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6 animate-page">
      <div className="flex items-center gap-2">
        <ReceiptText className="h-5 w-5 text-muted-foreground" />
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Open APs</h1>
          <p className="text-sm text-muted-foreground">Open vendor payable invoices from SAP</p>
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="border-none bg-emerald-50/60 dark:bg-emerald-950/20 shadow-sm">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider text-emerald-700 dark:text-emerald-300">Total Invoice (INR)</p>
              <p className="text-xl font-bold mt-1">{fmtInr(totalInr)}</p>
            </div>
            <CircleDollarSign className="h-5 w-5 text-emerald-600" />
          </CardContent>
        </Card>
        <Card className="border-none bg-blue-50/60 dark:bg-blue-950/20 shadow-sm">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider text-blue-700 dark:text-blue-300">Amount Paid</p>
              <p className="text-xl font-bold mt-1">{fmtInr(totalPaid)}</p>
            </div>
            <Wallet className="h-5 w-5 text-blue-600" />
          </CardContent>
        </Card>
        <Card className="border-none bg-amber-50/60 dark:bg-amber-950/20 shadow-sm">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider text-amber-700 dark:text-amber-300">Active Vendors</p>
              <p className="text-xl font-bold mt-1">{vendorCount}</p>
            </div>
            <Building2 className="h-5 w-5 text-amber-600" />
          </CardContent>
        </Card>
      </div>

      <Card className="card-hover shimmer-hover">
        <CardHeader>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <CardTitle>Open AP List</CardTitle>
            <Badge variant="secondary" className="font-medium">
              {hasFilters ? "Filtered View" : "All Records"}
            </Badge>
          </div>
          <CardDescription>
            {filtered.length} record{filtered.length !== 1 ? "s" : ""}
            {hasFilters ? ` (filtered from ${rows.length})` : ""}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border bg-muted/20 p-3 sm:p-4">
            <div className="flex items-center gap-2 mb-3 text-xs uppercase tracking-wider text-muted-foreground font-semibold">
              <Filter className="h-3.5 w-3.5" />
              Filters
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="space-y-1.5">
              <Label>Search</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Vendor / Code / Invoice No"
                  value={search}
                  className="pl-8"
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Vendor</Label>
              <Input
                list="open-aps-vendors"
                placeholder="Select vendor"
                value={vendor}
                onChange={(e) => { setVendor(e.target.value); setPage(1); }}
              />
              <datalist id="open-aps-vendors">
                {vendorOptions.map((v) => (
                  <option key={v} value={v} />
                ))}
              </datalist>
            </div>
            <div className="space-y-1.5">
              <Label>Invoice Number</Label>
              <Input
                placeholder="e.g. 626044195"
                value={invoiceNumber}
                onChange={(e) => { setInvoiceNumber(e.target.value); setPage(1); }}
              />
            </div>
            <div className="space-y-1.5">
              <Label>From Date</Label>
              <DatePicker value={fromDate} onChange={(v) => { setFromDate(v || ""); setPage(1); }} />
            </div>
            <div className="space-y-1.5">
              <Label>To Date</Label>
              <div className="flex gap-2">
                <DatePicker value={toDate} onChange={(v) => { setToDate(v || ""); setPage(1); }} />
                {hasFilters && (
                  <Button type="button" variant="outline" onClick={clearFilters}>
                    Clear
                  </Button>
                )}
              </div>
            </div>
          </div>
          </div>

          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>S.No</TableHead>
                  <TableHead>Vendor Invoice</TableHead>
                  <TableHead>Invoice Date</TableHead>
                  <TableHead>Vendor Code</TableHead>
                  <TableHead>Vendor Name</TableHead>
                  <TableHead className="text-right">Total Invoice Amount (INR)</TableHead>
                  <TableHead className="text-right">Total Invoice Amount (FC - USD)</TableHead>
                  <TableHead className="text-right">GST / VAT Amount</TableHead>
                  <TableHead className="text-right">Amount Paid So Far</TableHead>
                  <TableHead>Remarks / Notes</TableHead>
                  <TableHead>Bilty / LR Number</TableHead>
                  <TableHead>Bilty / LR Date</TableHead>
                  <TableHead>Transporter Name</TableHead>
                  <TableHead>Vehicle Number</TableHead>
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
                      No Open AP records found.
                    </TableCell>
                  </TableRow>
                ) : (
                  paginated.map((row, i) => (
                    <TableRow key={`${row["DB Primary Key"]}-${row["Invoice Number"]}`} className="hover:bg-muted/40">
                      <TableCell>{(page - 1) * perPage + i + 1}</TableCell>
                      <TableCell className="font-medium">{row["Vendor Invoice Reference No"] ?? "-"}</TableCell>
                      <TableCell>{fmtDate(row["Invoice Date"])}</TableCell>
                      <TableCell className="font-mono text-xs">{row["Vendor Code"] ?? "-"}</TableCell>
                      <TableCell>{row["Vendor Name"] ?? "-"}</TableCell>
                      <TableCell className="text-right font-semibold">{fmtInr(row["Total Invoice Amount (INR)"])}</TableCell>
                      <TableCell className="text-right">{fmtUsd(row["Total Invoice Amount (Foreign Currency)"])}</TableCell>
                      <TableCell className="text-right">{fmtNum(row["GST / VAT Amount"])}</TableCell>
                      <TableCell className="text-right">{fmtInr(row["Amount Paid So Far"])}</TableCell>
                      <TableCell className="max-w-[360px] truncate" title={row["Remarks / Notes"] ?? ""}>
                        {row["Remarks / Notes"] ?? "-"}
                      </TableCell>
                      <TableCell>{row["Bilty / LR Number"] ?? "-"}</TableCell>
                      <TableCell>{fmtDate(row["Bilty / LR Date"])}</TableCell>
                      <TableCell>{row["Transporter Name"] ?? "-"}</TableCell>
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
