"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { Guard } from "@/components/Guard"
import type { ApiNg } from "@/lib/api"
import { toUserMessage } from "@/lib/errors"
import { board, listMainCategories, type MainCategory, type TaskCard as T } from "@/lib/tasks"

const C = {
  bg:         "#f0f5f7",
  surface:    "#ffffff",
  brand:      "#006284",
  brandMid:   "#004d66",
  brandPale:  "#e0f0f5",
  text:       "#0d1f26",
  sub:        "#4a7a8a",
  muted:      "#8aacb5",
  line:       "#d4e8ee",
  danger:     "#c0392b",
  dangerBg:   "#fdf2f2",
  dangerLine: "#e8b4b4",
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
    <Link
      href={`/task/?id=${task.id}`}
      style={{ textDecoration: "none", color: "inherit", display: "block" }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <article style={{
        background: C.surface,
        borderRadius: 16,
        border: `1px solid ${overdue ? C.dangerLine : hover ? C.brand : C.line}`,
        borderLeft: `4px solid ${overdue ? C.danger : hover ? C.brand : C.brandPale}`,
        padding: "16px 16px 14px",
        display: "flex",
        flexDirection: "column",
        gap: 10,
        cursor: "pointer",
        transition: "border-color 0.18s, box-shadow 0.18s",
        boxShadow: hover
          ? `0 6px 24px rgba(0,98,132,0.12)`
          : `0 1px 3px rgba(0,98,132,0.06)`,
        WebkitTapHighlightColor: "transparent",
      }}>

        {/* カテゴリ + 期日 */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
          <span style={{
            fontSize: 10, fontWeight: 700, color: C.brand,
            letterSpacing: "0.08em", textTransform: "uppercase",
            fontFamily: FH, lineHeight: 1,
          }}>
            {task.main_category_name}
          </span>

          {due && (
            <span style={{
              fontSize: 11, fontWeight: 700, fontFamily: FH,
              color: overdue ? C.danger : C.sub,
              background: overdue ? C.dangerBg : C.brandPale,
              border: `1px solid ${overdue ? C.dangerLine : C.line}`,
              padding: "2px 8px", borderRadius: 99,
              display: "flex", alignItems: "center", gap: 3,
              flexShrink: 0,
            }}>
              {overdue && "⚠ "}{due}
            </span>
          )}
        </div>

        {/* タイトル */}
        <p style={{
          margin: 0, fontSize: 14, fontWeight: 700,
          color: C.text, lineHeight: 1.55, fontFamily: FB,
        }}>
          {task.title}
        </p>

        {/* 登録者 */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{
            width: 20, height: 20, borderRadius: "50%",
            background: `linear-gradient(135deg, ${C.brand}, ${C.brandMid})`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 9, fontWeight: 800, color: "#fff", flexShrink: 0,
          }}>
            {(task.created_by_name ?? "?")[0]}
          </div>
          <span style={{ fontSize: 11.5, color: C.muted, fontFamily: FB }}>
            {task.created_by_name}
          </span>
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
  const [filterOpen, setFilterOpen] = useState(false)

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

  const overdueCount = (tab === "todo" ? todo : doing).filter(t => isOverdue(t.due_date)).length
  const hasFilter = !!q || !!creator || !!mainId || onlyOverdue

  const inp: React.CSSProperties = {
    height: 44, padding: "0 14px",
    background: C.bg,
    border: `1.5px solid ${C.line}`,
    borderRadius: 10,
    color: C.text, fontSize: 14, fontFamily: FB,
    outline: "none", width: "100%",
    transition: "border-color 0.15s, box-shadow 0.15s",
  }

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: FB }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@500;600;700;800&family=Noto+Sans+JP:wght@400;500;700&display=swap');
        * { box-sizing: border-box; }
        ::placeholder { color: ${C.muted}; }
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes up { from { opacity:0; transform:translateY(8px) } to { opacity:1; transform:none } }
        @keyframes slideDown { from { opacity:0; transform:translateY(-6px) } to { opacity:1; transform:none } }
        .up { animation: up .24s cubic-bezier(.22,1,.36,1) both }
        select option { background: #fff; color: ${C.text} }
        input:focus, select:focus {
          border-color: ${C.brand} !important;
          box-shadow: 0 0 0 3px rgba(0,98,132,0.1) !important;
        }
        .bottom-nav {
          position: fixed; bottom: 0; left: 0; right: 0; z-index: 100;
          background: ${C.surface};
          border-top: 1px solid ${C.line};
          display: flex; align-items: stretch;
          padding-bottom: env(safe-area-inset-bottom);
          box-shadow: 0 -4px 20px rgba(0,98,132,0.08);
        }
        .nav-btn {
          flex: 1; display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          gap: 3px; padding: 10px 8px;
          background: none; border: none; cursor: pointer;
          color: ${C.muted}; font-size: 10px; font-family: ${FB};
          -webkit-tap-highlight-color: transparent;
          transition: color 0.15s;
          text-decoration: none;
        }
        .nav-btn-new {
          flex: 1.4; margin: 8px 12px;
          display: flex; align-items: center; justify-content: center; gap: 6px;
          background: linear-gradient(135deg, ${C.brand}, ${C.brandMid});
          border: none; border-radius: 14px; cursor: pointer;
          color: #fff; font-size: 13px; font-weight: 700; font-family: ${FH};
          box-shadow: 0 4px 16px rgba(0,98,132,0.35);
          -webkit-tap-highlight-color: transparent;
          text-decoration: none;
        }
      `}</style>

      {/* ── スティッキートップバー ── */}
      <div style={{
        position: "sticky", top: 0, zIndex: 50,
        background: C.surface,
        borderBottom: `1px solid ${C.line}`,
        boxShadow: "0 2px 12px rgba(0,98,132,0.06)",
      }}>
        {/* タブ行 */}
        <div style={{ display: "flex", alignItems: "center", padding: "0 4px" }}>
          {([["todo","未着手"] as const, ["doing","進行中"] as const]).map(([key, label]) => {
            const count = key === "todo" ? todo.length : doing.length
            const active = tab === key
            return (
              <button key={key} onClick={() => setTab(key)} style={{
                flex: 1, padding: "14px 8px 12px",
                border: "none", borderBottom: `2.5px solid ${active ? C.brand : "transparent"}`,
                background: "transparent",
                color: active ? C.brand : C.muted,
                fontSize: 13, fontWeight: active ? 700 : 500,
                cursor: "pointer", fontFamily: FB,
                transition: "color 0.15s, border-color 0.15s",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
              }}>
                {label}
                <span style={{
                  fontSize: 11, fontWeight: 700, fontFamily: FH,
                  padding: "1px 7px", borderRadius: 99,
                  background: active ? C.brandPale : C.bg,
                  color: active ? C.brand : C.muted,
                }}>
                  {count}
                </span>
                {active && overdueCount > 0 && (
                  <span style={{
                    fontSize: 10, fontWeight: 700,
                    padding: "1px 6px", borderRadius: 99,
                    background: C.dangerBg, color: C.danger,
                    border: `1px solid ${C.dangerLine}`,
                  }}>
                    !{overdueCount}
                  </span>
                )}
              </button>
            )
          })}

          {/* アイコンボタン群 */}
          <div style={{ display: "flex", gap: 2, padding: "0 8px" }}>
            <button onClick={load} disabled={loading} style={{
              width: 38, height: 38, borderRadius: 10,
              border: "none", background: "transparent",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: loading ? "default" : "pointer",
              opacity: loading ? 0.4 : 1,
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.brand} strokeWidth="2.5"
                style={{ animation: loading ? "spin 0.8s linear infinite" : "none" }}>
                <polyline points="23 4 23 10 17 10"/>
                <path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/>
              </svg>
            </button>

            <button onClick={() => setFilterOpen(v => !v)} style={{
              width: 38, height: 38, borderRadius: 10,
              border: "none",
              background: filterOpen || hasFilter ? C.brandPale : "transparent",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", position: "relative",
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                stroke={filterOpen || hasFilter ? C.brand : C.muted} strokeWidth="2.2">
                <line x1="4" y1="6" x2="20" y2="6"/>
                <line x1="8" y1="12" x2="16" y2="12"/>
                <line x1="11" y1="18" x2="13" y2="18"/>
              </svg>
              {hasFilter && (
                <span style={{
                  position: "absolute", top: 6, right: 6,
                  width: 7, height: 7, borderRadius: "50%",
                  background: C.brand, border: `1.5px solid ${C.surface}`,
                }} />
              )}
            </button>
          </div>
        </div>

        {/* フィルターパネル（アコーディオン） */}
        {filterOpen && (
          <div style={{
            padding: "12px 16px 16px",
            borderTop: `1px solid ${C.line}`,
            display: "flex", flexDirection: "column", gap: 10,
            animation: "slideDown 0.2s ease both",
            background: C.surface,
          }}>
            <div style={{ position: "relative" }}>
              <svg style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}
                width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="2.5">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input value={q} onChange={e => setQ(e.target.value)}
                placeholder="タイトル・カテゴリ・登録者で検索"
                style={{ ...inp, paddingLeft: 38 }} />
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <input value={creator} onChange={e => setCreator(e.target.value)}
                placeholder="登録者"
                style={{ ...inp, flex: 1 }} />
              <select value={mainId} onChange={e => setMainId(Number(e.target.value))}
                style={{ ...inp, flex: 1.2, cursor: "pointer", color: mainId ? C.text : C.muted }}>
                <option value={0}>カテゴリ：全て</option>
                {mainCats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            <label style={{
              display: "flex", alignItems: "center", gap: 10,
              cursor: "pointer", userSelect: "none",
              fontSize: 13, fontFamily: FB,
              color: onlyOverdue ? C.danger : C.sub,
              fontWeight: onlyOverdue ? 700 : 400,
            }}>
              <button type="button" onClick={() => setOnlyOverdue(v => !v)} style={{
                position: "relative", width: 40, height: 22, borderRadius: 999,
                border: "none", padding: 0,
                background: onlyOverdue ? "#f5c6c6" : C.line,
                cursor: "pointer", transition: "background 0.2s", flexShrink: 0,
              }}>
                <span style={{
                  position: "absolute", top: 3, left: onlyOverdue ? 19 : 3,
                  width: 16, height: 16, borderRadius: "50%",
                  background: onlyOverdue ? C.danger : "#fff",
                  boxShadow: "0 1px 4px rgba(0,0,0,0.15)",
                  transition: "left 0.2s, background 0.2s", display: "block",
                }} />
              </button>
              期限超過のみ表示
            </label>
          </div>
        )}
      </div>

      {/* ── コンテンツエリア ── */}
      <div style={{ padding: "16px 14px 100px" }}>

        {error && (
          <div style={{
            background: C.dangerBg, border: `1px solid ${C.dangerLine}`,
            borderRadius: 10, padding: "12px 14px",
            color: C.danger, fontSize: 13, marginBottom: 14,
            fontFamily: FB, display: "flex", alignItems: "center", gap: 8,
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.danger} strokeWidth="2.2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            {error}
          </div>
        )}

        {loading && list.length === 0 ? (
          <div style={{ padding: "80px 0", textAlign: "center", color: C.muted, fontSize: 14 }}>
            <div style={{
              width: 40, height: 40, borderRadius: "50%",
              border: `3px solid ${C.brandPale}`, borderTopColor: C.brand,
              animation: "spin 0.8s linear infinite", margin: "0 auto 14px",
            }} />
            読み込み中...
          </div>
        ) : list.length === 0 ? (
          <div style={{ padding: "80px 0", textAlign: "center" }}>
            <div style={{
              width: 56, height: 56, borderRadius: 18, background: C.brandPale,
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 16px",
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={C.brand} strokeWidth="1.8">
                <rect x="3" y="3" width="7" height="7" rx="1"/>
                <rect x="14" y="3" width="7" height="7" rx="1"/>
                <rect x="3" y="14" width="7" height="7" rx="1"/>
                <rect x="14" y="14" width="7" height="7" rx="1"/>
              </svg>
            </div>
            <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: C.sub }}>該当タスクがありません</p>
            <p style={{ margin: "6px 0 0", fontSize: 12, color: C.muted }}>条件を変えてみてください</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {list.map((t, i) => (
              <div key={t.id} className="up" style={{ animationDelay: `${Math.min(i * 25, 200)}ms` }}>
                <TaskCard task={t} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── ボトムナビゲーション ── */}
      <nav className="bottom-nav">
        <Link href="/tasks/done/" className="nav-btn">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
          完了一覧
        </Link>

        <Link href="/tasks/new/" className="nav-btn-new">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          新規タスク
        </Link>

        <button className="nav-btn" onClick={load} disabled={loading} style={{ opacity: loading ? 0.4 : 1 }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            style={{ animation: loading ? "spin 0.8s linear infinite" : "none" }}>
            <polyline points="23 4 23 10 17 10"/>
            <path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/>
          </svg>
          更新
        </button>
      </nav>
    </div>
  )
}

export default function TasksPage() { return <Guard><BoardInner /></Guard> }
