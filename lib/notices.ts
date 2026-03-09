// lib/notices.ts
import { apiFetch } from "./api"

/* ── 型定義 ── */
export type NoticeTargetType = "all" | "role" | "user"

export type NoticeTarget = {
  id?: number
  notice_id?: number
  target_type: NoticeTargetType
  target_role?: "admin" | "leader" | "staff" | null
  target_user?: number | null
}

export type Notice = {
  id: number
  title: string
  body: string
  sender_name: string
  is_pinned: 0 | 1
  published_at: string           // YYYY-MM-DD
  expires_at: string | null      // YYYY-MM-DD or null
  created_by: number
  created_at: string
  updated_at: string
  targets: NoticeTarget[]        // admin_notices_list.php のみ付与
}

export type NoticeCreateInput = {
  title: string
  body: string
  sender_name?: string
  is_pinned?: boolean
  published_at: string
  expires_at?: string | null
  targets: NoticeTarget[]
}

export type NoticeUpdateInput = NoticeCreateInput & { id: number }

/* ── API ── */

/** ホーム用：自分宛にフィルタ済みのお知らせ一覧 */
export async function listNotices() {
  return apiFetch<{ notices: Notice[] }>("/notices_list.php", { method: "GET" })
}

/** 管理画面用：全件取得（targets 付き） */
export async function adminListNotices() {
  return apiFetch<{ notices: Notice[] }>("/admin_notices_list.php", { method: "GET" })
}

/** お知らせ作成 */
export async function adminCreateNotice(input: NoticeCreateInput) {
  return apiFetch<{ notice_id: number }>("/admin_notices_create.php", {
    method: "POST",
    body: JSON.stringify(input),
  })
}

/** お知らせ更新 */
export async function adminUpdateNotice(input: NoticeUpdateInput) {
  return apiFetch<{}>("/admin_notices_update.php", {
    method: "POST",
    body: JSON.stringify(input),
  })
}

/** お知らせ削除 */
export async function adminDeleteNotice(id: number) {
  return apiFetch<{}>("/admin_notices_delete.php", {
    method: "POST",
    body: JSON.stringify({ id }),
  })
}
