import { useEffect, useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import { AlertCircle, Check, Plus } from "lucide-react";

import {
  addMarketRate,
  createCommodity,
  type CommodityMargin,
  type MarketRate,
} from "@/api/marketRate";
import { toastApiError } from "@/lib/errors";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { fmtINR } from "./CommodityCard";

interface RateLogDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  commodities: CommodityMargin[];
  todayByCommodity: Map<number, MarketRate>;
  /** most recent logged rate per commodity — used as placeholder/hint */
  latestByCommodity: Map<number, MarketRate>;
  idsAvailable: boolean;
  loading: boolean;
  createdBy: string;
  onSaved: () => void;
}

/**
 * Modal for logging/updating today's factory rates: one input per commodity,
 * saved via POST /rates/market-rate/add/ (one request per filled row).
 */
export function RateLogDialog({
  open, onOpenChange, commodities, todayByCommodity, latestByCommodity, idsAvailable, loading, createdBy, onSaved,
}: RateLogDialogProps) {
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const [saving, setSaving] = useState(false);

  // Add-commodity sub-dialog
  const [addOpen, setAddOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newMargin, setNewMargin] = useState("");
  const [creating, setCreating] = useState(false);

  // Fresh inputs every time the modal opens
  useEffect(() => {
    if (open) setDrafts({});
  }, [open]);

  const pendingCount = useMemo(
    () => Object.values(drafts).filter((v) => v.trim() !== "").length,
    [drafts]
  );

  async function handleSaveAll() {
    const entries = Object.entries(drafts).filter(([, v]) => v.trim() !== "");
    if (entries.length === 0) {
      toast.error("Enter at least one factory rate.");
      return;
    }
    const invalid = entries.find(([, v]) => !Number.isFinite(Number(v)) || Number(v) <= 0);
    if (invalid) {
      toast.error("Factory rates must be positive numbers.");
      return;
    }
    setSaving(true);
    const results = await Promise.allSettled(
      entries.map(([commodityId, factoryKg]) =>
        addMarketRate({
          commodity: Number(commodityId),
          factory_kg: Number(factoryKg).toFixed(2),
          created_by: createdBy,
        })
      )
    );
    setSaving(false);
    const ok = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.length - ok;
    if (ok > 0) {
      toast.success(`Logged ${ok} rate${ok === 1 ? "" : "s"}.`);
      setDrafts({});
      onSaved();
      if (failed === 0) onOpenChange(false);
    }
    if (failed > 0) {
      const firstError = results.find((r): r is PromiseRejectedResult => r.status === "rejected");
      toastApiError(firstError?.reason, `${failed} rate${failed === 1 ? "" : "s"} failed to save.`);
    }
  }

  async function handleCreateCommodity() {
    if (!newName.trim()) { toast.error("Commodity name is required."); return; }
    setCreating(true);
    try {
      await createCommodity({
        commodity: newName.trim(),
        margin_rate: newMargin.trim() === "" ? null : Number(newMargin).toFixed(2),
        created_by: createdBy,
      });
      toast.success(`Commodity "${newName.trim()}" created.`);
      setAddOpen(false);
      setNewName("");
      setNewMargin("");
      onSaved();
    } catch (err) {
      toastApiError(err, "Failed to create commodity.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-2xl max-h-[85dvh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Log Today's Factory Rates</DialogTitle>
            <DialogDescription>
              Enter the factory ₹/Kg per commodity for {format(new Date(), "d MMM yyyy")} — packing, GST and per-litre
              prices are computed automatically.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto -mx-1 px-1 space-y-3">
            {!idsAvailable && commodities.length > 0 && (
              <div className="flex items-center gap-3 rounded-xl border border-amber-200 dark:border-amber-800/40 bg-amber-50/50 dark:bg-amber-950/20 px-4 py-3">
                <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <p className="text-xs font-medium text-amber-700 dark:text-amber-300">
                  The commodity API does not return <strong>id</strong> yet, so rates cannot be linked to commodities.
                  Add <code>id</code> to the backend serializers to enable logging.
                </p>
              </div>
            )}

            {loading && commodities.length === 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 rounded-xl" />
                ))}
              </div>
            ) : commodities.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">
                No commodities configured yet — use <strong>Add Commodity</strong> to create the first one.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {commodities.map((c, idx) => {
                  const id = c.id;
                  const logged = id != null ? todayByCommodity.get(id) : undefined;
                  const last = id != null ? latestByCommodity.get(id) : undefined;
                  const disabled = id == null;
                  return (
                    <div
                      key={id ?? `${c.commodity}-${idx}`}
                      className={cn(
                        "rounded-xl border px-3 py-2.5 flex items-center gap-3",
                        logged
                          ? "border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/40 dark:bg-emerald-950/10"
                          : "border-border"
                      )}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold truncate">{c.commodity}</p>
                        {logged ? (
                          <p className="text-[11px] text-emerald-700 dark:text-emerald-400 tabular-nums">
                            Logged today · ₹{fmtINR(Number(logged.factory_kg))}
                          </p>
                        ) : last ? (
                          <p className="text-[11px] text-muted-foreground tabular-nums">
                            Last ₹{fmtINR(Number(last.factory_kg))} · {format(parseISO(last.date), "d MMM")}
                          </p>
                        ) : (
                          <p className="text-[11px] text-muted-foreground">Never logged</p>
                        )}
                      </div>
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        placeholder={last ? Number(last.factory_kg).toFixed(2) : "₹/Kg"}
                        disabled={disabled}
                        title={disabled ? "Backend must expose commodity id first" : undefined}
                        className="w-28 text-right tabular-nums"
                        value={id != null ? drafts[id] ?? "" : ""}
                        onChange={(e) => {
                          if (id == null) return;
                          const v = e.target.value;
                          setDrafts((prev) => ({ ...prev, [id]: v }));
                        }}
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" className="gap-1.5 sm:mr-auto" onClick={() => setAddOpen(true)}>
              <Plus className="h-3.5 w-3.5" />
              Add Commodity
            </Button>
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button className="gap-1.5 btn-press" onClick={handleSaveAll} disabled={saving || pendingCount === 0}>
              <Check className="h-4 w-4" />
              {saving ? "Saving..." : `Log Rates${pendingCount > 0 ? ` (${pendingCount})` : ""}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Commodity sub-dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Add Commodity</DialogTitle>
            <DialogDescription>Create a commodity to log market rates against.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="mr-new-name">Commodity Name *</Label>
              <Input id="mr-new-name" placeholder="e.g. Soya DO" value={newName} onChange={(e) => setNewName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mr-new-margin">Margin Rate (optional)</Label>
              <Input
                id="mr-new-margin"
                type="number"
                step="0.01"
                placeholder="e.g. 0.50"
                value={newMargin}
                onChange={(e) => setNewMargin(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateCommodity} disabled={creating}>
              {creating ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
