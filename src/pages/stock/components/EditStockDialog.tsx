import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Pencil, Trash2 } from "lucide-react";

import {
  updateStockStatus,
  moveStock,
  dispatchStock,
  arriveBatch,
  STATUS_CHOICES,
  type StockStatus,
  type StockStatusChoice,
} from "@/api/stockStatus";
import type { TankItem } from "@/api/tank";
import type { Vendor } from "@/api/sapSync";
import { fmtNum } from "@/lib/formatters";
import { toastApiError } from "@/lib/errors";
import { formatStatus } from "../stock-helpers";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DateInput } from "@/components/ui/date-input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
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

interface Props {
  data: StockStatus | null;
  tankItems: TankItem[];
  vendors: Vendor[];
  email: string;
  onClose: () => void;
  onSaved: () => void;
  onDelete: (row: StockStatus) => void;
}

export function EditStockDialog({ data, tankItems, vendors, email, onClose, onSaved, onDelete }: Props) {
  const [eStatus, setEStatus] = useState<StockStatusChoice>("PENDING");
  const [eRate, setERate] = useState("");
  const [eQuantity, setEQuantity] = useState("");
  const [eVehicleNumber, setEVehicleNumber] = useState("");
  const [eLocation, setELocation] = useState("");
  const [eEta, setEEta] = useState("");
  const [eTransporterName, setETransporterName] = useState("");
  const [eTransferType, setETransferType] = useState<"bulk" | "batch" | "">("");
  const [eAction, setEAction] = useState<"RETAIN" | "TOLERATE" | "DEBIT" | "">("");
  const [editing, setEditing] = useState(false);

  // Populate form when data changes
  useEffect(() => {
    if (data) {
      setEStatus(data.status);
      setERate(data.rate);
      setEQuantity(data.quantity);
      setEVehicleNumber(data.vehicle_number ?? "");
      setELocation(data.location ?? "");
      setEEta(data.eta ?? "");
      setETransporterName(data.transporter_name ?? "");
      setETransferType("");
      setEAction("");
    }
  }, [data]);

  async function handleEdit() {
    if (!data) return;
    if (!eRate.trim() || !eQuantity.trim()) {
      toast.error("Rate and quantity are required.");
      return;
    }

    const newQty = Number(eQuantity.trim());
    if (newQty <= 0) {
      toast.error("Quantity must be greater than 0.");
      return;
    }

    if (eStatus !== data.status) {
      if (eStatus !== "AT_REFINERY" && !eTransferType) {
        toast.error("Please select a Transfer Type.");
        return;
      }
      if (eStatus !== "OUT_SIDE_FACTORY" && eStatus !== "COMPLETED" && !eAction) {
        toast.error("Please select an Action.");
        return;
      }
    }

    setEditing(true);
    try {
      if (eStatus !== data.status) {
        if (eStatus === "AT_REFINERY") {
          await arriveBatch({
            stock_id: data.id,
            weighed_qty: newQty,
            destination_status: eStatus,
            action: eAction,
            created_by: email,
          });
          toast.success("Stock arrived (Arrive Batch).");
        } else if (eTransferType === "bulk") {
          await moveStock({
            stock_id: data.id,
            new_quantity: newQty,
            new_status: eStatus,
            action: eAction,
            created_by: email,
          });
          toast.success("Stock moved (Bulk).");
        } else if (eTransferType === "batch") {
          await dispatchStock({
            stock_id: data.id,
            quantity: newQty,
            destination_status: eStatus,
            action: eAction,
            created_by: email,
          });
          toast.success("Stock dispatched (Batch).");
        }
      } else {
        await updateStockStatus(data.id, {
          rate: eRate.trim(),
          quantity: eQuantity.trim(),
          vehicle_number: eVehicleNumber.trim() || undefined,
          location: eLocation.trim() || undefined,
          eta: eEta.trim() || undefined,
          transporter_name: eTransporterName.trim() || undefined,
        });
        toast.success("Stock status metadata updated.");
      }
      onClose();
      onSaved();
    } catch (err) {
      toastApiError(err, "Failed to update stock status.");
    } finally {
      setEditing(false);
    }
  }

  const vendor = vendors.find((v) => v.card_code === data?.vendor_code);

  return (
    <Dialog open={!!data} onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-lg overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-5 w-5" />
            Edit Stock Status
          </DialogTitle>
          <DialogDescription>
            Update record <strong>#{data?.id}</strong>
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-muted-foreground">Item Code</p>
              <p className="text-sm font-medium">{data?.item_code ?? "—"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Item Name</p>
              <p className="text-sm font-medium">{tankItems.find((i) => i.tank_item_code === data?.item_code)?.tank_item_name ?? "—"}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-muted-foreground">Vendor Code</p>
              <p className="text-sm font-medium">{data?.vendor_code ?? "—"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Vendor Name</p>
              <p className="text-sm font-medium">{vendor?.card_name ?? "—"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Vendor Group</p>
              <p className="text-sm font-medium">{vendor?.u_main_group ?? "—"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Vendor State</p>
              <p className="text-sm font-medium">{vendor?.state ?? "—"}</p>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Status *</Label>
            <Select value={eStatus} onValueChange={(v) => {
              const s = v as StockStatusChoice;
              setEStatus(s);
              if (s !== data?.status) {
                 if (s === "OUT_SIDE_FACTORY" || s === "ON_THE_WAY" || s === "MUNDRA_PORT" || s === "COMPLETED") {
                   setETransferType("bulk");
                 } else if (s === "UNDER_LOADING" || s === "OTW_TO_REFINERY") {
                   setETransferType("batch");
                 } else {
                   setETransferType("");
                 }

                 if (s === "MUNDRA_PORT" || s === "OUT_SIDE_FACTORY" || s === "COMPLETED") {
                   setEAction("TOLERATE");
                 } else {
                   setEAction("");
                 }
              }
            }}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_CHOICES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {formatStatus(s)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {eStatus !== data?.status && (
            <>
              {eStatus !== "AT_REFINERY" &&
               eStatus !== "OUT_SIDE_FACTORY" &&
               eStatus !== "ON_THE_WAY" &&
               eStatus !== "MUNDRA_PORT" &&
               eStatus !== "UNDER_LOADING" &&
               eStatus !== "OTW_TO_REFINERY" &&
               eStatus !== "COMPLETED" && (
                <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                  <Label>Transfer Type *</Label>
                  <Select value={eTransferType} onValueChange={(v) => setETransferType(v as "bulk" | "batch")}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select transfer type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bulk">Bulk</SelectItem>
                      <SelectItem value="batch">Batch</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {eStatus !== "OUT_SIDE_FACTORY" && eStatus !== "COMPLETED" && (eTransferType || eStatus === "AT_REFINERY" || eStatus === "ON_THE_WAY" || eStatus === "MUNDRA_PORT" || eStatus === "UNDER_LOADING" || eStatus === "OTW_TO_REFINERY") && (
                <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                  <Label>Action *</Label>
                  <Select value={eAction} onValueChange={(v) => setEAction(v as any)}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select action" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="RETAIN">Retain</SelectItem>
                      <SelectItem value="TOLERATE">Tolerate</SelectItem>
                      <SelectItem value="DEBIT">Debit</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </>
          )}

          <Separator />
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="e-rate">Rate (&#8377;) *</Label>
              <Input
                id="e-rate"
                type="number"
                min={0}
                step="0.01"
                value={eRate}
                onChange={(e) => setERate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="e-qty">Quantity (KG) *</Label>
              <Input
                id="e-qty"
                type="number"
                min={0}
                step="0.01"
                value={eQuantity}
                onChange={(e) => setEQuantity(e.target.value)}
              />
              {data && eQuantity && Number(eQuantity) !== Number(data.quantity) && (
                <p className={`text-xs font-medium mt-1.5 ${Number(data.quantity) - Number(eQuantity) > 0 ? "text-emerald-600" : "text-destructive"}`}>
                  Difference: {Number(data.quantity) - Number(eQuantity) > 0 ? "+" : ""}{fmtNum(Number(data.quantity) - Number(eQuantity))} KG
                </p>
              )}
            </div>
          </div>
          <Separator />
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="e-vehicle">Vehicle Number</Label>
              <Input
                id="e-vehicle"
                placeholder="e.g. GJ-05-AB-1234"
                value={eVehicleNumber}
                onChange={(e) => setEVehicleNumber(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="e-transporter">Transporter Name</Label>
              <Input
                id="e-transporter"
                placeholder="e.g. ABC Logistics"
                value={eTransporterName}
                onChange={(e) => setETransporterName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="e-location">Location</Label>
              <Input
                id="e-location"
                placeholder="e.g. Mundra Port"
                value={eLocation}
                onChange={(e) => setELocation(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="e-eta">ETA</Label>
              <DateInput
                id="e-eta"
                value={eEta}
                onChange={(e) => setEEta(e.target.value)}
              />
            </div>
          </div>
        </div>
        <DialogFooter className="flex-row justify-between sm:justify-between">
          <Button
            variant="destructive"
            className="gap-1.5"
            onClick={() => {
              if (data) {
                onDelete(data);
              }
            }}
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={handleEdit}
              disabled={editing || !eQuantity.trim()}
            >
              {editing ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
