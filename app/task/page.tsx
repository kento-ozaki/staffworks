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

/* ── ステータス定義 ── */
const ST: Record<string,{label:string;color:string;bg:string;border:string}> = {
  todo:  { label:"未着手", color:C.muted,   bg:C.bg,       border:C.stroke      },
  doing: { label:"進行中", color:C.brand,   bg:C.brandFaint, border:C.brandPale },
  done:  { label:"完了",   color:C.done,    bg:C.donePale,  border:C.doneStroke  },
}
function StatusBadge({ status }: { status:string }) {
  const s = ST[status]??ST.todo
  return (
    <span style={{
      display:"inline-flex", alignItems:"center", gap:5,
      padding:"4px 10px 5px", borderRadius:7,
      border:`1px solid ${s.border}`, background:s.bg,
      fontSize:11.5, fontWeight:600, color:s.color, fontFamily:FB,
    }}>
      <span style={{ width:6, height:6, borderRadius:"50%", background:s.color, flexShrink:0 }}/>
      {s.label}
    </span>
  )
}

/* ── セクションカード ── */
function SCard({ title, accent, children }: { title:string; accent?:string; children:React.ReactNode }) {
  return (
    <div style={{
      background:C.surface, borderRadius:16,
      border:`1px solid ${C.stroke}`,
      boxShadow:`0 2px 10px rgba(0,98,132,0.05)`,
      overflow:"hidden",
    }}>
      <div style={{
        padding:"10px 16px 9px",
        background:C.surfaceRaised,
        borderBottom:`1px solid ${C.strokeSoft}`,
        display:"flex", alignItems:"center", gap:8,
      }}>
        {accent && <div style={{ width:3, height:13, borderRadius:2, background:accent, flexShrink:0 }}/>}
        <span style={{ fontSize:10, fontWeight:700, letterSpacing:"0.12em", textTransform:"uppercase", color:C.muted, fontFamily:FB }}>
          {title}
        </span>
      </div>
      <div style={{ padding:"16px" }}>{children}</div>
    </div>
  )
}

/* ── タイムライン ── */
function TLRow({ ev, last, nameMap }: { ev:TaskEvent; last:boolean; nameMap:Map<number,string>; key?:React.Key }) {
  const mapN = (ids?:number[]) => (ids??[]).map(id => nameMap.get(Number(id))??String(id)).join("、")
  const ch   = ev.changed_subcats
  const tags: {text:string;bg:string;border:string;color:string}[] = [
    ...(ch?.progress?.length??0)>0?[{text:`進捗: ${mapN(ch?.progress)}`,bg:C.warnPale,border:C.warnStroke,color:C.warn}]:[],
    ...(ch?.done?.length??0)>0?[{text:`完了: ${mapN(ch?.done)}`,bg:C.donePale,border:C.doneStroke,color:C.done}]:[],
    ...(ch?.undone?.length??0)>0?[{text:`戻し: ${mapN(ch?.undone)}`,bg:C.bg,border:C.stroke,color:C.muted}]:[],
  ]
  return (
    <div style={{ display:"grid", gridTemplateColumns:"14px 1fr", gap:"0 12px" }}>
      <div style={{ display:"flex", flexDirection:"column", alignItems:"center" }}>
        <div style={{
          width:8, height:8, borderRadius:"50%", marginTop:4, flexShrink:0,
          background:C.brand, border:`2px solid ${C.surface}`, outline:`1.5px solid ${C.brandPale}`,
        }}/>
        {!last && <div style={{ width:1, flex:1, background:C.strokeSoft, margin:"3px 0 0" }}/>}
      </div>
      <div style={{ paddingBottom:last?0:18 }}>
        <div style={{ display:"flex", justifyContent:"space-between", gap:8, flexWrap:"wrap", marginBottom:6 }}>
          <p style={{ margin:0, fontSize:11.5, color:C.muted, fontFamily:FB }}>
            <strong style={{ color:C.textSub }}>{ev.created_by_name}</strong>
            <span style={{ margin:"0 5px", opacity:0.4 }}>·</span>
            <span style={{ fontFamily:FM }}>{ev.created_at}</span>
          </p>
          {tags.length>0 && (
            <div style={{ display:"flex", gap:5, flexWrap:"wrap" }}>
              {tags.map((tg,i) => (
                <span key={i} style={{
                  padding:"2px 8px", borderRadius:5,
                  border:`1px solid ${tg.border}`, background:tg.bg,
                  color:tg.color, fontSize:10, fontWeight:600, fontFamily:FB,
                }}>{tg.text}</span>
              ))}
            </div>
          )}
        </div>
        {ev.note && (
          <p style={{
            margin:0, fontSize:13, color:C.textSub, lineHeight:1.75,
            whiteSpace:"pre-wrap", fontFamily:FB,
            padding:"9px 12px", background:C.surfaceRaised,
            borderRadius:9, border:`1px solid ${C.strokeSoft}`,
          }}>{ev.note}</p>
        )}
      </div>
    </div>
  )
}

