"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { Guard } from "@/components/Guard"
import { me, type User } from "@/lib/auth"
import type { ApiNg } from "@/lib/api"
import { toUserMessage } from "@/lib/errors"
import { doneList, deleteTask, listMainCategories, type MainCategory, type TaskCard as T } from "@/lib/tasks"

const C = {
  bg:        "#f4f8fa",
  surface:   "#ffffff",
  brand:     "#006284",
  brandPale: "#e0f0f5",
  text:      "#0d1f26",
  sub:       "#4a7a8a",
  muted:     "#8aacb5",
  line:      "#d4e8ee",
  done:      "#1a6640",
  donePale:  "#e6f5ed",
  doneLine:  "#a8d8be",
  danger:    "#c0392b",
  dangerBg:  "#fdf2f2",
  dangerLine:"#e8b4b4",
} as const

const FH = `'Outfit', 'Noto Sans JP', sans-serif`
const FB = `'Noto Sans JP', 'Outfit', sans-serif`

function DoneInner() {
  const [meUser, setMeUser] = useState<User | null>(null)
  const [tasks, setTasks] = useState<T[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [q, setQ] = useState("")
  const [mainCats, setMainCats] = useState<MainCategory[]>([])
  const [mainId, setMainId] = useState<number>(0)
  const [creator, setCreator] = useState("")
  const [deletingId, setDeletingId] = useState<number | null>(null)

  const isAdmin = meUser?.role === "admin"

  async function load() {
    setError(null); setLoading(true)
    const r = await doneList(); setLoading(false)
    if (!r.ok) { setError(toUserMessage(r as ApiNg, "取得に失敗しました")); return }
    setTasks(r.done)
  }

  useEffect(() => {
    ;(async () => {
      const r = await me(); if (r.ok) setMeUser(r.user)
      const c = await listMainCategories(); if (c.ok) setMainCats(c.main_categories.filter(x => Number(x.is_active) === 1))
    })()
    load()
  }, [])

  async function onDelete(id: number) {
    if (!confirm("この完了タスクを削除しますか？")) return
    setDeletingId(id)
    const r = await deleteTask(id); setDeletingId(null)
    if (!r.ok) { setError(toUserMessage(r as ApiNg, "削除に失敗しました")); return }
    load()
  }

  const filtered = useMemo(() => {
    const kw = q.trim().toLowerCase(); const ck = creator.trim().toLowerCase()
    return tasks.filter(t => {
      if (mainId && Number(t.main_category_id) !== mainId) return false
      if (ck && !t.created_by_name.toLowerCase().includes(ck)) return false
      if (kw && !`${t.title} ${t.main_category_name} ${t.created_by_name}`.toLowerCase().includes(kw)) return false
      return true
    })
  }, [tasks, q, mainId, creator])

  const inp: React.CSSProperties = { height: 36, padding: "0 12px", background: C.surface, border: `1px solid ${C.line}`, borderRadius: 7, color: C.text, fontSize: 13, fontFamily: FB, outline: "none" }

  return (
    <div style={{ minHeight: "100vh", background: C.bg, padding: "32px 28px 80px" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@500;600;700;800&family=Noto+Sans+JP:wght@400;500;700&display=swap');
        * { box-sizing: border-box }
        ::placeholder { color: ${C.muted} }
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes up { from { opacity:0; transform:translateY(6px) } to { opacity:1; transform:none } }
        .up { animation: up .22s ease both }
        select option { background: ${C.surface}; color: ${C.text} }
      `}</style>

      <div style={{ maxWidth: 800, margin: "0 auto" }}>

        {/* ── ヘッダー ── */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 32, flexWrap: "wrap", gap: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <Link href="/tasks/" style={{ width: 36, height: 36, borderRadius: "50%", border: `1px solid ${C.line}`, background: C.surface, display: "flex", alignItems: "center", justifyContent: "center", color: C.muted, textDecoration: "none", flexShrink: 0 }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
            </Link>
            <div>
              <p style={{ margin: "0 0 4px", fontSize: 11, fontWeight: 700, color: C.brand, letterSpacing: "0.12em", textTransform: "uppercase", fontFamily: FH }}>Done</p>
              <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, color: C.text, letterSpacing: "-0.02em", fontFamily: FH }}>完了タスク一覧</h1>
              <p style={{ margin: "5px 0 0", fontSize: 12, color: C.muted, fontFamily: FB }}>
                {tasks.length}件
                {!isAdmin && <span style={{ marginLeft: 10 }}>・ 閲覧のみ（削除・再オープンは管理者のみ）</span>}
              </p>
            </div>
          </div>
          <button onClick={load} disabled={loading} style={{ ...inp, display: "flex", alignItems: "center", gap: 6, cursor: loading ? "default" : "pointer", opacity: loading ? 0.5 : 1 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={C.brand} strokeWidth="2.5" style={{ animation: loading ? "spin 0.8s linear infinite" : "none" }}>
              <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/>
            </svg>
            <span style={{ color: C.sub }}>更新</span>
          </button>
        </div>

        {/* ── フィルター ── */}
        <div style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: 10, padding: "12px 16px", marginBottom: 22, display: "flex", flexWrap: "wrap", gap: 8 }}>
          <div style={{ position: "relative", flex: "2 1 200px" }}>
            <svg style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="タイトル / カテゴリ / 登録者" style={{ ...inp, width: "100%", paddingLeft: 32 }} />
          </div>
          <input value={creator} onChange={e => setCreator(e.target.value)} placeholder="登録者" style={{ ...inp, flex: "1 1 130px" }} />
          <select value={mainId} onChange={e => setMainId(Number(e.target.value))} style={{ ...inp, flex: "1 1 150px", cursor: "pointer", color: mainId ? C.text : C.muted }}>
            <option value={0}>カテゴリ：全て</option>
            {mainCats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        {/* エラー */}
        {error && <div style={{ background: C.dangerBg, border: `1px solid ${C.dangerLine}`, borderRadius: 8, padding: "11px 16px", color: C.danger, fontSize: 13, marginBottom: 16, fontFamily: FB }}>{error}</div>}

        {/* ── リスト ── */}
        {filtered.length === 0 && !loading ? (
          <div style={{ padding: "80px 0", textAlign: "center", color: C.muted, fontFamily: FB }}>
            <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: C.sub }}>該当タスクがありません</p>
          </div>
        ) : (
          <div style={{ display: "grid", gap: 8 }}>
            {filtered.map((t, i) => (
              <div key={t.id} className="up" style={{ animationDelay: `${Math.min(i * 25, 200)}ms` }}>
                <div style={{
                  background: C.surface,
                  border: `1px solid ${C.line}`,
                  borderLeft: `3px solid ${C.done}`,
                  borderRadius: "0 10px 10px 0",
                  padding: "14px 18px",
                  display: "flex", alignItems: "center", gap: 14,
                }}>
                  {/* チェックアイコン */}
                  <div style={{ width: 30, height: 30, borderRadius: "50%", background: C.donePale, border: `1px solid ${C.doneLine}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={C.done} strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                  </div>

                  {/* 内容 */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                      <div style={{ width: 5, height: 5, borderRadius: "50%", background: C.brand, flexShrink: 0 }} />
                      <span style={{ fontSize: 11, fontWeight: 700, color: C.brand, textTransform: "uppercase", letterSpacing: "0.07em", fontFamily: FH }}>{t.main_category_name}</span>
                    </div>
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: C.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", fontFamily: FB }}>{t.title}</p>
                    <div style={{ marginTop: 4, fontSize: 12, color: C.muted, display: "flex", gap: 12, fontFamily: FB }}>
                      <span>期限 {t.due_date ?? "なし"}</span>
                      <span>{t.created_by_name}</span>
                    </div>
                  </div>

                  {/* アクション */}
                  <div style={{ display: "flex", gap: 7, flexShrink: 0 }}>
                    <Link href={`/task/?id=${t.id}`} style={{ height: 32, display: "inline-flex", alignItems: "center", padding: "0 13px", borderRadius: 6, border: `1px solid ${C.line}`, background: C.bg, color: C.sub, fontSize: 12, fontWeight: 600, textDecoration: "none", fontFamily: FB, whiteSpace: "nowrap" }}>
                      詳細
                    </Link>
                    {isAdmin && (
                      <button onClick={() => onDelete(t.id)} disabled={deletingId === t.id}
                        style={{ height: 32, padding: "0 13px", borderRadius: 6, border: `1px solid ${C.dangerLine}`, background: "transparent", color: C.danger, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: FB, opacity: deletingId === t.id ? 0.5 : 1 }}>
                        削除
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default function DonePage() { return <Guard><DoneInner /></Guard> }
