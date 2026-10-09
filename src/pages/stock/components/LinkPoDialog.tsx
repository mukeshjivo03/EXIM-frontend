import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Link2 } from "lucide-react";

import { patchStockStatus, type StockStatus } from "@/api/stockStatus";
import { toastApiError } from "@/lib/errors";
import { formatStatus } from "../stock-helpers";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/** Statuses whose stock entries can be linked to a PO number. */
export const PO_LINKABLE_STATUSES = ["UNDER_LOADING", "ON_THE_WAY", "OUT_SIDE_FACTORY"] as const;

export function isPoLinkableStatus(status: string) {
  return (PO_LINKABLE_STATUSES as readonly string[]).includes(status);
}

export function canLinkPo(row: StockStatus) {
  return isPoLinkableStatus(row.status);
}

interface Props {
  data: StockStatus | null;
  onClose: () => void;
  onSaved: () => Promise<unknown> | void;
}

export function LinkPoDialog({ data, onClose, onSaved }: Props) {
  const [poNumber, setPoNumber] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (data) setPoNumber(data.po_number ?? "");
  }, [data]);

  async function handleSave() {
    if (!data) return;
    setSaving(true);
    try {
      await patchStockStatus(data.id, { po_number: poNumber.trim() || null });
      toast.success(poNumber.trim() ? `Linked to PO ${poNumber.trim()}.` : "PO number removed.");
      onClose();
      await onSaved();
    } catch (err) {
      toastApiError(err, "Failed to link PO number.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={!!data} onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            Link PO Number
          </DialogTitle>
          <DialogDescription>
            Record <strong>#{data?.id}</strong>
            {data && <> · {data.item_name ?? data.item_code} · {formatStatus(data.status)}</>}
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-2"
          onSubmit={(e) => {
            e.preventDefault();
            handleSave();
          }}
        >
          <Label htmlFor="link-po">PO Number</Label>
          <Input
            id="link-po"
            autoFocus
            placeholder="e.g. 24001234"
            value={poNumber}
            onChange={(e) => setPoNumber(e.target.value)}
          />
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || poNumber.trim() === (data?.po_number ?? "")}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
