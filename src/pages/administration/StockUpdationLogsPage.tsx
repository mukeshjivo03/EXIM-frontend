import { useEffect, useMemo, useState } from "react";
import { History } from "lucide-react";

import { getStockLogs, type StockLog } from "@/api/stockStatus";
import { fmtDateTime } from "@/lib/formatters";
import { getErrorMessage } from "@/lib/errors";
import { Pagination } from "@/components/Pagination";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface GroupedLog {
  stock_id: number;
  updated_by: string;
  updated_at: string;
  changes: { field_name: string; old_value: string; new_value: string }[];
}

/** Group logs that share the same stock_id, updated_by, and are within 2 seconds of each other */
function groupLogs(logs: StockLog[]): GroupedLog[] {
  const sorted = [...logs].sort(
    (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  );

  const groups: GroupedLog[] = [];

  for (const log of sorted) {
    const ts = new Date(log.updated_at).getTime();
    const existing = groups.find(
      (g) =>
        g.stock_id === log.stock_id &&
        g.updated_by === log.updated_by &&
        Math.abs(new Date(g.updated_at).getTime() - ts) < 2000
    );

    if (existing) {
      existing.changes.push({
        field_name: log.field_name,
        old_value: log.old_value,
        new_value: log.new_value,
      });
    } else {
      groups.push({
        stock_id: log.stock_id,
        updated_by: log.updated_by,
        updated_at: log.updated_at,
        changes: [
          {
            field_name: log.field_name,
            old_value: log.old_value,
            new_value: log.new_value,
          },
        ],
      });
    }
  }

  return groups;
}

function formatFieldName(name: string): string {
  return name
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatValue(field: string, value: string): string {
  if (field === "status") {
    return value.replace(/_/g, " ");
  }
  return value;
}

export default function StockUpdationLogsPage() {
  const [logs, setLogs] = useState<StockLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Pagination
  const [page, setPage] = useState(1);
  const perPage = 20;

  const grouped = useMemo(() => groupLogs(logs), [logs]);
  const totalPages = Math.max(1, Math.ceil(grouped.length / perPage));
  const paginatedGroups = grouped.slice((page - 1) * perPage, page * perPage);

  async function fetchLogs() {
    setLoading(true);
    setError("");
    try {
      const data = await getStockLogs();
      setLogs(data);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load stock updation logs"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchLogs();
  }, []);

  return (
    <div className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6 animate-page">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold">Stock Updation Logs</h1>
        <p className="text-sm text-muted-foreground">
          View history of stock record changes
        </p>
      </div>

      {/* Error */}
      {error && <p className="text-sm text-destructive">{error}</p>}

      {/* Table Card */}
      <Card className="card-hover shimmer-hover">
        <CardHeader>
          <CardTitle>Change History</CardTitle>
          <CardDescription>
            {grouped.length} update{grouped.length !== 1 ? "s" : ""} recorded
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Stock ID</TableHead>
                    <TableHead>Updated By</TableHead>
                    <TableHead>Updated At</TableHead>
                    <TableHead>Changes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-6" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Stock ID</TableHead>
                    <TableHead>Updated By</TableHead>
                    <TableHead>Updated At</TableHead>
                    <TableHead>Changes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedGroups.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="py-16">
                        <div className="flex flex-col items-center gap-2 text-muted-foreground">
                          <History className="h-10 w-10 stroke-1" />
                          <p className="text-sm font-medium">No stock updation logs found</p>
                          <p className="text-xs">Changes to stock records will appear here.</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedGroups.map((group, i) => (
                      <TableRow key={`${group.stock_id}-${group.updated_at}`}>
                        <TableCell className="font-medium">
                          {(page - 1) * perPage + i + 1}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{group.stock_id}</Badge>
                        </TableCell>
                        <TableCell>{group.updated_by}</TableCell>
                        <TableCell>{fmtDateTime(group.updated_at)}</TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1.5">
                            {group.changes.map((change, j) => (
                              <div key={j} className="flex items-center gap-2 text-sm">
                                <Badge variant="secondary" className="text-xs font-normal">
                                  {formatFieldName(change.field_name)}
                                </Badge>
                                <span className="text-muted-foreground line-through">
                                  {formatValue(change.field_name, change.old_value)}
                                </span>
                                <span className="text-muted-foreground">&rarr;</span>
                                <span className="font-medium">
                                  {formatValue(change.field_name, change.new_value)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination */}
          {!loading && (
            <Pagination
              page={page}
              totalPages={totalPages}
              totalItems={grouped.length}
              perPage={perPage}
              onPageChange={setPage}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
