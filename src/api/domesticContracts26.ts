import api from "./client";

export interface DomesticContract26 {
  id: number;
  status: string;
  product_code: string;
  vendor_code: string;
  po_number: string;
  po_date: string;
  contract_qty: string;
  contract_rate: string;
  product_name?: string;
  contract_total: string;
  // loading fields
  load_qty?: string;
  unload_qty?: string;
  shortage?: string;
  allow_shortage?: string;
  deduction_qty?: string;
  deduction_amount?: string;
  basic_amount?: string;
  // freight fields
  transporter_code?: string;
  transporter_name?: string;
  bility_number?: string;
  bility_date?: string;
  frieght_rate?: string;
  freight_amount?: string;
  grpo_date?: string;
  grpo_number?: string;
  brokerage_rate?: string;
  brokerage_amount?: string;
  vehicle_number?: string;
  invoice_number?: string;
  created_by?: string;
  created_at?: string;
  deleted?: number;
  Completed?: number;
}

export interface NewContractPayload {
  status: string;
  product_code: string;
  vendor_code: string;
  po_number: string;
  po_date: string;
  contract_qty: number;
  contract_rate: number;
}

export interface ContractDropdownItem {
  id: number;
  po_number: string;
  vendor_code: string;
  product_code: string;
  product_name?: string;
}

export interface LoadingPayload {
  load_qty: number;
  unload_qty: number;
}

export interface FreightPayload {
  transporter_code: string;
  transporter_name: string;
  bility_number: string;
  bility_date: string;
  freight_rate: number;
  brokerage_amount: number;
  vehicle_number: string;
  invoice_number: string;
  grpo_number?: string;
  grpo_date?: string;
}

export async function createContract26(payload: NewContractPayload): Promise<DomesticContract26> {
  const { data } = await api.post<DomesticContract26>("/dc/contract/create/", payload);
  return data;
}

export async function getContracts26(year: number = 2026): Promise<DomesticContract26[]> {
  const { data } = await api.get<DomesticContract26[]>(`/dc/?year=${year}`);
  return data ?? [];
}

export async function getContractsDropdown(): Promise<ContractDropdownItem[]> {
  const { data } = await api.get<ContractDropdownItem[]>("/dc/dropdown/");
  return data ?? [];
}

export async function getContract26(id: number): Promise<DomesticContract26> {
  const { data } = await api.get<DomesticContract26>(`/dc/${id}/`);
  return data;
}

export async function submitLoadingForm(id: number, payload: LoadingPayload): Promise<DomesticContract26> {
  const { data } = await api.put<DomesticContract26>(`/dc/loading/create/${id}/`, payload);
  return data;
}

export async function submitFreightForm(id: number, payload: FreightPayload): Promise<DomesticContract26> {
  const { data } = await api.put<DomesticContract26>(`/dc/freight/create/${id}/`, payload);
  return data;
}
