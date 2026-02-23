import api from "./client";

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  access: string;
  refresh: string;
  role: "ADM" | "FTR" | "MNG";
  name: string;
}

export async function login(data: LoginRequest): Promise<LoginResponse> {
  const res = await api.post<LoginResponse>("/account/login/", data);
  return res.data;
}

export async function logout(): Promise<void> {
  const refresh = localStorage.getItem("refresh_token");
  await api.post("/account/logout/", { refresh });
}
