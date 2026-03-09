"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { Guard } from "@/components/Guard"
import { apiFetch } from "@/lib/api"
import type { ApiNg } from "@/lib/api"
import { toUserMessage } from "@/lib/errors"

/* ── カラー（既存デザインシステムに準拠） ── */
const C = {
  bg:         "#f0f5f7",
  card:       "#ffffff",
  brand:      "#006284",
  brandDark:  "#004a63",
  brandTint:  "#e4f2f7",
  text:       "#0c1d24",
  sub:        "#3b6878",
  muted:      "#89adb8",
  line:       "#cde4eb",
  danger:     "#b83030",
  dangerTint: "#fdf1f1",
  dangerLine: "#e8b8b8",
  warn:       "#7a5400",
  warnTint:   "#fdf6e0",
  warnLine:   "#dfc060",
  pin:        "#e53935",
  pinTint:    "#fff5f5",
} as const

/* ── 型 ── */
type NoticeTarget = {
  target_type: "all" | "role" | "user"
  target_role?: string | null
  target_user?: number | null
}
type Notice = {
  id: number
  title: string
  body: string
  sender_name: string
  is_pinned: 0 | 1
  published_at: string
  expires_at: string | null
  created_at: string
  targets: NoticeTarget[]
}

/* ── CSS ── */
const G = `
@import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=Noto+Sans+JP:wght@400;500;700&display=swap');
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html { -webkit-text-size-adjust: 100%; }
body { background: ${C.bg}; }
::placeholder { color: ${C.muted}; opacity: 1; }
@keyframes spin { to { transform: rotate(360deg); } }
@keyframes rise { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
.rise { animation: rise .22s ease both; }

.page { min-height: 100vh; background: ${C.bg}; font-family: 'Noto Sans JP', sans-serif; }

/* ── ページヘッダー ── */
.page-header {
  background: ${C.brand};
  padding: 18px 16px 20px;
  position: sticky; top: 0; z-index: 10;
}
.page-header-inner {
  max-width: 720px; margin: 0 auto;
  display: flex; align-items: center; justify-content: space-between; gap: 12px;
}
.page-eyebrow {
  font-size: 10px; font-weight: 500; color: rgba(255,255,255,.5);
  letter-spacing: .18em; text-transform: uppercase; margin-bottom: 3px;
}
.page-title {
  font-size: 22px; font-weight: 400; color: #fff; line-height: 1.1;
  font-family: 'DM Serif Display', serif;
}
.btn-new {
  display: inline-flex; align-items: center; gap: 6px;
  height: 36px; padding: 0 16px;
  background: #fff; color: ${C.brand};
  border: none; border-radius: 8px;
  font-size: 13px; font-weight: 700;
  font-family: 'Noto Sans JP', sans-serif;
  cursor: pointer; white-space: nowrap; flex-shrink: 0;
  text-decoration: none;
  box-shadow: 0 2px 8px rgba(0,0,0,.12);
  -webkit-tap-highlight-color: transparent;
}

/* ── メインコンテンツ ── */
.page-body { max-width: 720px; margin: 0 auto; padding: 16px 12px 80px; }
@media (min-width: 560px) { .page-body { padding: 20px 16px 80px; } }

/* ── エラー ── */
.error-box {
  padding: 12px 14px; background: ${C.dangerTint}; border: 1px solid ${C.dangerLine};
  border-radius: 8px; color: ${C.danger}; font-size: 13px;
  display: flex; align-items: flex-start; gap: 8px; line-height: 1.5; margin-bottom: 14px;
}

/* ── カウント ── */
.count-label { font-size: 12px; color: ${C.muted}; margin-bottom: 12px; }

/* ── お知らせカード ── */
.notice-card {
  background: ${C.card}; border: 1px solid ${C.line};
  border-radius: 14px; overflow: hidden;
  box-shadow: 0 2px 8px rgba(0,98,132,.06);
  margin-bottom: 10px;
}
.notice-card.pinned { border-color: ${C.pin}20; border-left: 3px solid ${C.pin}; }

.notice-card-header {
  padding: 14px 14px 10px;
  display: flex; align-items: flex-start; justify-content: space-between; gap: 10px;
}
.notice-title-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; flex: 1; }
.notice-title {
  font-size: 15px; font-weight: 700; color: ${C.text};
  font-family: 'Noto Sans JP', sans-serif; line-height: 1.4;
}
.badge-pin {
  font-size: 10px; font-weight: 700; color: ${C.pin};
  background: ${C.pinTint}; border: 1px solid ${C.pin}30;
  padding: 2px 7px; border-radius: 4px; white-space: nowrap; flex-shrink: 0;
}
.badge-target {
  font-size: 10px; font-weight: 700; color: ${C.sub};
  background: ${C.brandTint}; border: 1px solid ${C.brand}20;
  padding: 2px 7px; border-radius: 4px; white-space: nowrap; flex-shrink: 0;
}

.notice-body-text {
  padding: 0 14px 12px;
  font-size: 13px; color: ${C.sub}; line-height: 1.65;
  white-space: pre-wrap; word-break: break-all;
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
}
.notice-meta {
  padding: 10px 14px; border-top: 1px solid ${C.line};
  display: flex; align-items: center; justify-content: space-between; gap: 8px; flex-wrap: wrap;
}
.notice-meta-left { display: flex; align-items: center; gap: 10px; }
.notice-sender { font-size: 12px; color: ${C.muted}; }
.notice-date   { font-size: 12px; color: ${C.muted}; }
.notice-expires { font-size: 11px; color: ${C.warn}; background: ${C.warnTint}; padding: 2px 6px; border-radius: 4px; }

/* ── アクションバー ── */
.notice-actions { display: flex; gap: 6px; }
.btn-edit {
  height: 30px; padding: 0 14px; border-radius: 7px;
  border: 1.5px solid ${C.line}; background: transparent;
  color: ${C.sub}; font-size: 12px; font-weight: 700;
  font-family: 'Noto Sans JP', sans-serif; cursor: pointer;
  text-decoration: none; display: inline-flex; align-items: center;
  -webkit-tap-highlight-color: transparent;
}
.btn-delete {
  height: 30px; padding: 0 14px; border-radius: 7px;
  border: 1.5px solid ${C.dangerLine}; background: transparent;
  color: ${C.danger}; font-size: 12px; font-weight: 700;
  font-family: 'Noto Sans JP', sans-serif; cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}
.btn-delete:disabled { opacity: .5; cursor: not-allowed; }

/* ── 空状態 ── */
.empty {
  text-align: center; padding: 56px 0;
  color: ${C.muted}; font-size: 14px; line-height: 2;
}
`

