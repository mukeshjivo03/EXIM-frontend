import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { CalendarClock, Check, ChevronLeft, ChevronRight, Lock, Pencil, Search, Trash2 } from "lucide-react";

import {
  updateStockStatus,
  patchStockStatus,
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
import { stockEditSchema, getZodError } from "@/lib/schemas";
import { formatStatus } from "../stock-helpers";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DateInput } from "@/components/ui/date-input";
import { DatePicker } from "@/components/ui/date-picker";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

function todayISO() {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

interface Props {
  data: StockStatus | null;
  tankItems: TankItem[];
  vendors: Vendor[];
  email: string;
  onClose: () => void;
  onSaved: () => void;
  onDelete: (row: StockStatus) => void;
}

const STEPS = ["Stock Information", "Vehicle & Location", "Confirm"];

export function EditStockDialog({ data, tankItems, vendors, email, onClose, onSaved, onDelete }: Props) {
  const [eStatus, setEStatus] = useState<StockStatusChoice>("PENDING");
  const [eRate, setERate] = useState("");
  const [eQuantity, setEQuantity] = useState("");
  const [eVehicleNumber, setEVehicleNumber] = useState("");
  const [eLocation, setELocation] = useState("");
  const [eEta, setEEta] = useState("");
  const [eArrivalDate, setEArrivalDate] = useState("");
  const [eTransporterName, setETransporterName] = useState("");
  const [eTransferType, setETransferType] = useState<"bulk" | "batch" | "">("");
  const [eAction, setEAction] = useState<"RETAIN" | "TOLERATE" | "DEBIT" | "">("");
  const [eJobWorkVendor, setEJobWorkVendor] = useState("");
  const [eBilityNumber, setEBilityNumber] = useState("");
  const [eGrpoNumber, setEGrpoNumber] = useState("");
  const [jobWorkSearch, setJobWorkSearch] = useState("");
  const [jobWorkOpen, setJobWorkOpen] = useState(false);
  const [eContractStart, setEContractStart] = useState("");
  const [eContractEnd, setEContractEnd] = useState("");
  const [step, setStep] = useState(0);
  const [editing, setEditing] = useState(false);

  // Job work vendor is locked once stock is already AT_REFINERY and has a job_work_vendor
  const jobWorkLocked = data?.status === "AT_REFINERY" && !!data?.job_work_vendor;
  const isOutsideFactory = eStatus === "OUT_SIDE_FACTORY";

  // Filtered vendor list for job work combobox
  const filteredVendors = useMemo(() => {
    if (!jobWorkSearch.trim()) return vendors;
    const q = jobWorkSearch.toLowerCase();
    return vendors.filter(
      (v) =>
        v.card_code.toLowerCase().includes(q) ||
        v.card_name.toLowerCase().includes(q)
    );
  }, [vendors, jobWorkSearch]);

  // Populate form when data changes
  useEffect(() => {
    if (data) {
      setEStatus(data.status);
      setERate(String(data.rate));
      setEQuantity(String(data.quantity));
      setEVehicleNumber(data.vehicle_number ?? "");
      setELocation(data.location ?? "");
      setEEta(data.eta ?? "");
      setEArrivalDate(data.arrival_date ?? (data.status === "OUT_SIDE_FACTORY" ? data.eta ?? "" : ""));
      setETransporterName(data.transporter ?? "");
      setETransferType("");
      setEAction("");
      setEJobWorkVendor(data.job_work_vendor ?? "");
      setEBilityNumber(data.bility_number ?? "");
      setEGrpoNumber(data.grpo_number ?? "");
      setJobWorkSearch("");
      setEContractStart(data.contract_start ?? "");
      setEContractEnd(data.contract_end ?? "");
      setStep(0);
    }
  }, [data]);

  function validateStockStep(showToast = true) {
    if (!data) return false;

    const oldQty = Number(data.quantity);
    const newQty = Number(eQuantity.trim());
    const isNoDiff = oldQty === newQty;
    const finalAction = isNoDiff ? "TOLERATE" : eAction;

    const result = stockEditSchema.safeParse({
      rate: eRate,
      quantity: eQuantity,
      newStatus: eStatus,
      oldStatus: data.status,
      transferType: eTransferType,
      action: finalAction,
      jobWorkVendor: eJobWorkVendor,
      bilityNumber: eBilityNumber,
      grpoNumber: eGrpoNumber,
    });
    const err = getZodError(result);
    if (err) {
      if (showToast) toast.error(err);
      return false;
    }
    return true;
  }

  function goNext() {
    if (step === 0 && !validateStockStep()) return;
    setStep((current) => Math.min(current + 1, STEPS.length - 1));
  }

  async function handleEdit() {
    if (!data) return;

    const oldQty = Number(data.quantity);
    const newQty = Number(eQuantity.trim());
    const isNoDiff = oldQty === newQty;
    const finalAction = isNoDiff ? "TOLERATE" : eAction;

    if (!validateStockStep()) return;

    setEditing(true);
    try {
      if (eStatus !== data.status) {
        if (eStatus === "AT_REFINERY") {
          await arriveBatch({
            stock_id: data.id,
            weighed_qty: newQty,
            destination_status: eStatus,
            action: finalAction,
            created_by: email,
            job_work_vendor: eJobWorkVendor.trim(),
          });
          toast.success("Stock arrived (Arrive Batch).");
        } else if (eStatus === "IN_TANK" || eStatus === "IN_WAREHOUSE") {
          await patchStockStatus(data.id, {
            status: eStatus,
            bility_number: eBilityNumber.trim() || undefined,
            grpo_number: eGrpoNumber.trim() || undefined,
            quantity: String(newQty),
            created_by: email,
          });
          toast.success(`Stock moved to ${formatStatus(eStatus)}.`);
        } else if (eTransferType === "bulk") {
          await moveStock({
            stock_id: data.id,
            new_quantity: newQty,
            new_status: eStatus,
            action: finalAction,
            created_by: email,
            arrival_date: eStatus === "OUT_SIDE_FACTORY" ? eArrivalDate.trim() || todayISO() : undefined,
          });
          toast.success("Stock moved (Bulk).");
        } else if (eTransferType === "batch") {
          await dispatchStock({
            stock_id: data.id,
            quantity: newQty,
            destination_status: eStatus,
            action: finalAction,
            created_by: email,
            vehicle_number: eVehicleNumber.trim() || undefined,
            transporter: eTransporterName.trim() || undefined,
            location: eLocation.trim() || undefined,
            eta: eEta.trim() || undefined,
          });
          toast.success("Stock dispatched (Batch).");
        }
      } else {
        await updateStockStatus(data.id, {
          rate: eRate.trim(),
          quantity: eQuantity.trim(),
          vehicle_number: eVehicleNumber.trim() || undefined,
          location: eLocation.trim() || undefined,
          eta: isOutsideFactory ? undefined : eEta.trim() || undefined,
          arrival_date: isOutsideFactory ? eArrivalDate.trim() || undefined : undefined,
          transporter: eTransporterName.trim() || undefined,
          created_by: email,
          bility_number: eBilityNumber.trim() || undefined,
          grpo_number: eGrpoNumber.trim() || undefined,
          contract_start: eStatus === "IN_CONTRACT" ? eContractStart || undefined : undefined,
          contract_end: eStatus === "IN_CONTRACT" ? eContractEnd || undefined : undefined,
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
  const item = tankItems.find((i) => i.tank_item_code === data?.item_code);
  const dateLabel = isOutsideFactory ? "Arrival Date" : "ETA";
  const dateValue = isOutsideFactory ? eArrivalDate : eEta;

  return (
    <Dialog open={!!data} onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90dvh] overflow-y-auto">
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
                  if (index <= step) {
                    setStep(index);
                  } else if (step === 0 ? validateStockStep() : true) {
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

          {/* Job Work Vendor — locked read-only display when already saved */}
          {jobWorkLocked && (
            <div className="rounded-lg border bg-muted/30 p-3 flex items-center gap-2">
              <Lock className="h-4 w-4 text-muted-foreground shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Job Work Vendor</p>
                <p className="text-sm font-semibold">{data.job_work_vendor}</p>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>Status *</Label>
            <Select value={eStatus} onValueChange={(v) => {
              const s = v as StockStatusChoice;
              setEStatus(s);
              if (s === "OUT_SIDE_FACTORY") {
                setEArrivalDate(todayISO());
              }
              if (s !== data?.status) {
                 if (s === "OUT_SIDE_FACTORY" || s === "ON_THE_WAY" || s === "MUNDRA_PORT" || s === "COMPLETED" || s === "IN_TANK" || s === "IN_WAREHOUSE") {
                   setETransferType("bulk");
                 } else if (s === "UNDER_LOADING" || s === "OTW_TO_REFINERY") {
                   setETransferType("batch");
                 } else {
                   setETransferType("");
                 }

                 if (s === "MUNDRA_PORT" || s === "OUT_SIDE_FACTORY" || s === "COMPLETED" || s === "IN_TANK" || s === "IN_WAREHOUSE") {
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

          {eStatus !== data?.status && (
            <>
              {eStatus !== "AT_REFINERY" &&
               eStatus !== "OUT_SIDE_FACTORY" &&
               eStatus !== "ON_THE_WAY" &&
               eStatus !== "MUNDRA_PORT" &&
               eStatus !== "UNDER_LOADING" &&
               eStatus !== "OTW_TO_REFINERY" &&
               eStatus !== "COMPLETED" &&
               eStatus !== "IN_TANK" &&
               eStatus !== "IN_WAREHOUSE" && (
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

              {eQuantity.trim() !== "" && eStatus !== "OUT_SIDE_FACTORY" && eStatus !== "COMPLETED" && eStatus !== "IN_TANK" && eStatus !== "IN_WAREHOUSE" && Number(data?.quantity) !== Number(eQuantity) && (eTransferType || eStatus === "AT_REFINERY" || eStatus === "ON_THE_WAY" || eStatus === "MUNDRA_PORT" || eStatus === "UNDER_LOADING" || eStatus === "OTW_TO_REFINERY") && (
                <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                  <Label>Action *</Label>
                  <Select value={eAction} onValueChange={(v) => setEAction(v as any)}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select action" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="RETAIN">Retain</SelectItem>
                      <SelectItem value="TOLERATE">Tolerate</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Job Work Vendor — combobox: type freely or pick from vendor list */}
              {eStatus === "AT_REFINERY" && (
                <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                  <Label>Job Work Vendor *</Label>
                  <Popover open={jobWorkOpen} onOpenChange={setJobWorkOpen}>
                    <PopoverTrigger asChild>
                      <div className="relative">
                        <Input
                          placeholder="Type vendor name or select from list..."
                          value={eJobWorkVendor}
                          onChange={(e) => {
                            setEJobWorkVendor(e.target.value);
                            setJobWorkSearch(e.target.value);
                            if (!jobWorkOpen) setJobWorkOpen(true);
                          }}
                          onFocus={() => setJobWorkOpen(true)}
                          className="pr-8"
                        />
                        <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                      </div>
                    </PopoverTrigger>
                    <PopoverContent
                      className="w-[var(--radix-popover-trigger-width)] p-0"
                      align="start"
                      onOpenAutoFocus={(e) => e.preventDefault()}
                    >
                      <div className="max-h-[200px] overflow-y-auto">
                        {filteredVendors.length === 0 ? (
                          <p className="text-sm text-muted-foreground p-3 text-center">No vendors found</p>
                        ) : (
                          filteredVendors.map((v) => (
                            <button
                              key={v.card_code}
                              type="button"
                              className={cn(
                                "w-full text-left px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors",
                                eJobWorkVendor === `${v.card_code} - ${v.card_name}` && "bg-accent"
                              )}
                              onClick={() => {
                                setEJobWorkVendor(`${v.card_code} - ${v.card_name}`);
                                setJobWorkOpen(false);
                                setJobWorkSearch("");
                              }}
                            >
                              <span className="font-medium">{v.card_code}</span>
                              <span className="text-muted-foreground"> — {v.card_name}</span>
                            </button>
                          ))
                        )}
                      </div>
                    </PopoverContent>
                  </Popover>
                  <p className="text-[10px] text-muted-foreground">Type a custom name or pick from vendor list</p>
                </div>
              )}

              {(eStatus === "IN_TANK" || eStatus === "IN_WAREHOUSE") && (
                <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="space-y-2">
                    <Label htmlFor="e-bility">Bility Number</Label>
                    <Input
                      id="e-bility"
                      placeholder="e.g. BIL100"
                      value={eBilityNumber}
                      onChange={(e) => setEBilityNumber(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="e-grpo">GRPO Number</Label>
                    <Input
                      id="e-grpo"
                      placeholder="e.g. 123"
                      value={eGrpoNumber}
                      onChange={(e) => setEGrpoNumber(e.target.value)}
                    />
                  </div>
                </div>
              )}
            </>
          )}

          {/* Contract Period (IN_CONTRACT only) */}
          {eStatus === "IN_CONTRACT" && (
            <>
              <Separator />
              <div className="rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20 p-4 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="flex items-center gap-2 text-sm font-medium text-blue-700 dark:text-blue-300">
                  <CalendarClock className="h-4 w-4" />
                  Contract Period
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Contract Start *</Label>
                    <DatePicker
                      value={eContractStart}
                      onChange={(v) => setEContractStart(v)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Contract End *</Label>
                    <DatePicker
                      value={eContractEnd}
                      onChange={(v) => setEContractEnd(v)}
                    />
                  </div>
                </div>
                {eContractStart && eContractEnd && (() => {
                  const start = new Date(eContractStart);
                  const end = new Date(eContractEnd);
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
          <Separator />
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
            </>
          )}
          {step === 1 && (
            <>
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
              <Label htmlFor={isOutsideFactory ? "e-arrival-date" : "e-eta"}>{dateLabel}</Label>
              <DateInput
                id={isOutsideFactory ? "e-arrival-date" : "e-eta"}
                value={dateValue}
                onChange={(e) => {
                  if (isOutsideFactory) {
                    setEArrivalDate(e.target.value);
                  } else {
                    setEEta(e.target.value);
                  }
                }}
              />
            </div>
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
                    <p className="font-medium">{data?.item_code ?? "-"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Item Name</p>
                    <p className="font-medium">{item?.tank_item_name ?? "-"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Status</p>
                    <p className="font-medium">{formatStatus(eStatus)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Vendor</p>
                    <p className="font-medium">{data?.vendor_code ? `${data.vendor_code} - ${vendor?.card_name ?? ""}` : "-"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Rate</p>
                    <p className="font-medium">&#8377; {eRate || "0"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Quantity</p>
                    <p className="font-medium">{eQuantity || "0"} KG</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs text-muted-foreground">Total</p>
                    <p className="font-semibold">&#8377; {(Number(eRate || 0) * Number(eQuantity || 0)).toFixed(2)}</p>
                  </div>
                  {eStatus !== data?.status && (
                    <>
                      <div>
                        <p className="text-xs text-muted-foreground">Transfer Type</p>
                        <p className="font-medium">{eTransferType ? eTransferType : "-"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Action</p>
                        <p className="font-medium">{eAction || "-"}</p>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {(eStatus === "IN_CONTRACT" || eStatus === "AT_REFINERY" || eStatus === "IN_TANK" || eStatus === "IN_WAREHOUSE") && (
                <div className="rounded-md border bg-muted/30 p-4">
                  <h3 className="mb-3 text-sm font-semibold">Additional Details</h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    {eStatus === "IN_CONTRACT" && (
                      <>
                        <div>
                          <p className="text-xs text-muted-foreground">Contract Start</p>
                          <p className="font-medium">{eContractStart || "-"}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Contract End</p>
                          <p className="font-medium">{eContractEnd || "-"}</p>
                        </div>
                      </>
                    )}
                    {eStatus === "AT_REFINERY" && (
                      <div className="col-span-2">
                        <p className="text-xs text-muted-foreground">Job Work Vendor</p>
                        <p className="font-medium">{eJobWorkVendor || "-"}</p>
                      </div>
                    )}
                    {(eStatus === "IN_TANK" || eStatus === "IN_WAREHOUSE") && (
                      <>
                        <div>
                          <p className="text-xs text-muted-foreground">Bility Number</p>
                          <p className="font-medium">{eBilityNumber || "-"}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">GRPO Number</p>
                          <p className="font-medium">{eGrpoNumber || "-"}</p>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}

              <div className="rounded-md border bg-muted/30 p-4">
                <h3 className="mb-3 text-sm font-semibold">Vehicle & Location</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Vehicle Number</p>
                    <p className="font-medium">{eVehicleNumber || "-"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Transporter</p>
                    <p className="font-medium">{eTransporterName || "-"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Location</p>
                    <p className="font-medium">{eLocation || "-"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{dateLabel}</p>
                    <p className="font-medium">{dateValue || "-"}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs text-muted-foreground">Updated By</p>
                    <p className="font-medium">{email}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
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
            <Button
              variant="outline"
              onClick={() => {
                if (step === 0) {
                  onClose();
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
              <Button onClick={goNext} disabled={step === 0 && !eQuantity.trim()}>
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                onClick={handleEdit}
                disabled={editing || !eQuantity.trim()}
              >
                {editing ? (
                  "Saving..."
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    Save Changes
                  </>
                )}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
