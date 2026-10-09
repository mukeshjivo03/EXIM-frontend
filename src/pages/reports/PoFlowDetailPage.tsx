import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  CalendarDays,
  ClipboardList,
  Package,
  RefreshCw,
  Scale,
  Truck,
} from "lucide-react";

import { getPoFlowReport, type PoFlowReport, type SapGrpo } from "@/api/stockStatus";
import { getErrorMessage } from "@/lib/errors";
import { fmtDate, fmtNum } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { formatStatus, statusColorClass } from "@/pages/stock/stock-helpers";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { FlowStepper } from "./po-flow/FlowStepper";
import { PoStatusBadge } from "./po-flow/PoStatusBadge";
import { currentStepIndex, poSteps, truckSteps } from "./po-flow/flow";

function TruckCard({ grpo, ours }: { grpo: SapGrpo; ours: number[] }) {
  const steps = truckSteps(grpo);
  const next = currentStepIndex(steps);

  return (
    <div className={cn("rounded-xl border bg-card", ours.length > 0 && "border-primary/40")}>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-2.5">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <Truck className="h-4 w-4 text-muted-foreground" />
          <span className="font-mono font-semibold bg-muted/50 px-2 py-0.5 rounded">{grpo.vehicle_number || "No vehicle no."}</span>
          <span className="text-muted-foreground">
            GRPO <span className="font-mono">#{grpo.doc_num}</span> · {fmtDate(grpo.doc_date)}
            {grpo.quantity != null && <> · {fmtNum(grpo.quantity, 2)} {grpo.uom ?? ""}</>}
          </span>
          {ours.length > 0 && (
            <Badge variant="outline" className="border-primary/40 text-[10px] text-primary">
              Stock entry #{ours.join(", #")}
            </Badge>
          )}
        </div>
        {grpo.cancelled ? (
          <span className="text-xs font-medium text-red-600">GRPO cancelled</span>
        ) : next === -1 ? (
          <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">All steps posted</span>
        ) : (
          <span className="text-xs font-medium text-amber-700 dark:text-amber-400">Next in SAP: {steps[next].label}</span>
        )}
      </div>
      <div className="overflow-x-auto px-2 py-4">
        <FlowStepper steps={steps} size="md" />
      </div>
    </div>
  );
}

function SideField({ icon: Icon, label, children }: { icon: typeof Truck; label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-2.5">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <div className="text-sm font-medium">{children}</div>
      </div>
    </div>
  );
}

