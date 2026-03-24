import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { ClipboardList, X } from "lucide-react";

import { createStockStatus, STATUS_CHOICES, type StockStatusChoice } from "@/api/stockStatus";
import type { TankItem } from "@/api/tank";
import type { Vendor } from "@/api/sapSync";
import { toastApiError } from "@/lib/errors";
import { formatStatus } from "../stock-helpers";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DateInput } from "@/components/ui/date-input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tankItems: TankItem[];
  vendors: Vendor[];
  email: string;
  onCreated: () => void;
}

export function CreateStockDialog({ open, onOpenChange, tankItems, vendors, email, onCreated }: Props) {
  const [cItemCode, setCItemCode] = useState("");
  const [cItemSearch, setCItemSearch] = useState("");
  const [cItemOpen, setCItemOpen] = useState(false);
  const cItemRef = useRef<HTMLDivElement>(null);
  const [cStatus, setCStatus] = useState<StockStatusChoice>("PENDING");
  const [cVendorCode, setCVendorCode] = useState("");
  const [cVendorSearch, setCVendorSearch] = useState("");
  const [cVendorOpen, setCVendorOpen] = useState(false);
  const cVendorRef = useRef<HTMLDivElement>(null);
  const [cRate, setCRate] = useState("");
  const [cQuantity, setCQuantity] = useState("");
  const [cVehicleNumber, setCVehicleNumber] = useState("");
  const [cLocation, setCLocation] = useState("");
  const [cEta, setCEta] = useState("");
  const [cTransporterName, setCTransporterName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Reset form when opened
  useEffect(() => {
    if (open) {
      setCItemCode("");
      setCItemSearch("");
      setCItemOpen(false);
      setCStatus("PENDING");
      setCVendorCode("");
      setCVendorSearch("");
      setCVendorOpen(false);
      setCRate("");
      setCQuantity("");
      setCVehicleNumber("");
      setCLocation("");
      setCEta("");
      setCTransporterName("");
    }
  }, [open]);

  // Click-outside to close omnisearch dropdowns
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (cItemRef.current && !cItemRef.current.contains(e.target as Node)) setCItemOpen(false);
      if (cVendorRef.current && !cVendorRef.current.contains(e.target as Node)) setCVendorOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const filteredItems = useMemo(() => {
    const q = cItemSearch.toLowerCase();
    if (!q) return tankItems;
    return tankItems.filter(
      (i) => i.tank_item_code.toLowerCase().includes(q) || i.tank_item_name.toLowerCase().includes(q)
    );
  }, [tankItems, cItemSearch]);

  const filteredVendors = useMemo(() => {
    const q = cVendorSearch.toLowerCase();
    if (!q) return vendors;
    return vendors.filter(
      (v) => v.card_code.toLowerCase().includes(q) || v.card_name.toLowerCase().includes(q)
    );
  }, [vendors, cVendorSearch]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!cItemCode || !cVendorCode || !cRate.trim() || !cQuantity.trim()) {
      toast.error("All fields are required.");
      return;
    }
    const total = Number(cRate.trim()) * Number(cQuantity.trim());
    if (total >= 1e10) {
      toast.error("Total value (rate × quantity) is too large. Maximum allowed is 9,999,999,999.99.");
      return;
    }
    setSubmitting(true);
    try {
      await createStockStatus({
        item_code: cItemCode,
        status: cStatus,
        vendor_code: cVendorCode,
        rate: cRate.trim(),
        quantity: cQuantity.trim(),
        created_by: email,
        vehicle_number: cVehicleNumber.trim() || undefined,
        location: cLocation.trim() || undefined,
        eta: cEta.trim() || undefined,
        transporter_name: cTransporterName.trim() || undefined,
      });
      toast.success("Stock status created.");
      onOpenChange(false);
      onCreated();
    } catch (err) {
      toastApiError(err, "Failed to create stock status.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            Add Stock Status
          </DialogTitle>
          <DialogDescription>Create a new stock status entry.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="space-y-2">
            <Label>Item Code *</Label>
            <div className="relative" ref={cItemRef}>
              <Input
                placeholder="Search item code..."
                value={cItemSearch}
                onChange={(e) => {
                  setCItemSearch(e.target.value);
                  setCItemOpen(true);
                  if (!e.target.value) setCItemCode("");
                }}
                onFocus={() => setCItemOpen(true)}
              />
              {cItemCode && !cItemOpen && (
                <div className="mt-1 flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">
                    {cItemCode}
                  </Badge>
                  <button
                    type="button"
                    className="text-muted-foreground hover:text-foreground"
                    onClick={() => { setCItemCode(""); setCItemSearch(""); }}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )}
              {cItemOpen && (
                <div className="absolute z-50 mt-1 w-full max-h-48 overflow-auto rounded-md border bg-popover shadow-md">
                  {filteredItems.length === 0 ? (
                    <div className="px-3 py-2 text-sm text-muted-foreground">No items found</div>
                  ) : (
                    filteredItems.map((item) => (
                      <button
                        key={item.tank_item_code}
                        type="button"
                        className={`w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors ${cItemCode === item.tank_item_code ? "bg-accent font-medium" : ""}`}
                        onClick={() => {
                          setCItemCode(item.tank_item_code);
                          setCItemSearch(item.tank_item_code);
                          setCItemOpen(false);
                        }}
                      >
                        {item.tank_item_code}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="space-y-2">
            <Label>Status *</Label>
            <Select value={cStatus} onValueChange={(v) => setCStatus(v as StockStatusChoice)}>
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
          <div className="space-y-2">
            <Label>Vendor *</Label>
            <div className="relative" ref={cVendorRef}>
              <Input
                placeholder="Search vendor code or name..."
                value={cVendorSearch}
                onChange={(e) => {
                  setCVendorSearch(e.target.value);
                  setCVendorOpen(true);
                  if (!e.target.value) setCVendorCode("");
                }}
                onFocus={() => setCVendorOpen(true)}
              />
              {cVendorCode && !cVendorOpen && (
                <div className="mt-1 flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs whitespace-normal">
                    {cVendorCode} - {vendors.find((v) => v.card_code === cVendorCode)?.card_name}
                  </Badge>
                  <button
                    type="button"
                    className="text-muted-foreground hover:text-foreground shrink-0"
                    onClick={() => { setCVendorCode(""); setCVendorSearch(""); }}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )}
              {cVendorOpen && (
                <div className="absolute z-50 mt-1 w-full max-h-48 overflow-auto rounded-md border bg-popover shadow-md">
                  {filteredVendors.length === 0 ? (
                    <div className="px-3 py-2 text-sm text-muted-foreground">No vendors found</div>
                  ) : (
                    filteredVendors.map((v) => (
                      <button
                        key={v.card_code}
                        type="button"
                        className={`w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors whitespace-normal ${cVendorCode === v.card_code ? "bg-accent font-medium" : ""}`}
                        onClick={() => {
                          setCVendorCode(v.card_code);
                          setCVendorSearch(v.card_code + " - " + v.card_name);
                          setCVendorOpen(false);
                        }}
                      >
                        {v.card_code} - {v.card_name}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="c-rate">Rate (&#8377;) *</Label>
              <Input
                id="c-rate"
                type="number"
                min={0}
                step="0.01"
                placeholder="e.g. 120"
                value={cRate}
                onChange={(e) => setCRate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="c-qty">Quantity (KG) *</Label>
              <Input
                id="c-qty"
                type="number"
                min={0}
                step="0.01"
                placeholder="e.g. 20"
                value={cQuantity}
                onChange={(e) => setCQuantity(e.target.value)}
              />
            </div>
          </div>
          {cRate && cQuantity && (
            <div className="rounded-md bg-muted/50 px-3 py-2 text-sm">
              <span className="text-muted-foreground">Total: </span>
              <span className="font-semibold">&#8377; {(Number(cRate) * Number(cQuantity)).toFixed(2)}</span>
            </div>
          )}
          <Separator />
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="c-vehicle">Vehicle Number</Label>
              <Input
                id="c-vehicle"
                placeholder="e.g. GJ-05-AB-1234"
                value={cVehicleNumber}
                onChange={(e) => setCVehicleNumber(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="c-transporter">Transporter Name</Label>
              <Input
                id="c-transporter"
                placeholder="e.g. ABC Logistics"
                value={cTransporterName}
                onChange={(e) => setCTransporterName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="c-location">Location</Label>
              <Input
                id="c-location"
                placeholder="e.g. Mundra Port"
                value={cLocation}
                onChange={(e) => setCLocation(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="c-eta">ETA</Label>
              <DateInput
                id="c-eta"
                value={cEta}
                onChange={(e) => setCEta(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Created By</Label>
            <Input value={email} disabled className="disabled:opacity-70" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting || !cItemCode || !cVendorCode || !cRate.trim() || !cQuantity.trim()}
            >
              {submitting ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
