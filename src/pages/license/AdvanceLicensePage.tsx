import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AxiosError } from "axios";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  FileText,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";

import { getLicenseHeaders, deleteLicenseHeader, createLicenseHeader, updateLicenseHeader, type LicenseHeader, type LicenseHeaderPayload } from "@/api/license";
import { fmtDate, fmtDecimal } from "@/lib/formatters";
import { getErrorMessage } from "@/lib/errors";
import { Pagination } from "@/components/Pagination";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  OPEN: "default",
  CLOSE: "secondary",
};

/* ── sort types ──────────────────────────────────────────── */

type SortKey =
  | "license_no"
  | "status"
  | "issue_date"
  | "import_validity"
  | "export_validity"
  | "cif_value_inr"
  | "cif_value_usd"
  | "cif_exchange_rate"
  | "fob_value_inr"
  | "fob_value_usd"
  | "fob_exhange_rate"
  | "total_import"
  | "total_export"
  | "to_be_exported"
  | "balance";
type SortDir = "asc" | "desc";

/* ── validity helpers ────────────────────────────────────── */

function daysUntil(dateStr: string): number | null {
  if (!dateStr) return null;
  const target = new Date(dateStr);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function validityBadge(dateStr: string) {
  const days = daysUntil(dateStr);
  if (days === null) return null;
  if (days < 0)
    return <Badge variant="destructive" className="text-[10px] px-1.5 py-0 ml-1.5">Expired</Badge>;
  if (days <= 30)
    return <Badge variant="outline" className="text-[10px] px-1.5 py-0 ml-1.5 border-amber-300 text-amber-600 dark:border-amber-700 dark:text-amber-400">{days}d left</Badge>;
  return null;
}

export default function AdvanceLicensePage() {
  const navigate = useNavigate();
  const [headers, setHeaders] = useState<LicenseHeader[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Create dialog state
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState<LicenseHeaderPayload>({
    license_no: "",
    issue_date: "",
    import_validity: "",
    export_validity: "",
    cif_value_inr: "",
    cif_exchange_rate: "",
    fob_value_inr: "",
    fob_exhange_rate: "",
    status: "OPEN",
  });
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  // Edit dialog state
  const [editOpen, setEditOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<LicenseHeader | null>(null);
  const [editForm, setEditForm] = useState<LicenseHeaderPayload>({
    license_no: "", issue_date: "", import_validity: "", export_validity: "",
    cif_value_inr: "", cif_exchange_rate: "",
    fob_value_inr: "", fob_exhange_rate: "", status: "OPEN",
  });
  const [editFormError, setEditFormError] = useState("");
  const [updating, setUpdating] = useState(false);

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState<LicenseHeader | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Sort
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  // Pagination
  const [page, setPage] = useState(1);
  const perPage = 20;

  const sortedHeaders = useMemo(() => {
    if (!sortKey) return headers;
    const copy = [...headers];
    copy.sort((a, b) => {
      let cmp = 0;
      const aVal = a[sortKey as keyof LicenseHeader] ?? "";
      const bVal = b[sortKey as keyof LicenseHeader] ?? "";
      if (["cif_value_inr", "cif_value_usd", "cif_exchange_rate", "fob_value_inr", "fob_value_usd", "fob_exhange_rate", "total_import", "total_export", "to_be_exported", "balance"].includes(sortKey)) {
        cmp = (Number(aVal) || 0) - (Number(bVal) || 0);
      } else {
        cmp = String(aVal).localeCompare(String(bVal));
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return copy;
  }, [headers, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sortedHeaders.length / perPage));
  const paginated = sortedHeaders.slice((page - 1) * perPage, page * perPage);

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  function SortIcon({ column }: { column: SortKey }) {
    if (sortKey !== column) return <ArrowUpDown className="h-3 w-3 text-muted-foreground/50 ml-1 inline" />;
    return sortDir === "asc" ? <ArrowUp className="h-3 w-3 ml-1 inline" /> : <ArrowDown className="h-3 w-3 ml-1 inline" />;
  }

  async function fetchHeaders() {
    setLoading(true);
    setError("");
    try {
      const data = await getLicenseHeaders();
      setHeaders(data);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load licenses"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchHeaders();
  }, []);

  function openCreate() {
    setForm({
      license_no: "",
      issue_date: "",
      import_validity: "",
      export_validity: "",
      cif_value_inr: "",
      cif_exchange_rate: "",
      fob_value_inr: "",
      fob_exhange_rate: "",
      status: "OPEN",
    });
    setFormError("");
    setCreateOpen(true);
  }

  async function handleCreate() {
    setSaving(true);
    setFormError("");
    try {
      await createLicenseHeader(form);
      setCreateOpen(false);
      fetchHeaders();
    } catch (err) {
      if (err instanceof AxiosError) {
        const data = err.response?.data;
        if (typeof data === "object" && data !== null) {
          const messages = Object.entries(data)
            .map(([key, val]) => `${key}: ${Array.isArray(val) ? val.join(", ") : val}`)
            .join("; ");
          setFormError(messages);
        } else {
          setFormError(typeof data === "string" ? data : err.message);
        }
      } else {
        setFormError("Something went wrong");
      }
    } finally {
      setSaving(false);
    }
  }

  function openEdit(h: LicenseHeader) {
    setEditTarget(h);
    setEditForm({
      license_no: h.license_no, issue_date: h.issue_date, import_validity: h.import_validity, export_validity: h.export_validity,
      cif_value_inr: h.cif_value_inr,
      cif_exchange_rate: h.cif_exchange_rate, fob_value_inr: h.fob_value_inr,
      fob_exhange_rate: h.fob_exhange_rate, status: h.status,
    });
    setEditFormError("");
    setEditOpen(true);
  }

  async function handleUpdate() {
    if (!editTarget) return;
    setUpdating(true);
    setEditFormError("");
    try {
      await updateLicenseHeader(editTarget.license_no, editForm);
      setEditOpen(false);
      setEditTarget(null);
      fetchHeaders();
    } catch (err) {
      if (err instanceof AxiosError) {
        const data = err.response?.data;
        if (typeof data === "object" && data !== null) {
          const messages = Object.entries(data)
            .map(([key, val]) => `${key}: ${Array.isArray(val) ? val.join(", ") : val}`)
            .join("; ");
          setEditFormError(messages);
        } else {
          setEditFormError(typeof data === "string" ? data : err.message);
        }
      } else {
        setEditFormError("Something went wrong");
      }
    } finally {
      setUpdating(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteLicenseHeader(deleteTarget.license_no);
      setDeleteTarget(null);
      fetchHeaders();
    } catch (err) {
      setError(getErrorMessage(err, "Failed to delete license"));
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  }

  const skeletonCols = 17;

  return (
    <div className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6 animate-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Advance License</h1>
          <p className="text-sm text-muted-foreground">
            View and manage advance licenses
          </p>
        </div>
        <Button onClick={openCreate} className="btn-press gap-2">
          <Plus className="h-4 w-4" />
          Create License
        </Button>
      </div>

      {/* Error */}
      {error && <p className="text-sm text-destructive">{error}</p>}

      {/* Table Card */}
      <Card className="card-hover shimmer-hover">
        <CardHeader>
          <CardTitle>Licenses</CardTitle>
          <CardDescription>{headers.length} license{headers.length !== 1 ? "s" : ""} found</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {Array.from({ length: skeletonCols }).map((_, i) => (
                      <TableHead key={i}><Skeleton className="h-4 w-16" /></TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: skeletonCols }).map((_, j) => (
                        <TableCell key={j}><Skeleton className="h-4 w-20" /></TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>S.No</TableHead>
                    <TableHead>
                      <button type="button" className="flex items-center cursor-pointer hover:text-foreground transition-colors" onClick={() => handleSort("license_no")}>
                        License No<SortIcon column="license_no" />
                      </button>
                    </TableHead>
                    <TableHead>
                      <button type="button" className="flex items-center cursor-pointer hover:text-foreground transition-colors" onClick={() => handleSort("status")}>
                        Status<SortIcon column="status" />
                      </button>
                    </TableHead>
                    <TableHead>
                      <button type="button" className="flex items-center cursor-pointer hover:text-foreground transition-colors" onClick={() => handleSort("issue_date")}>
                        Issue Date<SortIcon column="issue_date" />
                      </button>
                    </TableHead>
                    <TableHead>
                      <button type="button" className="flex items-center cursor-pointer hover:text-foreground transition-colors" onClick={() => handleSort("import_validity")}>
                        Import Validity<SortIcon column="import_validity" />
                      </button>
                    </TableHead>
                    <TableHead>
                      <button type="button" className="flex items-center cursor-pointer hover:text-foreground transition-colors" onClick={() => handleSort("export_validity")}>
                        Export Validity<SortIcon column="export_validity" />
                      </button>
                    </TableHead>
                    <TableHead className="text-right">
                      <button type="button" className="flex items-center cursor-pointer hover:text-foreground transition-colors ml-auto" onClick={() => handleSort("cif_value_inr")}>
                        CIF (INR)<SortIcon column="cif_value_inr" />
                      </button>
                    </TableHead>
                    <TableHead className="text-right">
                      <button type="button" className="flex items-center cursor-pointer hover:text-foreground transition-colors ml-auto" onClick={() => handleSort("cif_value_usd")}>
                        CIF (USD)<SortIcon column="cif_value_usd" />
                      </button>
                    </TableHead>
                    <TableHead className="text-right">
                      <button type="button" className="flex items-center cursor-pointer hover:text-foreground transition-colors ml-auto" onClick={() => handleSort("cif_exchange_rate")}>
                        CIF Rate<SortIcon column="cif_exchange_rate" />
                      </button>
                    </TableHead>
                    <TableHead className="text-right">
                      <button type="button" className="flex items-center cursor-pointer hover:text-foreground transition-colors ml-auto" onClick={() => handleSort("fob_value_inr")}>
                        FOB (INR)<SortIcon column="fob_value_inr" />
                      </button>
                    </TableHead>
                    <TableHead className="text-right">
                      <button type="button" className="flex items-center cursor-pointer hover:text-foreground transition-colors ml-auto" onClick={() => handleSort("fob_value_usd")}>
                        FOB (USD)<SortIcon column="fob_value_usd" />
                      </button>
                    </TableHead>
                    <TableHead className="text-right">
                      <button type="button" className="flex items-center cursor-pointer hover:text-foreground transition-colors ml-auto" onClick={() => handleSort("fob_exhange_rate")}>
                        FOB Rate<SortIcon column="fob_exhange_rate" />
                      </button>
                    </TableHead>
                    <TableHead className="text-right">
                      <button type="button" className="flex items-center cursor-pointer hover:text-foreground transition-colors ml-auto" onClick={() => handleSort("total_import")}>
                        Total Import<SortIcon column="total_import" />
                      </button>
                    </TableHead>
                    <TableHead className="text-right">
                      <button type="button" className="flex items-center cursor-pointer hover:text-foreground transition-colors ml-auto" onClick={() => handleSort("total_export")}>
                        Total Export<SortIcon column="total_export" />
                      </button>
                    </TableHead>
                    <TableHead className="text-right">
                      <button type="button" className="flex items-center cursor-pointer hover:text-foreground transition-colors ml-auto" onClick={() => handleSort("to_be_exported")}>
                        To Export<SortIcon column="to_be_exported" />
                      </button>
                    </TableHead>
                    <TableHead className="text-right">
                      <button type="button" className="flex items-center cursor-pointer hover:text-foreground transition-colors ml-auto" onClick={() => handleSort("balance")}>
                        Balance<SortIcon column="balance" />
                      </button>
                    </TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginated.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={skeletonCols} className="py-16">
                        <div className="flex flex-col items-center gap-3 text-muted-foreground">
                          <FileText className="h-10 w-10 stroke-1" />
                          <p className="font-medium">No licenses found</p>
                          <p className="text-sm">Create your first advance license to get started.</p>
                          <Button size="sm" variant="outline" className="gap-1.5" onClick={openCreate}>
                            <Plus className="h-3.5 w-3.5" />
                            Create License
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginated.map((h, i) => {
                      const isClosed = h.status === "CLOSE";
                      return (
                        <TableRow
                          key={h.license_no}
                          // className={`cursor-pointer hover:bg-muted/50 ${isClosed ? "opacity-40 line-through decoration-muted-foreground/30" : ""}`}
                          className={`cursor-pointer hover:bg-muted/50 `}
                          onClick={() => navigate(`/license/advance-license/${encodeURIComponent(h.license_no)}`)}
                        >
                          <TableCell className="font-medium">{(page - 1) * perPage + i + 1}</TableCell>
                          <TableCell>
                            <span className="text-primary underline underline-offset-4 font-medium no-underline-override">
                              {h.license_no}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge variant={STATUS_VARIANT[h.status] ?? "outline"}>
                              {h.status}
                            </Badge>
                          </TableCell>
                          <TableCell>{fmtDate(h.issue_date)}</TableCell>
                          <TableCell>
                            <div className="flex items-center">
                              {fmtDate(h.import_validity)}
                              {!isClosed && validityBadge(h.import_validity)}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center">
                              {fmtDate(h.export_validity)}
                              {!isClosed && validityBadge(h.export_validity)}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">{fmtDecimal(h.cif_value_inr)}</TableCell>
                          <TableCell className="text-right">{fmtDecimal(h.cif_value_usd)}</TableCell>
                          <TableCell className="text-right">{fmtDecimal(h.cif_exchange_rate)}</TableCell>
                          <TableCell className="text-right">{fmtDecimal(h.fob_value_inr)}</TableCell>
                          <TableCell className="text-right">{fmtDecimal(h.fob_value_usd)}</TableCell>
                          <TableCell className="text-right">{fmtDecimal(h.fob_exhange_rate)}</TableCell>
                          <TableCell className="text-right">{fmtDecimal(h.total_import)}</TableCell>
                          <TableCell className="text-right">{fmtDecimal(h.total_export)}</TableCell>
                          <TableCell className="text-right">{fmtDecimal(h.to_be_exported)}</TableCell>
                          <TableCell className="text-right">{fmtDecimal(h.balance)}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-muted-foreground hover:text-primary hover:bg-primary/10"
                              onClick={(e) => { e.stopPropagation(); openEdit(h); }}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteTarget(h);
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination */}
          {!loading && (
            <Pagination page={page} totalPages={totalPages} totalItems={sortedHeaders.length} perPage={perPage} onPageChange={setPage} />
          )}
        </CardContent>
      </Card>

      {/* Create License Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create License</DialogTitle>
            <DialogDescription>Fill in the details to create a new advance license.</DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="license_no">License No</Label>
              <Input id="license_no" value={form.license_no} onChange={(e) => setForm({ ...form, license_no: e.target.value })} placeholder="ADV-12345678" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={form.status} onValueChange={(val) => setForm({ ...form, status: val })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="OPEN">OPEN</SelectItem>
                  <SelectItem value="CLOSE">CLOSE</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Issue Date</Label>
              <DatePicker value={form.issue_date} onChange={(v) => setForm({ ...form, issue_date: v })} className="w-full" />
            </div>
            <div className="space-y-2">
              <Label>Import Validity</Label>
              <DatePicker value={form.import_validity} onChange={(v) => setForm({ ...form, import_validity: v })} className="w-full" />
            </div>
            <div className="space-y-2">
              <Label>Export Validity</Label>
              <DatePicker value={form.export_validity} onChange={(v) => setForm({ ...form, export_validity: v })} className="w-full" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cif_value_inr">CIF Value (INR)</Label>
              <Input id="cif_value_inr" type="number" step="0.001" value={form.cif_value_inr} onChange={(e) => setForm({ ...form, cif_value_inr: e.target.value })} placeholder="8300000.000" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cif_exchange_rate">CIF Exchange Rate</Label>
              <Input id="cif_exchange_rate" type="number" step="0.001" value={form.cif_exchange_rate} onChange={(e) => setForm({ ...form, cif_exchange_rate: e.target.value })} placeholder="83.000" />
            </div>
            {Number(form.cif_value_inr) > 0 && Number(form.cif_exchange_rate) > 0 && (
              <div className="space-y-2">
                <Label className="text-muted-foreground">CIF Value (USD)</Label>
                <p className="text-sm font-medium pt-1">$ {(Number(form.cif_value_inr) / Number(form.cif_exchange_rate)).toLocaleString("en-IN", { minimumFractionDigits: 3, maximumFractionDigits: 3 })}</p>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="fob_value_inr">FOB Value (INR)</Label>
              <Input id="fob_value_inr" type="number" step="0.001" value={form.fob_value_inr} onChange={(e) => setForm({ ...form, fob_value_inr: e.target.value })} placeholder="9130000.000" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fob_exhange_rate">FOB Exchange Rate</Label>
              <Input id="fob_exhange_rate" type="number" step="0.001" value={form.fob_exhange_rate} onChange={(e) => setForm({ ...form, fob_exhange_rate: e.target.value })} placeholder="83.000" />
            </div>
            {Number(form.fob_value_inr) > 0 && Number(form.fob_exhange_rate) > 0 && (
              <div className="space-y-2">
                <Label className="text-muted-foreground">FOB Value (USD)</Label>
                <p className="text-sm font-medium pt-1">$ {(Number(form.fob_value_inr) / Number(form.fob_exhange_rate)).toLocaleString("en-IN", { minimumFractionDigits: 3, maximumFractionDigits: 3 })}</p>
              </div>
            )}
          </div>

          {formError && <p className="text-sm text-destructive">{formError}</p>}

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={saving}>
              {saving ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit License Dialog */}
      <Dialog open={editOpen} onOpenChange={(open) => { if (!open) { setEditOpen(false); setEditTarget(null); } }}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit License</DialogTitle>
            <DialogDescription>Editing <strong>{editTarget?.license_no}</strong>. License No cannot be changed.</DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4 py-2">
            <div className="space-y-2">
              <Label>License No</Label>
              <Input value={editTarget?.license_no ?? ""} disabled />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_status">Status</Label>
              <Select value={editForm.status} onValueChange={(val) => setEditForm({ ...editForm, status: val })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="OPEN">OPEN</SelectItem>
                  <SelectItem value="CLOSE">CLOSE</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Issue Date</Label>
              <DatePicker value={editForm.issue_date} onChange={(v) => setEditForm({ ...editForm, issue_date: v })} className="w-full" />
            </div>
            <div className="space-y-2">
              <Label>Import Validity</Label>
              <DatePicker value={editForm.import_validity} onChange={(v) => setEditForm({ ...editForm, import_validity: v })} className="w-full" />
            </div>
            <div className="space-y-2">
              <Label>Export Validity</Label>
              <DatePicker value={editForm.export_validity} onChange={(v) => setEditForm({ ...editForm, export_validity: v })} className="w-full" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_cif_value_inr">CIF Value (INR)</Label>
              <Input id="edit_cif_value_inr" type="number" step="0.001" value={editForm.cif_value_inr} onChange={(e) => setEditForm({ ...editForm, cif_value_inr: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_cif_exchange_rate">CIF Exchange Rate</Label>
              <Input id="edit_cif_exchange_rate" type="number" step="0.001" value={editForm.cif_exchange_rate} onChange={(e) => setEditForm({ ...editForm, cif_exchange_rate: e.target.value })} />
            </div>
            {Number(editForm.cif_value_inr) > 0 && Number(editForm.cif_exchange_rate) > 0 && (
              <div className="space-y-2">
                <Label className="text-muted-foreground">CIF Value (USD)</Label>
                <p className="text-sm font-medium pt-1">$ {(Number(editForm.cif_value_inr) / Number(editForm.cif_exchange_rate)).toLocaleString("en-IN", { minimumFractionDigits: 3, maximumFractionDigits: 3 })}</p>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="edit_fob_value_inr">FOB Value (INR)</Label>
              <Input id="edit_fob_value_inr" type="number" step="0.001" value={editForm.fob_value_inr} onChange={(e) => setEditForm({ ...editForm, fob_value_inr: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_fob_exhange_rate">FOB Exchange Rate</Label>
              <Input id="edit_fob_exhange_rate" type="number" step="0.001" value={editForm.fob_exhange_rate} onChange={(e) => setEditForm({ ...editForm, fob_exhange_rate: e.target.value })} />
            </div>
            {Number(editForm.fob_value_inr) > 0 && Number(editForm.fob_exhange_rate) > 0 && (
              <div className="space-y-2">
                <Label className="text-muted-foreground">FOB Value (USD)</Label>
                <p className="text-sm font-medium pt-1">$ {(Number(editForm.fob_value_inr) / Number(editForm.fob_exhange_rate)).toLocaleString("en-IN", { minimumFractionDigits: 3, maximumFractionDigits: 3 })}</p>
              </div>
            )}
          </div>

          {editFormError && <p className="text-sm text-destructive">{editFormError}</p>}

          <DialogFooter>
            <Button variant="outline" onClick={() => { setEditOpen(false); setEditTarget(null); }}>Cancel</Button>
            <Button onClick={handleUpdate} disabled={updating}>
              {updating ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete License</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{deleteTarget?.license_no}</strong>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