export default function PoFlowDetailPage() {
  const { poNumber = "" } = useParams<{ poNumber: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<PoFlowReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setData(await getPoFlowReport(poNumber));
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load PO"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [poNumber]);

  const flow = data?.po_flows[poNumber];
  const found = flow?.found ? flow : null;
  const entries = data?.entries ?? [];
  const trucks = found?.grpos ?? [];
  const ordered = found?.lines.reduce((s, l) => s + (l.quantity ?? 0), 0) ?? 0;
  const open = found?.lines.reduce((s, l) => s + (l.open_quantity ?? 0), 0) ?? 0;
  const uom = found?.lines[0]?.uom ?? "";

  return (
    <div className="p-2.5 sm:p-4 md:p-6 space-y-4 sm:space-y-5 animate-page">
      <button
        type="button"
        onClick={() => navigate("/reports/po-flow")}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        PO Flow (SAP)
      </button>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight">
              PO <span className="font-mono">{poNumber}</span>
            </h1>
            {!loading && <PoStatusBadge flow={flow} />}
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            {loading ? "Loading from SAP..." : found ? (
              <>
                <span className="font-medium text-foreground">{found.vendor_name}</span> · {fmtDate(found.doc_date)}
                {found.lines[0] && <> · {found.lines[0].item_name}</>}
              </>
            ) : flow && !flow.found ? "This PO number does not exist in SAP" : "SAP data unavailable"}
          </p>
        </div>
        <div className="flex items-center gap-3 sm:gap-4">
          {found && (
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Ordered</p>
              <p className="text-xl sm:text-2xl font-bold tabular-nums leading-tight">{fmtNum(ordered, 2)} <span className="text-sm font-normal text-muted-foreground">{uom}</span></p>
              <p className="text-xs text-muted-foreground tabular-nums">{fmtNum(ordered - open, 2)} received · {fmtNum(open, 2)} open</p>
            </div>
          )}
          <Button
            onClick={load}
            variant="outline"
            disabled={loading}
            className="btn-press h-8 sm:h-9 gap-1.5 sm:gap-2 px-2.5 sm:px-3 rounded-lg sm:rounded-xl border-2 text-[10px] sm:text-xs"
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </div>

      {(error || data?.sap_error) && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs sm:text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error ?? "Could not reach SAP right now. Try Refresh in a minute."}</span>
        </div>
      )}

      {/* PO-level stepper */}
      <Card className="shadow-sm">
        <CardContent className="overflow-x-auto px-2 sm:px-6 py-6">
          {loading ? (
            <Skeleton className="h-24 w-full" />
          ) : found ? (
            <FlowStepper steps={poSteps(found)} size="lg" />
          ) : (
            <p className="py-6 text-center text-sm text-muted-foreground">No SAP flow to show for this PO.</p>
          )}
        </CardContent>
      </Card>

      {/* Tabs + side panel */}
      <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
        <Tabs defaultValue="trucks">
          <TabsList className="mb-2">
            <TabsTrigger value="trucks">Trucks · {trucks.length}</TabsTrigger>
            <TabsTrigger value="entries">Stock entries · {entries.length}</TabsTrigger>
          </TabsList>

          <TabsContent value="trucks" className="space-y-3">
            {loading ? (
              Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-36 w-full rounded-xl" />)
            ) : trucks.length === 0 ? (
              <div className="flex flex-col items-center gap-3 rounded-xl border py-14 text-muted-foreground">
                <Truck className="h-10 w-10 stroke-1" />
                <p className="text-sm font-medium">No truck has been received against this PO in SAP yet</p>
              </div>
            ) : (
              trucks.map((g) => (
                <TruckCard
                  key={g.doc_entry}
                  grpo={g}
                  ours={entries.filter((e) => e.matched_grpos.includes(g.doc_num)).map((e) => e.id)}
                />
              ))
            )}
            {found && found.ap_invoices.length > 0 && (
              <p className="text-xs text-muted-foreground">
                Also invoiced directly on the PO (without a GRPO): {found.ap_invoices.map((a) => `#${a.doc_num}`).join(", ")}
              </p>
            )}
          </TabsContent>

          <TabsContent value="entries">
            <div className="rounded-xl border overflow-x-auto bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Entry</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead className="text-right">Qty (KG)</TableHead>
                    <TableHead>Vehicle No.</TableHead>
                    <TableHead>Transporter</TableHead>
                    <TableHead>GRPO in SAP</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell className="font-medium">#{e.id}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn("text-[11px] capitalize", statusColorClass(e.status))}>
                          {formatStatus(e.status).toLowerCase()}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">{e.item_name ?? e.item_code}</TableCell>
                      <TableCell className="text-right tabular-nums">{fmtNum(Number(e.quantity))}</TableCell>
                      <TableCell>
                        <span className="font-mono text-sm bg-muted/50 px-2 py-0.5 rounded">{e.vehicle_number || "-"}</span>
                      </TableCell>
                      <TableCell className="text-sm">{e.transporter || "-"}</TableCell>
                      <TableCell className="text-sm">
                        {e.matched_grpos.length > 0 ? (
                          <span className="font-mono text-emerald-700 dark:text-emerald-400">#{e.matched_grpos.join(", #")}</span>
                        ) : (
                          <span className="text-muted-foreground">Not received yet</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>

        {/* Side panel */}
        <Card className="h-fit shadow-sm lg:mt-11">
          <CardContent className="space-y-4 p-4">
            {loading ? (
              <Skeleton className="h-48 w-full" />
            ) : found ? (
              <>
                <SideField icon={Building2} label="Vendor">
                  {found.vendor_name}
                  <p className="font-mono text-xs font-normal text-muted-foreground">{found.vendor_code}</p>
                </SideField>
                {found.lines.map((l) => (
                  <SideField key={l.item_code} icon={Package} label="Item">
                    {l.item_name}
                    <p className="font-mono text-xs font-normal text-muted-foreground">{l.item_code}</p>
                  </SideField>
                ))}
                <SideField icon={Scale} label="Quantity">
                  <span className="tabular-nums">{fmtNum(ordered, 2)} {uom} ordered</span>
                  <p className="text-xs font-normal text-muted-foreground tabular-nums">
                    {fmtNum(ordered - open, 2)} received · {fmtNum(open, 2)} open
                  </p>
                </SideField>
                <SideField icon={CalendarDays} label="PO date">{fmtDate(found.doc_date)}</SideField>
                <SideField icon={ClipboardList} label="SAP PO status">
                  {found.status === "OPEN" ? "Open" : found.status === "CLOSED" ? "Closed" : "Cancelled"}
                </SideField>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">No SAP details available.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
