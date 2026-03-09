"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { me, type User } from "@/lib/auth"
import { apiFetch } from "@/lib/api"
import type { ApiNg } from "@/lib/api"
import { toUserMessage } from "@/lib/errors"

// ── 型 ────────────────────────────────────────────────────────
type SlotRow = { id: string; date: string; start: string; end: string; note: string }

// ── ユーティリティ ─────────────────────────────────────────────
function pad2(n: number) { return String(n).padStart(2, "0") }
function monthStr(d: Date) { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}` }
function addMonths(d: Date, delta: number) { const x = new Date(d); x.setDate(1); x.setMonth(x.getMonth()+delta); x.setHours(12,0,0,0); return x }
function deadlineForMonth(targetMonth: string) {
  const [yStr, mStr] = targetMonth.split("-")
  return new Date(Number(yStr), Number(mStr)-2, 26, 16, 0, 0)
}
function daysInMonth(month: string) { const [y,m] = month.split("-"); return new Date(Number(y), Number(m), 0).getDate() }
function toYmd(month: string, day: number) { return `${month}-${pad2(day)}` }
function uid() { return Math.random().toString(36).slice(2,10) + Date.now().toString(36) }

const DOW = ["日","月","火","水","木","金","土"]
function weekdayOf(ds: string) {
  const d = new Date(`${ds}T00:00:00`)
  return Number.isNaN(d.getTime()) ? "" : DOW[d.getDay()]
}

// ── CSS ──────────────────────────────────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=Noto+Sans+JP:wght@400;500;700&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
html{-webkit-text-size-adjust:100%;}
body{background:#f0f5f7;}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}

/* ── ページヘッダー ── */
.submit-header{background:#006284;padding:18px 16px 20px;position:sticky;top:0;z-index:10;}
.submit-header-inner{max-width:720px;margin:0 auto;display:flex;align-items:center;justify-content:space-between;gap:12px;}
.submit-eyebrow{font-size:10px;font-weight:500;color:rgba(255,255,255,.5);letter-spacing:.18em;text-transform:uppercase;margin-bottom:3px;font-family:'Noto Sans JP',sans-serif;}
.submit-title{font-size:22px;font-weight:400;color:#fff;font-family:'DM Serif Display',serif;}

/* ── 月ナビ（ヘッダー内） ── */
.month-seg{display:flex;align-items:center;gap:8px;background:rgba(255,255,255,.18);border-radius:10px;padding:6px 10px;}
.month-seg-label{font-size:15px;font-weight:700;color:#fff;font-family:'Noto Sans JP',sans-serif;min-width:60px;text-align:center;}
.month-seg-btn{width:28px;height:28px;border:none;background:rgba(255,255,255,.25);border-radius:6px;color:#fff;font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center;-webkit-tap-highlight-color:transparent;}

/* ── コンテンツ ── */
.submit-body{max-width:720px;margin:0 auto;padding:16px 12px 80px;}
@media(min-width:560px){.submit-body{padding:20px 20px 80px;}}

/* ── 情報バー ── */
.info-bar{background:#fff;border:1px solid #d8eaee;border-radius:10px;padding:12px 14px;margin-bottom:16px;display:grid;gap:4px;}
.info-bar-row{font-size:12px;color:#3b6878;font-family:'Noto Sans JP',sans-serif;}
.info-bar-row b{color:#006284;font-weight:700;}

/* ── 期限切れ警告 ── */
.deadline-warn{padding:12px 14px;background:#fdf6e0;border:1px solid #dfc060;border-radius:10px;font-size:13px;color:#7a5400;font-family:'Noto Sans JP',sans-serif;margin-bottom:16px;line-height:1.55;}

/* ── セクションカード ── */
.sec-card{background:#fff;border:1px solid #d8eaee;border-radius:14px;overflow:hidden;box-shadow:0 1px 6px rgba(0,98,132,.06);margin-bottom:14px;}
.sec-head{padding:14px 16px;border-bottom:1px solid #d8eaee;display:flex;align-items:center;justify-content:space-between;}
.sec-title{font-size:14px;font-weight:700;color:#0c1d24;font-family:'Noto Sans JP',sans-serif;}

/* ── スロット行 ── */
.slot-row{padding:12px 14px;border-bottom:1px solid #d8eaee;display:grid;gap:10px;animation:fadeIn .2s ease;}
.slot-row:last-child{border-bottom:none;}
.slot-row-head{display:flex;align-items:center;justify-content:space-between;}
.slot-num{font-size:11px;font-weight:700;color:#89adb8;letter-spacing:.1em;text-transform:uppercase;font-family:'Noto Sans JP',sans-serif;}
.slot-grid{display:grid;grid-template-columns:1fr auto 1fr;gap:8px;align-items:center;}
.slot-sep{color:#89adb8;font-weight:700;text-align:center;}
.date-grid{display:grid;grid-template-columns:1fr auto;gap:8px;align-items:center;}

/* ── フォームインプット ── */
.field-input{width:100%;height:44px;border-radius:9px;border:1.5px solid #d8eaee;background:#f0f5f7;padding:0 12px;font-size:16px;font-family:'Noto Sans JP',sans-serif;outline:none;-webkit-appearance:none;color:#0c1d24;}
.field-input:focus{border-color:#006284;}
.field-input:disabled{opacity:.5;background:#eef2f4;}
.field-textarea{width:100%;border-radius:9px;border:1.5px solid #d8eaee;background:#f0f5f7;padding:10px 12px;font-size:15px;font-family:'Noto Sans JP',sans-serif;outline:none;-webkit-appearance:none;color:#0c1d24;resize:vertical;min-height:44px;}
.field-textarea:focus{border-color:#006284;}
.field-textarea:disabled{opacity:.5;}

/* ── タイムセレクト ── */
.time-sel{flex:1;height:44px;border-radius:9px;border:1.5px solid #d8eaee;background:#f0f5f7;padding:0 10px;font-size:16px;font-family:'Noto Sans JP',sans-serif;outline:none;-webkit-appearance:none;color:#0c1d24;}
.time-sel:focus{border-color:#006284;}
.time-sel:disabled{opacity:.5;}
.time-wrap{display:flex;align-items:center;gap:6px;}

/* ── ボタン ── */
.btn-add{height:40px;padding:0 16px;border:1.5px dashed #bcd8e0;border-radius:9px;background:transparent;color:#3b6878;font-size:13px;font-weight:700;font-family:'Noto Sans JP',sans-serif;cursor:pointer;width:100%;-webkit-tap-highlight-color:transparent;}
.btn-add:disabled{opacity:.4;cursor:not-allowed;}
.btn-del{height:30px;padding:0 12px;border:1.5px solid #e8b8b8;border-radius:7px;background:transparent;color:#b83030;font-size:12px;font-weight:700;font-family:'Noto Sans JP',sans-serif;cursor:pointer;-webkit-tap-highlight-color:transparent;flex-shrink:0;}
.btn-del:disabled{opacity:.4;cursor:not-allowed;}
.btn-save{width:100%;height:50px;border:none;border-radius:10px;background:#006284;color:#fff;font-size:15px;font-weight:700;font-family:'Noto Sans JP',sans-serif;cursor:pointer;letter-spacing:.03em;box-shadow:0 3px 16px rgba(0,98,132,.28);display:flex;align-items:center;justify-content:center;gap:8px;margin-bottom:10px;-webkit-tap-highlight-color:transparent;}
.btn-save:disabled{background:#89adb8;box-shadow:none;cursor:not-allowed;}
.btn-back{width:100%;height:44px;border:1.5px solid #d8eaee;border-radius:10px;background:#fff;color:#3b6878;font-size:14px;font-weight:700;font-family:'Noto Sans JP',sans-serif;cursor:pointer;-webkit-tap-highlight-color:transparent;}

/* ── トースト ── */
.toast{padding:12px 14px;background:#eaf5ee;border:1px solid #9fd0b5;border-radius:10px;color:#1a6640;font-size:13px;font-family:'Noto Sans JP',sans-serif;margin-bottom:14px;animation:fadeIn .2s ease;}
.err-box{padding:12px 14px;background:#fdf1f1;border:1px solid #e8b8b8;border-radius:10px;color:#b83030;font-size:13px;font-family:'Noto Sans JP',sans-serif;margin-bottom:14px;}
`

