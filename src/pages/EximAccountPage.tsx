import { useState } from "react";
import { AxiosError } from "axios";
import { toast } from "sonner";
import { RefreshCw, Download, PackageOpen, Users, TrendingUp, TrendingDown, Scale } from "lucide-react";

import { syncBalanceSheet, type BalanceEntry } from "@/api/sapSync";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function fmtDecimal(n: number) {
  return n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

// Module-level cache — persists across navigation until explicitly re-synced
let cachedEntries: BalanceEntry[] = [];
let hasSynced = false;

export default function EximAccountPage() {
  const [entries, setEntries] = useState<BalanceEntry[]>(cachedEntries);
  const [synced, setSynced] = useState(hasSynced);
  const [syncing, setSyncing] = useState(false);

  async function handleSync() {
    setSyncing(true);
    try {
      const data = await syncBalanceSheet();
      const sorted = [...data].sort((a, b) => a.Balance - b.Balance);
      cachedEntries = sorted;
      hasSynced = true;
      setEntries(sorted);
      setSynced(true);
      toast.success(`Loaded ${sorted.length} outstanding entries`);
    } catch (err) {
      toast.error(err instanceof AxiosError ? (err.response?.data?.detail ?? err.message) : err instanceof Error ? err.message : "Failed to fetch balance sheet");
    } finally {
      setSyncing(false);
    }
  }

  function exportCSV() {
    const header = ["#", "Card Code", "Card Name", "Balance (₹)", "Last Trans. Date", "Last Trans. Amt (₹)"];
    const rows = entries.map((e, i) => [
      i + 1,
      e.CardCode,
      `"${e.CardName.replace(/"/g, '""')}"`,
      e.Balance,
      e["Last Transaction Date"] ? fmtDate(e["Last Transaction Date"]) : "",
      e["Last Transanction Amount"],
    ]);
    const csv = [header.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "dr_cr_outstanding.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  const totalReceivable = entries.filter((e) => e.Balance > 0).reduce((s, e) => s + e.Balance, 0);
  const totalPayable = entries.filter((e) => e.Balance < 0).reduce((s, e) => s + e.Balance, 0);
  const netBalance = entries.reduce((s, e) => s + e.Balance, 0);

  return (
    <div className="p-6 space-y-6 animate-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dr/Cr Outstanding</h1>
          <p className="text-sm text-muted-foreground">Dr/Cr outstanding balances from SAP</p>
        </div>
        <div className="flex items-center gap-2">
          <Button className="btn-press" onClick={handleSync} disabled={syncing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? "animate-spin" : ""}`} />
            {syncing ? "Syncing..." : "Sync Balance Sheet"}
          </Button>
          {synced && entries.length > 0 && (
            <Button variant="outline" className="btn-press gap-2" onClick={exportCSV}>
              <Download className="h-4 w-4" />
              Export Excel
            </Button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card className="card-hover">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Parties</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{entries.length}</p>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Receivable</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
              ₹ {fmtDecimal(totalReceivable)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {entries.filter((e) => e.Balance > 0).length} parties
            </p>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Payable</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-600 dark:text-red-400">
              ₹ {fmtDecimal(Math.abs(totalPayable))}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {entries.filter((e) => e.Balance < 0).length} parties
            </p>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Net Balance</CardTitle>
            <Scale className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${netBalance >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
              ₹ {fmtDecimal(netBalance)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Dr/Cr Outstanding Table */}
      <Card className="card-hover shimmer-hover">
        <CardHeader>
          <CardTitle>Dr/Cr Outstanding</CardTitle>
          <CardDescription>
            {synced
              ? `${entries.length} parties — click Sync Balance Sheet to refresh`
              : "Click \"Sync Balance Sheet\" to load outstanding balances from SAP"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Card Code</TableHead>
                  <TableHead>Card Name</TableHead>
                  <TableHead className="text-right">Balance (₹)</TableHead>
                  <TableHead className="text-right">Last Trans. Date</TableHead>
                  <TableHead className="text-right">Last Trans. Amt (₹)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6}>
                      <div className="flex flex-col items-center gap-2 text-muted-foreground py-12">
                        <PackageOpen className="h-10 w-10 stroke-1" />
                        <p className="text-sm font-medium">No data loaded</p>
                        <p className="text-xs">Sync the balance sheet from SAP to see outstanding entries.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  entries.map((entry, idx) => (
                    <TableRow key={entry.CardCode}>
                      <TableCell className="font-medium">{idx + 1}</TableCell>
                      <TableCell className="font-mono text-xs">{entry.CardCode}</TableCell>
                      <TableCell>{entry.CardName}</TableCell>
                      <TableCell className={`text-right font-semibold ${entry.Balance < 0 ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"}`}>
                        {entry.Balance < 0 ? "-" : ""}₹ {fmtDecimal(Math.abs(entry.Balance))}
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {fmtDate(entry["Last Transaction Date"])}
                      </TableCell>
                      <TableCell className="text-right">
                        ₹ {fmtDecimal(entry["Last Transanction Amount"])}
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
