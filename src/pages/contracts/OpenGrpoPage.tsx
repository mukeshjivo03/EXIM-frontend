import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { toastApiError } from "@/lib/errors";
import { RefreshCw, PackageOpen, Hash, Clock, Users, AlertTriangle, Search } from "lucide-react";

import { getOpenGrpos } from "@/api/openGrpo";
import { useOpenGrpo } from "@/context/OpenGrpoContext";
import { SummaryCard } from "@/components/SummaryCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

function pendingBadge(days: number) {
  if (days >= 20)
    return <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800">{days}d</Badge>;
  if (days >= 10)
    return <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800">{days}d</Badge>;
  return <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800">{days}d</Badge>;
}

export default function OpenGrpoPage() {
  const { grpos, fetched, setGrpos, setFetched } = useOpenGrpo();
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

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

  const kpis = useMemo(() => {
    if (grpos.length === 0) return null;
    const total = grpos.length;
    const maxDays = Math.max(...grpos.map((g) => g["Pending Days"]));
    const avgDays = grpos.reduce((s, g) => s + g["Pending Days"], 0) / total;
    const vendors = new Set(grpos.map((g) => g["Vendor Name"])).size;
    return { total, maxDays, avgDays, vendors };
  }, [grpos]);

  const filtered = useMemo(() => {
    if (!search) return grpos;
    const q = search.toLowerCase();
    return grpos.filter((g) =>
      String(g["GRPO Number"]).includes(q) ||
      g["Vendor Ref No"].toLowerCase().includes(q) ||
      g["User Name"].toLowerCase().includes(q) ||
      g["Vendor Name"].toLowerCase().includes(q) ||
      g["Warehouse"].toLowerCase().includes(q)
    );
  }, [grpos, search]);

  return (
    <div className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6 animate-page">
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

      {/* KPI Cards */}
      {kpis && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <SummaryCard icon={Hash}          label="Total Open GRPOs"  value={kpis.total}                        loading={false} />
          <SummaryCard icon={Users}         label="Unique Vendors"     value={kpis.vendors}                      loading={false} />
          <SummaryCard icon={Clock}         label="Avg Pending Days"   value={`${kpis.avgDays.toFixed(1)}d`}     loading={false} />
          <SummaryCard icon={AlertTriangle} label="Max Pending Days"   value={`${kpis.maxDays}d`}                loading={false} />
        </div>
      )}

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search GRPO, vendor, warehouse..."
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Table */}
      <Card className="card-hover shimmer-hover">
        <CardHeader>
          <CardTitle>Open GRPOs</CardTitle>
          <CardDescription>
            {fetched
              ? `${grpos.length} open GRPOs${filtered.length !== grpos.length ? ` — ${filtered.length} shown` : ""}`
              : "Loading open GRPOs..."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">S.No</TableHead>
                  <TableHead>GRPO Number</TableHead>
                  <TableHead>Vendor Ref No</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Vendor Name</TableHead>
                  <TableHead>Warehouse</TableHead>
                  <TableHead className="text-center">Pending Days</TableHead>
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
                          {search ? "No GRPOs match your search" : "No open GRPOs found"}
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((g, idx) => (
                    <TableRow key={g["GRPO Number"]}>
                      <TableCell className="font-medium">{idx + 1}</TableCell>
                      <TableCell className="font-mono font-semibold">{g["GRPO Number"]}</TableCell>
                      <TableCell className="text-muted-foreground">{g["Vendor Ref No"]}</TableCell>
                      <TableCell>{g["User Name"]}</TableCell>
                      <TableCell className="max-w-[260px] truncate" title={g["Vendor Name"]}>{g["Vendor Name"]}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-mono text-xs">{g["Warehouse"]}</Badge>
                      </TableCell>
                      <TableCell className="text-center">{pendingBadge(g["Pending Days"])}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
