import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { toastApiError } from "@/lib/errors";
import {
  RefreshCw, PackageOpen, Hash, Clock, Users, AlertTriangle,
  Search, ChevronUp, ChevronDown, ChevronsUpDown, AlertCircle,
} from "lucide-react";

import { getOpenGrpos } from "@/api/openGrpo";
import { useOpenGrpo } from "@/context/OpenGrpoContext";
import { SummaryCard } from "@/components/SummaryCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

/* ── types ─────────────────────────────────────────────────── */

type SortKey = "GRPO Number" | "Pending Days" | "Warehouse" | "Vendor Name";
type SortDir = "asc" | "desc";

/* ── helpers ────────────────────────────────────────────────── */

function pendingMeta(days: number) {
  if (days > 6) return {
    badge: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800",
    row:   "bg-red-50/40 dark:bg-red-950/10",
  };
  if (days > 3) return {
    badge: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800",
    row:   "bg-yellow-50/40 dark:bg-yellow-950/10",
  };
  return {
    badge: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800",
    row:   "",
  };
}

function SortIcon({ col, sortKey, sortDir }: { col: SortKey; sortKey: SortKey; sortDir: SortDir }) {
  if (col !== sortKey) return <ChevronsUpDown className="h-3 w-3 ml-1 opacity-40" />;
  return sortDir === "asc"
    ? <ChevronUp className="h-3 w-3 ml-1" />
    : <ChevronDown className="h-3 w-3 ml-1" />;
}

/* ── page ───────────────────────────────────────────────────── */

