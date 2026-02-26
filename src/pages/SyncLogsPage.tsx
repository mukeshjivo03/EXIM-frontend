import { useEffect, useState } from "react";
import { AxiosError } from "axios";
import { FileText, ChevronLeft, ChevronRight } from "lucide-react";

import { getSyncLogs, type SyncLog } from "@/api/sapSync";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const SYNC_TYPE_LABELS: Record<string, string> = {
  PRT: "Party",
  ITM: "Item",
};

const STATUS_LABELS: Record<string, string> = {
  FLD: "Failed",
  SUC: "Success",
  RUN: "Running",
};

const STATUS_VARIANT: Record<string, "destructive" | "default" | "secondary" | "outline"> = {
  FLD: "destructive",
  SUC: "default",
  RUN: "secondary",
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleString();
}

export default function SyncLogsPage() {
  const [logs, setLogs] = useState<SyncLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedError, setSelectedError] = useState<string | null>(null);

  // Pagination
  const [page, setPage] = useState(1);
  const perPage = 20;
  const totalPages = Math.max(1, Math.ceil(logs.length / perPage));
  const paginatedLogs = logs.slice((page - 1) * perPage, page * perPage);

  async function fetchLogs() {
    setLoading(true);
    setError("");
    try {
      const data = await getSyncLogs();
      setLogs(data ?? []);
    } catch (err) {
      if (err instanceof AxiosError) {
        setError(err.response?.data?.detail ?? err.message);
      } else {
        setError("Failed to load sync logs");
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchLogs();
  }, []);

  return (
    <div className="p-6 space-y-6 animate-page">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Sync Logs</h1>
        <p className="text-sm text-muted-foreground">
          View sync operation history
        </p>
      </div>

      {/* Error */}
      {error && <p className="text-sm text-destructive">{error}</p>}

      {/* Table Card */}
      <Card className="card-hover shimmer-hover">
        <CardHeader>
          <CardTitle>Sync History</CardTitle>
          <CardDescription>{logs.length} sync operations recorded</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Sync Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Triggered By</TableHead>
                    <TableHead>Started At</TableHead>
                    <TableHead>Completed At</TableHead>
                    <TableHead className="text-right">Processed</TableHead>
                    <TableHead className="text-right">Created</TableHead>
                    <TableHead className="text-right">Updated</TableHead>
                    <TableHead>Error</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-6" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-14" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                      <TableCell className="text-right"><Skeleton className="h-4 w-8 ml-auto" /></TableCell>
                      <TableCell className="text-right"><Skeleton className="h-4 w-8 ml-auto" /></TableCell>
                      <TableCell className="text-right"><Skeleton className="h-4 w-8 ml-auto" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
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
                    <TableHead>Sync Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Triggered By</TableHead>
                    <TableHead>Started At</TableHead>
                    <TableHead>Completed At</TableHead>
                    <TableHead className="text-right">Processed</TableHead>
                    <TableHead className="text-right">Created</TableHead>
                    <TableHead className="text-right">Updated</TableHead>
                    <TableHead>Error</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedLogs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="py-16">
                        <div className="flex flex-col items-center gap-2 text-muted-foreground">
                          <FileText className="h-10 w-10 stroke-1" />
                          <p className="text-sm font-medium">No sync logs found</p>
                          <p className="text-xs">Sync operations will appear here once triggered.</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedLogs.map((log, i) => (
                      <TableRow key={log.id}>
                        <TableCell className="font-medium">{(page - 1) * perPage + i + 1}</TableCell>
                        <TableCell>{SYNC_TYPE_LABELS[log.sync_type] ?? log.sync_type}</TableCell>
                        <TableCell>
                          <Badge variant={STATUS_VARIANT[log.status] ?? "outline"}>
                            {STATUS_LABELS[log.status] ?? log.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{log.triggered_by}</TableCell>
                        <TableCell>{formatDate(log.started_at)}</TableCell>
                        <TableCell>{formatDate(log.completed_at)}</TableCell>
                        <TableCell className="text-right">{log.records_procesed}</TableCell>
                        <TableCell className="text-right">{log.records_created}</TableCell>
                        <TableCell className="text-right">{log.records_updated}</TableCell>
                        <TableCell className="max-w-xs text-xs text-muted-foreground">
                          {log.error_message ? (
                            <button
                              className="truncate block max-w-xs text-left hover:text-foreground transition-colors cursor-pointer"
                              onClick={() => setSelectedError(log.error_message)}
                            >
                              {log.error_message}
                            </button>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination */}
          {!loading && logs.length > perPage && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Showing {(page - 1) * perPage + 1}–{Math.min(page * perPage, logs.length)} of {logs.length}
              </p>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setPage((p) => p - 1)}
                  disabled={page === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                {(() => {
                  const pages: (number | "...")[] = [];
                  const start = Math.max(2, page - 2);
                  const end = Math.min(totalPages - 1, page + 2);
                  pages.push(1);
                  if (start > 2) pages.push("...");
                  for (let i = start; i <= end; i++) pages.push(i);
                  if (end < totalPages - 1) pages.push("...");
                  if (totalPages > 1) pages.push(totalPages);
                  return pages.map((p, idx) =>
                    p === "..." ? (
                      <span key={`dots-${idx}`} className="px-1 text-sm text-muted-foreground">...</span>
                    ) : (
                      <Button
                        key={p}
                        variant={p === page ? "default" : "outline"}
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setPage(p)}
                      >
                        {p}
                      </Button>
                    )
                  );
                })()}
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Error Detail Dialog */}
      <Dialog open={!!selectedError} onOpenChange={() => setSelectedError(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Error Details</DialogTitle>
            <DialogDescription>Full error message from the sync operation.</DialogDescription>
          </DialogHeader>
          <pre className="whitespace-pre-wrap break-words text-sm bg-muted p-4 rounded-md max-h-80 overflow-y-auto">
            {selectedError}
          </pre>
        </DialogContent>
      </Dialog>
    </div>
  );
}
