"use client"

import Link from "next/link"
import { Suspense, useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Guard } from "@/components/Guard"
import { me, type User } from "@/lib/auth"
import type { ApiNg } from "@/lib/api"
import { toUserMessage } from "@/lib/errors"
import { getTask, progressTask, deleteTask, updateTask, type TaskDetailSub, type TaskSubProgress, type TaskEvent } from "@/lib/tasks"

const C = {
  bg:          "#f4f8fa",
  surface:     "#ffffff",
  brand:       "#006284",
  brandMid:    "#004d66",
  brandPale:   "#e0f0f5",
  text:        "#0d1f26",
  sub:         "#4a7a8a",
  muted:       "#8aacb5",
  line:        "#d4e8ee",
  done:        "#1a6640",
  donePale:    "#e6f5ed",
  doneLine:    "#a8d8be",
  progress:    "#7a5f00",
  progPale:    "#fdf5d9",
  progLine:    "#e0c84a",
  danger:      "#c0392b",
  dangerBg:    "#fdf2f2",
  dangerLine:  "#e8b4b4",
} as const

const FH = `'Outfit', 'Noto Sans JP', sans-serif`
const FB = `'Noto Sans JP', 'Outfit', sans-serif`

/* ── ステータスバッジ ─────────────────────────────────────────── */
const STATUS: Record<string, { label: string; color: string; pale: string; line: string }> = {
  todo:  { label: "未着手", color: C.muted,  pale: C.bg,       line: C.line     },
  doing: { label: "進行中", color: C.brand,  pale: C.brandPale,line: "#aad4e0"  },
  done:  { label: "完了",   color: C.done,   pale: C.donePale, line: C.doneLine },
}
function StatusBadge({ status }: { status: string }) {
  const s = STATUS[status] ?? STATUS.todo
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "4px 12px", borderRadius: 6, border: `1px solid ${s.line}`, background: s.pale, fontSize: 12, fontWeight: 700, color: s.color, fontFamily: FH }}>
      <span style={{ width: 7, height: 7, borderRadius: "50%", background: s.color, display: "inline-block" }} />
      {s.label}
    </span>
  )
}

/* ── 変更バッジ ─────────────────────────────────────────────────── */
function ChangeBadge({ kind, label }: { kind: "progress" | "done" | "undone"; label: string }) {
  const s = {
    progress: { bg: C.progPale, border: C.progLine, color: C.progress },
    done:     { bg: C.donePale, border: C.doneLine,  color: C.done    },
    undone:   { bg: C.bg,       border: C.line,      color: C.muted   },
  }[kind]
  return <span style={{ padding: "2px 9px", borderRadius: 5, border: `1px solid ${s.border}`, background: s.bg, color: s.color, fontSize: 11, fontWeight: 700, fontFamily: FH }}>{label}</span>
}

/* ── セクションラッパー ─────────────────────────────────────────── */
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: 12, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,98,132,0.05)" }}>
      <div style={{ padding: "12px 20px", borderBottom: `1px solid ${C.line}`, background: C.bg }}>
        <h2 style={{ margin: 0, fontSize: 11, fontWeight: 700, color: C.sub, letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: FH }}>{title}</h2>
      </div>
      <div style={{ padding: "20px" }}>{children}</div>
    </section>
  )
}