export default function OpenGrpoPage() {
  const { grpos, fetched, setGrpos, setFetched } = useOpenGrpo();
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [warehouse, setWarehouse] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("Pending Days");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  useEffect(() => { if (!fetched) handleFetch(); }, []);

  async function handleFetch() {
    setLoading(true);
    try {
      const data = await getOpenGrpos();
      setGrpos(data);
      setFetched(true);
      toast.success(`Loaded ${data.length} open GRPOs`);
    } catch (err) {
      toastApiError(err, "Failed to load open GRPOs");
    } finally {
      setLoading(false);
    }
  }

  function handleSort(col: SortKey) {
    if (col === sortKey) setSortDir((d) => d === "asc" ? "desc" : "asc");
    else { setSortKey(col); setSortDir("desc"); }
  }

  /* ── derived ──────────────────────────────────────────────── */

  const kpis = useMemo(() => {
    if (grpos.length === 0) return null;
    const total = grpos.length;
    const maxDays = Math.max(...grpos.map((g) => g["Pending Days"]));
    const avgDays = grpos.reduce((s, g) => s + g["Pending Days"], 0) / total;
    const vendors = new Set(grpos.map((g) => g["Vendor Name"])).size;
    const critical = grpos.filter((g) => g["Pending Days"] > 6).length;
    return { total, maxDays, avgDays, vendors, critical };
  }, [grpos]);

  const warehouses = useMemo(
    () => Array.from(new Set(grpos.map((g) => g["Warehouse"]))).sort(),
    [grpos]
  );

  const filtered = useMemo(() => {
    let data = grpos;
    if (warehouse) data = data.filter((g) => g["Warehouse"] === warehouse);
    if (search) {
      const q = search.toLowerCase();
      data = data.filter((g) =>
        String(g["GRPO Number"]).includes(q) ||
        g["Vendor Ref No"].toLowerCase().includes(q) ||
        g["User Name"].toLowerCase().includes(q) ||
        g["Vendor Name"].toLowerCase().includes(q) ||
        g["Warehouse"].toLowerCase().includes(q)
      );
    }
    return [...data].sort((a, b) => {
      const av = a[sortKey] as string | number;
      const bv = b[sortKey] as string | number;
      const cmp = av < bv ? -1 : av > bv ? 1 : 0;
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [grpos, search, warehouse, sortKey, sortDir]);

  /* ── render ───────────────────────────────────────────────── */

  const thClass = (col: SortKey) => cn(
    "cursor-pointer select-none hover:text-foreground transition-colors",
    sortKey === col && "text-foreground"
  );

  return (
    <div className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6 animate-page">
      {/* Tailwind v4 safelist — keeps dynamic yellow classes in the bundle */}
      <span aria-hidden className="hidden bg-yellow-100 text-yellow-700 border-yellow-200 bg-yellow-50/40 bg-yellow-400 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800 dark:bg-yellow-950/10" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Open GRPOs</h1>
          <p className="text-sm text-muted-foreground">Goods Receipt Purchase Orders pending invoice</p>
        </div>
        <Button className="btn-press" onClick={handleFetch} disabled={loading}>
          <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
          {loading ? "Loading..." : "Refresh"}
        </Button>
      </div>

      {/* Critical warning banner */}
      {kpis && kpis.critical > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-red-200 dark:border-red-800/40 bg-red-50/50 dark:bg-red-950/20 px-4 py-3">
          <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 shrink-0" />
          <p className="text-xs font-medium text-red-700 dark:text-red-300">
            <strong>{kpis.critical} GRPO{kpis.critical > 1 ? "s" : ""}</strong> have been pending for 6+ days and require immediate attention.
          </p>
        </div>
      )}

      {/* KPI Cards */}
      {kpis && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <SummaryCard icon={Hash}          label="Total Open GRPOs" value={kpis.total}                    loading={false} />
          <SummaryCard icon={Users}         label="Unique Vendors"    value={kpis.vendors}                  loading={false} />
          <SummaryCard icon={Clock}         label="Avg Pending"       value={`${kpis.avgDays.toFixed(1)}d`} loading={false} />
          <SummaryCard icon={AlertTriangle} label="Max Pending"       value={`${kpis.maxDays}d`}            loading={false} />
        </div>
      )}

      {/* Filters row */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search GRPO, vendor, warehouse..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {warehouses.length > 0 && (
          <Select value={warehouse || "__all__"} onValueChange={(v) => setWarehouse(v === "__all__" ? "" : v)}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="All Warehouses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All Warehouses</SelectItem>
              {warehouses.map((w) => (
                <SelectItem key={w} value={w}>{w}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {(search || warehouse) && (
          <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => { setSearch(""); setWarehouse(""); }}>
            Clear filters
          </Button>
        )}
      </div>

      {/* Table */}
      <Card className="card-hover shimmer-hover">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Open GRPOs</CardTitle>
              <CardDescription>
                {fetched
                  ? `${grpos.length} total${filtered.length !== grpos.length ? ` — ${filtered.length} shown` : ""} · sorted by ${sortKey} (${sortDir})`
                  : "Loading..."}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-red-400 inline-block" /> &gt; 6d</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-yellow-400 inline-block" /> &gt; 3d</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-green-400 inline-block" /> &lt; 10d</span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">S.No</TableHead>
                  <TableHead onClick={() => handleSort("GRPO Number")} className={thClass("GRPO Number")}>
                    <span className="flex items-center">GRPO Number <SortIcon col="GRPO Number" sortKey={sortKey} sortDir={sortDir} /></span>
                  </TableHead>
                  <TableHead>Vendor Ref No</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead onClick={() => handleSort("Vendor Name")} className={thClass("Vendor Name")}>
                    <span className="flex items-center">Vendor Name <SortIcon col="Vendor Name" sortKey={sortKey} sortDir={sortDir} /></span>
                  </TableHead>
                  <TableHead onClick={() => handleSort("Warehouse")} className={thClass("Warehouse")}>
                    <span className="flex items-center">Warehouse <SortIcon col="Warehouse" sortKey={sortKey} sortDir={sortDir} /></span>
                  </TableHead>
                  <TableHead onClick={() => handleSort("Pending Days")} className={cn(thClass("Pending Days"), "text-center")}>
                    <span className="flex items-center justify-center">Pending Days <SortIcon col="Pending Days" sortKey={sortKey} sortDir={sortDir} /></span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 7 }).map((__, j) => (
                        <TableCell key={j}><div className="h-4 w-20 bg-muted animate-pulse rounded" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-16 text-center">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <PackageOpen className="h-10 w-10 stroke-1" />
                        <p className="text-sm font-medium">
                          {search || warehouse ? "No GRPOs match your filters" : "No open GRPOs found"}
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((g, idx) => {
                    const meta = pendingMeta(g["Pending Days"]);
                    return (
                      <TableRow key={g["GRPO Number"]} className={cn("transition-colors", meta.row)}>
                        <TableCell className="font-medium text-muted-foreground">{idx + 1}</TableCell>
                        <TableCell className="font-mono font-semibold">{g["GRPO Number"]}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">{g["Vendor Ref No"]}</TableCell>
                        <TableCell className="text-sm">{g["User Name"]}</TableCell>
                        <TableCell className="max-w-[240px]">
                          <span className="truncate block text-sm" title={g["Vendor Name"]}>{g["Vendor Name"]}</span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-mono text-xs">{g["Warehouse"]}</Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge className={cn("text-xs font-semibold tabular-nums min-w-[40px] justify-center", meta.badge)}>
                            {g["Pending Days"]}d
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
