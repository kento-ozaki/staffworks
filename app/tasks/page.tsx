"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { Guard } from "@/components/Guard"
import type { ApiNg } from "@/lib/api"
import { toUserMessage } from "@/lib/errors"
import { board, listMainCategories, type MainCategory, type TaskCard as T } from "@/lib/tasks"

/* ─────────────────────────────────────────────
   DESIGN SYSTEM  ／  全ページ共通 export
   コンセプト: Editorial — 紙の上の整然とした情報
   制約: #006284より濃い色を大面積で使わない
───────────────────────────────────────────── */
export const C = {
  /* 背景 */
  canvas:     "#f0f5f7",      /* 既定の背景色 */
  paper:      "#ffffff",
  paperSub:   "#f7fbfd",
  /* ブランド */
  ink:        "#006284",      /* メインカラー上限 */
  inkLight:   "#007fa8",
  inkWash:    "#e2f2f8",
  inkFaint:   "#f0f8fb",
  /* テキスト */
  textPrimary:"#18282e",
  textSecond: "#456470",
  textMuted:  "#8eb4be",
  textGhost:  "#c2dae0",
  /* 罫線 */
  rule:       "#d8eaee",
  ruleSoft:   "#ecf5f8",
  /* ステータス */
  emerald:    "#1a7a4a",
  emeraldWash:"#e3f5ec",
  emeraldRule:"#93d4b0",
  amber:      "#b85c00",
  amberWash:  "#fff2e5",
  amberRule:  "#f0c080",
  rose:       "#d03a3a",
  roseWash:   "#fff0f0",
  roseRule:   "#f0b0b0",
} as const

export const F_DISPLAY = `'Fraunces', 'Noto Serif JP', Georgia, serif`
export const F_BODY    = `'IBM Plex Sans', 'Noto Sans JP', sans-serif`
export const F_MONO    = `'IBM Plex Mono', monospace`

export const GLOBAL_CSS = (extra = "") => `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,400;0,9..144,600;0,9..144,700;1,9..144,300;1,9..144,400&family=IBM+Plex+Sans:wght@300;400;500;600;700&family=IBM+Plex+Mono:wght@400;500&family=Noto+Sans+JP:wght@400;500;700&display=swap');
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html { -webkit-font-smoothing: antialiased; }
::placeholder { color: ${C.textGhost}; font-family: ${F_BODY}; font-size: 13px; }
select { appearance: none; -webkit-appearance: none; }
select option { background: #fff; color: ${C.textPrimary}; }
textarea { resize: vertical; }

@keyframes _spin  { to { transform: rotate(360deg); } }
@keyframes _rise  { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:none; } }
@keyframes _slide { from { opacity:0; transform:translateY(-6px); } to { opacity:1; transform:none; } }
@keyframes _linein{ from { transform:scaleX(0); } to { transform:scaleX(1); } }

.t-rise { animation: _rise  0.28s cubic-bezier(.22,1,.36,1) both; }
.t-slide { animation: _slide 0.2s  cubic-bezier(.22,1,.36,1) both; }

/* row hover */
.task-row { transition: background 0.12s; }
.task-row:hover { background: ${C.inkFaint} !important; }
.task-row:hover .task-row-arrow { opacity: 1 !important; transform: translateX(0) !important; }

/* input focus */
.field-inp:focus {
  outline: none;
  border-color: ${C.ink} !important;
  box-shadow: 0 0 0 3px rgba(0,98,132,0.10) !important;
}

/* toggle track */
.tog-track { transition: background 0.2s; }
.tog-thumb { transition: left 0.22s cubic-bezier(.34,1.56,.64,1); }
${extra}
`

/* ── 共通コンポーネント ── */
export function BrandTag({ label, over = false }: { label: string; over?: boolean }) {
  return (
    <span style={{
      display: "inline-block",
      fontSize: 9.5, fontWeight: 600, letterSpacing: "0.12em",
      textTransform: "uppercase", fontFamily: F_BODY,
      color: over ? C.rose : C.ink,
      background: over ? C.roseWash : C.inkWash,
      border: `1px solid ${over ? C.roseRule : C.inkFaint}`,
      padding: "2px 7px", borderRadius: 4,
    }}>{label}</span>
  )
}

