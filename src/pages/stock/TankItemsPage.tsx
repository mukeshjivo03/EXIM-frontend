import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Check,
  Droplets,
  Plus,
  Pencil,
  Trash2,
  X,
} from "lucide-react";

import { getErrorMessage, toastApiError } from "@/lib/errors";
import { Pagination } from "@/components/Pagination";

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
  { name: "Crimson", hex: "#db3344" },
  { name: "Gold", hex: "#f8b90d" },
  { name: "Magenta", hex: "#db33ae" },
  { name: "Burnt Orange", hex: "#d95c26" },
  { name: "Peach", hex: "#e8a27d" },
  { name: "Tangerine", hex: "#db7633" },
  { name: "Salmon", hex: "#e98b8b" },
  { name: "Dark Red", hex: "#b01d03" },
  { name: "Mint", hex: "#59f37f" },
  { name: "Green", hex: "#17ee30" },
  { name: "Lime", hex: "#68f50a" },
  { name: "Sky Blue", hex: "#56b6f5" },
  { name: "Dodger Blue", hex: "#2198e8" },
  { name: "Steel Blue", hex: "#3498db" },
  { name: "Navy", hex: "#014f84" },
  { name: "Olive", hex: "#6c730d" },
  { name: "Turquoise", hex: "#19d7f0" },
  { name: "Snow", hex: "#f9fafa" },
  { name: "Maroon", hex: "#653439" },
  { name: "Aquamarine", hex: "#10e0c8" },
  { name: "Teal", hex: "#0a8999" },
  { name: "Indigo", hex: "#3e33db" },
  { name: "Midnight", hex: "#020969" },
  { name: "Yellow Green", hex: "#8e980b" },
  { name: "Forest Green", hex: "#228b22" },
  { name: "Grey", hex: "#9e9e9e" },
];

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function findPaletteColor(color: string, extras: { name: string; hex: string }[] = []): string {
  const all = [...COLOR_PALETTE, ...extras];
  const match = all.find(
    (c) =>
      c.hex.toLowerCase() === color.toLowerCase() ||
      c.name.toLowerCase() === color.toLowerCase()
  );
  return match?.hex ?? "";
}

function getColorName(color: string, extras: { name: string; hex: string }[] = []): string {
  const all = [...COLOR_PALETTE, ...extras];
  const match = all.find(
    (c) =>
      c.hex.toLowerCase() === color.toLowerCase() ||
      c.name.toLowerCase() === color.toLowerCase()
  );
  return match?.name ?? color;
}

