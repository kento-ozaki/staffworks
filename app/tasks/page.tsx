"use client"

import React from "react"
import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { Guard } from "@/components/Guard"
import type { ApiNg } from "@/lib/api"
import { toUserMessage } from "@/lib/errors"
import { board, listMainCategories, type MainCategory, type TaskCard as T } from "@/lib/tasks"

/* ══════════════════════════════════════════════════════
   DESIGN SYSTEM — Spatial Card Board
   コンセプト: 奥行き・色の呼吸・大胆な余白
   制約: #006284より濃い色を大面積で使わない（影・細部OK）
══════════════════════════════════════════════════════ */
export const C = {
  bg:           "#f0f5f7",
  bgDeep:       "#e6f0f4",
  surface:      "#ffffff",
  surfaceRaised:"#f9fdfe",

  brand:        "#006284",
  brandMid:     "#007aa0",
  brandPale:    "#d8eef5",
  brandFaint:   "#eef8fb",
  brandGlow:    "rgba(0,98,132,0.10)",

  text:         "#0f2028",
  textSub:      "#3a5f6e",
  muted:        "#7aacba",
  ghost:        "#b8d4db",

  stroke:       "#cce4eb",
  strokeSoft:   "#e4f2f6",

  done:         "#17794a",
  donePale:     "#dff2ea",
  doneStroke:   "#8ecfae",

  warn:         "#b55a00",
  warnPale:     "#fef0e4",
  warnStroke:   "#f0bb80",

  danger:       "#cc3333",
  dangerPale:   "#fef0f0",
  dangerStroke: "#f0aaaa",
} as const

export const FH = `'Clash Display', 'Plus Jakarta Sans', 'Noto Sans JP', sans-serif`
export const FB = `'Inter', 'Noto Sans JP', sans-serif`
export const FM = `'Fira Code', 'JetBrains Mono', monospace`

export const GLOBAL_CSS = `
:root {
  --nav-h: 84px;
  --safe-b: env(safe-area-inset-bottom, 0px);
}
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Inter:wght@300;400;500;600&family=Fira+Code:wght@400;500&family=Noto+Sans+JP:wght@400;500;600;700&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html{-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale}
::placeholder{color:${C.ghost};font-family:${FB};font-size:13px}
select{appearance:none;-webkit-appearance:none}
select option{background:#fff;color:${C.text}}
textarea{resize:vertical}

@keyframes _spin{to{transform:rotate(360deg)}}
@keyframes _cardUp{
  from{opacity:0;transform:translateY(16px) scale(0.97)}
  to{opacity:1;transform:none}
}
@keyframes _fadeIn{from{opacity:0}to{opacity:1}}
@keyframes _slideDown{
  from{opacity:0;transform:translateY(-10px)}
  to{opacity:1;transform:none}
}
@keyframes _inkBar{
  from{transform:scaleX(0);transform-origin:left}
  to{transform:scaleX(1);transform-origin:left}
}

.card-up{animation:_cardUp 0.38s cubic-bezier(.16,1,.3,1) both}
.fade-in{animation:_fadeIn 0.22s ease both}
.slide-down{animation:_slideDown 0.24s cubic-bezier(.22,1,.36,1) both}

/* タスクカードホバー */
.tc{
  transition:
    box-shadow 0.22s cubic-bezier(.22,1,.36,1),
    transform  0.22s cubic-bezier(.22,1,.36,1),
    border-color 0.18s;
}
.tc:hover{
  box-shadow:0 12px 32px rgba(0,98,132,0.14),0 2px 8px rgba(0,98,132,0.08)!important;
  transform:translateY(-2px)!important;
  border-color:${C.brand}!important;
}
.tc:active{transform:scale(0.985)!important}

/* フォーカス */
.fi:focus{
  outline:none;
  border-color:${C.brand}!important;
  box-shadow:0 0 0 3px rgba(0,98,132,0.12)!important;
}
`

