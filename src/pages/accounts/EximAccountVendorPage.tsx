import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, CheckCircle2, Filter, Search } from "lucide-react";

import {
  getReconciliation,
  syncBalanceSheet,
  type BalanceEntry,
  type ReconciliationEntry,
} from "@/api/sapSync";
import { fmtDate, fmtDecimal } from "@/lib/formatters";
import { getErrorMessage } from "@/lib/errors";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

type ReconBucket = "ALL" | "0_30" | "31_60" | "61_90" | "90_PLUS";

type LocationState = {
  entry?: BalanceEntry;
};

export default function EximAccountVendorPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { vendorCode: vendorCodeParam = "" } = useParams();
  const vendorCode = useMemo(() => {
    try {
      return decodeURIComponent(vendorCodeParam);
    } catch {
      return vendorCodeParam;
    }
  }, [vendorCodeParam]);
  const locationState = location.state as LocationState | null;

  const [vendorEntry, setVendorEntry] = useState<BalanceEntry | null>(
    locationState?.entry ?? null
  );
  const [reconciliationRows, setReconciliationRows] = useState<ReconciliationEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [bucket, setBucket] = useState<ReconBucket>("ALL");
  const [search, setSearch] = useState("");

  const bucketLabelMap: Record<Exclude<ReconBucket, "ALL">, string> = {
    "0_30": "0-30 Days",
    "31_60": "31-60 Days",
    "61_90": "61-90 Days",
    "90_PLUS": "90+ Days",
  };

  function getDaysOverdue(row: ReconciliationEntry): number | null {
    const raw = row["Days Overdue"];
    const normalized = typeof raw === "number" ? raw : Number(String(raw).trim());
    if (Number.isFinite(normalized)) return normalized;

    if (!row["Due Date"]) return null;
    const due = new Date(row["Due Date"]);
    const diff = Math.floor((Date.now() - due.getTime()) / (1000 * 60 * 60 * 24));
    return Number.isFinite(diff) ? diff : null;
  }

  useEffect(() => {
    async function loadData() {
      if (!vendorCode) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const [recon, balances] = await Promise.all([
          getReconciliation(vendorCode),
          vendorEntry ? Promise.resolve<BalanceEntry[] | null>(null) : syncBalanceSheet(),
        ]);

        if (!vendorEntry && balances) {
          const match = balances.find((e) => e.CardCode === vendorCode) ?? null;
          setVendorEntry(match);
        }

        setReconciliationRows(recon);
      } catch (err) {
        toast.error(getErrorMessage(err, `Failed to load reconciliation for ${vendorCode}`));
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [vendorCode, vendorEntry]);

  const daysOutstanding = useMemo(() => {
    if (!vendorEntry?.["Last Transaction Date"]) return null;
    const d = new Date(vendorEntry["Last Transaction Date"]);
    return Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
  }, [vendorEntry]);

  const filteredRows = useMemo(() => {
    const bucketFiltered = bucket === "ALL"
      ? reconciliationRows
      : reconciliationRows.filter((r) => String(r["Aging Bucket"] ?? "").trim() === bucketLabelMap[bucket]);

    const q = search.trim().toLowerCase();
    if (!q) return bucketFiltered;

    return bucketFiltered.filter(
      (r) =>
        String(r["Doc No"] ?? "").toLowerCase().includes(q) ||
        String(r["Doc Type"] ?? "").toLowerCase().includes(q) ||
        String(r["Aging Bucket"] ?? "").toLowerCase().includes(q)
    );
  }, [bucket, reconciliationRows, search]);

  const bucketCounts = useMemo(() => {
    return {
      ALL: reconciliationRows.length,
      "0_30": reconciliationRows.filter((r) => String(r["Aging Bucket"] ?? "").trim() === "0-30 Days").length,
      "31_60": reconciliationRows.filter((r) => String(r["Aging Bucket"] ?? "").trim() === "31-60 Days").length,
      "61_90": reconciliationRows.filter((r) => String(r["Aging Bucket"] ?? "").trim() === "61-90 Days").length,
      "90_PLUS": reconciliationRows.filter((r) => String(r["Aging Bucket"] ?? "").trim() === "90+ Days").length,
    } satisfies Record<ReconBucket, number>;
  }, [reconciliationRows]);

  return (
    <div className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6 animate-page">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Internal Reconciliation</h1>
          <p className="text-sm text-muted-foreground">
            Vendor code: {vendorCode}
          </p>
        </div>
        <Button variant="outline" className="btn-press" onClick={() => navigate("/exim-account")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dr/Cr Outstanding
        </Button>
      </div>

      <Card className="card-hover">
        <CardHeader>
          <CardTitle>Vendor Summary</CardTitle>
          <CardDescription>
            Vendor details and latest transaction summary
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-sm">
            <div className="rounded-md border p-3">
              <p className="text-muted-foreground">Vendor Code</p>
              <p className="font-semibold">{vendorEntry?.CardCode ?? vendorCode}</p>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-muted-foreground">Vendor Name</p>
              <p className="font-semibold">{vendorEntry?.CardName ?? "—"}</p>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-muted-foreground">Outstanding Balance</p>
              <p
                className={cn(
                  "font-semibold",
                  (vendorEntry?.Balance ?? 0) < 0
                    ? "text-red-600 dark:text-red-400"
                    : "text-green-600 dark:text-green-400"
                )}
              >
                {vendorEntry ? `₹ ${fmtDecimal(vendorEntry.Balance)}` : "—"}
              </p>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-muted-foreground">Last Trans. Date</p>
              <p className="font-semibold">
                {vendorEntry ? fmtDate(vendorEntry["Last Transaction Date"]) : "—"}
              </p>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-muted-foreground">Last Trans. Amt (₹) · Days Outstanding</p>
              <p className="font-semibold">
                {vendorEntry ? `₹ ${fmtDecimal(vendorEntry["Last Transanction Amount"])}` : "—"}
                {" · "}
                {daysOutstanding !== null ? `${daysOutstanding}d` : "—"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="card-hover shimmer-hover">
        <CardHeader>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <CardTitle>Reconciliation Entries</CardTitle>
              <CardDescription>
                Filter by overdue bucket and search by document/type
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
                placeholder="Search Doc No / Type / Bucket"
                className="h-9 pl-8"
              />
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="secondary" className="gap-1.5">
              <Filter className="h-3.5 w-3.5" />
              Aging Bucket
            </Badge>
            <Button size="sm" variant={bucket === "ALL" ? "default" : "outline"} onClick={() => setBucket("ALL")}>
              All ({bucketCounts.ALL})
            </Button>
            <Button size="sm" variant={bucket === "0_30" ? "default" : "outline"} onClick={() => setBucket("0_30")}>
              0-30 days ({bucketCounts["0_30"]})
            </Button>
            <Button size="sm" variant={bucket === "31_60" ? "default" : "outline"} onClick={() => setBucket("31_60")}>
              31-60 days ({bucketCounts["31_60"]})
            </Button>
            <Button size="sm" variant={bucket === "61_90" ? "default" : "outline"} onClick={() => setBucket("61_90")}>
              61-90 days ({bucketCounts["61_90"]})
            </Button>
            <Button size="sm" variant={bucket === "90_PLUS" ? "default" : "outline"} onClick={() => setBucket("90_PLUS")}>
              90+ days ({bucketCounts["90_PLUS"]})
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Doc No</TableHead>
                  <TableHead>Posting Date</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Doc Type</TableHead>
                  <TableHead className="text-right">Debit</TableHead>
                  <TableHead className="text-right">Credit</TableHead>
                  <TableHead className="text-right">Outstanding</TableHead>
                  <TableHead className="text-right">Days Overdue</TableHead>
                  <TableHead>Aging Bucket</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      Loading reconciliation...
                    </TableCell>
                  </TableRow>
                ) : filteredRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9}>
                      <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground">
                        <CheckCircle2 className="h-4 w-4" />
                        No reconciliation rows for this filter
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRows.map((row, idx) => (
                    <TableRow key={`${row["Doc No"]}-${row["Due Date"]}-${row["Doc Type"]}-${row.Debit}-${row.Credit}-${row.OutstandingAmount}-${idx}`}>
                      <TableCell>{row["Doc No"]}</TableCell>
                      <TableCell>{fmtDate(row["Posting Date"])}</TableCell>
                      <TableCell>{fmtDate(row["Due Date"])}</TableCell>
                      <TableCell>{row["Doc Type"]}</TableCell>
                      <TableCell className="text-right">₹ {fmtDecimal(row.Debit)}</TableCell>
                      <TableCell className="text-right">₹ {fmtDecimal(row.Credit)}</TableCell>
                      <TableCell
                        className={cn(
                          "text-right font-semibold",
                          row.OutstandingAmount < 0
                            ? "text-red-600 dark:text-red-400"
                            : "text-green-600 dark:text-green-400"
                        )}
                      >
                        ₹ {fmtDecimal(row.OutstandingAmount)}
                      </TableCell>
                      <TableCell className="text-right">{getDaysOverdue(row) ?? "—"}</TableCell>
                      <TableCell>{row["Aging Bucket"]}</TableCell>
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
