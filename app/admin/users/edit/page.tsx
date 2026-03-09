"use client"

import Link from "next/link"
import { Suspense, useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Guard } from "@/components/Guard"
import { apiFetch } from "@/lib/api"
import type { ApiNg } from "@/lib/api"
import { toUserMessage } from "@/lib/errors"
import type { Role } from "@/lib/auth"

const C = {
  bg: "#f0f5f7", card: "#ffffff", brand: "#006284", brandDark: "#004a63",
  brandTint: "#e4f2f7", text: "#0c1d24", sub: "#3b6878", muted: "#89adb8",
  line: "#cde4eb", danger: "#b83030", dangerTint: "#fdf1f1", dangerLine: "#e8b8b8",
  done: "#1a6640",
} as const

const ROLES: { value: Role; label: string; desc: string; icon: string }[] = [
  { value: "staff",  label: "スタッフ",  desc: "一般操作のみ", icon: "👤" },
  { value: "leader", label: "リーダー",  desc: "チーム管理可", icon: "👥" },
  { value: "admin",  label: "管理者",    desc: "全権限",       icon: "🔑" },
]

const G = `
@import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=Noto+Sans+JP:wght@400;500;700&display=swap');
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html { -webkit-text-size-adjust: 100%; }
body { background: ${C.bg}; }
::placeholder { color: ${C.muted}; opacity: 1; }
@keyframes spin { to { transform: rotate(360deg); } }

.back-header {
  background: ${C.brand}; padding: 14px 16px;
  display: flex; align-items: center; gap: 12px;
  position: sticky; top: 0; z-index: 10;
}
.back-btn {
  width: 34px; height: 34px; border-radius: 50%;
  background: rgba(255,255,255,.18); border: none;
  display: flex; align-items: center; justify-content: center;
  color: #fff; cursor: pointer; flex-shrink: 0;
  text-decoration: none; -webkit-tap-highlight-color: transparent;
}
.back-title { font-size: 18px; font-weight: 400; color: #fff; font-family: 'DM Serif Display', serif; }
.back-sub   { font-size: 11px; color: rgba(255,255,255,.6); margin-top: 1px; }

.page-body { max-width: 560px; margin: 0 auto; padding: 20px 12px 80px; }
@media (min-width: 560px) { .page-body { padding: 24px 20px 80px; } }

.form-card {
  background: ${C.card}; border: 1px solid ${C.line};
  border-radius: 14px; overflow: hidden;
  box-shadow: 0 2px 12px rgba(0,98,132,.07);
}
.form-field { padding: 16px 14px; border-bottom: 1px solid ${C.line}; }
.form-field:last-child { border-bottom: none; }
@media (min-width: 560px) { .form-field { padding: 20px 22px; } }

.form-label {
  display: block; font-size: 11px; font-weight: 700;
  color: ${C.muted}; letter-spacing: .1em; text-transform: uppercase;
  margin-bottom: 8px; font-family: 'Noto Sans JP', sans-serif;
}
.form-input {
  width: 100%; height: 46px; padding: 0 13px;
  border: 1.5px solid ${C.line}; border-radius: 9px;
  background: ${C.bg}; color: ${C.text};
  font-size: 16px; font-family: 'Noto Sans JP', sans-serif;
  outline: none; -webkit-appearance: none;
  transition: border-color .15s;
}
.form-input:focus { border-color: ${C.brand}; }

.role-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; }
.role-btn {
  padding: 12px 6px; border-radius: 10px; cursor: pointer;
  border: 1.5px solid ${C.line}; background: ${C.bg};
  text-align: center; transition: all .13s;
  -webkit-tap-highlight-color: transparent;
  font-family: 'Noto Sans JP', sans-serif;
}
.role-btn.active { border-color: ${C.brand}; background: ${C.brandTint}; }
.role-btn-icon  { font-size: 18px; margin-bottom: 4px; }
.role-btn-label { font-size: 13px; font-weight: 700; color: ${C.sub}; }
.role-btn.active .role-btn-label { color: ${C.brand}; }
.role-btn-desc  { font-size: 10px; color: ${C.muted}; margin-top: 2px; }

.submit-btn {
  width: 100%; height: 50px; border: none; border-radius: 10px;
  background: ${C.brand}; color: #fff;
  font-size: 15px; font-weight: 700;
  font-family: 'Noto Sans JP', sans-serif;
  cursor: pointer; letter-spacing: .03em;
  box-shadow: 0 3px 16px rgba(0,98,132,.28);
  display: flex; align-items: center; justify-content: center; gap: 8px;
  transition: background .15s;
  margin-top: 16px;
  -webkit-tap-highlight-color: transparent;
}
.submit-btn.done-btn { background: ${C.done}; box-shadow: 0 3px 16px rgba(26,102,64,.28); }
.submit-btn:disabled { background: ${C.muted}; box-shadow: none; cursor: not-allowed; }
.submit-btn:not(:disabled):not(.done-btn):active { background: ${C.brandDark}; }

.error-box {
  margin-top: 12px; padding: 12px 14px;
  background: ${C.dangerTint}; border: 1px solid ${C.dangerLine};
  border-radius: 8px; color: ${C.danger};
  font-size: 13px; display: flex; align-items: flex-start; gap: 8px;
  line-height: 1.5;
}

/* loading / error 全画面 */
.center-screen {
  min-height: 100vh; background: ${C.bg};
  display: flex; align-items: center; justify-content: center;
  font-family: 'Noto Sans JP', sans-serif;
  color: ${C.muted}; gap: 10px; font-size: 14px;
}
`

