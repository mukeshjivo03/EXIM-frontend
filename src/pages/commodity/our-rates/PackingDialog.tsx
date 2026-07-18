import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Box, Package, Pencil, Plus, Trash2, X } from "lucide-react";

import {
  createPackingMargin,
  createPackSize,
  deletePackingMargin,
  deletePackSize,
  getPackSizes,
  updatePackSize,
  type CommodityMargin,
  type PackingMargin,
  type PackSize,
} from "@/api/marketRate";
import { toastApiError } from "@/lib/errors";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { fmtINR } from "./helpers";

interface PackingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  packings: PackingMargin[];
  commodities: CommodityMargin[];
  createdBy: string;
  onSaved: () => void;
}

/**
 * Packaging setup: packing margins (POST /rates/packing/) and pack size
 * definitions (POST /rates/pack-size/) that drive the Jivo rate table.
 */
export function PackingDialog({ open, onOpenChange, packings, commodities, createdBy, onSaved }: PackingDialogProps) {
  // Packing margin form
  const [name, setName] = useState("");
  const [margin, setMargin] = useState("");
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // Pack sizes
  const [packSizes, setPackSizes] = useState<PackSize[]>([]);
  const [sizesLoading, setSizesLoading] = useState(false);
  const [sizeName, setSizeName] = useState("");
  const [sizePacking, setSizePacking] = useState("");
  const [sizeUnit, setSizeUnit] = useState<"kg" | "ltr">("kg");
  const [sizeFactor, setSizeFactor] = useState("");
  const [sizeCommodities, setSizeCommodities] = useState<Set<number>>(new Set());
  const [sizeOrder, setSizeOrder] = useState("");
  const [creatingSize, setCreatingSize] = useState(false);
  const [deletingSizeId, setDeletingSizeId] = useState<number | null>(null);
  const [editingSize, setEditingSize] = useState<PackSize | null>(null);

  async function loadPackSizes() {
    setSizesLoading(true);
    try {
      const data = await getPackSizes();
      setPackSizes([...data].sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0)));
    } catch {
      /* non-critical — section shows empty */
    } finally {
      setSizesLoading(false);
    }
  }

  useEffect(() => {
    if (open) {
      resetSizeForm();
      void loadPackSizes();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const commodityNameById = new Map(
    commodities.filter((c) => c.id != null).map((c) => [c.id as number, c.commodity])
  );

  /* ── packing margins ───────────────────────────────────── */

  async function handleCreate() {
    if (!name.trim()) { toast.error("Packing name is required."); return; }
    if (margin.trim() === "" || !Number.isFinite(Number(margin)) || Number(margin) < 0) {
      toast.error("Enter a valid packing margin.");
      return;
    }
    setCreating(true);
    try {
      await createPackingMargin({
        packing_name: name.trim(),
        packing_margin: Number(margin).toFixed(2),
        // NOTE: backend limits created_by to 10 chars on PackingMargins
        created_by: createdBy.slice(0, 10),
      });
      toast.success(`Packing "${name.trim()}" added.`);
      setName("");
      setMargin("");
      onSaved();
    } catch (err) {
      toastApiError(err, "Failed to add packing.");
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(id: number, packingName: string) {
    setDeletingId(id);
    try {
      await deletePackingMargin(id);
      toast.success(`Packing "${packingName}" deleted.`);
      onSaved();
    } catch (err) {
      toastApiError(err, "Failed to delete packing.");
    } finally {
      setDeletingId(null);
    }
  }

  /* ── pack sizes ────────────────────────────────────────── */

  function toggleSizeCommodity(id: number) {
    setSizeCommodities((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function resetSizeForm() {
    setEditingSize(null);
    setSizeName("");
    setSizePacking("");
    setSizeUnit("kg");
    setSizeFactor("");
    setSizeOrder("");
    setSizeCommodities(new Set());
  }

  function startEditSize(s: PackSize) {
    setEditingSize(s);
    setSizeName(s.name);
    setSizePacking(s.packing != null ? String(s.packing) : "");
    setSizeUnit(s.unit === "ltr" ? "ltr" : "kg");
    setSizeFactor(String(Number(s.conversion_factor)));
    setSizeOrder(String(s.display_order ?? ""));
    setSizeCommodities(new Set(s.commodities ?? []));
  }

  async function handleSubmitSize() {
    if (!sizeName.trim()) { toast.error("Pack size name is required."); return; }
    if (!sizePacking) { toast.error("Select a packing type."); return; }
    if (sizeFactor.trim() === "" || !Number.isFinite(Number(sizeFactor)) || Number(sizeFactor) <= 0) {
      toast.error("Enter a valid conversion factor (pack size in kg/ltr).");
      return;
    }
    if (sizeCommodities.size === 0) { toast.error("Select at least one commodity."); return; }

    const payload = {
      name: sizeName.trim(),
      packing: Number(sizePacking),
      unit: sizeUnit,
      conversion_factor: Number(sizeFactor),
      commodities: Array.from(sizeCommodities),
      display_order: sizeOrder.trim() !== "" && Number.isFinite(Number(sizeOrder))
        ? Number(sizeOrder)
        : editingSize?.display_order ?? packSizes.length + 1,
      created_by: createdBy,
    };

    setCreatingSize(true);
    try {
      if (editingSize?.id != null) {
        await updatePackSize(editingSize.id, payload);
        toast.success(`Pack size "${payload.name}" updated.`);
      } else {
        await createPackSize(payload);
        toast.success(`Pack size "${payload.name}" added.`);
      }
      resetSizeForm();
      await loadPackSizes();
      onSaved(); // rate table depends on pack sizes
    } catch (err) {
      toastApiError(err, editingSize ? "Failed to update pack size." : "Failed to add pack size.");
    } finally {
      setCreatingSize(false);
    }
  }

  async function handleDeleteSize(id: number, label: string) {
    setDeletingSizeId(id);
    try {
      await deletePackSize(id);
      toast.success(`Pack size "${label}" deleted.`);
      if (editingSize?.id === id) resetSizeForm();
      await loadPackSizes();
      onSaved();
    } catch (err) {
      toastApiError(err, "Failed to delete pack size.");
    } finally {
      setDeletingSizeId(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Packaging Setup
          </DialogTitle>
          <DialogDescription>
            Packing margins feed the basic price; pack sizes drive the Jivo rate table.
          </DialogDescription>
        </DialogHeader>

        {/* ── Packing margins ── */}
        <div className="space-y-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
            <Package className="h-3 w-3" /> Packing Margins
          </p>
          <div className="space-y-2 max-h-[20dvh] overflow-y-auto">
            {packings.length === 0 ? (
              <p className="text-sm text-muted-foreground py-3 text-center">No packing types yet.</p>
            ) : (
              packings.map((p, idx) => (
                <div key={p.id ?? `${p.packing_name}-${idx}`} className="flex items-center gap-3 rounded-lg border px-3 py-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold truncate capitalize">{p.packing_name}</p>
                    <p className="text-[11px] text-muted-foreground tabular-nums">Margin ₹{fmtINR(Number(p.packing_margin))}</p>
                  </div>
                  {p.id != null && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      disabled={deletingId === p.id}
                      onClick={() => handleDelete(p.id as number, p.packing_name)}
                      title="Delete packing"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              ))
            )}
          </div>
          <div className="rounded-xl border bg-muted/20 p-3 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="pk-name" className="text-xs">Name *</Label>
                <Input id="pk-name" placeholder="e.g. Bottle" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pk-margin" className="text-xs">Margin (₹) *</Label>
                <Input
                  id="pk-margin"
                  type="number"
                  min={0}
                  step="0.01"
                  placeholder="e.g. 14.00"
                  value={margin}
                  onChange={(e) => setMargin(e.target.value)}
                />
              </div>
            </div>
            <Button size="sm" className="gap-1.5 w-full" onClick={handleCreate} disabled={creating}>
              <Plus className="h-3.5 w-3.5" />
              {creating ? "Adding..." : "Add Packing"}
            </Button>
          </div>
        </div>

        {/* ── Pack sizes ── */}
        <div className="space-y-3 pt-2 border-t">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
            <Box className="h-3 w-3" /> Pack Sizes
          </p>
          <div className="space-y-2 max-h-[20dvh] overflow-y-auto">
            {sizesLoading && packSizes.length === 0 ? (
              <p className="text-sm text-muted-foreground py-3 text-center">Loading...</p>
            ) : packSizes.length === 0 ? (
              <p className="text-sm text-muted-foreground py-3 text-center">No pack sizes yet.</p>
            ) : (
              packSizes.map((s, idx) => (
                <div
                  key={s.id ?? `${s.name}-${idx}`}
                  className={cn(
                    "flex items-center gap-3 rounded-lg border px-3 py-2",
                    editingSize?.id != null && editingSize.id === s.id && "border-primary bg-primary/5"
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold truncate capitalize">{s.name}</p>
                    <p className="text-[11px] text-muted-foreground tabular-nums truncate">
                      {Number(s.conversion_factor)} {s.unit} · order {s.display_order}
                      {s.commodities?.length > 0 &&
                        ` · ${s.commodities.map((id) => commodityNameById.get(id) ?? `#${id}`).join(", ")}`}
                    </p>
                  </div>
                  {s.id != null && (
                    <>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-primary"
                        onClick={() => startEditSize(s)}
                        title="Edit pack size"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        disabled={deletingSizeId === s.id}
                        onClick={() => handleDeleteSize(s.id as number, s.name)}
                        title="Delete pack size"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </>
                  )}
                </div>
              ))
            )}
          </div>

          <div className={cn("rounded-xl border p-3 space-y-3", editingSize ? "border-primary/50 bg-primary/5" : "bg-muted/20")}>
            {editingSize && (
              <div className="flex items-center justify-between gap-2">
                <p className="text-[10px] font-bold uppercase tracking-widest text-primary">
                  Editing "{editingSize.name}"
                </p>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-muted-foreground"
                  onClick={resetSizeForm}
                  title="Cancel edit"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5 col-span-2">
                <Label htmlFor="ps-name" className="text-xs">Name *</Label>
                <Input
                  id="ps-name"
                  placeholder='e.g. "Pouch 750 Gm"'
                  value={sizeName}
                  onChange={(e) => setSizeName(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Packing *</Label>
                <Select value={sizePacking} onValueChange={setSizePacking}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select packing" />
                  </SelectTrigger>
                  <SelectContent>
                    {packings.filter((p) => p.id != null).map((p) => (
                      <SelectItem key={p.id} value={String(p.id)}>
                        {p.packing_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Unit *</Label>
                <Select value={sizeUnit} onValueChange={(v) => setSizeUnit(v as "kg" | "ltr")}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="kg">Kg</SelectItem>
                    <SelectItem value="ltr">Ltr</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ps-factor" className="text-xs">Size ({sizeUnit}) *</Label>
                <Input
                  id="ps-factor"
                  type="number"
                  min={0}
                  step="0.01"
                  placeholder="e.g. 0.75"
                  value={sizeFactor}
                  onChange={(e) => setSizeFactor(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ps-order" className="text-xs">Display Order</Label>
                <Input
                  id="ps-order"
                  type="number"
                  min={1}
                  step="1"
                  placeholder={`auto (${packSizes.length + 1})`}
                  value={sizeOrder}
                  onChange={(e) => setSizeOrder(e.target.value)}
                />
              </div>
            </div>

            {/* Commodity multi-select pills */}
            <div className="space-y-1.5">
              <Label className="text-xs">Commodities *</Label>
              {commodities.filter((c) => c.id != null).length === 0 ? (
                <p className="text-xs text-muted-foreground">No commodities available.</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {commodities.filter((c) => c.id != null).map((c) => {
                    const id = c.id as number;
                    const active = sizeCommodities.has(id);
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => toggleSizeCommodity(id)}
                        className={cn(
                          "rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors capitalize",
                          active
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border bg-muted/30 text-muted-foreground hover:bg-muted/60"
                        )}
                      >
                        {c.commodity}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <Button
              size="sm"
              variant={editingSize ? "default" : "secondary"}
              className="gap-1.5 w-full"
              onClick={handleSubmitSize}
              disabled={creatingSize}
            >
              {editingSize ? <Pencil className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
              {creatingSize
                ? (editingSize ? "Updating..." : "Adding...")
                : (editingSize ? "Update Pack Size" : "Add Pack Size")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