/* ══ Main ══ */
function TaskPageInner() {
  const router = useRouter()
  const sp     = useSearchParams()
  const id     = Number(sp.get("id")??0)

  const [meUser,  setMeUser]   = useState<User|null>(null)
  const [loading, setLoading]  = useState(false)
  const [error,   setError]    = useState<string|null>(null)
  const [task,    setTask]     = useState<any>(null)
  const [subs,    setSubs]     = useState<TaskDetailSub[]>([])
  const [prog,    setProg]     = useState<TaskSubProgress[]>([])
  const [events,  setEvents]   = useState<TaskEvent[]>([])
  const [note,    setNote]     = useState("")
  const [action,  setAction]   = useState<"update"|"complete">("update")
  const [progressSubIds, setProgressSubIds] = useState<number[]>([])
  const [doneSubIds,     setDoneSubIds]     = useState<number[]>([])
  const [editMode,    setEditMode]    = useState(false)
  const [editTitle,   setEditTitle]   = useState("")
  const [editDetail,  setEditDetail]  = useState("")
  const [editDue,     setEditDue]     = useState("")
  const [focused,     setFocused]     = useState<string|null>(null)

  const isAdmin  = meUser?.role==="admin"
  const progMap  = useMemo(() => { const m=new Map<number,TaskSubProgress>(); prog.forEach((p:TaskSubProgress) => m.set(Number(p.sub_category_id),p)); return m }, [prog])
  const nameMap  = useMemo(() => { const m=new Map<number,string>(); subs.forEach((s:TaskDetailSub) => m.set(s.id,s.name)); return m }, [subs])
  const openSubs = useMemo(() => subs.filter((s:TaskDetailSub) => Number(progMap.get(s.id)?.is_done??0)===0), [subs,progMap])
  const doneCount= subs.length - openSubs.length

  async function load() {
    if (!id) return; setError(null); setLoading(true)
    const r = await getTask(id); setLoading(false)
    if (!r.ok) { setError(toUserMessage(r as ApiNg,"取得に失敗しました")); return }
    setTask(r.task); setSubs(r.sub_categories); setProg(r.progress); setEvents(r.events)
    setProgressSubIds([]); setDoneSubIds([]); setNote(""); setAction("update"); setEditMode(false)
    setEditTitle(r.task.title??""); setEditDetail(r.task.detail??""); setEditDue(r.task.due_date??"")
  }

  useEffect(() => { ;(async () => { const r=await me(); if(r.ok) setMeUser(r.user) })() },[])
  useEffect(() => { load() },[id])

  function toggle(setter:(fn:(p:number[])=>number[])=>void, sid:number) {
    setter((p:number[]) => p.includes(sid)?p.filter(x=>x!==sid):[...p,sid])
  }

  async function onSubmitProgress(e:React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); if (!task) return; setError(null)
    if (!note.trim()) { setError("詳細は必須です"); return }
    if (openSubs.length>0) {
      if (action==="update"   && progressSubIds.length===0) { setError("進捗を登録するカテゴリを選択してください"); return }
      if (action==="complete" && doneSubIds.length===0)     { setError("完了にするサブカテゴリを選択してください"); return }
    }
    const r = await progressTask({
      id:task.id, action, note:note.trim(),
      progress_sub_category_ids: action==="update"?progressSubIds:[],
      done_sub_category_ids:     action==="complete"?doneSubIds:[],
      undone_sub_category_ids:   [],
    })
    if (!r.ok) { setError(toUserMessage(r as ApiNg,"更新に失敗しました")); return }
    await load()
    if ((r as any).status==="done" && Number((r as any).remaining_open_subcats??0)===0) router.replace("/tasks/done/")
  }

  async function onReopen() {
    if (!task) return; setError(null)
    const r = await progressTask({id:task.id,action:"reopen",note:"再オープン"})
    if (!r.ok) { setError(toUserMessage(r as ApiNg,"再オープンに失敗しました")); return }
    router.replace("/tasks/")
  }

  async function onSaveEdit() {
    if (!task) return; setError(null)
    if (!editTitle.trim()) { setError("タイトルは必須です"); return }
    const r = await updateTask({id:task.id,title:editTitle.trim(),detail:editDetail,due_date:editDue})
    if (!r.ok) { setError(toUserMessage(r as ApiNg,"保存に失敗しました")); return }
    await load()
  }

  async function onDelete() {
    if (!task||!confirm("このタスクを削除しますか？")) return; setError(null)
    const r = await deleteTask(task.id)
    if (!r.ok) { setError(toUserMessage(r as ApiNg,"削除に失敗しました")); return }
    router.replace("/tasks/")
  }

  const canEdit = task && (task.status!=="done"||isAdmin)
  const FL: React.CSSProperties = { margin:"0 0 7px", fontSize:10.5, fontWeight:600, color:C.muted, letterSpacing:"0.10em", textTransform:"uppercase", fontFamily:FB }
  const INP = (n:string): React.CSSProperties => fieldStyle(focused===n)

  if (!id) return (
    <div style={{ background:C.bg, minHeight:"100vh", padding:28, fontFamily:FB, color:C.danger }}>
      IDが指定されていません。<Link href="/tasks/" style={{ color:C.brand }}>一覧へ</Link>
    </div>
  )

  return (
    <div style={{ minHeight:"100vh", background:C.bg, fontFamily:FB }}>
      <style dangerouslySetInnerHTML={{ __html: GLOBAL_CSS }}/>

      {/* ── ヘッダー ── */}
      <header style={{
        background:"rgba(255,255,255,0.97)",
        backdropFilter:"blur(20px)",
        WebkitBackdropFilter:"blur(20px)",
        borderBottom:`1px solid ${C.stroke}`,
        padding:"12px 14px 13px",
        display:"flex", alignItems:"center", gap:10,
      }}>
        <Link href="/tasks/" style={{
          width:36, height:36, borderRadius:10, flexShrink:0,
          border:`1.5px solid ${C.stroke}`, background:C.surface,
          display:"flex", alignItems:"center", justifyContent:"center",
          color:C.muted, textDecoration:"none",
          WebkitTapHighlightColor:"transparent",
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
              cursor:"pointer", fontFamily:FB,
              WebkitTapHighlightColor:"transparent",
            }}>再オープン</button>
          )}
          {canEdit && (
            <button onClick={onDelete} style={{
              height:32, padding:"0 12px", borderRadius:8,
              border:`1.5px solid ${C.dangerStroke}`, background:C.dangerPale,
              color:C.danger, fontSize:12, fontWeight:600,
              cursor:"pointer", fontFamily:FB,
              WebkitTapHighlightColor:"transparent",
            }}>削除</button>
          )}
        </div>
      </header>

      {/* ── コンテンツ ── */}
      <main style={{ padding:"14px 14px 64px", display:"flex", flexDirection:"column", gap:12 }}>
        {error && <ErrBar msg={error}/>}

        {!task ? (
          <div style={{ padding:"80px 0", textAlign:"center", color:C.muted, fontSize:13 }}>
            <div style={{
              width:30, height:30, borderRadius:"50%", margin:"0 auto 14px",
              border:`2.5px solid ${C.brandPale}`, borderTopColor:C.brand,
              animation:"_spin 0.7s linear infinite",
            }}/>読み込み中...
          </div>
        ) : (<>

          {/* ═ タスク情報 ═ */}
          <SCard title="タスク情報" accent={C.brand}>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:14, flexWrap:"wrap" }}>
              <StatusBadge status={task.status}/>
              <Chip label={task.main_category_name} accent/>
            </div>
            <h2 style={{
              margin:"0 0 12px",
              fontFamily:FB, fontSize:19, fontWeight:800,
              color:C.text, lineHeight:1.45, letterSpacing:"-0.02em",
            }}>{task.title}</h2>
            {task.detail && (
              <p style={{
                margin:"0 0 14px", fontSize:13.5, color:C.textSub, lineHeight:1.8,
                whiteSpace:"pre-wrap", fontFamily:FB,
                padding:"11px 13px", background:C.surfaceRaised,
                borderRadius:10, border:`1px solid ${C.strokeSoft}`,
              }}>{task.detail}</p>
            )}
            <div style={{ display:"flex", gap:18, flexWrap:"wrap", paddingTop:12, borderTop:`1px solid ${C.strokeSoft}` }}>
              <div style={{ fontSize:12, color:C.muted, fontFamily:FB }}>
                <span style={{ fontSize:9.5, fontWeight:700, letterSpacing:"0.10em", textTransform:"uppercase", marginRight:6 }}>期限</span>
                <span style={{ fontFamily:FM, color:C.textSub, fontWeight:500 }}>{task.due_date??"なし"}</span>
              </div>
              <div style={{ fontSize:12, color:C.muted, fontFamily:FB }}>
                <span style={{ fontSize:9.5, fontWeight:700, letterSpacing:"0.10em", textTransform:"uppercase", marginRight:6 }}>登録者</span>
                <strong style={{ color:C.textSub, fontWeight:600 }}>{task.created_by_name}</strong>
              </div>
              <span style={{ fontSize:11, color:C.ghost, fontFamily:FM }}>{task.created_at}</span>
            </div>
          </SCard>

          {/* ═ 管理者編集 ═ */}
          {task.status==="done" && isAdmin && (
            <SCard title="編集（管理者専用）" accent={C.warn}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:editMode?16:0 }}>
                <p style={{ margin:0, fontSize:12.5, color:C.muted }}>完了済みタスクの内容を修正できます</p>
                <button onClick={() => setEditMode((v:boolean) => !v)} style={{
                  height:32, padding:"0 13px", borderRadius:8,
                  border:`1.5px solid ${editMode?C.stroke:C.brand}`,
                  background: editMode?C.surfaceRaised:C.brandFaint,
                  color: editMode?C.muted:C.brand,
                  fontSize:12.5, fontWeight:600, cursor:"pointer", fontFamily:FB,
                  WebkitTapHighlightColor:"transparent",
                }}>{editMode?"閉じる":"編集する"}</button>
              </div>
              {editMode && (
                <div style={{ display:"grid", gap:12 }}>
                  <div>
                    <p style={FL}>タイトル *</p>
                    <input className="fi" value={editTitle}
                      onChange={(e:React.ChangeEvent<HTMLInputElement>) => setEditTitle(e.target.value)}
                      onFocus={() => setFocused("eT")} onBlur={() => setFocused(null)}
                      style={INP("eT")}/>
                  </div>
                  <div>
                    <p style={FL}>詳細</p>
                    <textarea className="fi" value={editDetail}
                      onChange={(e:React.ChangeEvent<HTMLTextAreaElement>) => setEditDetail(e.target.value)}
                      onFocus={() => setFocused("eD")} onBlur={() => setFocused(null)}
                      rows={3} style={{ ...INP("eD"), lineHeight:1.75 }}/>
                  </div>
                  <div>
                    <p style={FL}>期日</p>
                    <input type="date" className="fi" value={editDue}
                      onChange={(e:React.ChangeEvent<HTMLInputElement>) => setEditDue(e.target.value)}
                      onFocus={() => setFocused("eDu")} onBlur={() => setFocused(null)}
                      style={{ ...INP("eDu"), maxWidth:200 }}/>
                  </div>
                  <button onClick={onSaveEdit} style={{
                    alignSelf:"flex-start", height:38, padding:"0 20px", borderRadius:10, border:"none",
                    background:C.brand, color:"#fff", fontSize:13.5, fontWeight:700,
                    cursor:"pointer", fontFamily:FB,
                    boxShadow:`0 3px 12px rgba(0,98,132,0.25)`,
                    WebkitTapHighlightColor:"transparent",
                  }}>保存する</button>
                </div>
              )}
            </SCard>
          )}

          {/* ═ サブカテゴリ ═ */}
          <SCard title="サブカテゴリ" accent={C.done}>
            {subs.length===0
              ? <p style={{ margin:0, fontSize:13, color:C.muted }}>サブカテゴリなし</p>
              : (<>
                <div style={{ marginBottom:14 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6, fontSize:12 }}>
                    <span style={{ color:C.muted, fontFamily:FB }}>完了状況</span>
                    <span style={{ color:C.brand, fontWeight:700, fontFamily:FM }}>{doneCount} / {subs.length}</span>
                  </div>
                  <div style={{ height:5, background:C.strokeSoft, borderRadius:99, overflow:"hidden" }}>
                    <div style={{
                      height:"100%",
                      width:`${subs.length===0?0:(doneCount/subs.length)*100}%`,
                      background:`linear-gradient(90deg, ${C.brand}, ${C.brandMid})`,
                      borderRadius:99, transition:"width 0.5s cubic-bezier(.22,1,.36,1)",
                    }}/>
                  </div>
                </div>
                <div style={{ display:"flex", flexWrap:"wrap", gap:7 }}>
                  {subs.map((s:TaskDetailSub) => {
                    const done = Number(progMap.get(s.id)?.is_done??0)===1
                    return (
                      <span key={s.id} style={{
                        padding:"5px 12px", borderRadius:8, fontFamily:FB,
                        border:`1.5px solid ${done?C.doneStroke:C.stroke}`,
                        background: done?C.donePale:C.surfaceRaised,
                        color: done?C.done:C.muted,
                        fontSize:12.5, fontWeight:done?600:400,
                        textDecoration: done?"line-through":"none",
                        display:"inline-flex", alignItems:"center", gap:5,
                      }}>
                        {done && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={C.done} strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>}
                        {s.name}
                      </span>
                    )
                  })}
                </div>
              </>)
            }
          </SCard>

          {/* ═ 進捗更新 ═ */}
          {canEdit && task.status!=="done" && (
            <SCard title="進捗を更新" accent={action==="complete"?C.done:C.brand}>
              <form onSubmit={onSubmitProgress} style={{ display:"grid", gap:14 }}>

                {/* アクションセグメント */}
                <div style={{
                  display:"grid", gridTemplateColumns:"1fr 1fr",
                  gap:4, background:C.bg, borderRadius:12,
                  border:`1px solid ${C.stroke}`, padding:4,
                }}>
                  {(["update","complete"] as const).map(a => {
                    const on = action===a
                    const ac = a==="complete"
                    return (
                      <button key={a} type="button"
                        onClick={() => { setAction(a); setProgressSubIds([]); setDoneSubIds([]) }}
                        style={{
                          padding:"9px 0", borderRadius:9, border:"none",
                          background: on ? (ac?C.donePale:C.brandFaint) : "transparent",
                          color: on ? (ac?C.done:C.brand) : C.muted,
                          fontSize:13, fontWeight:on?700:400,
                          cursor:"pointer", fontFamily:FB,
                          outline: on ? `1.5px solid ${ac?C.doneStroke:C.brandPale}` : "1.5px solid transparent",
                          transition:"all 0.18s cubic-bezier(.22,1,.36,1)",
                          WebkitTapHighlightColor:"transparent",
                        } as React.CSSProperties}>
                        {a==="update"?"進捗更新":"完了にする"}
                      </button>
                    )
                  })}
                </div>

                {/* サブカテゴリ選択 */}
                {openSubs.length>0 ? (
                  <div>
                    <p style={FL}>{action==="update"?"進捗を記録するカテゴリ":"完了にするカテゴリ"}</p>
                    {action==="complete" && (
                      <button type="button"
                        onClick={() => setDoneSubIds(openSubs.map((s:TaskDetailSub) => s.id))}
                        style={{
                          marginBottom:9, height:28, padding:"0 12px", borderRadius:7,
                          border:`1.5px solid ${C.doneStroke}`, background:C.donePale,
                          color:C.done, fontSize:12, fontWeight:600,
                          cursor:"pointer", fontFamily:FB,
                          WebkitTapHighlightColor:"transparent",
                        }}>残り全て選択</button>
                    )}
                    <div style={{ display:"flex", flexWrap:"wrap", gap:7 }}>
                      {openSubs.map((s:TaskDetailSub) => {
                        const ids    = action==="update"?progressSubIds:doneSubIds
                        const setter = action==="update"?setProgressSubIds:setDoneSubIds
                        const on     = ids.includes(s.id)
                        const col    = action==="complete"?C.done:C.brand
                        const wash   = action==="complete"?C.donePale:C.brandFaint
                        const rl     = action==="complete"?C.doneStroke:C.brandPale
                        return (
                          <button key={s.id} type="button" onClick={() => toggle(setter,s.id)}
                            style={{
                              padding:"6px 13px", borderRadius:8,
                              border:`1.5px solid ${on?rl:C.stroke}`,
                              background:on?wash:C.surfaceRaised,
                              color:on?col:C.textSub,
                              fontSize:13, fontWeight:on?700:400,
                              cursor:"pointer", fontFamily:FB,
                              display:"inline-flex", alignItems:"center", gap:5,
                              transition:"all 0.14s",
                              WebkitTapHighlightColor:"transparent",
                            }}>
                            {on && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={col} strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>}
                            {s.name}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ) : (
                  <p style={{ margin:0, fontSize:13, color:C.muted }}>サブカテゴリがないか、全て完了済みです</p>
                )}

                {/* メモ */}
                <div>
                  <p style={FL}>詳細メモ ＊（履歴に残ります）</p>
                  <textarea className="fi" value={note}
                    onChange={(e:React.ChangeEvent<HTMLTextAreaElement>) => setNote(e.target.value)}
                    onFocus={() => setFocused("note")} onBlur={() => setFocused(null)}
                    placeholder="作業内容・変更点などを記録してください" rows={3}
                    style={{ ...INP("note"), lineHeight:1.75 }}
                  />
                </div>

                {/* 送信 */}
                <button type="submit" disabled={loading} style={{
                  height:48, borderRadius:12, border:"none",
                  background: loading ? C.ghost : (action==="complete"?C.done:C.brand),
                  color:"#fff", fontSize:14.5, fontWeight:700, fontFamily:FB,
                  cursor:loading?"not-allowed":"pointer",
                  boxShadow: loading?"none":(action==="complete"?`0 4px 16px rgba(23,121,74,0.26)`:`0 4px 16px rgba(0,98,132,0.26)`),
                  transition:"all 0.18s",
                  display:"flex", alignItems:"center", justifyContent:"center", gap:8,
                  WebkitTapHighlightColor:"transparent",
                }}>
                  {loading
                    ? <><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" style={{ animation:"_spin 0.8s linear infinite" }}><path d="M21 12a9 9 0 11-6.22-8.56"/></svg>更新中...</>
                    : action==="complete"?"完了として登録":"進捗を登録"
                  }
                </button>
              </form>
            </SCard>
          )}

          {/* ═ 履歴 ═ */}
          <SCard title={`履歴（${events.length}件）`} accent={C.ghost}>
            {events.length===0
              ? <p style={{ margin:0, fontSize:13, color:C.muted }}>履歴なし</p>
              : <div>{events.map((ev:TaskEvent,idx:number) => <TLRow key={ev.id} ev={ev} last={idx===events.length-1} nameMap={nameMap}/>)}</div>
            }
          </SCard>

        </>)}
      </main>
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
