import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AxiosError } from "axios";
import { FileText, Pencil, Trash2 } from "lucide-react";

import { getLicenseHeaders, deleteLicenseHeader, createLicenseHeader, updateLicenseHeader, type LicenseHeader, type LicenseHeaderPayload } from "@/api/license";
import { fmtDate, fmtDecimal } from "@/lib/formatters";
import { getErrorMessage } from "@/lib/errors";
import { Pagination } from "@/components/Pagination";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DateInput } from "@/components/ui/date-input";
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
    import_in_mts: "",
    cif_value_inr: "",
    cif_value_usd: "",
    cif_exchange_rate: "",
    export_in_mts: "",
    fob_value_inr: "",
    fob_value_usd: "",
    fob_exhange_rate: "",
    status: "OPEN",
  });
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  // Edit dialog state
  const [editOpen, setEditOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<LicenseHeader | null>(null);
  const [editForm, setEditForm] = useState<LicenseHeaderPayload>({
    license_no: "", issue_date: "", import_validity: "", export_validity: "", import_in_mts: "",
    cif_value_inr: "", cif_value_usd: "", cif_exchange_rate: "",
    export_in_mts: "", fob_value_inr: "", fob_value_usd: "", fob_exhange_rate: "", status: "OPEN",
  });
  const [editFormError, setEditFormError] = useState("");
  const [updating, setUpdating] = useState(false);

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState<LicenseHeader | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Pagination
  const [page, setPage] = useState(1);
  const perPage = 20;
  const totalPages = Math.max(1, Math.ceil(headers.length / perPage));
  const paginated = headers.slice((page - 1) * perPage, page * perPage);

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
      import_in_mts: "",
      cif_value_inr: "",
      cif_value_usd: "",
      cif_exchange_rate: "",
      export_in_mts: "",
      fob_value_inr: "",
      fob_value_usd: "",
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
      import_in_mts: h.import_in_mts, cif_value_inr: h.cif_value_inr, cif_value_usd: h.cif_value_usd,
      cif_exchange_rate: h.cif_exchange_rate, export_in_mts: h.export_in_mts, fob_value_inr: h.fob_value_inr,
      fob_value_usd: h.fob_value_usd, fob_exhange_rate: h.fob_exhange_rate, status: h.status,
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

  const columns = [
    "#",
    "License No",
    "Status",
    "Issue Date",
    "Import Validity",
    "Export Validity",
    "Import (MTS)",
    "Export (MTS)",
    "CIF (INR)",
    "CIF (USD)",
    "CIF Rate",
    "FOB (INR)",
    "FOB (USD)",
    "FOB Rate",
    "Actions",
  ];

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
        <Button onClick={openCreate} className="btn-press">Create License</Button>
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
                    {columns.map((col) => (
                      <TableHead key={col}>{col}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {columns.map((col) => (
                        <TableCell key={col}><Skeleton className="h-4 w-20" /></TableCell>
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
                    {columns.map((col) => (
                      <TableHead key={col} className={col.includes("INR") || col.includes("USD") || col.includes("MTS") || col.includes("Rate") ? "text-right" : col === "Actions" ? "text-right" : ""}>
                        {col}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginated.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={columns.length} className="py-16">
                        <div className="flex flex-col items-center gap-2 text-muted-foreground">
                          <FileText className="h-10 w-10 stroke-1" />
                          <p className="text-sm font-medium">No licenses found</p>
                          <p className="text-xs">Licenses will appear here once created.</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginated.map((h, i) => (
                      <TableRow key={h.license_no} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/license/advance-license/${encodeURIComponent(h.license_no)}`)}>
                        <TableCell className="font-medium">{(page - 1) * perPage + i + 1}</TableCell>
                        <TableCell>
                          <span className="text-primary underline underline-offset-4 font-medium">
                            {h.license_no}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant={STATUS_VARIANT[h.status] ?? "outline"}>
                            {h.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{fmtDate(h.issue_date)}</TableCell>
                        <TableCell>{fmtDate(h.import_validity)}</TableCell>
                        <TableCell>{fmtDate(h.export_validity)}</TableCell>
                        <TableCell className="text-right">{fmtDecimal(h.import_in_mts)}</TableCell>
                        <TableCell className="text-right">{fmtDecimal(h.export_in_mts)}</TableCell>
                        <TableCell className="text-right">{fmtDecimal(h.cif_value_inr)}</TableCell>
                        <TableCell className="text-right">{fmtDecimal(h.cif_value_usd)}</TableCell>
                        <TableCell className="text-right">{fmtDecimal(h.cif_exchange_rate)}</TableCell>
                        <TableCell className="text-right">{fmtDecimal(h.fob_value_inr)}</TableCell>
                        <TableCell className="text-right">{fmtDecimal(h.fob_value_usd)}</TableCell>
                        <TableCell className="text-right">{fmtDecimal(h.fob_exhange_rate)}</TableCell>
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
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination */}
          {!loading && (
            <Pagination page={page} totalPages={totalPages} totalItems={headers.length} perPage={perPage} onPageChange={setPage} />
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
              <Label htmlFor="issue_date">Issue Date</Label>
              <DateInput id="issue_date" value={form.issue_date} onChange={(e) => setForm({ ...form, issue_date: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="import_validity">Import Validity</Label>
              <DateInput id="import_validity" value={form.import_validity} onChange={(e) => setForm({ ...form, import_validity: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="export_validity">Export Validity</Label>
              <DateInput id="export_validity" value={form.export_validity} onChange={(e) => setForm({ ...form, export_validity: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="import_in_mts">Import (MTS)</Label>
              <Input id="import_in_mts" type="number" step="0.001" value={form.import_in_mts} onChange={(e) => setForm({ ...form, import_in_mts: e.target.value })} placeholder="500.000" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="export_in_mts">Export (MTS)</Label>
              <Input id="export_in_mts" type="number" step="0.001" value={form.export_in_mts} onChange={(e) => setForm({ ...form, export_in_mts: e.target.value })} placeholder="450.000" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cif_value_inr">CIF Value (INR)</Label>
              <Input id="cif_value_inr" type="number" step="0.001" value={form.cif_value_inr} onChange={(e) => setForm({ ...form, cif_value_inr: e.target.value })} placeholder="8300000.000" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cif_value_usd">CIF Value (USD)</Label>
              <Input id="cif_value_usd" type="number" step="0.001" value={form.cif_value_usd} onChange={(e) => setForm({ ...form, cif_value_usd: e.target.value })} placeholder="100000.000" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cif_exchange_rate">CIF Exchange Rate</Label>
              <Input id="cif_exchange_rate" type="number" step="0.001" value={form.cif_exchange_rate} onChange={(e) => setForm({ ...form, cif_exchange_rate: e.target.value })} placeholder="83.000" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fob_value_inr">FOB Value (INR)</Label>
              <Input id="fob_value_inr" type="number" step="0.001" value={form.fob_value_inr} onChange={(e) => setForm({ ...form, fob_value_inr: e.target.value })} placeholder="9130000.000" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fob_value_usd">FOB Value (USD)</Label>
              <Input id="fob_value_usd" type="number" step="0.001" value={form.fob_value_usd} onChange={(e) => setForm({ ...form, fob_value_usd: e.target.value })} placeholder="110000.000" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fob_exhange_rate">FOB Exchange Rate</Label>
              <Input id="fob_exhange_rate" type="number" step="0.001" value={form.fob_exhange_rate} onChange={(e) => setForm({ ...form, fob_exhange_rate: e.target.value })} placeholder="83.000" />
            </div>
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
              <Label htmlFor="edit_issue_date">Issue Date</Label>
              <DateInput id="edit_issue_date" value={editForm.issue_date} onChange={(e) => setEditForm({ ...editForm, issue_date: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_import_validity">Import Validity</Label>
              <DateInput id="edit_import_validity" value={editForm.import_validity} onChange={(e) => setEditForm({ ...editForm, import_validity: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_export_validity">Export Validity</Label>
              <DateInput id="edit_export_validity" value={editForm.export_validity} onChange={(e) => setEditForm({ ...editForm, export_validity: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_import_in_mts">Import (MTS)</Label>
              <Input id="edit_import_in_mts" type="number" step="0.001" value={editForm.import_in_mts} onChange={(e) => setEditForm({ ...editForm, import_in_mts: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_export_in_mts">Export (MTS)</Label>
              <Input id="edit_export_in_mts" type="number" step="0.001" value={editForm.export_in_mts} onChange={(e) => setEditForm({ ...editForm, export_in_mts: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_cif_value_inr">CIF Value (INR)</Label>
              <Input id="edit_cif_value_inr" type="number" step="0.001" value={editForm.cif_value_inr} onChange={(e) => setEditForm({ ...editForm, cif_value_inr: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_cif_value_usd">CIF Value (USD)</Label>
              <Input id="edit_cif_value_usd" type="number" step="0.001" value={editForm.cif_value_usd} onChange={(e) => setEditForm({ ...editForm, cif_value_usd: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_cif_exchange_rate">CIF Exchange Rate</Label>
              <Input id="edit_cif_exchange_rate" type="number" step="0.001" value={editForm.cif_exchange_rate} onChange={(e) => setEditForm({ ...editForm, cif_exchange_rate: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_fob_value_inr">FOB Value (INR)</Label>
              <Input id="edit_fob_value_inr" type="number" step="0.001" value={editForm.fob_value_inr} onChange={(e) => setEditForm({ ...editForm, fob_value_inr: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_fob_value_usd">FOB Value (USD)</Label>
              <Input id="edit_fob_value_usd" type="number" step="0.001" value={editForm.fob_value_usd} onChange={(e) => setEditForm({ ...editForm, fob_value_usd: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_fob_exhange_rate">FOB Exchange Rate</Label>
              <Input id="edit_fob_exhange_rate" type="number" step="0.001" value={editForm.fob_exhange_rate} onChange={(e) => setEditForm({ ...editForm, fob_exhange_rate: e.target.value })} />
            </div>
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