const TIME_HOURS   = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"))
const TIME_MINUTES = ["00", "15", "30", "45"]

function TimeSelect({ value, onChange, disabled }: { value: string; onChange: (v: string) => void; disabled?: boolean }) {
  const [hour = "17", min = "00"] = (value || "17:00").split(":")
  return (
    <div className="time-wrap">
      <select className="time-sel" value={hour} onChange={e => onChange(`${e.target.value}:${min}`)} disabled={disabled}>
        {TIME_HOURS.map(h => <option key={h} value={h}>{h}</option>)}
      </select>
      <span style={{ color:"#89adb8", fontWeight:700, flexShrink:0 }}>:</span>
      <select className="time-sel" value={min} onChange={e => onChange(`${hour}:${e.target.value}`)} disabled={disabled}>
        {TIME_MINUTES.map(m => <option key={m} value={m}>{m}</option>)}
      </select>
    </div>
  )
}

// ── SlotCard ──────────────────────────────────────────────────
function SlotCard({ title, month, rows, disabled, onChange }: { title: string; month: string; rows: SlotRow[]; disabled: boolean; onChange: (rows: SlotRow[]) => void }) {
  const maxDay = useMemo(() => daysInMonth(month), [month])
  function update(id: string, patch: Partial<SlotRow>) { onChange(rows.map(r => r.id === id ? { ...r, ...patch } : r)) }
  function add() { onChange([...rows, { id: uid(), date: toYmd(month, 1), start: "17:00", end: "22:00", note: "" }]) }
  function remove(id: string) { onChange(rows.filter(r => r.id !== id)) }

  return (
    <div className="sec-card">
      <div className="sec-head">
        <span className="sec-title">{title}</span>
        <span style={{ fontSize:12, color:"#89adb8", fontFamily:"'Noto Sans JP',sans-serif" }}>{rows.length}件</span>
      </div>
      {rows.map((r, i) => (
        <div key={r.id} className="slot-row">
          <div className="slot-row-head">
            <span className="slot-num">#{i + 1}</span>
            <button className="btn-del" disabled={disabled} onClick={() => remove(r.id)}>削除</button>
          </div>
          {/* 日付 */}
          <div>
            <div style={{ fontSize:11, fontWeight:700, color:"#89adb8", letterSpacing:".1em", textTransform:"uppercase", marginBottom:6, fontFamily:"'Noto Sans JP',sans-serif" }}>日付</div>
            <div className="date-grid">
              <select className="field-input" value={r.date} disabled={disabled} onChange={e => update(r.id, { date: e.target.value })}
                style={{ appearance:"none", WebkitAppearance:"none" }}>
                {Array.from({ length: maxDay }, (_, i) => {
                  const ymd = toYmd(month, i + 1)
                  return <option key={ymd} value={ymd}>{ymd.slice(5).replace("-","/")}（{weekdayOf(ymd)}）</option>
                })}
              </select>
              <span style={{ fontSize:12, color:"#89adb8", fontFamily:"'Noto Sans JP',sans-serif", whiteSpace:"nowrap" }}>
                {weekdayOf(r.date) ? `（${weekdayOf(r.date)}）` : ""}
              </span>
            </div>
          </div>
          {/* 時刻 */}
          <div>
            <div style={{ fontSize:11, fontWeight:700, color:"#89adb8", letterSpacing:".1em", textTransform:"uppercase", marginBottom:6, fontFamily:"'Noto Sans JP',sans-serif" }}>時刻</div>
            <div className="slot-grid">
              <TimeSelect value={r.start} onChange={v => update(r.id, { start: v })} disabled={disabled} />
              <span className="slot-sep">〜</span>
              <TimeSelect value={r.end}   onChange={v => update(r.id, { end:   v })} disabled={disabled} />
            </div>
          </div>
          {/* メモ */}
          <div>
            <div style={{ fontSize:11, fontWeight:700, color:"#89adb8", letterSpacing:".1em", textTransform:"uppercase", marginBottom:6, fontFamily:"'Noto Sans JP',sans-serif" }}>メモ（任意）</div>
            <textarea className="field-textarea" value={r.note} placeholder="任意"
              disabled={disabled} onChange={e => update(r.id, { note: e.target.value })} />
          </div>
        </div>
      ))}
      <div style={{ padding:"12px 14px" }}>
        <button className="btn-add" disabled={disabled} onClick={add}>＋ 追加する</button>
      </div>
    </div>
  )
}

