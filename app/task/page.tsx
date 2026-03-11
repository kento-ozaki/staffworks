"use client"

import React from "react"
import Link from "next/link"
import { Suspense, useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Guard } from "@/components/Guard"
import { me, type User } from "@/lib/auth"
import type { ApiNg } from "@/lib/api"
import { toUserMessage } from "@/lib/errors"
import { getTask, progressTask, deleteTask, updateTask, type TaskDetailSub, type TaskSubProgress, type TaskEvent } from "@/lib/tasks"
import { C, FB, FM, GLOBAL_CSS, ErrBar, Chip, fieldStyle } from "../tasks/page"

/* ─────────────────────────────────────────────
   ページ固有アニメーション
───────────────────────────────────────────── */
const PAGE_CSS = `
@keyframes _sheetUp {
  from { transform: translateY(100%); opacity: 0.7; }
  to   { transform: translateY(0);    opacity: 1;   }
}
@keyframes _overlayIn { from { opacity: 0; } to { opacity: 1; } }
.sheet      { animation: _sheetUp   0.32s cubic-bezier(.22,1,.36,1) both; }
.overlay-in { animation: _overlayIn 0.22s ease both; }
`

/* ── StatusBadge ── */
const ST: Record<string,{label:string;color:string;bg:string;border:string}> = {
  todo:  { label:"未着手", color:C.muted,  bg:C.bg,         border:C.stroke      },
  doing: { label:"進行中", color:C.brand,  bg:C.brandFaint, border:C.brandPale   },
  done:  { label:"完了",   color:C.done,   bg:C.donePale,   border:C.doneStroke  },
}
function StatusBadge({ status }: { status: string }) {
  const s = ST[status] ?? ST.todo
  return (
    <span style={{
      display:"inline-flex", alignItems:"center", gap:5,
      padding:"4px 11px 5px", borderRadius:8,
      border:`1px solid ${s.border}`, background:s.bg,
      fontSize:12, fontWeight:600, color:s.color, fontFamily:FB,
    }}>
      <span style={{ width:7, height:7, borderRadius:"50%", background:s.color, flexShrink:0 }}/>
      {s.label}
    </span>
  )
}

/* ── InfoRow ── */
function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display:"flex", alignItems:"baseline", gap:10, padding:"9px 0", borderBottom:`1px solid ${C.strokeSoft}` }}>
      <span style={{ flexShrink:0, width:52, fontSize:10, fontWeight:700, letterSpacing:"0.10em", textTransform:"uppercase", color:C.muted, fontFamily:FB }}>{label}</span>
      <span style={{ fontSize:13.5, color:C.textSub, fontFamily:FB, fontWeight:500 }}>{value}</span>
    </div>
  )
}

/* ── SectionLabel ── */
function SLabel({ text, accent }: { text: string; accent?: string }) {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:12 }}>
      {accent && <div style={{ width:3, height:12, borderRadius:2, background:accent, flexShrink:0 }}/>}
      <span style={{ fontSize:10, fontWeight:700, letterSpacing:"0.12em", textTransform:"uppercase", color:C.muted, fontFamily:FB }}>{text}</span>
    </div>
  )
}

