"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { Guard } from "@/components/Guard"
import type { ApiNg } from "@/lib/api"
import { toUserMessage } from "@/lib/errors"
import { board, listMainCategories, type MainCategory, type TaskCard as T } from "@/lib/tasks"

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   共通デザイントークン（全ページ共通）
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
export const C = {
  bg:          "#f0f5f7",
  surface:     "#ffffff",
  surfaceSub:  "#f7fafb",
  /* ヘッダー */
  header:      "#0a1f2e",
  headerMid:   "#0d2840",
  headerSub:   "#1a3a50",
  /* ブランド */
  brand:       "#006284",
  brandLight:  "#0082ad",
  brandMid:    "#004d66",
  brandDeep:   "#003a4d",
  brandPale:   "#e0f0f5",
  brandPaler:  "#f0f8fb",
  /* テキスト */
  text:        "#0d1f26",
  sub:         "#4a7a8a",
  muted:       "#8aacb5",
  /* 罫線 */
  line:        "#daeaf0",
  lineSoft:    "#edf5f8",
  /* 白系 */
  white:       "#ffffff",
  whiteA80:    "rgba(255,255,255,0.80)",
  whiteA50:    "rgba(255,255,255,0.50)",
  whiteA30:    "rgba(255,255,255,0.30)",
  whiteA15:    "rgba(255,255,255,0.15)",
  whiteA08:    "rgba(255,255,255,0.08)",
  /* 完了 */
  done:        "#1a6640",
  donePale:    "#e6f5ed",
  doneLine:    "#a8d8be",
  /* 危険 */
  danger:      "#e05252",
  dangerDeep:  "#c0392b",
  dangerBg:    "#fff5f5",
  dangerLine:  "#fcc",
  dangerPale:  "rgba(224,82,82,0.08)",
} as const

export const FD = `'Syne', 'Noto Sans JP', sans-serif`
export const FB = `'Noto Sans JP', 'Syne', sans-serif`
export const FM = `'JetBrains Mono', monospace`

/* 全ページ共通のグローバルCSS */
export const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=JetBrains+Mono:wght@500;600&family=Noto+Sans+JP:wght@400;500;600;700&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  -webkit-font-smoothing: antialiased;
  ::placeholder { color: ${C.muted}; font-family: ${FB}; font-size: 13px; }
  select { appearance: none; -webkit-appearance: none; }
  select option { background: #fff; color: ${C.text}; }
  textarea { resize: vertical; }
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes cardIn {
    from { opacity: 0; transform: translateY(12px) scale(0.985); }
    to   { opacity: 1; transform: none; }
  }
  @keyframes fadeSlide {
    from { opacity: 0; transform: translateY(-5px); }
    to   { opacity: 1; transform: none; }
  }
  @keyframes rowIn {
    from { opacity: 0; transform: translateX(-8px); }
    to   { opacity: 1; transform: none; }
  }
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50%       { opacity: 0.55; }
  }
  .card-in  { animation: cardIn  0.32s cubic-bezier(.22,1,.36,1) both; }
  .row-in   { animation: rowIn   0.28s cubic-bezier(.22,1,.36,1) both; }
  .fi:focus { outline: none; border-color: ${C.whiteA80} !important; box-shadow: 0 0 0 3px ${C.whiteA15} !important; }
  .fi-light:focus { outline: none; border-color: ${C.brand} !important; box-shadow: 0 0 0 3px rgba(0,98,132,0.12) !important; }
