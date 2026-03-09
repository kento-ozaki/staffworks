"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { Guard } from "@/components/Guard"
import { adminListUsers } from "@/lib/admin"
import { apiFetch } from "@/lib/api"
import type { ApiNg } from "@/lib/api"
import { toUserMessage } from "@/lib/errors"
import type { User } from "@/lib/auth"

/* ── カラー ── */
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
} as const

/* ── グローバルCSS（メディアクエリをここに集約） ── */
const G = `
@import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=Noto+Sans+JP:wght@400;500;700&display=swap');
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html { -webkit-text-size-adjust: 100%; }
body { background: ${C.bg}; }
::placeholder { color: ${C.muted}; opacity: 1; }

@keyframes spin { to { transform: rotate(360deg); } }
@keyframes rise {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: none; }
}
.rise { animation: rise .22s ease both; }

/* ── 共通ページラッパー ── */
.page { min-height: 100vh; background: ${C.bg}; font-family: 'Noto Sans JP', sans-serif; }

/* ── ページヘッダー（上帯） ── */
.page-header {
  background: ${C.brand};
  padding: 18px 16px 20px;
  position: sticky; top: 0; z-index: 10;
}
.page-header-inner {
  max-width: 720px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.page-eyebrow {
  font-size: 10px; font-weight: 500;
  color: rgba(255,255,255,.5);
  letter-spacing: .18em; text-transform: uppercase;
  margin-bottom: 3px;
  font-family: 'Noto Sans JP', sans-serif;
}
.page-title {
  font-size: 22px; font-weight: 400;
  color: #fff; line-height: 1.1;
  font-family: 'DM Serif Display', serif;
}
.btn-primary {
  display: inline-flex; align-items: center; gap: 6px;
  height: 36px; padding: 0 16px;
  background: #fff; color: ${C.brand};
  border: none; border-radius: 8px;
  font-size: 13px; font-weight: 700;
  font-family: 'Noto Sans JP', sans-serif;
  text-decoration: none; cursor: pointer;
  white-space: nowrap; flex-shrink: 0;
  transition: opacity .15s;
}
.btn-primary:active { opacity: .8; }

/* ── メインコンテンツ ── */
.page-body {
  max-width: 720px;
  margin: 0 auto;
  padding: 16px 12px 80px;
}

/* ── 検索バー ── */
.search-wrap { position: relative; margin-bottom: 12px; }
.search-icon { position: absolute; left: 13px; top: 50%; transform: translateY(-50%); pointer-events: none; }
.search-input {
  width: 100%; height: 46px;
  padding: 0 44px 0 40px;
  background: ${C.card};
  border: 1.5px solid ${C.line};
  border-radius: 10px;
  color: ${C.text}; font-size: 15px;
  font-family: 'Noto Sans JP', sans-serif;
  outline: none;
  -webkit-appearance: none;
}
.search-input:focus { border-color: ${C.brand}; }

/* ── ユーザーカード ── */
.user-card {
  background: ${C.card};
  border-radius: 12px;
  border: 1px solid ${C.line};
  border-left: 3.5px solid ${C.brand};
  overflow: hidden;
  box-shadow: 0 1px 4px rgba(0,98,132,.06);
}
.user-card-top {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 14px 12px;
}
.user-avatar {
  width: 42px; height: 42px; border-radius: 50%;
  background: ${C.brandTint};
  border: 1.5px solid rgba(0,98,132,.15);
  display: flex; align-items: center; justify-content: center;
  font-size: 17px; font-weight: 400; color: ${C.brand};
  font-family: 'DM Serif Display', serif;
  flex-shrink: 0;
}
.user-info { flex: 1; min-width: 0; }
.user-name {
  font-size: 15px; font-weight: 700; color: ${C.text};
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  margin-bottom: 5px;
}
.user-meta { display: flex; flex-wrap: wrap; gap: 5px; align-items: center; }

/* スマホ: アクションは下部にフルwidth帯 */
.user-card-actions {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  border-top: 1px solid ${C.line};
}
.user-card-actions a,
.user-card-actions button {
  height: 38px;
  display: flex; align-items: center; justify-content: center;
  font-size: 12px; font-weight: 600;
  font-family: 'Noto Sans JP', sans-serif;
  border: none; border-right: 1px solid ${C.line};
  background: transparent; cursor: pointer;
  text-decoration: none;
  transition: background .12s;
  color: ${C.sub};
  -webkit-tap-highlight-color: transparent;
}
.user-card-actions a:last-child,
.user-card-actions button:last-child { border-right: none; }
.user-card-actions a:active,
.user-card-actions button:active { background: ${C.bg}; }
.user-card-actions .btn-del { color: ${C.danger}; }
.user-card-actions button:disabled { opacity: .4; cursor: not-allowed; }

/* PC: 横一列レイアウト */
@media (min-width: 560px) {
  .page-header { padding: 20px 24px 22px; }
  .page-body { padding: 20px 20px 80px; }
  .page-title { font-size: 26px; }
  .search-input { font-size: 14px; }

  .user-card { display: flex; align-items: center; }
  .user-card-top { flex: 1; padding: 16px 18px; min-width: 0; }
  .user-card-actions {
    grid-template-columns: none;
    display: flex;
    border-top: none;
    border-left: 1px solid ${C.line};
    flex-shrink: 0;
    align-self: stretch;
  }
  .user-card-actions a,
  .user-card-actions button {
    border-right: 1px solid ${C.line};
    border-bottom: none;
    height: auto;
    padding: 0 16px;
    font-size: 12px;
  }
  .user-card-actions a:last-child,
  .user-card-actions button:last-child { border-right: none; }
}

/* ── バッジ共通 ── */
.badge {
  display: inline-flex; align-items: center;
  font-size: 11px; font-weight: 700;
  padding: 2px 8px; border-radius: 4px;
  letter-spacing: .02em;
  font-family: 'Noto Sans JP', sans-serif;
  white-space: nowrap;
}

/* ── フォームカード ── */
.form-card {
  background: ${C.card};
  border: 1px solid ${C.line};
  border-radius: 14px;
  overflow: hidden;
  box-shadow: 0 2px 12px rgba(0,98,132,.07);
}
.form-field {
  padding: 18px 16px;
  border-bottom: 1px solid ${C.line};
}
.form-field:last-child { border-bottom: none; }
@media (min-width: 560px) {
  .form-field { padding: 20px 22px; }
}
.form-label {
  display: block;
  font-size: 11px; font-weight: 700;
  color: ${C.muted};
  letter-spacing: .1em; text-transform: uppercase;
  margin-bottom: 8px;
  font-family: 'Noto Sans JP', sans-serif;
}
.form-input {
  width: 100%; height: 46px;
  padding: 0 13px;
  border: 1.5px solid ${C.line};
  border-radius: 9px;
  background: ${C.bg};
  color: ${C.text}; font-size: 16px;
  font-family: 'Noto Sans JP', sans-serif;
  outline: none;
  -webkit-appearance: none;
  transition: border-color .15s;
}
.form-input:focus { border-color: ${C.brand}; }
.form-hint {
  font-size: 12px; color: ${C.muted};
  margin-top: 6px; line-height: 1.5;
}
.submit-btn {
  width: 100%; height: 50px;
  border: none; border-radius: 10px;
  background: ${C.brand}; color: #fff;
  font-size: 15px; font-weight: 700;
  font-family: 'Noto Sans JP', sans-serif;
  cursor: pointer; letter-spacing: .03em;
  box-shadow: 0 3px 16px rgba(0,98,132,.28);
  display: flex; align-items: center; justify-content: center; gap: 8px;
  transition: background .15s, box-shadow .15s;
  margin-top: 16px;
  -webkit-tap-highlight-color: transparent;
}
.submit-btn:disabled { background: ${C.muted}; box-shadow: none; cursor: not-allowed; }
.submit-btn:not(:disabled):active { background: ${C.brandDark}; }
.error-box {
  margin-top: 12px; padding: 12px 14px;
  background: ${C.dangerTint}; border: 1px solid ${C.dangerLine};
  border-radius: 8px; color: ${C.danger};
  font-size: 13px; display: flex; align-items: flex-start; gap: 8px;
  line-height: 1.5;
}

/* ── 戻るヘッダー（詳細・編集ページ） ── */
.back-header {
  background: ${C.brand};
  padding: 14px 16px;
  display: flex; align-items: center; gap: 12px;
  position: sticky; top: 0; z-index: 10;
}
.back-btn {
  width: 34px; height: 34px; border-radius: 50%;
  background: rgba(255,255,255,.18);
  border: none; display: flex; align-items: center; justify-content: center;
  color: #fff; cursor: pointer; flex-shrink: 0;
  text-decoration: none;
  -webkit-tap-highlight-color: transparent;
}
.back-title {
  font-size: 17px; font-weight: 400; color: #fff;
  font-family: 'DM Serif Display', serif;
}
.back-sub {
  font-size: 11px; color: rgba(255,255,255,.6);
  margin-top: 1px;
}
`

