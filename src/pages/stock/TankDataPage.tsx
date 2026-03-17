import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Plus,
  Container,
  Pencil,
  Trash2,
  Gauge,
  Warehouse,
  BarChart3,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { getErrorMessage, toastApiError } from "@/lib/errors";
import { SummaryCard } from "@/components/SummaryCard";
import { fmtDecimal } from "@/lib/formatters";
import { Pagination } from "@/components/Pagination";

import {
  getTanks,
  createTank,
  deleteTank,
  getTankItems,
  getTankSummary,
  tankInward,
  tankOutward,
  type Tank,
  type TankItem,
  type TankSummary,
} from "@/api/tank";
import {
  getUniqueRMCodes,
  getStockEntriesByRM,
  type StockEntryByRM,
} from "@/api/stockStatus";
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
  const { email } = useAuth();
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
  const [editOperation, setEditOperation] = useState<"IN" | "OUT" | "">("")
  const [editItemCode, setEditItemCode] = useState("");
  const [editSelectedEntry, setEditSelectedEntry] = useState("");
  const [editQuantity, setEditQuantity] = useState("");
  const [editing, setEditing] = useState(false);
  const [uniqueRMCodes, setUniqueRMCodes] = useState<string[]>([]);
  const [stockEntries, setStockEntries] = useState<StockEntryByRM[]>([]);

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
      setError(getErrorMessage(err, "Failed to load tank data"));
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
      toastApiError(err, "Failed to create tank.");
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
      toastApiError(err, "Failed to delete tank.");
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  }

  // ── Edit ────────────────────────────────────────────────

  async function openEdit(tank: Tank) {
    setEditTarget(tank);
    setEditOperation("");
    setEditItemCode("");
    setEditSelectedEntry("");
    setEditQuantity("");
    setStockEntries([]);
    try {
      const [freshItems, rmCodes] = await Promise.all([
        getTankItems(),
        getUniqueRMCodes(),
      ]);
      setTankItems(freshItems ?? []);
      setUniqueRMCodes(rmCodes);
    } catch {
      // keep whatever was loaded before
    }
  }

  async function handleItemCodeChange(itemCode: string) {
    setEditItemCode(itemCode);
    setEditSelectedEntry("");
    setEditQuantity("");
    if (!itemCode) {
      setStockEntries([]);
      return;
    }
    try {
      const entries = await getStockEntriesByRM(itemCode);
      setStockEntries(entries);
    } catch {
      setStockEntries([]);
    }
  }

  // Selected stock entry
  const editSelectedStock = editSelectedEntry
    ? stockEntries.find((s) => String(s.id) === editSelectedEntry)
    : null;

  async function handleEdit() {
    if (!editTarget) return;

    if (editOperation === "IN") {
      if (!editItemCode) {
        toast.error("Please select an item code.");
        return;
      }
      if (!editSelectedEntry) {
        toast.error("Please select a vendor / vehicle.");
        return;
      }
      if (!editQuantity.trim() || Number(editQuantity) <= 0) {
        toast.error("Please enter a valid quantity.");
        return;
      }
      const maxQty = Number(editSelectedStock?.quantity ?? 0);
      if (Number(editQuantity) > maxQty) {
        toast.error(`Quantity cannot exceed available stock (${maxQty} KG).`);
        return;
      }
      // Check tank capacity
      const currentCap = Number(editTarget.current_capacity ?? 0);
      const tankCap = Number(editTarget.tank_capacity);
      if (currentCap + Number(editQuantity) > tankCap) {
        toast.error(`Adding ${editQuantity} would exceed tank capacity (${tankCap} L). Available space: ${(tankCap - currentCap).toFixed(2)} L.`);
        return;
      }
    }

    if (editOperation === "OUT") {
      if (!editQuantity.trim() || Number(editQuantity) <= 0) {
        toast.error("Please enter a valid quantity.");
        return;
      }
      const currentCap = Number(editTarget.current_capacity ?? 0);
      if (Number(editQuantity) > currentCap) {
        toast.error(`Quantity cannot exceed current stock (${currentCap} L).`);
        return;
      }
    }

    setEditing(true);
    try {
      if (editOperation === "IN") {
        await tankInward({
          tank_code: editTarget.tank_code,
          stock_status_id: String(editSelectedStock!.id),
          quantity: editQuantity.trim(),
          user: email ?? "",
        });
      } else {
        await tankOutward({
          tank_code: editTarget.tank_code,
          quantity: editQuantity.trim(),
          remarks: "Used for Production",
          user: email ?? "",
        });
      }
      toast.success(
        `Tank "${editTarget.tank_code}" updated: ${editOperation === "IN" ? "added" : "removed"} ${editQuantity} L.`
      );
      setEditTarget(null);
      fetchData();
      fetchTankSummary();
    } catch (err) {
      toastApiError(err, "Failed to update tank.");
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
          <SummaryCard icon={Warehouse} label="Total Tank Capacity" value={tankSummary ? `${fmtDecimal(tankSummary.total_tank_capacity)} L` : ""} loading={!tankSummary} />
          <SummaryCard icon={Gauge} label="Current Stock" value={tankSummary ? `${fmtDecimal(tankSummary.current_stock)} L` : ""} loading={!tankSummary} />
          <SummaryCard icon={BarChart3} label="Utilisation Rate" value={tankSummary ? `${tankSummary.utilisation_rate}%` : ""} loading={!tankSummary} />
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
            <Pagination page={page} totalPages={totalPages} totalItems={tanks.length} perPage={perPage} onPageChange={setPage} />
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
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-muted-foreground">Tank Code</p>
                <p className="text-sm font-medium">{editTarget?.tank_code ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Tank Capacity</p>
                <p className="text-sm font-medium">{editTarget?.tank_capacity ? `${editTarget.tank_capacity} L` : "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Current Stock</p>
                <p className="text-sm font-medium">{editTarget?.current_capacity ? `${editTarget.current_capacity} L` : "0 L"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Current Item</p>
                <p className="text-sm font-medium">{editTarget?.item_code ?? "—"}</p>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Operation *</Label>
              <Select
                value={editOperation || "__none__"}
                onValueChange={(v) => {
                  setEditOperation(v === "__none__" ? "" : v as "IN" | "OUT");
                  setEditItemCode("");
                  setEditSelectedEntry("");
                  setEditQuantity("");
                  setStockEntries([]);
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Choose operation" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__" className="text-muted-foreground">Choose</SelectItem>
                  <SelectItem value="IN">In</SelectItem>
                  <SelectItem value="OUT">Out</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {editOperation === "IN" && (
              <>
                <div className="space-y-2">
                  <Label>Item Code *</Label>
                  <Select
                    value={editItemCode || "__none__"}
                    onValueChange={(v) => handleItemCodeChange(v === "__none__" ? "" : v)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select item" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__" className="text-muted-foreground">Select item</SelectItem>
                      {uniqueRMCodes.map((code) => (
                        <SelectItem key={code} value={code}>
                          {code}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {editItemCode && stockEntries.length > 0 && (
                  <div className="space-y-2">
                    <Label>Vendor / Vehicle *</Label>
                    <Select
                      value={editSelectedEntry || "__none__"}
                      onValueChange={(v) => {
                        setEditSelectedEntry(v === "__none__" ? "" : v);
                        setEditQuantity("");
                      }}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select vendor / vehicle" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__" className="text-muted-foreground">Select</SelectItem>
                        {stockEntries.map((entry) => (
                          <SelectItem key={entry.id} value={String(entry.id)}>
                            {entry.vehicle_number ?? "—"} — {entry.vendor_code}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {editSelectedStock && (
                  <div className="rounded-md bg-muted/50 px-3 py-2 text-sm space-y-1">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Vendor:</span>
                      <span className="font-medium">{editSelectedStock.vendor_code}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Vehicle:</span>
                      <span className="font-medium">{editSelectedStock.vehicle_number ?? "—"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Available Qty:</span>
                      <span className="font-medium">{editSelectedStock.quantity.toLocaleString("en-IN")} KG</span>
                    </div>
                  </div>
                )}
              </>
            )}

            {(editOperation === "OUT" || (editOperation === "IN" && editSelectedEntry)) && (
              <div className="space-y-2">
                <Label htmlFor="edit-qty">
                  Quantity (L) *
                  {editOperation === "IN" && editSelectedStock && (
                    <span className="text-xs text-muted-foreground ml-2">
                      (max: {editSelectedStock.quantity})
                    </span>
                  )}
                  {editOperation === "OUT" && editTarget && (
                    <span className="text-xs text-muted-foreground ml-2">
                      (max: {editTarget.current_capacity ?? 0})
                    </span>
                  )}
                </Label>
                <Input
                  id="edit-qty"
                  type="number"
                  min={0}
                  step="0.01"
                  placeholder="Enter quantity"
                  value={editQuantity}
                  onChange={(e) => setEditQuantity(e.target.value)}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTarget(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleEdit}
              disabled={editing || !editQuantity.trim()}
            >
              {editing ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
