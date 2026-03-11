"use client"

import Link from "next/link"
import { Suspense, useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Guard } from "@/components/Guard"
import { me, type User } from "@/lib/auth"
import type { ApiNg } from "@/lib/api"
import { toUserMessage } from "@/lib/errors"
import { getTask, progressTask, deleteTask, updateTask, type TaskDetailSub, type TaskSubProgress, type TaskEvent } from "@/lib/tasks"

import { C, FD, FB, FM, GLOBAL_CSS, ErrorBar, FormSection, inputStyle } from "../tasks/page"

/* ━━━ ステータス定義 ━━━ */
const STATUS_DEF: Record<string, { label:string; color:string; bg:string; border:string; dot:string }> = {
  todo:  { label:"未着手", color:C.muted,    bg:C.surfaceSub, border:C.line,     dot:C.muted    },
  doing: { label:"進行中", color:C.brand,    bg:C.brandPale,  border:"#aad4e0",  dot:C.brand    },
  done:  { label:"完了",   color:C.done,     bg:C.donePale,   border:C.doneLine, dot:C.done     },
}

function StatusChip({ status }: { status: string }) {
  const s = STATUS_DEF[status] ?? STATUS_DEF.todo
  return (
    <span style={{
      display:"inline-flex", alignItems:"center", gap:6,
      padding:"5px 11px", borderRadius:99,
      border:`1.5px solid ${s.border}`, background:s.bg,
      fontSize:11.5, fontWeight:700, color:s.color, fontFamily:FD,
    }}>
      <span style={{ width:6, height:6, borderRadius:"50%", background:s.dot }}/>
      {s.label}
    </span>
  )
}

/* ━━━ セクションカード ━━━ */
function SectionCard({ title, children, accent }: {
  title: string; children: React.ReactNode; accent?: string
}) {
  return (
    <div style={{
      background:C.surface, borderRadius:20,
      border:`1px solid ${C.line}`,
      boxShadow:`0 2px 16px rgba(0,98,132,0.06)`,
      overflow:"hidden",
    }}>
      <div style={{
        padding:"12px 18px 11px",
        borderBottom:`1px solid ${C.lineSoft}`,
        background:C.surfaceSub,
        display:"flex", alignItems:"center", gap:8,
      }}>
        {accent && (
          <div style={{ width:3, height:14, borderRadius:99, background:accent }}/>
        )}
        <p style={{
          margin:0, fontSize:10, fontWeight:700,
          color:C.sub, letterSpacing:"0.12em",
          textTransform:"uppercase", fontFamily:FD,
        }}>{title}</p>
      </div>
      <div style={{ padding:"18px 18px" }}>{children}</div>
    </div>
  )
}