// ── メイン ────────────────────────────────────────────────────────
export default function ShiftSubmitPage() {
  const router = useRouter()
  const [meUser,  setMeUser]  = useState<User | null>(null)
  const [error,   setError]   = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const [monthCursor, setMonthCursor] = useState<Date>(() => { const n = new Date(); n.setHours(12,0,0,0); return n })
  const targetMonth = useMemo(() => monthStr(addMonths(monthCursor, 1)), [monthCursor])
  const deadline    = useMemo(() => deadlineForMonth(targetMonth), [targetMonth])
  const deadlineStr = useMemo(() => {
    const d = deadline
    return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())} 16:00`
  }, [deadline])

  const [allowedAfterDeadline, setAllowedAfterDeadline] = useState(false)
  const [staffRows,  setStaffRows]  = useState<SlotRow[]>([])
  const [lessonRows, setLessonRows] = useState<SlotRow[]>([])
  const [saving,    setSaving]    = useState(false)
  const [savedMsg,  setSavedMsg]  = useState<string | null>(null)

  const canEdit = useMemo(() => {
    const now = new Date()
    if (now <= deadline) return true
    if (meUser?.role === "admin") return true
    return allowedAfterDeadline
  }, [deadline, allowedAfterDeadline, meUser?.role])

  // ユーザー取得
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const r = await me()
      if (cancelled) return
      setLoading(false)
      if (!r.ok) {
        // 401 → ログインページへリダイレクト
        if (r.status === 401) { router.replace("/login/"); return }
        setError(toUserMessage(r as ApiNg, "読み込みに失敗しました"))
        return
      }
      setMeUser(r.user)
    })()
    return () => { cancelled = true }
  }, [router])

  // 期限後許可チェック
  useEffect(() => {
    if (!meUser) return
    let cancelled = false
    ;(async () => {
      const now = new Date()
      if (now <= deadline) { setAllowedAfterDeadline(false); return }
      const r = await apiFetch<{ month: string; allowed: boolean }>(
        `/shift_submission_permission_check.php?month=${encodeURIComponent(targetMonth)}`,
        { method: "GET" }
      )
      if (!cancelled) {
        setAllowedAfterDeadline(r.ok ? Boolean(r.allowed) : false)
      }
    })()
    return () => { cancelled = true }
  }, [meUser, deadline, targetMonth])

  // 既存データ取得
  useEffect(() => {
    if (!meUser) return
    let cancelled = false
    ;(async () => {
      setSavedMsg(null)
      const r = await apiFetch<{ submission: { staff_slots: any[]; lesson_slots: any[] } }>(
        `/shift_submission_get.php?month=${encodeURIComponent(targetMonth)}`,
        { method: "GET" }
      )
      if (cancelled) return
      if (!r.ok) {
        setError(toUserMessage(r as ApiNg, "読み込みに失敗しました"))
        return
      }
      const toRows = (slots: any[]): SlotRow[] =>
        (Array.isArray(slots) ? slots : []).map(s => ({
          id:    uid(),
          date:  String(s.date  || `${targetMonth}-01`),
          start: String(s.start || "17:00").slice(0, 5),
          end:   String(s.end   || "22:00").slice(0, 5),
          note:  String(s.note  || ""),
        }))
      setStaffRows(toRows(r.submission?.staff_slots  || []))
      setLessonRows(toRows(r.submission?.lesson_slots || []))
    })()
    return () => { cancelled = true }
  }, [meUser, targetMonth])

  async function onSave() {
    setSaving(true); setError(null); setSavedMsg(null)
    const r = await apiFetch<{}>("/shift_submission_save.php", {
      method: "POST",
      body: JSON.stringify({
        month:        targetMonth,
        staff_slots:  staffRows.map(r  => ({ date: r.date,  start: r.start,  end: r.end,  note: r.note  })),
        lesson_slots: lessonRows.map(r => ({ date: r.date,  start: r.start,  end: r.end,  note: r.note  })),
      }),
    })
    setSaving(false)
    if (!r.ok) { setError(toUserMessage(r as ApiNg, "保存に失敗しました")); return }
    setSavedMsg("保存しました")
  }

  if (loading) return (
    <div style={{ display:"flex",alignItems:"center",justifyContent:"center",minHeight:"60vh",fontFamily:"'Noto Sans JP',sans-serif",color:"#89adb8",fontSize:14 }}>
      <style>{CSS}</style>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#006284" strokeWidth="2" style={{ animation:"spin .8s linear infinite",marginRight:8 }}><path d="M21 12a9 9 0 11-6.22-8.56"/></svg>
      読み込み中…
    </div>
  )

  const isOverDeadline = new Date() > deadline

  return (
    <div style={{ minHeight:"100vh", background:"#f0f5f7", fontFamily:"'Noto Sans JP',sans-serif" }}>
      <style>{CSS}</style>

      {/* ── ヘッダー ── */}
      <header className="submit-header">
        <div className="submit-header-inner">
          <div>
            <p className="submit-eyebrow">Shift Submission</p>
            <h1 className="submit-title">シフト提出</h1>
          </div>
          <div className="month-seg">
            <button className="month-seg-btn" onClick={() => setMonthCursor(d => addMonths(d, -1))}>‹</button>
            <div className="month-seg-label">{targetMonth.replace("-","/")} 分</div>
            <button className="month-seg-btn" onClick={() => setMonthCursor(d => addMonths(d, 1))}>›</button>
          </div>
        </div>
      </header>

      <div className="submit-body">

        {/* 情報バー */}
        <div className="info-bar">
          <div className="info-bar-row">提出対象月: <b>{targetMonth}</b>（翌月）</div>
          <div className="info-bar-row">提出締切: <b>{deadlineStr}</b></div>
        </div>

        {/* 期限切れ警告 */}
        {isOverDeadline && !canEdit && (
          <div className="deadline-warn">
            提出期限を過ぎています。管理者の許可が必要です。
          </div>
        )}
        {isOverDeadline && canEdit && (
          <div className="deadline-warn" style={{ background:"#dff0f6", borderColor:"#bcd8e0", color:"#006284" }}>
            期限を過ぎていますが、提出が許可されています。
          </div>
        )}

        {/* フィードバック */}
        {error    && <div className="err-box">{error}</div>}
        {savedMsg && <div className="toast">✓ {savedMsg}</div>}

        {/* スタッフ勤務 */}
        <SlotCard
          title="スタッフ勤務"
          month={targetMonth}
          rows={staffRows}
          disabled={!canEdit || saving}
          onChange={setStaffRows}
        />

        {/* 授業 */}
        <SlotCard
          title="授業（兼任者向け）"
          month={targetMonth}
          rows={lessonRows}
          disabled={!canEdit || saving}
          onChange={setLessonRows}
        />

        {/* 保存 */}
        <button className="btn-save" disabled={!canEdit || saving} onClick={onSave}>
          {saving
            ? <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" style={{ animation:"spin .8s linear infinite" }}><path d="M21 12a9 9 0 11-6.22-8.56"/></svg>保存中…</>
            : "提出内容を保存する"
          }
        </button>

        <button className="btn-back" onClick={() => router.push("/shifts/")}>
          ← シフト画面へ戻る
        </button>
      </div>
    </div>
  )
}