export function ErrorBanner({ msg }: { msg: string }) {
  return (
    <div style={{
      background: C.roseWash, border: `1px solid ${C.roseRule}`,
      borderRadius: 10, padding: "11px 14px", marginBottom: 12,
      color: C.rose, fontSize: 13, fontFamily: F_BODY,
      display: "flex", alignItems: "center", gap: 8,
    }}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="8" x2="12" y2="12"/>
        <line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
      {msg}
    </div>
  )
}

export function FieldInp({ value, onChange, placeholder, type = "text", focused, onFocus, onBlur, style }: {
  value: string; onChange: (v: string) => void; placeholder?: string
  type?: string; focused: boolean; onFocus: () => void; onBlur: () => void
  style?: React.CSSProperties
}) {
  return (
    <input
      className="field-inp"
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      onFocus={onFocus} onBlur={onBlur}
      placeholder={placeholder}
      style={{
        width: "100%", padding: "10px 13px",
        borderRadius: 8,
        border: `1.5px solid ${focused ? C.ink : C.rule}`,
        boxShadow: focused ? "0 0 0 3px rgba(0,98,132,0.09)" : "none",
        background: C.paperSub,
        color: C.textPrimary, fontSize: 14, fontFamily: F_BODY,
        outline: "none", transition: "border-color 0.15s, box-shadow 0.15s",
        ...style,
      }}
    />
  )
}

