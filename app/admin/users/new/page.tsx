"use client"

import Link from "next/link"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Guard } from "@/components/Guard"
import { adminCreateUser } from "@/lib/admin"
import type { ApiNg } from "@/lib/api"
import { toUserMessage } from "@/lib/errors"
import type { Role } from "@/lib/auth"

const C = {
  bg: "#f0f5f7", card: "#ffffff", brand: "#006284", brandDark: "#004a63",
  brandTint: "#e4f2f7", text: "#0c1d24", sub: "#3b6878", muted: "#89adb8",
  line: "#cde4eb", done: "#1a6640", doneTint: "#eaf5ee", doneLine: "#9fd0b5",
  danger: "#b83030", dangerTint: "#fdf1f1", dangerLine: "#e8b8b8",
  warn: "#7a5400", warnTint: "#fdf6e0",
} as const

const ROLES: { value: Role; label: string; desc: string; icon: string }[] = [
  { value: "staff",  label: "スタッフ",  desc: "一般操作のみ",  icon: "👤" },
  { value: "leader", label: "リーダー",  desc: "チーム管理可",  icon: "👥" },
  { value: "admin",  label: "管理者",    desc: "全権限",        icon: "🔑" },
]

/* ── 共有CSS ── */
const G = `
@import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=Noto+Sans+JP:wght@400;500;700&display=swap');
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html { -webkit-text-size-adjust: 100%; }
body { background: ${C.bg}; }
::placeholder { color: ${C.muted}; opacity: 1; }
@keyframes spin { to { transform: rotate(360deg); } }
@keyframes rise { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:none; } }

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
.form-req { color: ${C.danger}; margin-left: 3px; }

.form-input {
  width: 100%; height: 46px; padding: 0 13px;
  border: 1.5px solid ${C.line}; border-radius: 9px;
  background: ${C.bg}; color: ${C.text};
  font-size: 16px; font-family: 'Noto Sans JP', sans-serif;
  outline: none; -webkit-appearance: none;
  transition: border-color .15s;
}
.form-input:focus { border-color: ${C.brand}; }
.form-hint { font-size: 12px; color: ${C.muted}; margin-top: 6px; line-height: 1.5; }
.form-preview { font-size: 13px; color: ${C.brand}; font-weight: 700; margin-top: 5px; }

/* 権限ボタングリッド */
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
.submit-btn:disabled { background: ${C.muted}; box-shadow: none; cursor: not-allowed; }
.submit-btn:not(:disabled):active { background: ${C.brandDark}; }

.error-box {
  margin-top: 12px; padding: 12px 14px;
  background: ${C.dangerTint}; border: 1px solid ${C.dangerLine};
  border-radius: 8px; color: ${C.danger};
  font-size: 13px; display: flex; align-items: flex-start; gap: 8px;
  line-height: 1.5;
}

/* 完了画面 */
.success-card {
  background: ${C.card}; border: 1px solid ${C.doneLine};
  border-top: 3.5px solid ${C.done};
  border-radius: 14px; padding: 24px 16px;
  box-shadow: 0 2px 12px rgba(0,98,132,.07);
  animation: rise .3s ease;
}
@media (min-width: 560px) { .success-card { padding: 28px 24px; } }
.success-icon {
  width: 48px; height: 48px; border-radius: 50%;
  background: ${C.doneTint}; border: 1.5px solid ${C.doneLine};
  display: flex; align-items: center; justify-content: center;
  margin-bottom: 14px;
}
.success-table { width: 100%; border-collapse: collapse; margin: 14px 0; }
.success-table td { padding: 8px 0; border-bottom: 1px solid ${C.line}; font-size: 14px; vertical-align: top; }
.success-table td:first-child { color: ${C.muted}; width: 45%; }
.success-table td:last-child  { color: ${C.text}; font-weight: 700; word-break: break-all; }
.success-note {
  background: ${C.brandTint}; border: 1px solid ${C.line};
  border-radius: 8px; padding: 11px 14px;
  font-size: 13px; color: ${C.sub}; margin: 14px 0;
  line-height: 1.55;
}
.success-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 20px; }
.btn-outline {
  height: 44px; border-radius: 9px;
  border: 1.5px solid ${C.line}; background: transparent;
  color: ${C.sub}; font-size: 13px; font-weight: 600;
  font-family: 'Noto Sans JP', sans-serif;
  cursor: pointer; -webkit-tap-highlight-color: transparent;
}
.btn-filled {
  height: 44px; border-radius: 9px;
  border: none; background: ${C.brand};
  color: #fff; font-size: 13px; font-weight: 700;
  font-family: 'Noto Sans JP', sans-serif;
  cursor: pointer; box-shadow: 0 2px 10px rgba(0,98,132,.25);
  -webkit-tap-highlight-color: transparent;
}
`

