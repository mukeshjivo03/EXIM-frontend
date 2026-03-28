import api from "./client";

export interface OpenGrpo {
  "GRPO Number": number;
  "Vendor Ref No": string;
  "User Name": string;
  "Vendor Name": string;
  "Warehouse": string;
  "Pending Days": number;
}

export async function getOpenGrpos(): Promise<OpenGrpo[]> {
  const { data } = await api.get<{ open_grpos: OpenGrpo[] }>("/sap_sync/open-grpos/");
  return data.open_grpos;
}