/* ── ユーティリティ ── */
function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`
}
export const isOver = (due: string | null) => !!due && due < todayStr()
export function shortDate(due: string | null) {
  if (!due) return null
  const d = new Date(due + "T00:00:00")
  return `${d.getMonth()+1}/${d.getDate()}`
}

/* ─────────────────────────────────────────────
   TaskRow  — リスト行デザイン
───────────────────────────────────────────── */
function TaskRow({ task, index }: { task: T; index: number }) {
  const over = isOver(task.due_date)
  const due  = shortDate(task.due_date)

  return (
    <Link
      href={`/task/?id=${task.id}`}
      style={{ textDecoration: "none", color: "inherit", display: "block" }}
    >
      <div
        className="task-row t-rise"
        style={{
          animationDelay: `${Math.min(index * 35, 280)}ms`,
          background: C.paper,
          borderBottom: `1px solid ${C.ruleSoft}`,
          padding: "0 16px",
          cursor: "pointer",
          WebkitTapHighlightColor: "transparent",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 0" }}>

          {/* ステータスドット */}
          <div style={{
            width: 8, height: 8, borderRadius: "50%", flexShrink: 0,
            background: over ? C.rose : C.ink,
            boxShadow: over
              ? `0 0 0 3px ${C.roseWash}`
              : `0 0 0 3px ${C.inkWash}`,
          }}/>

          {/* メイン情報 */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* カテゴリ */}
            <div style={{ marginBottom: 5 }}>
              <BrandTag label={task.main_category_name} over={over}/>
            </div>

            {/* タイトル */}
            <p style={{
              margin: 0, fontSize: 14.5, fontWeight: 500,
              color: C.textPrimary, fontFamily: F_BODY,
              lineHeight: 1.45, letterSpacing: "-0.01em",
              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
            }}>
              {task.title}
            </p>
          </div>

          {/* 右側メタ */}
          <div style={{
            display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flexShrink: 0,
          }}>
            {due && (
              <span style={{
                fontSize: 11, fontWeight: 500, fontFamily: F_MONO,
                color: over ? C.rose : C.textMuted,
                background: over ? C.roseWash : "transparent",
                padding: over ? "1px 5px" : "0",
                borderRadius: 4,
              }}>{over ? "! " : ""}{due}</span>
            )}
            <span style={{ fontSize: 11, color: C.textGhost, fontFamily: F_BODY }}>
              {task.created_by_name}
            </span>
          </div>

          {/* 矢印 */}
          <svg
            className="task-row-arrow"
            width="14" height="14" viewBox="0 0 24 24" fill="none"
            stroke={C.ink} strokeWidth="2"
            style={{ flexShrink: 0, opacity: 0, transform: "translateX(-4px)", transition: "opacity 0.15s, transform 0.15s" }}
          >
            <path d="M9 18l6-6-6-6"/>
          </svg>

        </div>
      </div>
    </Link>
  )
}

/* ─────────────────────────────────────────────
   BoardInner
───────────────────────────────────────────── */
function BoardInner() {
  const [tab, setTab]     = useState<"todo"|"doing">("todo")
  const [todo, setTodo]   = useState<T[]>([])
  const [doing, setDoing] = useState<T[]>([])
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState<string|null>(null)
  const [q, setQ]                 = useState("")
  const [mainCats, setMainCats]   = useState<MainCategory[]>([])
  const [mainId, setMainId]       = useState<number>(0)
  const [creator, setCreator]     = useState("")
  const [onlyOver, setOnlyOver]   = useState(false)
  const [filterOpen, setFilterOpen] = useState(false)
  const [qFocus, setQFocus]       = useState(false)
  const [crFocus, setCrFocus]     = useState(false)

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
    const kw  = q.trim().toLowerCase()
    const ck  = creator.trim().toLowerCase()
    return src.filter(t => {
      if (mainId && Number(t.main_category_id) !== mainId) return false
      if (onlyOver && !isOver(t.due_date)) return false
      if (ck && !t.created_by_name.toLowerCase().includes(ck)) return false
      if (kw && !`${t.title} ${t.main_category_name} ${t.created_by_name}`.toLowerCase().includes(kw)) return false
      return true
    })
  }, [tab, todo, doing, q, mainId, creator, onlyOver])

  const overCount = (tab === "todo" ? todo : doing).filter(t => isOver(t.due_date)).length
  const hasFilter = !!q || !!creator || !!mainId || onlyOver

  return (
    <div style={{ minHeight: "100vh", background: C.canvas, fontFamily: F_BODY }}>
      <style dangerouslySetInnerHTML={{ __html: GLOBAL_CSS() }}/>

      {/* ══════════════════════════════════════════
          STICKY HEADER
      ══════════════════════════════════════════ */}
      <header style={{
        position: "sticky", top: 0, zIndex: 200,
        background: "rgba(255,255,255,0.96)",
        backdropFilter: "blur(24px) saturate(180%)",
        WebkitBackdropFilter: "blur(24px) saturate(180%)",
        borderBottom: `1px solid ${C.rule}`,
      }}>

        {/* ── タブ行 ── */}
        <div style={{ display: "flex", borderBottom: `1px solid ${C.ruleSoft}` }}>
          {(["todo", "doing"] as const).map(key => {
            const on  = tab === key
            const cnt = key === "todo" ? todo.length : doing.length
            const oc  = key === tab ? overCount : 0
            const lbl = key === "todo" ? "未着手" : "進行中"
            return (
              <button
                key={key}
                onClick={() => setTab(key)}
                style={{
                  flex: 1, background: "none", border: "none", cursor: "pointer",
                  padding: "14px 8px 12px",
                  position: "relative",
                  WebkitTapHighlightColor: "transparent",
                }}
              >
                {/* アクティブバー */}
                <div style={{
                  position: "absolute", bottom: -1, left: "15%", right: "15%",
                  height: 2, background: C.ink, borderRadius: 1,
                  transform: on ? "scaleX(1)" : "scaleX(0)",
                  transformOrigin: "left",
                  transition: "transform 0.3s cubic-bezier(.34,1.56,.64,1)",
                }}/>

                {/* 件数  — Fraunces でディスプレイ表示 */}
                <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "center", gap: 6, marginBottom: 3 }}>
                  <span style={{
                    fontFamily: F_DISPLAY,
                    fontWeight: 600, fontSize: 32, lineHeight: 1,
                    letterSpacing: "-0.04em",
                    color: on ? C.ink : C.textGhost,
                    transition: "color 0.2s",
                  }}>{cnt}</span>
                  {oc > 0 && (
                    <span style={{
                      fontSize: 9, fontWeight: 700, fontFamily: F_BODY,
                      background: C.rose, color: "#fff",
                      padding: "1px 5px 2px", borderRadius: 4,
                      letterSpacing: "0.04em",
                      marginBottom: 5,
                    }}>!{oc}</span>
                  )}
                </div>

                <div style={{
                  fontSize: 10.5, fontWeight: 500, letterSpacing: "0.10em",
                  textTransform: "uppercase", fontFamily: F_BODY,
                  color: on ? C.textSecond : C.textGhost,
                  transition: "color 0.2s",
                }}>{lbl}</div>
              </button>
            )
          })}
        </div>

        {/* ── アクション行 ── */}
        <div style={{ display: "flex", alignItems: "center", gap: 7, padding: "8px 12px 9px" }}>

          {/* 完了一覧 */}
          <Link href="/tasks/done/" style={{
            height: 36, flexShrink: 0,
            display: "inline-flex", alignItems: "center", gap: 5,
            padding: "0 12px", borderRadius: 8,
            border: `1px solid ${C.rule}`,
            background: C.paper,
            color: C.textSecond, fontSize: 12, fontWeight: 500, fontFamily: F_BODY,
            textDecoration: "none", whiteSpace: "nowrap",
            transition: "border-color 0.15s",
            WebkitTapHighlightColor: "transparent",
          }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            完了一覧
          </Link>

          {/* 新規タスク — メインCTA */}
          <Link href="/tasks/new/" style={{
            flex: 1, height: 36,
            display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6,
            borderRadius: 8, border: "none",
            background: C.ink, color: "#fff",
            fontSize: 13, fontWeight: 600, fontFamily: F_BODY,
            textDecoration: "none", letterSpacing: "0.01em",
            boxShadow: `0 2px 10px rgba(0,98,132,0.25), 0 1px 0 rgba(0,0,0,0.05) inset`,
            transition: "filter 0.14s",
            WebkitTapHighlightColor: "transparent",
          }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            新規タスク
          </Link>

          {/* 更新 */}
          <button onClick={load} disabled={loading} style={{
            width: 36, height: 36, flexShrink: 0, borderRadius: 8,
            border: `1px solid ${C.rule}`, background: C.paper,
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: loading ? "default" : "pointer", opacity: loading ? 0.35 : 1,
            WebkitTapHighlightColor: "transparent",
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.ink} strokeWidth="2.2"
              style={{ animation: loading ? "_spin 0.7s linear infinite" : "none" }}>
              <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/>
            </svg>
          </button>

          {/* フィルター */}
          <button onClick={() => setFilterOpen(v => !v)} style={{
            width: 36, height: 36, flexShrink: 0, borderRadius: 8, position: "relative",
            border: `1px solid ${filterOpen || hasFilter ? C.ink : C.rule}`,
            background: filterOpen || hasFilter ? C.inkWash : C.paper,
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", transition: "all 0.14s",
            WebkitTapHighlightColor: "transparent",
          }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
              stroke={filterOpen || hasFilter ? C.ink : C.textMuted} strokeWidth="2.2">
              <line x1="4" y1="6" x2="20" y2="6"/>
              <line x1="8" y1="12" x2="16" y2="12"/>
              <line x1="11" y1="18" x2="13" y2="18"/>
            </svg>
            {hasFilter && !filterOpen && (
              <span style={{
                position: "absolute", top: 7, right: 7,
                width: 5, height: 5, borderRadius: "50%", background: C.ink,
              }}/>
            )}
          </button>
        </div>

        {/* ── フィルターパネル ── */}
        {filterOpen && (
          <div className="t-slide" style={{
            borderTop: `1px solid ${C.ruleSoft}`,
            background: C.inkFaint,
            padding: "10px 12px 14px",
          }}>
            {/* キーワード */}
            <div style={{ position: "relative", marginBottom: 8 }}>
              <svg style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}
                width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={C.textGhost} strokeWidth="2.4">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <FieldInp
                value={q} onChange={setQ} placeholder="タイトル・登録者で検索"
                focused={qFocus} onFocus={() => setQFocus(true)} onBlur={() => setQFocus(false)}
                style={{ paddingLeft: 32 }}
              />
            </div>
            <div style={{ display: "flex", gap: 7, marginBottom: 10 }}>
              <FieldInp
                value={creator} onChange={setCreator} placeholder="登録者"
                focused={crFocus} onFocus={() => setCrFocus(true)} onBlur={() => setCrFocus(false)}
                style={{ flex: 1 }}
              />
              <div style={{ flex: 1.4, position: "relative" }}>
                <select
                  className="field-inp"
                  value={mainId} onChange={e => setMainId(Number(e.target.value))}
                  style={{
                    width: "100%", padding: "10px 30px 10px 13px",
                    borderRadius: 8, border: `1.5px solid ${C.rule}`,
                    background: C.paperSub, color: mainId ? C.textPrimary : C.textGhost,
                    fontSize: 14, fontFamily: F_BODY, outline: "none", cursor: "pointer",
                  }}
                >
                  <option value={0}>カテゴリ：全て</option>
                  {mainCats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <svg style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}
                  width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={C.textMuted} strokeWidth="2.4">
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </div>
            </div>
            {/* 期限超過トグル */}
            <label style={{
              display: "flex", alignItems: "center", gap: 9, cursor: "pointer",
              userSelect: "none",
              fontSize: 12.5, fontFamily: F_BODY,
              color: onlyOver ? C.rose : C.textMuted,
              fontWeight: onlyOver ? 500 : 400,
            }}>
              <button type="button" onClick={() => setOnlyOver(v => !v)} style={{
                position: "relative", width: 38, height: 21, borderRadius: 99,
                border: "none", padding: 0, cursor: "pointer", flexShrink: 0,
                background: onlyOver ? "#fad0d0" : C.rule,
              }} className="tog-track">
                <span className="tog-thumb" style={{
                  position: "absolute", top: 2.5,
                  left: onlyOver ? 19 : 2.5,
                  width: 16, height: 16, borderRadius: "50%",
                  background: onlyOver ? C.rose : "#fff",
                  boxShadow: "0 1px 4px rgba(0,0,0,0.15)",
                  display: "block",
                }}/>
              </button>
              期限超過のみ表示
            </label>
          </div>
        )}
      </header>

      {/* ══════════════════════════════════════════
          CONTENT
      ══════════════════════════════════════════ */}
      <main style={{ padding: "0 0 64px" }}>
        {error && <div style={{ padding: "12px 14px 0" }}><ErrorBanner msg={error}/></div>}

        {loading && list.length === 0 && (
          <div style={{ padding: "80px 0", textAlign: "center", color: C.textMuted, fontSize: 13 }}>
            <div style={{
              width: 28, height: 28, borderRadius: "50%", margin: "0 auto 14px",
              border: `2px solid ${C.inkWash}`, borderTopColor: C.ink,
              animation: "_spin 0.7s linear infinite",
            }}/>
            読み込み中...
          </div>
        )}

        {!loading && list.length === 0 && (
          <div style={{ padding: "80px 24px", textAlign: "center" }}>
            {/* Fraunces イタリックで空状態を表現 */}
            <p style={{
              fontFamily: F_DISPLAY, fontStyle: "italic",
              fontSize: 22, fontWeight: 300,
              color: C.textGhost, margin: "0 0 8px",
              letterSpacing: "-0.02em",
            }}>
              {hasFilter ? "条件に合うタスクがありません" : "タスクがありません"}
            </p>
            {!hasFilter && (
              <Link href="/tasks/new/" style={{
                display: "inline-flex", alignItems: "center", gap: 5,
                marginTop: 14, fontSize: 13, fontWeight: 500, fontFamily: F_BODY,
                color: C.ink, textDecoration: "none",
                borderBottom: `1px solid ${C.inkWash}`,
                paddingBottom: 2,
              }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                新規タスクを作成する
              </Link>
            )}
          </div>
        )}

        {list.length > 0 && (
          <div style={{ background: C.paper, borderBottom: `1px solid ${C.rule}` }}>
            {/* リスト上部の細いブランドライン */}
            <div style={{
              height: 2, background: C.ink,
              animation: "_linein 0.5s cubic-bezier(.22,1,.36,1) both",
            }}/>
            {list.map((t, i) => <TaskRow key={t.id} task={t} index={i}/>)}
          </div>
        )}
      </main>
    </div>
  )
}

export default function TasksPage() { return <Guard><BoardInner/></Guard> }