/* ── TLRow ── */
function TLRow({ ev, last, nameMap }: { ev:TaskEvent; last:boolean; nameMap:Map<number,string>; key?:React.Key }) {
  const mapN = (ids?:number[]) => (ids??[]).map(id => nameMap.get(Number(id))??String(id)).join("、")
  const ch   = ev.changed_subcats
  const tags: {text:string;bg:string;border:string;color:string}[] = [
    ...(ch?.progress?.length??0)>0?[{text:`進捗: ${mapN(ch?.progress)}`,bg:C.warnPale,  border:C.warnStroke,  color:C.warn }]:[],
    ...(ch?.done?.length    ??0)>0?[{text:`完了: ${mapN(ch?.done)}`,    bg:C.donePale,  border:C.doneStroke,  color:C.done }]:[],
    ...(ch?.undone?.length  ??0)>0?[{text:`戻し: ${mapN(ch?.undone)}`,  bg:C.bg,        border:C.stroke,      color:C.muted}]:[],
  ]
  return (
    <div style={{ display:"grid", gridTemplateColumns:"16px 1fr", gap:"0 12px" }}>
      <div style={{ display:"flex", flexDirection:"column", alignItems:"center" }}>
        <div style={{ width:9, height:9, borderRadius:"50%", marginTop:3, flexShrink:0, background:C.surface, border:`2px solid ${C.brand}` }}/>
        {!last && <div style={{ width:1.5, flex:1, background:C.strokeSoft, margin:"3px 0 0" }}/>}
      </div>
      <div style={{ paddingBottom: last?0:20 }}>
        <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap", marginBottom:5 }}>
          <span style={{ fontSize:12.5, fontWeight:600, color:C.text,  fontFamily:FB }}>{ev.created_by_name}</span>
          <span style={{ fontSize:11,   color:C.ghost, fontFamily:FM }}>{ev.created_at}</span>
          {tags.map((tg,i) => (
            <span key={i} style={{
              padding:"2px 7px", borderRadius:5,
              border:`1px solid ${tg.border}`, background:tg.bg,
              color:tg.color, fontSize:10, fontWeight:700, fontFamily:FB,
            }}>{tg.text}</span>
          ))}
        </div>
        {ev.note && (
          <p style={{
            margin:0, fontSize:13, color:C.textSub, lineHeight:1.8, whiteSpace:"pre-wrap", fontFamily:FB,
            padding:"9px 12px", background:C.surfaceRaised, borderRadius:9, border:`1px solid ${C.strokeSoft}`,
          }}>{ev.note}</p>
        )}
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════
   ProgressSheet
══════════════════════════════════════════════════════ */
interface SheetProps {
  openSubs: TaskDetailSub[]
  loading:  boolean
  error:    string|null
  onClose:  () => void
  onSubmit: (action:"update"|"complete", selIds:number[], note:string) => Promise<void>
}
function ProgressSheet({ openSubs, loading, error, onClose, onSubmit }: SheetProps) {
  const [action,  setAction]  = useState<"update"|"complete">("update")
  const [selIds,  setSelIds]  = useState<number[]>([])
  const [note,    setNote]    = useState("")
  const [focused, setFocused] = useState(false)

  const isComplete  = action === "complete"
  const accentColor = isComplete ? C.done      : C.brand
  const accentBg    = isComplete ? C.donePale  : C.brandFaint
  const accentBdr   = isComplete ? C.doneStroke : C.brandPale
  const accentGlow  = isComplete ? "rgba(23,121,74,0.26)" : "rgba(0,98,132,0.26)"

  function toggleId(id: number) { setSelIds((p:number[]) => p.includes(id) ? p.filter((x:number)=>x!==id) : [...p,id]) }
  function selectAll() { setSelIds(openSubs.map(s=>s.id)) }
  function switchAction(a: "update"|"complete") { setAction(a); setSelIds([]) }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    await onSubmit(action, selIds, note)
  }

  return (
    <>
      <div className="overlay-in" onClick={onClose} style={{
        position:"fixed", inset:0, zIndex:300,
        background:"rgba(15,32,40,0.45)",
        backdropFilter:"blur(3px)", WebkitBackdropFilter:"blur(3px)",
      }}/>
      <div className="sheet" style={{
        position:"fixed", bottom:"var(--nav-h)", left:0, right:0, zIndex:400,
        background:C.surface, borderRadius:"22px 22px 0 0",
        boxShadow:"0 -8px 40px rgba(0,98,132,0.18)",
        maxHeight:"calc(88vh - var(--nav-h))", display:"flex", flexDirection:"column", overflow:"hidden",
      }}>
        {/* ヘッダー */}
        <div style={{ padding:"10px 18px 14px", borderBottom:`1px solid ${C.strokeSoft}`, flexShrink:0 }}>
          <div style={{ width:40, height:4, borderRadius:99, background:C.stroke, margin:"0 auto 14px" }}/>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
            <div>
              <p style={{ margin:"0 0 2px", fontSize:10, fontWeight:700, color:accentColor, letterSpacing:"0.14em", textTransform:"uppercase", fontFamily:FB }}>
                {isComplete ? "Complete Task" : "Update Progress"}
              </p>
              <h2 style={{ margin:0, fontSize:18, fontWeight:800, color:C.text, fontFamily:FB, letterSpacing:"-0.02em" }}>
                進捗を記録する
              </h2>
            </div>
            <button onClick={onClose} style={{
              width:34, height:34, borderRadius:99,
              border:`1.5px solid ${C.stroke}`, background:C.bg,
              display:"flex", alignItems:"center", justifyContent:"center",
              cursor:"pointer", color:C.muted, WebkitTapHighlightColor:"transparent",
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        </div>

        {/* スクロール領域 */}
        <div style={{ overflowY:"auto", flex:1, padding:"18px 18px 0" }}>
          {error && <ErrBar msg={error}/>}
          <form id="progress-form" onSubmit={handleSubmit} style={{ display:"grid", gap:22, paddingBottom:24 }}>

            {/* ① 操作選択 */}
            <div>
              <SLabel text="操作を選択" accent={accentColor}/>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:9 }}>
                {(["update","complete"] as const).map(a => {
                  const on  = action === a
                  const ac  = a === "complete"
                  const col = ac ? C.done  : C.brand
                  const bg  = ac ? C.donePale  : C.brandFaint
                  const bdr = ac ? C.doneStroke : C.brandPale
                  return (
                    <button key={a} type="button" onClick={() => switchAction(a)} style={{
                      padding:"14px 12px 12px", borderRadius:14, cursor:"pointer", fontFamily:FB,
                      border:`2px solid ${on ? bdr : C.stroke}`,
                      background: on ? bg : C.surface,
                      color: on ? col : C.muted,
                      display:"flex", flexDirection:"column", alignItems:"flex-start", gap:7,
                      transition:"all 0.18s cubic-bezier(.22,1,.36,1)",
                      WebkitTapHighlightColor:"transparent",
                      textAlign:"left",
                    }}>
                      <span style={{ color: on ? col : C.ghost }}>
                        {ac
                          ? <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><polyline points="20 6 9 17 4 12"/></svg>
                          : <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/></svg>
                        }
                      </span>
                      <span style={{ fontSize:13.5, fontWeight:on?700:500, lineHeight:1.2 }}>
                        {a==="update" ? "進捗を更新" : "完了にする"}
                      </span>
                      <span style={{ fontSize:11, color:on?col:C.ghost, opacity:0.8, lineHeight:1.45 }}>
                        {a==="update" ? "作業中の内容を記録" : "タスクを完了としてマーク"}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* ② サブカテゴリ */}
            {openSubs.length > 0 && (
              <div>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12 }}>
                  <SLabel text={isComplete ? "完了にするカテゴリ" : "進捗を記録するカテゴリ"} accent={accentColor}/>
                  {isComplete && (
                    <button type="button" onClick={selectAll} style={{
                      marginBottom:12, height:26, padding:"0 11px", borderRadius:7,
                      border:`1.5px solid ${C.doneStroke}`, background:C.donePale,
                      color:C.done, fontSize:11.5, fontWeight:700,
                      cursor:"pointer", fontFamily:FB, WebkitTapHighlightColor:"transparent",
                    }}>全て選択</button>
                  )}
                </div>
                <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
                  {openSubs.map(s => {
                    const on = selIds.includes(s.id)
                    return (
                      <button key={s.id} type="button" onClick={() => toggleId(s.id)} style={{
                        padding:"7px 14px", borderRadius:10, cursor:"pointer", fontFamily:FB,
                        border:`1.5px solid ${on ? accentBdr : C.stroke}`,
                        background: on ? accentBg : C.surfaceRaised,
                        color: on ? accentColor : C.textSub,
                        fontSize:13.5, fontWeight:on?700:400,
                        display:"inline-flex", alignItems:"center", gap:6,
                        transition:"all 0.14s",
                        WebkitTapHighlightColor:"transparent",
                      }}>
                        {on && <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={accentColor} strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>}
                        {s.name}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* ③ メモ */}
            <div>
              <SLabel text="詳細メモ（必須 · 履歴に残ります）" accent={accentColor}/>
              <textarea className="fi" value={note}
                onChange={(e:React.ChangeEvent<HTMLTextAreaElement>) => setNote(e.target.value)}
                onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
                placeholder="作業内容・変更点などを記録してください" rows={4}
                style={{ ...fieldStyle(focused), lineHeight:1.8, fontSize:14 }}
              />
            </div>
          </form>
        </div>

        {/* 固定フッター */}
        <div style={{ paddingTop:"12px", paddingLeft:"18px", paddingRight:"18px", paddingBottom:"calc(28px + var(--safe-b))", borderTop:`1px solid ${C.strokeSoft}`, background:C.surface, flexShrink:0 }}>
          <button type="submit" form="progress-form" disabled={loading} style={{
            width:"100%", height:52, borderRadius:14, border:"none",
            background: loading ? C.ghost : accentColor, color:"#fff",
            fontSize:15, fontWeight:800, fontFamily:FB,
            cursor: loading ? "not-allowed" : "pointer",
            boxShadow: loading ? "none" : `0 4px 20px ${accentGlow}, inset 0 1px 0 rgba(255,255,255,0.10)`,
            transition:"all 0.18s",
            display:"flex", alignItems:"center", justifyContent:"center", gap:9,
            WebkitTapHighlightColor:"transparent",
          }}>
            {loading
              ? <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" style={{ animation:"_spin 0.8s linear infinite" }}><path d="M21 12a9 9 0 11-6.22-8.56"/></svg>処理中...</>
              : isComplete
                ? <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.8"><polyline points="20 6 9 17 4 12"/></svg>完了として登録する</>
                : <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4"><line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/></svg>進捗を登録する</>
            }
          </button>
        </div>
      </div>
    </>
  )
}

/* ══════════════════════════════════════════════════════
   EditSheet（管理者）
══════════════════════════════════════════════════════ */
interface EditSheetProps {
  task:    any
  loading: boolean
  error:   string|null
  onClose: () => void
  onSave:  (title:string, detail:string, due:string) => Promise<void>
}
function EditSheet({ task, loading, error, onClose, onSave }: EditSheetProps) {
  const [title,   setTitle]   = useState(task.title  ?? "")
  const [detail,  setDetail]  = useState(task.detail ?? "")
  const [due,     setDue]     = useState(task.due_date ?? "")
  const [focused, setFocused] = useState<string|null>(null)
  const INP = (n:string): React.CSSProperties => fieldStyle(focused===n)
  const FL: React.CSSProperties = { margin:"0 0 7px", fontSize:10.5, fontWeight:600, color:C.muted, letterSpacing:"0.10em", textTransform:"uppercase", fontFamily:FB }

  async function handleSubmit(e:React.FormEvent<HTMLFormElement>) { e.preventDefault(); await onSave(title,detail,due) }

  return (
    <>
      <div className="overlay-in" onClick={onClose} style={{
        position:"fixed", inset:0, zIndex:300,
        background:"rgba(15,32,40,0.45)",
        backdropFilter:"blur(3px)", WebkitBackdropFilter:"blur(3px)",
      }}/>
      <div className="sheet" style={{
        position:"fixed", bottom:"var(--nav-h)", left:0, right:0, zIndex:400,
        background:C.surface, borderRadius:"22px 22px 0 0",
        boxShadow:"0 -8px 40px rgba(0,98,132,0.18)",
        maxHeight:"calc(85vh - var(--nav-h))", display:"flex", flexDirection:"column", overflow:"hidden",
      }}>
        <div style={{ padding:"10px 18px 14px", borderBottom:`1px solid ${C.strokeSoft}`, flexShrink:0 }}>
          <div style={{ width:40, height:4, borderRadius:99, background:C.stroke, margin:"0 auto 14px" }}/>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
            <div>
              <p style={{ margin:"0 0 2px", fontSize:10, fontWeight:700, color:C.warn, letterSpacing:"0.14em", textTransform:"uppercase", fontFamily:FB }}>Admin Only</p>
              <h2 style={{ margin:0, fontSize:18, fontWeight:800, color:C.text, fontFamily:FB }}>タスクを編集</h2>
            </div>
            <button onClick={onClose} style={{
              width:34, height:34, borderRadius:99,
              border:`1.5px solid ${C.stroke}`, background:C.bg,
              display:"flex", alignItems:"center", justifyContent:"center",
              cursor:"pointer", color:C.muted, WebkitTapHighlightColor:"transparent",
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        </div>
        <div style={{ overflowY:"auto", flex:1, padding:"16px 18px 0" }}>
          {error && <ErrBar msg={error}/>}
          <form id="edit-form" onSubmit={handleSubmit} style={{ display:"grid", gap:16, paddingBottom:24 }}>
            <div><p style={FL}>タイトル *</p>
              <input className="fi" value={title} onChange={(e:React.ChangeEvent<HTMLInputElement>)=>setTitle(e.target.value)}
                onFocus={()=>setFocused("eT")} onBlur={()=>setFocused(null)} style={INP("eT")}/>
            </div>
            <div><p style={FL}>詳細</p>
              <textarea className="fi" value={detail} onChange={(e:React.ChangeEvent<HTMLTextAreaElement>)=>setDetail(e.target.value)}
                onFocus={()=>setFocused("eD")} onBlur={()=>setFocused(null)} rows={4} style={{...INP("eD"),lineHeight:1.75}}/>
            </div>
            <div><p style={FL}>期日</p>
              <input type="date" className="fi" value={due} onChange={(e:React.ChangeEvent<HTMLInputElement>)=>setDue(e.target.value)}
                onFocus={()=>setFocused("eDu")} onBlur={()=>setFocused(null)} style={{...INP("eDu"),maxWidth:200}}/>
            </div>
          </form>
        </div>
        <div style={{ paddingTop:"12px", paddingLeft:"18px", paddingRight:"18px", paddingBottom:"calc(28px + var(--safe-b))", borderTop:`1px solid ${C.strokeSoft}`, background:C.surface, flexShrink:0 }}>
          <button type="submit" form="edit-form" disabled={loading} style={{
            width:"100%", height:52, borderRadius:14, border:"none",
            background: loading ? C.ghost : C.warn, color:"#fff",
            fontSize:15, fontWeight:800, fontFamily:FB,
            cursor: loading?"not-allowed":"pointer",
            boxShadow: loading?"none":"0 4px 20px rgba(181,90,0,0.25)",
            display:"flex", alignItems:"center", justifyContent:"center", gap:8,
            WebkitTapHighlightColor:"transparent",
          }}>変更を保存する</button>
        </div>
      </div>
    </>
  )
}

/* ══════════════════════════════════════════════════════
   TaskPageInner
══════════════════════════════════════════════════════ */
function TaskPageInner() {
  const router = useRouter()
  const sp     = useSearchParams()
  const id     = Number(sp.get("id") ?? 0)

  const [meUser,  setMeUser]  = useState<User|null>(null)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string|null>(null)
  const [task,    setTask]    = useState<any>(null)
  const [subs,    setSubs]    = useState<TaskDetailSub[]>([])
  const [prog,    setProg]    = useState<TaskSubProgress[]>([])
  const [events,  setEvents]  = useState<TaskEvent[]>([])
  const [showProgress, setShowProgress] = useState(false)
  const [showEdit,     setShowEdit]     = useState(false)

  const isAdmin   = meUser?.role === "admin"
  const progMap   = useMemo(() => { const m=new Map<number,TaskSubProgress>(); prog.forEach((p:TaskSubProgress)=>m.set(Number(p.sub_category_id),p)); return m },[prog])
  const nameMap   = useMemo(() => { const m=new Map<number,string>(); subs.forEach((s:TaskDetailSub)=>m.set(s.id,s.name)); return m },[subs])
  const openSubs  = useMemo(() => subs.filter((s:TaskDetailSub)=>Number(progMap.get(s.id)?.is_done??0)===0),[subs,progMap])
  const doneCount = subs.length - openSubs.length

  async function load() {
    if (!id) return; setError(null); setLoading(true)
    const r = await getTask(id); setLoading(false)
    if (!r.ok) { setError(toUserMessage(r as ApiNg,"取得に失敗しました")); return }
    setTask(r.task); setSubs(r.sub_categories); setProg(r.progress); setEvents(r.events)
  }
  useEffect(()=>{ ;(async()=>{ const r=await me(); if(r.ok) setMeUser(r.user) })() },[])
  useEffect(()=>{ load() },[id])

  async function onSubmitProgress(action:"update"|"complete", selIds:number[], note:string) {
    if (!task) return; setError(null)
    if (!note.trim()) { setError("詳細メモは必須です"); return }
    if (openSubs.length>0 && selIds.length===0) { setError("カテゴリを1つ以上選択してください"); return }
    setLoading(true)
    const r = await progressTask({
      id:task.id, action, note:note.trim(),
      progress_sub_category_ids: action==="update"   ? selIds : [],
      done_sub_category_ids:     action==="complete" ? selIds : [],
      undone_sub_category_ids:   [],
    })
    setLoading(false)
    if (!r.ok) { setError(toUserMessage(r as ApiNg,"更新に失敗しました")); return }
    setShowProgress(false)
    await load()
    if ((r as any).status==="done" && Number((r as any).remaining_open_subcats??0)===0) router.replace("/tasks/done/")
  }

  async function onSaveEdit(title:string, detail:string, due:string) {
    if (!task) return; setError(null)
    if (!title.trim()) { setError("タイトルは必須です"); return }
    setLoading(true)
    const r = await updateTask({id:task.id, title:title.trim(), detail, due_date:due})
    setLoading(false)
    if (!r.ok) { setError(toUserMessage(r as ApiNg,"保存に失敗しました")); return }
    setShowEdit(false); await load()
  }

  async function onReopen() {
    if (!task) return; setError(null)
    const r = await progressTask({id:task.id, action:"reopen", note:"再オープン"})
    if (!r.ok) { setError(toUserMessage(r as ApiNg,"再オープンに失敗しました")); return }
    router.replace("/tasks/")
  }

  async function onDelete() {
    if (!task||!confirm("このタスクを削除しますか？")) return; setError(null)
    const r = await deleteTask(task.id)
    if (!r.ok) { setError(toUserMessage(r as ApiNg,"削除に失敗しました")); return }
    router.replace("/tasks/")
  }

  const canProgress = task && task.status !== "done"

  if (!id) return (
    <div style={{ background:C.bg, minHeight:"100vh", padding:28, fontFamily:FB, color:C.danger }}>
      IDが指定されていません。<Link href="/tasks/" style={{ color:C.brand }}>一覧へ</Link>
    </div>
  )

  return (
    <div style={{ minHeight:"100vh", background:C.bg, fontFamily:FB }}>
      <style dangerouslySetInnerHTML={{ __html: GLOBAL_CSS + PAGE_CSS }}/>

      {/* ── ヘッダー ── */}
      <header style={{
        position:"sticky", top:0, zIndex:100,
        background:"rgba(255,255,255,0.97)",
        backdropFilter:"blur(20px)", WebkitBackdropFilter:"blur(20px)",
        borderBottom:`1px solid ${C.stroke}`,
        padding:"12px 14px 13px",
        display:"flex", alignItems:"center", gap:10,
      }}>
        <Link href="/tasks/" style={{
          width:36, height:36, borderRadius:10, flexShrink:0,
          border:`1.5px solid ${C.stroke}`, background:C.surface,
          display:"flex", alignItems:"center", justifyContent:"center",
          color:C.muted, textDecoration:"none", WebkitTapHighlightColor:"transparent",
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
          </svg>
        </Link>
        <div style={{ flex:1 }}>
          <p style={{ margin:"0 0 2px", fontSize:10, fontWeight:700, color:C.brand, letterSpacing:"0.14em", textTransform:"uppercase", fontFamily:FB }}>Task Detail</p>
          <h1 style={{ margin:0, fontFamily:FB, fontWeight:800, fontSize:20, color:C.text, letterSpacing:"-0.03em" }}>タスク詳細</h1>
        </div>
        <div style={{ display:"flex", gap:7 }}>
          {task?.status==="done" && isAdmin && (
            <button onClick={onReopen} style={{
              height:32, padding:"0 12px", borderRadius:8,
              border:`1.5px solid ${C.stroke}`, background:C.surface,
              color:C.textSub, fontSize:12, fontWeight:600,
              cursor:"pointer", fontFamily:FB, WebkitTapHighlightColor:"transparent",
            }}>再オープン</button>
          )}
          {task && (
            <button onClick={onDelete} style={{
              height:32, padding:"0 12px", borderRadius:8,
              border:`1.5px solid ${C.dangerStroke}`, background:C.dangerPale,
              color:C.danger, fontSize:12, fontWeight:600,
              cursor:"pointer", fontFamily:FB, WebkitTapHighlightColor:"transparent",
            }}>削除</button>
          )}
        </div>
      </header>

      {/* ── コンテンツ ── */}
      <main style={{ paddingTop:"14px", paddingLeft:"14px", paddingRight:"14px", paddingBottom:"calc(var(--nav-h) + 56px + var(--safe-b))", display:"flex", flexDirection:"column", gap:12 }}>
        {error && !showProgress && !showEdit && <ErrBar msg={error}/>}

        {!task ? (
          <div style={{ padding:"80px 0", textAlign:"center", color:C.muted, fontSize:13 }}>
            <div style={{
              width:30, height:30, borderRadius:"50%", margin:"0 auto 14px",
              border:`2.5px solid ${C.brandPale}`, borderTopColor:C.brand,
              animation:"_spin 0.7s linear infinite",
            }}/>読み込み中...
          </div>
        ) : (<>

          {/* ═══ タスク情報 ═══ */}
          <div style={{
            background:C.surface, borderRadius:18,
            border:`1px solid ${C.stroke}`,
            boxShadow:`0 2px 12px rgba(0,98,132,0.06)`,
            overflow:"hidden",
          }}>
            {/* 上端アクセントバー */}
            <div style={{
              height:3,
              background: task.status==="done"
                ? `linear-gradient(90deg, ${C.done}, #28a065)`
                : `linear-gradient(90deg, ${C.brand}, ${C.brandMid})`,
            }}/>
            <div style={{ padding:"16px 16px 20px" }}>
              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:14, flexWrap:"wrap" }}>
                <StatusBadge status={task.status}/>
                <Chip label={task.main_category_name} accent/>
              </div>
              <h2 style={{
                margin:"0 0 14px",
                fontFamily:FB, fontSize:20, fontWeight:800,
                color:C.text, lineHeight:1.45, letterSpacing:"-0.02em",
              }}>{task.title}</h2>
              {task.detail && (
                <p style={{
                  margin:"0 0 16px", fontSize:13.5, color:C.textSub,
                  lineHeight:1.85, whiteSpace:"pre-wrap", fontFamily:FB,
                  padding:"12px 14px",
                  background:C.surfaceRaised, borderRadius:10,
                  border:`1px solid ${C.strokeSoft}`,
                }}>{task.detail}</p>
              )}
              <div style={{ borderTop:`1px solid ${C.strokeSoft}` }}>
                <InfoRow label="期限"   value={<span style={{ fontFamily:FM }}>{task.due_date??"なし"}</span>}/>
                <InfoRow label="登録者" value={task.created_by_name}/>
                <div style={{ padding:"8px 0", display:"flex", gap:10, alignItems:"center" }}>
                  <span style={{ flexShrink:0, width:52, fontSize:10, fontWeight:700, letterSpacing:"0.10em", textTransform:"uppercase", color:C.muted, fontFamily:FB }}>登録日</span>
                  <span style={{ fontSize:11.5, color:C.ghost, fontFamily:FM }}>{task.created_at}</span>
                </div>
              </div>
            </div>
            {/* 管理者編集ボタン（完了時のみ） */}
            {task.status==="done" && isAdmin && (
              <div style={{ padding:"0 16px 16px" }}>
                <button onClick={()=>setShowEdit(true)} style={{
                  width:"100%", height:38, borderRadius:10,
                  border:`1.5px solid ${C.warnStroke}`, background:C.warnPale,
                  color:C.warn, fontSize:13, fontWeight:600,
                  cursor:"pointer", fontFamily:FB,
                  display:"flex", alignItems:"center", justifyContent:"center", gap:7,
                  WebkitTapHighlightColor:"transparent",
                }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                  内容を編集する（管理者）
                </button>
              </div>
            )}
          </div>

          {/* ═══ サブカテゴリ ═══ */}
          {subs.length > 0 && (
            <div style={{
              background:C.surface, borderRadius:16,
              border:`1px solid ${C.stroke}`,
              boxShadow:`0 2px 8px rgba(0,98,132,0.05)`,
              padding:"16px",
            }}>
              <SLabel text="サブカテゴリ" accent={C.done}/>
              <div style={{ marginBottom:14 }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:7, alignItems:"baseline" }}>
                  <span style={{ fontSize:12, color:C.muted, fontFamily:FB }}>完了状況</span>
                  <span style={{ fontSize:13.5, fontWeight:700, color:C.brand, fontFamily:FM }}>
                    {doneCount}<span style={{ fontSize:10, color:C.muted, fontWeight:400 }}> / {subs.length}</span>
                  </span>
                </div>
                <div style={{ height:6, background:C.strokeSoft, borderRadius:99, overflow:"hidden" }}>
                  <div style={{
                    height:"100%",
                    width:`${subs.length===0?0:(doneCount/subs.length)*100}%`,
                    background:`linear-gradient(90deg, ${C.done}, #28a065)`,
                    borderRadius:99, transition:"width 0.5s cubic-bezier(.22,1,.36,1)",
                  }}/>
                </div>
              </div>
              <div style={{ display:"flex", flexWrap:"wrap", gap:7 }}>
                {subs.map((s:TaskDetailSub) => {
                  const done = Number(progMap.get(s.id)?.is_done??0)===1
                  return (
                    <span key={s.id} style={{
                      padding:"5px 12px", borderRadius:9, fontFamily:FB,
                      border:`1.5px solid ${done?C.doneStroke:C.stroke}`,
                      background: done?C.donePale:C.surfaceRaised,
                      color: done?C.done:C.muted,
                      fontSize:12.5, fontWeight:done?600:400,
                      display:"inline-flex", alignItems:"center", gap:5,
                    }}>
                      {done && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={C.done} strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>}
                      {s.name}
                    </span>
                  )
                })}
              </div>
            </div>
          )}

          {/* ═══ 履歴 ═══ */}
          <div style={{
            background:C.surface, borderRadius:16,
            border:`1px solid ${C.stroke}`,
            boxShadow:`0 2px 8px rgba(0,98,132,0.05)`,
            padding:"16px",
          }}>
            <SLabel text={`履歴  ${events.length}件`} accent={C.ghost}/>
            {events.length===0
              ? <p style={{ margin:0, fontSize:13, color:C.ghost, fontFamily:FB }}>まだ履歴がありません</p>
              : <div>{events.map((ev:TaskEvent,idx:number) => <TLRow key={ev.id} ev={ev} last={idx===events.length-1} nameMap={nameMap}/>)}</div>
            }
          </div>

        </>)}
      </main>

      {/* ── 固定フッターCTA ── */}
      {canProgress && (
        <div style={{
          position:"fixed", bottom:"var(--nav-h)", left:0, right:0, zIndex:100,
          padding:"12px 14px 16px",
          background:"rgba(255,255,255,0.97)",
          backdropFilter:"blur(16px)", WebkitBackdropFilter:"blur(16px)",
          borderTop:`1px solid ${C.stroke}`,
        }}>
          <button onClick={()=>setShowProgress(true)} style={{
            width:"100%", height:52, borderRadius:14, border:"none",
            background:C.brand, color:"#fff",
            fontSize:15, fontWeight:800, fontFamily:FB,
            cursor:"pointer",
            boxShadow:`0 4px 20px rgba(0,98,132,0.28), inset 0 1px 0 rgba(255,255,255,0.10)`,
            display:"flex", alignItems:"center", justifyContent:"center", gap:9,
            WebkitTapHighlightColor:"transparent",
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.6">
              <line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/>
            </svg>
            進捗を更新する
          </button>
        </div>
      )}

      {/* ── ProgressSheet ── */}
      {showProgress && task && (
        <ProgressSheet
          openSubs={openSubs}
          loading={loading}
          error={error}
          onClose={() => { setShowProgress(false); setError(null) }}
          onSubmit={onSubmitProgress}
        />
      )}

      {/* ── EditSheet ── */}
      {showEdit && task && (
        <EditSheet
          task={task}
          loading={loading}
          error={error}
          onClose={() => { setShowEdit(false); setError(null) }}
          onSave={onSaveEdit}
        />
      )}
    </div>
  )
}

export default function TaskPage() {
  return (
    <Guard>
      <Suspense fallback={
        <div style={{ background:C.bg, minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", color:C.muted, fontFamily:FB }}>
          読み込み中...
        </div>
      }>
        <TaskPageInner/>
      </Suspense>
    </Guard>
  )
}
