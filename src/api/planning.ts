import api from "./client";

/** One SKU line of an uploaded planning sheet. Decimals arrive as strings from DRF. */
export interface PlanningRow {
  id: number;
  code: string;
  brand: string;
  head: string;
  category: string;
  sub_category: string;
  sku: string;

  per_ltrs: string | null;
  ltrs_per_box: string | null;
  case_pack: string | null;

  commodity_monthly: string;
  commodity_w1: string;
  commodity_w2: string;
  commodity_w3: string;
  commodity_w4: string;

  premium_monthly: string;
  premium_w1: string;
  premium_w2: string;
  premium_w3: string;
  premium_w4: string;

  ecom_planning: string;
  total_planning: string;
  /** commodity_monthly + premium_monthly — the two blocks are mutually exclusive. */
  monthly_planning: string;

  source_row: number | null;
}

/** One uploaded workbook — a single version of one month's plan. */
export interface PlanningUpload {
  id: number;
  month: string;
  version: number;
  title: string;
  source_file: string;
  uploaded_by: string;
  uploaded_at: string;
  notes: string;
  row_count: number;
  commodity_total: string;
  premium_total: string;
  ecom_total: string;
  grand_total: string;
  is_latest: boolean;
}

export interface PlanningUploadDetail extends PlanningUpload {
  rows: PlanningRow[];
}

export interface PlanningUploadResult {
  upload: PlanningUpload;
  warnings: string[];
  mismatches: string[];
  replaced_version: number | null;
}

export async function getPlanningUploads(): Promise<PlanningUpload[]> {
  const { data } = await api.get<{ uploads: PlanningUpload[] }>("/planning/uploads/");
  return data?.uploads ?? [];
}

export async function getPlanningUpload(id: number): Promise<PlanningUploadDetail> {
  const { data } = await api.get<PlanningUploadDetail>(`/planning/uploads/${id}/`);
  return data;
}

/** Newest version of the most recent month. Throws 404 when nothing is uploaded yet. */
export async function getLatestPlanning(): Promise<PlanningUploadDetail> {
  const { data } = await api.get<PlanningUploadDetail>("/planning/latest/");
  return data;
}

export async function uploadPlanning(
  file: File,
  options: { month?: string; notes?: string } = {}
): Promise<PlanningUploadResult> {
  const form = new FormData();
  form.append("file", file);
  if (options.month) form.append("month", options.month);
  if (options.notes) form.append("notes", options.notes);

  const { data } = await api.post<PlanningUploadResult>("/planning/uploads/", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

export async function deletePlanningUpload(id: number): Promise<void> {
  await api.delete(`/planning/uploads/${id}/`);
}