/* ── 共通パーツ ── */
export function Chip({ label, accent = false, danger = false }: { label: string; accent?: boolean; danger?: boolean }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center",
      fontSize: 10, fontWeight: 600, letterSpacing: "0.10em",
      textTransform: "uppercase", fontFamily: FB,
      color:      danger ? C.danger  : accent ? C.brand  : C.textSub,
      background: danger ? C.dangerPale : accent ? C.brandFaint : C.bg,
      border:    `1px solid ${danger ? C.dangerStroke : accent ? C.brandPale : C.stroke}`,
      padding: "2px 8px 3px", borderRadius: 5,
      lineHeight: 1.4,
    }}>{label}</span>
  )
}

export function ErrBar({ msg }: { msg: string }) {
  return (
    <div style={{
      background: C.dangerPale, border: `1px solid ${C.dangerStroke}`,
      borderRadius: 12, padding: "11px 14px", marginBottom: 12,
      color: C.danger, fontSize: 13, fontFamily: FB,
      display: "flex", alignItems: "center", gap: 8,
    }}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
        <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
      {msg}
    </div>
  )
}

export function FieldLabel({ text }: { text: string }) {
  return <p style={{ margin:"0 0 7px", fontSize:10.5, fontWeight:600, color:C.muted, letterSpacing:"0.10em", textTransform:"uppercase", fontFamily:FB }}>{text}</p>
}

export const fieldStyle = (on: boolean): React.CSSProperties => ({
  width:"100%", padding:"11px 13px", borderRadius:10,
  border:`1.5px solid ${on ? C.brand : C.stroke}`,
  boxShadow: on ? "0 0 0 3px rgba(0,98,132,0.10)" : "none",
  background: C.surface, color:C.text, fontSize:14, fontFamily:FB,
  outline:"none", transition:"border-color 0.15s,box-shadow 0.15s",
})

/* ── ユーティリティ ── */
function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`
}
export const isOver = (due: string|null) => !!due && due < todayStr()
export function fmtDate(due: string|null) {
  if (!due) return null
  const d = new Date(due+"T00:00:00")
  return `${d.getMonth()+1}/${d.getDate()}`
}

/* ══════════════════════════════════════════════════════
   TaskCard
══════════════════════════════════════════════════════ */
function TaskCard({ task, index }: { task: T; index: number; key?: React.Key }) {
  const over = isOver(task.due_date)
  const due  = fmtDate(task.due_date)
  const accentColor = over ? C.danger : C.brand

  return (
    <Link
      href={`/task/?id=${task.id}`}
      className={`tc card-up`}
      style={{
        textDecoration:"none", color:"inherit", display:"block",
        background: C.surface,
        borderRadius: 16,
        border: `1px solid ${over ? C.dangerStroke : C.stroke}`,
        boxShadow: `0 2px 8px rgba(0,98,132,0.06), 0 1px 2px rgba(0,98,132,0.04)`,
        overflow:"hidden",
        animationDelay:`${Math.min(index*45,320)}ms`,
        WebkitTapHighlightColor:"transparent",
        position:"relative",
      }}
    >
      {/* 左端アクセントバー */}
      <div style={{
        position:"absolute", left:0, top:0, bottom:0, width:3,
        background: over
          ? `linear-gradient(180deg, ${C.danger}, #f07070)`
          : `linear-gradient(180deg, ${C.brand}, ${C.brandMid})`,
        borderRadius:"3px 0 0 3px",
      }}/>

      <div style={{ padding:"15px 16px 15px 20px" }}>
        {/* 上段: カテゴリ + 期日 */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
          <Chip label={task.main_category_name} accent={!over} danger={over}/>
          {due && (
            <span style={{
              display:"inline-flex", alignItems:"center", gap:4,
              fontSize:11.5, fontFamily:FM,
              color: over ? C.danger : C.muted,
              background: over ? C.dangerPale : "transparent",
              padding: over ? "1px 6px" : "0",
              borderRadius: 5,
              fontWeight: 500,
            }}>
              {over && <span style={{ fontSize:8, fontWeight:800, background:C.danger, color:"#fff", padding:"1px 4px", borderRadius:3, letterSpacing:"0.05em" }}>OVER</span>}
              {due}
            </span>
          )}
        </div>

        {/* タイトル */}
        <p style={{
          margin:"0 0 12px",
          fontSize:14.5, fontWeight:600, lineHeight:1.5,
          color:C.text, fontFamily:FB,
          letterSpacing:"-0.01em",
          display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical", overflow:"hidden",
        }}>{task.title}</p>

        {/* 下段: 担当者 + 矢印 */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div style={{ display:"flex", alignItems:"center", gap:7 }}>
            {/* アバター */}
            <div style={{
              width:24, height:24, borderRadius:"50%", flexShrink:0,
              background:`linear-gradient(135deg, ${C.brandPale}, ${C.brandFaint})`,
              border:`1.5px solid ${C.stroke}`,
              display:"flex", alignItems:"center", justifyContent:"center",
              fontSize:10, fontWeight:700, color:C.brand, fontFamily:FB,
            }}>
              {(task.created_by_name ?? "?")[0].toUpperCase()}
            </div>
            <span style={{ fontSize:11.5, color:C.muted, fontFamily:FB }}>
              {task.created_by_name}
            </span>
          </div>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.ghost} strokeWidth="2">
            <path d="M9 18l6-6-6-6"/>
          </svg>
        </div>
      </div>
    </Link>
  )
}

