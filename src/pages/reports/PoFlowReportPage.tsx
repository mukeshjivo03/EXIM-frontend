import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, ChevronRight, FileCheck2, GitBranch, PackageCheck, PackageOpen, RefreshCw, Search, Truck } from "lucide-react";

import { getPoFlowReport, type PoFlowEntry, type PoFlowReport } from "@/api/stockStatus";
import { getErrorMessage } from "@/lib/errors";
import { fmtNum } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import { FlowStepper } from "./po-flow/FlowStepper";
import { PoStatusBadge } from "./po-flow/PoStatusBadge";
import { poStatus, poSteps, truckIsPending, type PoStatus } from "./po-flow/flow";

const FILTERS: { key: "all" | PoStatus; label: string; color: string; badge: string }[] = [
  {
    key: "all",
    label: "All POs",
    color: "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800",
    badge: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  },
  {
    key: "pending",
    label: "Pending in SAP",
    color: "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800",
    badge: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  },
  {
    key: "complete",
    label: "Fully Posted",
    color: "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800",
    badge: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
  },
  {
    key: "no-grpo",
    label: "Awaiting Truck",
    color: "bg-slate-50 dark:bg-slate-900/20 border-slate-200 dark:border-slate-800",
    badge: "bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-300",
  },
];

const KPI_TONES = {
  blue: { card: "bg-blue-50/60 dark:bg-blue-950/20", text: "text-blue-600 dark:text-blue-400", icon: "text-blue-500" },
  violet: { card: "bg-violet-50/60 dark:bg-violet-950/20", text: "text-violet-600 dark:text-violet-400", icon: "text-violet-500" },
  emerald: { card: "bg-emerald-50/60 dark:bg-emerald-950/20", text: "text-emerald-600 dark:text-emerald-400", icon: "text-emerald-500" },
  amber: { card: "bg-amber-50/60 dark:bg-amber-950/20", text: "text-amber-600 dark:text-amber-400", icon: "text-amber-500" },
};

function KpiCard({
  label,
  value,
  hint,
  icon: Icon,
  tone,
  loading,
}: {
  label: string;
  value: number;
  hint: string;
  icon: typeof Truck;
  tone: keyof typeof KPI_TONES;
  loading: boolean;
}) {
  const t = KPI_TONES[tone];
  return (
    <Card className={cn("border-none shadow-sm", t.card)}>
      <CardContent className="p-3 sm:p-4 flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <p className={cn("text-[10px] sm:text-xs uppercase tracking-wide sm:tracking-wider", t.text)}>{label}</p>
          <Icon className={cn("h-3.5 w-3.5 sm:h-4 sm:w-4", t.icon)} />
        </div>
        {loading
          ? <div className="h-8 w-16 bg-muted/40 animate-pulse rounded mt-1" />
          : <h3 className="text-base sm:text-2xl font-bold leading-tight tabular-nums">{value}</h3>}
        <p className="text-[9px] sm:text-xs text-muted-foreground">{hint}</p>
      </CardContent>
    </Card>
  );
}

