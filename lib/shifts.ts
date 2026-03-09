// src/lib/shifts.ts
import { apiFetch } from "./api"

export type Shift = {
  id: number
  staff_user_id: number
  staff_username: string
  shift_date: string // YYYY-MM-DD
  start_time: string // HH:MM:SS
  end_time: string   // HH:MM:SS
  note: string | null
  created_by: number
  created_by_name: string
  created_at: string
  updated_at: string
}

export type ShiftUser = {
  id: number
  staff_id: string
  username: string
  role: "admin" | "leader" | "staff"
}

export async function shiftUsersList() {
  return apiFetch<{ users: ShiftUser[] }>(`/shift_users_list.php`, { method: "GET" })
}

export async function shiftList(from: string, to: string) {
  return apiFetch<{ shifts: Shift[] }>(`/shift_list.php?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`, { method: "GET" })
}

export async function shiftCreate(input: { staff_user_id: number; shift_date: string; start_time: string; end_time: string; note?: string }) {
  return apiFetch<{ shift: Shift }>(`/shift_create.php`, { method: "POST", body: JSON.stringify(input) })
}

export async function shiftUpdate(input: { id: number; start_time?: string; end_time?: string; note?: string }) {
  return apiFetch<{ shift: Shift }>(`/shift_update.php`, { method: "POST", body: JSON.stringify(input) })
}

export async function shiftDelete(id: number) {
  return apiFetch<{}>(`/shift_delete.php`, { method: "POST", body: JSON.stringify({ id }) })
}
