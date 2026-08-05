import { useEffect, useMemo, useState, type ReactNode } from "react";
import * as XLSX from "xlsx-js-style";
import {
  Receipt,
  Search,
  X,
  Download,
  Package,
  CircleDollarSign,
  Droplets,
  TriangleAlert,
  Eye,
  FileText,
  FileSpreadsheet,
  ArrowDownToLine,
  Truck,
  MapPin,
  type LucideIcon,
} from "lucide-react";

import {
  getDomesticContractDetails,
  type DomesticContractDetail,
} from "@/api/domesticContractDetails";
import { getErrorMessage } from "@/lib/errors";
import Guard from "@/components/Guard";
import { Pagination } from "@/components/Pagination";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";

const COLS = 10;
const PER_PAGE = 20;
const ALL = "__all__";

function num(value: string | null): number {
  return value == null ? 0 : Number(value);
}

function fmtDate(value: string | null): string {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("en-IN");
}

/** Quantities and rates — up to 3 decimals, no forced padding. */
function fmtQty(value: string | number | null, decimals = 3): string {
  if (value === null || value === "") return "-";
  return Number(value).toLocaleString("en-IN", { maximumFractionDigits: decimals });
}

function fmtInr(value: string | number | null, decimals = 2): string {
  if (value === null || value === "") return "-";
  return `₹ ${Number(value).toLocaleString("en-IN", { maximumFractionDigits: decimals })}`;
}

