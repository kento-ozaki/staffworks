// src/lib/admin.ts
import { apiFetch } from "./api"
import type { User, Role } from "./auth"

export async function adminListUsers(q?: string) {
  const qs = q && q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ""
  return apiFetch<{ users: User[] }>(`/admin_list_users.php${qs}`, { method: "GET" })
}

export async function adminCreateUser(input: {
  staff_id: string
  username: string
  birthdate: string
  role: Role
}) {
  return apiFetch<{ user: User; initial_password_hint?: string }>("/admin_create_user.php", {
    method: "POST",
    body: JSON.stringify(input),
  })
}
