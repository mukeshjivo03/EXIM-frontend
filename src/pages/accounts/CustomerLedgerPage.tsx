import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, CheckCircle2, Search } from "lucide-react";

import {
  getCustomerLedger,
  syncBalanceSheet,
  type BalanceEntry,
  type CustomerLedgerEntry,
} from "@/api/sapSync";
import { fmtDate, fmtDecimal } from "@/lib/formatters";
import { getErrorMessage } from "@/lib/errors";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type LocationState = {
  entry?: BalanceEntry;
};

function txAgeBadgeClass(value: number | null): string {
  if (value === null || value === undefined) return "bg-muted text-muted-foreground border-border";
  if (value > 25) return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800";
  if (value > 15) return "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border-orange-200 dark:border-orange-800";
  if (value > 7) return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800";
  return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800";
}

export default function CustomerLedgerPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { customerCode: customerCodeParam = "" } = useParams();
  const customerCode = useMemo(() => {
    try {
      return decodeURIComponent(customerCodeParam);
    } catch {
      return customerCodeParam;
    }
  }, [customerCodeParam]);
  const locationState = location.state as LocationState | null;

  const [customerEntry, setCustomerEntry] = useState<BalanceEntry | null>(
    locationState?.entry ?? null
  );
  const [ledgerRows, setLedgerRows] = useState<CustomerLedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    async function loadData() {
      if (!customerCode) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const [ledger, balances] = await Promise.all([
          getCustomerLedger(customerCode),
          customerEntry ? Promise.resolve<BalanceEntry[] | null>(null) : syncBalanceSheet(),
        ]);

        if (!customerEntry && balances) {
          const match = balances.find((e) => e.CardCode === customerCode) ?? null;
          setCustomerEntry(match);
        }

        setLedgerRows(ledger);
      } catch (err) {
        toast.error(getErrorMessage(err, `Failed to load ledger for ${customerCode}`));
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [customerCode, customerEntry]);

  const daysOutstanding = useMemo(() => {
    if (!customerEntry?.["Last Transaction Date"]) return null;
    const d = new Date(customerEntry["Last Transaction Date"]);
    return Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
  }, [customerEntry]);

  const filteredRows = useMemo(() => {
    let base = ledgerRows;

    if (startDate) {
      const start = new Date(startDate);
      base = base.filter((r) => new Date(r.PostingDate) >= start);
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      base = base.filter((r) => new Date(r.PostingDate) <= end);
    }

    const q = search.trim().toLowerCase();
    if (!q) return base;

    return base.filter(
      (r) =>
        String(r.SourceDocNo ?? "").toLowerCase().includes(q) ||
        String(r.VoucherNo ?? "").toLowerCase().includes(q) ||
        String(r.DocType ?? "").toLowerCase().includes(q) ||
        String(r.Narration ?? "").toLowerCase().includes(q)
    );
  }, [ledgerRows, search, startDate, endDate]);

  return (
    <div className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6 animate-page">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Customer Ledger</h1>
          <p className="text-sm text-muted-foreground">
            Customer code: {customerCode}
          </p>
        </div>
        <Button variant="outline" className="btn-press" onClick={() => navigate("/accounts/customer-outstanding")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Customer Outstanding
        </Button>
      </div>

      <Card className="card-hover">
        <CardHeader>
          <CardTitle>Customer Summary</CardTitle>
          <CardDescription>
            Customer details and latest transaction summary
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-sm">
            <div className="rounded-md border p-3">
              <p className="text-muted-foreground">Customer Code</p>
              <p className="font-semibold">{customerEntry?.CardCode ?? customerCode}</p>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-muted-foreground">Customer Name</p>
              <p className="font-semibold">{customerEntry?.CardName ?? "—"}</p>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-muted-foreground">Outstanding Balance</p>
              <p
                className={cn(
                  "font-semibold",
                  (customerEntry?.Balance ?? 0) < 0
                    ? "text-red-600 dark:text-red-400"
                    : "text-green-600 dark:text-green-400"
                )}
              >
                {customerEntry ? `₹ ${fmtDecimal(customerEntry.Balance)}` : "—"}
              </p>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-muted-foreground">Last Trans. Date</p>
              <p className="font-semibold">
                {customerEntry ? fmtDate(customerEntry["Last Transaction Date"]) : "—"}
              </p>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-muted-foreground">Last Trans. Amt (₹) · Days Outstanding</p>
              <div className="flex items-center gap-2 mt-1">
                <p className="font-semibold">
                  {customerEntry ? `₹ ${fmtDecimal(customerEntry["Last Transanction Amount"])}` : "—"}
                </p>
                <span className="text-muted-foreground">·</span>
                {daysOutstanding !== null ? (
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-xs font-semibold px-2 py-0",
                      txAgeBadgeClass(daysOutstanding)
                    )}
                  >
                    {daysOutstanding}d
                  </Badge>
                ) : (
                  <span className="font-semibold">—</span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="card-hover shimmer-hover">
        <CardHeader>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <CardTitle>Ledger Entries</CardTitle>
              <CardDescription>
                Search by document/type/narration
              </CardDescription>
            </div>
            <Badge variant="outline" className="text-xs">
              {loading ? "Loading..." : `${filteredRows.length} rows`}
            </Badge>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search Doc No / Type / Narration"
                className="h-9 pl-8"
              />
            </div>
            <div className="flex items-center gap-2">
              <DatePicker
                value={startDate}
                onChange={setStartDate}
                placeholder="Start Date"
              />
              <span className="text-muted-foreground text-sm">to</span>
              <DatePicker
                value={endDate}
                onChange={setEndDate}
                placeholder="End Date"
              />
              {(startDate || endDate) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setStartDate("");
                    setEndDate("");
                  }}
                  className="h-9 text-xs"
                >
                  Reset Dates
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Doc No</TableHead>
                  <TableHead>Voucher No</TableHead>
                  <TableHead>Posting Date</TableHead>
                  <TableHead>Doc Date</TableHead>
                  <TableHead>Doc Type</TableHead>
                  <TableHead>Narration</TableHead>
                  <TableHead className="text-right">Debit</TableHead>
                  <TableHead className="text-right">Credit</TableHead>
                  <TableHead className="text-right">Net Amount</TableHead>
                  <TableHead className="text-right">FC Debit</TableHead>
                  <TableHead className="text-right">FC Credit</TableHead>
                  <TableHead className="text-right">Days Since Trans</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={12} className="text-center py-8 text-muted-foreground">
                      Loading ledger...
                    </TableCell>
                  </TableRow>
                ) : filteredRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={12}>
                      <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground">
                        <CheckCircle2 className="h-4 w-4" />
                        No ledger rows for this search
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRows.map((row, idx) => (
                    <TableRow key={`${row.VoucherNo}-${row.SourceDocNo}-${idx}`}>
                      <TableCell className="whitespace-nowrap font-medium">{row.SourceDocNo}</TableCell>
                      <TableCell>{row.VoucherNo}</TableCell>
                      <TableCell className="whitespace-nowrap">{fmtDate(row.PostingDate)}</TableCell>
                      <TableCell className="whitespace-nowrap">{fmtDate(row.DocumentDate)}</TableCell>
                      <TableCell>{row.DocType}</TableCell>
                      <TableCell className="max-w-[200px] truncate" title={row.Narration}>
                        {row.Narration}
                      </TableCell>
                      <TableCell className="text-right">₹ {fmtDecimal(row.Debit)}</TableCell>
                      <TableCell className="text-right">₹ {fmtDecimal(row.Credit)}</TableCell>
                      <TableCell
                        className={cn(
                          "text-right font-semibold",
                          row.NetAmount < 0
                            ? "text-red-600 dark:text-red-400"
                            : "text-green-600 dark:text-green-400"
                        )}
                      >
                        ₹ {fmtDecimal(row.NetAmount)}
                      </TableCell>
                      <TableCell className="text-right">{fmtDecimal(row.FCDebit)}</TableCell>
                      <TableCell className="text-right">{fmtDecimal(row.FCCredit)}</TableCell>
                      <TableCell className="text-right">
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-xs font-semibold tabular-nums min-w-[40px] justify-center",
                            txAgeBadgeClass(row.DaysSinceLastTrans)
                          )}
                        >
                          {row.DaysSinceLastTrans ?? "-"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
