import { useEffect, useState } from "react";
import { AxiosError } from "axios";
import { toast } from "sonner";
import { Trash2, ChevronLeft, ChevronRight, Users2 } from "lucide-react";

import { getVendors, syncVendor, deleteVendor, type Vendor } from "@/api/sapSync";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function SyncVendorDataPage() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Single vendor sync
  const [vendorCode, setVendorCode] = useState("");
  const [syncing, setSyncing] = useState(false);

  // Pagination
  const [page, setPage] = useState(1);
  const perPage = 20;
  const totalPages = Math.max(1, Math.ceil(vendors.length / perPage));
  const paginatedVendors = vendors.slice((page - 1) * perPage, page * perPage);

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<Vendor | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function fetchVendors() {
    setLoading(true);
    setError("");
    try {
      const { count: c, parties: data } = await getVendors();
      setVendors(data ?? []);
      setCount(c);
    } catch (err) {
      if (err instanceof AxiosError) {
        setError(err.response?.data?.detail ?? err.message);
      } else {
        setError("Failed to load vendors");
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchVendors();

    function onVendorsUpdated() {
      fetchVendors();
    }
    window.addEventListener("vendors-updated", onVendorsUpdated);
    return () => window.removeEventListener("vendors-updated", onVendorsUpdated);
  }, []);

  async function handleSync() {
    if (!vendorCode.trim()) return;
    const code = vendorCode.trim();
    if (vendors.some((v) => v.card_code === code)) {
      toast.info(`Vendor "${code}" is already synced.`);
      return;
    }
    setSyncing(true);
    setError("");
    try {
      await syncVendor(code);
      toast.success(`Vendor "${code}" synced successfully.`);
      setVendorCode("");
      await fetchVendors();
    } catch (err) {
      if (err instanceof AxiosError) {
        setError(err.response?.data?.detail ?? err.message);
      } else {
        setError("Failed to sync vendor");
      }
    } finally {
      setSyncing(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    const deletedName = deleteTarget.card_name;
    setDeleting(true);
    try {
      await deleteVendor(deleteTarget.card_code);
      setVendors((prev) => {
        const next = prev.filter((v) => v.id !== deleteTarget.id);
        const maxPage = Math.max(1, Math.ceil(next.length / perPage));
        setPage((p) => Math.min(p, maxPage));
        return next;
      });
      setCount((c) => c - 1);
      setDeleteTarget(null);
      toast.success(`Vendor "${deletedName}" deleted.`);
    } catch (err) {
      if (err instanceof AxiosError) {
        setError(err.response?.data?.detail ?? err.message);
      } else {
        setError("Failed to delete vendor");
      }
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="p-6 space-y-6 animate-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Sync Vendor Data</h1>
          <p className="text-sm text-muted-foreground">
            Sync vendor data from SAP and manage vendors
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Input
            placeholder="Enter vendor code"
            value={vendorCode}
            onChange={(e) => setVendorCode(e.target.value)}
            className="w-48"
          />
          <Button className="btn-press" onClick={handleSync} disabled={syncing || !vendorCode.trim()}>
            {syncing ? "Syncing..." : "Sync"}
          </Button>
        </div>
      </div>

      {/* Error */}
      {error && <p className="text-sm text-destructive">{error}</p>}

      {/* Table Card */}
      <Card className="card-hover shimmer-hover">
        <CardHeader>
          <CardTitle>Vendors</CardTitle>
          <CardDescription>{count} vendors synced from SAP</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Vendor Code</TableHead>
                    <TableHead>Vendor Name</TableHead>
                    <TableHead>State</TableHead>
                    <TableHead>Main Group</TableHead>
                    <TableHead>Country</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-6" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                      <TableCell className="text-right"><Skeleton className="h-4 w-8 ml-auto" /></TableCell>
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
                    <TableHead>Vendor Code</TableHead>
                    <TableHead>Vendor Name</TableHead>
                    <TableHead>State</TableHead>
                    <TableHead>Main Group</TableHead>
                    <TableHead>Country</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedVendors.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="py-16">
                        <div className="flex flex-col items-center gap-2 text-muted-foreground">
                          <Users2 className="h-10 w-10 stroke-1" />
                          <p className="text-sm font-medium">No vendors found</p>
                          <p className="text-xs">Sync vendor data from SAP to see vendors here.</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedVendors.map((vendor, i) => (
                      <TableRow key={vendor.id}>
                        <TableCell className="font-medium">{(page - 1) * perPage + i + 1}</TableCell>
                        <TableCell>{vendor.card_code}</TableCell>
                        <TableCell>{vendor.card_name}</TableCell>
                        <TableCell>{vendor.state}</TableCell>
                        <TableCell>{vendor.u_main_group}</TableCell>
                        <TableCell>{vendor.country}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => setDeleteTarget(vendor)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination */}
          {!loading && vendors.length > perPage && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Showing {(page - 1) * perPage + 1}–{Math.min(page * perPage, vendors.length)} of {vendors.length}
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

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Vendor</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{" "}
              <strong>{deleteTarget?.card_name}</strong>? This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
