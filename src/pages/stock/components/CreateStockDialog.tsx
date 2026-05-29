import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { CalendarClock, Check, ChevronLeft, ChevronRight, ClipboardList, X } from "lucide-react";

import { createStockStatus, STATUS_CHOICES, type StockStatusChoice } from "@/api/stockStatus";
import type { TankItem } from "@/api/tank";
import type { Vendor } from "@/api/sapSync";
import { toastApiError } from "@/lib/errors";
import { stockCreateSchema, getZodError } from "@/lib/schemas";
import { formatStatus } from "../stock-helpers";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DateInput } from "@/components/ui/date-input";
import { DatePicker } from "@/components/ui/date-picker";
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

const STEPS = ["Stock Information", "Vehicle & Location", "Confirm"];

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
  const [cArrivalDate, setCArrivalDate] = useState("");
  const [cTransporterName, setCTransporterName] = useState("");
  const [cContractStart, setCContractStart] = useState("");
  const [cContractEnd, setCContractEnd] = useState("");
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const isContract = cStatus === "IN_CONTRACT";
  const isOutsideFactory = cStatus === "OUT_SIDE_FACTORY";

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
      setCArrivalDate("");
      setCTransporterName("");
      setCContractStart("");
      setCContractEnd("");
      setStep(0);
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

  const selectedItem = tankItems.find((item) => item.tank_item_code === cItemCode);
  const selectedVendor = vendors.find((vendor) => vendor.card_code === cVendorCode);
  const stockInfoComplete =
    !!cItemCode &&
    !!cVendorCode &&
    !!cRate.trim() &&
    !!cQuantity.trim() &&
    (!isContract || (!!cContractStart && !!cContractEnd));
  const dateLabel = isOutsideFactory ? "Arrival Date" : "ETA";
  const dateValue = isOutsideFactory ? cArrivalDate : cEta;

  function goNext() {
    if (step === 0) {
      const result = stockCreateSchema.safeParse({ item_code: cItemCode, vendor_code: cVendorCode, rate: cRate, quantity: cQuantity });
      const err = getZodError(result);
      if (err) { toast.error(err); return; }
      if (isContract && (!cContractStart || !cContractEnd)) {
        toast.error("Contract start and end dates are required.");
        return;
      }
    }
    setStep((current) => Math.min(current + 1, STEPS.length - 1));
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const result = stockCreateSchema.safeParse({ item_code: cItemCode, vendor_code: cVendorCode, rate: cRate, quantity: cQuantity });
    const err = getZodError(result);
    if (err) { toast.error(err); return; }
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
        eta: isOutsideFactory ? undefined : cEta.trim() || undefined,
        arrival_date: isOutsideFactory ? cArrivalDate.trim() || undefined : undefined,
        transporter: cTransporterName.trim() || undefined,
        contract_start: isContract ? cContractStart || undefined : undefined,
        contract_end: isContract ? cContractEnd || undefined : undefined,
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
      <DialogContent className="sm:max-w-lg max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            Add Stock Status
          </DialogTitle>
          <DialogDescription>Create a new stock status entry.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-3 gap-2">
            {STEPS.map((label, index) => (
              <button
                key={label}
                type="button"
                className={`rounded-md border px-2 py-2 text-left transition-colors ${
                  step === index
                    ? "border-primary bg-primary/10 text-primary"
                    : index < step
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300"
                      : "border-border bg-muted/30 text-muted-foreground"
                }`}
                onClick={() => {
                  if (index <= step || (index === 1 && stockInfoComplete) || (index === 2 && step > 0 && stockInfoComplete)) {
                    setStep(index);
                  }
                }}
              >
                <span className="block text-[10px] font-semibold uppercase tracking-wider">Step {index + 1}</span>
                <span className="block truncate text-xs font-medium">{label}</span>
              </button>
            ))}
          </div>

          {step === 0 && (
            <>
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
          {/* ── Contract Date Fields (IN_CONTRACT only) ── */}
          {isContract && (
            <>
              <Separator />
              <div className="rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20 p-4 space-y-4">
                <div className="flex items-center gap-2 text-sm font-medium text-blue-700 dark:text-blue-300">
                  <CalendarClock className="h-4 w-4" />
                  Contract Period
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="c-contract-start">Contract Start *</Label>
                    <DatePicker
                      value={cContractStart}
                      onChange={(v) => setCContractStart(v)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="c-contract-end">Contract End *</Label>
                    <DatePicker
                      value={cContractEnd}
                      onChange={(v) => setCContractEnd(v)}
                    />
                  </div>
                </div>
                {cContractStart && cContractEnd && (() => {
                  const start = new Date(cContractStart);
                  const end = new Date(cContractEnd);
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  const periodDays = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
                  const daysLeft = Math.round((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                  const isExpired = daysLeft < 0;
                  return (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="rounded-md bg-white/60 dark:bg-black/20 px-3 py-2 text-sm">
                        <span className="text-muted-foreground">Period: </span>
                        <span className="font-semibold">{periodDays > 0 ? `${periodDays} days` : "Invalid"}</span>
                      </div>
                      <div className={`rounded-md px-3 py-2 text-sm ${isExpired ? "bg-red-100 dark:bg-red-900/30" : "bg-white/60 dark:bg-black/20"}`}>
                        <span className="text-muted-foreground">Days Left: </span>
                        <span className={`font-semibold ${isExpired ? "text-red-600 dark:text-red-400" : daysLeft <= 7 ? "text-orange-600 dark:text-orange-400" : ""}`}>
                          {isExpired ? `Expired ${Math.abs(daysLeft)} days ago` : `${daysLeft} days`}
                        </span>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </>
          )}
            </>
          )}

          {step === 1 && (
            <>
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
              <Label htmlFor={isOutsideFactory ? "c-arrival-date" : "c-eta"}>{dateLabel}</Label>
              <DateInput
                id={isOutsideFactory ? "c-arrival-date" : "c-eta"}
                value={dateValue}
                onChange={(e) => {
                  if (isOutsideFactory) {
                    setCArrivalDate(e.target.value);
                  } else {
                    setCEta(e.target.value);
                  }
                }}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Created By</Label>
            <Input value={email} disabled className="disabled:opacity-70" />
          </div>
            </>
          )}
          {step === 2 && (
            <div className="space-y-4">
              <div className="rounded-md border bg-muted/30 p-4">
                <h3 className="mb-3 text-sm font-semibold">Stock Information</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Item Code</p>
                    <p className="font-medium">{cItemCode || "-"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Item Name</p>
                    <p className="font-medium">{selectedItem?.tank_item_name ?? "-"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Status</p>
                    <p className="font-medium">{formatStatus(cStatus)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Vendor</p>
                    <p className="font-medium">{cVendorCode ? `${cVendorCode} - ${selectedVendor?.card_name ?? ""}` : "-"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Rate</p>
                    <p className="font-medium">&#8377; {cRate || "0"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Quantity</p>
                    <p className="font-medium">{cQuantity || "0"} KG</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs text-muted-foreground">Total</p>
                    <p className="font-semibold">&#8377; {(Number(cRate || 0) * Number(cQuantity || 0)).toFixed(2)}</p>
                  </div>
                </div>
              </div>

              {isContract && (
                <div className="rounded-md border bg-muted/30 p-4">
                  <h3 className="mb-3 text-sm font-semibold">Contract Period</h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">Contract Start</p>
                      <p className="font-medium">{cContractStart || "-"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Contract End</p>
                      <p className="font-medium">{cContractEnd || "-"}</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="rounded-md border bg-muted/30 p-4">
                <h3 className="mb-3 text-sm font-semibold">Vehicle & Location</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Vehicle Number</p>
                    <p className="font-medium">{cVehicleNumber || "-"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Transporter</p>
                    <p className="font-medium">{cTransporterName || "-"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Location</p>
                    <p className="font-medium">{cLocation || "-"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{dateLabel}</p>
                    <p className="font-medium">{dateValue || "-"}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs text-muted-foreground">Created By</p>
                    <p className="font-medium">{email}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <div className="flex w-full items-center justify-between gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if (step === 0) {
                    onOpenChange(false);
                  } else {
                    setStep((current) => Math.max(current - 1, 0));
                  }
                }}
              >
                {step === 0 ? (
                  "Cancel"
                ) : (
                  <>
                    <ChevronLeft className="h-4 w-4" />
                    Back
                  </>
                )}
              </Button>
              {step < 2 ? (
                <Button type="button" onClick={goNext} disabled={step === 0 && !stockInfoComplete}>
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button type="submit" disabled={submitting || !stockInfoComplete}>
                  {submitting ? (
                    "Creating..."
                  ) : (
                    <>
                      <Check className="h-4 w-4" />
                      Create
                    </>
                  )}
                </Button>
              )}
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
