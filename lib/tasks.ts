// src/lib/tasks.ts
import { apiFetch } from "./api"

export type TaskStatus = "todo" | "doing" | "done"

export type MainCategory = {
  id: number
  name: string
  sort_order: number
  is_active: 0 | 1
}

export type SubCategory = {
  id: number
  main_category_id: number
  name: string
  sort_order: number
  is_active: 0 | 1
}

export type TaskCard = {
  id: number
  title: string
  due_date: string | null
  status: TaskStatus
  created_at: string
  main_category_id: number
  main_category_name: string
  created_by_name: string
  updated_at?: string
}

export type TaskDetail = {
  id: number
  title: string
  detail: string | null
  due_date: string | null
  status: TaskStatus
  main_category_id: number
  main_category_name: string
  created_by: number
  created_by_name: string
  created_at: string
  updated_at: string
}

export type TaskDetailSub = { id: number; name: string; main_category_id: number }
export type TaskSubProgress = {
  sub_category_id: number
  is_done: 0 | 1
  updated_at: string
  updated_by_name: string | null
}

export type TaskEventChanged = {
  progress?: number[]
  done?: number[]
  undone?: number[]
}

export type TaskEvent = {
  id: number
  task_id: number
  event_type: "create" | "update" | "complete" | "reopen"
  note: string | null
  changed_subcats: TaskEventChanged | null
  created_at: string
  created_by_name: string
}

export async function listMainCategories() {
  return apiFetch<{ main_categories: MainCategory[] }>("/task_main_categories_list.php", { method: "GET" })
}

export async function listSubCategories(main_category_id?: number) {
  const qs = main_category_id ? `?main_category_id=${encodeURIComponent(String(main_category_id))}` : ""
  return apiFetch<{ sub_categories: SubCategory[] }>(`/task_sub_categories_list.php${qs}`, { method: "GET" })
}

export async function board() {
  return apiFetch<{ todo: TaskCard[]; doing: TaskCard[] }>("/tasks_board.php", { method: "GET" })
}

export async function doneList() {
  return apiFetch<{ done: TaskCard[] }>("/tasks_done.php", { method: "GET" })
}

export async function createTask(input: {
  title: string
  main_category_id: number
  sub_category_ids: number[]
  detail?: string
  due_date?: string // YYYY-MM-DD or YYYY/MM/DD
}) {
  return apiFetch<{ task_id: number }>("/task_create.php", {
    method: "POST",
    body: JSON.stringify(input),
  })
}

export async function getTask(id: number) {
  return apiFetch<{ task: TaskDetail; sub_categories: TaskDetailSub[]; progress: TaskSubProgress[]; events: TaskEvent[] }>(
    `/task_get.php?id=${encodeURIComponent(String(id))}`,
    { method: "GET" }
  )
}

export async function updateTask(input: {
  id: number
  title?: string
  detail?: string
  due_date?: string // YYYY-MM-DD or YYYY/MM/DD or "" to clear
}) {
  return apiFetch<{}>("/task_update.php", {
    method: "POST",
    body: JSON.stringify(input),
  })
}

/**
 * progressTask
 * - note is required for update/complete (API enforced)
 * - action=update uses progress_sub_category_ids
 * - action=complete uses done_sub_category_ids; status becomes done only if all subcats done
 */
export async function progressTask(input: {
  id: number
  action: "update" | "complete" | "reopen"
  note: string
  progress_sub_category_ids?: number[]
  done_sub_category_ids?: number[]
  undone_sub_category_ids?: number[]
}) {
  return apiFetch<{ status: TaskStatus; remaining_open_subcats: number }>("/task_progress.php", {
    method: "POST",
    body: JSON.stringify(input),
  })
}

export async function deleteTask(id: number) {
  return apiFetch<{}>("/task_delete.php", {
    method: "POST",
    body: JSON.stringify({ id }),
  })
}
