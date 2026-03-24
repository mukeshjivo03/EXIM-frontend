import { useState } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

import { softDeleteStockStatus, type StockStatus } from "@/api/stockStatus";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Props {
  data: StockStatus | null;
  onClose: () => void;
  onDeleted: () => void;
}

export function DeleteStockDialog({ data, onClose, onDeleted }: Props) {
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!data) return;
    setDeleting(true);
    try {
      await softDeleteStockStatus(data);
      toast.success("Stock status deleted.");
      onClose();
      onDeleted();
    } catch {
      toast.error("Failed to delete stock status.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Dialog open={!!data} onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-destructive" />
            Delete Stock Status
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to delete record <strong>#{data?.id}</strong>? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
            {deleting ? "Deleting..." : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
