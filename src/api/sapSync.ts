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
  const res = await api.get<SyncResponse>("/sap_sync/items/");
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

export async function getRmItems(): Promise<ItemsResponse> {
  const res = await api.get<ItemsResponse>("/items/rm/");
  return { count: res.data.count ?? 0, items: res.data.items ?? [] };
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