"use client"

import Link from "next/link"
import { useEffect, useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
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
  done:       "#1a6640",
  doneTint:   "#eaf5ee",
  doneLine:   "#9fd0b5",
} as const

type Role = "admin" | "leader" | "staff"
type TargetType = "all" | "role" | "user"

type NoticeTarget = {
  target_type: TargetType
  target_role?: Role | null
  target_user?: number | null
}

type UserRow = {
  id: number
  username: string
  role: Role
}

/* ── CSS ── */
const G = `
@import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=Noto Sans JP:wght@400;500;700&display=swap');
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html { -webkit-text-size-adjust: 100%; }
body { background: ${C.bg}; }
::placeholder { color: ${C.muted}; opacity: 1; }
@keyframes spin { to { transform: rotate(360deg); } }
@keyframes rise { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }

/* ── 戻るヘッダー ── */
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

/* ── ページ本体 ── */
.page-body { max-width: 600px; margin: 0 auto; padding: 20px 12px 80px; }
@media (min-width: 560px) { .page-body { padding: 24px 20px 80px; } }

/* ── カード ── */
.form-card {
  background: ${C.card}; border: 1px solid ${C.line};
  border-radius: 14px; overflow: hidden;
  box-shadow: 0 2px 12px rgba(0,98,132,.07);
  margin-bottom: 14px;
}
.form-field { padding: 16px 14px; border-bottom: 1px solid ${C.line}; }
.form-field:last-child { border-bottom: none; }
@media (min-width: 560px) { .form-field { padding: 18px 20px; } }

.form-label {
  display: block; font-size: 11px; font-weight: 700;
  color: ${C.muted}; letter-spacing: .1em; text-transform: uppercase;
  margin-bottom: 8px;
}
.form-req { color: ${C.danger}; margin-left: 3px; }
.form-hint { font-size: 12px; color: ${C.muted}; margin-top: 6px; line-height: 1.5; }

.form-input {
  width: 100%; height: 46px; padding: 0 13px;
  border: 1.5px solid ${C.line}; border-radius: 9px;
  background: ${C.bg}; color: ${C.text}; font-size: 15px;
  font-family: 'Noto Sans JP', sans-serif;
  outline: none; -webkit-appearance: none; transition: border-color .15s;
}
.form-input:focus { border-color: ${C.brand}; background: #fff; }

.form-textarea {
  width: 100%; min-height: 120px; padding: 12px 13px;
  border: 1.5px solid ${C.line}; border-radius: 9px;
  background: ${C.bg}; color: ${C.text}; font-size: 15px;
  font-family: 'Noto Sans JP', sans-serif; line-height: 1.7;
  outline: none; resize: vertical; transition: border-color .15s;
}
.form-textarea:focus { border-color: ${C.brand}; background: #fff; }

/* ── トグル（ピン留め） ── */
.toggle-row {
  display: flex; align-items: center; justify-content: space-between;
}
.toggle-label { font-size: 14px; color: ${C.text}; font-weight: 500; }
.toggle-sub   { font-size: 12px; color: ${C.muted}; margin-top: 2px; }
.toggle-wrap  { position: relative; flex-shrink: 0; }
.toggle-input { opacity: 0; width: 0; height: 0; position: absolute; }
.toggle-track {
  display: block; width: 44px; height: 26px; border-radius: 13px;
  background: ${C.line}; cursor: pointer; transition: background .2s;
  position: relative;
}
.toggle-input:checked + .toggle-track { background: ${C.brand}; }
.toggle-track::after {
  content: ''; position: absolute;
  top: 3px; left: 3px; width: 20px; height: 20px;
  border-radius: 50%; background: #fff;
  box-shadow: 0 1px 4px rgba(0,0,0,.2);
  transition: transform .2s;
}
.toggle-input:checked + .toggle-track::after { transform: translateX(18px); }

/* ── 送信対象セレクター ── */
.target-type-row {
  display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; margin-bottom: 12px;
}
.target-type-btn {
  padding: 10px 6px; border-radius: 10px; cursor: pointer;
  border: 1.5px solid ${C.line}; background: ${C.bg};
  text-align: center; transition: all .13s;
  font-family: 'Noto Sans JP', sans-serif;
  -webkit-tap-highlight-color: transparent;
}
.target-type-btn.active {
  border-color: ${C.brand}; background: ${C.brandTint};
}
.target-type-icon  { font-size: 18px; margin-bottom: 3px; }
.target-type-label { font-size: 12px; font-weight: 700; color: ${C.sub}; }
.target-type-btn.active .target-type-label { color: ${C.brand}; }

/* ── ロール・ユーザー選択 ── */
.role-check-grid { display: grid; gap: 8px; margin-top: 10px; }
.role-check-item {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 12px; border-radius: 9px;
  border: 1.5px solid ${C.line}; background: ${C.bg};
  cursor: pointer; transition: border-color .13s;
}
.role-check-item.checked { border-color: ${C.brand}; background: ${C.brandTint}; }
.role-check-item input { width: 16px; height: 16px; accent-color: ${C.brand}; flex-shrink: 0; }
.role-check-label { font-size: 14px; color: ${C.text}; font-weight: 500; }

.user-check-list { display: grid; gap: 6px; margin-top: 10px; max-height: 220px; overflow-y: auto; }
.user-check-item {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 12px; border-radius: 9px;
  border: 1.5px solid ${C.line}; background: ${C.bg};
  cursor: pointer;
}
.user-check-item.checked { border-color: ${C.brand}; background: ${C.brandTint}; }
.user-check-item input { width: 16px; height: 16px; accent-color: ${C.brand}; flex-shrink: 0; }
.user-check-name { font-size: 14px; color: ${C.text}; font-weight: 500; }
.user-check-role { font-size: 11px; color: ${C.muted}; margin-left: auto; }

/* ── 送信ボタン ── */
.submit-btn {
  width: 100%; height: 50px; border: none; border-radius: 10px;
  background: ${C.brand}; color: #fff;
  font-size: 15px; font-weight: 700; font-family: 'Noto Sans JP', sans-serif;
  cursor: pointer; letter-spacing: .03em;
  box-shadow: 0 3px 16px rgba(0,98,132,.28);
  display: flex; align-items: center; justify-content: center; gap: 8px;
  transition: background .15s; -webkit-tap-highlight-color: transparent;
}
.submit-btn:disabled { background: ${C.muted}; box-shadow: none; cursor: not-allowed; }
.submit-btn:not(:disabled):active { background: ${C.brandDark}; }

/* ── エラー・成功 ── */
.error-box {
  margin-top: 12px; padding: 12px 14px;
  background: ${C.dangerTint}; border: 1px solid ${C.dangerLine};
  border-radius: 8px; color: ${C.danger}; font-size: 13px;
  display: flex; align-items: flex-start; gap: 8px; line-height: 1.5;
}
.success-box {
  margin-top: 12px; padding: 12px 14px;
  background: ${C.doneTint}; border: 1px solid ${C.doneLine};
  border-radius: 8px; color: ${C.done}; font-size: 13px;
  display: flex; align-items: center; gap: 8px;
}

/* ── 日付インプット ── */
.date-row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
@media (max-width: 400px) { .date-row { grid-template-columns: 1fr; } }
`

