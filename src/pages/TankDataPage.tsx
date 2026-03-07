import { useEffect, useState } from "react";
import { AxiosError } from "axios";
import { toast } from "sonner";
import {
  Plus,
  Container,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Gauge,
  Warehouse,
  BarChart3,
} from "lucide-react";

import {
  getTanks,
  createTank,
  deleteTank,
  updateTank,
  getTankItems,
  getTankSummary,
  type Tank,
  type TankItem,
  type TankSummary,
} from "@/api/tank";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function fillPercent(tank: Tank): number {
  if (!tank.current_capacity || !tank.tank_capacity) return 0;
  const current = Number(tank.current_capacity);
  const total = Number(tank.tank_capacity);
  if (total <= 0) return 0;
  return Math.min(100, Math.round(((current / total) * 100) * 100) / 100);
}

function fillColor(pct: number): string {
  if (pct >= 75) return "bg-green-500";
  if (pct >= 40) return "bg-yellow-500";
  if (pct > 0) return "bg-red-500";
  return "bg-muted";
}

export default function TankDataPage() {
  const [tanks, setTanks] = useState<Tank[]>([]);
  const [tankItems, setTankItems] = useState<TankItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tankSummary, setTankSummary] = useState<TankSummary | null>(null);

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [tankCapacity, setTankCapacity] = useState("");
  const [currentCapacity, setCurrentCapacity] = useState("");
  const [selectedItemCode, setSelectedItemCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [capacityError, setCapacityError] = useState("");

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<Tank | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Edit dialog
  const [editTarget, setEditTarget] = useState<Tank | null>(null);
  const [editCurrentCapacity, setEditCurrentCapacity] = useState("");
  const [editItemCode, setEditItemCode] = useState("");
  const [editing, setEditing] = useState(false);
  const [editCapacityError, setEditCapacityError] = useState("");

  // Pagination
  const [page, setPage] = useState(1);
  const perPage = 20;
  const totalPages = Math.max(1, Math.ceil(tanks.length / perPage));
  const paginatedTanks = tanks.slice((page - 1) * perPage, page * perPage);

  async function fetchData() {
    setLoading(true);
    setError("");
    try {
      const [tanksData, itemsData] = await Promise.all([
        getTanks(),
        getTankItems(),
      ]);
      setTanks((tanksData ?? []).sort((a, b) => a.tank_code.localeCompare(b.tank_code, undefined, { numeric: true })));
      setTankItems((itemsData ?? []).sort((a, b) => a.id - b.id));
    } catch (err) {
      if (err instanceof AxiosError) {
        setError(err.response?.data?.detail ?? err.message);
      } else {
        setError("Failed to load tank data");
      }
    } finally {
      setLoading(false);
    }
  }

  async function fetchTankSummary() {
    try {
      const data = await getTankSummary();
      setTankSummary(data);
    } catch {
      // non-critical
    }
  }

  useEffect(() => {
    fetchData();
    fetchTankSummary();
  }, []);

  // ── Create ──────────────────────────────────────────────

  async function openCreateDialog() {
    setTankCapacity("");
    setCurrentCapacity("");
    setSelectedItemCode("");
    setCapacityError("");
    try {
      const freshItems = await getTankItems();
      setTankItems(freshItems ?? []);
    } catch {
      // keep whatever was loaded before
    }
    setCreateOpen(true);
  }

  function handleCurrentCapacityChange(value: string) {
    setCurrentCapacity(value);
    if (value && tankCapacity && Number(value) > Number(tankCapacity)) {
      setCapacityError("Current capacity cannot exceed tank capacity");
    } else {
      setCapacityError("");
    }
  }

  function handleTankCapacityChange(value: string) {
    setTankCapacity(value);
    if (currentCapacity && value && Number(currentCapacity) > Number(value)) {
      setCapacityError("Current capacity cannot exceed tank capacity");
    } else {
      setCapacityError("");
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!tankCapacity.trim() || isNaN(Number(tankCapacity)) || Number(tankCapacity) <= 0) {
      toast.error("Valid tank capacity is required.");
      return;
    }
    if (currentCapacity && Number(currentCapacity) > Number(tankCapacity)) {
      toast.error("Current capacity cannot exceed tank capacity.");
      return;
    }

    setSubmitting(true);
    try {
      const created = await createTank({
        tank_capacity: tankCapacity.trim(),
        current_capacity: currentCapacity.trim() || null,
        item_code: selectedItemCode || null,
      });
      toast.success(`Tank "${created.tank_code}" created successfully.`);
      setCreateOpen(false);
      await fetchData();
    } catch (err) {
      if (err instanceof AxiosError && err.response?.data) {
        const data = err.response.data;
        if (typeof data === "string") {
          toast.error(data);
        } else if (data.detail) {
          toast.error(data.detail);
        } else {
          const messages = Object.entries(data)
            .map(([key, val]) => `${key}: ${Array.isArray(val) ? val.join(", ") : val}`)
            .join("; ");
          toast.error(messages || err.message);
        }
      } else {
        toast.error("Failed to create tank.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  // ── Delete ──────────────────────────────────────────────

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteTank(deleteTarget.tank_code);
      setTanks((prev) => {
        const next = prev.filter((t) => t.tank_code !== deleteTarget.tank_code);
        const maxPage = Math.max(1, Math.ceil(next.length / perPage));
        setPage((p) => Math.min(p, maxPage));
        return next;
      });
      setDeleteTarget(null);
      toast.success(`Tank "${deleteTarget.tank_code}" deleted.`);
    } catch (err) {
      if (err instanceof AxiosError) {
        toast.error(err.response?.data?.detail ?? err.message);
      } else {
        toast.error("Failed to delete tank.");
      }
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  }

  // ── Edit ────────────────────────────────────────────────

  async function openEdit(tank: Tank) {
    setEditTarget(tank);
    setEditCurrentCapacity(tank.current_capacity ?? "");
    setEditItemCode(tank.item_code ?? "");
    setEditCapacityError("");
    try {
      const freshItems = await getTankItems();
      setTankItems(freshItems ?? []);
    } catch {
      // keep whatever was loaded before
    }
  }

  function handleEditCapacityChange(value: string) {
    setEditCurrentCapacity(value);
    if (editTarget && value && Number(value) > Number(editTarget.tank_capacity)) {
      setEditCapacityError("Current capacity cannot exceed tank capacity");
    } else {
      setEditCapacityError("");
    }
  }

  async function handleEdit() {
    if (!editTarget) return;
    if (editCurrentCapacity && Number(editCurrentCapacity) > Number(editTarget.tank_capacity)) {
      toast.error("Current capacity cannot exceed tank capacity.");
      return;
    }
    setEditing(true);
    try {
      await updateTank(editTarget.tank_code, {
        current_capacity: editCurrentCapacity.trim() || null,
        item_code: editItemCode || null,
      });
      setTanks((prev) =>
        prev.map((t) =>
          t.tank_code === editTarget.tank_code
            ? { ...t, current_capacity: editCurrentCapacity.trim() || null, item_code: editItemCode || null }
            : t
        )
      );
      toast.success(`Tank "${editTarget.tank_code}" updated.`);
      setEditTarget(null);
    } catch (err) {
      if (err instanceof AxiosError && err.response?.data) {
        const data = err.response.data;
        if (typeof data === "string") {
          toast.error(data);
        } else if (data.detail) {
          toast.error(data.detail);
        } else {
          const messages = Object.entries(data)
            .map(([key, val]) => `${key}: ${Array.isArray(val) ? val.join(", ") : val}`)
            .join("; ");
          toast.error(messages || err.message);
        }
      } else {
        toast.error("Failed to update tank.");
      }
    } finally {
      setEditing(false);
    }
  }

  return (
    <div className="p-6 space-y-6 animate-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Tank Data</h1>
          <p className="text-sm text-muted-foreground">
            Create and manage tanks
          </p>
        </div>
        <Button onClick={openCreateDialog} className="btn-press gap-2">
          <Plus className="h-4 w-4" />
          Create Tank
        </Button>
      </div>

      {/* Error */}
      {error && <p className="text-sm text-destructive">{error}</p>}

      {/* Tank Summary */}
      <div>
        <h2 className="text-base font-semibold uppercase tracking-wider text-muted-foreground mb-4">
          Tank Summary
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <Card>
            <CardContent className="pt-6 pb-5 px-5">
              <div className="flex items-center gap-4">
                <div className="rounded-lg bg-orange-50 dark:bg-orange-900/50 p-3">
                  <Warehouse className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Tank Capacity</p>
                  {!tankSummary ? (
                    <Skeleton className="h-7 w-24 mt-1" />
                  ) : (
                    <p className="text-2xl font-bold mt-0.5">
                      {tankSummary.total_tank_capacity.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} L
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 pb-5 px-5">
              <div className="flex items-center gap-4">
                <div className="rounded-lg bg-orange-50 dark:bg-orange-900/50 p-3">
                  <Gauge className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Current Stock</p>
                  {!tankSummary ? (
                    <Skeleton className="h-7 w-24 mt-1" />
                  ) : (
                    <p className="text-2xl font-bold mt-0.5">
                      {tankSummary.current_stock.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} L
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 pb-5 px-5">
              <div className="flex items-center gap-4">
                <div className="rounded-lg bg-orange-50 dark:bg-orange-900/50 p-3">
                  <BarChart3 className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Utilisation Rate</p>
                  {!tankSummary ? (
                    <Skeleton className="h-7 w-24 mt-1" />
                  ) : (
                    <p className="text-2xl font-bold mt-0.5">{tankSummary.utilisation_rate}%</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Table Card */}
      <Card className="card-hover shimmer-hover">
        <CardHeader>
          <CardTitle>Tanks</CardTitle>
          <CardDescription>{tanks.length} tanks in the system</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tank Number</TableHead>
                    <TableHead>Item Code</TableHead>
                    <TableHead>Tank Capacity (L)</TableHead>
                    <TableHead>Current Quantity (L)</TableHead>
                    <TableHead>Fill %</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Skeleton className="h-8 w-8" />
                          <Skeleton className="h-8 w-8" />
                        </div>
                      </TableCell>
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
                    <TableHead>Tank Number</TableHead>
                    <TableHead>Item Code</TableHead>
                    <TableHead>Tank Capacity (L)</TableHead>
                    <TableHead>Current Quantity (L)</TableHead>
                    <TableHead>Fill %</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedTanks.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-16">
                        <div className="flex flex-col items-center gap-2 text-muted-foreground">
                          <Container className="h-10 w-10 stroke-1" />
                          <p className="text-sm font-medium">No tanks found</p>
                          <p className="text-xs">Create a tank to get started.</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedTanks.map((tank) => {
                      const pct = fillPercent(tank);
                      return (
                        <TableRow key={tank.tank_code}>
                          <TableCell className="font-medium">{tank.tank_code}</TableCell>
                          <TableCell>{tank.item_code ?? "—"}</TableCell>
                          <TableCell>{tank.tank_capacity} L</TableCell>
                          <TableCell>{tank.current_capacity ? `${tank.current_capacity} L` : "—"}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="h-2 w-16 rounded-full bg-muted overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all ${fillColor(pct)}`}
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                              <span className="text-xs text-muted-foreground w-12">{pct.toFixed(2)}%</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => openEdit(tank)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                onClick={() => setDeleteTarget(tank)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination */}
          {!loading && tanks.length > perPage && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Showing {(page - 1) * perPage + 1}–{Math.min(page * perPage, tanks.length)} of {tanks.length}
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

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Container className="h-5 w-5" />
              Create Tank
            </DialogTitle>
            <DialogDescription>Add a new tank. Tank code will be auto-generated.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="tank-capacity">Tank Capacity (L) *</Label>
              <Input
                id="tank-capacity"
                type="number"
                min={0}
                step="0.01"
                placeholder="e.g. 10000.00"
                value={tankCapacity}
                onChange={(e) => handleTankCapacityChange(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="current-capacity">Current Capacity (L)</Label>
              <Input
                id="current-capacity"
                type="number"
                min={0}
                step="0.01"
                placeholder="Leave empty if not applicable"
                value={currentCapacity}
                onChange={(e) => handleCurrentCapacityChange(e.target.value)}
              />
              {capacityError && (
                <p className="text-xs text-destructive">{capacityError}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Item Code</Label>
              <Select
                value={selectedItemCode || "__none__"}
                onValueChange={(v) => setSelectedItemCode(v === "__none__" ? "" : v)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a tank item (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__" className="text-muted-foreground">None</SelectItem>
                  {tankItems.map((item) => (
                    <SelectItem key={item.tank_item_code} value={item.tank_item_code}>
                      {item.tank_item_code} - {item.tank_item_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting || !tankCapacity.trim() || !!capacityError}
              >
                {submitting ? "Creating..." : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Tank</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{" "}
              <strong>{deleteTarget?.tank_code}</strong>? This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editTarget} onOpenChange={() => setEditTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Tank</DialogTitle>
            <DialogDescription>
              Update <strong>{editTarget?.tank_code}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-5">
            <div className="space-y-2">
              <Label>Tank Code</Label>
              <Input
                value={editTarget?.tank_code ?? ""}
                disabled
                className="disabled:opacity-70"
              />
            </div>
            <div className="space-y-2">
              <Label>Tank Capacity (L)</Label>
              <Input
                value={editTarget?.tank_capacity ? `${editTarget.tank_capacity}` : ""}
                disabled
                className="disabled:opacity-70"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-current-capacity">Current Capacity (L)</Label>
              <Input
                id="edit-current-capacity"
                type="number"
                min={0}
                step="0.01"
                placeholder="Leave empty if not applicable"
                value={editCurrentCapacity}
                onChange={(e) => handleEditCapacityChange(e.target.value)}
              />
              {editCapacityError && (
                <p className="text-xs text-destructive">{editCapacityError}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Item Code</Label>
              <Select
                value={editItemCode || "__none__"}
                onValueChange={(v) => setEditItemCode(v === "__none__" ? "" : v)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a tank item (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__" className="text-muted-foreground">None</SelectItem>
                  {tankItems.map((item) => (
                    <SelectItem key={item.tank_item_code} value={item.tank_item_code}>
                      {item.tank_item_code} - {item.tank_item_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTarget(null)}>
              Cancel
            </Button>
            <Button onClick={handleEdit} disabled={editing || !!editCapacityError}>
              {editing ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
