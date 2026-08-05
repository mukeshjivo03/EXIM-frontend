import api from "./client";

/** One row of the DC workbook — a single invoice / vehicle movement against a PO.
 *  Decimal fields arrive as strings from DRF. */
export interface DomesticContractDetail {
  id: number;

  // identity
  invoice_no: string;
  invoice_date: string | null;
  po_number: string;
  grpo_no: string | null;
  grpo_date: string | null;
  status: string | null;

  // party / product
  supplier: string;
  item: string;
  del_terms: string | null;
  contract_qty: string | null;

  // loading
  load_qty_mts: string | null;
  inv_rate: string | null;
  basic_amount: string | null;

  // unloading
  unload_qty_mts: string | null;
  unload_qty_ltr: string | null;
  rate_in_sap_unloading: string | null;

  // shortage
  shortage_recd_mts: string | null;
  allow_shortage_mts: string | null;
  deduction_qty_mts: string | null;
  deduct_amount: string | null;

  // freight / brokerage
  freight_rate: string | null;
  freight_amount: string | null;
  brokerage_rate: string | null;
  brokerage_amount: string | null;
  bilty_charges: string | null;

  // landed cost
  cost_per_mt: string | null;
  cost_per_kl: string | null;
  cost_per_ltr: string | null;

  // logistics
  transporter_name: string | null;
  vehicle_number: string | null;
  bilty_number: string | null;

  // provenance
  source_file: string | null;
  source_row: number | null;
  created_at: string;
  updated_at: string;
}

/** @param year financial year start (2026 = FY 2026-27). Omit for all rows. */
export async function getDomesticContractDetails(year?: number): Promise<DomesticContractDetail[]> {
  const { data } = await api.get<DomesticContractDetail[]>(
    year ? `/dc/details/?year=${year}` : "/dc/details/"
  );
  return data ?? [];
}