type UserDetail = { id: number; staff_id: string; username: string; role: Role; must_change_password: number; created_at?: string }

function EditUserInner() {
  const router = useRouter()
  const sp = useSearchParams()
  const id = useMemo(() => Number(sp.get("id") ?? 0), [sp])

  const [loadingInit, setLoadingInit] = useState(true)
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState<string | null>(null)
  const [user,    setUser]    = useState<UserDetail | null>(null)
  const [staffId, setStaffId] = useState("")
  const [username,setUsername]= useState("")
  const [role,    setRole]    = useState<Role>("staff")
  const [saved,   setSaved]   = useState(false)

  useEffect(() => {
    if (!id) { setError("IDが不正です"); setLoadingInit(false); return }
    ;(async () => {
      setLoadingInit(true)
      const r = await apiFetch<{ user: UserDetail }>(`/admin_get_user.php?id=${id}`)
      setLoadingInit(false)
      if (!r.ok) { setError(toUserMessage(r as ApiNg, "取得に失敗しました")); return }
      const u = (r as any).user as UserDetail
      setUser(u); setStaffId(u.staff_id ?? ""); setUsername(u.username ?? ""); setRole(u.role)
    })()
  }, [id])

  async function onSave(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return
    setError(null)
    if (!staffId.trim())  return setError("スタッフIDを入力してください")
    if (!username.trim()) return setError("ユーザー名を入力してください")
    setSaving(true)
    const r = await apiFetch<{ updated: boolean }>("/admin_update_user.php", {
      method: "POST",
      body: JSON.stringify({ id: user.id, staff_id: staffId.trim(), username: username.trim(), role }),
    })
    setSaving(false)
    if (!r.ok) { setError(toUserMessage(r as ApiNg, "保存に失敗しました")); return }
    setSaved(true)
    setTimeout(() => router.push("/admin/users/"), 900)
  }

  if (loadingInit) return (
    <div className="center-screen">
      <style>{G}</style>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={C.brand} strokeWidth="2"
        style={{ animation: "spin .8s linear infinite" }}><path d="M21 12a9 9 0 11-6.22-8.56"/></svg>
      読み込み中…
    </div>
  )

  if (error && !user) return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "'Noto Sans JP', sans-serif" }}>
      <style>{G}</style>
      <header className="back-header">
        <Link href="/admin/users/" className="back-btn">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
          </svg>
        </Link>
        <p className="back-title">エラー</p>
      </header>
      <div className="page-body">
        <div className="error-box" style={{ marginTop: 0 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ flexShrink: 0, marginTop: 1 }}>
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          {error}
        </div>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "'Noto Sans JP', sans-serif" }}>
      <style>{G}</style>

      {/* 戻るヘッダー */}
      <header className="back-header">
        <Link href="/admin/users/" className="back-btn">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
          </svg>
        </Link>
        <div>
          <p className="back-title">{user?.username ?? "ユーザー編集"}</p>
          <p className="back-sub">スタッフID: {user?.staff_id}</p>
        </div>
      </header>

      <div className="page-body">
        <form onSubmit={onSave} noValidate>
          <div className="form-card">

            {/* スタッフID */}
            <div className="form-field">
              <label className="form-label">スタッフID</label>
              <input className="form-input" value={staffId}
                onChange={e => setStaffId(e.target.value)}
                autoComplete="off" />
            </div>

            {/* ユーザー名 */}
            <div className="form-field">
              <label className="form-label">ユーザー名</label>
              <input className="form-input" value={username}
                onChange={e => setUsername(e.target.value)}
                autoComplete="off" />
            </div>

            {/* 権限 */}
            <div className="form-field">
              <label className="form-label">権限</label>
              <div className="role-grid">
                {ROLES.map(r => (
                  <button key={r.value} type="button" onClick={() => setRole(r.value)}
                    className={`role-btn${role === r.value ? " active" : ""}`}>
                    <div className="role-btn-icon">{r.icon}</div>
                    <div className="role-btn-label">{r.label}</div>
                    <div className="role-btn-desc">{r.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* エラー */}
          {error && (
            <div className="error-box">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ flexShrink: 0, marginTop: 1 }}>
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              {error}
            </div>
          )}

          {/* 保存ボタン */}
          <button type="submit" disabled={saving || saved}
            className={`submit-btn${saved ? " done-btn" : ""}`}>
            {saved
              ? <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>保存しました</>
              : saving
                ? <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5"
                    style={{ animation: "spin .8s linear infinite" }}><path d="M21 12a9 9 0 11-6.22-8.56"/></svg>保存中…</>
                : "変更を保存する"
            }
          </button>
        </form>
      </div>
    </div>
  )
}

export default function AdminUsersEditPage() {
  return (
    <Guard requireAdmin>
      <Suspense fallback={
        <div style={{ minHeight: "100vh", background: "#f0f5f7", display: "flex", justifyContent: "center", alignItems: "center", color: "#89adb8", fontFamily: "sans-serif", gap: 8, fontSize: 14 }}>
          読み込み中…
        </div>
      }>
        <EditUserInner />
      </Suspense>
    </Guard>
  )
}
