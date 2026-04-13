import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Droplets,
  LayoutGrid,
  List,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";

import { getErrorMessage, toastApiError } from "@/lib/errors";
import { Pagination } from "@/components/Pagination";
import {
  ColorPicker,
  findPaletteColor,
  getColorName,
} from "@/components/ColorPicker";

import {
  createTankItem,
  getTankItems,
  deleteTankItem,
  updateTankItem,
  type TankItem,
} from "@/api/tank";
import { useAuth } from "@/context/AuthContext";
import { useHasPermission } from "@/hooks/useHasPermission";
import Guard from "@/components/Guard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function TankItemsPage() {
  const { email } = useAuth();
  const { hasPermission } = useHasPermission();
  const canAdd = hasPermission("tankitem", "add");
  const canEdit = hasPermission("tankitem", "change") || hasPermission("tankitem", "edit");
  const canDelete = hasPermission("tankitem", "delete");

  const [items, setItems] = useState<TankItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Search
  const [search, setSearch] = useState("");

  // View mode
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [tankItemCode, setTankItemCode] = useState("");
  const [tankItemName, setTankItemName] = useState("");
  const [selectedColor, setSelectedColor] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Custom color
  const [customColors, setCustomColors] = useState<
    { name: string; hex: string }[]
  >([]);

  // Pagination
  const [page, setPage] = useState(1);
  const perPage = 20;

  // Filtered items
  const filteredItems = items.filter((item) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      item.tank_item_code.toLowerCase().includes(q) ||
      item.tank_item_name.toLowerCase().includes(q) ||
      item.created_by?.toLowerCase().includes(q)
    );
  });
  const totalPages = Math.max(1, Math.ceil(filteredItems.length / perPage));
  const paginatedItems = filteredItems.slice(
    (page - 1) * perPage,
    page * perPage
  );

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const allOnPageSelected =
    paginatedItems.length > 0 &&
    paginatedItems.every((item) => selectedIds.has(item.tank_item_code));

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<TankItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Bulk delete confirmation
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

  // Edit dialog (for grid view)
  const [editTarget, setEditTarget] = useState<TankItem | null>(null);
  const [editColor, setEditColor] = useState("");
  const [editName, setEditName] = useState("");
  const [editing, setEditing] = useState(false);


  const fetchItems = useCallback(async () => {
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
  }, []);

  useEffect(() => {
    fetchItems();
    function onTankItemsUpdated() {
      fetchItems();
    }
    window.addEventListener("tank-items-updated", onTankItemsUpdated);
    return () =>
      window.removeEventListener("tank-items-updated", onTankItemsUpdated);
  }, [fetchItems]);

  // Keyboard shortcut: Ctrl+N to create
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === "n" && canAdd) {
        e.preventDefault();
        setCreateOpen(true);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [canAdd]);

  // Reset page when search changes
  useEffect(() => {
    setPage(1);
    setSelectedIds(new Set());
  }, [search]);

  function handleDeleteColor(hex: string) {
    const usedByItem = items.some(
      (item) =>
        item.color.toLowerCase() === hex.toLowerCase() ||
        findPaletteColor(item.color, customColors).toLowerCase() ===
          hex.toLowerCase()
    );
    if (usedByItem) {
      toast.error("Cannot delete — this color is used by a tank item.");
      return;
    }
    setCustomColors((prev) => prev.filter((c) => c.hex !== hex));
    if (selectedColor === hex) setSelectedColor("");
    if (editColor === hex) setEditColor("");
  }

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

  // Delete single
  async function handleDelete() {
    if (!deleteTarget) return;
    const name = deleteTarget.tank_item_name;
    setDeleting(true);
    try {
      await deleteTankItem(deleteTarget.tank_item_code);
      setDeleteTarget(null);
      toast.success(`Tank item "${name}" deleted.`);
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(deleteTarget.tank_item_code);
        return next;
      });
      await fetchItems();
      setPage((p) => {
        const maxPage = Math.max(
          1,
          Math.ceil((filteredItems.length - 1) / perPage)
        );
        return Math.min(p, maxPage);
      });
    } catch (err) {
      toastApiError(err, "Failed to delete tank item.");
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  }

  // Bulk delete
  async function handleBulkDelete() {
    const toDelete = items.filter((item) => selectedIds.has(item.tank_item_code));
    if (toDelete.length === 0) return;
    setBulkDeleting(true);
    let successCount = 0;
    for (const item of toDelete) {
      try {
        await deleteTankItem(item.tank_item_code);
        successCount++;
      } catch {
        toast.error(`Failed to delete "${item.tank_item_name}".`);
      }
    }
    setBulkDeleteOpen(false);
    setBulkDeleting(false);
    setSelectedIds(new Set());
    if (successCount > 0) {
      toast.success(`Deleted ${successCount} tank item(s).`);
      await fetchItems();
    }
  }

  // Edit (dialog - used in grid view)
  function openEdit(item: TankItem) {
    setEditTarget(item);
    setEditColor(findPaletteColor(item.color, customColors));
    setEditName(item.tank_item_name);
  }

  async function handleEdit() {
    if (!editTarget || !editColor || !editName.trim()) return;
    setEditing(true);
    try {
      await updateTankItem(
        editTarget.tank_item_code,
        editColor,
        editName.trim()
      );
      toast.success(`Tank item "${editTarget.tank_item_name}" updated.`);
      setEditTarget(null);
      await fetchItems();
    } catch (err) {
      toastApiError(err, "Failed to update tank item.");
    } finally {
      setEditing(false);
    }
  }

  // Inline color change (table view)
  async function handleInlineColorChange(item: TankItem, newColor: string) {
    try {
      await updateTankItem(item.tank_item_code, newColor, item.tank_item_name);
      toast.success(`Color updated for "${item.tank_item_name}".`);
      await fetchItems();
    } catch (err) {
      toastApiError(err, "Failed to update color.");
    }
  }

  // Toggle selection
  function toggleSelect(code: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  }

  function toggleSelectAll() {
    if (allOnPageSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        paginatedItems.forEach((item) => next.delete(item.tank_item_code));
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        paginatedItems.forEach((item) => next.add(item.tank_item_code));
        return next;
      });
    }
  }

  // Color pill component
  function ColorPill({ item }: { item: TankItem }) {
    const hex =
      findPaletteColor(item.color, customColors) || item.color;
    const name = getColorName(item.color, customColors);

    if (!canEdit) {
      return (
        <Badge
          variant="outline"
          className="gap-1.5 pl-1.5 pr-3 py-1 text-sm font-normal"
        >
          <span
            className="h-4 w-4 rounded-full border border-border shrink-0 inline-block"
            style={{ backgroundColor: hex }}
          />
          {name}
        </Badge>
      );
    }

    return (
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-full border border-border pl-1.5 pr-3 py-1 text-sm font-normal hover:bg-accent transition-colors cursor-pointer"
          >
            <span
              className="h-4 w-4 rounded-full border border-border shrink-0 inline-block"
              style={{ backgroundColor: hex }}
            />
            {name}
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-80" align="start">
          <ColorPicker
            selectedColor={hex}
            onSelect={(newHex) => handleInlineColorChange(item, newHex)}
            customColors={customColors}
            onAddCustomColor={(c) =>
              setCustomColors((prev) => [...prev, c])
            }
            onDeleteCustomColor={handleDeleteColor}
            compact
          />
        </PopoverContent>
      </Popover>
    );
  }

  const colCount = canDelete ? 8 : 6;

  return (
    <Guard
      resource="tankitem"
      action="view"
      fallback={<div className="p-6 text-sm text-muted-foreground">You do not have permission to view tank items.</div>}
    >
    <div className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6 animate-page">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Tank Items</h1>
          <p className="text-sm text-muted-foreground">
            Create and manage tank items
            {canEdit && (
              <span className="hidden sm:inline text-muted-foreground/60">
                {" "}
                &middot; Ctrl+N to create
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Bulk delete */}
          {canDelete && selectedIds.size > 0 && (
            <Button
              variant="destructive"
              size="sm"
              className="gap-1.5"
              onClick={() => setBulkDeleteOpen(true)}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete ({selectedIds.size})
            </Button>
          )}
          {canAdd && (
            <Button
              onClick={() => setCreateOpen(true)}
              className="btn-press gap-2"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Create Tank Item</span>
              <span className="sm:hidden">Create</span>
            </Button>
          )}
        </div>
      </div>

      {/* Error */}
      {error && <p className="text-sm text-destructive">{error}</p>}

      {/* Table Card */}
      <Card className="card-hover shimmer-hover">
        <CardHeader>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <CardTitle>Tank Items</CardTitle>
              <CardDescription>
                {filteredItems.length}
                {search.trim()
                  ? ` of ${items.length}`
                  : ""}{" "}
                tank items
                {search.trim() ? " matching" : " in the system"}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search items..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 h-9 w-48 sm:w-56"
                />
              </div>
              {/* View toggle */}
              <div className="flex items-center border rounded-md">
                <Button
                  variant={viewMode === "table" ? "secondary" : "ghost"}
                  size="icon"
                  className="h-9 w-9 rounded-r-none"
                  onClick={() => setViewMode("table")}
                  title="Table view"
                >
                  <List className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === "grid" ? "secondary" : "ghost"}
                  size="icon"
                  className="h-9 w-9 rounded-l-none"
                  onClick={() => setViewMode("grid")}
                  title="Grid view"
                >
                  <LayoutGrid className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            viewMode === "table" ? (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {canDelete && <TableHead className="w-10" />}
                      <TableHead className="w-12">S.No</TableHead>
                      <TableHead>Color</TableHead>
                      <TableHead>Item Code</TableHead>
                      <TableHead>Item Name</TableHead>
                      <TableHead>Created By</TableHead>
                      <TableHead>Created At</TableHead>
                      {canDelete && (
                        <TableHead className="text-right">Actions</TableHead>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        {canDelete && (
                          <TableCell>
                            <Skeleton className="h-4 w-4" />
                          </TableCell>
                        )}
                        <TableCell>
                          <Skeleton className="h-4 w-6" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-6 w-20 rounded-full" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-20" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-32" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-24" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-28" />
                        </TableCell>
                        {canDelete && (
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Skeleton className="h-8 w-8" />
                              <Skeleton className="h-8 w-8" />
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div
                    key={i}
                    className="rounded-lg border p-4 space-y-3"
                  >
                    <Skeleton className="h-12 w-12 rounded-full mx-auto" />
                    <Skeleton className="h-4 w-20 mx-auto" />
                    <Skeleton className="h-3 w-16 mx-auto" />
                  </div>
                ))}
              </div>
            )
          ) : viewMode === "table" ? (
            /* ───── TABLE VIEW ───── */
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    {canDelete && (
                      <TableHead className="w-10">
                        <Checkbox
                          checked={allOnPageSelected}
                          onCheckedChange={toggleSelectAll}
                          aria-label="Select all"
                        />
                      </TableHead>
                    )}
                    <TableHead className="w-12">S.No</TableHead>
                    <TableHead>Color</TableHead>
                    <TableHead>Item Code</TableHead>
                    <TableHead>Item Name</TableHead>
                    <TableHead>Created By</TableHead>
                    <TableHead>Created At</TableHead>
                    {canDelete && (
                      <TableHead className="text-right">Actions</TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={colCount} className="py-16">
                        <div className="flex flex-col items-center gap-3 text-muted-foreground">
                          <Droplets className="h-10 w-10 stroke-1" />
                          <p className="text-sm font-medium">
                            {search.trim()
                              ? "No items match your search"
                              : "No tank items found"}
                          </p>
                          {!search.trim() && canAdd && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-1.5"
                              onClick={() => setCreateOpen(true)}
                            >
                              <Plus className="h-3.5 w-3.5" />
                              Create Tank Item
                            </Button>
                          )}
                          {search.trim() && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setSearch("")}
                            >
                              Clear search
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedItems.map((item, i) => (
                      <TableRow
                        key={item.id}
                        className={
                          selectedIds.has(item.tank_item_code) ? "bg-muted/50" : ""
                        }
                      >
                        {canDelete && (
                          <TableCell>
                            <Checkbox
                              checked={selectedIds.has(item.tank_item_code)}
                              onCheckedChange={() => toggleSelect(item.tank_item_code)}
                              aria-label={`Select ${item.tank_item_name}`}
                            />
                          </TableCell>
                        )}
                        <TableCell className="font-medium">
                          {(page - 1) * perPage + i + 1}
                        </TableCell>
                        <TableCell>
                          <ColorPill item={item} />
                        </TableCell>
                        <TableCell className="font-mono">
                          {item.tank_item_code}
                        </TableCell>
                        <TableCell>
                          {item.tank_item_name}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {item.created_by || "—"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDate(item.created_at)}
                        </TableCell>
                        {(canEdit || canDelete) && (
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              {canEdit && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => openEdit(item)}
                                  title="Edit"
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                              )}
                              {canDelete && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                  onClick={() => setDeleteTarget(item)}
                                  title="Delete"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          ) : (
            /* ───── GRID VIEW ───── */
            <>
              {paginatedItems.length === 0 ? (
                <div className="flex flex-col items-center gap-3 text-muted-foreground py-16">
                  <Droplets className="h-10 w-10 stroke-1" />
                  <p className="text-sm font-medium">
                    {search.trim()
                      ? "No items match your search"
                      : "No tank items found"}
                  </p>
                  {!search.trim() && canAdd && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5"
                      onClick={() => setCreateOpen(true)}
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Create Tank Item
                    </Button>
                  )}
                  {search.trim() && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setSearch("")}
                    >
                      Clear search
                    </Button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {paginatedItems.map((item) => {
                    const hex =
                      findPaletteColor(item.color, customColors) ||
                      item.color;
                    const colorName = getColorName(
                      item.color,
                      customColors
                    );
                    const isSelected = selectedIds.has(item.tank_item_code);

                    return (
                      <div
                        key={item.id}
                        className={`relative rounded-lg border p-4 transition-all hover:shadow-md group ${
                          isSelected
                            ? "border-primary bg-muted/50 ring-1 ring-primary"
                            : "hover:border-foreground/20"
                        }`}
                      >
                        {/* Checkbox */}
                        {canDelete && (
                          <div className="absolute top-2 left-2">
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => toggleSelect(item.tank_item_code)}
                              aria-label={`Select ${item.tank_item_name}`}
                            />
                          </div>
                        )}

                        {/* Actions */}
                        {(canEdit || canDelete) && (
                          <div className="absolute top-2 right-2 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            {canEdit && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => openEdit(item)}
                                title="Edit"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                            )}
                            {canDelete && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                                onClick={() => setDeleteTarget(item)}
                                title="Delete"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                        )}

                        {/* Color circle */}
                        <div className="flex flex-col items-center gap-2 pt-2">
                          <div
                            className="h-12 w-12 rounded-full border-2 border-border shadow-sm"
                            style={{ backgroundColor: hex }}
                          />
                          <span className="text-[11px] text-muted-foreground">
                            {colorName}
                          </span>
                        </div>

                        {/* Info */}
                        <div className="text-center mt-3 space-y-0.5">
                          <p className="font-mono text-xs text-muted-foreground">
                            {item.tank_item_code}
                          </p>
                          <p className="text-sm font-medium truncate">
                            {item.tank_item_name}
                          </p>
                          <p className="text-[11px] text-muted-foreground truncate">
                            {item.created_by || "—"}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            {formatDate(item.created_at)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* Pagination */}
          {!loading && (
            <Pagination
              page={page}
              totalPages={totalPages}
              totalItems={filteredItems.length}
              perPage={perPage}
              onPageChange={setPage}
            />
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={createOpen && canAdd} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Droplets className="h-5 w-5" />
              Create Tank Item
            </DialogTitle>
            <DialogDescription>
              Add a new tank item to the system
            </DialogDescription>
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
            <ColorPicker
              selectedColor={selectedColor}
              onSelect={setSelectedColor}
              customColors={customColors}
              onAddCustomColor={(c) =>
                setCustomColors((prev) => [...prev, c])
              }
              onDeleteCustomColor={handleDeleteColor}
            />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting || !tankItemCode.trim() || !selectedColor}
              >
                {submitting ? "Creating..." : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={!!deleteTarget && canDelete}
        onOpenChange={() => setDeleteTarget(null)}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Tank Item</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{" "}
              <strong>{deleteTarget?.tank_item_name}</strong>? This action
              cannot be undone.
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

      {/* Bulk Delete Confirmation Dialog */}
      <Dialog open={bulkDeleteOpen && canDelete} onOpenChange={setBulkDeleteOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete {selectedIds.size} Tank Items</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{" "}
              <strong>{selectedIds.size} tank items</strong>? This action
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setBulkDeleteOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleBulkDelete}
              disabled={bulkDeleting}
            >
              {bulkDeleting
                ? "Deleting..."
                : `Delete ${selectedIds.size} Items`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editTarget && canEdit} onOpenChange={() => setEditTarget(null)}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
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
            <ColorPicker
              selectedColor={editColor}
              onSelect={setEditColor}
              customColors={customColors}
              onAddCustomColor={(c) =>
                setCustomColors((prev) => [...prev, c])
              }
              onDeleteCustomColor={handleDeleteColor}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTarget(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleEdit}
              disabled={editing || !editColor || !editName.trim()}
            >
              {editing ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </Guard>
  );
}