`

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   共通UIパーツ
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

/** ダークヘッダーバー（戻るボタン付き） */
export function PageHeader({
  backHref, backLabel = "タスク一覧",
  children,
}: {
  backHref: string
  backLabel?: string
  children?: React.ReactNode
}) {
  return (
    <div style={{
      background: C.header,
      backgroundImage: `
        radial-gradient(ellipse at 0% 0%, rgba(0,130,173,0.18) 0%, transparent 55%),
        radial-gradient(ellipse at 100% 100%, rgba(0,98,132,0.12) 0%, transparent 50%)
      `,
      padding: "14px 16px 16px",
      display: "flex", alignItems: "center", gap: 12,
    }}>
      <Link href={backHref} style={{
        width: 36, height: 36, borderRadius: 12, flexShrink: 0,
        border: `1px solid ${C.whiteA30}`,
        background: C.whiteA08,
        display: "flex", alignItems: "center", justifyContent: "center",
        color: C.whiteA80, textDecoration: "none",
        backdropFilter: "blur(6px)",
        WebkitTapHighlightColor: "transparent",
        transition: "background 0.15s",
      }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
          <line x1="19" y1="12" x2="5" y2="12"/>
          <polyline points="12 19 5 12 12 5"/>
        </svg>
      </Link>
      <div style={{ flex: 1 }}>{children}</div>
    </div>
  )
}

/** エラーバー */
export function ErrorBar({ msg }: { msg: string }) {
  return (
    <div style={{
      background: C.dangerBg, border: `1px solid ${C.dangerLine}`,
      borderRadius: 12, padding: "12px 14px", marginBottom: 14,
      color: C.dangerDeep, fontSize: 13, fontFamily: FB,
      display: "flex", alignItems: "center", gap: 8,
    }}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.dangerDeep} strokeWidth="2.2">
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="8" x2="12" y2="12"/>
        <line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
      {msg}
    </div>
  )
}

/** フォームカードセクション */
export function FormSection({ label, children, last = false }: {
  label?: string; children: React.ReactNode; last?: boolean
}) {
  return (
    <div style={{
      padding: "20px 18px",
      borderBottom: last ? "none" : `1px solid ${C.line}`,
    }}>
      {label && (
        <p style={{
          margin: "0 0 10px", fontSize: 10.5, fontWeight: 700,
          color: C.sub, letterSpacing: "0.10em",
          textTransform: "uppercase", fontFamily: FD,
        }}>{label}</p>
      )}
      {children}
    </div>
  )
}

/** 共通インプットスタイル（light版） */
export const inputStyle = (focused: boolean): React.CSSProperties => ({
  width: "100%", padding: "11px 14px",
  borderRadius: 11,
  border: `1.5px solid ${focused ? C.brand : C.line}`,
  boxShadow: focused ? `0 0 0 3px rgba(0,98,132,0.10)` : "none",
  background: C.surfaceSub,
  color: C.text, fontSize: 14, fontFamily: FB,
  outline: "none", transition: "border-color 0.15s, box-shadow 0.15s",
})

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   ユーティリティ
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
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

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   TaskCard
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function TaskCard({ task, index }: { task: T; index: number }) {
  const [pressed, setPressed] = useState(false)
  const overdue = isOverdue(task.due_date)
  const due = fmtDue(task.due_date)

  return (
    <Link
      href={`/task/?id=${task.id}`}
      style={{ textDecoration: "none", color: "inherit", display: "block" }}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      onMouseLeave={() => setPressed(false)}
      onTouchStart={() => setPressed(true)}
      onTouchEnd={() => setPressed(false)}
    >
      <article
        className="card-in"
        style={{
          animationDelay: `${Math.min(index * 40, 320)}ms`,
          background: overdue
            ? `linear-gradient(135deg, #fff8f8 0%, ${C.white} 60%)`
            : C.white,
          borderRadius: 18,
          border: `1px solid ${overdue ? C.dangerLine : C.line}`,
          padding: "16px 18px",
          cursor: "pointer",
          transform: pressed ? "scale(0.975)" : "scale(1)",
          boxShadow: pressed
            ? `0 1px 4px rgba(0,98,132,0.06)`
            : overdue
              ? `0 2px 16px rgba(224,82,82,0.09), 0 1px 3px rgba(224,82,82,0.05)`
              : `0 2px 16px rgba(0,98,132,0.07), 0 1px 3px rgba(0,98,132,0.04)`,
          transition: "transform 0.13s cubic-bezier(.22,1,.36,1), box-shadow 0.18s",
          WebkitTapHighlightColor: "transparent",
          position: "relative", overflow: "hidden",
        }}
      >
        {/* 左端アクセントライン */}
        <div style={{
          position: "absolute", left: 0, top: 0, bottom: 0, width: 3,
          background: overdue
            ? `linear-gradient(to bottom, ${C.danger}, #e74c3c)`
            : `linear-gradient(to bottom, ${C.brandLight}, ${C.brandMid})`,
          borderRadius: "18px 0 0 18px",
          opacity: overdue ? 1 : 0.5,
          transition: "opacity 0.15s",
        }}/>

        {/* カテゴリ + 期日 */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom: 10 }}>
          <div style={{ display:"flex", alignItems:"center", gap: 6 }}>
            <div style={{
              width: 6, height: 6, borderRadius: "50%", flexShrink: 0,
              background: overdue ? C.danger : C.brandLight,
              boxShadow: overdue
                ? `0 0 0 3px ${C.dangerPale}`
                : `0 0 0 3px ${C.brandPale}`,
            }}/>
            <span style={{
              fontSize: 10, fontWeight: 800, letterSpacing: "0.10em",
              textTransform: "uppercase", fontFamily: FD,
              color: overdue ? C.danger : C.brand,
            }}>
              {task.main_category_name}
            </span>
          </div>

          {due && (
            <div style={{
              display:"flex", alignItems:"center", gap: 4,
              background: overdue ? C.dangerBg : C.brandPaler,
              border: `1px solid ${overdue ? C.dangerLine : C.line}`,
              borderRadius: 8, padding: "3px 9px",
            }}>
              {overdue && (
                <svg width="9" height="9" viewBox="0 0 24 24" fill={C.danger}>
                  <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
                </svg>
              )}
              <span style={{
                fontSize: 11.5, fontWeight: 600, fontFamily: FM,
                color: overdue ? C.dangerDeep : C.sub, letterSpacing: "0.04em",
              }}>{due}</span>
            </div>
          )}
        </div>

        {/* タイトル */}
        <p style={{
          margin: "0 0 13px", fontSize: 14.5, fontWeight: 600,
          color: C.text, lineHeight: 1.55, fontFamily: FB,
          letterSpacing: "-0.015em",
        }}>
          {task.title}
        </p>

        {/* フッター */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div style={{ display:"flex", alignItems:"center", gap: 7 }}>
            <div style={{
              width: 22, height: 22, borderRadius: "50%",
              background: `linear-gradient(135deg, ${C.brand}, ${C.brandDeep})`,
              display:"flex", alignItems:"center", justifyContent:"center",
              fontSize: 9.5, fontWeight: 800, color: C.white, fontFamily: FD,
              flexShrink: 0,
            }}>
              {(task.created_by_name ?? "?")[0].toUpperCase()}
            </div>
            <span style={{ fontSize: 11.5, color: C.muted, fontFamily: FB }}>
              {task.created_by_name}
            </span>
          </div>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.line} strokeWidth="2">
            <path d="M9 18l6-6-6-6"/>
          </svg>
        </div>
      </article>
    </Link>
  )
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   BoardInner
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function BoardInner() {
  const [tab, setTab]   = useState<"todo"|"doing">("todo")
  const [todo, setTodo] = useState<T[]>([])
  const [doing, setDoing] = useState<T[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string|null>(null)
  const [q, setQ]       = useState("")
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
      if (kw && !`${t.title} ${t.main_category_name} ${t.created_by_name}`.toLowerCase().includes(kw)) return false
      return true
    })
  }, [tab, todo, doing, q, mainId, creator, onlyOverdue])

  const overdueCount = (tab === "todo" ? todo : doing).filter(t => isOverdue(t.due_date)).length
  const hasFilter = !!q || !!creator || !!mainId || onlyOverdue

  const todoOD  = todo.filter(t => isOverdue(t.due_date)).length
  const doingOD = doing.filter(t => isOverdue(t.due_date)).length

  return (
    <div style={{ minHeight:"100vh", background: C.bg, fontFamily: FB, WebkitFontSmoothing: "antialiased" }}>
      <style>{GLOBAL_CSS}</style>

      {/* ━━ ヘッダー ━━ */}
      <div style={{
        position:"sticky", top:0, zIndex:100,
        background: C.header,
        backgroundImage: `
          radial-gradient(ellipse at 0% 0%, rgba(0,130,173,0.18) 0%, transparent 55%),
          radial-gradient(ellipse at 100% 100%, rgba(0,98,132,0.12) 0%, transparent 50%)
        `,
      }}>

        {/* タブ行 */}
        <div style={{ display:"flex", borderBottom:`1px solid ${C.whiteA08}` }}>
          {([
            ["todo",  "未着手", todo.length,  todoOD ] as const,
            ["doing", "進行中", doing.length, doingOD] as const,
          ]).map(([key, label, cnt, oc]) => {
            const on = tab === key
            return (
              <button key={key} onClick={() => setTab(key)} style={{
                flex:1, border:"none", background:"transparent", cursor:"pointer",
                padding:"14px 12px 12px", position:"relative",
                WebkitTapHighlightColor:"transparent",
              }}>
                {/* アクティブ下線 */}
                <div style={{
                  position:"absolute", bottom:0, left:"18%", right:"18%",
                  height:2, borderRadius:"2px 2px 0 0",
                  background:"rgba(255,255,255,0.85)",
                  transform: on ? "scaleX(1)" : "scaleX(0)",
                  transition:"transform 0.28s cubic-bezier(.34,1.56,.64,1)",
                }}/>
                {/* 大きな数字 */}
                <div style={{
                  fontFamily:FD, fontWeight:800, fontSize:28, lineHeight:1,
                  color: on ? C.white : C.whiteA30,
                  transition:"color 0.2s",
                  letterSpacing:"-0.03em",
                }}>{cnt}</div>
                {/* ラベル */}
                <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:5, marginTop:4 }}>
                  <span style={{
                    fontSize:11, fontWeight:600, fontFamily:FB,
                    color: on ? "rgba(255,255,255,0.7)" : C.whiteA30,
                    transition:"color 0.2s",
                  }}>{label}</span>
                  {oc > 0 && on && (
                    <span style={{
                      fontSize:9, fontWeight:800, fontFamily:FD,
                      background:C.danger, color:C.white,
                      padding:"1px 5px", borderRadius:99,
                      animation:"pulse 2s ease infinite",
                    }}>!{oc}</span>
                  )}
                </div>
              </button>
            )
          })}
        </div>

        {/* アクション行 */}
        <div style={{ display:"flex", alignItems:"center", gap:8, padding:"10px 12px" }}>
          {/* 完了一覧 */}
          <Link href="/tasks/done/" style={{
            height:36, flexShrink:0,
            display:"inline-flex", alignItems:"center", gap:5,
            padding:"0 13px", borderRadius:10,
            border:`1px solid ${C.whiteA30}`, background:C.whiteA08,
            color:C.whiteA80, fontSize:12.5, fontWeight:600, fontFamily:FB,
            textDecoration:"none", whiteSpace:"nowrap",
            backdropFilter:"blur(6px)",
            WebkitTapHighlightColor:"transparent",
          }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            完了一覧
          </Link>

          {/* 新規タスク */}
          <Link href="/tasks/new/" style={{
            flex:1, height:36,
            display:"inline-flex", alignItems:"center", justifyContent:"center", gap:6,
            borderRadius:10, border:"none",
            background:C.white, color:C.brand,
            fontSize:13.5, fontWeight:800, fontFamily:FD,
            textDecoration:"none", letterSpacing:"0.01em",
            boxShadow:"0 2px 16px rgba(0,0,0,0.18)",
            WebkitTapHighlightColor:"transparent",
            transition:"transform 0.12s, opacity 0.12s",
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            新規タスク
          </Link>

          {/* 更新 */}
          <button onClick={load} disabled={loading} style={{
            width:36, height:36, flexShrink:0,
            borderRadius:10, border:`1px solid ${C.whiteA30}`,
            background:C.whiteA08, backdropFilter:"blur(6px)",
            display:"flex", alignItems:"center", justifyContent:"center",
            cursor: loading ? "default" : "pointer", opacity: loading ? 0.4 : 1,
            WebkitTapHighlightColor:"transparent",
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke={C.whiteA80} strokeWidth="2.4"
              style={{ animation: loading ? "spin 0.7s linear infinite" : "none" }}>
              <polyline points="23 4 23 10 17 10"/>
              <path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/>
            </svg>
          </button>

          {/* フィルター */}
          <button onClick={() => setFilterOpen(v=>!v)} style={{
            width:36, height:36, flexShrink:0, position:"relative",
            borderRadius:10,
            border:`1px solid ${filterOpen||hasFilter ? "rgba(255,255,255,0.55)" : C.whiteA30}`,
            background: filterOpen||hasFilter ? C.whiteA30 : C.whiteA08,
            backdropFilter:"blur(6px)",
            display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer",
            WebkitTapHighlightColor:"transparent",
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke={filterOpen||hasFilter ? C.white : C.whiteA50} strokeWidth="2.2">
              <line x1="4" y1="6" x2="20" y2="6"/>
              <line x1="8" y1="12" x2="16" y2="12"/>
              <line x1="11" y1="18" x2="13" y2="18"/>
            </svg>
            {hasFilter && (
              <span style={{
                position:"absolute", top:6, right:6,
                width:6, height:6, borderRadius:"50%",
                background:C.brandLight, border:`1.5px solid ${C.header}`,
              }}/>
            )}
          </button>
        </div>

        {/* フィルタードロワー */}
        {filterOpen && (
          <div style={{
            background:C.headerMid, borderTop:`1px solid ${C.whiteA08}`,
            padding:"8px 12px 16px",
            animation:"fadeSlide 0.2s cubic-bezier(.22,1,.36,1) both",
          }}>
            {/* キーワード */}
            <div style={{ position:"relative", marginBottom:8 }}>
              <svg style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)", pointerEvents:"none" }}
                width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="2.4">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input className="fi" value={q} onChange={e=>setQ(e.target.value)} placeholder="検索..."
                style={{
                  height:40, width:"100%", paddingLeft:36, paddingRight:14,
                  borderRadius:10, border:`1px solid ${C.whiteA30}`,
                  background:C.whiteA08, color:C.white, fontSize:13.5, fontFamily:FB,
                  backdropFilter:"blur(6px)", outline:"none",
                }}
              />
            </div>
            <div style={{ display:"flex", gap:8, marginBottom:10 }}>
              <input className="fi" value={creator} onChange={e=>setCreator(e.target.value)} placeholder="登録者"
                style={{
                  flex:1, height:40, padding:"0 13px",
                  borderRadius:10, border:`1px solid ${C.whiteA30}`,
                  background:C.whiteA08, color:C.white, fontSize:13.5, fontFamily:FB,
                  backdropFilter:"blur(6px)", outline:"none",
                }}
              />
              <div style={{ flex:1.3, position:"relative" }}>
                <select className="fi" value={mainId} onChange={e=>setMainId(Number(e.target.value))} style={{
                  width:"100%", height:40, padding:"0 30px 0 13px",
                  borderRadius:10, border:`1px solid ${C.whiteA30}`,
                  background:C.whiteA08, color: mainId ? C.white : "rgba(255,255,255,0.38)",
                  fontSize:13.5, fontFamily:FB,
                  backdropFilter:"blur(6px)", outline:"none", cursor:"pointer",
                }}>
                  <option value={0}>カテゴリ：全て</option>
                  {mainCats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <svg style={{ position:"absolute", right:10, top:"50%", transform:"translateY(-50%)", pointerEvents:"none" }}
                  width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2.5">
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </div>
            </div>
            {/* 期限超過トグル */}
            <label style={{
              display:"flex", alignItems:"center", gap:10, cursor:"pointer",
              userSelect:"none", fontSize:12.5, fontFamily:FB,
              color: onlyOverdue ? "#ff8888" : "rgba(255,255,255,0.45)",
            }}>
              <button type="button" onClick={()=>setOnlyOverdue(v=>!v)} style={{
                position:"relative", width:40, height:22, borderRadius:99,
                border:"none", padding:0, cursor:"pointer", flexShrink:0,
                background: onlyOverdue ? "rgba(224,82,82,0.55)" : C.whiteA15,
                transition:"background 0.22s",
              }}>
                <span style={{
                  position:"absolute", top:3,
                  left: onlyOverdue ? 21 : 3,
                  width:16, height:16, borderRadius:"50%",
                  background: onlyOverdue ? C.danger : "rgba(255,255,255,0.65)",
                  boxShadow:"0 1px 4px rgba(0,0,0,0.25)",
                  transition:"left 0.22s cubic-bezier(.34,1.56,.64,1)",
                  display:"block",
                }}/>
              </button>
              期限超過のみ
            </label>
          </div>
        )}
      </div>

      {/* ━━ コンテンツ ━━ */}
      <div style={{ padding:"16px 14px 48px" }}>
        {error && <ErrorBar msg={error}/>}

        {loading && list.length === 0 && (
          <div style={{ padding:"80px 0", textAlign:"center", color:C.muted, fontSize:13 }}>
            <div style={{
              width:34, height:34, borderRadius:"50%", margin:"0 auto 14px",
              border:`2.5px solid ${C.brandPale}`, borderTopColor:C.brand,
              animation:"spin 0.7s linear infinite",
            }}/>
            読み込み中...
          </div>
        )}

        {!loading && list.length === 0 && (
          <div style={{ padding:"80px 0", textAlign:"center" }}>
            <div style={{
              width:56, height:56, borderRadius:18,
              background:`linear-gradient(135deg, ${C.brandPale}, ${C.bg})`,
              border:`1px solid ${C.line}`,
              display:"flex", alignItems:"center", justifyContent:"center",
              margin:"0 auto 18px",
              boxShadow:`0 4px 20px rgba(0,98,132,0.08)`,
            }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="1.6">
                <rect x="3" y="3" width="7" height="7" rx="1.5"/>
                <rect x="14" y="3" width="7" height="7" rx="1.5"/>
                <rect x="3" y="14" width="7" height="7" rx="1.5"/>
                <rect x="14" y="14" width="7" height="7" rx="1.5"/>
              </svg>
            </div>
            <p style={{ fontSize:15, fontWeight:700, color:C.sub, fontFamily:FD, margin:0 }}>タスクがありません</p>
            <p style={{ marginTop:6, fontSize:12.5, color:C.muted }}>条件を変えてみてください</p>
          </div>
        )}

        {list.length > 0 && (
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            {list.map((t, i) => <TaskCard key={t.id} task={t} index={i}/>)}
          </div>
        )}
      </div>
    </div>
  )
}

export default function TasksPage() { return <Guard><BoardInner/></Guard> }
