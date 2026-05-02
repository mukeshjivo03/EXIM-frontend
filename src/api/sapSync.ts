import api from "./client";

export interface SapItem {
  id: number;
  item_code: string;
  item_name: string;
  category: string;
  sal_factor2: string;
  u_tax_rate: number;
  deleted: string;
  u_variety: string;
  sal_pack_un: string;
  u_brand: string;
  u_unit: string;
  u_sub_group: string;
  total_trans_value: string;
  total_in_qty: string;
  total_out_qty: string;
  total_qty: string;
  rate: string;
}

interface SyncResponse {
  success: boolean;
  Items_processed: number;
  Items: SapItem[];
}

interface ItemsResponse {
  count: number;
  items: SapItem[];
}

export async function getItems(): Promise<ItemsResponse> {
  const res = await api.get<ItemsResponse>("/items/");
  return { count: res.data.count ?? 0, items: res.data.items ?? [] };
}

export async function syncItems(): Promise<SapItem[]> {
  const res = await api.get<SyncResponse>("/sap-sync/items/");
  return res.data.Items ?? [];
}

export async function syncSingleItem(itemCode: string): Promise<SapItem> {
  const res = await api.get<SapItem>(`/item/${itemCode}/`);
  return res.data;
}

export async function deleteItem(itemCode: string): Promise<void> {
  await api.delete(`/item/${itemCode}/`);
}

// Raw Material Items