/* ━━━ タイムラインイベント ━━━ */
function TimelineEvent({ ev, isLast, subNameMap }: {
  ev: TaskEvent; isLast: boolean; subNameMap: Map<number,string>
}) {
  const mapN = (ids?: number[]) =>
    (ids ?? []).map(sid => subNameMap.get(Number(sid)) ?? String(sid)).join("、")
  const ch = ev.changed_subcats

  const badges = [
    ...(ch?.progress?.length ?? 0) > 0
      ? [{ label:`進捗: ${mapN(ch?.progress)}`, bg:C.progPale??C.brandPale, border:"#e0c84a", color:"#7a5f00" }] : [],
    ...(ch?.done?.length ?? 0) > 0
      ? [{ label:`完了: ${mapN(ch?.done)}`,     bg:C.donePale,  border:C.doneLine,  color:C.done     }] : [],
    ...(ch?.undone?.length ?? 0) > 0
      ? [{ label:`戻し: ${mapN(ch?.undone)}`,   bg:C.surfaceSub, border:C.line,     color:C.muted    }] : [],
  ]

  return (
    <div style={{ display:"grid", gridTemplateColumns:"18px 1fr", gap:"0 14px" }}>
      {/* 軸 */}
      <div style={{ display:"flex", flexDirection:"column", alignItems:"center" }}>
        <div style={{
          width:10, height:10, borderRadius:"50%", flexShrink:0, marginTop:5,
          background:C.brand, border:`2px solid ${C.bg}`,
          outline:`2px solid ${C.brand}`,
        }}/>
        {!isLast && <div style={{ width:1, flex:1, background:C.line, margin:"3px 0 0" }}/>}
      </div>
      {/* コンテンツ */}
      <div style={{ paddingBottom: isLast ? 0 : 20 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:8, flexWrap:"wrap", marginBottom:8 }}>
          <p style={{ margin:0, fontSize:11.5, color:C.muted, fontFamily:FB }}>
            <strong style={{ color:C.sub }}>{ev.created_by_name}</strong>
            <span style={{ margin:"0 6px", opacity:0.4 }}>·</span>
            {ev.created_at}
          </p>
          {badges.length > 0 && (
            <div style={{ display:"flex", gap:5, flexWrap:"wrap" }}>
              {badges.map((b,i) => (
                <span key={i} style={{
                  padding:"2px 8px", borderRadius:6,
                  border:`1px solid ${b.border}`, background:b.bg,
                  color:b.color, fontSize:10.5, fontWeight:700, fontFamily:FD,
                }}>{b.label}</span>
              ))}
            </div>
          )}
        </div>
        {ev.note && (
          <p style={{
            margin:0, fontSize:13, color:C.sub,
            whiteSpace:"pre-wrap", lineHeight:1.75, fontFamily:FB,
            padding:"10px 13px",
            background:C.surfaceSub, borderRadius:10,
            border:`1px solid ${C.lineSoft}`,
          }}>{ev.note}</p>
        )}
      </div>
    </div>
  )
}

/* ━━━ 追加カラー（本ファイル専用） ━━━ */
const progPale = "#fdf5d9"
const progLine = "#e0c84a"
const progColor = "#7a5f00"

