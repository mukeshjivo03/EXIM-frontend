import api from "./client";

export interface OldContract {
  id: number;
  status: string;
  product_code: string;
  vendor_code: string;
  po_number: string;
  po_date: string;
  contract_qty: string;
  contract_rate: string;
  load_qty: string;
  basic_amount: string;
  unload_qty: string;
  shortage_rec: string;
  allow_shortage: string;
  deduction: string;
  deduct_amount: string;
  transporter_code: string;
  transporter_name: string;
  bility_number: string;
  bility_date: string;
  frieght_rate: string;
  freight_amount: string;
  grpo_date: string;
  grpo_number: string;
  brokerage_amount: string;
  brokerage_rate: string;
  vehicle_number: string;
  invoice_number: string;
  created_by: string;
  created_at: string;
  deleted: number;
  Completed: number;
}

export async function getOldContracts(): Promise<OldContract[]> {
  const res = await api.get<OldContract[]>("/dc/?year=2025");
  return res.data ?? [];
}