/* ── メインコンポーネント ────────────────────────────────────────── */
function TaskPageInner() {
  const router = useRouter()
  const sp = useSearchParams()
  const id = Number(sp.get("id") ?? 0)

  const [meUser, setMeUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [task, setTask] = useState<any>(null)
  const [subs, setSubs] = useState<TaskDetailSub[]>([])
  const [prog, setProg] = useState<TaskSubProgress[]>([])
  const [events, setEvents] = useState<TaskEvent[]>([])
  const [note, setNote] = useState("")
  const [action, setAction] = useState<"update" | "complete">("update")
  const [progressSubIds, setProgressSubIds] = useState<number[]>([])
  const [doneSubIds, setDoneSubIds] = useState<number[]>([])
  const [editMode, setEditMode] = useState(false)
  const [editTitle, setEditTitle] = useState("")
  const [editDetail, setEditDetail] = useState("")
  const [editDue, setEditDue] = useState("")
  const [focused, setFocused] = useState<string | null>(null)

  const isAdmin = meUser?.role === "admin"

  const progMap = useMemo(() => {
    const m = new Map<number, TaskSubProgress>(); prog.forEach(p => m.set(Number(p.sub_category_id), p)); return m
  }, [prog])
  const subNameMap = useMemo(() => {
    const m = new Map<number, string>(); subs.forEach(s => m.set(s.id, s.name)); return m
  }, [subs])
  const openSubs = useMemo(() => subs.filter(s => Number(progMap.get(s.id)?.is_done ?? 0) === 0), [subs, progMap])
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
      if (action === "update" && progressSubIds.length === 0) { setError("進捗を登録するカテゴリを選択してください"); return }
      if (action === "complete" && doneSubIds.length === 0) { setError("完了にするサブカテゴリを選択してください"); return }
    }
    const r = await progressTask({ id: task.id, action, note: note.trim(), progress_sub_category_ids: action === "update" ? progressSubIds : [], done_sub_category_ids: action === "complete" ? doneSubIds : [], undone_sub_category_ids: [] })
    if (!r.ok) { setError(toUserMessage(r as ApiNg, "更新に失敗しました")); return }
    const remaining = Number((r as any).remaining_open_subcats ?? 0)
    const st = (r as any).status
    await load()
    if (st === "done" && remaining === 0) router.replace("/tasks/done/")
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

  /* input スタイル */
  const fBorder = (n: string) => focused === n ? `1.5px solid ${C.brand}` : `1px solid ${C.line}`
  const baseInp: React.CSSProperties = { width: "100%", padding: "10px 13px", borderRadius: 8, background: C.bg, color: C.text, fontSize: 14, fontFamily: FB, outline: "none", transition: "border 0.15s", boxSizing: "border-box" as const }
  const LBL: React.CSSProperties = { display: "block", fontSize: 11, fontWeight: 700, color: C.sub, letterSpacing: "0.09em", textTransform: "uppercase", marginBottom: 8, fontFamily: FH }

  /* サブカテゴリチップ(選択可能) */
  function SubChip({ id, name, on, onToggle }: { id: number; name: string; on: boolean; onToggle: () => void }) {
    return (
      <button type="button" onClick={onToggle}
        style={{
          padding: "6px 14px", borderRadius: 6, fontFamily: FB,
          border: `1px solid ${on ? C.brand : C.line}`,
          background: on ? C.brandPale : C.bg,
          color: on ? C.brand : C.sub,
          fontSize: 13, fontWeight: on ? 700 : 400,
          cursor: "pointer", transition: "all 0.13s",
        }}>
        {on && <span style={{ marginRight: 4, fontSize: 11 }}>✓</span>}{name}
      </button>
    )
  }

  if (!id) return (
    <div style={{ background: C.bg, minHeight: "100vh", padding: 32, fontFamily: FB, color: C.danger }}>
      IDが指定されていません。<Link href="/tasks/" style={{ color: C.brand }}>カンバンへ</Link>
    </div>
  )

  return (
    <div style={{ minHeight: "100vh", background: C.bg, padding: "32px 28px 80px" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@500;600;700;800&family=Noto+Sans+JP:wght@400;500;700&display=swap');
        * { box-sizing: border-box }
        ::placeholder { color: ${C.muted} }
        @keyframes spin { to { transform: rotate(360deg) } }
        select option { background: ${C.surface}; color: ${C.text} }
        textarea { resize: vertical }
      `}</style>

      <div style={{ maxWidth: 680, margin: "0 auto" }}>

        {/* ── ヘッダー ── */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 28 }}>
          <Link href="/tasks/" style={{ width: 36, height: 36, borderRadius: "50%", border: `1px solid ${C.line}`, background: C.surface, display: "flex", alignItems: "center", justifyContent: "center", color: C.muted, textDecoration: "none", flexShrink: 0 }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
          </Link>
          <div style={{ flex: 1 }}>
            <p style={{ margin: "0 0 4px", fontSize: 11, fontWeight: 700, color: C.brand, letterSpacing: "0.12em", textTransform: "uppercase", fontFamily: FH }}>Task Detail</p>
            <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: C.text, letterSpacing: "-0.02em", fontFamily: FH }}>タスク詳細</h1>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {task?.status === "done" && isAdmin && (
              <button onClick={onReopen} style={{ height: 34, padding: "0 14px", borderRadius: 7, border: `1px solid ${C.line}`, background: C.surface, color: C.sub, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: FB }}>
                再オープン
              </button>
            )}
            {canEdit && (
              <button onClick={onDelete} style={{ height: 34, padding: "0 14px", borderRadius: 7, border: `1px solid ${C.dangerLine}`, background: "transparent", color: C.danger, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: FB }}>
                削除
              </button>
            )}
          </div>
        </div>

        {/* エラー */}
        {error && (
          <div style={{ background: C.dangerBg, border: `1px solid ${C.dangerLine}`, borderRadius: 8, padding: "11px 16px", color: C.danger, fontSize: 13, marginBottom: 16, fontFamily: FB, display: "flex", alignItems: "center", gap: 8 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            {error}
          </div>
        )}

        {!task ? (
          <div style={{ padding: "80px 0", textAlign: "center", color: C.muted, fontFamily: FB }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={C.brand} strokeWidth="2" style={{ animation: "spin 0.8s linear infinite", display: "block", margin: "0 auto 12px" }}><path d="M21 12a9 9 0 11-6.22-8.56"/></svg>
            読み込み中...
          </div>
        ) : (
          <div style={{ display: "grid", gap: 14 }}>

            {/* ═══ 基本情報 ═══ */}
            <Section title="タスク情報">
              <div style={{ display: "grid", gap: 14 }}>
                {/* ステータス行 */}
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  <StatusBadge status={task.status} />
                  <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 700, color: C.brand, textTransform: "uppercase", letterSpacing: "0.07em", fontFamily: FH }}>
                    <span style={{ width: 5, height: 5, borderRadius: "50%", background: C.brand, display: "inline-block" }} />
                    {task.main_category_name}
                  </span>
                </div>

                {/* タイトル */}
                <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: C.text, lineHeight: 1.35, letterSpacing: "-0.01em", fontFamily: FH }}>
                  {task.title}
                </h2>

                {/* 詳細テキスト */}
                {task.detail && (
                  <p style={{ margin: 0, fontSize: 14, color: C.sub, lineHeight: 1.75, whiteSpace: "pre-wrap", padding: "13px 16px", background: C.bg, borderRadius: 8, border: `1px solid ${C.line}`, fontFamily: FB }}>
                    {task.detail}
                  </p>
                )}

                {/* メタ情報 */}
                <div style={{ display: "flex", gap: 20, fontSize: 12, color: C.muted, flexWrap: "wrap", paddingTop: 12, borderTop: `1px solid ${C.line}`, fontFamily: FB }}>
                  <span>期限 <strong style={{ color: C.sub, fontFamily: FH }}>{task.due_date ?? "なし"}</strong></span>
                  <span>登録者 <strong style={{ color: C.sub }}>{task.created_by_name}</strong></span>
                  <span>{task.created_at}</span>
                </div>
              </div>
            </Section>

            {/* ═══ 管理者編集 ═══ */}
            {task.status === "done" && isAdmin && (
              <Section title="編集（管理者専用）">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: editMode ? 20 : 0 }}>
                  <p style={{ margin: 0, fontSize: 13, color: C.muted, fontFamily: FB }}>完了済みタスクの内容を修正できます</p>
                  <button onClick={() => setEditMode(v => !v)}
                    style={{ height: 32, padding: "0 14px", borderRadius: 7, border: `1px solid ${editMode ? C.line : C.brand}`, background: editMode ? C.bg : C.brandPale, color: editMode ? C.muted : C.brand, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: FB }}>
                    {editMode ? "閉じる" : "編集する"}
                  </button>
                </div>
                {editMode && (
                  <div style={{ display: "grid", gap: 14 }}>
                    <div><label style={LBL}>タイトル *</label><input value={editTitle} onChange={e => setEditTitle(e.target.value)} onFocus={() => setFocused("eT")} onBlur={() => setFocused(null)} style={{ ...baseInp, border: fBorder("eT") }} /></div>
                    <div><label style={LBL}>詳細</label><textarea value={editDetail} onChange={e => setEditDetail(e.target.value)} onFocus={() => setFocused("eD")} onBlur={() => setFocused(null)} rows={3} style={{ ...baseInp, border: fBorder("eD"), lineHeight: 1.75 }} /></div>
                    <div><label style={LBL}>期日</label><input value={editDue} onChange={e => setEditDue(e.target.value)} onFocus={() => setFocused("eDu")} onBlur={() => setFocused(null)} style={{ ...baseInp, border: fBorder("eDu"), maxWidth: 190 }} /></div>
                    <button onClick={onSaveEdit} style={{ height: 38, width: "fit-content", padding: "0 22px", borderRadius: 8, border: "none", background: C.brand, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: FH, boxShadow: "0 2px 10px rgba(0,98,132,0.25)" }}>保存</button>
                  </div>
                )}
              </Section>
            )}

            {/* ═══ サブカテゴリ ═══ */}
            <Section title="サブカテゴリ">
              {subs.length === 0 ? (
                <p style={{ margin: 0, fontSize: 13, color: C.muted, fontFamily: FB }}>サブカテゴリなし</p>
              ) : (
                <div style={{ display: "grid", gap: 14 }}>
                  {/* 進捗バー */}
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 6, fontFamily: FB }}>
                      <span style={{ color: C.muted }}>完了状況</span>
                      <span style={{ color: C.brand, fontWeight: 700, fontFamily: FH }}>{doneCount} / {subs.length}</span>
                    </div>
                    <div style={{ height: 5, background: C.line, borderRadius: 999, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${subs.length === 0 ? 0 : (doneCount / subs.length) * 100}%`, background: C.brand, borderRadius: 999, transition: "width 0.4s ease" }} />
                    </div>
                  </div>
                  {/* チップ */}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {subs.map(s => {
                      const done = Number(progMap.get(s.id)?.is_done ?? 0) === 1
                      return (
                        <span key={s.id} style={{
                          padding: "6px 14px", borderRadius: 6, fontFamily: FB,
                          border: `1px solid ${done ? C.doneLine : C.line}`,
                          background: done ? C.donePale : C.bg,
                          color: done ? C.done : C.muted,
                          fontSize: 13, fontWeight: done ? 700 : 400,
                          textDecoration: done ? "line-through" : "none",
                          display: "inline-flex", alignItems: "center", gap: 6,
                        }}>
                          {done && <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={C.done} strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>}
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
              <Section title="進捗を更新">
                <form onSubmit={onSubmitProgress} style={{ display: "grid", gap: 18 }}>
                  {/* アクション選択タブ */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", borderRadius: 8, border: `1px solid ${C.line}`, overflow: "hidden" }}>
                    {(["update", "complete"] as const).map((a, i) => (
                      <button key={a} type="button" onClick={() => { setAction(a); setProgressSubIds([]); setDoneSubIds([]) }}
                        style={{
                          padding: "10px 0",
                          border: "none",
                          borderRight: i === 0 ? `1px solid ${C.line}` : "none",
                          background: action === a ? C.brand : C.bg,
                          color: action === a ? "#fff" : C.sub,
                          fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: FB,
                          transition: "all 0.15s",
                        }}>
                        {a === "update" ? "進捗更新" : "完了にする"}
                      </button>
                    ))}
                  </div>

                  {/* サブカテゴリ選択 */}
                  {openSubs.length > 0 ? (
                    <div>
                      <label style={LBL}>{action === "update" ? "進捗を記録するカテゴリ" : "完了にするカテゴリ"}</label>
                      {action === "complete" && (
                        <button type="button" onClick={() => setDoneSubIds(openSubs.map(s => s.id))}
                          style={{ marginBottom: 10, height: 30, padding: "0 12px", borderRadius: 6, border: `1px solid ${C.brand}`, background: C.brandPale, color: C.brand, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: FB }}>
                          残り全て選択
                        </button>
                      )}
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                        {openSubs.map(s => {
                          const ids = action === "update" ? progressSubIds : doneSubIds
                          const setter = action === "update" ? setProgressSubIds : setDoneSubIds
                          return <SubChip key={s.id} id={s.id} name={s.name} on={ids.includes(s.id)} onToggle={() => toggle(setter, s.id)} />
                        })}
                      </div>
                    </div>
                  ) : (
                    <p style={{ margin: 0, fontSize: 13, color: C.muted, fontFamily: FB }}>サブカテゴリがないか、全て完了済みです</p>
                  )}

                  {/* メモ */}
                  <div>
                    <label style={LBL}>詳細メモ（必須・履歴に残ります）</label>
                    <textarea value={note} onChange={e => setNote(e.target.value)} onFocus={() => setFocused("note")} onBlur={() => setFocused(null)}
                      placeholder="作業内容・変更点などを記録してください" rows={3}
                      style={{ ...baseInp, border: fBorder("note"), lineHeight: 1.75 }} />
                  </div>

                  <button type="submit" disabled={loading} style={{
                    height: 44, borderRadius: 9, border: "none",
                    background: loading ? C.muted : (action === "complete" ? C.done : C.brand),
                    color: "#fff", fontSize: 14, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", fontFamily: FH,
                    boxShadow: loading ? "none" : `0 2px 14px ${action === "complete" ? "rgba(26,102,64,0.28)" : "rgba(0,98,132,0.28)"}`,
                    transition: "all 0.15s",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                    letterSpacing: "0.02em",
                  }}>
                    {loading
                      ? <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" style={{ animation: "spin 0.8s linear infinite" }}><path d="M21 12a9 9 0 11-6.22-8.56"/></svg>更新中...</>
                      : action === "complete" ? "完了として登録" : "進捗を登録"
                    }
                  </button>
                </form>
              </Section>
            )}

            {/* ═══ 履歴タイムライン ═══ */}
            <Section title={`履歴（${events.length}件）`}>
              {events.length === 0 ? (
                <p style={{ margin: 0, fontSize: 13, color: C.muted, fontFamily: FB }}>履歴なし</p>
              ) : (
                <div>
                  {events.map((ev, idx) => {
                    const ch = ev.changed_subcats
                    const mapN = (ids?: number[]) => (ids ?? []).map(sid => subNameMap.get(Number(sid)) ?? String(sid)).join("、")
                    const isLast = idx === events.length - 1
                    return (
                      <div key={ev.id} style={{ display: "grid", gridTemplateColumns: "20px 1fr", gap: "0 16px" }}>
                        {/* タイムライン軸 */}
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                          <div style={{ width: 10, height: 10, borderRadius: "50%", background: C.brand, border: `2px solid ${C.bg}`, outline: `1px solid ${C.brand}`, marginTop: 5, flexShrink: 0 }} />
                          {!isLast && <div style={{ width: 1, flex: 1, background: C.line, margin: "3px 0 0" }} />}
                        </div>
                        {/* コンテンツ */}
                        <div style={{ paddingBottom: isLast ? 0 : 20 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, flexWrap: "wrap", marginBottom: 8 }}>
                            <p style={{ margin: 0, fontSize: 12, color: C.muted, fontFamily: FB }}>
                              <strong style={{ color: C.sub }}>{ev.created_by_name}</strong>　{ev.created_at}
                            </p>
                            <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                              {(ch?.progress?.length ?? 0) > 0 && <ChangeBadge kind="progress" label={`進捗: ${mapN(ch?.progress)}`} />}
                              {(ch?.done?.length ?? 0) > 0 && <ChangeBadge kind="done" label={`完了: ${mapN(ch?.done)}`} />}
                              {(ch?.undone?.length ?? 0) > 0 && <ChangeBadge kind="undone" label={`戻し: ${mapN(ch?.undone)}`} />}
                            </div>
                          </div>
                          {ev.note && (
                            <p style={{ margin: 0, fontSize: 13, color: C.sub, whiteSpace: "pre-wrap", lineHeight: 1.75, fontFamily: FB, padding: "10px 14px", background: C.bg, borderRadius: 8, border: `1px solid ${C.line}` }}>
                              {ev.note}
                            </p>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </Section>

          </div>
        )}
      </div>
    </div>
  )
}

export default function TaskPage() {
  return (
    <Guard>
      <Suspense fallback={<div style={{ background: C.bg, minHeight: "100vh", display: "flex", justifyContent: "center", alignItems: "center", color: C.muted, fontFamily: FB }}>読み込み中...</div>}>
        <TaskPageInner />
      </Suspense>
    </Guard>
  )
}
