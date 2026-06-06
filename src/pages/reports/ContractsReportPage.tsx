import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, Clock, FileText, PackageOpen, RefreshCw, Search } from "lucide-react";

import { getStockStatuses, type StockStatus } from "@/api/stockStatus";
import { getErrorMessage } from "@/lib/errors";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

const CONTRACT_EXPIRY_SOON_DAYS = 7;

interface ContractRow {
  id: number;
  itemCode: string;
  itemName: string;
  vendorCode: string;
  vendorName: string;
  quantity: string;
  rate: string;
  location?: string;
  contractEnd: string;
  daysRemaining: number | null;
  isExpired: boolean;
  isUrgent: boolean;
}

function dateOnly(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

function getDaysRemaining(dateText?: string | null) {
  if (!dateText) return null;
  const [year, month, day] = dateText.split("-").map(Number);
  if (!year || !month || !day) return null;

  const endDate = new Date(year, month - 1, day);
  const today = dateOnly(new Date());
  return Math.ceil((dateOnly(endDate).getTime() - today.getTime()) / 86_400_000);
}

function formatContractAging(daysRemaining: number) {
  if (daysRemaining < 0) return `Expired ${Math.abs(daysRemaining)} day${Math.abs(daysRemaining) === 1 ? "" : "s"} ago`;
  if (daysRemaining === 0) return "Expires today";
  if (daysRemaining === 1) return "Expires tomorrow";
  return `${daysRemaining} days remaining`;
}

function formatDateOnly(dateText: string) {
  const [year, month, day] = dateText.split("-").map(Number);
  if (!year || !month || !day) return dateText || "-";
  return new Date(year, month - 1, day).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function toContractRow(contract: StockStatus): ContractRow {
  const daysRemaining = getDaysRemaining(contract.contract_end);

  return {
    id: contract.id,
    itemCode: contract.item_code,
    itemName: contract.item_name || contract.item_code,
    vendorCode: contract.vendor_code,
    vendorName: contract.vendor_name || contract.vendor_code,
    quantity: contract.quantity,
    rate: contract.rate,
    location: contract.location,
    contractEnd: contract.contract_end || "",
    daysRemaining,
    isExpired: daysRemaining !== null && daysRemaining < 0,
    isUrgent: daysRemaining !== null && daysRemaining <= 2,
  };
}

function fmtMtsFromKg(value: string) {
  const qty = Number.parseFloat(value || "0");
  if (!Number.isFinite(qty)) return "0.000";
  return (qty / 1000).toLocaleString("en-IN", { minimumFractionDigits: 3, maximumFractionDigits: 3 });
}

export default function ContractsReportPage() {
  const [rows, setRows] = useState<ContractRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  async function fetchContracts() {
    setLoading(true);
    try {
      const data = await getStockStatuses({ status: "IN_CONTRACT" });
      const contractRows = data
        .map(toContractRow)
        .sort((a, b) => {
          if (a.daysRemaining === null && b.daysRemaining === null) return 0;
          if (a.daysRemaining === null) return 1;
          if (b.daysRemaining === null) return -1;
          return a.daysRemaining - b.daysRemaining;
        });

      setRows(contractRows);
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to load contract stock status"));
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchContracts();
  }, []);

  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((contract) =>
      [
        contract.itemCode,
        contract.itemName,
        contract.vendorCode,
        contract.vendorName,
        contract.location || "",
      ].some((value) => value.toLowerCase().includes(term))
    );
  }, [rows, search]);

  const expiredCount = rows.filter((row) => row.isExpired).length;
  const urgentCount = rows.filter((row) => !row.isExpired && row.isUrgent).length;
  const expiringSoonCount = rows.filter((row) => row.daysRemaining !== null && row.daysRemaining <= CONTRACT_EXPIRY_SOON_DAYS).length;
  const totalQty = rows.reduce((sum, row) => sum + (Number.parseFloat(row.quantity || "0") || 0), 0);

  return (
    <div className="p-2.5 sm:p-4 md:p-6 space-y-5 sm:space-y-6 animate-page">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight">Contracts</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            All in-contract stock status with contract aging
          </p>
        </div>
        <Button
          onClick={fetchContracts}
          variant="outline"
          className="btn-press h-8 sm:h-9 gap-1.5 sm:gap-2 px-2.5 sm:px-3 rounded-lg sm:rounded-xl border-2 text-[10px] sm:text-xs"
          disabled={loading}
        >
          <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        <Card className="border-none bg-red-50/70 dark:bg-red-950/20 shadow-sm">
          <CardContent className="p-3 sm:p-4 flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <p className="text-[10px] sm:text-xs uppercase tracking-wide text-red-600 dark:text-red-400">Expiring Soon</p>
              <AlertTriangle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-red-500" />
            </div>
            {loading ? <Skeleton className="h-8 w-12" /> : <h3 className="text-base sm:text-2xl font-bold">{expiringSoonCount}</h3>}
            <p className="text-[9px] sm:text-xs text-muted-foreground">within {CONTRACT_EXPIRY_SOON_DAYS} days</p>
          </CardContent>
        </Card>

        <Card className="border-none bg-rose-50/70 dark:bg-rose-950/20 shadow-sm">
          <CardContent className="p-3 sm:p-4 flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <p className="text-[10px] sm:text-xs uppercase tracking-wide text-rose-600 dark:text-rose-400">Expired</p>
              <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-rose-500" />
            </div>
            {loading ? <Skeleton className="h-8 w-12" /> : <h3 className="text-base sm:text-2xl font-bold">{expiredCount}</h3>}
            <p className="text-[9px] sm:text-xs text-muted-foreground">past contract end</p>
          </CardContent>
        </Card>

        <Card className="border-none bg-amber-50/70 dark:bg-amber-950/20 shadow-sm">
          <CardContent className="p-3 sm:p-4 flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <p className="text-[10px] sm:text-xs uppercase tracking-wide text-amber-600 dark:text-amber-400">Urgent</p>
              <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-amber-500" />
            </div>
            {loading ? <Skeleton className="h-8 w-12" /> : <h3 className="text-base sm:text-2xl font-bold">{urgentCount}</h3>}
            <p className="text-[9px] sm:text-xs text-muted-foreground">0 to 2 days left</p>
          </CardContent>
        </Card>

        <Card className="border-none bg-sky-50/70 dark:bg-sky-950/20 shadow-sm">
          <CardContent className="p-3 sm:p-4 flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <p className="text-[10px] sm:text-xs uppercase tracking-wide text-sky-600 dark:text-sky-400">Quantity</p>
              <FileText className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-sky-500" />
            </div>
            {loading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <h3 className="text-base sm:text-2xl font-bold tabular-nums">
                {(totalQty / 1000).toLocaleString("en-IN", { maximumFractionDigits: 3 })} <span className="text-[10px] sm:text-sm font-normal text-muted-foreground">MTS</span>
              </h3>
            )}
            <p className="text-[9px] sm:text-xs text-muted-foreground">total contract stock</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3 px-4 sm:px-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base sm:text-lg">Contract Stock Status</CardTitle>
              <CardDescription className="text-[10px] sm:text-xs">
                {loading ? "Loading..." : `${filteredRows.length} of ${rows.length} contracts shown`}
              </CardDescription>
            </div>
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search item, vendor, location..."
                className="pl-9 h-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-4 space-y-2">
              {Array.from({ length: 6 }).map((_, index) => (
                <Skeleton key={index} className="h-12 w-full rounded" />
              ))}
            </div>
          ) : filteredRows.length > 0 ? (
            <>
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full table-fixed text-sm">
                  <thead className="bg-muted/60 text-[11px] uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="w-[18%] px-3 py-3 text-left font-bold">Item</th>
                      <th className="w-[22%] px-3 py-3 text-left font-bold">Vendor</th>
                      <th className="w-[10%] px-3 py-3 text-left font-bold">Qty</th>
                      <th className="w-[9%] px-3 py-3 text-left font-bold">Rate</th>
                      <th className="w-[12%] px-3 py-3 text-left font-bold">Location</th>
                      <th className="w-[13%] px-3 py-3 text-left font-bold">Contract End</th>
                      <th className="w-[16%] px-3 py-3 text-left font-bold">Aging</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredRows.map((contract) => (
                      <tr key={contract.id} className="hover:bg-muted/30">
                        <td className="px-3 py-3">
                          <p className="font-semibold truncate">{contract.itemName}</p>
                          <p className="text-xs text-muted-foreground truncate">{contract.itemCode}</p>
                        </td>
                        <td className="px-3 py-3">
                          <p className="font-medium truncate">{contract.vendorName}</p>
                          <p className="text-xs text-muted-foreground truncate">{contract.vendorCode}</p>
                        </td>
                        <td className="px-3 py-3 font-medium whitespace-nowrap">{fmtMtsFromKg(contract.quantity)}</td>
                        <td className="px-3 py-3 font-medium whitespace-nowrap">{contract.rate}</td>
                        <td className="px-3 py-3 text-muted-foreground truncate">{contract.location || "-"}</td>
                        <td className="px-3 py-3 whitespace-nowrap">{formatDateOnly(contract.contractEnd)}</td>
                        <td className="px-3 py-3">
                          {contract.daysRemaining === null ? (
                            <span className="text-xs text-muted-foreground">-</span>
                          ) : (
                            <Badge
                              className={cn(
                                "rounded-full px-2.5 py-1 text-xs font-bold whitespace-nowrap",
                                contract.isExpired || contract.isUrgent
                                  ? "bg-red-100 text-red-700 hover:bg-red-100 dark:bg-red-900/40 dark:text-red-200"
                                  : "bg-amber-100 text-amber-700 hover:bg-amber-100 dark:bg-amber-900/40 dark:text-amber-200"
                              )}
                            >
                              {formatContractAging(contract.daysRemaining)}
                            </Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="md:hidden space-y-3 p-4">
                {filteredRows.map((contract) => (
                  <div
                    key={contract.id}
                    className={cn(
                      "rounded-xl border p-3",
                      contract.isExpired || contract.isUrgent
                        ? "bg-red-50/80 border-red-200 dark:bg-red-950/20 dark:border-red-900/40"
                        : "bg-amber-50/80 border-amber-200 dark:bg-amber-950/20 dark:border-amber-900/40"
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-bold truncate">{contract.itemName}</p>
                        <p className="text-xs text-muted-foreground">{contract.itemCode}</p>
                      </div>
                      <span
                        className={cn(
                          "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold",
                          contract.isExpired || contract.isUrgent
                            ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-200"
                            : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200"
                        )}
                      >
                        {contract.daysRemaining === null ? "-" : formatContractAging(contract.daysRemaining)}
                      </span>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                      <p><span className="text-muted-foreground">Vendor:</span> {contract.vendorName}</p>
                      <p><span className="text-muted-foreground">Qty:</span> {fmtMtsFromKg(contract.quantity)} MTS</p>
                      <p><span className="text-muted-foreground">Rate:</span> {contract.rate}</p>
                      <p><span className="text-muted-foreground">End:</span> {formatDateOnly(contract.contractEnd)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
              <PackageOpen className="h-10 w-10 stroke-1" />
              <div className="text-center">
                <p className="text-sm font-semibold text-foreground">No contracts found</p>
                <p className="text-xs mt-1">No in-contract stock status rows match this view.</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
