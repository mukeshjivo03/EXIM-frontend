import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AxiosError } from "axios";
import { ArrowLeft, Plus, FileText, Pencil, Trash2 } from "lucide-react";

import {
  getDFIALicenseHeader,
  createDFIAImportLine,
  updateDFIAImportLine,
  deleteDFIAImportLine,
  createDFIAExportLine,
  updateDFIAExportLine,
  deleteDFIAExportLine,
  type DFIALicenseHeader,
  type DFIAImportLine,
  type DFIAExportLine,
  type DFIAImportLinePayload,
  type DFIAExportLinePayload,
} from "@/api/license";
import { fmtDate, fmtDecimal } from "@/lib/formatters";
import { getErrorMessage } from "@/lib/errors";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
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
  Active: "default",
};

type ImportForm = Omit<DFIAImportLinePayload, "license_no">;
type ExportForm = Omit<DFIAExportLinePayload, "license_no">;

const emptyImportForm: ImportForm = { boe_no: "", boe_value_usd: "", boe_date: "", import_in_mts: "" };
const emptyExportForm: ExportForm = { shipping_bill_no: "", sb_value_usd: "", sb_date: "", export_in_mts: "" };

export default function DFIALicenseDetailPage() {
  const { fileNo } = useParams<{ fileNo: string }>();
  const navigate = useNavigate();
  const [header, setHeader] = useState<DFIALicenseHeader | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Import line – create
  const [importOpen, setImportOpen] = useState(false);
  const [importForm, setImportForm] = useState<ImportForm>(emptyImportForm);
  const [importError, setImportError] = useState("");
  const [savingImport, setSavingImport] = useState(false);

  // Import line – edit
  const [editImportOpen, setEditImportOpen] = useState(false);
  const [editImportTarget, setEditImportTarget] = useState<DFIAImportLine | null>(null);
  const [editImportForm, setEditImportForm] = useState<ImportForm>(emptyImportForm);
  const [editImportError, setEditImportError] = useState("");
  const [updatingImport, setUpdatingImport] = useState(false);

  // Import line – delete
  const [deleteImportTarget, setDeleteImportTarget] = useState<DFIAImportLine | null>(null);
  const [deletingImport, setDeletingImport] = useState(false);

  // Export line – create
  const [exportOpen, setExportOpen] = useState(false);
  const [exportForm, setExportForm] = useState<ExportForm>(emptyExportForm);
  const [exportError, setExportError] = useState("");
  const [savingExport, setSavingExport] = useState(false);

  // Export line – edit
  const [editExportOpen, setEditExportOpen] = useState(false);
  const [editExportTarget, setEditExportTarget] = useState<DFIAExportLine | null>(null);
  const [editExportForm, setEditExportForm] = useState<ExportForm>(emptyExportForm);
  const [editExportError, setEditExportError] = useState("");
  const [updatingExport, setUpdatingExport] = useState(false);

  // Export line – delete
  const [deleteExportTarget, setDeleteExportTarget] = useState<DFIAExportLine | null>(null);
  const [deletingExport, setDeletingExport] = useState(false);

  async function fetchData() {
    setLoading(true);
    setError("");
    try {
      const data = await getDFIALicenseHeader(fileNo!);
      setHeader(data);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load DFIA license details"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchData(); }, [fileNo]);

  function parseAxiosError(err: unknown): string {
    if (err instanceof AxiosError) {
      const data = err.response?.data;
      if (typeof data === "object" && data !== null) {
        return Object.entries(data)
          .map(([key, val]) => `${key}: ${Array.isArray(val) ? val.join(", ") : val}`)
          .join("; ");
      }
      return typeof data === "string" ? data : err.message;
    }
    return "Something went wrong";
  }

  /* ── Import CRUD ─────────────────────────────────────────── */

  async function handleSaveImport() {
    setSavingImport(true);
    setImportError("");
    try {
      await createDFIAImportLine({ ...importForm, license_no: fileNo! });
      setImportOpen(false);
      setImportForm(emptyImportForm);
      fetchData();
    } catch (err) {
      setImportError(parseAxiosError(err));
    } finally {
      setSavingImport(false);
    }
  }

  function openEditImport(line: DFIAImportLine) {
    setEditImportTarget(line);
    setEditImportForm({ boe_no: line.boe_no, boe_value_usd: line.boe_value_usd, boe_date: line.boe_date, import_in_mts: line.import_in_mts });
    setEditImportError("");
    setEditImportOpen(true);
  }

  async function handleUpdateImport() {
    if (!editImportTarget) return;
    setUpdatingImport(true);
    setEditImportError("");
    try {
      await updateDFIAImportLine(editImportTarget.id, { ...editImportForm, license_no: fileNo! });
      setEditImportOpen(false);
      setEditImportTarget(null);
      fetchData();
    } catch (err) {
      setEditImportError(parseAxiosError(err));
    } finally {
      setUpdatingImport(false);
    }
  }

  async function handleDeleteImport() {
    if (!deleteImportTarget) return;
    setDeletingImport(true);
    try {
      await deleteDFIAImportLine(deleteImportTarget.id);
      setDeleteImportTarget(null);
      fetchData();
    } catch (err) {
      setError(getErrorMessage(err, "Failed to delete import line"));
      setDeleteImportTarget(null);
    } finally {
      setDeletingImport(false);
    }
  }

  /* ── Export CRUD ─────────────────────────────────────────── */

  async function handleSaveExport() {
    setSavingExport(true);
    setExportError("");
    try {
      await createDFIAExportLine({ ...exportForm, license_no: fileNo! });
      setExportOpen(false);
      setExportForm(emptyExportForm);
      fetchData();
    } catch (err) {
      setExportError(parseAxiosError(err));
    } finally {
      setSavingExport(false);
    }
  }

  function openEditExport(line: DFIAExportLine) {
    setEditExportTarget(line);
    setEditExportForm({ shipping_bill_no: line.shipping_bill_no, sb_value_usd: line.sb_value_usd, sb_date: line.sb_date ?? "", export_in_mts: line.export_in_mts });
    setEditExportError("");
    setEditExportOpen(true);
  }

  async function handleUpdateExport() {
    if (!editExportTarget) return;
    setUpdatingExport(true);
    setEditExportError("");
    try {
      await updateDFIAExportLine(editExportTarget.id, { ...editExportForm, license_no: fileNo! });
      setEditExportOpen(false);
      setEditExportTarget(null);
      fetchData();
    } catch (err) {
      setEditExportError(parseAxiosError(err));
    } finally {
      setUpdatingExport(false);
    }
  }

  async function handleDeleteExport() {
    if (!deleteExportTarget) return;
    setDeletingExport(true);
    try {
      await deleteDFIAExportLine(deleteExportTarget.id);
      setDeleteExportTarget(null);
      fetchData();
    } catch (err) {
      setError(getErrorMessage(err, "Failed to delete export line"));
      setDeleteExportTarget(null);
    } finally {
      setDeletingExport(false);
    }
  }

  const importLines = header?.dfia_import_lines ?? [];
  const exportLines = header?.dfia_export_lines ?? [];

  return (
    <div className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6 animate-page">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => navigate("/license/dfia-license")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{fileNo}</h1>
            <p className="text-sm text-muted-foreground">DFIA license details</p>
          </div>
        </div>
        {header && (
          <Badge variant={STATUS_VARIANT[header.status] ?? "outline"} className="text-sm px-3 py-1">
            {header.status}
          </Badge>
        )}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {/* Summary cards */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-5 w-20 mt-1" />
              </CardHeader>
            </Card>
          ))}
        </div>
      ) : header && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Issue Date</CardDescription>
              <CardTitle className="text-lg">{fmtDate(header.issue_date)}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Export Validity</CardDescription>
              <CardTitle className="text-lg">{fmtDate(header.export_validity)}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Import Validity</CardDescription>
              <CardTitle className="text-lg">{fmtDate(header.import_validity)}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>FOB Value (INR / USD)</CardDescription>
              <CardTitle className="text-lg">{fmtDecimal(header.fob_value_inr)} / ${fmtDecimal(header.fob_value_usd)}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>CIF Value (INR / USD)</CardDescription>
              <CardTitle className="text-lg">{fmtDecimal(header.cif_value_inr)} / ${fmtDecimal(header.cif_value_usd)}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Import (MTS)</CardDescription>
              <CardTitle className="text-lg">{fmtDecimal(header.total_import)}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Export (MTS)</CardDescription>
              <CardTitle className="text-lg">{fmtDecimal(header.total_export)}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>To Be Imported / Balance</CardDescription>
              <CardTitle className="text-lg">{fmtDecimal(header.to_be_imported)} / {fmtDecimal(header.balance)}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Valid Export</CardDescription>
              <CardTitle className="text-lg">{fmtDecimal(header.total_export_quantity)}</CardTitle>
            </CardHeader>
          </Card>
        </div>
      )}

      {/* Side-by-side import and export tables */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">

        {/* ── Export Lines ─────────────────────────────────── */}
        <Card className="card-hover shimmer-hover">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle>Export Lines</CardTitle>
              <CardDescription>{exportLines.length} line{exportLines.length !== 1 ? "s" : ""}</CardDescription>
            </div>
            <Button size="sm" className="btn-press gap-1.5" onClick={() => { setExportForm(emptyExportForm); setExportError(""); setExportOpen(true); }}>
              <Plus className="h-3.5 w-3.5" /> Add Export
            </Button>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {["S.No", "Shipping Bill No", "SB Value (USD)", "Export (MTS)", "Actions"].map((col) => (
                        <TableHead key={col}><Skeleton className="h-4 w-16" /></TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Array.from({ length: 3 }).map((_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: 5 }).map((_, j) => (
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
                      <TableHead>Shipping Bill No</TableHead>
                      <TableHead>SB Date</TableHead>
                      <TableHead className="text-right">SB Value (USD)</TableHead>
                      <TableHead className="text-right">Export (MTS)</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {exportLines.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="py-10">
                          <div className="flex flex-col items-center gap-2 text-muted-foreground">
                            <FileText className="h-8 w-8 stroke-1" />
                            <p className="text-sm font-medium">No export lines</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      exportLines.map((line, i) => (
                        <TableRow key={line.id}>
                          <TableCell className="font-medium">{i + 1}</TableCell>
                          <TableCell>{line.shipping_bill_no}</TableCell>
                          <TableCell>{fmtDate(line.sb_date || null)}</TableCell>
                          <TableCell className="text-right">{fmtDecimal(line.sb_value_usd)}</TableCell>
                          <TableCell className="text-right">{fmtDecimal(line.export_in_mts)}</TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary hover:bg-primary/10" onClick={() => openEditExport(line)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => setDeleteExportTarget(line)}>
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
          </CardContent>
        </Card>

        {/* ── Import Lines ─────────────────────────────────── */}
        <Card className="card-hover shimmer-hover">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle>Import Lines</CardTitle>
              <CardDescription>{importLines.length} line{importLines.length !== 1 ? "s" : ""}</CardDescription>
            </div>
            <Button size="sm" className="btn-press gap-1.5" onClick={() => { setImportForm(emptyImportForm); setImportError(""); setImportOpen(true); }}>
              <Plus className="h-3.5 w-3.5" /> Add Import
            </Button>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {["S.No", "BOE No", "BOE Value (USD)", "BOE Date", "Import (MTS)", "Actions"].map((col) => (
                        <TableHead key={col}><Skeleton className="h-4 w-16" /></TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Array.from({ length: 3 }).map((_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: 6 }).map((_, j) => (
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
                      <TableHead>BOE No</TableHead>
                      <TableHead className="text-right">BOE Value (USD)</TableHead>
                      <TableHead>BOE Date</TableHead>
                      <TableHead className="text-right">Import (MTS)</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {importLines.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="py-10">
                          <div className="flex flex-col items-center gap-2 text-muted-foreground">
                            <FileText className="h-8 w-8 stroke-1" />
                            <p className="text-sm font-medium">No import lines</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      importLines.map((line, i) => (
                        <TableRow key={line.id}>
                          <TableCell className="font-medium">{i + 1}</TableCell>
                          <TableCell>{line.boe_no}</TableCell>
                          <TableCell className="text-right">{fmtDecimal(line.boe_value_usd)}</TableCell>
                          <TableCell>{fmtDate(line.boe_date)}</TableCell>
                          <TableCell className="text-right">{fmtDecimal(line.import_in_mts)}</TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary hover:bg-primary/10" onClick={() => openEditImport(line)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => setDeleteImportTarget(line)}>
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
          </CardContent>
        </Card>
      </div>

      {/* ── Add Import Line Dialog ────────────────────────────── */}
      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Import Line</DialogTitle>
            <DialogDescription>Add a new BOE import entry for {fileNo}.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            <div className="col-span-2 space-y-2">
              <Label htmlFor="imp_boe_no">BOE No</Label>
              <Input id="imp_boe_no" value={importForm.boe_no} onChange={(e) => setImportForm({ ...importForm, boe_no: e.target.value })} placeholder="BOE-2024-00789" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="imp_boe_value_usd">BOE Value (USD)</Label>
              <Input id="imp_boe_value_usd" type="number" step="0.001" value={importForm.boe_value_usd} onChange={(e) => setImportForm({ ...importForm, boe_value_usd: e.target.value })} placeholder="15000.000" />
            </div>
            <div className="space-y-2">
              <Label>BOE Date</Label>
              <DatePicker value={importForm.boe_date} onChange={(v) => setImportForm({ ...importForm, boe_date: v })} className="w-full" />
            </div>
            <div className="col-span-2 space-y-2">
              <Label htmlFor="imp_import_in_mts">Import (MTS)</Label>
              <Input id="imp_import_in_mts" type="number" step="0.001" value={importForm.import_in_mts} onChange={(e) => setImportForm({ ...importForm, import_in_mts: e.target.value })} placeholder="120.000" />
            </div>
          </div>
          {importError && <p className="text-sm text-destructive">{importError}</p>}
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveImport} disabled={savingImport}>{savingImport ? "Saving..." : "Add Import"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Edit Import Line Dialog ───────────────────────────── */}
      <Dialog open={editImportOpen} onOpenChange={(open) => { if (!open) { setEditImportOpen(false); setEditImportTarget(null); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Import Line</DialogTitle>
            <DialogDescription>Editing import line #{editImportTarget?.id} for {fileNo}.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            <div className="col-span-2 space-y-2">
              <Label htmlFor="edit_imp_boe_no">BOE No</Label>
              <Input id="edit_imp_boe_no" value={editImportForm.boe_no} onChange={(e) => setEditImportForm({ ...editImportForm, boe_no: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_imp_boe_value_usd">BOE Value (USD)</Label>
              <Input id="edit_imp_boe_value_usd" type="number" step="0.001" value={editImportForm.boe_value_usd} onChange={(e) => setEditImportForm({ ...editImportForm, boe_value_usd: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>BOE Date</Label>
              <DatePicker value={editImportForm.boe_date} onChange={(v) => setEditImportForm({ ...editImportForm, boe_date: v })} className="w-full" />
            </div>
            <div className="col-span-2 space-y-2">
              <Label htmlFor="edit_imp_import_in_mts">Import (MTS)</Label>
              <Input id="edit_imp_import_in_mts" type="number" step="0.001" value={editImportForm.import_in_mts} onChange={(e) => setEditImportForm({ ...editImportForm, import_in_mts: e.target.value })} />
            </div>
          </div>
          {editImportError && <p className="text-sm text-destructive">{editImportError}</p>}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setEditImportOpen(false); setEditImportTarget(null); }}>Cancel</Button>
            <Button onClick={handleUpdateImport} disabled={updatingImport}>{updatingImport ? "Saving..." : "Save Changes"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Import Line Dialog ─────────────────────────── */}
      <Dialog open={!!deleteImportTarget} onOpenChange={() => setDeleteImportTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Import Line</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete import line <strong>{deleteImportTarget?.boe_no}</strong>? This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteImportTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteImport} disabled={deletingImport}>{deletingImport ? "Deleting..." : "Delete"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Add Export Line Dialog ────────────────────────────── */}
      <Dialog open={exportOpen} onOpenChange={setExportOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Export Line</DialogTitle>
            <DialogDescription>Add a new shipping bill export entry for {fileNo}.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            <div className="col-span-2 space-y-2">
              <Label htmlFor="exp_shipping_bill_no">Shipping Bill No</Label>
              <Input id="exp_shipping_bill_no" value={exportForm.shipping_bill_no} onChange={(e) => setExportForm({ ...exportForm, shipping_bill_no: e.target.value })} placeholder="SB-2024-00321" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="exp_sb_date">SB Date</Label>
              <DatePicker value={exportForm.sb_date ?? ""} onChange={(v) => setExportForm({ ...exportForm, sb_date: v || "" })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="exp_sb_value_usd">SB Value (USD)</Label>
              <Input id="exp_sb_value_usd" type="number" step="0.001" value={exportForm.sb_value_usd} onChange={(e) => setExportForm({ ...exportForm, sb_value_usd: e.target.value })} placeholder="13500.000" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="exp_export_in_mts">Export (MTS)</Label>
              <Input id="exp_export_in_mts" type="number" step="0.001" value={exportForm.export_in_mts} onChange={(e) => setExportForm({ ...exportForm, export_in_mts: e.target.value })} placeholder="150.000" />
            </div>
          </div>
          {exportError && <p className="text-sm text-destructive">{exportError}</p>}
          <DialogFooter>
            <Button variant="outline" onClick={() => setExportOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveExport} disabled={savingExport}>{savingExport ? "Saving..." : "Add Export"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Edit Export Line Dialog ───────────────────────────── */}
      <Dialog open={editExportOpen} onOpenChange={(open) => { if (!open) { setEditExportOpen(false); setEditExportTarget(null); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Export Line</DialogTitle>
            <DialogDescription>Editing export line #{editExportTarget?.id} for {fileNo}.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            <div className="col-span-2 space-y-2">
              <Label htmlFor="edit_exp_shipping_bill_no">Shipping Bill No</Label>
              <Input id="edit_exp_shipping_bill_no" value={editExportForm.shipping_bill_no} onChange={(e) => setEditExportForm({ ...editExportForm, shipping_bill_no: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_exp_sb_date">SB Date</Label>
              <DatePicker value={editExportForm.sb_date ?? ""} onChange={(v) => setEditExportForm({ ...editExportForm, sb_date: v || "" })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_exp_sb_value_usd">SB Value (USD)</Label>
              <Input id="edit_exp_sb_value_usd" type="number" step="0.001" value={editExportForm.sb_value_usd} onChange={(e) => setEditExportForm({ ...editExportForm, sb_value_usd: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_exp_export_in_mts">Export (MTS)</Label>
              <Input id="edit_exp_export_in_mts" type="number" step="0.001" value={editExportForm.export_in_mts} onChange={(e) => setEditExportForm({ ...editExportForm, export_in_mts: e.target.value })} />
            </div>
          </div>
          {editExportError && <p className="text-sm text-destructive">{editExportError}</p>}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setEditExportOpen(false); setEditExportTarget(null); }}>Cancel</Button>
            <Button onClick={handleUpdateExport} disabled={updatingExport}>{updatingExport ? "Saving..." : "Save Changes"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Export Line Dialog ─────────────────────────── */}
      <Dialog open={!!deleteExportTarget} onOpenChange={() => setDeleteExportTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Export Line</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete export line <strong>{deleteExportTarget?.shipping_bill_no}</strong>? This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteExportTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteExport} disabled={deletingExport}>{deletingExport ? "Deleting..." : "Delete"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
