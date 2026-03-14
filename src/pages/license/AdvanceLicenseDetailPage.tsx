import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AxiosError } from "axios";
import { ArrowLeft, Plus, FileText } from "lucide-react";

import {
  getLicenseHeader,
  createLicenseLine,
  type LicenseHeader,
  type LicenseLine,
  type LicenseLinePayload,
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

type LineForm = Omit<LicenseLinePayload, "license_no">;

const emptyForm: LineForm = {
  boe_No: "",
  boe_value_usd: "",
  shipping_bill_no: "",
  date: "",
  sb_value_usd: "",
  import_in_mts: "",
  export_in_mts: "",
  balance: "",
};

const FIELDS: { key: keyof LineForm; label: string; type: string }[] = [
  { key: "boe_No", label: "BOE No", type: "text" },
  { key: "boe_value_usd", label: "BOE Value (USD)", type: "number" },
  { key: "shipping_bill_no", label: "Shipping Bill No", type: "text" },
  { key: "date", label: "Date", type: "date" },
  { key: "sb_value_usd", label: "SB Value (USD)", type: "number" },
  { key: "import_in_mts", label: "Import (MTS)", type: "number" },
  { key: "export_in_mts", label: "Export (MTS)", type: "number" },
  { key: "balance", label: "Balance", type: "number" },
];

export default function AdvanceLicenseDetailPage() {
  const { licenseNo } = useParams<{ licenseNo: string }>();
  const navigate = useNavigate();
  const [header, setHeader] = useState<LicenseHeader | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<LineForm>(emptyForm);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  async function fetchData() {
    setLoading(true);
    setError("");
    try {
      const data = await getLicenseHeader(licenseNo!);
      setHeader(data);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load license details"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, [licenseNo]);

  function openCreate() {
    setForm(emptyForm);
    setFormError("");
    setDialogOpen(true);
  }

  async function handleSave() {
    setSaving(true);
    setFormError("");
    try {
      const payload: LicenseLinePayload = {
        ...form,
        license_no: licenseNo!,
      };
      await createLicenseLine(payload);
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

  const lines: LicenseLine[] = header?.lincense_lines ?? [];

  const lineColumns = ["#", "BOE No", "BOE Value (USD)", "Shipping Bill No", "Date", "SB Value (USD)", "Import (MTS)", "Export (MTS)", "Balance"];

  return (
    <div className="p-6 space-y-6 animate-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => navigate("/license/advance-license")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{licenseNo}</h1>
            <p className="text-sm text-muted-foreground">License line details</p>
          </div>
        </div>
        <Button onClick={openCreate} className="btn-press gap-2">
          <Plus className="h-4 w-4" /> Add Line
        </Button>
      </div>

      {/* Error */}
      {error && <p className="text-sm text-destructive">{error}</p>}

      {/* Summary Cards */}
      {header && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Issue Date</CardDescription>
              <CardTitle className="text-lg">{fmtDate(header.issue_date)}</CardTitle>
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
              <CardDescription>Export Validity</CardDescription>
              <CardTitle className="text-lg">{fmtDate(header.export_validity)}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Status</CardDescription>
              <CardTitle className="text-lg">{header.status}</CardTitle>
            </CardHeader>
          </Card>
        </div>
      )}

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
                      <TableHead key={col} className={col.includes("USD") || col.includes("MTS") || col === "Balance" ? "text-right" : ""}>
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
                        <TableCell>{line.boe_No}</TableCell>
                        <TableCell className="text-right">{fmtDecimal(line.boe_value_usd)}</TableCell>
                        <TableCell>{line.shipping_bill_no}</TableCell>
                        <TableCell>{fmtDate(line.date)}</TableCell>
                        <TableCell className="text-right">{fmtDecimal(line.sb_value_usd)}</TableCell>
                        <TableCell className="text-right">{fmtDecimal(line.import_in_mts)}</TableCell>
                        <TableCell className="text-right">{fmtDecimal(line.export_in_mts)}</TableCell>
                        <TableCell className="text-right">{fmtDecimal(line.balance)}</TableCell>
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
              Add a new line entry for {licenseNo}.
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
    </div>
  );
}
