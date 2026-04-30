import { Eye, Package, Truck, IndianRupee, MapPin, Pencil, Trash2, CalendarClock } from "lucide-react";

import type { StockStatus } from "@/api/stockStatus";
import type { TankItem } from "@/api/tank";
import type { Vendor } from "@/api/sapSync";
import { fmtDateTime, fmtNum } from "@/lib/formatters";
import { formatStatus, statusColorClass } from "../stock-helpers";
import { StatusTimeline } from "./StatusTimeline";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";

interface Props {
  data: StockStatus | null;
  loading: boolean;
  tankItems: TankItem[];
  vendors: Vendor[];
  onClose: () => void;
  onEdit: (row: StockStatus) => void;
  onDelete: (row: StockStatus) => void;
}

export function ViewStockSheet({ data, loading, tankItems, vendors, onClose, onEdit, onDelete }: Props) {
  return (
    <Sheet open={loading || !!data} onOpenChange={() => onClose()}>
      <SheetContent side="right" className="sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Stock Status Details
          </SheetTitle>
          <SheetDescription>
            {data ? `Detailed view of record #${data.id}` : "Loading record data..."}
          </SheetDescription>
        </SheetHeader>

        {loading ? (
          <div className="space-y-6 p-6">
            <Skeleton className="h-32 w-full" />
            <div className="grid grid-cols-2 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          </div>
        ) : data ? (
          <div className="space-y-8 p-6">
            {/* Journey Timeline */}
            <div className="bg-muted/30 rounded-xl p-4 border border-border/50 shadow-inner">
              <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4 px-2">
                Logistical Journey
              </h3>
              <StatusTimeline currentStatus={data.status} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Item Information */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 border-b pb-2">
                  <Package className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-bold uppercase tracking-wider">Item Information</h3>
                </div>
                <div className="grid grid-cols-1 gap-3 pl-2">
                  <div>
                    <p className="text-[10px] uppercase font-bold text-muted-foreground">Item Code</p>
                    <p className="text-sm font-semibold">{data.item_code}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-bold text-muted-foreground">Item Name</p>
                    <p className="text-sm font-medium">
                      {tankItems.find((i) => i.tank_item_code === data.item_code)?.tank_item_name ?? "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-bold text-muted-foreground">Status</p>
                    <Badge variant="outline" className={cn("mt-0.5", statusColorClass(data.status))}>
                      {formatStatus(data.status)}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Vendor Information */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 border-b pb-2">
                  <Truck className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-bold uppercase tracking-wider">Vendor Information</h3>
                </div>
                {(() => {
                  const v = vendors.find((v) => v.card_code === data.vendor_code);
                  return (
                    <div className="grid grid-cols-1 gap-3 pl-2">
                      <div>
                        <p className="text-[10px] uppercase font-bold text-muted-foreground">Vendor Code</p>
                        <p className="text-sm font-semibold">{data.vendor_code}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase font-bold text-muted-foreground">Vendor Name</p>
                        <p className="text-sm font-medium">{v?.card_name ?? "—"}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase font-bold text-muted-foreground">Vendor Group</p>
                        <p className="text-sm font-medium">{v?.u_main_group ?? "—"}</p>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Pricing & Quantity */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 border-b pb-2">
                  <IndianRupee className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-bold uppercase tracking-wider">Pricing Detail</h3>
                </div>
                <div className="grid grid-cols-1 gap-3 pl-2">
                  <div className="flex justify-between items-center bg-muted/50 p-2 rounded-lg">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground">Rate</span>
                    <span className="text-sm font-semibold">₹ {fmtNum(Number(data.rate))}</span>
                  </div>
                  <div className="flex justify-between items-center bg-muted/50 p-2 rounded-lg">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground">Quantity</span>
                    <span className="text-sm font-semibold">{fmtNum(Number(data.quantity))} KG</span>
                  </div>
                  <div className="flex justify-between items-center bg-primary/5 p-2 rounded-lg border border-primary/10">
                    <span className="text-[10px] uppercase font-bold text-primary">Total Value</span>
                    <span className="text-base font-black text-primary">₹ {fmtNum(Number(data.total))}</span>
                  </div>
                </div>
              </div>

              {/* Logistics */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 border-b pb-2">
                  <MapPin className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-bold uppercase tracking-wider">Logistics Info</h3>
                </div>
                <div className="grid grid-cols-1 gap-3 pl-2">
                  <div>
                    <p className="text-[10px] uppercase font-bold text-muted-foreground">Vehicle / Transporter</p>
                    <p className="text-sm font-medium">{data.vehicle_number || "—"} / {data.transporter || "—"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-bold text-muted-foreground">Current Location</p>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{data.location || "—"}</p>
                      {data.location && (
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(data.location)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-500 hover:text-blue-600"
                        >
                          <MapPin className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-bold text-muted-foreground">{data.arrival_date ? "Arrival Date" : "Estimated Arrival (ETA)"}</p>
                    <p className="text-sm font-medium">{data.arrival_date ? fmtDateTime(data.arrival_date) : data.eta ? fmtDateTime(data.eta) : "—"}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Contract Period (IN_CONTRACT only) */}
            {data.status === "IN_CONTRACT" && (data.contract_start || data.contract_end) && (() => {
              const start = data.contract_start ? new Date(data.contract_start) : null;
              const end = data.contract_end ? new Date(data.contract_end) : null;
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              const periodDays = start && end ? Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) : null;
              const daysLeft = end ? Math.round((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) : null;
              const isExpired = daysLeft !== null && daysLeft < 0;
              return (
                <div className="rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20 p-5 space-y-4">
                  <div className="flex items-center gap-2 border-b border-blue-200 dark:border-blue-700 pb-2">
                    <CalendarClock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    <h3 className="text-sm font-bold uppercase tracking-wider text-blue-700 dark:text-blue-300">Contract Period</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[10px] uppercase font-bold text-muted-foreground">Start Date</p>
                      <p className="text-sm font-semibold">{data.contract_start ? new Date(data.contract_start).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-bold text-muted-foreground">End Date</p>
                      <p className="text-sm font-semibold">{data.contract_end ? new Date(data.contract_end).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="rounded-lg bg-white/60 dark:bg-black/20 px-3 py-2.5">
                      <p className="text-[10px] uppercase font-bold text-muted-foreground">Total Period</p>
                      <p className="text-sm font-bold">{periodDays !== null && periodDays > 0 ? `${periodDays} days` : "—"}</p>
                    </div>
                    <div className={cn(
                      "rounded-lg px-3 py-2.5",
                      isExpired ? "bg-red-100 dark:bg-red-900/30" : daysLeft !== null && daysLeft <= 7 ? "bg-orange-100 dark:bg-orange-900/30" : "bg-white/60 dark:bg-black/20"
                    )}>
                      <p className="text-[10px] uppercase font-bold text-muted-foreground">Days Left</p>
                      <p className={cn(
                        "text-sm font-bold",
                        isExpired ? "text-red-600 dark:text-red-400" : daysLeft !== null && daysLeft <= 7 ? "text-orange-600 dark:text-orange-400" : ""
                      )}>
                        {daysLeft === null ? "—" : isExpired ? `Expired ${Math.abs(daysLeft)} days ago` : `${daysLeft} days`}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })()}

            <Separator />

            {/* metadata */}
            <div className="bg-muted/20 p-4 rounded-lg text-[10px] grid grid-cols-2 gap-4 text-muted-foreground uppercase tracking-widest font-bold">
              <div>Created By: <span className="text-foreground">{data.created_by}</span></div>
              <div>Created At: <span className="text-foreground">{fmtDateTime(data.created_at)}</span></div>
              <div>Record ID: <span className="text-foreground">#{data.id}</span></div>
            </div>
          </div>
        ) : null}

        <SheetFooter className="absolute bottom-0 left-0 w-full bg-background border-t p-6 flex flex-row items-center justify-between">
          <Button
            variant="destructive"
            className="gap-2 rounded-full"
            onClick={() => {
              if (data) {
                onDelete(data);
              }
            }}
          >
            <Trash2 className="h-4 w-4" />
            Delete Record
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" className="rounded-full px-6" onClick={onClose}>
              Close
            </Button>
            <Button
              className="rounded-full px-6 gap-2"
              onClick={() => {
                if (data) {
                  onEdit(data);
                }
              }}
            >
              <Pencil className="h-4 w-4" />
              Edit
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
