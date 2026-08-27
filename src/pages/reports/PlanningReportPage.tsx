import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  BarChart3,
  CalendarDays,
  CircleDollarSign,
  Layers,
  PackageOpen,
  RefreshCw,
  Target,
  Trash2,
  Upload,
  X,
  Search,
  LayoutList,
  Table2,
} from "lucide-react";

import {
  deletePlanningUpload,
  getLatestPlanning,
  getPlanningUpload,
  getPlanningUploads,
  uploadPlanning,
  type PlanningRow,
  type PlanningUpload,
  type PlanningUploadDetail,
} from "@/api/planning";
import { getErrorMessage } from "@/lib/errors";
import { cn } from "@/lib/utils";
import Guard from "@/components/Guard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ViewToggle } from "@/components/ViewToggle";

const ALL = "__all__";

/** Fields the plan can be rolled up by. "Sub-category" is the sheet's SUB-CATEGORY. */
const GROUP_BY = {
  category: { label: "Category", field: "category" },
  sub_category: { label: "Sub-category", field: "sub_category" },
  brand: { label: "Brand", field: "brand" },
  head: { label: "Head", field: "head" },
  sku: { label: "SKU", field: "sku" },
} as const;

type GroupKey = keyof typeof GROUP_BY;

function num(value: string | null | undefined): number {
  return value == null ? 0 : Number(value);
}

function formatQty(value: number) {
  return Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 });
}

