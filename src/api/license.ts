import api from "./client";

/* ── Advance License – Import / Export Lines ─────────────── */

export interface ImportLine {
  id: number;
  boe_No: string;
  boe_value_usd: string;
  boe_date: string;
  import_in_mts: string;
  license_no: string;
}

export interface ExportLine {
  id: number;
  shipping_bill_no: string;
  sb_value_usd: string;
  export_in_mts: string;
  license_no: string;
}

export interface ImportLinePayload {
  license_no: string;
  boe_No: string;
  boe_value_usd: string;
  boe_date: string;
  import_in_mts: string;
}

export interface ExportLinePayload {
  license_no: string;
  shipping_bill_no: string;
  sb_value_usd: string;
  export_in_mts: string;
}

export async function createImportLine(data: ImportLinePayload): Promise<ImportLine> {
  const res = await api.post<ImportLine>("/license/advance-license-import-lines/", data);
  return res.data;
}

export async function updateImportLine(id: number, data: ImportLinePayload): Promise<ImportLine> {
  const res = await api.put<ImportLine>(`/license/advance-license-import-lines/${id}/`, data);
  return res.data;
}

export async function deleteImportLine(id: number): Promise<void> {
  await api.delete(`/license/advance-license-import-lines/${id}/`);
}

export async function createExportLine(data: ExportLinePayload): Promise<ExportLine> {
  const res = await api.post<ExportLine>("/license/advance-license-export-lines/", data);
  return res.data;
}

export async function updateExportLine(id: number, data: ExportLinePayload): Promise<ExportLine> {
  const res = await api.put<ExportLine>(`/license/advance-license-export-lines/${id}/`, data);
  return res.data;
}

export async function deleteExportLine(id: number): Promise<void> {
  await api.delete(`/license/advance-license-export-lines/${id}/`);
}

/* ── Advance License Header ──────────────────────────────── */

export interface LicenseHeader {
  license_no: string;
  import_lines: ImportLine[];
  export_lines: ExportLine[];
  issue_date: string;
  import_validity: string;
  export_validity: string;
  cif_value_inr: string;
  cif_value_usd: string;
  cif_exchange_rate: string;
  fob_value_inr: string;
  fob_value_usd: string;
  fob_exhange_rate: string;
  status: string;
  total_import: string;
  total_export: string;
  to_be_exported: string;
  balance: string;
}

export interface LicenseHeaderPayload {
  license_no: string;
  issue_date: string;
  import_validity: string;
  export_validity: string;
  cif_value_inr: string;
  cif_exchange_rate: string;
  fob_value_inr: string;
  fob_exhange_rate: string;
  status: string;
}

export async function getLicenseHeaders(): Promise<LicenseHeader[]> {
  const res = await api.get<LicenseHeader[]>("/license/advance-license-headers/");
  return res.data ?? [];
}

export async function getLicenseHeader(licenseNo: string): Promise<LicenseHeader> {
  const res = await api.get<LicenseHeader>(`/license/advance-license-header/${licenseNo}/`);
  return res.data;
}

export async function createLicenseHeader(data: LicenseHeaderPayload): Promise<LicenseHeader> {
  const res = await api.post<LicenseHeader>("/license/advance-license-headers/", data);
  return res.data;
}

export async function updateLicenseHeader(licenseNo: string, data: LicenseHeaderPayload): Promise<LicenseHeader> {
  const res = await api.put<LicenseHeader>(`/license/advance-license-header/${licenseNo}/`, data);
  return res.data;
}

export async function deleteLicenseHeader(licenseNo: string): Promise<void> {
  await api.delete(`/license/advance-license-header/${licenseNo}/`);
}

/* ── DFIA License ─────────────────────────────────────────── */

export interface DFIAImportLine {
  id: number;
  boe_no: string;
  boe_value_usd: string;
  boe_date: string;
  import_in_mts: string;
  license_no: string;
}

export interface DFIAExportLine {
  id: number;
  shipping_bill_no: string;
  sb_value_usd: string;
  export_in_mts: string;
  license_no: string;
}

export interface DFIAImportLinePayload {
  license_no: string;
  boe_no: string;
  boe_value_usd: string;
  boe_date: string;
  import_in_mts: string;
}

export interface DFIAExportLinePayload {
  license_no: string;
  shipping_bill_no: string;
  sb_value_usd: string;
  export_in_mts: string;
}

export interface DFIALicenseHeader {
  file_no: string;
  dfia_import_lines: DFIAImportLine[];
  dfia_export_lines: DFIAExportLine[];
  issue_date: string;
  export_validity: string;
  export_in_mts: string;
  fob_value_inr: string;
  fob_value_usd: string;
  fob_exchange_rate: string;
  import_validity: string;
  import_in_mts: string;
  cif_value_inr: string;
  cif_value_usd: string;
  cif_exchange_rate: string;
  status: string;
  total_import: string;
  total_export: string;
  to_be_imported: string;
  balance: string;
}

export interface DFIALicenseHeaderPayload {
  file_no: string;
  issue_date: string;
  export_validity: string;
  export_in_mts: string;
  fob_value_inr: string;
  fob_exchange_rate: string;
  import_validity: string;
  import_in_mts: string;
  cif_value_inr: string;
  cif_exchange_rate: string;
  status: string;
}

export async function getDFIALicenseHeaders(): Promise<DFIALicenseHeader[]> {
  const res = await api.get<DFIALicenseHeader[]>("/license/dfia-license-header/list/");
  return res.data ?? [];
}

export async function createDFIALicenseHeader(data: DFIALicenseHeaderPayload): Promise<DFIALicenseHeader> {
  const res = await api.post<DFIALicenseHeader>("/license/dfia-license-header/create/", data);
  return res.data;
}

export async function deleteDFIALicenseHeader(fileNo: string): Promise<void> {
  await api.delete(`/license/dfia-license-header/${fileNo}/`);
}

export async function updateDFIALicenseHeader(fileNo: string, data: DFIALicenseHeaderPayload): Promise<DFIALicenseHeader> {
  const res = await api.put<DFIALicenseHeader>(`/license/dfia-license-header/${fileNo}/`, data);
  return res.data;
}

export async function getDFIALicenseHeader(fileNo: string): Promise<DFIALicenseHeader> {
  const res = await api.get<DFIALicenseHeader>(`/license/dfia-license-header/${fileNo}/`);
  return res.data;
}

export async function createDFIAImportLine(data: DFIAImportLinePayload): Promise<DFIAImportLine> {
  const res = await api.post<DFIAImportLine>("/license/dfia-license-import-lines/create/", data);
  return res.data;
}

export async function updateDFIAImportLine(id: number, data: DFIAImportLinePayload): Promise<DFIAImportLine> {
  const res = await api.put<DFIAImportLine>(`/license/dfia-license-import-lines/${id}/`, data);
  return res.data;
}

export async function deleteDFIAImportLine(id: number): Promise<void> {
  await api.delete(`/license/dfia-license-import-lines/${id}/`);
}

export async function createDFIAExportLine(data: DFIAExportLinePayload): Promise<DFIAExportLine> {
  const res = await api.post<DFIAExportLine>("/license/dfia-license-export-lines/create/", data);
  return res.data;
}

export async function updateDFIAExportLine(id: number, data: DFIAExportLinePayload): Promise<DFIAExportLine> {
  const res = await api.put<DFIAExportLine>(`/license/dfia-license-export-lines/${id}/`, data);
  return res.data;
}

export async function deleteDFIAExportLine(id: number): Promise<void> {
  await api.delete(`/license/dfia-license-export-lines/${id}/`);
}