/* ── ユーティリティ ── */
function targetLabel(targets: NoticeTarget[]): string {
  if (!targets || targets.length === 0) return "全員"
  if (targets.some(t => t.target_type === "all")) return "全員"
  const roles = targets.filter(t => t.target_type === "role").map(t => t.target_role)
  const userCount = targets.filter(t => t.target_type === "user").length
  const parts: string[] = []
  if (roles.includes("admin"))  parts.push("管理者")
  if (roles.includes("leader")) parts.push("リーダー")
  if (roles.includes("staff"))  parts.push("スタッフ")
  if (userCount > 0) parts.push(`個人指定 ${userCount}名`)
  return parts.join("・") || "全員"
}

/* ── メイン ── */
function NoticesListInner() {
  const [notices, setNotices] = useState<Notice[]>([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)
  const [busyId,  setBusyId]  = useState<number | null>(null)

  async function load() {
    setLoading(true); setError(null)
    const r = await apiFetch<{ notices: Notice[] }>("/admin_notices_list.php", { method: "GET" })
    setLoading(false)
    if (!r.ok) { setError(toUserMessage(r as ApiNg, "読み込みに失敗しました")); return }
    setNotices((r as any).notices ?? [])
  }

  useEffect(() => { load() }, [])

  async function onDelete(id: number, title: string) {
    if (!confirm(`「${title}」を削除しますか？`)) return
    setBusyId(id)
    const r = await apiFetch<{}>("/admin_notices_delete.php", {
      method: "POST",
      body: JSON.stringify({ id }),
    })
    setBusyId(null)
    if (!r.ok) { alert(toUserMessage(r as ApiNg, "削除に失敗しました")); return }
    setNotices(prev => prev.filter(n => n.id !== id))
  }

  return (
    <div className="page">
      <style>{G}</style>

      {/* ヘッダー */}
      <header className="page-header">
        <div className="page-header-inner">
          <div>
            <p className="page-eyebrow">App Settings</p>
            <h1 className="page-title">お知らせ管理</h1>
          </div>
          <Link href="/admin/settings/notices/new/" className="btn-new">
            ＋ 新規作成
          </Link>
        </div>
      </header>

      <main className="page-body">
        {/* エラー */}
        {error && (
          <div className="error-box">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ flexShrink: 0, marginTop: 1 }}>
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            {error}
          </div>
        )}

        {/* ローディング */}
        {loading ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "56px 0", gap: 8, color: C.muted, fontSize: 14 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C.brand} strokeWidth="2" style={{ animation: "spin .8s linear infinite" }}>
              <path d="M21 12a9 9 0 11-6.22-8.56"/>
            </svg>
            読み込み中…
          </div>
        ) : notices.length === 0 ? (
          <div className="empty">
            お知らせはまだありません<br />
            「＋ 新規作成」から追加してください
          </div>
        ) : (
          <>
            <p className="count-label">{notices.length} 件</p>
            {notices.map((n, i) => (
              <div key={n.id} className="rise" style={{ animationDelay: `${Math.min(i * 28, 200)}ms` }}>
                <div className={`notice-card${n.is_pinned ? " pinned" : ""}`}>
                  {/* タイトル行 */}
                  <div className="notice-card-header">
                    <div className="notice-title-row">
                      {n.is_pinned === 1 && <span className="badge-pin">📌 ピン留め</span>}
                      <span className="notice-title">{n.title}</span>
                    </div>
                  </div>

                  {/* 本文プレビュー */}
                  <p className="notice-body-text">{n.body}</p>

                  {/* メタ情報 + アクション */}
                  <div className="notice-meta">
                    <div className="notice-meta-left">
                      <span className="badge-target">🎯 {targetLabel(n.targets)}</span>
                      <span className="notice-sender">{n.sender_name}</span>
                      <span className="notice-date">{n.published_at}</span>
                      {n.expires_at && (
                        <span className="notice-expires">〜{n.expires_at}まで</span>
                      )}
                    </div>
                    <div className="notice-actions">
                      <Link href={`/admin/settings/notices/edit/?id=${n.id}`} className="btn-edit">
                        編集
                      </Link>
                      <button
                        className="btn-delete"
                        disabled={busyId === n.id}
                        onClick={() => onDelete(n.id, n.title)}
                      >
                        {busyId === n.id ? "…" : "削除"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </>
        )}
      </main>
    </div>
  )
}

export default function AdminNoticesPage() {
  return <Guard requireAdmin><NoticesListInner /></Guard>
}
