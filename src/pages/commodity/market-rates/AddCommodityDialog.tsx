import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Check, X } from "lucide-react";

import {
  createCommodity,
  updateCommodity,
  deleteCommodity,
  type CommodityMargin,
} from "@/api/marketRate";
import { toastApiError } from "@/lib/errors";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

interface AddCommodityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  commodities: CommodityMargin[];
  /** true when the backend exposes commodity `id` (required for edit/delete) */
  idsAvailable: boolean;
  createdBy: string;
  onSaved: () => void;
}

interface RowDraft { margin: string; freight: string }

/**
 * Manage commodities: create new ones and edit/delete existing ones via
 * POST / PATCH / DELETE /rates/commodity/.
 */
export function AddCommodityDialog({ open, onOpenChange, commodities, idsAvailable, createdBy, onSaved }: AddCommodityDialogProps) {
  // Create form
  const [name, setName] = useState("");
  const [margin, setMargin] = useState("");
  const [freight, setFreight] = useState("");
  const [creating, setCreating] = useState(false);

  // Per-commodity edit drafts + row-level busy/confirm state
  const [drafts, setDrafts] = useState<Record<number, RowDraft>>({});
  const [busyId, setBusyId] = useState<number | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  // Reset drafts whenever the dialog opens or the commodity list changes.
  useEffect(() => {
    if (!open) return;
    const next: Record<number, RowDraft> = {};
    for (const c of commodities) {
      if (c.id != null) {
        next[c.id] = {
          margin: c.margin_rate != null ? String(c.margin_rate) : "",
          freight: c.freight_rate != null ? String(c.freight_rate) : "",
        };
      }
    }
    setDrafts(next);
    setConfirmDeleteId(null);
  }, [open, commodities]);

  async function handleCreate() {
    if (!name.trim()) { toast.error("Commodity name is required."); return; }
    setCreating(true);
    try {
      await createCommodity({
        commodity: name.trim(),
        margin: margin.trim() === "" ? null : Number(margin).toFixed(2),
        freight_rate: freight.trim() === "" ? null : Number(freight).toFixed(2),
        created_by: createdBy,
      });
      toast.success(`Commodity "${name.trim()}" created.`);
      setName("");
      setMargin("");
      setFreight("");
      onSaved();
    } catch (err) {
      toastApiError(err, "Failed to create commodity.");
    } finally {
      setCreating(false);
    }
  }

  async function handleUpdate(id: number) {
    const d = drafts[id];
    if (!d) return;
    if (d.margin.trim() !== "" && (!Number.isFinite(Number(d.margin)) || Number(d.margin) < 0)) {
      toast.error("Margin must be a positive number."); return;
    }
    if (d.freight.trim() !== "" && (!Number.isFinite(Number(d.freight)) || Number(d.freight) < 0)) {
      toast.error("Freight must be a positive number."); return;
    }
    setBusyId(id);
    try {
      await updateCommodity(id, {
        margin: d.margin.trim() === "" ? null : Number(d.margin).toFixed(2),
        freight_rate: d.freight.trim() === "" ? null : Number(d.freight).toFixed(2),
      });
      toast.success("Commodity updated.");
      onSaved();
    } catch (err) {
      toastApiError(err, "Failed to update commodity.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(id: number) {
    setBusyId(id);
    try {
      await deleteCommodity(id);
      toast.success("Commodity deleted.");
      setConfirmDeleteId(null);
      onSaved();
    } catch (err) {
      toastApiError(err, "Failed to delete commodity.");
    } finally {
      setBusyId(null);
    }
  }

  function setDraft(id: number, patch: Partial<RowDraft>) {
    setDrafts((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85dvh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Manage Commodities</DialogTitle>
          <DialogDescription>Create commodities and update their margin / freight, or delete them.</DialogDescription>
        </DialogHeader>

        {/* Create form */}
        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="mr-new-name">Commodity Name</Label>
            <Input id="mr-new-name" placeholder="e.g. Soya DO" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="mr-new-margin">Margin (optional)</Label>
              <Input id="mr-new-margin" type="number" step="0.01" placeholder="e.g. 5.00" value={margin} onChange={(e) => setMargin(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mr-new-freight">Freight (optional)</Label>
              <Input id="mr-new-freight" type="number" step="0.01" placeholder="e.g. 3.00" value={freight} onChange={(e) => setFreight(e.target.value)} />
            </div>
          </div>
          <Button className="w-full gap-1.5" onClick={handleCreate} disabled={creating}>
            <Plus className="h-4 w-4" />
            {creating ? "Creating..." : "Add Commodity"}
          </Button>
        </div>

        <Separator />

        {/* Existing commodities */}
        <div className="flex-1 overflow-y-auto -mx-1 px-1">
          <div className="flex items-center gap-2 mb-2">
            <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Existing Commodities ({commodities.length})
            </p>
          </div>

          {!idsAvailable && commodities.length > 0 ? (
            <p className="text-xs text-amber-600 dark:text-amber-400 py-2">
              The commodity API does not return <strong>id</strong> yet — editing and deleting are disabled until it does.
            </p>
          ) : commodities.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No commodities yet.</p>
          ) : (
            <div className="space-y-2">
              {/* Column labels */}
              <div className="grid grid-cols-[1fr_5rem_5rem_auto] items-center gap-2 px-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                <span>Commodity</span>
                <span className="text-right">Margin</span>
                <span className="text-right">Freight</span>
                <span className="text-right">Actions</span>
              </div>
              {commodities.map((c) => {
                const id = c.id;
                if (id == null) return null;
                const d = drafts[id] ?? { margin: "", freight: "" };
                const busy = busyId === id;
                const confirming = confirmDeleteId === id;
                return (
                  <div key={id} className="grid grid-cols-[1fr_5rem_5rem_auto] items-center gap-2 rounded-lg border px-2 py-1.5">
                    <span className="text-sm font-medium truncate" title={c.commodity}>{c.commodity}</span>
                    <Input
                      type="number"
                      step="0.01"
                      min={0}
                      value={d.margin}
                      onChange={(e) => setDraft(id, { margin: e.target.value })}
                      className="h-8 text-right tabular-nums px-2"
                      placeholder="—"
                    />
                    <Input
                      type="number"
                      step="0.01"
                      min={0}
                      value={d.freight}
                      onChange={(e) => setDraft(id, { freight: e.target.value })}
                      className="h-8 text-right tabular-nums px-2"
                      placeholder="—"
                    />
                    <div className="flex items-center justify-end gap-1">
                      {confirming ? (
                        <>
                          <Button size="icon" variant="destructive" className="h-8 w-8" disabled={busy} onClick={() => handleDelete(id)} title="Confirm delete">
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setConfirmDeleteId(null)} title="Cancel">
                            <X className="h-4 w-4" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button size="icon" variant="ghost" className="h-8 w-8" disabled={busy} onClick={() => handleUpdate(id)} title="Save changes">
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-red-500 hover:text-red-600" disabled={busy} onClick={() => setConfirmDeleteId(id)} title="Delete commodity">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
