import { useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle2, ChevronDown, FileSpreadsheet, Upload, XCircle } from "lucide-react";

import { uploadDomesticContractDetails, type DcImportResult } from "@/api/domesticContractDetails";
import { getErrorMessage } from "@/lib/errors";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported: () => void;
}

function Stat({ label, value, tone }: { label: string; value: number; tone: "emerald" | "blue" | "amber" | "slate" }) {
  const tones = {
    emerald: "bg-emerald-50/60 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-300",
    blue: "bg-blue-50/60 text-blue-700 dark:bg-blue-950/20 dark:text-blue-300",
    amber: "bg-amber-50/60 text-amber-700 dark:bg-amber-950/20 dark:text-amber-300",
    slate: "bg-muted/40 text-muted-foreground",
  };
  return (
    <div className={cn("rounded-lg p-3", tones[tone])}>
      <p className="text-[10px] uppercase tracking-wider">{label}</p>
      <p className="text-xl font-bold tabular-nums text-foreground">{value}</p>
    </div>
  );
}

function IssueList({ title, lines, tone }: { title: string; lines: string[]; tone: "red" | "amber" }) {
  const [open, setOpen] = useState(tone === "red");
  if (lines.length === 0) return null;
  return (
    <div
      className={cn(
        "rounded-lg border text-sm",
        tone === "red"
          ? "border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/30"
          : "border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30"
      )}
    >
      <button type="button" onClick={() => setOpen((v) => !v)} className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left font-medium">
        <span className={tone === "red" ? "text-red-700 dark:text-red-300" : "text-amber-800 dark:text-amber-300"}>
          {title} ({lines.length})
        </span>
        <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <ul className="max-h-40 overflow-y-auto border-t px-3 py-2 font-mono text-[11px] leading-relaxed">
          {lines.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function UploadDcDialog({ open, onOpenChange, onImported }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [keepPartial, setKeepPartial] = useState(false);
  const [check, setCheck] = useState<DcImportResult | null>(null);
  const [busy, setBusy] = useState<"check" | "import" | null>(null);

  function reset() {
    setFile(null);
    setKeepPartial(false);
    setCheck(null);
    setBusy(null);
  }

  function close(next: boolean) {
    if (!next) reset();
    onOpenChange(next);
  }

  async function run(dryRun: boolean) {
    if (!file) return;
    setBusy(dryRun ? "check" : "import");
    try {
      const result = await uploadDomesticContractDetails(file, { dryRun, keepPartial });
      if (dryRun || !result.written) {
        setCheck(result);
        return;
      }
      toast.success(`DC data imported: ${result.created} new, ${result.updated} updated.`);
      close(false);
      onImported();
    } catch (err) {
      toast.error(getErrorMessage(err, "Could not upload the DC file"));
    } finally {
      setBusy(null);
    }
  }

  const blocked = !!check && check.errors.length > 0;
  const nothingToImport = !!check && check.parsed === 0;

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="sm:max-w-lg max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload DC Excel
          </DialogTitle>
          <DialogDescription>
            Rows are matched on invoice number: existing invoices are updated, new ones are added. Amounts are recalculated from the quantities and rates.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* File picker */}
          <label
            htmlFor="dc-file"
            className={cn(
              "flex cursor-pointer items-center gap-3 rounded-lg border-2 border-dashed p-4 transition-colors hover:border-primary/50 hover:bg-muted/30",
              file && "border-primary/40 bg-primary/5"
            )}
          >
            <FileSpreadsheet className="h-8 w-8 shrink-0 text-emerald-600" />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{file ? file.name : "Choose the DC workbook (.xlsx)"}</p>
              <p className="text-xs text-muted-foreground">
                {file ? `${(file.size / 1024).toFixed(0)} KB · click to change` : "Same layout as the DC sheet, first sheet is read · max 10 MB"}
              </p>
            </div>
            <input
              id="dc-file"
              type="file"
              accept=".xlsx,.xlsm"
              className="sr-only"
              onChange={(e) => {
                setFile(e.target.files?.[0] ?? null);
                setCheck(null);
                e.target.value = "";
              }}
            />
          </label>

          <div className="flex items-start gap-2">
            <Checkbox
              id="dc-keep-partial"
              checked={keepPartial}
              onCheckedChange={(v) => {
                setKeepPartial(v === true);
                setCheck(null);
              }}
            />
            <Label htmlFor="dc-keep-partial" className="text-sm font-normal leading-snug">
              Also import rows with an unreadable date or missing PO, leaving those cells empty
              <span className="block text-xs text-muted-foreground">Off: those rows are skipped and listed.</span>
            </Label>
          </div>

          {/* Check result */}
          {check && (
            <div className="space-y-3">
              {blocked ? (
                <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
                  <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>Some rows can't be read, so nothing will be imported. Fix them in Excel and upload again.</span>
                </div>
              ) : (
                <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>
                    File checked. {nothingToImport ? "There are no rows to import." : `Ready to import ${check.parsed} row${check.parsed === 1 ? "" : "s"}.`}
                  </span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <Stat label="New" value={check.created} tone="emerald" />
                <Stat label="Updated" value={check.updated} tone="blue" />
                <Stat label={check.keep_partial ? "With gaps" : "Skipped"} value={new Set(check.skipped.map((s) => s.split(":")[0])).size} tone="amber" />
                <Stat label="Can't read" value={check.errors.length} tone="slate" />
              </div>

              <IssueList title="Rows that can't be read" lines={check.errors} tone="red" />
              <IssueList
                title={check.keep_partial ? "Rows imported with empty cells" : "Rows skipped (incomplete data)"}
                lines={check.skipped}
                tone="amber"
              />
              {check.mismatches.length > 0 && (
                <div className="space-y-1">
                  <IssueList title="Amounts that differ from the sheet" lines={check.mismatches} tone="amber" />
                  <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
                    <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                    The recalculated amount is what gets saved.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => close(false)}>
            Cancel
          </Button>
          {!check ? (
            <Button onClick={() => run(true)} disabled={!file || busy !== null}>
              {busy === "check" ? "Checking..." : "Check file"}
            </Button>
          ) : (
            <Button onClick={() => run(false)} disabled={blocked || nothingToImport || busy !== null}>
              {busy === "import" ? "Importing..." : `Import ${check.parsed} row${check.parsed === 1 ? "" : "s"}`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
