import { useEffect, useState } from "react";
import { AxiosError } from "axios";
import { toast } from "sonner";
import {
  Check,
  Droplets,
  Plus,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

import {
  createTankItem,
  getTankItems,
  deleteTankItem,
  updateTankItem,
  type TankItem,
} from "@/api/tank";
import { useAuth } from "@/context/AuthContext";
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

const COLOR_PALETTE = [
  { name: "Red", hex: "#EF4444" },
  { name: "Orange", hex: "#F97316" },
  { name: "Amber", hex: "#F59E0B" },
  { name: "Yellow", hex: "#EAB308" },
  { name: "Lime", hex: "#84CC16" },
  { name: "Green", hex: "#22C55E" },
  { name: "Emerald", hex: "#10B981" },
  { name: "Teal", hex: "#14B8A6" },
  { name: "Cyan", hex: "#06B6D4" },
  { name: "Sky", hex: "#0EA5E9" },
  { name: "Blue", hex: "#3B82F6" },
  { name: "Indigo", hex: "#6366F1" },
  { name: "Violet", hex: "#8B5CF6" },
  { name: "Purple", hex: "#A855F7" },
  { name: "Pink", hex: "#EC4899" },
];

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function findPaletteColor(color: string): string {
  const match = COLOR_PALETTE.find(
    (c) =>
      c.hex.toLowerCase() === color.toLowerCase() ||
      c.name.toLowerCase() === color.toLowerCase()
  );
  return match?.hex ?? "";
}

function getColorName(color: string): string {
  const match = COLOR_PALETTE.find(
    (c) =>
      c.hex.toLowerCase() === color.toLowerCase() ||
      c.name.toLowerCase() === color.toLowerCase()
  );
  return match?.name ?? color;
}

export default function TankItemsPage() {
  const { email } = useAuth();

  const [items, setItems] = useState<TankItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [tankItemCode, setTankItemCode] = useState("");
  const [tankItemName, setTankItemName] = useState("");
  const [selectedColor, setSelectedColor] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Pagination
  const [page, setPage] = useState(1);
  const perPage = 20;
  const totalPages = Math.max(1, Math.ceil(items.length / perPage));
  const paginatedItems = items.slice((page - 1) * perPage, page * perPage);

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<TankItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Edit dialog
  const [editTarget, setEditTarget] = useState<TankItem | null>(null);
  const [editColor, setEditColor] = useState("");
  const [editName, setEditName] = useState("");
  const [editing, setEditing] = useState(false);

  async function fetchItems() {
    setLoading(true);
    setError("");
    try {
      const data = await getTankItems();
      setItems((data ?? []).sort((a, b) => a.id - b.id));
    } catch (err) {
      if (err instanceof AxiosError) {
        setError(err.response?.data?.detail ?? err.message);
      } else {
        setError("Failed to load tank items");
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchItems();

    function onTankItemsUpdated() {
      fetchItems();
    }
    window.addEventListener("tank-items-updated", onTankItemsUpdated);
    return () => window.removeEventListener("tank-items-updated", onTankItemsUpdated);
  }, []);

  // Create
  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const code = tankItemCode.trim();
    if (!code) {
      toast.error("Tank item code is required.");
      return;
    }
    if (!selectedColor) {
      toast.error("Please select a color.");
      return;
    }

    setSubmitting(true);
    try {
      await createTankItem({
        tank_item_code: code,
        tank_item_name: tankItemName.trim() || code,
        is_active: true,
        created_by: email ?? "",
        color: selectedColor,
      });
      toast.success(`Tank item "${code}" created successfully.`);
      setTankItemCode("");
      setTankItemName("");
      setSelectedColor("");
      setCreateOpen(false);
      await fetchItems();
    } catch (err) {
      if (err instanceof AxiosError) {
        toast.error(err.response?.data?.detail ?? err.message);
      } else {
        toast.error("Failed to create tank item.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  // Delete
  async function handleDelete() {
    if (!deleteTarget) return;
    const name = deleteTarget.tank_item_name;
    setDeleting(true);
    try {
      await deleteTankItem(deleteTarget.tank_item_code);
      setItems((prev) => {
        const next = prev.filter((i) => i.id !== deleteTarget.id);
        const maxPage = Math.max(1, Math.ceil(next.length / perPage));
        setPage((p) => Math.min(p, maxPage));
        return next;
      });
      setDeleteTarget(null);
      toast.success(`Tank item "${name}" deleted.`);
    } catch (err) {
      if (err instanceof AxiosError) {
        toast.error(err.response?.data?.detail ?? err.message);
      } else {
        toast.error("Failed to delete tank item.");
      }
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  }

  // Edit
  function openEdit(item: TankItem) {
    setEditTarget(item);
    setEditColor(findPaletteColor(item.color));
    setEditName(item.tank_item_name);
  }

  async function handleEdit() {
    if (!editTarget || !editColor || !editName.trim()) return;
    setEditing(true);
    try {
      await updateTankItem(editTarget.tank_item_code, editColor, editName.trim());
      setItems((prev) =>
        prev.map((i) =>
          i.id === editTarget.id
            ? { ...i, color: editColor, tank_item_name: editName.trim() }
            : i
        )
      );
      toast.success(`Tank item "${editTarget.tank_item_name}" updated.`);
      setEditTarget(null);
    } catch (err) {
      if (err instanceof AxiosError) {
        toast.error(err.response?.data?.detail ?? err.message);
      } else {
        toast.error("Failed to update tank item.");
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
          <h1 className="text-2xl font-bold">Tank Items</h1>
          <p className="text-sm text-muted-foreground">
            Create and manage tank items
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="btn-press gap-2">
          <Plus className="h-4 w-4" />
          Create Tank Item
        </Button>
      </div>

      {/* Error */}
      {error && <p className="text-sm text-destructive">{error}</p>}

      {/* Table Card */}
      <Card className="card-hover shimmer-hover">
        <CardHeader>
          <CardTitle>Tank Items</CardTitle>
          <CardDescription>{items.length} tank items in the system</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Color</TableHead>
                    <TableHead>Item Code</TableHead>
                    <TableHead>Item Name</TableHead>
                    <TableHead>Created At</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-6" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-6 rounded-full" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-28" /></TableCell>
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
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Color</TableHead>
                    <TableHead>Item Code</TableHead>
                    <TableHead>Item Name</TableHead>
                    <TableHead>Created At</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-16">
                        <div className="flex flex-col items-center gap-2 text-muted-foreground">
                          <Droplets className="h-10 w-10 stroke-1" />
                          <p className="text-sm font-medium">No tank items found</p>
                          <p className="text-xs">Create a tank item to get started.</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedItems.map((item, i) => (
                      <TableRow key={`${item.id}-${i}`}>
                        <TableCell className="font-medium">
                          {(page - 1) * perPage + i + 1}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div
                              className="h-6 w-6 rounded-full border border-border shrink-0"
                              style={{ backgroundColor: findPaletteColor(item.color) || item.color }}
                            />
                            <span className="text-sm text-muted-foreground">
                              {getColorName(item.color)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>{item.tank_item_code}</TableCell>
                        <TableCell>{item.tank_item_name}</TableCell>
                        <TableCell>{formatDate(item.created_at)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => openEdit(item)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => setDeleteTarget(item)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
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
          {!loading && items.length > perPage && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Showing {(page - 1) * perPage + 1}–{Math.min(page * perPage, items.length)} of {items.length}
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
              <Droplets className="h-5 w-5" />
              Create Tank Item
            </DialogTitle>
            <DialogDescription>Add a new tank item to the system</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="tank-item-code">Tank Item Code *</Label>
              <Input
                id="tank-item-code"
                placeholder="e.g. RM00GDN"
                value={tankItemCode}
                onChange={(e) => setTankItemCode(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tank-item-name">Tank Item Name</Label>
              <Input
                id="tank-item-name"
                placeholder="Defaults to item code if left empty"
                value={tankItemName}
                onChange={(e) => setTankItemName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Color *</Label>
              <div className="flex flex-wrap gap-2">
                {COLOR_PALETTE.map((color) => (
                  <button
                    key={color.hex}
                    type="button"
                    title={color.name}
                    className="relative h-8 w-8 rounded-full border-2 transition-all cursor-pointer hover:scale-110"
                    style={{
                      backgroundColor: color.hex,
                      borderColor: selectedColor === color.hex ? "var(--foreground)" : "transparent",
                    }}
                    onClick={() => setSelectedColor(color.hex)}
                  >
                    {selectedColor === color.hex && (
                      <Check className="absolute inset-0 m-auto h-4 w-4 text-white drop-shadow-md" />
                    )}
                  </button>
                ))}
              </div>
              {selectedColor && (
                <p className="text-xs text-muted-foreground">
                  Selected: {COLOR_PALETTE.find((c) => c.hex === selectedColor)?.name}
                </p>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting || !tankItemCode.trim() || !selectedColor}>
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
            <DialogTitle>Delete Tank Item</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{" "}
              <strong>{deleteTarget?.tank_item_name}</strong>? This action cannot be
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
            <DialogTitle>Edit Tank Item</DialogTitle>
            <DialogDescription>
              Update <strong>{editTarget?.tank_item_code}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-5">
            <div className="space-y-2">
              <Label>Tank Item Code</Label>
              <Input
                value={editTarget?.tank_item_code ?? ""}
                disabled
                className="disabled:opacity-70"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-tank-item-name">Tank Item Name *</Label>
              <Input
                id="edit-tank-item-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Color *</Label>
              <div className="flex flex-wrap gap-2">
                {COLOR_PALETTE.map((color) => (
                  <button
                    key={color.hex}
                    type="button"
                    title={color.name}
                    className="relative h-8 w-8 rounded-full border-2 transition-all cursor-pointer hover:scale-110"
                    style={{
                      backgroundColor: color.hex,
                      borderColor: editColor === color.hex ? "var(--foreground)" : "transparent",
                    }}
                    onClick={() => setEditColor(color.hex)}
                  >
                    {editColor === color.hex && (
                      <Check className="absolute inset-0 m-auto h-4 w-4 text-white drop-shadow-md" />
                    )}
                  </button>
                ))}
              </div>
              {editColor && (
                <p className="text-xs text-muted-foreground">
                  Selected: {COLOR_PALETTE.find((c) => c.hex === editColor)?.name}
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTarget(null)}>
              Cancel
            </Button>
            <Button onClick={handleEdit} disabled={editing || !editColor || !editName.trim()}>
              {editing ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