function formatMts(value: number) {
  return (Number(value || 0) / 1000).toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

function formatMonth(month: string) {
  const date = new Date(month);
  if (Number.isNaN(date.getTime())) return month;
  return date.toLocaleDateString("en-IN", { month: "short", year: "numeric" }).toUpperCase();
}

function uploadLabel(upload: PlanningUpload) {
  return `${formatMonth(upload.month)} · v${upload.version}${upload.is_latest ? " (latest)" : ""}`;
}

interface GroupTotals {
  key: string;
  skus: number;
  commodity: number;
  premium: number;
  ecom: number;
  total: number;
  w1: number;
  w2: number;
  w3: number;
  w4: number;
}

export default function PlanningReportPage() {
  const [uploads, setUploads] = useState<PlanningUpload[]>([]);
  const [detail, setDetail] = useState<PlanningUploadDetail | null>(null);
  const [selectedId, setSelectedId] = useState<string>("");
  const [loadingList, setLoadingList] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const [view, setView] = useState<"simple" | "detailed">("simple");
  const [groupBy, setGroupBy] = useState<GroupKey>("category");
  const [brand, setBrand] = useState(ALL);
  const [head, setHead] = useState(ALL);
  const [category, setCategory] = useState(ALL);
  const [subCategory, setSubCategory] = useState(ALL);
  const [search, setSearch] = useState("");

  const fileInput = useRef<HTMLInputElement>(null);

  const loadDetail = useCallback(async (id: number) => {
    setLoadingDetail(true);
    setError("");
    try {
      setDetail(await getPlanningUpload(id));
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load that planning version"));
    } finally {
      setLoadingDetail(false);
    }
  }, []);

  const refresh = useCallback(
    async (preferId?: number) => {
      setLoadingList(true);
      setError("");
      try {
        const list = await getPlanningUploads();
        setUploads(list);

        if (list.length === 0) {
          setDetail(null);
          setSelectedId("");
          return;
        }
        const wanted = preferId && list.some((u) => u.id === preferId) ? preferId : null;
        if (wanted) {
          setSelectedId(String(wanted));
          await loadDetail(wanted);
        } else {
          // /latest/ picks the newest version of the newest month for us
          setLoadingDetail(true);
          try {
            const latest = await getLatestPlanning();
            setDetail(latest);
            setSelectedId(String(latest.id));
          } finally {
            setLoadingDetail(false);
          }
        }
      } catch (err) {
        setError(getErrorMessage(err, "Failed to load planning uploads"));
      } finally {
        setLoadingList(false);
      }
    },
    [loadDetail]
  );

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function handleFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";                       // let the same file be re-picked
    if (!file) return;

    setUploading(true);
    try {
      const result = await uploadPlanning(file);
      const { upload, warnings, mismatches, replaced_version } = result;

      toast.success(
        `${formatMonth(upload.month)} uploaded as v${upload.version} — ${upload.row_count} SKUs`,
        {
          description: replaced_version
            ? `v${replaced_version} kept in history`
            : "First version for this month",
        }
      );
      if (mismatches.length) {
        toast.warning(`${mismatches.length} figure(s) differ from the sheet`, {
          description: mismatches.slice(0, 3).join(" · "),
        });
      }
      if (warnings.length) {
        toast.warning(`${warnings.length} warning(s) while parsing`, {
          description: warnings.slice(0, 3).join(" · "),
        });
      }
      await refresh(upload.id);
    } catch (err) {
      toast.error(getErrorMessage(err, "Upload failed"));
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete() {
    if (!detail) return;
    const label = `${formatMonth(detail.month)} v${detail.version}`;
    if (!window.confirm(`Delete ${label}? Its ${detail.row_count} rows are removed permanently.`)) {
      return;
    }
    try {
      await deletePlanningUpload(detail.id);
      toast.success(`Deleted ${label}`);
      await refresh();
    } catch (err) {
      toast.error(getErrorMessage(err, "Delete failed"));
    }
  }

  const rows = useMemo(() => detail?.rows ?? [], [detail]);

  /** Most of the sheet carries no plan in a given month - those SKUs are dropped
   *  before grouping, so SKU counts mean "SKUs actually planned" and a group that
   *  is entirely zero disappears rather than showing a row of dashes. */
  const planned = useMemo(() => rows.filter((row) => num(row.total_planning) !== 0), [rows]);
  const zeroCount = rows.length - planned.length;

  const options = useMemo(() => {
    const uniq = (pick: (row: PlanningRow) => string) =>
      Array.from(new Set(planned.map(pick).filter(Boolean))).sort();
    return {
      brands: uniq((r) => r.brand),
      heads: uniq((r) => r.head),
      categories: uniq((r) => r.category),
      subCategories: uniq((r) => r.sub_category),
    };
  }, [planned]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return planned.filter((row) => {
      if (brand !== ALL && row.brand !== brand) return false;
      if (head !== ALL && row.head !== head) return false;
      if (category !== ALL && row.category !== category) return false;
      if (subCategory !== ALL && row.sub_category !== subCategory) return false;
      if (!q) return true;
      return (
        row.sku.toLowerCase().includes(q) ||
        row.code.toLowerCase().includes(q) ||
        row.category.toLowerCase().includes(q) ||
        row.sub_category.toLowerCase().includes(q) ||
        row.brand.toLowerCase().includes(q)
      );
    });
  }, [planned, brand, head, category, subCategory, search]);

  const grouped = useMemo<GroupTotals[]>(() => {
    const field = GROUP_BY[groupBy].field;
    const buckets = new Map<string, GroupTotals>();

    for (const row of filtered) {
      const key = (row[field as keyof PlanningRow] as string) || "(blank)";
      let bucket = buckets.get(key);
      if (!bucket) {
        bucket = { key, skus: 0, commodity: 0, premium: 0, ecom: 0, total: 0, w1: 0, w2: 0, w3: 0, w4: 0 };
        buckets.set(key, bucket);
      }
      bucket.skus += 1;
      bucket.commodity += num(row.commodity_monthly);
      bucket.premium += num(row.premium_monthly);
      bucket.ecom += num(row.ecom_planning);
      bucket.total += num(row.total_planning);
      // the two blocks never both carry a figure, so the weeks add straight across
      bucket.w1 += num(row.commodity_w1) + num(row.premium_w1);
      bucket.w2 += num(row.commodity_w2) + num(row.premium_w2);
      bucket.w3 += num(row.commodity_w3) + num(row.premium_w3);
      bucket.w4 += num(row.commodity_w4) + num(row.premium_w4);
    }
    return Array.from(buckets.values()).sort((a, b) => b.total - a.total);
  }, [filtered, groupBy]);

  const summary = useMemo(() => {
    const totals = grouped.reduce(
      (acc, g) => ({
        commodity: acc.commodity + g.commodity,
        premium: acc.premium + g.premium,
        ecom: acc.ecom + g.ecom,
        total: acc.total + g.total,
      }),
      { commodity: 0, premium: 0, ecom: 0, total: 0 }
    );
    return { ...totals, groups: grouped.length, skus: filtered.length, top: grouped[0] ?? null };
  }, [grouped, filtered.length]);

  const maxTotal = grouped.reduce((max, g) => Math.max(max, g.total), 0);
  const hasFilters =
    brand !== ALL || head !== ALL || category !== ALL || subCategory !== ALL || search.trim() !== "";
  const isLoading = loadingList || loadingDetail;

  function clearFilters() {
    setBrand(ALL);
    setHead(ALL);
    setCategory(ALL);
    setSubCategory(ALL);
    setSearch("");
  }

  return (
    <Guard
      resource="planningupload"
      action="view"
      fallback={<div className="p-6 text-sm text-muted-foreground">You do not have permission to view planning.</div>}
    >
      <div className="p-2.5 sm:p-4 md:p-6 space-y-5 sm:space-y-6 animate-page">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 sm:gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight">PLANNING</h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              Monthly production planning, uploaded from the planning workbook
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
            <Select
              value={selectedId}
              onValueChange={(value) => {
                setSelectedId(value);
                loadDetail(Number(value));
              }}
              disabled={loadingList || uploads.length === 0}
            >
              <SelectTrigger className="h-9 w-full sm:w-[280px]">
                <SelectValue placeholder={loadingList ? "Loading..." : "Select planning month"} />
              </SelectTrigger>
              <SelectContent>
                {uploads.map((upload) => (
                  <SelectItem key={upload.id} value={String(upload.id)}>
                    {uploadLabel(upload)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Guard resource="planningupload" action="add">
              <input
                ref={fileInput}
                type="file"
                accept=".xlsx,.xlsm"
                className="hidden"
                onChange={handleFile}
              />
              <Button
                onClick={() => fileInput.current?.click()}
                disabled={uploading}
                className="btn-press h-9 gap-2 rounded-xl text-xs"
              >
                <Upload className={cn("h-4 w-4", uploading && "animate-pulse")} />
                {uploading ? "Uploading..." : "Upload Excel"}
              </Button>
            </Guard>

            <Button
              onClick={() => refresh(detail?.id)}
              variant="outline"
              className="btn-press h-9 gap-2 rounded-xl border-2 text-xs"
              disabled={isLoading}
            >
              <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
              Refresh
            </Button>
          </div>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        {!isLoading && uploads.length === 0 && (
          <Card className="border-dashed">
            <CardContent className="p-10 text-center space-y-3">
              <PackageOpen className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="text-sm font-medium">No planning uploaded yet</p>
              <p className="text-xs text-muted-foreground">
                Upload a monthly planning workbook to get started. The sheet's own banner row
                tells us which month it is for.
              </p>
            </CardContent>
          </Card>
        )}

        {detail && (
          <Card className="border bg-muted/20 shadow-sm">
            <CardContent className="p-3 sm:p-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <CalendarDays className="h-4 w-4 text-primary shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                    {detail.title || "Planning Month"}
                  </p>
                  <p className="text-[11px] text-muted-foreground truncate">
                    {detail.source_file} · uploaded by {detail.uploaded_by || "unknown"} ·{" "}
                    {new Date(detail.uploaded_at).toLocaleDateString("en-IN")}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="rounded-full text-sm font-bold">
                  {formatMonth(detail.month)} · v{detail.version}
                </Badge>
                {detail.is_latest ? (
                  <Badge className="rounded-full bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300">
                    Latest
                  </Badge>
                ) : (
                  <Badge variant="outline" className="rounded-full">
                    Superseded
                  </Badge>
                )}
                <Guard resource="planningupload" action="delete">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleDelete}
                    className="h-8 px-2 text-destructive hover:text-destructive"
                    aria-label="Delete this version"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </Guard>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
          <Card className="border-none bg-sky-50/70 dark:bg-sky-950/20 shadow-sm">
            <CardContent className="p-3 sm:p-4 flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <p className="text-[10px] sm:text-xs uppercase tracking-wide text-sky-600 dark:text-sky-400">
                  Total Planning
                </p>
                <Target className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-sky-500" />
              </div>
              {isLoading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <h3 className="text-base sm:text-2xl font-bold tabular-nums">{formatQty(summary.total)}</h3>
              )}
              <p className="text-[9px] sm:text-xs text-muted-foreground">{formatMts(summary.total)} MTS</p>
            </CardContent>
          </Card>

          <Card className="border-none bg-amber-50/70 dark:bg-amber-950/20 shadow-sm">
            <CardContent className="p-3 sm:p-4 flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <p className="text-[10px] sm:text-xs uppercase tracking-wide text-amber-600 dark:text-amber-400">
                  Commodity
                </p>
                <Layers className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-amber-500" />
              </div>
              {isLoading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <h3 className="text-base sm:text-2xl font-bold tabular-nums">{formatQty(summary.commodity)}</h3>
              )}
              <p className="text-[9px] sm:text-xs text-muted-foreground">{formatMts(summary.commodity)} MTS</p>
            </CardContent>
          </Card>

          <Card className="border-none bg-violet-50/70 dark:bg-violet-950/20 shadow-sm">
            <CardContent className="p-3 sm:p-4 flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <p className="text-[10px] sm:text-xs uppercase tracking-wide text-violet-600 dark:text-violet-400">
                  Premium
                </p>
                <BarChart3 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-violet-500" />
              </div>
              {isLoading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <h3 className="text-base sm:text-2xl font-bold tabular-nums">{formatQty(summary.premium)}</h3>
              )}
              <p className="text-[9px] sm:text-xs text-muted-foreground">{formatMts(summary.premium)} MTS</p>
            </CardContent>
          </Card>

          <Card className="border-none bg-emerald-50/70 dark:bg-emerald-950/20 shadow-sm">
            <CardContent className="p-3 sm:p-4 flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <p className="text-[10px] sm:text-xs uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
                  Ecom
                </p>
                <CircleDollarSign className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-emerald-500" />
              </div>
              {isLoading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <h3 className="text-base sm:text-2xl font-bold tabular-nums">{formatQty(summary.ecom)}</h3>
              )}
              <p className="text-[9px] sm:text-xs text-muted-foreground">
                {summary.skus} SKU{summary.skus !== 1 ? "s" : ""} · {summary.groups} group
                {summary.groups !== 1 ? "s" : ""}
              </p>
            </CardContent>
          </Card>
        </div>

        <Card className="card-hover">
          <CardHeader>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <CardTitle>Planning by {GROUP_BY[groupBy].label}</CardTitle>
                <CardDescription>
                  {summary.groups} group{summary.groups !== 1 ? "s" : ""} from {filtered.length} SKU
                  {filtered.length !== 1 ? "s" : ""}
                  {hasFilters ? ` (filtered from ${planned.length})` : ""}
                  {zeroCount > 0 ? ` · ${zeroCount} SKU${zeroCount !== 1 ? "s" : ""} with no plan hidden` : ""}
                </CardDescription>
              </div>

              <div className="grid grid-cols-2 gap-2 lg:flex lg:flex-wrap lg:items-center lg:justify-end">
                <ViewToggle
                  className="col-span-2 justify-self-start lg:col-span-1"
                  value={view}
                  onChange={setView}
                  options={[
                    { value: "simple", label: "Simple", icon: LayoutList },
                    { value: "detailed", label: "Detailed", icon: Table2 },
                  ]}
                />

                <Select value={groupBy} onValueChange={(v) => setGroupBy(v as GroupKey)}>
                  <SelectTrigger className="h-8 text-xs lg:w-40" aria-label="Group by">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(GROUP_BY) as GroupKey[]).map((key) => (
                      <SelectItem key={key} value={key}>
                        Group by {GROUP_BY[key].label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={head} onValueChange={setHead}>
                  <SelectTrigger className="h-8 text-xs lg:w-36" aria-label="Filter by head">
                    <SelectValue placeholder="All heads" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL}>All heads</SelectItem>
                    {options.heads.map((v) => (
                      <SelectItem key={v} value={v}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={brand} onValueChange={setBrand}>
                  <SelectTrigger className="h-8 text-xs lg:w-36" aria-label="Filter by brand">
                    <SelectValue placeholder="All brands" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL}>All brands</SelectItem>
                    {options.brands.map((v) => (
                      <SelectItem key={v} value={v}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="h-8 text-xs lg:w-40" aria-label="Filter by category">
                    <SelectValue placeholder="All categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL}>All categories</SelectItem>
                    {options.categories.map((v) => (
                      <SelectItem key={v} value={v}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={subCategory} onValueChange={setSubCategory}>
                  <SelectTrigger className="h-8 text-xs lg:w-44" aria-label="Filter by sub-category">
                    <SelectValue placeholder="All sub-categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL}>All sub-categories</SelectItem>
                    {options.subCategories.map((v) => (
                      <SelectItem key={v} value={v}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="relative col-span-2 lg:col-span-1 lg:w-56">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search SKU or code"
                    value={search}
                    className="h-8 pl-8 text-xs"
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>

                {hasFilters && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearFilters}
                    className="h-8 px-2 text-xs"
                  >
                    <X className="h-4 w-4 mr-1" />
                    Clear
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>

          <CardContent>
            {view === "simple" ? (
              <div className="overflow-x-auto rounded-md border">
                <table className="w-full text-xs sm:text-sm">
                  <thead className="bg-muted/50">
                    <tr className="text-left">
                      <th className="px-3 py-3 font-bold">#</th>
                      <th className="px-3 py-3 font-bold">{GROUP_BY[groupBy].label}</th>
                      <th className="px-3 py-3 text-right font-bold">Planned MTS</th>
                      <th className="px-3 py-3 text-right font-bold">Share</th>
                      <th className="w-[30%] px-3 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {isLoading ? (
                      Array.from({ length: 6 }).map((_, i) => (
                        <tr key={i}>
                          {Array.from({ length: 5 }).map((__, j) => (
                            <td key={j} className="px-3 py-3">
                              <Skeleton className="h-4 w-20" />
                            </td>
                          ))}
                        </tr>
                      ))
                    ) : grouped.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-16 text-center text-muted-foreground">
                          {rows.length === 0
                            ? "Nothing to show yet."
                            : planned.length === 0
                              ? "No SKU carries a plan in this version."
                              : "No SKUs match these filters."}
                        </td>
                      </tr>
                    ) : (
                      grouped.map((group, index) => {
                        const pct = maxTotal > 0 ? Math.max(3, (group.total / maxTotal) * 100) : 0;
                        const share = summary.total > 0 ? (group.total / summary.total) * 100 : 0;
                        return (
                          <tr key={group.key} className="hover:bg-muted/30">
                            <td className="px-3 py-3 text-muted-foreground">{index + 1}</td>
                            <td className="px-3 py-3 font-semibold">{group.key}</td>
                            <td className="px-3 py-3 text-right font-bold tabular-nums">
                              {formatMts(group.total)}
                            </td>
                            <td className="px-3 py-3 text-right tabular-nums">
                              {share.toFixed(1)}%
                            </td>
                            <td className="px-3 py-3">
                              <div className="h-2 w-full rounded-full bg-muted">
                                <div
                                  className="h-2 rounded-full bg-primary"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                  {!isLoading && grouped.length > 0 && (
                    <tfoot className="border-t-2 bg-muted/30 font-bold">
                      <tr>
                        <td className="px-3 py-3" />
                        <td className="px-3 py-3">Total</td>
                        <td className="px-3 py-3 text-right tabular-nums">{formatMts(summary.total)}</td>
                        <td className="px-3 py-3 text-right tabular-nums">100.0%</td>
                        <td className="px-3 py-3" />
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-md border">
                <table className="w-full text-xs sm:text-sm">
                  <thead className="bg-muted/50">
                    <tr className="text-left">
                      <th className="px-3 py-3 font-bold">#</th>
                      <th className="px-3 py-3 font-bold">{GROUP_BY[groupBy].label}</th>
                      <th className="px-3 py-3 text-right font-bold">SKUs</th>
                      <th className="px-3 py-3 text-right font-bold">Commodity</th>
                      <th className="px-3 py-3 text-right font-bold">Premium</th>
                      <th className="px-3 py-3 text-right font-bold">Ecom</th>
                      <th className="px-3 py-3 text-right font-bold">Total</th>
                      <th className="px-3 py-3 text-right font-bold">MTS</th>
                      <th className="w-[16%] px-3 py-3 font-bold">Share</th>
                      <th className="px-3 py-3 text-right font-bold">W1</th>
                      <th className="px-3 py-3 text-right font-bold">W2</th>
                      <th className="px-3 py-3 text-right font-bold">W3</th>
                      <th className="px-3 py-3 text-right font-bold">W4</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {isLoading ? (
                      Array.from({ length: 6 }).map((_, i) => (
                        <tr key={i}>
                          {Array.from({ length: 13 }).map((__, j) => (
                            <td key={j} className="px-3 py-3">
                              <Skeleton className="h-4 w-16" />
                            </td>
                          ))}
                        </tr>
                      ))
                    ) : grouped.length === 0 ? (
                      <tr>
                        <td colSpan={13} className="py-16 text-center text-muted-foreground">
                          {rows.length === 0
                            ? "Nothing to show yet."
                            : planned.length === 0
                              ? "No SKU carries a plan in this version."
                              : "No SKUs match these filters."}
                        </td>
                      </tr>
                    ) : (
                      grouped.map((group, index) => {
                        const pct = maxTotal > 0 ? Math.max(3, (group.total / maxTotal) * 100) : 0;
                        const share = summary.total > 0 ? (group.total / summary.total) * 100 : 0;
                        return (
                          <tr key={group.key} className="hover:bg-muted/30">
                            <td className="px-3 py-3 text-muted-foreground">{index + 1}</td>
                            <td className="px-3 py-3 font-semibold">{group.key}</td>
                            <td className="px-3 py-3 text-right tabular-nums text-muted-foreground">
                              {group.skus}
                            </td>
                            <td className="px-3 py-3 text-right tabular-nums">
                              {group.commodity ? formatQty(group.commodity) : "—"}
                            </td>
                            <td className="px-3 py-3 text-right tabular-nums">
                              {group.premium ? formatQty(group.premium) : "—"}
                            </td>
                            <td className="px-3 py-3 text-right tabular-nums">
                              {group.ecom ? formatQty(group.ecom) : "—"}
                            </td>
                            <td className="px-3 py-3 text-right font-bold tabular-nums">
                              {formatQty(group.total)}
                            </td>
                            <td className="px-3 py-3 text-right tabular-nums text-muted-foreground">
                              {formatMts(group.total)}
                            </td>
                            <td className="px-3 py-3">
                              <div className="flex items-center gap-2">
                                <div className="h-2 flex-1 rounded-full bg-muted">
                                  <div
                                    className="h-2 rounded-full bg-primary"
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                                <span className="w-10 shrink-0 text-right text-[10px] tabular-nums text-muted-foreground">
                                  {share.toFixed(1)}%
                                </span>
                              </div>
                            </td>
                            <td className="px-3 py-3 text-right tabular-nums text-muted-foreground">
                              {group.w1 ? formatQty(group.w1) : "—"}
                            </td>
                            <td className="px-3 py-3 text-right tabular-nums text-muted-foreground">
                              {group.w2 ? formatQty(group.w2) : "—"}
                            </td>
                            <td className="px-3 py-3 text-right tabular-nums text-muted-foreground">
                              {group.w3 ? formatQty(group.w3) : "—"}
                            </td>
                            <td className="px-3 py-3 text-right tabular-nums text-muted-foreground">
                              {group.w4 ? formatQty(group.w4) : "—"}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                  {!isLoading && grouped.length > 0 && (
                    <tfoot className="border-t-2 bg-muted/30 font-bold">
                      <tr>
                        <td className="px-3 py-3" />
                        <td className="px-3 py-3">Total</td>
                        <td className="px-3 py-3 text-right tabular-nums">{summary.skus}</td>
                        <td className="px-3 py-3 text-right tabular-nums">{formatQty(summary.commodity)}</td>
                        <td className="px-3 py-3 text-right tabular-nums">{formatQty(summary.premium)}</td>
                        <td className="px-3 py-3 text-right tabular-nums">{formatQty(summary.ecom)}</td>
                        <td className="px-3 py-3 text-right tabular-nums">{formatQty(summary.total)}</td>
                        <td className="px-3 py-3 text-right tabular-nums">{formatMts(summary.total)}</td>
                        <td colSpan={5} className="px-3 py-3" />
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Guard>
  );
}
