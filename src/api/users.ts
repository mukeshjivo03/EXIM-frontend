import api from "./client";

export interface User {
  id: number;
  name: string;
  email: string;
}

export interface CreateUserRequest {
  name: string;
  email: string;
  password: string;
}

export interface UpdateUserRequest {
  name?: string;
  email?: string;
  password?: string;
}

export async function getUsers(): Promise<User[]> {
  const res = await api.get<User[]>("/account/users/");
  return res.data;
}

export async function createUser(data: CreateUserRequest): Promise<User> {
  const res = await api.post<User>("/account/register/", data);
  return res.data;
}

export async function updateUser(id: number, data: UpdateUserRequest): Promise<User> {
  const res = await api.patch<User>(`/account/user/${id}/`, data);
  return res.data;
}

export async function deleteUser(id: number): Promise<void> {
  await api.delete(`/account/user/${id}/`);
}
 