function NewUserInner() {
  const router = useRouter()
  const [staffId,   setStaffId]   = useState("")
  const [username,  setUsername]  = useState("")
  const [birthdate, setBirthdate] = useState("")
  const [role,      setRole]      = useState<Role>("staff")
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState<string | null>(null)
  const [created,   setCreated]   = useState<any>(null)

  function fmtBD(raw: string) {
    if (raw.length >= 8) return `${raw.slice(0,4)}年${raw.slice(4,6)}月${raw.slice(6,8)}日`
    if (raw.length >= 5) return `${raw.slice(0,4)}年${raw.slice(4,6)}月…`
    if (raw.length >= 1) return `${raw.slice(0,4)}年…`
    return ""
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault(); setError(null); setCreated(null)
    if (!staffId.trim())            return setError("スタッフIDを入力してください")
    if (!username.trim())           return setError("ユーザー名を入力してください")
    if (!/^\d{8}$/.test(birthdate)) return setError("生年月日は8桁の数字（例：19900115）で入力してください")
    setLoading(true)
    const r = await adminCreateUser({ staff_id: staffId.trim(), username: username.trim(), birthdate, role })
    setLoading(false)
    if (!r.ok) { setError(toUserMessage(r as ApiNg, "作成に失敗しました")); return }
    setCreated((r as any).user)
  }

  function reset() { setCreated(null); setStaffId(""); setUsername(""); setBirthdate(""); setRole("staff") }

  /* ── 完了画面 ── */
  if (created) {
    return (
      <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "'Noto Sans JP', sans-serif" }}>
        <style>{G}</style>
        <header className="back-header">
          <div>
            <p className="back-title">登録完了</p>
          </div>
        </header>
        <div className="page-body">
          <div className="success-card">
            <div className="success-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={C.done} strokeWidth="3">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            <p style={{ fontSize: 11, fontWeight: 700, color: C.done, letterSpacing: ".1em", textTransform: "uppercase", marginBottom: 4 }}>
              Complete
            </p>
            <p style={{ fontSize: 20, fontWeight: 400, color: C.text, fontFamily: "'DM Serif Display', serif" }}>
              ユーザーを登録しました
            </p>

            <table className="success-table">
              <tbody>
                {[
                  ["ユーザー名",     created.username],
                  ["スタッフID",     created.staff_id],
                  ["権限",           ROLES.find(r => r.value === created.role)?.label ?? created.role],
                  ["初期パスワード", birthdate + "（生年月日）"],
                ].map(([k, v]) => (
                  <tr key={k}><td>{k}</td><td>{v}</td></tr>
                ))}
              </tbody>
            </table>

            <div className="success-note">
              初回ログイン後にパスワード変更が求められます。<br />
              初期パスワードを本人に安全な方法でお伝えください。
            </div>

            <div className="success-actions">
              <button className="btn-outline" onClick={reset}>続けて登録</button>
              <button className="btn-filled" onClick={() => router.replace("/admin/users/")}>一覧へ戻る</button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  /* ── 入力フォーム ── */
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
          <p className="back-title">新規ユーザー登録</p>
          <p className="back-sub">Admin Panel</p>
        </div>
      </header>

      <div className="page-body">
        <form onSubmit={onSubmit} noValidate>
          <div className="form-card">

            {/* スタッフID */}
            <div className="form-field">
              <label className="form-label">スタッフID<span className="form-req">*</span></label>
              <input className="form-input" value={staffId} onChange={e => setStaffId(e.target.value)}
                placeholder="例: EMP001" autoComplete="off" />
              <p className="form-hint">ログインに使用します。後から変更可能です。</p>
            </div>

            {/* ユーザー名 */}
            <div className="form-field">
              <label className="form-label">ユーザー名<span className="form-req">*</span></label>
              <input className="form-input" value={username} onChange={e => setUsername(e.target.value)}
                placeholder="例: 山田 太郎" autoComplete="off" />
            </div>

            {/* 生年月日 */}
            <div className="form-field">
              <label className="form-label">生年月日（初期パスワード）<span className="form-req">*</span></label>
              <input
                className="form-input"
                value={birthdate}
                onChange={e => setBirthdate(e.target.value.replace(/\D/g, "").slice(0, 8))}
                placeholder="例: 19901225"
                inputMode="numeric"
                maxLength={8}
                style={{ maxWidth: 200, letterSpacing: "0.1em" }}
              />
              <p className="form-hint">8桁の数字（YYYYMMDD）。これが初期パスワードになります。</p>
              {birthdate.length > 0 && (
                <p className="form-preview">{fmtBD(birthdate)}</p>
              )}
            </div>

            {/* 権限 */}
            <div className="form-field">
              <label className="form-label">権限<span className="form-req">*</span></label>
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

          {/* 送信 */}
          <button type="submit" disabled={loading} className="submit-btn">
            {loading
              ? <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5"
                  style={{ animation: "spin .8s linear infinite" }}><path d="M21 12a9 9 0 11-6.22-8.56"/></svg>登録中…</>
              : "ユーザーを登録する"
            }
          </button>
        </form>
      </div>
    </div>
  )
}

export default function AdminUsersNewPage() {
  return <Guard requireAdmin><NewUserInner /></Guard>
}
