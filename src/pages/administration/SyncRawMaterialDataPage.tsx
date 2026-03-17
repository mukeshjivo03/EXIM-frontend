import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Trash2, PackageOpen, Filter, X, Hash, IndianRupee, Scale, TrendingUp } from "lucide-react";

import { getRmItems, getRmVarieties, getRmSummary, syncRmItems, syncSingleRmItem, deleteRmItem, type SapItem, type RmSummary } from "@/api/sapSync";
import { getErrorMessage } from "@/lib/errors";
import { fmtDecimal } from "@/lib/formatters";
import { SummaryCard } from "@/components/SummaryCard";
import { Pagination } from "@/components/Pagination";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

export default function SyncRawMaterialDataPage() {
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

  // Filter
  const [varieties, setVarieties] = useState<string[]>([]);
  const [fVarieties, setFVarieties] = useState<string[]>([]);

  // Summary
  const [summary, setSummary] = useState<RmSummary | null>(null);

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<SapItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function fetchItems(selectedVarieties?: string[]) {
    setLoading(true);
    setError("");
    try {
      const { count: c, items: data } = await getRmItems(selectedVarieties?.length ? selectedVarieties : undefined);
      setItems((data ?? []).sort((a, b) => a.item_code.localeCompare(b.item_code)));
      setCount(c);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load raw material items"));
    } finally {
      setLoading(false);
    }
  }

  async function fetchSummary(selectedVarieties?: string[]) {
    try {
      const data = await getRmSummary(selectedVarieties?.length ? selectedVarieties : undefined);
      setSummary(data);
    } catch {
      // non-critical
    }
  }

  async function loadVarieties() {
    try {
      const data = await getRmVarieties();
      setVarieties(data);
    } catch {
      // non-critical
    }
  }

  useEffect(() => {
    fetchItems();
    fetchSummary();
    loadVarieties();

    function onItemsUpdated() {
      fetchItems(fVarieties.length ? fVarieties : undefined);
      fetchSummary(fVarieties.length ? fVarieties : undefined);
    }
    window.addEventListener("rm-items-updated", onItemsUpdated);
    return () => window.removeEventListener("rm-items-updated", onItemsUpdated);
  }, []);

  // async function handleSyncAll() {
  //   setSyncingAll(true);
  //   setError("");
  //   try {
  //     const data = await syncRmItems();
  //     setItems((data ?? []).sort((a, b) => a.item_code.localeCompare(b.item_code)));
  //     toast.success(`All raw materials synced. ${(data ?? []).length} items loaded.`);
  //     fetchSummary(fVarieties.length ? fVarieties : undefined);
  //   } catch (err) {
  //     setError(getErrorMessage(err, "Failed to sync raw material data"));
  //   } finally {
  //     setSyncingAll(false);
  //   }
  // }
async function handleSyncAll() {
  setSyncingAll(true);
  setError("");
  try {
    const data = await syncRmItems();
    toast.success(`All raw materials synced. ${(data ?? []).length} items processed.`);
    
    // 1. Refetch the data using your standard GET API
    await fetchItems(fVarieties.length ? fVarieties : undefined); 
    // 2. Refetch the summary
    await fetchSummary(fVarieties.length ? fVarieties : undefined);
    
  } catch (err) {
    setError(getErrorMessage(err, "Failed to sync raw material data"));
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
      await syncSingleRmItem(code);
      toast.success(`Item "${code}" synced successfully.`);
      setItemCode("");
      await fetchItems();
      fetchSummary(fVarieties.length ? fVarieties : undefined);
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
      await deleteRmItem(deleteTarget.item_code);
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
          <h1 className="text-xl sm:text-2xl font-bold">Sync Raw Material Data</h1>
          <p className="text-sm text-muted-foreground">
            Sync raw material data from SAP and manage items
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

      {/* Filters */}
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          Filters
        </h2>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-end gap-4 flex-wrap">
              <div className="space-y-1.5 min-w-[180px] flex-1">
                <Label className="text-xs text-muted-foreground flex items-center gap-1">
                  <Filter className="h-3 w-3" /> Variety
                </Label>
                <Select value="__pick__" onValueChange={(v) => {
                  if (v === "__pick__") return;
                  const next = fVarieties.includes(v)
                    ? fVarieties.filter((x) => x !== v)
                    : [...fVarieties, v];
                  setFVarieties(next);
                  setPage(1);
                  fetchItems(next.length ? next : undefined);
                  fetchSummary(next.length ? next : undefined);
                }}>
                  <SelectTrigger>
                    <SelectValue>
                      {fVarieties.length === 0
                        ? "All Varieties"
                        : `${fVarieties.length} selected`}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__pick__" disabled>Select varieties</SelectItem>
                    {varieties.map((v) => (
                      <SelectItem key={v} value={v}>
                        {fVarieties.includes(v) ? `✓ ${v}` : v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {fVarieties.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {fVarieties.map((v) => (
                      <Badge key={v} variant="secondary" className="text-xs gap-1 cursor-pointer" onClick={() => {
                        const next = fVarieties.filter((x) => x !== v);
                        setFVarieties(next);
                        setPage(1);
                        fetchItems(next.length ? next : undefined);
                        fetchSummary(next.length ? next : undefined);
                      }}>
                        {v}
                        <X className="h-3 w-3" />
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
              <div>
                {fVarieties.length > 0 && (
                  <Button variant="ghost" size="sm" className="gap-1" onClick={() => {
                    setFVarieties([]);
                    setPage(1);
                    fetchItems();
                    fetchSummary();
                  }}>
                    <X className="h-4 w-4" />
                    Clear
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Summary Cards */}
      <div>
        <h2 className="text-base font-semibold uppercase tracking-wider text-muted-foreground mb-4">
          Summary
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <SummaryCard icon={Hash} label="Total Count" value={summary?.total_count ?? 0} loading={!summary} />
          <SummaryCard icon={Scale} label="Total Quantity (LTR)" value={summary ? fmtDecimal(summary.total_qty) : ""} loading={!summary} />
          <SummaryCard icon={TrendingUp} label="Avg Rate / LTR" value={summary ? `₹ ${fmtDecimal(summary.avg_rate)}` : ""} loading={!summary} />
          <SummaryCard icon={IndianRupee} label="Total Trans Value" value={summary ? `₹ ${fmtDecimal(summary.total_trans_value)}` : ""} loading={!summary} />
        </div>
      </div>

      {/* Table Card */}
      <Card className="card-hover shimmer-hover">
        <CardHeader>
          <CardTitle>Raw Material Items</CardTitle>
          <CardDescription>{count} items synced from SAP</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Item Code</TableHead>
                    <TableHead>Item Name</TableHead>
                    <TableHead>Brand</TableHead>
                    <TableHead>Variety</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead className="text-right">Total Quantity (LTR)</TableHead>
                    <TableHead className="text-right">Rate / LTR</TableHead>
                    <TableHead className="text-right">Total Trans Value</TableHead>
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
                      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
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
                    <TableHead>Item Code</TableHead>
                    <TableHead>Item Name</TableHead>
                    <TableHead>Brand</TableHead>
                    <TableHead>Variety</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead className="text-right">Total Quantity (LTR)</TableHead>
                    <TableHead className="text-right">Rate / LTR</TableHead>
                    <TableHead className="text-right">Total Trans Value</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="py-16">
                        <div className="flex flex-col items-center gap-2 text-muted-foreground">
                          <PackageOpen className="h-10 w-10 stroke-1" />
                          <p className="text-sm font-medium">No items found</p>
                          <p className="text-xs">Sync raw material data from SAP to see items here.</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedItems.map((item, i) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{(page - 1) * perPage + i + 1}</TableCell>
                        <TableCell>{item.item_code}</TableCell>
                        <TableCell>{item.item_name}</TableCell>
                        <TableCell>{item.u_brand}</TableCell>
                        <TableCell>{item.u_variety}</TableCell>
                        <TableCell>{item.u_unit}</TableCell>
                        <TableCell className="text-right">
                          {fmtDecimal(item.total_qty)}
                        </TableCell>
                        <TableCell className="text-right">
                          {fmtDecimal(item.rate)}
                        </TableCell>
                        <TableCell className="text-right">
                          {fmtDecimal(item.total_trans_value)}
                        </TableCell>
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