/* ━━━ メイン ━━━ */
function TaskPageInner() {
  const router = useRouter()
  const sp = useSearchParams()
  const id = Number(sp.get("id") ?? 0)

  const [meUser, setMeUser]   = useState<User|null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string|null>(null)
  const [task, setTask]       = useState<any>(null)
  const [subs, setSubs]       = useState<TaskDetailSub[]>([])
  const [prog, setProg]       = useState<TaskSubProgress[]>([])
  const [events, setEvents]   = useState<TaskEvent[]>([])
  const [note, setNote]       = useState("")
  const [action, setAction]   = useState<"update"|"complete">("update")
  const [progressSubIds, setProgressSubIds] = useState<number[]>([])
  const [doneSubIds, setDoneSubIds]         = useState<number[]>([])
  const [editMode, setEditMode]     = useState(false)
  const [editTitle, setEditTitle]   = useState("")
  const [editDetail, setEditDetail] = useState("")
  const [editDue, setEditDue]       = useState("")
  const [focused, setFocused]       = useState<string|null>(null)

  const isAdmin = meUser?.role === "admin"

  const progMap = useMemo(() => {
    const m = new Map<number,TaskSubProgress>()
    prog.forEach(p => m.set(Number(p.sub_category_id), p)); return m
  }, [prog])
  const subNameMap = useMemo(() => {
    const m = new Map<number,string>()
    subs.forEach(s => m.set(s.id, s.name)); return m
  }, [subs])
  const openSubs = useMemo(() =>
    subs.filter(s => Number(progMap.get(s.id)?.is_done ?? 0) === 0)
  , [subs, progMap])
  const doneCount = subs.length - openSubs.length

  async function load() {
    if (!id) return; setError(null); setLoading(true)
    const r = await getTask(id); setLoading(false)
    if (!r.ok) { setError(toUserMessage(r as ApiNg,"取得に失敗しました")); return }
    setTask(r.task); setSubs(r.sub_categories); setProg(r.progress); setEvents(r.events)
    setProgressSubIds([]); setDoneSubIds([]); setNote(""); setAction("update"); setEditMode(false)
    setEditTitle(r.task.title ?? ""); setEditDetail(r.task.detail ?? ""); setEditDue(r.task.due_date ?? "")
  }

  useEffect(() => { ;(async () => { const r = await me(); if (r.ok) setMeUser(r.user) })() }, [])
  useEffect(() => { load() }, [id])

  function toggle(setter: (fn:(p:number[])=>number[])=>void, sid:number) {
    setter(p => p.includes(sid) ? p.filter(x=>x!==sid) : [...p,sid])
  }

  async function onSubmitProgress(e: React.FormEvent) {
    e.preventDefault(); if (!task) return; setError(null)
    if (!note.trim()) { setError("詳細は必須です"); return }
    if (openSubs.length > 0) {
      if (action==="update" && progressSubIds.length===0) { setError("進捗を登録するカテゴリを選択してください"); return }
      if (action==="complete" && doneSubIds.length===0)   { setError("完了にするサブカテゴリを選択してください"); return }
    }
    const r = await progressTask({
      id: task.id, action, note: note.trim(),
      progress_sub_category_ids: action==="update"    ? progressSubIds : [],
      done_sub_category_ids:     action==="complete"  ? doneSubIds     : [],
      undone_sub_category_ids:   [],
    })
    if (!r.ok) { setError(toUserMessage(r as ApiNg,"更新に失敗しました")); return }
    const remaining = Number((r as any).remaining_open_subcats ?? 0)
    const st = (r as any).status
    await load()
    if (st==="done" && remaining===0) router.replace("/tasks/done/")
  }

  async function onReopen() {
    if (!task) return; setError(null)
    const r = await progressTask({ id:task.id, action:"reopen", note:"再オープン" })
    if (!r.ok) { setError(toUserMessage(r as ApiNg,"再オープンに失敗しました")); return }
    router.replace("/tasks/")
  }

  async function onSaveEdit() {
    if (!task) return; setError(null)
    if (!editTitle.trim()) { setError("タイトルは必須です"); return }
    const r = await updateTask({ id:task.id, title:editTitle.trim(), detail:editDetail, due_date:editDue })
    if (!r.ok) { setError(toUserMessage(r as ApiNg,"保存に失敗しました")); return }
    await load()
  }

  async function onDelete() {
    if (!task || !confirm("このタスクを削除しますか？")) return; setError(null)
    const r = await deleteTask(task.id)
    if (!r.ok) { setError(toUserMessage(r as ApiNg,"削除に失敗しました")); return }
    router.replace("/tasks/")
  }

  const canEdit = task && (task.status !== "done" || isAdmin)

  if (!id) return (
    <div style={{ background:C.bg, minHeight:"100vh", padding:32, fontFamily:FB, color:C.danger }}>
      IDが指定されていません。<Link href="/tasks/" style={{ color:C.brand }}>カンバンへ</Link>
    </div>
  )

  return (
    <div style={{ minHeight:"100vh", background:C.bg, fontFamily:FB, WebkitFontSmoothing:"antialiased" }}>
      <style>{GLOBAL_CSS + `
        .sub-chip-on { transform: scale(1.02); }
      `}</style>

      {/* ━━ ヘッダー ━━ */}
      <div style={{
        background:C.header,
        backgroundImage:`
          radial-gradient(ellipse at 0% 0%, rgba(0,130,173,0.18) 0%, transparent 55%),
          radial-gradient(ellipse at 100% 100%, rgba(0,98,132,0.12) 0%, transparent 50%)
        `,
        padding:"14px 12px 16px",
        display:"flex", alignItems:"center", gap:12,
      }}>
        <Link href="/tasks/" style={{
          width:36, height:36, borderRadius:12, flexShrink:0,
          border:`1px solid ${C.whiteA30}`, background:C.whiteA08,
          display:"flex", alignItems:"center", justifyContent:"center",
          color:C.whiteA80, textDecoration:"none", backdropFilter:"blur(6px)",
          WebkitTapHighlightColor:"transparent",
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <line x1="19" y1="12" x2="5" y2="12"/>
            <polyline points="12 19 5 12 12 5"/>
          </svg>
        </Link>

        <div style={{ flex:1 }}>
          <p style={{ margin:"0 0 1px", fontSize:9.5, fontWeight:700, color:"rgba(255,255,255,0.38)", letterSpacing:"0.16em", textTransform:"uppercase", fontFamily:FD }}>
            Task Detail
          </p>
          <h1 style={{ margin:0, fontSize:20, fontWeight:800, color:C.white, letterSpacing:"-0.02em", fontFamily:FD }}>
            タスク詳細
          </h1>
        </div>

        {/* 管理者アクション */}
        <div style={{ display:"flex", gap:7 }}>
          {task?.status==="done" && isAdmin && (
            <button onClick={onReopen} style={{
              height:34, padding:"0 12px", borderRadius:10,
              border:`1px solid ${C.whiteA30}`, background:C.whiteA08,
              color:C.whiteA80, fontSize:12, fontWeight:600,
              cursor:"pointer", fontFamily:FB, backdropFilter:"blur(6px)",
              WebkitTapHighlightColor:"transparent",
            }}>再オープン</button>
          )}
          {canEdit && (
            <button onClick={onDelete} style={{
              height:34, padding:"0 12px", borderRadius:10,
              border:`1px solid rgba(224,82,82,0.45)`,
              background:"rgba(224,82,82,0.12)",
              color:"#ff8080", fontSize:12, fontWeight:600,
              cursor:"pointer", fontFamily:FB, backdropFilter:"blur(6px)",
              WebkitTapHighlightColor:"transparent",
            }}>削除</button>
          )}
        </div>
      </div>

      {/* ━━ コンテンツ ━━ */}
      <div style={{ padding:"16px 14px 48px", display:"flex", flexDirection:"column", gap:12 }}>
        {error && <ErrorBar msg={error}/>}

        {!task ? (
          <div style={{ padding:"80px 0", textAlign:"center", color:C.muted, fontSize:13 }}>
            <div style={{
              width:34, height:34, borderRadius:"50%", margin:"0 auto 14px",
              border:`2.5px solid ${C.brandPale}`, borderTopColor:C.brand,
              animation:"spin 0.7s linear infinite",
            }}/>
            読み込み中...
          </div>
        ) : (
          <>
            {/* ═══ 基本情報 ═══ */}
            <SectionCard title="タスク情報" accent={C.brand}>
              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:14, flexWrap:"wrap" }}>
                <StatusChip status={task.status}/>
                <div style={{ display:"flex", alignItems:"center", gap:5 }}>
                  <div style={{ width:5, height:5, borderRadius:"50%", background:C.brand }}/>
                  <span style={{ fontSize:10, fontWeight:700, color:C.brand, textTransform:"uppercase", letterSpacing:"0.08em", fontFamily:FD }}>
                    {task.main_category_name}
                  </span>
                </div>
              </div>

              <h2 style={{
                margin:"0 0 14px", fontSize:18, fontWeight:700,
                color:C.text, lineHeight:1.45, letterSpacing:"-0.01em", fontFamily:FB,
              }}>{task.title}</h2>

              {task.detail && (
                <p style={{
                  margin:"0 0 14px", fontSize:13.5, color:C.sub,
                  lineHeight:1.8, whiteSpace:"pre-wrap",
                  padding:"12px 14px",
                  background:C.surfaceSub, borderRadius:12,
                  border:`1px solid ${C.lineSoft}`, fontFamily:FB,
                }}>{task.detail}</p>
              )}

              <div style={{
                display:"flex", gap:16, flexWrap:"wrap",
                paddingTop:12, borderTop:`1px solid ${C.lineSoft}`,
                fontSize:12, color:C.muted, fontFamily:FB,
              }}>
                <div>
                  <span style={{ fontSize:10, letterSpacing:"0.08em", textTransform:"uppercase", fontFamily:FD, marginRight:6 }}>期限</span>
                  <strong style={{ color:C.sub, fontFamily:FM }}>{task.due_date ?? "なし"}</strong>
                </div>
                <div>
                  <span style={{ fontSize:10, letterSpacing:"0.08em", textTransform:"uppercase", fontFamily:FD, marginRight:6 }}>登録者</span>
                  <strong style={{ color:C.sub }}>{task.created_by_name}</strong>
                </div>
                <div style={{ color:C.muted, fontSize:11 }}>{task.created_at}</div>
              </div>
            </SectionCard>

            {/* ═══ 管理者編集 ═══ */}
            {task.status==="done" && isAdmin && (
              <SectionCard title="編集（管理者専用）" accent="#e0c84a">
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom: editMode ? 18 : 0 }}>
                  <p style={{ margin:0, fontSize:12.5, color:C.muted, fontFamily:FB }}>
                    完了済みタスクの内容を修正できます
                  </p>
                  <button onClick={()=>setEditMode(v=>!v)} style={{
                    height:32, padding:"0 13px", borderRadius:9,
                    border:`1.5px solid ${editMode ? C.line : C.brand}`,
                    background: editMode ? C.surfaceSub : C.brandPale,
                    color: editMode ? C.muted : C.brand,
                    fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:FB,
                    WebkitTapHighlightColor:"transparent",
                  }}>
                    {editMode ? "閉じる" : "編集する"}
                  </button>
                </div>
                {editMode && (
                  <div style={{ display:"grid", gap:12 }}>
                    <div>
                      <p style={{ margin:"0 0 7px", fontSize:10, fontWeight:700, color:C.sub, letterSpacing:"0.10em", textTransform:"uppercase", fontFamily:FD }}>タイトル ＊</p>
                      <input value={editTitle} onChange={e=>setEditTitle(e.target.value)}
                        onFocus={()=>setFocused("eT")} onBlur={()=>setFocused(null)}
                        style={inputStyle(focused==="eT")}/>
                    </div>
                    <div>
                      <p style={{ margin:"0 0 7px", fontSize:10, fontWeight:700, color:C.sub, letterSpacing:"0.10em", textTransform:"uppercase", fontFamily:FD }}>詳細</p>
                      <textarea value={editDetail} onChange={e=>setEditDetail(e.target.value)}
                        onFocus={()=>setFocused("eD")} onBlur={()=>setFocused(null)}
                        rows={3} style={{ ...inputStyle(focused==="eD"), lineHeight:1.75 }}/>
                    </div>
                    <div>
                      <p style={{ margin:"0 0 7px", fontSize:10, fontWeight:700, color:C.sub, letterSpacing:"0.10em", textTransform:"uppercase", fontFamily:FD }}>期日</p>
                      <input type="date" value={editDue} onChange={e=>setEditDue(e.target.value)}
                        onFocus={()=>setFocused("eDu")} onBlur={()=>setFocused(null)}
                        style={{ ...inputStyle(focused==="eDu"), maxWidth:200 }}/>
                    </div>
                    <button onClick={onSaveEdit} style={{
                      alignSelf:"flex-start", height:38, padding:"0 20px",
                      borderRadius:10, border:"none",
                      background:`linear-gradient(135deg, ${C.brand}, ${C.brandDeep})`,
                      color:C.white, fontSize:13, fontWeight:700,
                      cursor:"pointer", fontFamily:FD,
                      boxShadow:`0 2px 12px rgba(0,98,132,0.25)`,
                      WebkitTapHighlightColor:"transparent",
                    }}>保存</button>
                  </div>
                )}
              </SectionCard>
            )}

            {/* ═══ サブカテゴリ進捗 ═══ */}
            <SectionCard title="サブカテゴリ" accent={C.done}>
              {subs.length === 0 ? (
                <p style={{ margin:0, fontSize:13, color:C.muted }}>サブカテゴリなし</p>
              ) : (
                <div>
                  {/* 進捗バー */}
                  <div style={{ marginBottom:16 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:7, fontSize:12 }}>
                      <span style={{ color:C.muted, fontFamily:FB }}>完了状況</span>
                      <span style={{ color:C.brand, fontWeight:700, fontFamily:FD }}>
                        {doneCount} / {subs.length}
                      </span>
                    </div>
                    <div style={{ height:6, background:C.lineSoft, borderRadius:99, overflow:"hidden" }}>
                      <div style={{
                        height:"100%",
                        width:`${subs.length===0 ? 0 : (doneCount/subs.length)*100}%`,
                        background:`linear-gradient(to right, ${C.brand}, ${C.brandLight})`,
                        borderRadius:99, transition:"width 0.5s cubic-bezier(.22,1,.36,1)",
                      }}/>
                    </div>
                  </div>
                  {/* チップ一覧 */}
                  <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
                    {subs.map(s => {
                      const done = Number(progMap.get(s.id)?.is_done ?? 0) === 1
                      return (
                        <span key={s.id} style={{
                          padding:"6px 13px", borderRadius:10, fontFamily:FB,
                          border:`1.5px solid ${done ? C.doneLine : C.line}`,
                          background: done ? C.donePale : C.surfaceSub,
                          color: done ? C.done : C.muted,
                          fontSize:13, fontWeight: done ? 600 : 400,
                          textDecoration: done ? "line-through" : "none",
                          display:"inline-flex", alignItems:"center", gap:6,
                          transition:"all 0.2s",
                        }}>
                          {done && (
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={C.done} strokeWidth="3">
                              <polyline points="20 6 9 17 4 12"/>
                            </svg>
                          )}
                          {s.name}
                        </span>
                      )
                    })}
                  </div>
                </div>
              )}
            </SectionCard>

            {/* ═══ 進捗更新フォーム ═══ */}
            {canEdit && task.status!=="done" && (
              <SectionCard title="進捗を更新" accent={action==="complete" ? C.done : C.brand}>
                <form onSubmit={onSubmitProgress} style={{ display:"grid", gap:16 }}>

                  {/* アクション切り替え */}
                  <div style={{
                    display:"grid", gridTemplateColumns:"1fr 1fr",
                    background:C.surfaceSub, borderRadius:12,
                    border:`1px solid ${C.line}`, padding:4, gap:4,
                  }}>
                    {(["update","complete"] as const).map(a => (
                      <button key={a} type="button"
                        onClick={()=>{ setAction(a); setProgressSubIds([]); setDoneSubIds([]) }}
                        style={{
                          padding:"9px 0", borderRadius:9, border:"none",
                          background: action===a
                            ? (a==="complete"
                                ? `linear-gradient(135deg, ${C.done}, #145530)`
                                : `linear-gradient(135deg, ${C.brand}, ${C.brandDeep})`)
                            : "transparent",
                          color: action===a ? C.white : C.muted,
                          fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:FB,
                          transition:"all 0.18s cubic-bezier(.22,1,.36,1)",
                          boxShadow: action===a ? "0 2px 10px rgba(0,0,0,0.15)" : "none",
                          WebkitTapHighlightColor:"transparent",
                        }}>
                        {a==="update" ? "進捗更新" : "完了にする"}
                      </button>
                    ))}
                  </div>

                  {/* サブカテゴリ選択 */}
                  {openSubs.length > 0 ? (
                    <div>
                      <p style={{ margin:"0 0 10px", fontSize:10, fontWeight:700, color:C.sub, letterSpacing:"0.10em", textTransform:"uppercase", fontFamily:FD }}>
                        {action==="update" ? "進捗を記録するカテゴリ" : "完了にするカテゴリ"}
                      </p>
                      {action==="complete" && (
                        <button type="button"
                          onClick={()=>setDoneSubIds(openSubs.map(s=>s.id))}
                          style={{
                            marginBottom:10, height:30, padding:"0 12px", borderRadius:8,
                            border:`1.5px solid ${C.done}`, background:C.donePale,
                            color:C.done, fontSize:12, fontWeight:700,
                            cursor:"pointer", fontFamily:FB,
                            WebkitTapHighlightColor:"transparent",
                          }}>
                          残り全て選択
                        </button>
                      )}
                      <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
                        {openSubs.map(s => {
                          const ids    = action==="update" ? progressSubIds : doneSubIds
                          const setter = action==="update" ? setProgressSubIds : setDoneSubIds
                          const on     = ids.includes(s.id)
                          const col    = action==="complete" ? C.done : C.brand
                          return (
                            <button key={s.id} type="button" onClick={()=>toggle(setter,s.id)}
                              style={{
                                padding:"7px 13px", borderRadius:10,
                                border:`1.5px solid ${on ? col : C.line}`,
                                background: on
                                  ? (action==="complete" ? C.donePale : C.brandPale)
                                  : C.surfaceSub,
                                color: on ? col : C.sub,
                                fontSize:13, fontWeight: on ? 700 : 400,
                                cursor:"pointer", fontFamily:FB,
                                transition:"all 0.14s",
                                display:"inline-flex", alignItems:"center", gap:5,
                                WebkitTapHighlightColor:"transparent",
                              }}>
                              {on && (
                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={col} strokeWidth="3">
                                  <polyline points="20 6 9 17 4 12"/>
                                </svg>
                              )}
                              {s.name}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  ) : (
                    <p style={{ margin:0, fontSize:13, color:C.muted }}>
                      サブカテゴリがないか、全て完了済みです
                    </p>
                  )}

                  {/* メモ */}
                  <div>
                    <p style={{ margin:"0 0 8px", fontSize:10, fontWeight:700, color:C.sub, letterSpacing:"0.10em", textTransform:"uppercase", fontFamily:FD }}>
                      詳細メモ ＊（履歴に残ります）
                    </p>
                    <textarea
                      value={note} onChange={e=>setNote(e.target.value)}
                      onFocus={()=>setFocused("note")} onBlur={()=>setFocused(null)}
                      placeholder="作業内容・変更点などを記録してください"
                      rows={3}
                      style={{ ...inputStyle(focused==="note"), lineHeight:1.75 }}
                    />
                  </div>

                  {/* 送信 */}
                  <button type="submit" disabled={loading} style={{
                    height:48, borderRadius:14, border:"none",
                    background: loading ? C.muted
                      : action==="complete"
                        ? `linear-gradient(135deg, ${C.done}, #145530)`
                        : `linear-gradient(135deg, ${C.brand}, ${C.brandDeep})`,
                    color:C.white, fontSize:14.5, fontWeight:800,
                    cursor: loading ? "not-allowed" : "pointer", fontFamily:FD,
                    boxShadow: loading ? "none"
                      : action==="complete"
                        ? `0 4px 20px rgba(26,102,64,0.30), 0 2px 0 #0d3d20`
                        : `0 4px 20px rgba(0,98,132,0.30), 0 2px 0 ${C.brandDeep}`,
                    transition:"all 0.15s",
                    display:"flex", alignItems:"center", justifyContent:"center", gap:8,
                    letterSpacing:"0.02em",
                    WebkitTapHighlightColor:"transparent",
                  }}>
                    {loading ? (
                      <>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5"
                          style={{ animation:"spin 0.8s linear infinite" }}>
                          <path d="M21 12a9 9 0 11-6.22-8.56"/>
                        </svg>
                        更新中...
                      </>
                    ) : action==="complete" ? "完了として登録" : "進捗を登録"}
                  </button>
                </form>
              </SectionCard>
            )}

            {/* ═══ 履歴タイムライン ═══ */}
            <SectionCard title={`履歴（${events.length}件）`} accent={C.muted}>
              {events.length === 0 ? (
                <p style={{ margin:0, fontSize:13, color:C.muted }}>履歴なし</p>
              ) : (
                <div>
                  {events.map((ev, idx) => (
                    <TimelineEvent
                      key={ev.id}
                      ev={ev}
                      isLast={idx===events.length-1}
                      subNameMap={subNameMap}
                    />
                  ))}
                </div>
              )}
            </SectionCard>
          </>
        )}
      </div>
    </div>
  )
}

export default function TaskPage() {
  return (
    <Guard>
      <Suspense fallback={
        <div style={{ background:C.bg, minHeight:"100vh", display:"flex", justifyContent:"center", alignItems:"center", color:C.muted, fontFamily:FB }}>
          読み込み中...
        </div>
      }>
        <TaskPageInner/>
      </Suspense>
    </Guard>
  )
}
