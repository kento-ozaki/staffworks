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

import { C, F_DISPLAY, F_BODY, F_MONO, GLOBAL_CSS, ErrorBanner, BrandTag } from "../tasks/page"

/* ── ステータス定義 ── */
const ST: Record<string, { label: string; color: string; wash: string; rule: string }> = {
  todo:  { label: "未着手", color: C.textMuted,  wash: C.canvas,      rule: C.rule      },
  doing: { label: "進行中", color: C.ink,         wash: C.inkWash,     rule: C.inkFaint  },
  done:  { label: "完了",   color: C.emerald,     wash: C.emeraldWash, rule: C.emeraldRule },
}

function StatusPill({ status }: { status: string }) {
  const s = ST[status] ?? ST.todo
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      padding: "4px 10px", borderRadius: 6,
      border: `1px solid ${s.rule}`, background: s.wash,
      fontSize: 11, fontWeight: 600, letterSpacing: "0.05em",
      color: s.color, fontFamily: F_BODY,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: s.color, flexShrink: 0 }}/>
      {s.label}
    </span>
  )
}

/* ── セクション ── */
function Section({ title, accent, children }: { title: string; accent?: string; children: React.ReactNode }) {
  return (
    <section style={{
      background: C.paper, borderRadius: 14,
      border: `1px solid ${C.rule}`,
      overflow: "hidden",
      boxShadow: "0 1px 8px rgba(0,98,132,0.05)",
    }}>
      <div style={{
        padding: "10px 16px 9px",
        borderBottom: `1px solid ${C.ruleSoft}`,
        background: C.paperSub,
        display: "flex", alignItems: "center", gap: 8,
      }}>
        {accent && <div style={{ width: 2.5, height: 12, borderRadius: 2, background: accent, flexShrink: 0 }}/>}
        <span style={{
          fontSize: 9.5, fontWeight: 700, letterSpacing: "0.12em",
          textTransform: "uppercase", color: C.textMuted, fontFamily: F_BODY,
        }}>{title}</span>
      </div>
      <div style={{ padding: "16px 16px" }}>{children}</div>
    </section>
  )
}

