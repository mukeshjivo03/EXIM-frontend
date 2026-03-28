import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Trash2, PackageOpen } from "lucide-react";

import { getFgItems, syncFgItems, syncSingleFgItem, deleteFgItem, type SapItem } from "@/api/sapSync";
import { getErrorMessage } from "@/lib/errors";
import { Pagination } from "@/components/Pagination";
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

export default function SyncFinishedGoodsDataPage() {
  const [items, setItems] = useState<SapItem[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Single item sync
  const [itemCode, setItemCode] = useState("");
  const [syncingOne, setSyncingOne] = useState(false);

  // Sync all
  const [syncingAll, setSyncingAll] = useState(false);

  // Pagination
  const [page, setPage] = useState(1);
  const perPage = 20;
  const totalPages = Math.max(1, Math.ceil(items.length / perPage));
  const paginatedItems = items.slice((page - 1) * perPage, page * perPage);

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<SapItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function fetchItems() {
    setLoading(true);
    setError("");
    try {
      const { count: c, items: data } = await getFgItems();
      setItems((data ?? []).sort((a, b) => a.item_code.localeCompare(b.item_code)));
      setCount(c);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load finished goods items"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchItems();

    function onItemsUpdated() {
      fetchItems();
    }
    window.addEventListener("fg-items-updated", onItemsUpdated);
    return () => window.removeEventListener("fg-items-updated", onItemsUpdated);
  }, []);

  async function handleSyncAll() {
    setSyncingAll(true);
    setError("");
    try {
      const data = await syncFgItems();
      setItems((data ?? []).sort((a, b) => a.item_code.localeCompare(b.item_code)));
      toast.success(`All finished goods synced. ${(data ?? []).length} items loaded.`);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to sync finished goods data"));
    } finally {
      setSyncingAll(false);
    }
  }

  async function handleSyncOne() {
    if (!itemCode.trim()) return;
    const code = itemCode.trim();
    if (items.some((item) => item.item_code === code)) {
      toast.info(`Item "${code}" is already synced.`);
      return;
    }
    setSyncingOne(true);
    setError("");
    try {
      await syncSingleFgItem(code);
      toast.success(`Item "${code}" synced successfully.`);
      setItemCode("");
      await fetchItems();
    } catch (err) {
      setError(getErrorMessage(err, "Failed to sync item"));
    } finally {
      setSyncingOne(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    const deletedName = deleteTarget.item_name;
    setDeleting(true);
    try {
      await deleteFgItem(deleteTarget.item_code);
      setItems((prev) => {
        const next = prev.filter((item) => item.id !== deleteTarget.id);
        const maxPage = Math.max(1, Math.ceil(next.length / perPage));
        setPage((p) => Math.min(p, maxPage));
        return next;
      });
      setCount((c) => c - 1);
      setDeleteTarget(null);
      toast.success(`Item "${deletedName}" deleted.`);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to delete item"));
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6 animate-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Sync Finished Goods Data</h1>
          <p className="text-sm text-muted-foreground">
            Sync finished goods data from SAP and manage items
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Input
            placeholder="Enter item code"
            value={itemCode}
            onChange={(e) => setItemCode(e.target.value)}
            className="w-48"
          />
          <Button className="btn-press" onClick={handleSyncOne} disabled={syncingOne || !itemCode.trim()}>
            {syncingOne ? "Syncing..." : "Sync"}
          </Button>
          <Button className="btn-press" variant="outline" onClick={handleSyncAll} disabled={syncingAll}>
            {syncingAll ? "Syncing All..." : "Sync All"}
          </Button>
        </div>
      </div>

      {/* Error */}
      {error && <p className="text-sm text-destructive">{error}</p>}

      {/* Table Card */}
      <Card className="card-hover shimmer-hover">
        <CardHeader>
          <CardTitle>Finished Goods Items</CardTitle>
          <CardDescription>{count} items synced from SAP</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">S.No</TableHead>
                    <TableHead>Item Code</TableHead>
                    <TableHead>Item Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Brand</TableHead>
                    <TableHead>Variety</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-6" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-12" /></TableCell>
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
                    <TableHead className="w-12">S.No</TableHead>
                    <TableHead>Item Code</TableHead>
                    <TableHead>Item Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Brand</TableHead>
                    <TableHead>Variety</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="py-16">
                        <div className="flex flex-col items-center gap-2 text-muted-foreground">
                          <PackageOpen className="h-10 w-10 stroke-1" />
                          <p className="text-sm font-medium">No items found</p>
                          <p className="text-xs">Sync finished goods data from SAP to see items here.</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedItems.map((item, i) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{(page - 1) * perPage + i + 1}</TableCell>
                        <TableCell>{item.item_code}</TableCell>
                        <TableCell>{item.item_name}</TableCell>
                        <TableCell>{item.category}</TableCell>
                        <TableCell>{item.u_brand}</TableCell>
                        <TableCell>{item.u_variety}</TableCell>
                        <TableCell>{item.u_unit}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => setDeleteTarget(item)}
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
          {!loading && (
            <Pagination page={page} totalPages={totalPages} totalItems={items.length} perPage={perPage} onPageChange={setPage} />
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Item</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{" "}
              <strong>{deleteTarget?.item_name}</strong>? This action cannot be
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
