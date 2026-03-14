import api from "./client";

export interface LicenseLine {
  id: number;
  boe_No: string;
  boe_value_usd: string;
  shipping_bill_no: string;
  date: string;
  sb_value_usd: string;
  import_in_mts: string;
  export_in_mts: string;
  balance: string;
  license_no: string;
}

export interface LicenseLinePayload {
  license_no: string;
  boe_No: string;
  boe_value_usd: string;
  shipping_bill_no: string;
  date: string;
  sb_value_usd: string;
  import_in_mts: string;
  export_in_mts: string;
  balance: string;
}

export interface LicenseHeader {
  license_no: string;
  lincense_lines: LicenseLine[];
  issue_date: string;
  import_validity: string;
  export_validity: string;
  import_in_mts: string;
  cif_value_inr: string;
  cif_value_usd: string;
  cif_exchange_rate: string;
  export_in_mts: string;
  fob_value_inr: string;
  fob_value_usd: string;
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

export interface LicenseHeaderPayload {
  license_no: string;
  issue_date: string;
  import_validity: string;
  export_validity: string;
  import_in_mts: string;
  cif_value_inr: string;
  cif_value_usd: string;
  cif_exchange_rate: string;
  export_in_mts: string;
  fob_value_inr: string;
  fob_value_usd: string;
  fob_exhange_rate: string;
  status: string;
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

export async function createLicenseLine(data: LicenseLinePayload): Promise<LicenseLine> {
  const res = await api.post<LicenseLine>("/license/advance-license-lines/", data);
  return res.data;
}

export async function updateLicenseLine(id: number, data: LicenseLinePayload): Promise<LicenseLine> {
  const res = await api.put<LicenseLine>(`/license/advance-license-lines/${id}/`, data);
  return res.data;
}

/* ── DFIA License ─────────────────────────────────────────── */

export interface DFIALicenseHeader {
  file_no: string;
  dfia_license_lines: DFIALicenseLine[];
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

export interface DFIALicenseLine {
  id: number;
  boe_no: string;
  shipping_bill_no: string;
  date: string;
  to_be_imported_in_mts: string;
  exported_in_mts: string;
  balance: string;
  sb_value_inr: string;
  license_no: string;
}

export interface DFIALicenseLinePayload {
  license_no: string;
  boe_no: string;
  shipping_bill_no: string;
  date: string;
  to_be_imported_in_mts: string;
  exported_in_mts: string;
  balance: string;
  sb_value_inr: string;
}

export async function createDFIALicenseLine(data: DFIALicenseLinePayload): Promise<DFIALicenseLine> {
  const res = await api.post<DFIALicenseLine>("/license/dfia-license-lines/create/", data);
  return res.data;
}

export async function updateDFIALicenseLine(id: number, data: DFIALicenseLinePayload): Promise<DFIALicenseLine> {
  const res = await api.put<DFIALicenseLine>(`/license/dfia-license-lines/${id}/`, data);
  return res.data;
}