const ROLE_OPTIONS: { value: Role; label: string; icon: string }[] = [
  { value: "admin",  label: "管理者",   icon: "🔑" },
  { value: "leader", label: "リーダー", icon: "👥" },
  { value: "staff",  label: "スタッフ", icon: "👤" },
]

/* ── フォーム本体 ── */
function NoticeFormInner({ noticeId }: { noticeId?: number }) {
  const router = useRouter()
  const isEdit = !!noticeId

  // フォーム状態
  const [title,       setTitle]       = useState("")
  const [body,        setBody]        = useState("")
  const [senderName,  setSenderName]  = useState("管理者")
  const [isPinned,    setIsPinned]    = useState(false)
  const [publishedAt, setPublishedAt] = useState(new Date().toISOString().slice(0, 10))
  const [expiresAt,   setExpiresAt]   = useState("")

  // 送信対象
  const [targetType,    setTargetType]    = useState<TargetType>("all")
  const [selectedRoles, setSelectedRoles] = useState<Set<Role>>(new Set())
  const [selectedUsers, setSelectedUsers] = useState<Set<number>>(new Set())
  const [users,         setUsers]         = useState<UserRow[]>([])

  const [loading,  setLoading]  = useState(isEdit)
  const [saving,   setSaving]   = useState(false)
  const [error,    setError]    = useState<string | null>(null)
  const [saved,    setSaved]    = useState(false)

  // ユーザー一覧取得
  useEffect(() => {
    ;(async () => {
      const r = await apiFetch<{ users: UserRow[] }>("/admin_list_users.php", { method: "GET" })
      if (r.ok) setUsers((r as any).users ?? [])
    })()
  }, [])

  // 編集時：既存データ取得
  useEffect(() => {
    if (!isEdit) return
    ;(async () => {
      setLoading(true)
      const r = await apiFetch<{ notices: any[] }>("/admin_notices_list.php", { method: "GET" })
      setLoading(false)
      if (!r.ok) { setError("データの取得に失敗しました"); return }
      const n = (r as any).notices?.find((x: any) => x.id === noticeId)
      if (!n) { setError("お知らせが見つかりません"); return }

      setTitle(n.title ?? "")
      setBody(n.body ?? "")
      setSenderName(n.sender_name ?? "管理者")
      setIsPinned(Number(n.is_pinned) === 1)
      setPublishedAt(n.published_at ?? "")
      setExpiresAt(n.expires_at ?? "")

      // 送信対象の復元
      const targets: NoticeTarget[] = n.targets ?? []
      if (targets.some((t: NoticeTarget) => t.target_type === "all")) {
        setTargetType("all")
      } else if (targets.some((t: NoticeTarget) => t.target_type === "role")) {
        setTargetType("role")
        setSelectedRoles(new Set(targets.filter((t: NoticeTarget) => t.target_type === "role").map((t: NoticeTarget) => t.target_role as Role)))
      } else if (targets.some((t: NoticeTarget) => t.target_type === "user")) {
        setTargetType("user")
        setSelectedUsers(new Set(targets.filter((t: NoticeTarget) => t.target_type === "user").map((t: NoticeTarget) => Number(t.target_user))))
      }
    })()
  }, [isEdit, noticeId])

  function buildTargets(): NoticeTarget[] {
    if (targetType === "all") return [{ target_type: "all" }]
    if (targetType === "role") return Array.from(selectedRoles).map(r => ({ target_type: "role", target_role: r }))
    if (targetType === "user") return Array.from(selectedUsers).map(u => ({ target_type: "user", target_user: u }))
    return [{ target_type: "all" }]
  }

  async function onSubmit() {
    setError(null)
    if (!title.trim()) { setError("タイトルを入力してください"); return }
    if (!body.trim())  { setError("本文を入力してください"); return }
    if (targetType === "role" && selectedRoles.size === 0) { setError("ロールを1つ以上選択してください"); return }
    if (targetType === "user" && selectedUsers.size === 0) { setError("送信先ユーザーを1人以上選択してください"); return }

    const payload = {
      ...(isEdit ? { id: noticeId } : {}),
      title: title.trim(),
      body: body.trim(),
      sender_name: senderName.trim() || "管理者",
      is_pinned: isPinned,
      published_at: publishedAt,
      expires_at: expiresAt || null,
      targets: buildTargets(),
    }

    setSaving(true)
    const endpoint = isEdit ? "/admin_notices_update.php" : "/admin_notices_create.php"
    const r = await apiFetch<{}>(endpoint, { method: "POST", body: JSON.stringify(payload) })
    setSaving(false)

    if (!r.ok) { setError(toUserMessage(r as ApiNg, "保存に失敗しました")); return }
    setSaved(true)
    setTimeout(() => router.push("/admin/settings/notices/"), 900)
  }

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh", gap: 8, color: C.muted, fontSize: 14, fontFamily: "'Noto Sans JP',sans-serif" }}>
      <style>{G}</style>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C.brand} strokeWidth="2" style={{ animation: "spin .8s linear infinite" }}><path d="M21 12a9 9 0 11-6.22-8.56"/></svg>
      読み込み中…
    </div>
  )

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "'Noto Sans JP', sans-serif" }}>
      <style>{G}</style>

      {/* 戻るヘッダー */}
      <header className="back-header">
        <Link href="/admin/settings/notices/" className="back-btn">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
          </svg>
        </Link>
        <div>
          <p className="back-title">{isEdit ? "お知らせを編集" : "お知らせを作成"}</p>
          <p className="back-sub">App Settings / Notices</p>
        </div>
      </header>

      <div className="page-body">

        {/* ── 基本情報カード ── */}
        <div className="form-card">

          {/* タイトル */}
          <div className="form-field">
            <label className="form-label">タイトル<span className="form-req">*</span></label>
            <input className="form-input" value={title} onChange={e => setTitle(e.target.value)} placeholder="例: 3月のミーティングについて" />
          </div>

          {/* 本文 */}
          <div className="form-field">
            <label className="form-label">本文<span className="form-req">*</span></label>
            <textarea className="form-textarea" value={body} onChange={e => setBody(e.target.value)} placeholder="お知らせの内容を入力してください" rows={5} />
          </div>

          {/* 送信者名 */}
          <div className="form-field">
            <label className="form-label">送信者名</label>
            <input className="form-input" value={senderName} onChange={e => setSenderName(e.target.value)} placeholder="例: 管理者、教室長" style={{ maxWidth: 220 }} />
            <p className="form-hint">ホームの「お知らせ」に表示される送信元名です。</p>
          </div>

          {/* 公開日・終了日 */}
          <div className="form-field">
            <label className="form-label">公開期間</label>
            <div className="date-row">
              <div>
                <p style={{ fontSize: 11, color: C.muted, marginBottom: 6 }}>公開日<span style={{ color: C.danger }}>*</span></p>
                <input type="date" className="form-input" value={publishedAt} onChange={e => setPublishedAt(e.target.value)} />
              </div>
              <div>
                <p style={{ fontSize: 11, color: C.muted, marginBottom: 6 }}>終了日（任意）</p>
                <input type="date" className="form-input" value={expiresAt} onChange={e => setExpiresAt(e.target.value)} min={publishedAt} />
              </div>
            </div>
            <p className="form-hint">終了日を設定しない場合は無期限で表示されます。</p>
          </div>

          {/* ピン留め */}
          <div className="form-field">
            <div className="toggle-row">
              <div>
                <p className="toggle-label">📌 ピン留め</p>
                <p className="toggle-sub">一覧の先頭に固定して強調表示します</p>
              </div>
              <label className="toggle-wrap">
                <input type="checkbox" className="toggle-input" checked={isPinned} onChange={e => setIsPinned(e.target.checked)} />
                <span className="toggle-track" />
              </label>
            </div>
          </div>
        </div>

        {/* ── 送信対象カード ── */}
        <div className="form-card">
          <div className="form-field">
            <label className="form-label">送信対象<span className="form-req">*</span></label>

            {/* タイプ選択 */}
            <div className="target-type-row">
              {([
                { value: "all",  icon: "🌐", label: "全員" },
                { value: "role", icon: "🏷️", label: "ロール別" },
                { value: "user", icon: "👤", label: "個人指定" },
              ] as { value: TargetType; icon: string; label: string }[]).map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  className={`target-type-btn${targetType === opt.value ? " active" : ""}`}
                  onClick={() => setTargetType(opt.value)}
                >
                  <div className="target-type-icon">{opt.icon}</div>
                  <div className="target-type-label">{opt.label}</div>
                </button>
              ))}
            </div>

            {/* ロール選択 */}
            {targetType === "role" && (
              <div className="role-check-grid">
                {ROLE_OPTIONS.map(r => (
                  <label
                    key={r.value}
                    className={`role-check-item${selectedRoles.has(r.value) ? " checked" : ""}`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedRoles.has(r.value)}
                      onChange={e => {
                        setSelectedRoles(prev => {
                          const next = new Set(prev)
                          e.target.checked ? next.add(r.value) : next.delete(r.value)
                          return next
                        })
                      }}
                    />
                    <span style={{ fontSize: 16 }}>{r.icon}</span>
                    <span className="role-check-label">{r.label}</span>
                  </label>
                ))}
              </div>
            )}

            {/* ユーザー選択 */}
            {targetType === "user" && (
              <div className="user-check-list">
                {users.length === 0 ? (
                  <p style={{ fontSize: 13, color: C.muted }}>ユーザーを読み込み中…</p>
                ) : users.map(u => (
                  <label
                    key={u.id}
                    className={`user-check-item${selectedUsers.has(u.id) ? " checked" : ""}`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedUsers.has(u.id)}
                      onChange={e => {
                        setSelectedUsers(prev => {
                          const next = new Set(prev)
                          e.target.checked ? next.add(u.id) : next.delete(u.id)
                          return next
                        })
                      }}
                    />
                    <span className="user-check-name">{u.username}</span>
                    <span className="user-check-role">{u.role === "admin" ? "管理者" : u.role === "leader" ? "リーダー" : "スタッフ"}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── 保存ボタン ── */}
        <button className="submit-btn" onClick={onSubmit} disabled={saving || saved}>
          {saving ? (
            <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" style={{ animation: "spin .8s linear infinite" }}><path d="M21 12a9 9 0 11-6.22-8.56"/></svg>保存中…</>
          ) : saved ? (
            <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>保存しました</>
          ) : (
            isEdit ? "更新する" : "作成する"
          )}
        </button>

        {/* エラー・成功メッセージ */}
        {error && (
          <div className="error-box">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ flexShrink: 0, marginTop: 1 }}>
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            {error}
          </div>
        )}
        {saved && (
          <div className="success-box">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.done} strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
            {isEdit ? "更新しました" : "作成しました"}。一覧に戻ります…
          </div>
        )}
      </div>
    </div>
  )
}

/* ── 新規作成ページ（/admin/settings/notices/new/） ── */
export function NewNoticePage() {
  return <Guard requireAdmin><NoticeFormInner /></Guard>
}

/* ── 編集ページ（/admin/settings/notices/edit/?id=123） ── */
function EditNoticeInner() {
  const sp = useSearchParams()
  const id = Number(sp.get("id") ?? 0)
  return <NoticeFormInner noticeId={id || undefined} />
}

export function EditNoticePage() {
  return (
    <Guard requireAdmin>
      <Suspense fallback={<div style={{ padding: 32, textAlign: "center", color: "#89adb8" }}>読み込み中…</div>}>
        <EditNoticeInner />
      </Suspense>
    </Guard>
  )
}

export default NewNoticePage