/* ══════════════════════════════════════════════════════
   BoardInner
══════════════════════════════════════════════════════ */
function BoardInner() {
  const [tab,    setTab]    = useState<"todo"|"doing">("todo")
  const [todo,   setTodo]   = useState<T[]>([])
  const [doing,  setDoing]  = useState<T[]>([])
  const [loading,setLoading]= useState(false)
  const [error,  setError]  = useState<string|null>(null)
  const [q,      setQ]      = useState("")
  const [mainCats,setMainCats] = useState<MainCategory[]>([])
  const [mainId, setMainId] = useState<number>(0)
  const [creator,setCreator]= useState("")
  const [onlyOver,setOnlyOver] = useState(false)
  const [filterOpen,setFilterOpen] = useState(false)
  const [qFocus, setQFocus] = useState(false)
  const [crFocus,setCrFocus]= useState(false)

  async function load() {
    setError(null); setLoading(true)
    const r = await board(); setLoading(false)
    if (!r.ok) { setError(toUserMessage(r as ApiNg,"取得に失敗しました")); return }
    setTodo(r.todo); setDoing(r.doing)
  }
  useEffect(() => {
    load()
    ;(async () => {
      const r = await listMainCategories()
      if (r.ok) setMainCats(r.main_categories.filter((c: MainCategory) => Number(c.is_active)===1))
    })()
  }, [])

  const list = useMemo(() => {
    const src = tab==="todo" ? todo : doing
    const kw  = q.trim().toLowerCase()
    const ck  = creator.trim().toLowerCase()
    return src.filter((t: T): boolean => {
      if (mainId && Number(t.main_category_id)!==mainId) return false
      if (onlyOver && !isOver(t.due_date)) return false
      if (ck && !t.created_by_name.toLowerCase().includes(ck)) return false
      if (kw && !`${t.title} ${t.main_category_name} ${t.created_by_name}`.toLowerCase().includes(kw)) return false
      return true
    })
  }, [tab,todo,doing,q,mainId,creator,onlyOver])

  const overCount = (tab==="todo" ? todo : doing).filter((t: T) => isOver(t.due_date)).length
  const hasFilter = !!q || !!creator || !!mainId || onlyOver
  const currentCount = tab==="todo" ? todo.length : doing.length

  return (
    <div style={{ minHeight:"100vh", background:C.bg, fontFamily:FB }}>
      <style dangerouslySetInnerHTML={{ __html: GLOBAL_CSS }}/>

      {/* ══ STICKY HEADER ══ */}
      <header style={{
        position:"sticky", top:0, zIndex:200,
        background:"rgba(255,255,255,0.97)",
        backdropFilter:"blur(20px) saturate(160%)",
        WebkitBackdropFilter:"blur(20px) saturate(160%)",
        borderBottom:`1px solid ${C.stroke}`,
      }}>

        {/* ── アクション行 ── */}
        <div style={{ display:"flex", alignItems:"center", gap:8, padding:"10px 14px 9px", borderBottom:`1px solid ${C.strokeSoft}` }}>
          {/* 完了一覧 */}
          <Link href="/tasks/done/" style={{
            height:38, flexShrink:0,
            display:"inline-flex", alignItems:"center", gap:6,
            padding:"0 13px", borderRadius:10,
            border:`1.5px solid ${C.stroke}`,
            background:C.surface, color:C.textSub,
            fontSize:12.5, fontWeight:600, fontFamily:FB,
            textDecoration:"none", whiteSpace:"nowrap",
            WebkitTapHighlightColor:"transparent",
            transition:"border-color 0.15s",
          }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            完了一覧
          </Link>

          {/* 新規タスク — CTA */}
          <Link href="/tasks/new/" style={{
            flex:1, height:38,
            display:"inline-flex", alignItems:"center", justifyContent:"center", gap:7,
            borderRadius:10, border:"none",
            background:C.brand, color:"#fff",
            fontSize:13.5, fontWeight:700, fontFamily:FB,
            textDecoration:"none",
            boxShadow:`0 3px 14px rgba(0,98,132,0.30), inset 0 1px 0 rgba(255,255,255,0.10)`,
            WebkitTapHighlightColor:"transparent",
            transition:"filter 0.14s, box-shadow 0.14s",
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            新規タスク
          </Link>

          {/* 更新 */}
          <button onClick={load} disabled={loading} style={{
            width:38, height:38, borderRadius:10,
            border:`1.5px solid ${C.stroke}`, background:C.surface,
            display:"flex", alignItems:"center", justifyContent:"center",
            cursor:loading?"default":"pointer", opacity:loading?0.35:1,
            flexShrink:0,
            WebkitTapHighlightColor:"transparent",
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.brand} strokeWidth="2.3"
              style={{ animation:loading?"_spin 0.7s linear infinite":"none" }}>
              <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/>
            </svg>
          </button>

          {/* フィルター */}
          <button onClick={() => setFilterOpen((v:boolean) => !v)} style={{
            width:38, height:38, flexShrink:0, borderRadius:10, position:"relative",
            border:`1.5px solid ${filterOpen||hasFilter ? C.brand : C.stroke}`,
            background:filterOpen||hasFilter ? C.brandFaint : C.surface,
            display:"flex", alignItems:"center", justifyContent:"center",
            cursor:"pointer",
            transition:"all 0.15s",
            WebkitTapHighlightColor:"transparent",
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke={filterOpen||hasFilter ? C.brand : C.muted} strokeWidth="2.2">
              <line x1="4" y1="6" x2="20" y2="6"/>
              <line x1="8" y1="12" x2="16" y2="12"/>
              <line x1="11" y1="18" x2="13" y2="18"/>
            </svg>
            {hasFilter && !filterOpen && (
              <span style={{
                position:"absolute", top:6, right:6,
                width:6, height:6, borderRadius:"50%",
                background:C.brand,
                boxShadow:`0 0 0 2px ${C.surface}`,
              }}/>
            )}
          </button>
        </div>

        {/* ── フィルターパネル ── */}
        {filterOpen && (
          <div className="slide-down" style={{
            borderBottom:`1px solid ${C.strokeSoft}`,
            background:C.brandFaint,
            padding:"12px 14px 14px",
          }}>
            <div style={{ position:"relative", marginBottom:9 }}>
              <svg style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)", pointerEvents:"none" }}
                width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={C.ghost} strokeWidth="2.4">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input className="fi" value={q}
                onChange={(e:React.ChangeEvent<HTMLInputElement>) => setQ(e.target.value)}
                onFocus={() => setQFocus(true)} onBlur={() => setQFocus(false)}
                placeholder="タイトル・カテゴリ・登録者で検索"
                style={{ ...fieldStyle(qFocus), paddingLeft:36 }}
              />
            </div>
            <div style={{ display:"flex", gap:8, marginBottom:10 }}>
              <input className="fi" value={creator}
                onChange={(e:React.ChangeEvent<HTMLInputElement>) => setCreator(e.target.value)}
                onFocus={() => setCrFocus(true)} onBlur={() => setCrFocus(false)}
                placeholder="登録者"
                style={{ ...fieldStyle(crFocus), flex:1 }}
              />
              <div style={{ flex:1.4, position:"relative" }}>
                <select className="fi" value={mainId}
                  onChange={(e:React.ChangeEvent<HTMLSelectElement>) => setMainId(Number(e.target.value))}
                  style={{
                    ...fieldStyle(false), cursor:"pointer",
                    color:mainId ? C.text : C.ghost, paddingRight:32,
                  }}>
                  <option value={0}>カテゴリ：全て</option>
                  {mainCats.map((c:MainCategory) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <svg style={{ position:"absolute", right:11, top:"50%", transform:"translateY(-50%)", pointerEvents:"none" }}
                  width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="2.4">
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </div>
            </div>
            {/* 期限超過トグル */}
            <label style={{
              display:"flex", alignItems:"center", gap:10, cursor:"pointer",
              userSelect:"none", fontSize:12.5, fontFamily:FB,
              color: onlyOver ? C.danger : C.muted,
              fontWeight: onlyOver ? 600 : 400,
            }}>
              <button type="button" onClick={() => setOnlyOver((v:boolean) => !v)} style={{
                position:"relative", width:40, height:22, borderRadius:99,
                border:"none", padding:0, cursor:"pointer", flexShrink:0,
                background: onlyOver ? "#fac8c8" : C.stroke,
                transition:"background 0.2s",
              }}>
                <span style={{
                  position:"absolute", top:3,
                  left: onlyOver ? 20 : 3,
                  width:16, height:16, borderRadius:"50%",
                  background: onlyOver ? C.danger : C.surface,
                  boxShadow:"0 1px 4px rgba(0,0,0,0.18)",
                  transition:"left 0.22s cubic-bezier(.34,1.56,.64,1)",
                  display:"block",
                }}/>
              </button>
              期限超過のみ表示
            </label>
          </div>
        )}

        {/* ── タブ行 ── */}
        <div style={{ display:"flex", position:"relative" }}>
          {(["todo","doing"] as const).map(key => {
            const on  = tab === key
            const cnt = key==="todo" ? todo.length : doing.length
            const oc  = key===tab ? overCount : 0
            const lbl = key==="todo" ? "未着手" : "進行中"
            return (
              <button key={key} onClick={() => setTab(key)} style={{
                flex:1, background:"none", border:"none", cursor:"pointer",
                padding:"11px 8px 13px",
                position:"relative",
                WebkitTapHighlightColor:"transparent",
              }}>
                {/* アクティブ下線 */}
                <div style={{
                  position:"absolute", bottom:0, left:"18%", right:"18%",
                  height:2.5, borderRadius:"2px 2px 0 0",
                  background:C.brand,
                  transform: on ? "scaleX(1)" : "scaleX(0)",
                  transformOrigin:"center",
                  transition:"transform 0.28s cubic-bezier(.34,1.56,.64,1)",
                }}/>

                {/* 件数 */}
                <div style={{ display:"flex", alignItems:"baseline", justifyContent:"center", gap:5, marginBottom:2 }}>
                  <span style={{
                    fontFamily:FB, fontWeight:800, fontSize:28, lineHeight:1,
                    letterSpacing:"-0.04em",
                    color: on ? C.brand : C.ghost,
                    transition:"color 0.2s",
                  }}>{cnt}</span>
                  {oc > 0 && (
                    <span style={{
                      fontSize:9.5, fontWeight:700, fontFamily:FB,
                      background:C.danger, color:"#fff",
                      padding:"1px 5px 2px", borderRadius:4,
                      letterSpacing:"0.04em",
                      marginBottom:2,
                    }}>!{oc}</span>
                  )}
                </div>

                <div style={{
                  fontSize:10, fontWeight: on ? 600 : 400,
                  letterSpacing:"0.12em", textTransform:"uppercase", fontFamily:FB,
                  color: on ? C.textSub : C.ghost,
                  transition:"color 0.2s",
                }}>{lbl}</div>
              </button>
            )
          })}
        </div>
      </header>

      {/* ══ CONTENT ══ */}
      <main style={{ paddingTop:"16px", paddingLeft:"14px", paddingRight:"14px", paddingBottom:"calc(var(--nav-h) + 16px + var(--safe-b))" }}>
        {error && <ErrBar msg={error}/>}

        {loading && list.length===0 && (
          <div style={{ padding:"80px 0", textAlign:"center", color:C.muted, fontSize:13 }}>
            <div style={{
              width:30, height:30, borderRadius:"50%", margin:"0 auto 14px",
              border:`2.5px solid ${C.brandPale}`, borderTopColor:C.brand,
              animation:"_spin 0.7s linear infinite",
            }}/>
            読み込み中...
          </div>
        )}

        {!loading && list.length===0 && (
          <div style={{ padding:"72px 0", textAlign:"center" }}>
            <div style={{
              width:56, height:56, borderRadius:18,
              background:C.brandFaint, border:`1.5px solid ${C.brandPale}`,
              display:"flex", alignItems:"center", justifyContent:"center",
              margin:"0 auto 18px",
            }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={C.brand} strokeWidth="1.4" opacity="0.5">
                <rect x="3" y="3" width="7" height="7" rx="1.5"/>
                <rect x="14" y="3" width="7" height="7" rx="1.5"/>
                <rect x="3" y="14" width="7" height="7" rx="1.5"/>
                <rect x="14" y="14" width="7" height="7" rx="1.5"/>
              </svg>
            </div>
            <p style={{ fontSize:15, fontWeight:700, color:C.textSub, fontFamily:FB, margin:"0 0 6px" }}>
              {hasFilter ? "条件に一致するタスクがありません" : "タスクがありません"}
            </p>
            <p style={{ fontSize:12.5, color:C.muted, margin:"0 0 20px" }}>
              {hasFilter ? "フィルターを変更してください" : "右上のボタンから作成できます"}
            </p>
            {!hasFilter && (
              <Link href="/tasks/new/" style={{
                display:"inline-flex", alignItems:"center", gap:6,
                padding:"9px 20px", borderRadius:10,
                background:C.brand, color:"#fff",
                fontSize:13, fontWeight:600, fontFamily:FB,
                textDecoration:"none",
                boxShadow:`0 3px 12px rgba(0,98,132,0.25)`,
              }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8">
                  <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                新規タスクを作成する
              </Link>
            )}
          </div>
        )}

        {list.length > 0 && (
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            {list.map((t:T, i:number) => <TaskCard key={t.id} task={t} index={i}/>)}
          </div>
        )}
      </main>
    </div>
  )
}

export default function TasksPage() { return <Guard><BoardInner/></Guard> }
