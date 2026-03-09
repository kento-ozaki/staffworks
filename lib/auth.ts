// src/lib/auth.ts
import { apiFetch } from "./api"

export type Role = "admin" | "leader" | "staff"

export type User = {
  id: number
  staff_id: string
  username: string
  birthdate: string
  role: Role
  must_change_password: 0 | 1
  created_at?: string
}

export async function login(staff_id: string, password: string) {
  return apiFetch<{ user: User }>("/login.php", {
    method: "POST",
    body: JSON.stringify({ staff_id, password }),
  })
}

export async function me() {
  return apiFetch<{ user: User }>("/me.php", { method: "GET" })
}

export async function changePassword(current_password: string, new_password: string) {
  return apiFetch<{ user: User }>("/change_password.php", {
    method: "POST",
    body: JSON.stringify({ current_password, new_password }),
  })
}

export async function logout() {
  return apiFetch<{}>("/logout.php", { method: "POST" })
}