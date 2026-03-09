"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { Guard } from "@/components/Guard"
import type { ApiNg } from "@/lib/api"
import { toUserMessage } from "@/lib/errors"
import { board, listMainCategories, type MainCategory, type TaskCard as T } from "@/lib/tasks"

const C = {
  bg:       "#f0f5f7",
  surface:  "#ffffff",
  brand:    "#006284",
  brandMid: "#004d66",
  brandPale:"#e0f0f5",
  text:     "#0d1f26",
  sub:      "#4a7a8a",
  muted:    "#8aacb5",
  line:     "#d4e8ee",
  danger:   "#c0392b",
  dangerBg: "#fdf2f2",
  dangerLine:"#e8b4b4",
} as const

const FH = `'Outfit', 'Noto Sans JP', sans-serif`
const FB = `'Noto Sans JP', 'Outfit', sans-serif`

function today() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`
}
const isOverdue = (due: string | null) => !!due && due < today()
function fmtDue(due: string | null) {
  if (!due) return null
  const d = new Date(due + "T00:00:00")
  return `${d.getMonth()+1}/${d.getDate()}`
}

function TaskCard({ task }: { task: T }) {
  const [hover, setHover] = useState(false)
  const overdue = isOverdue(task.due_date)
  const due = fmtDue(task.due_date)

  return (
    <Link href={`/task/?id=${task.id}`} style={{ textDecoration: "none", color: "inherit" }}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
      <article style={{
        background: C.surface,
        borderRadius: 10,
        border: `1px solid ${overdue ? C.dangerLine : hover ? C.brand : C.line}`,
        borderTop: `2.5px solid ${overdue ? C.danger : hover ? C.brand : C.line}`,
        padding: "18px 20px 16px",
        display: "flex",
        flexDirection: "column",
        gap: 12,
        cursor: "pointer",
        transition: "border-color 0.15s, box-shadow 0.15s, transform 0.12s",
        boxShadow: hover ? "0 6px 20px rgba(0,98,132,0.12)" : "0 1px 4px rgba(0,98,132,0.06)",
        transform: hover ? "translateY(-1px)" : "none",
      }}>
        {/* カテゴリ */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: C.brand, flexShrink: 0 }} />
          <span style={{ fontSize: 11, fontWeight: 700, color: C.brand, letterSpacing: "0.07em", textTransform: "uppercase", fontFamily: FH }}>
            {task.main_category_name}
          </span>
        </div>

        {/* タイトル */}
        <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: C.text, lineHeight: 1.5, fontFamily: FB }}>
          {task.title}
        </p>

        {/* フッター */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 10, borderTop: `1px solid ${C.line}` }}>
          {/* 登録者 */}
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <div style={{ width: 22, height: 22, borderRadius: "50%", background: C.brandPale, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800, color: C.brand, flexShrink: 0 }}>
              {(task.created_by_name ?? "?")[0]}
            </div>
            <span style={{ fontSize: 12, color: C.sub, fontFamily: FB }}>{task.created_by_name}</span>
          </div>

          {/* 期日 */}
          {due && (
            <span style={{
              fontSize: 12, fontWeight: 700, fontFamily: FH,
              color: overdue ? C.danger : C.sub,
              background: overdue ? C.dangerBg : C.brandPale,
              border: `1px solid ${overdue ? C.dangerLine : C.line}`,
              padding: "2px 9px", borderRadius: 5,
            }}>
              {overdue && "! "}{due}
            </span>
          )}
        </div>
      </article>
    </Link>
  )
}

function BoardInner() {
  const [tab, setTab] = useState<"todo" | "doing">("todo")
  const [todo, setTodo] = useState<T[]>([])
  const [doing, setDoing] = useState<T[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [q, setQ] = useState("")
  const [mainCats, setMainCats] = useState<MainCategory[]>([])
  const [mainId, setMainId] = useState<number>(0)
  const [creator, setCreator] = useState("")
  const [onlyOverdue, setOnlyOverdue] = useState(false)

  async function load() {
    setError(null); setLoading(true)
    const r = await board(); setLoading(false)
    if (!r.ok) { setError(toUserMessage(r as ApiNg, "取得に失敗しました")); return }
    setTodo(r.todo); setDoing(r.doing)
  }

  useEffect(() => {
    load()
    ;(async () => {
      const r = await listMainCategories()
      if (r.ok) setMainCats(r.main_categories.filter(c => Number(c.is_active) === 1))
    })()
  }, [])

  const list = useMemo(() => {
    const src = tab === "todo" ? todo : doing
    const kw = q.trim().toLowerCase()
    const ck = creator.trim().toLowerCase()
    return src.filter(t => {
      if (mainId && Number(t.main_category_id) !== mainId) return false
      if (onlyOverdue && !isOverdue(t.due_date)) return false
      if (ck && !t.created_by_name.toLowerCase().includes(ck)) return false
      if (kw) { if (!`${t.title} ${t.main_category_name} ${t.created_by_name}`.toLowerCase().includes(kw)) return false }
      return true
    })
  }, [tab, todo, doing, q, mainId, creator, onlyOverdue])

  const overdueCount = list.filter(t => isOverdue(t.due_date)).length

  /* 共通 input スタイル */
  const inp: React.CSSProperties = {
    height: 36, padding: "0 12px",
    background: C.surface,
    border: `1px solid ${C.line}`,
    borderRadius: 7,
    color: C.text, fontSize: 13, fontFamily: FB,
    outline: "none",
  }

  return (
    <div style={{ minHeight: "100vh", background: C.bg, padding: "32px 28px 80px" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@500;600;700;800&family=Noto+Sans+JP:wght@400;500;700&display=swap');
        * { box-sizing: border-box; }
        ::placeholder { color: ${C.muted}; }
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes up { from { opacity:0; transform:translateY(8px) } to { opacity:1; transform:none } }
        .up { animation: up .25s ease both }
        select option { background: ${C.surface}; color: ${C.text} }
      `}</style>

      <div style={{ maxWidth: 920, margin: "0 auto" }}>

        {/* ═══ ページヘッダー ═══ */}
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 36, gap: 16, flexWrap: "wrap" }}>
          <div>
            {/* ロゴライン */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: C.brand, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5">
                  <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
                  <rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
                </svg>
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, color: C.brand, letterSpacing: "0.14em", textTransform: "uppercase", fontFamily: FH }}>Task Board</span>
            </div>
            <h1 style={{ margin: 0, fontSize: 30, fontWeight: 800, color: C.text, letterSpacing: "-0.02em", lineHeight: 1, fontFamily: FH }}>
              タスク管理
            </h1>
            {/* カウンター */}
            <div style={{ marginTop: 10, display: "flex", gap: 0 }}>
              {[
                { label: "未着手", val: todo.length, active: tab === "todo" },
                { label: "進行中", val: doing.length, active: tab === "doing" },
                ...(overdueCount > 0 ? [{ label: "期限超過", val: overdueCount, danger: true, active: false }] : []),
              ].map((s, i, a) => (
                <div key={s.label} style={{
                  padding: "6px 16px",
                  borderTop: `2px solid ${"danger" in s && s.danger ? C.danger : s.active ? C.brand : "transparent"}`,
                  borderRight: i < a.length - 1 ? `1px solid ${C.line}` : "none",
                }}>
                  <div style={{ fontSize: 18, fontWeight: 800, color: "danger" in s && s.danger ? C.danger : s.active ? C.brand : C.sub, fontFamily: FH, lineHeight: 1 }}>{s.val}</div>
                  <div style={{ fontSize: 11, color: C.muted, marginTop: 2, fontFamily: FB }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* アクションボタン */}
          <div style={{ display: "flex", gap: 8 }}>
            <Link href="/tasks/done/" style={{ height: 38, display: "inline-flex", alignItems: "center", gap: 6, padding: "0 16px", borderRadius: 8, border: `1px solid ${C.line}`, background: C.surface, color: C.sub, fontSize: 13, fontWeight: 600, textDecoration: "none", fontFamily: FB, whiteSpace: "nowrap" }}>
              完了一覧
            </Link>
            <Link href="/tasks/new/" style={{ height: 38, display: "inline-flex", alignItems: "center", gap: 7, padding: "0 18px", borderRadius: 8, background: C.brand, color: "#fff", fontSize: 13, fontWeight: 700, textDecoration: "none", fontFamily: FH, whiteSpace: "nowrap", boxShadow: "0 2px 12px rgba(0,98,132,0.25)" }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              新規タスク
            </Link>
          </div>
        </header>

        {/* ═══ タブ + 更新 ═══ */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div style={{ display: "flex", borderBottom: `2px solid ${C.line}`, gap: 0 }}>
            {([["todo","未着手"], ["doing","進行中"]] as const).map(([key, label]) => (
              <button key={key} onClick={() => setTab(key)} style={{
                padding: "10px 22px",
                border: "none", borderBottom: `2px solid ${tab === key ? C.brand : "transparent"}`,
                marginBottom: -2,
                background: "transparent",
                color: tab === key ? C.brand : C.muted,
                fontSize: 13, fontWeight: tab === key ? 700 : 500,
                cursor: "pointer", fontFamily: FB,
                transition: "color 0.15s, border-color 0.15s",
              }}>
                {label}
                <span style={{ marginLeft: 8, padding: "1px 8px", borderRadius: 999, background: tab === key ? C.brandPale : C.bg, color: tab === key ? C.brand : C.muted, fontSize: 11, fontWeight: 700, fontFamily: FH }}>
                  {key === "todo" ? todo.length : doing.length}
                </span>
              </button>
            ))}
          </div>

          <button onClick={load} disabled={loading} style={{ ...inp, display: "flex", alignItems: "center", gap: 6, cursor: loading ? "default" : "pointer", opacity: loading ? 0.5 : 1, paddingLeft: 12, paddingRight: 14 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={C.brand} strokeWidth="2.5"
              style={{ animation: loading ? "spin 0.8s linear infinite" : "none" }}>
              <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/>
            </svg>
            <span style={{ color: C.sub }}>更新</span>
          </button>
        </div>

        {/* ═══ フィルターバー ═══ */}
        <div style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: 10, padding: "12px 16px", marginBottom: 24, display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
          {/* 検索 */}
          <div style={{ flex: "2 1 200px", position: "relative" }}>
            <svg style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="タイトル / カテゴリ / 登録者"
              style={{ ...inp, width: "100%", paddingLeft: 32 }} />
          </div>
          <input value={creator} onChange={e => setCreator(e.target.value)} placeholder="登録者"
            style={{ ...inp, flex: "1 1 130px" }} />
          <select value={mainId} onChange={e => setMainId(Number(e.target.value))}
            style={{ ...inp, flex: "1 1 150px", cursor: "pointer", color: mainId ? C.text : C.muted }}>
            <option value={0}>カテゴリ：全て</option>
            {mainCats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>

          {/* 期限超過トグル */}
          <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", userSelect: "none", fontSize: 13, fontFamily: FB, color: onlyOverdue ? C.danger : C.sub, fontWeight: onlyOverdue ? 700 : 400 }}>
            <button type="button" onClick={() => setOnlyOverdue(v => !v)} style={{
              position: "relative", width: 34, height: 18, borderRadius: 999, border: "none", padding: 0,
              background: onlyOverdue ? "#f5c6c6" : C.line, cursor: "pointer", transition: "background 0.2s", flexShrink: 0,
            }}>
              <span style={{ position: "absolute", top: 2, left: onlyOverdue ? 16 : 2, width: 14, height: 14, borderRadius: "50%", background: onlyOverdue ? C.danger : C.muted, transition: "left 0.2s, background 0.2s", display: "block" }} />
            </button>
            期限超過のみ
          </label>
        </div>

        {/* ═══ エラー ═══ */}
        {error && (
          <div style={{ background: C.dangerBg, border: `1px solid ${C.dangerLine}`, borderRadius: 8, padding: "11px 16px", color: C.danger, fontSize: 13, marginBottom: 16, fontFamily: FB }}>
            {error}
          </div>
        )}

        {/* ═══ カードグリッド ═══ */}
        {loading && list.length === 0 ? (
          <div style={{ padding: "80px 0", textAlign: "center", color: C.muted, fontSize: 14, fontFamily: FB }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={C.brand} strokeWidth="2" style={{ animation: "spin 0.8s linear infinite", display: "block", margin: "0 auto 12px" }}><path d="M21 12a9 9 0 11-6.22-8.56"/></svg>
            読み込み中...
          </div>
        ) : list.length === 0 ? (
          <div style={{ padding: "80px 0", textAlign: "center", color: C.muted, fontFamily: FB }}>
            <div style={{ fontSize: 36, marginBottom: 14, opacity: 0.3, color: C.brand }}>—</div>
            <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: C.sub }}>該当タスクがありません</p>
            <p style={{ margin: "6px 0 0", fontSize: 13 }}>条件を変えてみてください</p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(290px, 1fr))", gap: 12 }}>
            {list.map((t, i) => (
              <div key={t.id} className="up" style={{ animationDelay: `${Math.min(i * 30, 240)}ms` }}>
                <TaskCard task={t} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default function TasksPage() { return <Guard><BoardInner /></Guard> }