export async function getRmItems(varieties?: string[]): Promise<ItemsResponse> {
  const params = new URLSearchParams();
  if (varieties?.length) {
    for (const v of varieties) params.append("variety", v);
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const res = await api.get<any>("/items/rm/", { params });
  const d = res.data;
  return {
    count: d.Items_processed ?? d.count ?? 0,
    items: d.Items ?? d.items ?? [],
  };
}

export interface RmSummary {
  total_count: number;
  total_qty: string;
  avg_rate: string;
  total_trans_value: string;
}

export async function getRmSummary(varieties?: string[]): Promise<RmSummary> {
  const params = new URLSearchParams();
  if (varieties?.length) {
    for (const v of varieties) params.append("variety", v);
  }
  const res = await api.get<{ summary: RmSummary }>("/items/rm/summary/", { params });
  return res.data.summary;
}

export async function getRmVarieties(): Promise<string[]> {
  const res = await api.get<{ varieties: string[] }>("/items/rm/varieties/");
  return res.data.varieties ?? [];
}

export async function syncRmItems(): Promise<SapItem[]> {
  const res = await api.get<SyncResponse>("/sap_sync/rm/items/");
  return res.data.Items ?? [];
}

export async function syncSingleRmItem(itemCode: string): Promise<SapItem> {
  const res = await api.get<SapItem>(`/sap_sync/rm/item/${itemCode}/`);
  return res.data;
}

export async function getRmItem(itemCode: string): Promise<SapItem> {
  const res = await api.get<SapItem>(`/item/rm/${itemCode}/`);
  return res.data;
}

export async function deleteRmItem(itemCode: string): Promise<void> {
  await api.delete(`/item/rm/${itemCode}/`);
}

// Finished Goods Items

export async function getFgItems(): Promise<ItemsResponse> {
  const res = await api.get<ItemsResponse>("/items/fg/");
  return { count: res.data.count ?? 0, items: res.data.items ?? [] };
}

export async function syncFgItems(): Promise<SapItem[]> {
  const res = await api.get<SyncResponse>("/sap_sync/fg/items/");
  return res.data.Items ?? [];
}

export async function syncSingleFgItem(itemCode: string): Promise<SapItem> {
  const res = await api.get<SapItem>(`/sap_sync/fg/item/${itemCode}/`);
  return res.data;
}

export async function getFgItem(itemCode: string): Promise<SapItem> {
  const res = await api.get<SapItem>(`/item/fg/${itemCode}/`);
  return res.data;
}

export async function deleteFgItem(itemCode: string): Promise<void> {
  await api.delete(`/item/fg/${itemCode}/`);
}

// Vendor / Party types and API

export interface Vendor {
  id: number;
  card_code: string;
  card_name: string;
  state: string;
  u_main_group: string;
  country: string;
}

interface SyncVendorResponse {
  success: boolean;
  party_processed: string;
  party: Vendor;
}

interface VendorsResponse {
  count: number;
  parties: Vendor[];
}

export async function getVendors(): Promise<VendorsResponse> {
  const res = await api.get<VendorsResponse>("/parties/");
  return { count: res.data.count ?? 0, parties: res.data.parties ?? [] };
}

export async function syncVendor(vendorCode: string): Promise<Vendor> {
  const res = await api.get<SyncVendorResponse>(`/sap_sync/party/${vendorCode}/`);
  return res.data.party;
}

export async function getVendor(vendorCode: string): Promise<Vendor> {
  const res = await api.get<Vendor>(`/party/${vendorCode}/`);
  return res.data;
}

export async function deleteVendor(vendorCode: string): Promise<void> {
  await api.delete(`/party/${vendorCode}/`);
}

// Purchase Orders (Domestic Contracts)

export interface PO {
  id: number;
  po_number: string;
  po_date: string | null;
  status: string;
  product_code: string;
  product_name: string;
  vendor: string;
  contract_qty: string | null;
  contract_rate: string | null;
  contract_value: string | null;
  load_qty: string | null;
  unload_qty: string | null;
  allowance: string | null;
  transporter: string | null;
  vehicle_no: string | null;
  bilty_no: string | null;
  bilty_date: string | null;
  grpo_no: string;
  grpo_date: string | null;
  invoice_no: string;
  basic_amount: string | null;
  landed_cost: string | null;
  net_amount: string | null;
}

export async function getPOs(): Promise<PO[]> {
  const res = await api.get<PO[]>("/pos/");
  return res.data ?? [];
}

export async function syncPOs(): Promise<void> {
  await api.get("/sap-sync/po/");
}

export async function syncSinglePO(grpoNo: string): Promise<PO[]> {
  const res = await api.get<PO[]>(`/sap-sync/po/${grpoNo}/`);
  return res.data ?? [];
}

export async function updatePO(id: number, data: Partial<PO>): Promise<PO> {
  const res = await api.patch<PO>(`/po/${id}/`, data);
  return res.data;
}

export async function deletePO(id: number): Promise<void> {
  await api.delete(`/po/${id}/`);
}

// Balance Sheet

export interface BalanceEntry {
  CardCode: string;
  CardName: string;
  Balance: number;
  "Last Transaction Date": string | null;
  "Last Transanction Amount": number;
}

export async function syncBalanceSheet(): Promise<BalanceEntry[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const res = await api.get<any>("/sap-sync/balance-sheet/");
  const d = res.data;
  if (Array.isArray(d)) return d;
  // Handle wrapped responses e.g. { entries: [...] } or { data: [...] } or { balance_sheet: [...] }
  const key = Object.keys(d ?? {}).find((k) => Array.isArray(d[k]));
  return key ? d[key] : [];
}

// Warehouse Inventory

export interface WarehouseInventoryItem {
  Warehouse: string;
  Category: string;
  Total: number;
}

export async function getWarehouseInventory(): Promise<WarehouseInventoryItem[]> {
  const res = await api.get<{ inventory: WarehouseInventoryItem[] }>("/sap-sync/inventory/");
  return res.data.inventory ?? [];
}

export async function getFinishedInventory(): Promise<WarehouseInventoryItem[]> {
  const res = await api.get<{ finished_inventory: WarehouseInventoryItem[] }>("/sap-sync/finished-inventory/");
  return res.data.finished_inventory ?? [];
}

// Sync Logs

export interface SyncLog {
  id: number;
  sync_type: string;
  status: string;
  triggered_by: string;
  started_at: string;
  completed_at: string | null;
  error_message: string;
  records_procesed: number;
  records_created: number;
  records_updated: number;
}

export async function getSyncLogs(): Promise<SyncLog[]> {
  const res = await api.get<SyncLog[]>("/sync_logs/");
  return res.data ?? [];
}

export interface ReconciliationEntry {
  "Doc No": string;
  "Posting Date": string | null;
  "Due Date": string | null;
  "Doc Type": string;
  Debit: number;
  Credit: number;
  OutstandingAmount: number;
  "Days Overdue": number;
  "Aging Bucket": string;
}

export async function getReconciliation(vendorCode: string): Promise<ReconciliationEntry[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const res = await api.get<any>("/sap-sync/reconciliation/", { params: { vendorCode } });
  const d = res.data;
  if (Array.isArray(d)) return d;
  if (Array.isArray(d?.["Internal Reconciliation"])) return d["Internal Reconciliation"];
  const key = Object.keys(d ?? {}).find((k) => Array.isArray(d[k]));
  return key ? d[key] : [];
}

// Open APs

export interface OpenApEntry {
  "DB Primary Key": number;
  "Invoice Number": number;
  "Status (O=Open C=Closed)": string;
  "Invoice Date": string | null;
  "Payment Due Date": string | null;
  "Tax Posting Date": string | null;
  "Vendor Code": string;
  "Vendor Name": string;
  "Vendor GST Number": string | null;
  "Vendor Invoice Reference No": string | null;
  "Total Invoice Amount (INR)": number;
  "Total Invoice Amount (Foreign Currency)": number;
  "GST / VAT Amount": number;
  "Discount Amount": number;
  "Amount Paid So Far": number;
  "Reference 1": string | null;
  "Remarks / Notes": string | null;
  "Journal Entry Memo": string | null;
  "Journal Entry Number": number | null;
  "Bilty / LR Number": string | null;
  "Bilty / LR Date": string | null;
  "Transporter Name": string | null;
  "Vehicle Number": string | null;
  "Goods Received Date": string | null;
  "Linked GRN Doc Entry": number | null;
  "GRN Vendor Code": string | null;
  "GRN Warehouse Code": string | null;
}

export async function getOpenAps(): Promise<OpenApEntry[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const res = await api.get<any>("/sap-sync/open-ap/");
  const d = res.data;
  if (Array.isArray(d)) return d;
  if (Array.isArray(d?.["Open APs"])) return d["Open APs"];
  const key = Object.keys(d ?? {}).find((k) => Array.isArray(d[k]));
  return key ? d[key] : [];
}