/** Compact currency for the summary tiles — crores / lakhs. */
function fmtInrShort(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_00_00_000) return `₹ ${(value / 1_00_00_000).toFixed(2)} Cr`;
  if (abs >= 1_00_000) return `₹ ${(value / 1_00_000).toFixed(2)} L`;
  return `₹ ${value.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

/** Most recent GRPO first. Rows with no GRPO date sink to the bottom rather than
 *  sorting as epoch-zero; invoice number breaks ties within a day so paging stays stable. */
function byGrpoDateDesc(a: DomesticContractDetail, b: DomesticContractDetail): number {
  const ta = a.grpo_date ? new Date(a.grpo_date).getTime() : null;
  const tb = b.grpo_date ? new Date(b.grpo_date).getTime() : null;
  if (ta === null && tb === null) return a.invoice_no.localeCompare(b.invoice_no);
  if (ta === null) return 1;
  if (tb === null) return -1;
  if (ta !== tb) return tb - ta;
  return a.invoice_no.localeCompare(b.invoice_no);
}

/** A deduction only bites once the shortage exceeds the 0.25% allowance. */
function shortageTone(row: DomesticContractDetail): "none" | "warn" {
  return num(row.deduction_qty_mts) > 0 ? "warn" : "none";
}

/** Each detail section gets its own hue so the eye can jump straight to it. */
type Tone = "blue" | "indigo" | "cyan" | "rose" | "amber" | "emerald" | "violet" | "slate";

const TONES: Record<Tone, { strip: string; icon: string; title: string; accent: string }> = {
  blue: {
    strip: "bg-blue-50/70 dark:bg-blue-950/25 border-blue-200/70 dark:border-blue-900/50",
    icon: "text-blue-600 dark:text-blue-400",
    title: "text-blue-800 dark:text-blue-200",
    accent: "text-blue-700 dark:text-blue-300",
  },
  indigo: {
    strip: "bg-indigo-50/70 dark:bg-indigo-950/25 border-indigo-200/70 dark:border-indigo-900/50",
    icon: "text-indigo-600 dark:text-indigo-400",
    title: "text-indigo-800 dark:text-indigo-200",
    accent: "text-indigo-700 dark:text-indigo-300",
  },
  cyan: {
    strip: "bg-cyan-50/70 dark:bg-cyan-950/25 border-cyan-200/70 dark:border-cyan-900/50",
    icon: "text-cyan-600 dark:text-cyan-400",
    title: "text-cyan-800 dark:text-cyan-200",
    accent: "text-cyan-700 dark:text-cyan-300",
  },
  rose: {
    strip: "bg-rose-50/70 dark:bg-rose-950/25 border-rose-200/70 dark:border-rose-900/50",
    icon: "text-rose-600 dark:text-rose-400",
    title: "text-rose-800 dark:text-rose-200",
    accent: "text-rose-700 dark:text-rose-300",
  },
  amber: {
    strip: "bg-amber-50/70 dark:bg-amber-950/25 border-amber-200/70 dark:border-amber-900/50",
    icon: "text-amber-600 dark:text-amber-400",
    title: "text-amber-800 dark:text-amber-200",
    accent: "text-amber-700 dark:text-amber-300",
  },
  emerald: {
    strip: "bg-emerald-50/70 dark:bg-emerald-950/25 border-emerald-200/70 dark:border-emerald-900/50",
    icon: "text-emerald-600 dark:text-emerald-400",
    title: "text-emerald-800 dark:text-emerald-200",
    accent: "text-emerald-700 dark:text-emerald-300",
  },
  violet: {
    strip: "bg-violet-50/70 dark:bg-violet-950/25 border-violet-200/70 dark:border-violet-900/50",
    icon: "text-violet-600 dark:text-violet-400",
    title: "text-violet-800 dark:text-violet-200",
    accent: "text-violet-700 dark:text-violet-300",
  },
  slate: {
    strip: "bg-slate-50/70 dark:bg-slate-900/40 border-slate-200/70 dark:border-slate-800",
    icon: "text-slate-500 dark:text-slate-400",
    title: "text-slate-700 dark:text-slate-300",
    accent: "text-slate-600 dark:text-slate-400",
  },
};

function Field({
  label,
  value,
  hint,
  strong,
  tone,
  muted,
}: {
  label: string;
  value: string;
  hint?: string;
  /** Headline figure of its section — larger and tinted. */
  strong?: boolean;
  tone?: Tone;
  /** Nothing meaningful recorded; de-emphasise rather than shout a zero. */
  muted?: boolean;
}) {
  const accent = strong && tone ? TONES[tone].accent : "";
  return (
    <div className="min-w-0 rounded-md bg-background/60 px-2.5 py-2 ring-1 ring-inset ring-border/50">
      <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        {label}
      </p>
      <p
        className={[
          "mt-1 break-words tabular-nums",
          strong ? "text-base font-bold" : "text-sm font-medium",
          muted ? "text-muted-foreground font-normal" : accent,
        ].join(" ")}
      >
        {value}
      </p>
      {hint && <p className="mt-0.5 text-[10px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

function Section({
  title,
  icon: Icon,
  tone,
  children,
}: {
  title: string;
  icon: LucideIcon;
  tone: Tone;
  children: ReactNode;
}) {
  const t = TONES[tone];
  return (
    <section className="overflow-hidden rounded-lg border">
      <div className={`flex items-center gap-2 border-b px-3 py-2 ${t.strip}`}>
        <Icon className={`h-4 w-4 shrink-0 ${t.icon}`} />
        <h3 className={`text-xs font-bold uppercase tracking-[0.1em] ${t.title}`}>{title}</h3>
      </div>
      <div className="grid grid-cols-2 gap-2 p-3 sm:grid-cols-3">{children}</div>
    </section>
  );
}

/** Everything the workbook holds for one invoice, grouped the way the sheet is. */
function DetailDialog({
  row,
  onClose,
}: {
  row: DomesticContractDetail | null;
  onClose: () => void;
}) {
  return (
    <Dialog open={!!row} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        {row && (
          <>
            <DialogHeader className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="bg-primary/10 text-primary hover:bg-primary/10 font-mono">
                  {row.invoice_no}
                </Badge>
                {row.status && <Badge variant="outline">{row.status}</Badge>}
                {row.del_terms && <Badge variant="outline">{row.del_terms}</Badge>}
                {shortageTone(row) === "warn" && (
                  <Badge className="bg-rose-100 text-rose-700 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-300">
                    <TriangleAlert className="mr-1 h-3 w-3" />
                    Over allowance
                  </Badge>
                )}
              </div>
              <DialogTitle className="text-left text-lg leading-snug">{row.item}</DialogTitle>
              <DialogDescription className="text-left">
                {row.supplier} · PO {row.po_number || "—"} · GRPO {fmtDate(row.grpo_date)}
              </DialogDescription>
            </DialogHeader>

            <Separator />

            <div className="space-y-3">
              <Section title="Contract" icon={FileText} tone="blue">
                <Field label="PO Number" value={row.po_number || "—"} muted={!row.po_number} />
                <Field label="Invoice Date" value={fmtDate(row.invoice_date)} />
                <Field label="GRPO Number" value={row.grpo_no || "—"} muted={!row.grpo_no} />
                <Field label="GRPO Date" value={fmtDate(row.grpo_date)} muted={!row.grpo_date} />
                <Field label="Delivery Terms" value={row.del_terms || "—"} muted={!row.del_terms} />
                <Field label="Contract Qty" value={`${fmtQty(row.contract_qty)} MT`} />
              </Section>

              <Section title="Loading" icon={ArrowDownToLine} tone="indigo">
                <Field label="Load Qty" value={`${fmtQty(row.load_qty_mts)} MT`} />
                <Field label="Invoice Rate" value={fmtInr(row.inv_rate, 0)} hint="per MT" />
                <Field
                  label="Basic Amount"
                  value={fmtInr(row.basic_amount)}
                  hint="load qty × rate"
                  strong
                  tone="indigo"
                />
              </Section>

              <Section title="Unloading" icon={Droplets} tone="cyan">
                <Field label="Unload Qty" value={`${fmtQty(row.unload_qty_mts)} MT`} />
                <Field label="Unload Qty" value={`${fmtQty(row.unload_qty_ltr, 2)} L`} />
                <Field label="Rate in SAP" value={fmtInr(row.rate_in_sap_unloading, 2)} hint="per MT" />
              </Section>

              <Section title="Shortage" icon={TriangleAlert} tone="rose">
                <Field label="Shortage Received" value={`${fmtQty(row.shortage_recd_mts)} MT`} />
                <Field
                  label="Allowed (0.25%)"
                  value={`${fmtQty(row.allow_shortage_mts)} MT`}
                  muted
                />
                <Field
                  label="Deduction Qty"
                  value={
                    num(row.deduction_qty_mts) > 0
                      ? `${fmtQty(row.deduction_qty_mts)} MT`
                      : "Within allowance"
                  }
                  muted={num(row.deduction_qty_mts) <= 0}
                />
                <Field
                  label="Deduct Amount"
                  value={num(row.deduct_amount) > 0 ? fmtInr(row.deduct_amount) : "—"}
                  strong={num(row.deduct_amount) > 0}
                  tone="rose"
                  muted={num(row.deduct_amount) <= 0}
                />
              </Section>

              <Section title="Freight & Brokerage" icon={Truck} tone="amber">
                <Field label="Freight Rate" value={fmtInr(row.freight_rate, 0)} hint="per MT" />
                <Field label="Freight Amount" value={fmtInr(row.freight_amount)} />
                <Field label="Brokerage Rate" value={fmtInr(row.brokerage_rate, 0)} hint="per MT" />
                <Field label="Brokerage Amount" value={fmtInr(row.brokerage_amount)} />
                <Field
                  label="Bilty Charges"
                  value={num(row.bilty_charges) > 0 ? fmtInr(row.bilty_charges) : "—"}
                  hint="excluded from landed cost"
                  muted={num(row.bilty_charges) <= 0}
                />
              </Section>

              <Section title="Landed Cost" icon={CircleDollarSign} tone="emerald">
                <Field
                  label="Cost per MT"
                  value={fmtInr(row.cost_per_mt, 2)}
                  hint="basic + freight + brokerage"
                  strong
                  tone="emerald"
                />
                <Field label="Cost per KL" value={fmtInr(row.cost_per_kl, 2)} />
                <Field label="Cost per Litre" value={fmtInr(row.cost_per_ltr, 4)} />
              </Section>

              <Section title="Logistics" icon={MapPin} tone="violet">
                <Field label="Transporter" value={row.transporter_name || "—"} muted={!row.transporter_name} />
                <Field label="Vehicle Number" value={row.vehicle_number || "—"} muted={!row.vehicle_number} />
                <Field label="Bilty Number" value={row.bilty_number || "—"} muted={!row.bilty_number} />
              </Section>

              <Section title="Source" icon={FileSpreadsheet} tone="slate">
                <Field label="Workbook" value={row.source_file || "—"} muted />
                <Field
                  label="Sheet Row"
                  value={row.source_row != null ? String(row.source_row) : "—"}
                  muted
                />
                <Field label="Last Updated" value={fmtDate(row.updated_at)} muted />
              </Section>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default function DomesticContractDetailsPage() {
  const [rows, setRows] = useState<DomesticContractDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [item, setItem] = useState<string>(ALL);
  const [supplier, setSupplier] = useState<string>(ALL);
  const [selected, setSelected] = useState<DomesticContractDetail | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError("");
      try {
        setRows(await getDomesticContractDetails());
      } catch (err) {
        setError(getErrorMessage(err, "Failed to load domestic contract details"));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const items = useMemo(
    () => Array.from(new Set(rows.map((r) => r.item).filter(Boolean))).sort(),
    [rows]
  );
  const suppliers = useMemo(
    () => Array.from(new Set(rows.map((r) => r.supplier).filter(Boolean))).sort(),
    [rows]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows
      .filter((row) => {
        if (item !== ALL && row.item !== item) return false;
        if (supplier !== ALL && row.supplier !== supplier) return false;
        if (!q) return true;
        return (
          row.invoice_no.toLowerCase().includes(q) ||
          row.po_number.toLowerCase().includes(q) ||
          row.supplier.toLowerCase().includes(q) ||
          row.item.toLowerCase().includes(q) ||
          (row.vehicle_number ?? "").toLowerCase().includes(q) ||
          (row.transporter_name ?? "").toLowerCase().includes(q) ||
          (row.bilty_number ?? "").toLowerCase().includes(q) ||
          (row.grpo_no ?? "").toLowerCase().includes(q)
        );
      })
      .sort(byGrpoDateDesc);
  }, [rows, search, item, supplier]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const paginated = useMemo(
    () => filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE),
    [filtered, page]
  );

  const totals = useMemo(() => {
    const basic = filtered.reduce((s, r) => s + num(r.basic_amount), 0);
    const freight = filtered.reduce((s, r) => s + num(r.freight_amount), 0);
    const brokerage = filtered.reduce((s, r) => s + num(r.brokerage_amount), 0);
    const unloadMt = filtered.reduce((s, r) => s + num(r.unload_qty_mts), 0);
    const loadMt = filtered.reduce((s, r) => s + num(r.load_qty_mts), 0);
    const deduction = filtered.reduce((s, r) => s + num(r.deduct_amount), 0);
    const deductedRows = filtered.filter((r) => num(r.deduct_amount) > 0).length;
    return {
      basic,
      landed: basic + freight + brokerage,
      unloadMt,
      shortageMt: loadMt - unloadMt,
      deduction,
      deductedRows,
      // weighted landed cost per MT across the filtered set, not an average of averages
      avgCostPerMt: unloadMt ? (basic + freight + brokerage) / unloadMt : 0,
    };
  }, [filtered]);

  const hasFilters = search.trim().length > 0 || item !== ALL || supplier !== ALL;

  function clearFilters() {
    setSearch("");
    setItem(ALL);
    setSupplier(ALL);
    setPage(1);
  }

  function handleExport() {
    if (!filtered.length) return;
    const sheet = XLSX.utils.json_to_sheet(
      filtered.map((r) => ({
        "Status": r.status ?? "",
        "Supplier": r.supplier,
        "Purchase Order": r.po_number,
        "Del Terms": r.del_terms ?? "",
        "Contract Qty": num(r.contract_qty),
        "Inv Number": r.invoice_no,
        "Inv Date": r.invoice_date ?? "",
        "GRPO Date": r.grpo_date ?? "",
        "GRPO": r.grpo_no ?? "",
        "Item": r.item,
        "Load Qty (MTS)": num(r.load_qty_mts),
        "Inv Rate": num(r.inv_rate),
        "Basic Amount": num(r.basic_amount),
        "Unload Qty (MTS)": num(r.unload_qty_mts),
        "Unload Qty (LTR)": num(r.unload_qty_ltr),
        "Rate in SAP Unloading": num(r.rate_in_sap_unloading),
        "Shortage Recd (MTS)": num(r.shortage_recd_mts),
        "Allow Shortage (MTS)": num(r.allow_shortage_mts),
        "Deduction Qty (MTS)": num(r.deduction_qty_mts),
        "Deduct Amount": num(r.deduct_amount),
        "Freight Rate (MTS)": num(r.freight_rate),
        "Freight Amt": num(r.freight_amount),
        "Brokerage Rate (MTS)": num(r.brokerage_rate),
        "Brokerage Amt": num(r.brokerage_amount),
        "Bilty Charges": num(r.bilty_charges),
        "Cost in KGS": num(r.cost_per_mt),
        "Cost in LTR (per KL)": num(r.cost_per_kl),
        "Cost in LTR": num(r.cost_per_ltr),
        "Transporter Name": r.transporter_name ?? "",
        "Vehicle Number": r.vehicle_number ?? "",
        "Bilty Number": r.bilty_number ?? "",
      }))
    );
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, "DC Details");
    XLSX.writeFile(workbook, `domestic-contract-details-${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  return (
    <Guard
      resource="domesticcontractdetails"
      action="view"
      fallback={
        <div className="p-6 text-sm text-muted-foreground">
          You do not have permission to view domestic contract details.
        </div>
      }
    >
      <div className="p-2.5 sm:p-4 md:p-6 space-y-4 sm:space-y-6 animate-page">
        <div className="flex items-start justify-between gap-3 sm:items-center">
          <div className="flex items-start gap-2 sm:items-center">
            <Receipt className="h-5 w-5 text-muted-foreground" />
            <div>
              <h1 className="text-lg sm:text-2xl font-bold">DC Details</h1>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Invoice-level domestic contract movements with landed cost
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleExport}
            disabled={loading || filtered.length === 0}
            className="h-8 px-2 text-xs shrink-0 sm:h-9 sm:px-3 sm:text-sm"
          >
            <Download className="h-4 w-4 mr-1" />
            Export
          </Button>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="grid grid-cols-2 gap-2.5 sm:gap-4 lg:grid-cols-4">
          <Card className="border-none bg-emerald-50/60 dark:bg-emerald-950/20 shadow-sm">
            <CardContent className="p-3 sm:p-5 flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                  Landed Value
                </p>
                <p className="text-sm sm:text-xl font-bold mt-1">{fmtInrShort(totals.landed)}</p>
                <p className="text-[10px] sm:text-[11px] text-emerald-700/80 dark:text-emerald-300/80 mt-0.5">
                  Basic {fmtInrShort(totals.basic)}
                </p>
              </div>
              <CircleDollarSign className="h-5 w-5 text-emerald-600" />
            </CardContent>
          </Card>
          <Card className="border-none bg-blue-50/60 dark:bg-blue-950/20 shadow-sm">
            <CardContent className="p-3 sm:p-5 flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wider text-blue-700 dark:text-blue-300">
                  Unloaded Qty
                </p>
                <p className="text-sm sm:text-xl font-bold mt-1">{fmtQty(totals.unloadMt, 3)} MT</p>
                <p className="text-[10px] sm:text-[11px] text-blue-700/80 dark:text-blue-300/80 mt-0.5">
                  {filtered.length} invoice{filtered.length !== 1 ? "s" : ""}
                </p>
              </div>
              <Package className="h-5 w-5 text-blue-600" />
            </CardContent>
          </Card>
          <Card className="border-none bg-amber-50/60 dark:bg-amber-950/20 shadow-sm">
            <CardContent className="p-3 sm:p-5 flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wider text-amber-700 dark:text-amber-300">
                  Avg Landed Cost
                </p>
                <p className="text-sm sm:text-xl font-bold mt-1">{fmtInr(totals.avgCostPerMt, 0)}</p>
                <p className="text-[10px] sm:text-[11px] text-amber-700/80 dark:text-amber-300/80 mt-0.5">
                  per MT, weighted
                </p>
              </div>
              <Droplets className="h-5 w-5 text-amber-600" />
            </CardContent>
          </Card>
          <Card className="border-none bg-rose-50/60 dark:bg-rose-950/20 shadow-sm">
            <CardContent className="p-3 sm:p-5 flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wider text-rose-700 dark:text-rose-300">
                  Shortage Deduction
                </p>
                <p className="text-sm sm:text-xl font-bold mt-1">{fmtInrShort(totals.deduction)}</p>
                <p className="text-[10px] sm:text-[11px] text-rose-700/80 dark:text-rose-300/80 mt-0.5">
                  {totals.deductedRows} of {filtered.length} over allowance
                </p>
              </div>
              <TriangleAlert className="h-5 w-5 text-rose-600" />
            </CardContent>
          </Card>
        </div>

        <Card className="card-hover shimmer-hover">
          <CardHeader>
            <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
              <div>
                <CardTitle>Invoice Movements</CardTitle>
                <CardDescription>
                  {filtered.length} record{filtered.length !== 1 ? "s" : ""}
                  {hasFilters ? ` (filtered from ${rows.length})` : ""} — click a row for full details
                </CardDescription>
              </div>
              <div className="grid w-full grid-cols-1 gap-2 sm:flex sm:w-auto sm:items-center">
                <div className="relative w-full sm:w-72">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search invoice / PO / vehicle / bilty"
                    value={search}
                    className="h-8 pl-8 text-xs sm:h-9 sm:text-sm"
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setPage(1);
                    }}
                  />
                </div>
                <Select
                  value={item}
                  onValueChange={(v) => {
                    setItem(v);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="h-8 w-full text-xs sm:h-9 sm:w-52 sm:text-sm" aria-label="Filter by item">
                    <SelectValue placeholder="All items" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL}>All items</SelectItem>
                    {items.map((name) => (
                      <SelectItem key={name} value={name}>
                        {name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={supplier}
                  onValueChange={(v) => {
                    setSupplier(v);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="h-8 w-full text-xs sm:h-9 sm:w-52 sm:text-sm" aria-label="Filter by supplier">
                    <SelectValue placeholder="All suppliers" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL}>All suppliers</SelectItem>
                    {suppliers.map((name) => (
                      <SelectItem key={name} value={name}>
                        {name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {hasFilters && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={clearFilters}
                    className="h-8 px-2 text-xs shrink-0 sm:h-9 sm:px-3 sm:text-sm"
                  >
                    <X className="h-4 w-4 mr-1" />
                    Clear
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>S.No</TableHead>
                    <TableHead>GRPO Date</TableHead>
                    <TableHead>Invoice No</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead>PO Number</TableHead>
                    <TableHead>GRPO Number</TableHead>
                    <TableHead>Terms</TableHead>
                    <TableHead className="text-right">Basic Amount</TableHead>
                    <TableHead className="w-12 text-right" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    Array.from({ length: 8 }).map((_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: COLS }).map((__, j) => (
                          <TableCell key={j}>
                            <Skeleton className="h-4 w-20" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : paginated.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={COLS} className="py-16 text-center text-muted-foreground">
                        No DC records found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginated.map((row, i) => (
                      <TableRow
                        key={row.id}
                        onClick={() => setSelected(row)}
                        className="cursor-pointer hover:bg-muted/40"
                      >
                        <TableCell>{(page - 1) * PER_PAGE + i + 1}</TableCell>
                        <TableCell className="whitespace-nowrap tabular-nums">
                          {fmtDate(row.grpo_date)}
                        </TableCell>
                        <TableCell className="font-medium whitespace-nowrap">
                          <span className="flex items-center gap-1.5">
                            {row.invoice_no}
                            {shortageTone(row) === "warn" && (
                              <TriangleAlert
                                className="h-3.5 w-3.5 shrink-0 text-rose-500"
                                aria-label="Shortage exceeded allowance"
                              />
                            )}
                          </span>
                        </TableCell>
                        <TableCell className="max-w-[220px] truncate" title={row.item}>
                          {row.item || "-"}
                        </TableCell>
                        <TableCell className="max-w-[240px] truncate" title={row.supplier}>
                          {row.supplier || "-"}
                        </TableCell>
                        <TableCell className="font-mono text-xs">{row.po_number || "-"}</TableCell>
                        <TableCell className="font-mono text-xs">{row.grpo_no || "-"}</TableCell>
                        <TableCell>
                          {row.del_terms ? <Badge variant="outline">{row.del_terms}</Badge> : "-"}
                        </TableCell>
                        <TableCell className="text-right font-semibold">{fmtInr(row.basic_amount, 0)}</TableCell>
                        <TableCell className="text-right">
                          <Eye className="ml-auto h-4 w-4 text-muted-foreground" aria-label="View details" />
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {!loading && (
              <Pagination
                page={page}
                totalPages={totalPages}
                totalItems={filtered.length}
                perPage={PER_PAGE}
                onPageChange={setPage}
              />
            )}
          </CardContent>
        </Card>

        <DetailDialog row={selected} onClose={() => setSelected(null)} />
      </div>
    </Guard>
  );
}