/* ── タイムライン ── */
function TLEvent({ ev, isLast, nameMap }: { ev: TaskEvent; isLast: boolean; nameMap: Map<number, string> }) {
  const mapN = (ids?: number[]) => (ids ?? []).map(id => nameMap.get(Number(id)) ?? String(id)).join("、")
  const ch = ev.changed_subcats

  const tags: { text: string; bg: string; border: string; color: string }[] = [
    ...(ch?.progress?.length ?? 0) > 0 ? [{ text: `進捗: ${mapN(ch?.progress)}`, bg: C.amberWash, border: C.amberRule, color: C.amber }] : [],
    ...(ch?.done?.length    ?? 0) > 0 ? [{ text: `完了: ${mapN(ch?.done)}`,     bg: C.emeraldWash, border: C.emeraldRule, color: C.emerald }] : [],
    ...(ch?.undone?.length  ?? 0) > 0 ? [{ text: `戻し: ${mapN(ch?.undone)}`,   bg: C.canvas,      border: C.rule,        color: C.textMuted }] : [],
  ]

  return (
    <div style={{ display: "grid", gridTemplateColumns: "16px 1fr", gap: "0 12px" }}>
      {/* 軸 */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div style={{
          width: 8, height: 8, borderRadius: "50%", marginTop: 4, flexShrink: 0,
          background: C.ink, border: `2px solid ${C.paper}`, outline: `1.5px solid ${C.inkWash}`,
        }}/>
        {!isLast && <div style={{ width: 1, flex: 1, background: C.ruleSoft, margin: "3px 0 0" }}/>}
      </div>
      {/* コンテンツ */}
      <div style={{ paddingBottom: isLast ? 0 : 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
          <p style={{ margin: 0, fontSize: 11.5, color: C.textMuted, fontFamily: F_BODY }}>
            <strong style={{ color: C.textSecond }}>{ev.created_by_name}</strong>
            <span style={{ margin: "0 5px", opacity: 0.4 }}>·</span>
            <span style={{ fontFamily: F_MONO }}>{ev.created_at}</span>
          </p>
          {tags.length > 0 && (
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
              {tags.map((tg: { text: string; bg: string; border: string; color: string }, i: number) => (
                <span key={i} style={{
                  padding: "1px 7px", borderRadius: 4,
                  border: `1px solid ${tg.border}`, background: tg.bg,
                  color: tg.color, fontSize: 10, fontWeight: 600, fontFamily: F_BODY,
                  letterSpacing: "0.04em",
                }}>{tg.text}</span>
              ))}
            </div>
          )}
        </div>
        {ev.note && (
          <p style={{
            margin: 0, fontSize: 13, color: C.textSecond,
            lineHeight: 1.75, whiteSpace: "pre-wrap", fontFamily: F_BODY,
            padding: "9px 12px",
            background: C.paperSub, borderRadius: 8,
            border: `1px solid ${C.ruleSoft}`,
          }}>{ev.note}</p>
        )}
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────── */
function TaskPageInner() {
  const router = useRouter()
  const sp = useSearchParams()
  const id = Number(sp.get("id") ?? 0)

  const [meUser, setMeUser]     = useState<User|null>(null)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState<string|null>(null)
  const [task, setTask]         = useState<any>(null)
  const [subs, setSubs]         = useState<TaskDetailSub[]>([])
  const [prog, setProg]         = useState<TaskSubProgress[]>([])
  const [events, setEvents]     = useState<TaskEvent[]>([])
  const [note, setNote]         = useState("")
  const [action, setAction]     = useState<"update"|"complete">("update")
  const [progressSubIds, setProgressSubIds] = useState<number[]>([])
  const [doneSubIds, setDoneSubIds]         = useState<number[]>([])
  const [editMode, setEditMode]     = useState(false)
  const [editTitle, setEditTitle]   = useState("")
  const [editDetail, setEditDetail] = useState("")
  const [editDue, setEditDue]       = useState("")
  const [focused, setFocused]       = useState<string|null>(null)

  const isAdmin = meUser?.role === "admin"

  const progMap  = useMemo(() => { const m = new Map<number,TaskSubProgress>(); prog.forEach((p: TaskSubProgress) => m.set(Number(p.sub_category_id), p)); return m }, [prog])
  const nameMap  = useMemo(() => { const m = new Map<number,string>(); subs.forEach((s: TaskDetailSub) => m.set(s.id, s.name)); return m }, [subs])
  const openSubs = useMemo(() => subs.filter((s: TaskDetailSub) => Number(progMap.get(s.id)?.is_done ?? 0) === 0), [subs, progMap])
  const doneCount = subs.length - openSubs.length

  async function load() {
    if (!id) return; setError(null); setLoading(true)
    const r = await getTask(id); setLoading(false)
    if (!r.ok) { setError(toUserMessage(r as ApiNg, "取得に失敗しました")); return }
    setTask(r.task); setSubs(r.sub_categories); setProg(r.progress); setEvents(r.events)
    setProgressSubIds([]); setDoneSubIds([]); setNote(""); setAction("update"); setEditMode(false)
    setEditTitle(r.task.title ?? ""); setEditDetail(r.task.detail ?? ""); setEditDue(r.task.due_date ?? "")
  }

  useEffect(() => { ;(async () => { const r = await me(); if (r.ok) setMeUser(r.user) })() }, [])
  useEffect(() => { load() }, [id])

  function toggle(setter: (fn: (p: number[]) => number[]) => void, sid: number) {
    setter(p => p.includes(sid) ? p.filter(x => x !== sid) : [...p, sid])
  }

  async function onSubmitProgress(e: React.FormEvent) {
    e.preventDefault(); if (!task) return; setError(null)
    if (!note.trim()) { setError("詳細は必須です"); return }
    if (openSubs.length > 0) {
      if (action === "update"   && progressSubIds.length === 0) { setError("進捗を登録するカテゴリを選択してください"); return }
      if (action === "complete" && doneSubIds.length === 0)     { setError("完了にするサブカテゴリを選択してください"); return }
    }
    const r = await progressTask({
      id: task.id, action, note: note.trim(),
      progress_sub_category_ids: action === "update"   ? progressSubIds : [],
      done_sub_category_ids:     action === "complete" ? doneSubIds     : [],
      undone_sub_category_ids:   [],
    })
    if (!r.ok) { setError(toUserMessage(r as ApiNg, "更新に失敗しました")); return }
    await load()
    if ((r as any).status === "done" && Number((r as any).remaining_open_subcats ?? 0) === 0) router.replace("/tasks/done/")
  }

  async function onReopen() {
    if (!task) return; setError(null)
    const r = await progressTask({ id: task.id, action: "reopen", note: "再オープン" })
    if (!r.ok) { setError(toUserMessage(r as ApiNg, "再オープンに失敗しました")); return }
    router.replace("/tasks/")
  }

  async function onSaveEdit() {
    if (!task) return; setError(null)
    if (!editTitle.trim()) { setError("タイトルは必須です"); return }
    const r = await updateTask({ id: task.id, title: editTitle.trim(), detail: editDetail, due_date: editDue })
    if (!r.ok) { setError(toUserMessage(r as ApiNg, "保存に失敗しました")); return }
    await load()
  }

  async function onDelete() {
    if (!task || !confirm("このタスクを削除しますか？")) return; setError(null)
    const r = await deleteTask(task.id)
    if (!r.ok) { setError(toUserMessage(r as ApiNg, "削除に失敗しました")); return }
    router.replace("/tasks/")
  }

  const canEdit = task && (task.status !== "done" || isAdmin)

  /* フィールドスタイル */
  const LBL: React.CSSProperties = { display: "block", fontSize: 10.5, fontWeight: 600, color: C.textMuted, letterSpacing: "0.09em", textTransform: "uppercase", fontFamily: F_BODY, marginBottom: 8 }
  const inp = (n: string): React.CSSProperties => ({
    width: "100%", padding: "10px 13px", borderRadius: 8,
    border: `1.5px solid ${focused === n ? C.ink : C.rule}`,
    boxShadow: focused === n ? "0 0 0 3px rgba(0,98,132,0.09)" : "none",
    background: C.paperSub, color: C.textPrimary, fontSize: 14, fontFamily: F_BODY,
    outline: "none", transition: "border-color 0.15s, box-shadow 0.15s",
  })

  if (!id) return (
    <div style={{ background: C.canvas, minHeight: "100vh", padding: 28, fontFamily: F_BODY, color: C.rose }}>
      IDが指定されていません。<Link href="/tasks/" style={{ color: C.ink }}>一覧へ</Link>
    </div>
  )

  return (
    <div style={{ minHeight: "100vh", background: C.canvas, fontFamily: F_BODY }}>
      <style dangerouslySetInnerHTML={{ __html: GLOBAL_CSS() }}/>

      {/* ── ヘッダー ── */}
      <header style={{
        background: "rgba(255,255,255,0.96)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        borderBottom: `1px solid ${C.rule}`,
        padding: "13px 13px 14px",
        display: "flex", alignItems: "center", gap: 10,
      }}>
        <Link href="/tasks/" style={{
          width: 34, height: 34, borderRadius: 8, flexShrink: 0,
          border: `1px solid ${C.rule}`, background: C.paper,
          display: "flex", alignItems: "center", justifyContent: "center",
          color: C.textMuted, textDecoration: "none",
          WebkitTapHighlightColor: "transparent",
        }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <line x1="19" y1="12" x2="5" y2="12"/>
            <polyline points="12 19 5 12 12 5"/>
          </svg>
        </Link>

        <div style={{ flex: 1 }}>
          <p style={{ margin: "0 0 2px", fontSize: 9.5, fontWeight: 600, color: C.ink, letterSpacing: "0.14em", textTransform: "uppercase", fontFamily: F_BODY }}>Task Detail</p>
          <h1 style={{ margin: 0, fontFamily: F_DISPLAY, fontSize: 20, fontWeight: 600, color: C.textPrimary, letterSpacing: "-0.02em" }}>
            タスク詳細
          </h1>
        </div>

        {/* 管理者アクション */}
        <div style={{ display: "flex", gap: 7 }}>
          {task?.status === "done" && isAdmin && (
            <button onClick={onReopen} style={{
              height: 32, padding: "0 11px", borderRadius: 7,
              border: `1px solid ${C.rule}`, background: C.paper,
              color: C.textSecond, fontSize: 11.5, fontWeight: 500,
              cursor: "pointer", fontFamily: F_BODY,
              WebkitTapHighlightColor: "transparent",
            }}>再オープン</button>
          )}
          {canEdit && (
            <button onClick={onDelete} style={{
              height: 32, padding: "0 11px", borderRadius: 7,
              border: `1px solid ${C.roseRule}`, background: C.roseWash,
              color: C.rose, fontSize: 11.5, fontWeight: 500,
              cursor: "pointer", fontFamily: F_BODY,
              WebkitTapHighlightColor: "transparent",
            }}>削除</button>
          )}
        </div>
      </header>

      {/* ── コンテンツ ── */}
      <main style={{ padding: "14px 13px 60px", display: "flex", flexDirection: "column", gap: 11 }}>
        {error && <ErrorBanner msg={error}/>}

        {!task ? (
          <div style={{ padding: "80px 0", textAlign: "center", color: C.textMuted, fontSize: 13 }}>
            <div style={{
              width: 28, height: 28, borderRadius: "50%", margin: "0 auto 14px",
              border: `2px solid ${C.inkWash}`, borderTopColor: C.ink,
              animation: "_spin 0.7s linear infinite",
            }}/>
            読み込み中...
          </div>
        ) : (<>

          {/* ═══ タスク情報 ═══ */}
          <Section title="タスク情報" accent={C.ink}>
            {/* ステータス + カテゴリ */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
              <StatusPill status={task.status}/>
              <BrandTag label={task.main_category_name}/>
            </div>

            {/* タイトル — Fraunces で表示 */}
            <h2 style={{
              margin: "0 0 14px",
              fontFamily: F_DISPLAY, fontSize: 20, fontWeight: 600,
              color: C.textPrimary, lineHeight: 1.4, letterSpacing: "-0.02em",
            }}>{task.title}</h2>

            {/* 詳細テキスト */}
            {task.detail && (
              <p style={{
                margin: "0 0 14px", fontSize: 13.5, color: C.textSecond,
                lineHeight: 1.8, whiteSpace: "pre-wrap", fontFamily: F_BODY,
                padding: "11px 13px",
                background: C.paperSub, borderRadius: 8, border: `1px solid ${C.ruleSoft}`,
              }}>{task.detail}</p>
            )}

            {/* メタ情報 */}
            <div style={{
              display: "flex", gap: 20, flexWrap: "wrap",
              paddingTop: 12, borderTop: `1px solid ${C.ruleSoft}`,
            }}>
              <div style={{ fontSize: 11.5, color: C.textMuted, fontFamily: F_BODY }}>
                <span style={{ letterSpacing: "0.08em", textTransform: "uppercase", fontSize: 9.5, marginRight: 5, fontWeight: 600 }}>期限</span>
                <span style={{ fontFamily: F_MONO, color: C.textSecond }}>{task.due_date ?? "なし"}</span>
              </div>
              <div style={{ fontSize: 11.5, color: C.textMuted, fontFamily: F_BODY }}>
                <span style={{ letterSpacing: "0.08em", textTransform: "uppercase", fontSize: 9.5, marginRight: 5, fontWeight: 600 }}>登録者</span>
                <strong style={{ color: C.textSecond, fontWeight: 500 }}>{task.created_by_name}</strong>
              </div>
              <span style={{ fontSize: 11, color: C.textGhost, fontFamily: F_MONO }}>{task.created_at}</span>
            </div>
          </Section>

          {/* ═══ 管理者編集 ═══ */}
          {task.status === "done" && isAdmin && (
            <Section title="編集（管理者専用）" accent={C.amber}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: editMode ? 16 : 0 }}>
                <p style={{ margin: 0, fontSize: 12.5, color: C.textMuted }}>完了済みタスクの内容を修正できます</p>
                <button onClick={() => setEditMode((v: boolean) => !v)} style={{
                  height: 30, padding: "0 12px", borderRadius: 7,
                  border: `1px solid ${editMode ? C.rule : C.ink}`,
                  background: editMode ? C.paperSub : C.inkWash,
                  color: editMode ? C.textMuted : C.ink,
                  fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: F_BODY,
                  WebkitTapHighlightColor: "transparent",
                }}>
                  {editMode ? "閉じる" : "編集する"}
                </button>
              </div>
              {editMode && (
                <div style={{ display: "grid", gap: 12 }}>
                  <div><label style={LBL}>タイトル *</label><input className="field-inp" value={editTitle} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditTitle(e.target.value)} onFocus={() => setFocused("eT")} onBlur={() => setFocused(null)} style={inp("eT")}/></div>
                  <div><label style={LBL}>詳細</label><textarea className="field-inp" value={editDetail} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setEditDetail(e.target.value)} onFocus={() => setFocused("eD")} onBlur={() => setFocused(null)} rows={3} style={{ ...inp("eD"), lineHeight: 1.75 }}/></div>
                  <div><label style={LBL}>期日</label><input className="field-inp" value={editDue} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditDue(e.target.value)} onFocus={() => setFocused("eDu")} onBlur={() => setFocused(null)} style={{ ...inp("eDu"), maxWidth: 200 }}/></div>
                  <button onClick={onSaveEdit} style={{
                    alignSelf: "flex-start", height: 36, padding: "0 18px", borderRadius: 8, border: "none",
                    background: C.ink, color: "#fff", fontSize: 13, fontWeight: 600,
                    cursor: "pointer", fontFamily: F_BODY,
                    boxShadow: "0 2px 10px rgba(0,98,132,0.22)",
                    WebkitTapHighlightColor: "transparent",
                  }}>保存</button>
                </div>
              )}
            </Section>
          )}

          {/* ═══ サブカテゴリ ═══ */}
          <Section title="サブカテゴリ" accent={C.emerald}>
            {subs.length === 0 ? (
              <p style={{ margin: 0, fontSize: 13, color: C.textMuted }}>サブカテゴリなし</p>
            ) : (
              <div>
                {/* プログレスバー */}
                <div style={{ marginBottom: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 11.5 }}>
                    <span style={{ color: C.textMuted, fontFamily: F_BODY }}>完了状況</span>
                    <span style={{ color: C.ink, fontWeight: 600, fontFamily: F_MONO }}>{doneCount} / {subs.length}</span>
                  </div>
                  <div style={{ height: 4, background: C.ruleSoft, borderRadius: 99, overflow: "hidden" }}>
                    <div style={{
                      height: "100%",
                      width: `${subs.length === 0 ? 0 : (doneCount / subs.length) * 100}%`,
                      background: C.ink, borderRadius: 99,
                      transition: "width 0.5s cubic-bezier(.22,1,.36,1)",
                    }}/>
                  </div>
                </div>
                {/* チップ */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                  {subs.map((s: TaskDetailSub) => {
                    const done = Number(progMap.get(s.id)?.is_done ?? 0) === 1
                    return (
                      <span key={s.id} style={{
                        padding: "5px 12px", borderRadius: 6, fontFamily: F_BODY,
                        border: `1px solid ${done ? C.emeraldRule : C.rule}`,
                        background: done ? C.emeraldWash : C.paperSub,
                        color: done ? C.emerald : C.textMuted,
                        fontSize: 12.5, fontWeight: done ? 600 : 400,
                        textDecoration: done ? "line-through" : "none",
                        display: "inline-flex", alignItems: "center", gap: 5,
                      }}>
                        {done && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={C.emerald} strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>}
                        {s.name}
                      </span>
                    )
                  })}
                </div>
              </div>
            )}
          </Section>

          {/* ═══ 進捗更新 ═══ */}
          {canEdit && task.status !== "done" && (
            <Section title="進捗を更新" accent={action === "complete" ? C.emerald : C.ink}>
              <form onSubmit={onSubmitProgress} style={{ display: "grid", gap: 14 }}>

                {/* アクション切り替え — セグメント */}
                <div style={{
                  display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4,
                  background: C.canvas, borderRadius: 10,
                  border: `1px solid ${C.rule}`, padding: 4,
                }}>
                  {(["update", "complete"] as const).map(a => (
                    <button key={a} type="button"
                      onClick={() => { setAction(a); setProgressSubIds([]); setDoneSubIds([]) }}
                      style={{
                        padding: "8px 0", borderRadius: 7,
                        background: action === a
                          ? (a === "complete" ? C.emeraldWash : C.inkWash)
                          : "transparent",
                        color: action === a
                          ? (a === "complete" ? C.emerald : C.ink)
                          : C.textMuted,
                        fontSize: 12.5, fontWeight: action === a ? 600 : 400,
                        cursor: "pointer", fontFamily: F_BODY,
                        border: action === a
                          ? `1.5px solid ${a === "complete" ? C.emeraldRule : C.inkFaint}`
                          : "1.5px solid transparent",
                        transition: "all 0.16s cubic-bezier(.22,1,.36,1)",
                        WebkitTapHighlightColor: "transparent",
                      }}>
                      {a === "update" ? "進捗更新" : "完了にする"}
                    </button>
                  ))}
                </div>

                {/* サブカテゴリ選択 */}
                {openSubs.length > 0 ? (
                  <div>
                    <label style={{ ...LBL, display: "block", marginBottom: 10 }}>
                      {action === "update" ? "進捗を記録するカテゴリ" : "完了にするカテゴリ"}
                    </label>
                    {action === "complete" && (
                      <button type="button" onClick={() => setDoneSubIds(openSubs.map((s: TaskDetailSub) => s.id))}
                        style={{
                          marginBottom: 8, height: 28, padding: "0 10px", borderRadius: 6,
                          border: `1px solid ${C.emeraldRule}`, background: C.emeraldWash,
                          color: C.emerald, fontSize: 11.5, fontWeight: 600,
                          cursor: "pointer", fontFamily: F_BODY,
                          WebkitTapHighlightColor: "transparent",
                        }}>残り全て選択</button>
                    )}
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                      {openSubs.map((s: TaskDetailSub) => {
                        const ids    = action === "update" ? progressSubIds : doneSubIds
                        const setter = action === "update" ? setProgressSubIds : setDoneSubIds
                        const on     = ids.includes(s.id)
                        const col    = action === "complete" ? C.emerald : C.ink
                        const wash   = action === "complete" ? C.emeraldWash : C.inkWash
                        const rl     = action === "complete" ? C.emeraldRule : C.inkFaint
                        return (
                          <button key={s.id} type="button" onClick={() => toggle(setter, s.id)}
                            style={{
                              padding: "6px 12px", borderRadius: 6,
                              border: `1.5px solid ${on ? rl : C.rule}`,
                              background: on ? wash : C.paperSub,
                              color: on ? col : C.textSecond,
                              fontSize: 13, fontWeight: on ? 600 : 400,
                              cursor: "pointer", fontFamily: F_BODY,
                              display: "inline-flex", alignItems: "center", gap: 5,
                              transition: "all 0.14s",
                              WebkitTapHighlightColor: "transparent",
                            }}>
                            {on && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={col} strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>}
                            {s.name}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ) : (
                  <p style={{ margin: 0, fontSize: 13, color: C.textMuted }}>サブカテゴリがないか、全て完了済みです</p>
                )}

                {/* メモ */}
                <div>
                  <label style={LBL}>詳細メモ ＊（履歴に残ります）</label>
                  <textarea
                    className="field-inp"
                    value={note} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNote(e.target.value)}
                    onFocus={() => setFocused("note")} onBlur={() => setFocused(null)}
                    placeholder="作業内容・変更点などを記録してください"
                    rows={3}
                    style={{ ...inp("note"), lineHeight: 1.75 }}
                  />
                </div>

                {/* 送信 */}
                <button type="submit" disabled={loading} style={{
                  height: 46, borderRadius: 10, border: "none",
                  background: loading ? C.textGhost
                    : action === "complete" ? C.emerald : C.ink,
                  color: "#fff", fontSize: 14, fontWeight: 600,
                  cursor: loading ? "not-allowed" : "pointer", fontFamily: F_BODY,
                  boxShadow: loading ? "none"
                    : action === "complete"
                      ? "0 3px 14px rgba(26,122,74,0.24)"
                      : "0 3px 14px rgba(0,98,132,0.24)",
                  transition: "all 0.15s",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  letterSpacing: "0.02em",
                  WebkitTapHighlightColor: "transparent",
                }}>
                  {loading ? (
                    <>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4"
                        style={{ animation: "_spin 0.8s linear infinite" }}>
                        <path d="M21 12a9 9 0 11-6.22-8.56"/>
                      </svg>
                      更新中...
                    </>
                  ) : action === "complete" ? "完了として登録" : "進捗を登録"}
                </button>
              </form>
            </Section>
          )}

          {/* ═══ 履歴 ═══ */}
          <Section title={`履歴（${events.length}件）`} accent={C.textGhost}>
            {events.length === 0 ? (
              <p style={{ margin: 0, fontSize: 13, color: C.textMuted }}>履歴なし</p>
            ) : (
              <div>
                {events.map((ev: TaskEvent, idx: number) => (
                  <TLEvent ev={ev} isLast={idx === events.length - 1} nameMap={nameMap}/>
                ))}
              </div>
            )}
          </Section>

        </>)}
      </main>
    </div>
  )
}

export default function TaskPage() {
  return (
    <Guard>
      <Suspense fallback={
        <div style={{ background: C.canvas, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: C.textMuted, fontFamily: F_BODY }}>
          読み込み中...
        </div>
      }>
        <TaskPageInner/>
      </Suspense>
    </Guard>
  )
}