export default function TankItemsPage() {
  const { email, role } = useAuth();
  const canEdit = role === "ADM" || role === "MNG";

  const [items, setItems] = useState<TankItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [tankItemCode, setTankItemCode] = useState("");
  const [tankItemName, setTankItemName] = useState("");
  const [selectedColor, setSelectedColor] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Custom color
  const [customColors, setCustomColors] = useState<{ name: string; hex: string }[]>([]);
  const [newColorHex, setNewColorHex] = useState("#000000");

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
      setError(getErrorMessage(err, "Failed to load tank items"));
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
      toastApiError(err, "Failed to create tank item.");
    } finally {
      setSubmitting(false);
    }
  }

  // Add custom color
  function handleAddColor() {
    const hex = newColorHex.toLowerCase();
    const allColors = [...COLOR_PALETTE, ...customColors];
    if (allColors.some((c) => c.hex.toLowerCase() === hex)) {
      toast.error("This color already exists in the palette.");
      return;
    }
    setCustomColors((prev) => [...prev, { name: hex, hex }]);
    setSelectedColor(hex);
    setNewColorHex("#000000");
    toast.success("Color added.");
  }

  function handleDeleteColor(hex: string) {
    const usedByItem = items.some(
      (item) => item.color.toLowerCase() === hex.toLowerCase() || findPaletteColor(item.color, customColors).toLowerCase() === hex.toLowerCase()
    );
    if (usedByItem) {
      toast.error("Cannot delete — this color is used by a tank item.");
      return;
    }
    setCustomColors((prev) => prev.filter((c) => c.hex !== hex));
    if (selectedColor === hex) setSelectedColor("");
    if (editColor === hex) setEditColor("");
  }

  // Delete
  async function handleDelete() {
    if (!deleteTarget) return;
    const name = deleteTarget.tank_item_name;
    setDeleting(true);
    try {
      await deleteTankItem(deleteTarget.tank_item_code);
      setDeleteTarget(null);
      toast.success(`Tank item "${name}" deleted.`);
      await fetchItems();
      setPage((p) => {
        const maxPage = Math.max(1, Math.ceil((items.length - 1) / perPage));
        return Math.min(p, maxPage);
      });
    } catch (err) {
      toastApiError(err, "Failed to delete tank item.");
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  }

  // Edit
  function openEdit(item: TankItem) {
    setEditTarget(item);
    setEditColor(findPaletteColor(item.color, customColors));
    setEditName(item.tank_item_name);
  }

  async function handleEdit() {
    if (!editTarget || !editColor || !editName.trim()) return;
    setEditing(true);
    try {
      await updateTankItem(editTarget.tank_item_code, editColor, editName.trim());
      toast.success(`Tank item "${editTarget.tank_item_name}" updated.`);
      setEditTarget(null);
      await fetchItems();
    } catch (err) {
      toastApiError(err, "Failed to update tank item.");
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
        {canEdit && (
          <Button onClick={() => setCreateOpen(true)} className="btn-press gap-2">
            <Plus className="h-4 w-4" />
            Create Tank Item
          </Button>
        )}
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
                    {canEdit && <TableHead className="text-right">Actions</TableHead>}
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
                    {canEdit && <TableHead className="text-right">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={canEdit ? 6 : 5} className="py-16">
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
                              style={{ backgroundColor: findPaletteColor(item.color, customColors) || item.color }}
                            />
                            <span className="text-sm text-muted-foreground">
                              {getColorName(item.color, customColors)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>{item.tank_item_code}</TableCell>
                        <TableCell>{item.tank_item_name}</TableCell>
                        <TableCell>{formatDate(item.created_at)}</TableCell>
                        {canEdit && (
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
                        )}
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
              totalItems={items.length}
              perPage={perPage}
              onPageChange={setPage}
            />
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
                placeholder="e.g. RM-001"
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
                {[...COLOR_PALETTE, ...customColors].map((color) => {
                  const isCustom = customColors.some((c) => c.hex === color.hex);
                  return (
                    <div key={color.hex} className="relative group">
                      <button
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
                      {isCustom && (
                        <button
                          type="button"
                          className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => handleDeleteColor(color.hex)}
                          title="Remove color"
                        >
                          <X className="h-2.5 w-2.5" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
              {selectedColor && (
                <p className="text-xs text-muted-foreground">
                  Selected: {[...COLOR_PALETTE, ...customColors].find((c) => c.hex === selectedColor)?.name}
                </p>
              )}

              {/* Add custom color */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="color"
                  value={newColorHex}
                  onChange={(e) => setNewColorHex(e.target.value)}
                  className="h-8 w-8 rounded cursor-pointer border border-border bg-transparent p-0"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8"
                  onClick={handleAddColor}
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Add Color
                </Button>
              </div>
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
                {[...COLOR_PALETTE, ...customColors].map((color) => {
                  const isCustom = customColors.some((c) => c.hex === color.hex);
                  return (
                    <div key={color.hex} className="relative group">
                      <button
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
                      {isCustom && (
                        <button
                          type="button"
                          className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => handleDeleteColor(color.hex)}
                          title="Remove color"
                        >
                          <X className="h-2.5 w-2.5" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
              {editColor && (
                <p className="text-xs text-muted-foreground">
                  Selected: {[...COLOR_PALETTE, ...customColors].find((c) => c.hex === editColor)?.name}
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
