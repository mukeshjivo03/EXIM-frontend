import { useEffect, useMemo, useState } from "react";
import {
  History as HistoryIcon,
  Search,
  RefreshCw,
  Calendar,
  User,
  Package,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

import { getContractualHistory, type ContractualHistoryEntry } from "@/api/stockStatus";
import { fmtDate, fmtDateTime, fmtDecimal } from "@/lib/formatters";
import { getErrorMessage } from "@/lib/errors";
import { cn } from "@/lib/utils";
import Guard from "@/components/Guard";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

export default function ContractualHistoryPage() {
  const [data, setData] = useState<ContractualHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  // Pagination
  const [page, setPage] = useState(1);
  const perPage = 15;

  const fetchData = async () => {
    setLoading(true);
    setError("");
    try {
      const history = await getContractualHistory();
      setData(history.sort((a, b) => b.id - a.id));
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load contractual history"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredData = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return data;
    return data.filter(
      (item) =>
        item.item_name.toLowerCase().includes(q) ||
        item.item_code.toLowerCase().includes(q) ||
        item.vendor_name.toLowerCase().includes(q) ||
        item.vendor_code.toLowerCase().includes(q) ||
        item.created_by.toLowerCase().includes(q)
    );
  }, [data, search]);

  const totalPages = Math.max(1, Math.ceil(filteredData.length / perPage));
  const paginatedData = filteredData.slice((page - 1) * perPage, page * perPage);

  return (
    <Guard
      resource="stockstatus"
      action="view"
      fallback={<div className="p-6 text-sm text-muted-foreground">You do not have permission to view contractual history.</div>}
    >
      <div className="p-2.5 sm:p-4 md:p-6 space-y-4 sm:space-y-6 animate-page">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight flex items-center gap-2">
              <HistoryIcon className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
              Contractual History
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">Historical record of contracts made</p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchData} disabled={loading} className="self-start sm:self-auto h-8 sm:h-9 gap-1.5 sm:gap-2 px-2.5 sm:px-3 rounded-lg sm:rounded-xl border-2 text-[10px] sm:text-xs">
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            Refresh
          </Button>
        </div>

        {/* Filters and Search */}
        <Card className="card-hover">
          <CardContent className="pt-4 sm:pt-6">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="relative flex-1 min-w-[220px] sm:min-w-[280px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by Item, Vendor or Creator..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  className="pl-9 h-8 sm:h-9 text-xs sm:text-sm"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Content */}
        <Card className="card-hover shimmer-hover">
          <CardHeader className="px-4 sm:px-6">
            <CardTitle className="text-base sm:text-lg">History Records</CardTitle>
            <CardDescription className="text-[10px] sm:text-xs">
              Showing {filteredData.length} total records
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error ? (
              <div className="py-12 text-center text-destructive flex flex-col items-center gap-2">
                <p>{error}</p>
                <Button variant="outline" onClick={fetchData}>Try Again</Button>
              </div>
            ) : loading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : (
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="w-[80px]">ID</TableHead>
                      <TableHead>Item Details</TableHead>
                      <TableHead>Vendor Details</TableHead>
                      <TableHead className="text-right">Rate (₹)</TableHead>
                      <TableHead>Contract Period</TableHead>
                      <TableHead>Creation Info</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedData.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                          No history records found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedData.map((item) => (
                        <TableRow key={item.id} className="group hover:bg-muted/30 transition-colors">
                          <TableCell className="font-medium text-muted-foreground">#{item.id}</TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-semibold text-foreground flex items-center gap-1.5">
                                <Package className="h-3.5 w-3.5 text-blue-500" />
                                {item.item_name}
                              </span>
                              <span className="text-xs text-muted-foreground font-mono">{item.item_code}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium flex items-center gap-1.5">
                                <User className="h-3.5 w-3.5 text-amber-500" />
                                {item.vendor_name}
                              </span>
                              <span className="text-xs text-muted-foreground font-mono">{item.vendor_code}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <span className="font-bold tabular-nums text-green-600 dark:text-green-400">
                              ₹{fmtDecimal(item.rate)}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-2 text-xs">
                                <Badge variant="secondary" className="px-1.5 py-0 font-normal">Start</Badge>
                                <span className="font-medium">{fmtDate(item.contract_start)}</span>
                              </div>
                              <div className="flex items-center gap-2 text-xs">
                                <Badge variant="secondary" className="px-1.5 py-0 font-normal">End</Badge>
                                <span className="font-medium">{fmtDate(item.contract_end)}</span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {fmtDateTime(item.created_at)}
                              </span>
                              <span className="flex items-center gap-1">
                                <User className="h-3 w-3" />
                                {item.created_by}
                              </span>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Pagination Controls */}
            {!loading && totalPages > 1 && (
              <div className="flex items-center justify-between pt-4">
                <p className="text-[10px] sm:text-xs text-muted-foreground">
                  Showing {paginatedData.length} of {filteredData.length} records
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-[10px] sm:text-xs font-medium">
                    Page {page} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Guard>
  );
}
