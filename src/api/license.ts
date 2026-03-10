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

export async function deleteLicenseHeader(licenseNo: string): Promise<void> {
  await api.delete(`/license/advance-license-header/${licenseNo}/`);
}

export async function createLicenseLine(data: LicenseLinePayload): Promise<LicenseLine> {
  const res = await api.post<LicenseLine>("/license/advance-license-lines/", data);
  return res.data;
}