/* ── バッジ ── */
const ROLE_CFG: Record<string, { label: string; color: string; bg: string }> = {
  admin:  { label: "管理者",   color: C.brand,  bg: C.brandTint },
  leader: { label: "リーダー", color: C.warn,   bg: C.warnTint  },
  staff:  { label: "スタッフ", color: C.sub,    bg: C.bg        },
}
function RoleBadge({ role }: { role: string }) {
  const s = ROLE_CFG[role] ?? ROLE_CFG.staff
  return (
    <span className="badge" style={{ color: s.color, background: s.bg, border: `1px solid ${s.color}28` }}>
      {s.label}
    </span>
  )
}

/* ── メイン ── */
function UsersListInner() {
  const [users,   setUsers]   = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)
  const [busyId,  setBusyId]  = useState<number | null>(null)
  const [q,       setQ]       = useState("")
  const [debQ,    setDebQ]    = useState("")

  useEffect(() => {
    const t = setTimeout(() => setDebQ(q), 300)
    return () => clearTimeout(t)
  }, [q])

  async function load(search?: string) {
    setError(null); setLoading(true)
    const r = await adminListUsers(search)
    setLoading(false)
    if (!r.ok) { setError(toUserMessage(r as ApiNg, "取得に失敗しました")); return }
    setUsers((r as any).users ?? [])
  }
  useEffect(() => { load(debQ || undefined) }, [debQ])

  async function onDelete(id: number, name: string) {
    if (!confirm(`「${name}」を削除します。\nこの操作は取り消せません。`)) return
    setBusyId(id)
    const r = await apiFetch<{}>("/admin_delete_user.php", { method: "POST", body: JSON.stringify({ id }) })
    setBusyId(null)
    if (!r.ok) { alert(toUserMessage(r as ApiNg, "削除に失敗しました")); return }
    load(debQ || undefined)
  }

  async function onReset(id: number, name: string) {
    if (!confirm(`「${name}」のパスワードを\n生年月日（初期値）にリセットします。`)) return
    setBusyId(id)
    const r = await apiFetch<{}>("/admin_reset_password.php", { method: "POST", body: JSON.stringify({ id }) })
    setBusyId(null)
    if (!r.ok) { alert(toUserMessage(r as ApiNg, "リセットに失敗しました")); return }
    load(debQ || undefined)
  }

  return (
    <div className="page">
      <style>{G}</style>

      {/* ヘッダー */}
      <header className="page-header">
        <div className="page-header-inner">
          <div>
            <p className="page-eyebrow">Admin Panel</p>
            <h1 className="page-title">ユーザー管理</h1>
          </div>
          <Link href="/admin/users/new/" className="btn-primary">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            新規登録
          </Link>
        </div>
      </header>

      <main className="page-body">
        {/* 検索 */}
        <div className="search-wrap">
          <svg className="search-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="2.5">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            className="search-input"
            value={q} onChange={e => setQ(e.target.value)}
            placeholder="名前・スタッフIDで検索"
          />
          {loading && (
            <svg style={{ position: "absolute", right: 13, top: "50%", transform: "translateY(-50%)", animation: "spin .8s linear infinite" }}
              width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.brand} strokeWidth="2">
              <path d="M21 12a9 9 0 11-6.22-8.56"/>
            </svg>
          )}
        </div>

        {/* カウント */}
        <p style={{ fontSize: 12, color: C.muted, marginBottom: 12, paddingLeft: 2 }}>
          {loading ? "読み込み中…" : `${users.length} 名`}
        </p>

        {/* エラー */}
        {error && (
          <div className="error-box" style={{ marginBottom: 12, marginTop: 0 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ flexShrink: 0, marginTop: 1 }}>
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            {error}
          </div>
        )}

        {/* リスト */}
        {!loading && users.length === 0 ? (
          <p style={{ textAlign: "center", padding: "48px 0", color: C.muted, fontSize: 14 }}>
            ユーザーが見つかりません
          </p>
        ) : (
          <div style={{ display: "grid", gap: 8 }}>
            {users.map((u, i) => (
              <div key={u.id} className="rise" style={{ animationDelay: `${Math.min(i * 28, 220)}ms` }}>
                <div className="user-card">
                  <div className="user-card-top">
                    {/* アバター */}
                    <div className="user-avatar">
                      {(u.username ?? "?")[0].toUpperCase()}
                    </div>
                    {/* テキスト情報 */}
                    <div className="user-info">
                      <div className="user-name">{u.username}</div>
                      <div className="user-meta">
                        <RoleBadge role={u.role} />
                        <span style={{ fontSize: 12, color: C.muted }}>
                          <span style={{ color: C.sub, fontWeight: 700 }}>{u.staff_id}</span>
                        </span>
                        {Number(u.must_change_password) === 1 && (
                          <span className="badge" style={{ color: C.warn, background: C.warnTint, border: `1px solid ${C.warnLine}` }}>
                            初回PW待ち
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* アクションバー */}
                  <div className="user-card-actions">
                    <Link href={`/admin/users/edit?id=${u.id}`}>編集</Link>
                    <button
                      onClick={() => onReset(u.id, u.username)}
                      disabled={busyId === u.id}
                    >
                      PWリセット
                    </button>
                    <button
                      className="btn-del"
                      onClick={() => onDelete(u.id, u.username)}
                      disabled={busyId === u.id}
                    >
                      削除
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

export default function AdminUsersPage() {
  return <Guard requireAdmin><UsersListInner /></Guard>
}