export default function PoFlowReportPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<PoFlowReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | PoStatus>("all");

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setData(await getPoFlowReport());
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load PO flow report"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const groups = useMemo(() => {
    const byPo = new Map<string, PoFlowEntry[]>();
    for (const e of data?.entries ?? []) {
      const key = e.po_number.trim();
      byPo.set(key, [...(byPo.get(key) ?? []), e]);
    }
    return [...byPo.entries()].map(([po, entries]) => ({ po, entries, flow: data?.po_flows[po] }));
  }, [data]);

  const stats = useMemo(() => {
    const trucks = groups.flatMap((g) => (g.flow?.found ? g.flow.grpos.filter((x) => !x.cancelled) : []));
    const pending = trucks.filter(truckIsPending).length;
    return { pos: groups.length, trucks: trucks.length, posted: trucks.length - pending, pending };
  }, [groups]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return groups.filter(({ po, entries, flow }) => {
      if (filter !== "all" && poStatus(flow) !== filter) return false;
      if (!q) return true;
      return (
        po.toLowerCase().includes(q) ||
        (flow?.found === true && flow.vendor_name.toLowerCase().includes(q)) ||
        (flow?.found === true && flow.grpos.some((g) => (g.vehicle_number ?? "").toLowerCase().includes(q))) ||
        entries.some((e) =>
          [e.vehicle_number, e.item_name, e.vendor_name, String(e.id)].some((v) => (v ?? "").toLowerCase().includes(q))
        )
      );
    });
  }, [groups, search, filter]);

  const activeFilter = FILTERS.find((f) => f.key === filter) ?? FILTERS[0];
  const countFor = (key: "all" | PoStatus) =>
    key === "all" ? groups.length : groups.filter((g) => poStatus(g.flow) === key).length;

  return (
    <div className="p-2.5 sm:p-4 md:p-6 space-y-5 sm:space-y-6 animate-page">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight">PO Flow (SAP)</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            SAP posting progress for every PO linked to stock entries
          </p>
        </div>
        <div className="flex w-full flex-wrap items-center justify-start sm:justify-end gap-2 sm:gap-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-2 sm:top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              className="h-8 sm:h-9 w-52 sm:w-60 pl-8 rounded-lg sm:rounded-xl text-xs sm:text-sm"
              placeholder="Search PO, vendor, vehicle..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
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

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        <KpiCard tone="blue" icon={GitBranch} label="POs Linked" value={stats.pos} hint="POs with stock entries linked" loading={loading} />
        <KpiCard tone="violet" icon={Truck} label="Trucks Received" value={stats.trucks} hint="GRPOs posted against these POs" loading={loading} />
        <KpiCard tone="emerald" icon={FileCheck2} label="Fully Posted" value={stats.posted} hint="trucks with every SAP step done" loading={loading} />
        <KpiCard tone="amber" icon={PackageCheck} label="Pending in SAP" value={stats.pending} hint="trucks with steps still to post" loading={loading} />
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const isActive = filter === f.key;
          return (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={cn(
                "flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl border text-[10px] sm:text-sm font-medium transition-all",
                isActive ? f.color + " shadow-sm" : "bg-muted/30 text-muted-foreground border-border hover:border-foreground/30"
              )}
            >
              {f.label}
              {!loading && (
                <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 h-4", isActive && f.badge)}>
                  {countFor(f.key)}
                </Badge>
              )}
            </button>
          );
        })}
      </div>

      {data?.sap_error && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs sm:text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>Could not reach SAP right now, so SAP progress is missing. Try Refresh in a minute.</span>
        </div>
      )}

      <Card className={cn("border-2", activeFilter.color)}>
        <CardHeader className="pb-2.5 sm:pb-3 px-4 sm:px-6">
          <CardTitle className="text-sm sm:text-base">{activeFilter.label}</CardTitle>
          <CardDescription className="text-[10px] sm:text-xs">
            {loading ? "Loading..." : `${visible.length} PO${visible.length === 1 ? "" : "s"} · click a PO to see its full SAP flow`}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-4 space-y-2">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full rounded" />)}
            </div>
          ) : error ? (
            <div className="flex flex-col items-center gap-3 py-16 text-red-600">
              <AlertTriangle className="h-10 w-10 stroke-1" />
              <p className="text-sm font-medium">{error}</p>
            </div>
          ) : visible.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
              <PackageOpen className="h-10 w-10 stroke-1" />
              <p className="text-sm font-medium">
                {groups.length ? "No POs in this view" : "No stock entries are linked to a PO yet. Use the link icon in Stock Status."}
              </p>
            </div>
          ) : (
            <div className="rounded-b-xl overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">S.No</TableHead>
                    <TableHead>PO No.</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead className="text-right">Ordered</TableHead>
                    <TableHead className="text-right">Open</TableHead>
                    <TableHead className="text-center">Trucks</TableHead>
                    <TableHead className="min-w-44">SAP Progress</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-8" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visible.map(({ po, entries, flow }, idx) => {
                    const found = flow?.found ? flow : null;
                    const line = found?.lines[0];
                    const ordered = found?.lines.reduce((s, l) => s + (l.quantity ?? 0), 0);
                    const open = found?.lines.reduce((s, l) => s + (l.open_quantity ?? 0), 0);
                    return (
                      <TableRow
                        key={po}
                        className={cn("cursor-pointer hover:bg-muted/40", idx % 2 === 1 && "bg-muted/20")}
                        onClick={() => navigate(`/reports/po-flow/${encodeURIComponent(po)}`)}
                      >
                        <TableCell className="text-muted-foreground">{idx + 1}</TableCell>
                        <TableCell>
                          <span className="font-mono text-sm bg-muted/50 px-2 py-0.5 rounded">{po}</span>
                        </TableCell>
                        <TableCell className="text-sm">{found?.vendor_name ?? entries[0]?.vendor_name ?? "-"}</TableCell>
                        <TableCell className="text-sm">{line?.item_name ?? entries[0]?.item_name ?? "-"}</TableCell>
                        <TableCell className="text-right tabular-nums text-sm">
                          {ordered != null ? `${fmtNum(ordered, 2)} ${line?.uom ?? ""}` : "-"}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-sm">
                          {open != null ? fmtNum(open, 2) : "-"}
                        </TableCell>
                        <TableCell className="text-center tabular-nums text-sm">
                          {found ? found.grpos.filter((g) => !g.cancelled).length : "-"}
                        </TableCell>
                        <TableCell>
                          {found ? <FlowStepper steps={poSteps(found)} size="xs" /> : <span className="text-sm text-muted-foreground">-</span>}
                        </TableCell>
                        <TableCell><PoStatusBadge flow={flow} /></TableCell>
                        <TableCell><ChevronRight className="h-4 w-4 text-muted-foreground" /></TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
