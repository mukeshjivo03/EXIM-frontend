import { useEffect, useState } from "react";
import { Container, Eye } from "lucide-react";

import { getErrorMessage } from "@/lib/errors";
import { Pagination } from "@/components/Pagination";
import { getTankLogs, type TankLog } from "@/api/tank";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function TankLogsPage() {
  const [logs, setLogs] = useState<TankLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // View dialog
  const [viewTarget, setViewTarget] = useState<TankLog | null>(null);

  // Pagination
  const [page, setPage] = useState(1);
  const perPage = 20;
  const totalPages = Math.max(1, Math.ceil(logs.length / perPage));
  const paginatedLogs = logs.slice((page - 1) * perPage, page * perPage);

  async function fetchLogs() {
    setLoading(true);
    setError("");
    try {
      const data = await getTankLogs();
      setLogs(data.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load tank logs"));
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
        <h1 className="text-xl sm:text-2xl font-bold">Tank Logs</h1>
        <p className="text-sm text-muted-foreground">
          Inward and outward tank operation logs
        </p>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {/* Table Card */}
      <Card className="card-hover shimmer-hover">
        <CardHeader>
          <CardTitle>Logs</CardTitle>
          <CardDescription>{logs.length} log entries</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tank Code</TableHead>
                    <TableHead>Log Type</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Created At</TableHead>
                    <TableHead>Created By</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
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
                    <TableHead>Tank Code</TableHead>
                    <TableHead>Log Type</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Created At</TableHead>
                    <TableHead>Created By</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedLogs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-16">
                        <div className="flex flex-col items-center gap-2 text-muted-foreground">
                          <Container className="h-10 w-10 stroke-1" />
                          <p className="text-sm font-medium">No tank logs found</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="font-medium">{log.tank_code}</TableCell>
                        <TableCell>
                          <Badge variant={log.log_type === "INWARD" ? "default" : "secondary"}>
                            {log.log_type === "INWARD" ? "IN" : "OUT"}
                          </Badge>
                        </TableCell>
                        <TableCell>{Number(log.quantity).toLocaleString("en-IN")} L</TableCell>
                        <TableCell>{formatDate(log.created_at)}</TableCell>
                        <TableCell>{log.created_by}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setViewTarget(log)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}

          {!loading && (
            <Pagination
              page={page}
              totalPages={totalPages}
              totalItems={logs.length}
              perPage={perPage}
              onPageChange={setPage}
            />
          )}
        </CardContent>
      </Card>

      {/* View Dialog */}
      <Dialog open={!!viewTarget} onOpenChange={() => setViewTarget(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Container className="h-5 w-5" />
              Tank Log Details
            </DialogTitle>
            <DialogDescription>
              Log #{viewTarget?.id}
            </DialogDescription>
          </DialogHeader>

          {viewTarget && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">Tank Code</p>
                  <p className="text-sm font-medium">{viewTarget.tank_code}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Log Type</p>
                  <Badge variant={viewTarget.log_type === "INWARD" ? "default" : "secondary"}>
                    {viewTarget.log_type === "INWARD" ? "IN" : "OUT"}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Quantity</p>
                  <p className="text-sm font-medium">{Number(viewTarget.quantity).toLocaleString("en-IN")} L</p>
                </div>
                {viewTarget.log_type === "INWARD" && (
                <div>
                  <p className="text-xs text-muted-foreground">Tank Layer ID</p>
                  <p className="text-sm font-medium">{viewTarget.tank_layer_id ?? "—"}</p>
                </div>
                )}
                <div>
                  <p className="text-xs text-muted-foreground">Created At</p>
                  <p className="text-sm font-medium">{formatDate(viewTarget.created_at)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Created By</p>
                  <p className="text-sm font-medium">{viewTarget.created_by}</p>
                </div>
                {viewTarget.remarks && (
                <div>
                  <p className="text-xs text-muted-foreground">Remarks</p>
                  <p className="text-sm font-medium">{viewTarget.remarks}</p>
                </div>
                )}
              </div>

              <Separator />

              {/* Consumptions (only for OUTWARD) */}
              {viewTarget.log_type === "OUTWARD" && <div>
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                  Consumptions ({viewTarget.consumptions.length})
                </h3>
                {viewTarget.consumptions.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No consumptions</p>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Layer ID</TableHead>
                          <TableHead>Qty Consumed</TableHead>
                          <TableHead>Rate</TableHead>
                          <TableHead>Total Value</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {viewTarget.consumptions.map((c) => {
                          const qty = Number(c.quantity_consumed);
                          const rate = Number(c.rate);
                          return (
                            <TableRow key={c.id}>
                              <TableCell>{c.layer_id}</TableCell>
                              <TableCell>{qty.toLocaleString("en-IN")} L</TableCell>
                              <TableCell>&#8377; {rate.toLocaleString("en-IN")}</TableCell>
                              <TableCell>&#8377; {(qty * rate).toLocaleString("en-IN")}</TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setViewTarget(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
