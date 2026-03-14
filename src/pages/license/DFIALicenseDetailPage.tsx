import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AxiosError } from "axios";
import { ArrowLeft, Plus, FileText, Pencil } from "lucide-react";

import {
  getDFIALicenseHeader,
  createDFIALicenseLine,
  updateDFIALicenseLine,
  type DFIALicenseHeader,
  type DFIALicenseLine,
  type DFIALicenseLinePayload,
} from "@/api/license";
import { fmtDate, fmtDecimal } from "@/lib/formatters";
import { getErrorMessage } from "@/lib/errors";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
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

type LineForm = Omit<DFIALicenseLinePayload, "license_no">;

const emptyForm: LineForm = {
  boe_no: "",
  shipping_bill_no: "",
  date: "",
  to_be_imported_in_mts: "",
  exported_in_mts: "",
  balance: "",
  sb_value_inr: "",
};

const FIELDS: { key: keyof LineForm; label: string; type: string }[] = [
  { key: "boe_no", label: "BOE No", type: "text" },
  { key: "shipping_bill_no", label: "Shipping Bill No", type: "text" },
  { key: "date", label: "Date", type: "date" },
  { key: "to_be_imported_in_mts", label: "To Be Imported (MTS)", type: "number" },
  { key: "exported_in_mts", label: "Exported (MTS)", type: "number" },
  { key: "balance", label: "Balance", type: "number" },
  { key: "sb_value_inr", label: "SB Value (INR)", type: "number" },
];

export default function DFIALicenseDetailPage() {
  const { fileNo } = useParams<{ fileNo: string }>();
  const navigate = useNavigate();
  const [header, setHeader] = useState<DFIALicenseHeader | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Create dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<LineForm>(emptyForm);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  // Edit dialog state
  const [editOpen, setEditOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<DFIALicenseLine | null>(null);
  const [editForm, setEditForm] = useState<LineForm>(emptyForm);
  const [editFormError, setEditFormError] = useState("");
  const [updating, setUpdating] = useState(false);

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

  useEffect(() => {
    fetchData();
  }, [fileNo]);

  function openCreate() {
    setForm(emptyForm);
    setFormError("");
    setDialogOpen(true);
  }

  async function handleSave() {
    setSaving(true);
    setFormError("");
    try {
      const payload: DFIALicenseLinePayload = {
        ...form,
        license_no: fileNo!,
      };
      await createDFIALicenseLine(payload);
      setDialogOpen(false);
      fetchData();
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

  function openEdit(line: DFIALicenseLine) {
    setEditTarget(line);
    setEditForm({
      boe_no: line.boe_no,
      shipping_bill_no: line.shipping_bill_no,
      date: line.date,
      to_be_imported_in_mts: line.to_be_imported_in_mts,
      exported_in_mts: line.exported_in_mts,
      balance: line.balance,
      sb_value_inr: line.sb_value_inr,
    });
    setEditFormError("");
    setEditOpen(true);
  }

  async function handleUpdate() {
    if (!editTarget) return;
    setUpdating(true);
    setEditFormError("");
    try {
      const payload: DFIALicenseLinePayload = {
        ...editForm,
        license_no: fileNo!,
      };
      await updateDFIALicenseLine(editTarget.id, payload);
      setEditOpen(false);
      setEditTarget(null);
      fetchData();
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

  const lines: DFIALicenseLine[] = header?.dfia_license_lines ?? [];

  const lineColumns = ["#", "BOE No", "Shipping Bill No", "Date", "To Be Imported (MTS)", "Exported (MTS)", "Balance", "SB Value (INR)", "Actions"];

  return (
    <div className="p-6 space-y-6 animate-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => navigate("/license/dfia-license")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{fileNo}</h1>
            <p className="text-sm text-muted-foreground">DFIA license line details</p>
          </div>
        </div>
        <Button onClick={openCreate} className="btn-press gap-2">
          <Plus className="h-4 w-4" /> Add Line
        </Button>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {/* Lines Table */}
      <Card className="card-hover shimmer-hover">
        <CardHeader>
          <CardTitle>License Lines</CardTitle>
          <CardDescription>{lines.length} line{lines.length !== 1 ? "s" : ""} recorded</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {lineColumns.map((col) => (
                      <TableHead key={col}>{col}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array.from({ length: 3 }).map((_, i) => (
                    <TableRow key={i}>
                      {lineColumns.map((col) => (
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
                    {lineColumns.map((col) => (
                      <TableHead key={col} className={col.includes("MTS") || col.includes("INR") || col === "Balance" ? "text-right" : ""}>
                        {col}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lines.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={lineColumns.length} className="py-16">
                        <div className="flex flex-col items-center gap-2 text-muted-foreground">
                          <FileText className="h-10 w-10 stroke-1" />
                          <p className="text-sm font-medium">No lines found</p>
                          <p className="text-xs">Click "Add Line" to create one.</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    lines.map((line, i) => (
                      <TableRow key={line.id}>
                        <TableCell className="font-medium">{i + 1}</TableCell>
                        <TableCell>{line.boe_no}</TableCell>
                        <TableCell>{line.shipping_bill_no}</TableCell>
                        <TableCell>{fmtDate(line.date)}</TableCell>
                        <TableCell className="text-right">{fmtDecimal(line.to_be_imported_in_mts)}</TableCell>
                        <TableCell className="text-right">{fmtDecimal(line.exported_in_mts)}</TableCell>
                        <TableCell className="text-right">{fmtDecimal(line.balance)}</TableCell>
                        <TableCell className="text-right">{fmtDecimal(line.sb_value_inr)}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-muted-foreground hover:text-primary hover:bg-primary/10"
                            onClick={() => openEdit(line)}
                          >
                            <Pencil className="h-4 w-4" />
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

      {/* Create Line Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add License Line</DialogTitle>
            <DialogDescription>
              Add a new line entry for {fileNo}.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4 py-2">
            {FIELDS.map((f) => (
              <div key={f.key} className="space-y-2">
                <Label htmlFor={f.key}>{f.label}</Label>
                <Input
                  id={f.key}
                  type={f.type}
                  step={f.type === "number" ? "0.001" : undefined}
                  value={form[f.key]}
                  onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                  placeholder={f.label}
                />
              </div>
            ))}
          </div>

          {formError && (
            <p className="text-sm text-destructive">{formError}</p>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Add Line"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Line Dialog */}
      <Dialog open={editOpen} onOpenChange={(open) => { if (!open) { setEditOpen(false); setEditTarget(null); } }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit License Line</DialogTitle>
            <DialogDescription>
              Editing line #{editTarget?.id} for {fileNo}.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4 py-2">
            {FIELDS.map((f) => (
              <div key={f.key} className="space-y-2">
                <Label htmlFor={`edit_${f.key}`}>{f.label}</Label>
                <Input
                  id={`edit_${f.key}`}
                  type={f.type}
                  step={f.type === "number" ? "0.001" : undefined}
                  value={editForm[f.key]}
                  onChange={(e) => setEditForm({ ...editForm, [f.key]: e.target.value })}
                  placeholder={f.label}
                />
              </div>
            ))}
          </div>

          {editFormError && (
            <p className="text-sm text-destructive">{editFormError}</p>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => { setEditOpen(false); setEditTarget(null); }}>
              Cancel
            </Button>
            <Button onClick={handleUpdate} disabled={updating}>
              {updating ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
