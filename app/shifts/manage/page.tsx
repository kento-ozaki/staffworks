"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { apiFetch } from "@/lib/api"
import type { ApiNg } from "@/lib/api"
import { toUserMessage } from "@/lib/errors"

// ── 型 ───────────────────────────────────────────────────────────
type Me               = { id: number; role: string; username: string }
type CalendarEvent    = { id: number; event_date: string; title: string; note?: string | null }
type ManagerDayOff    = { id: number; off_date: string; label: string; note?: string | null }
type SubmissionListItem = { user_id: number; month: string; submitted_at?: string | null; updated_at?: string | null; user_name?: string | null; user_role?: string | null }
type ShiftSlot        = { date: string; start: string; end: string; note?: string | null }
type SubmissionDetail = { submitted_at?: string | null; updated_at?: string | null; staff_slots: ShiftSlot[]; lesson_slots: ShiftSlot[] }
type UserRow          = { id: number; staff_id?: string | null; username: string; role: string }
type TabKey           = "event" | "manager" | "shift" | "late"
type LessonField      = { start: string; end: string; note?: string }
type ShiftRow         = { id: number; user_id: number; username: string; staff_id?: string | null; date: string; start: string; end: string; lesson_slots: ShiftSlot[]; note?: string | null }

// ── API エンドポイント定数 ────────────────────────────────────────
const SHIFT_LIST_ENDPOINT   = "shift_list.php"
const SHIFT_CREATE_ENDPOINT = "shift_create.php"
const SHIFT_UPDATE_ENDPOINT = "shift_update.php"
const SHIFT_DELETE_ENDPOINT = "shift_delete.php"

const BRAND      = "#006284"
const BRAND_SOFT = "rgba(0,98,132,0.8)"

// ── API ヘルパー ─────────────────────────────────────────────────
async function apiGet<T>(path: string): Promise<T & { ok: true }> {
  const r = await apiFetch<T>(path, { method: "GET" })
  if (!r.ok) {
    if (r.status === 401) throw new Error("unauthorized")
    throw new Error(toUserMessage(r as ApiNg))
  }
  return r as T & { ok: true }
}

async function apiPost<T>(path: string, body: unknown): Promise<T & { ok: true }> {
  const r = await apiFetch<T>(path, { method: "POST", body: JSON.stringify(body) })
  if (!r.ok) {
    if (r.status === 401) throw new Error("unauthorized")
    throw new Error(toUserMessage(r as ApiNg))
  }
  return r as T & { ok: true }
}

// ── ユーティリティ ───────────────────────────────────────────────
function pad2(n: number) { return String(n).padStart(2, "0") }
function startOfMonth(d: Date) { const x = new Date(d); x.setDate(1); x.setHours(12, 0, 0, 0); return x }
function addMonths(d: Date, m: number) { const x = new Date(d); x.setMonth(x.getMonth() + m); return startOfMonth(x) }
function monthKey(d: Date) { return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}` }
function monthLabel(d: Date) { return `${d.getFullYear()}/${pad2(d.getMonth() + 1)}` }
function monthRange(d: Date) {
  const start = startOfMonth(d), next = addMonths(start, 1)
  const from = `${start.getFullYear()}-${pad2(start.getMonth() + 1)}-01`
  const last = new Date(next); last.setDate(0)
  return { from, to: `${last.getFullYear()}-${pad2(last.getMonth() + 1)}-${pad2(last.getDate())}` }
}
function ymdToSlash(s: string) { return s.replaceAll("-", "/") }
function weekdayLabel(s: string) {
  const d = new Date(`${s}T00:00:00`)
  if (Number.isNaN(d.getTime())) return ""
  return `（${["日","月","火","水","木","金","土"][d.getDay()]}）`
}
function hhmm(v?: string | null) {
  if (!v) return ""
  const m = String(v).trim().match(/^(\d{1,2}):(\d{2})/)
  return m ? `${m[1].padStart(2,"0")}:${m[2]}` : String(v)
}
function formatTimeRange(s?: string | null, e?: string | null) { return (!s || !e) ? "-" : `${hhmm(s)}～${hhmm(e)}` }
const TIME_HOURS   = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"))
const TIME_MINUTES = ["00", "15", "30", "45"]
function normalizeTimeInput(v?: string | null) {
  const s = hhmm(v); if (!s) return ""
  const [h="00", m="00"] = s.split(":")
  const min = Number(m)
  const minute = Number.isFinite(min) ? TIME_MINUTES.reduce((p, c) => Math.abs(Number(c) - min) < Math.abs(Number(p) - min) ? c : p, "00") : "00"
  return `${h.padStart(2, "0")}:${minute}`
}
function isSameMonth(dateStr: string, month: string) { return typeof dateStr === "string" && dateStr.slice(0, 7) === month }
function buildMonthDateOptions(cursor: Date) {
  const start = startOfMonth(cursor), end = new Date(addMonths(start, 1)); end.setDate(0)
  const out: { value: string; label: string }[] = []
  for (let day = 1; day <= end.getDate(); day++) {
    const v = `${start.getFullYear()}-${pad2(start.getMonth() + 1)}-${pad2(day)}`
    out.push({ value: v, label: `${ymdToSlash(v)}${weekdayLabel(v)}` })
  }
  return out
}
function normalizeShiftRow(raw: any): ShiftRow | null {
  const id      = Number(raw?.id ?? raw?.shift_id ?? 0)
  const user_id = Number(raw?.user_id ?? raw?.staff_user_id ?? 0)
  const username= String(raw?.username ?? raw?.staff_username ?? raw?.name ?? "")
  const date    = String(raw?.date ?? raw?.shift_date ?? "")
  const start   = normalizeTimeInput(String(raw?.start ?? raw?.start_time ?? ""))
  const end     = normalizeTimeInput(String(raw?.end ?? raw?.end_time ?? ""))
  if (!id || !user_id || !date || !start || !end) return null
  const rawLessons = raw?.lesson_slots ?? raw?.lessons ?? []
  const lesson_slots: ShiftSlot[] = Array.isArray(rawLessons)
    ? rawLessons.map((x: any) => ({ date: String(x?.date ?? date), start: normalizeTimeInput(String(x?.start ?? x?.start_time ?? "")), end: normalizeTimeInput(String(x?.end ?? x?.end_time ?? "")), note: x?.note ?? null })).filter((x: ShiftSlot) => x.start && x.end)
    : []
  return { id, user_id, username, staff_id: raw?.staff_id ?? null, date, start, end, lesson_slots, note: raw?.note ?? null }
}

// ── QuarterTimeSelect ─────────────────────────────────────────────
function QuarterTimeSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [h, m] = value ? value.split(":") : ["", ""]
  return (
    <div style={{ display:"grid", gridTemplateColumns:"1fr auto 1fr", gap:6, alignItems:"center" }}>
      <select value={h||""} onChange={e => onChange(`${e.target.value}:${m||"00"}`)} className="field-input" style={{ cursor:"pointer" }}>
        <option value="">--</option>
        {TIME_HOURS.map(hh => <option key={hh} value={hh}>{hh}</option>)}
      </select>
      <span style={{ color:"#89adb8", fontWeight:700, fontSize:14 }}>:</span>
      <select value={m||""} onChange={e => onChange(`${h||"00"}:${e.target.value}`)} className="field-input" style={{ cursor:"pointer" }}>
        <option value="">--</option>
        {TIME_MINUTES.map(mm => <option key={mm} value={mm}>{mm}</option>)}
      </select>
    </div>
  )
}

// ── CSS ───────────────────────────────────────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700&display=swap');
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html { -webkit-text-size-adjust: 100%; }
@keyframes spin { to { transform: rotate(360deg); } }

/* ── タブバー ── */
.tab-bar{display:flex;gap:0;border-bottom:2px solid #d8eaee;background:#fff;position:sticky;top:0;z-index:10;}
.tab-btn{flex:1;height:46px;border:none;background:transparent;font-size:13px;font-weight:700;font-family:'Noto Sans JP',sans-serif;color:#89adb8;cursor:pointer;-webkit-tap-highlight-color:transparent;transition:color .12s;border-bottom:2px solid transparent;margin-bottom:-2px;}
.tab-btn.on{color:#006284;border-bottom-color:#006284;}

/* ── 月ナビ ── */
.month-nav{display:flex;align-items:center;justify-content:center;gap:16px;padding:14px 16px;background:#fff;border-bottom:1px solid #d8eaee;}
.month-nav-label{font-size:16px;font-weight:700;color:#006284;font-family:'Noto Sans JP',sans-serif;min-width:80px;text-align:center;}
.month-nav-btn{width:34px;height:34px;border-radius:50%;border:1.5px solid #d8eaee;background:#f8fbfc;display:flex;align-items:center;justify-content:center;font-size:18px;color:#3b6878;cursor:pointer;-webkit-tap-highlight-color:transparent;}

/* ── コンテンツ ── */
.content{padding:16px;display:grid;gap:16px;max-width:720px;margin:0 auto;}

/* ── セクションカード ── */
.sec-card{background:#fff;border-radius:14px;border:1.5px solid #d8eaee;overflow:hidden;}
.sec-head{padding:12px 16px;border-bottom:1px solid #d8eaee;display:flex;align-items:center;justify-content:space-between;}
.sec-title{font-size:14px;font-weight:700;color:#0c1d24;font-family:'Noto Sans JP',sans-serif;}

/* ── フィールド ── */
.field{padding:12px 16px;border-bottom:1px solid #d8eaee;}
.field:last-child{border-bottom:none;}
.field-label{font-size:12px;font-weight:700;color:#89adb8;font-family:'Noto Sans JP',sans-serif;margin-bottom:6px;}
.field-input{width:100%;height:38px;border-radius:8px;border:1.5px solid #d8eaee;padding:0 12px;font-size:13px;font-family:'Noto Sans JP',sans-serif;color:#0c1d24;background:#f8fbfc;outline:none;-webkit-appearance:none;}
.field-input:focus{border-color:#006284;background:#fff;}

/* ── ステップラベル ── */
.step-label{display:flex;align-items:center;gap:7px;font-size:11px;font-weight:700;color:#89adb8;letter-spacing:.08em;font-family:'Noto Sans JP',sans-serif;margin-bottom:8px;}
.step-num{width:18px;height:18px;border-radius:50%;background:#006284;color:#fff;font-size:10px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
.step-num.done{background:#9fd0b5;}

/* ── 提出候補カード ── */
.candidate-card{border:1.5px solid #d8eaee;border-radius:10px;background:#f8fbfc;overflow:hidden;cursor:pointer;-webkit-tap-highlight-color:transparent;transition:border-color .12s,background .12s;}
.candidate-card:active{opacity:.85;}
.candidate-card.selected{border-color:#006284;background:#eaf4f8;}
.candidate-header{display:flex;align-items:center;justify-content:space-between;padding:10px 12px 6px;gap:8px;}
.candidate-name{font-size:14px;font-weight:700;color:#0c1d24;font-family:'Noto Sans JP',sans-serif;}
.badge-submitted{font-size:10px;font-weight:700;color:#1a6640;background:#eaf5ee;border:1px solid #9fd0b5;padding:2px 7px;border-radius:4px;white-space:nowrap;flex-shrink:0;}
.badge-none{font-size:10px;font-weight:700;color:#89adb8;background:#f0f5f7;border:1px solid #d8eaee;padding:2px 7px;border-radius:4px;white-space:nowrap;flex-shrink:0;}
.candidate-chips{display:flex;flex-wrap:wrap;gap:5px;padding:0 12px 10px;}
.chip{font-size:11px;font-weight:700;padding:3px 8px;border-radius:5px;font-family:'Noto Sans JP',sans-serif;}
.chip.work{background:#e4f2f7;color:#006284;border:1px solid #bcd8e0;}
.chip.lesson{background:#fdf6e0;color:#7a5400;border:1px solid #dfc060;}

/* ── 選択済みスタッフバー ── */
.selected-user-bar{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:10px 12px;background:#eaf4f8;border-radius:9px;border:1.5px solid #006284;}
.selected-user-name{font-size:15px;font-weight:700;color:#006284;font-family:'Noto Sans JP',sans-serif;}

/* ── 反映ボタン ── */
.apply-btn{display:inline-flex;align-items:center;gap:5px;height:32px;padding:0 12px;border-radius:7px;border:1.5px solid #bcd8e0;background:#e4f2f7;color:#006284;font-size:12px;font-weight:700;font-family:'Noto Sans JP',sans-serif;cursor:pointer;-webkit-tap-highlight-color:transparent;margin-bottom:10px;}
.apply-btn:active{opacity:.8;}

/* ── 提出バッジ (後方互換) ── */
.submitted-badge{display:inline-flex;align-items:center;gap:4px;margin-top:6px;padding:3px 9px;border-radius:6px;background:#eaf5ee;border:1px solid #9fd0b5;font-size:11px;font-weight:700;color:#1a6640;font-family:'Noto Sans JP',sans-serif;}

/* ── ボタン ── */
.btn-primary{height:42px;border-radius:10px;border:none;background:#006284;color:#fff;font-size:14px;font-weight:700;font-family:'Noto Sans JP',sans-serif;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;-webkit-tap-highlight-color:transparent;transition:opacity .12s;}
.btn-primary:active{opacity:.8;}
.btn-primary:disabled{opacity:.5;cursor:default;}
.btn-primary.danger{background:#c0392b;}
.btn-outline{height:38px;border-radius:10px;border:1.5px solid #d8eaee;background:#f8fbfc;color:#3b6878;font-size:13px;font-weight:700;font-family:'Noto Sans JP',sans-serif;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;-webkit-tap-highlight-color:transparent;transition:opacity .12s;}
.btn-outline:active{opacity:.7;}
.btn-sm{height:34px;font-size:12px;padding:0 12px;}
.err-box{padding:12px 14px;background:#fdf1f1;border:1px solid #e8b8b8;border-radius:10px;color:#b83030;font-size:13px;font-family:'Noto Sans JP',sans-serif;}

/* ── リスト行 ── */
.list-row{padding:12px 16px;border-bottom:1px solid #d8eaee;display:flex;align-items:center;gap:12px;}
.list-row:last-child{border-bottom:none;}
.list-date{font-size:13px;font-weight:700;color:#006284;font-family:'Noto Sans JP',sans-serif;white-space:nowrap;flex-shrink:0;}
.list-label{flex:1;font-size:13px;color:#0c1d24;font-family:'Noto Sans JP',sans-serif;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}

/* ── シフト行 ── */
.shift-row{padding:12px 16px;border-bottom:1px solid #d8eaee;}
.shift-row:last-child{border-bottom:none;}
.shift-row-main{font-size:13px;font-weight:700;color:#0c1d24;font-family:'Noto Sans JP',sans-serif;margin-bottom:8px;}
.shift-row-actions{display:flex;gap:8px;}

/* ── 授業カード ── */
.lesson-card{padding:12px;border-radius:10px;border:1.5px solid #d8eaee;background:#f8fbfc;display:grid;gap:10px;}
.lesson-title{font-size:12px;font-weight:700;color:#89adb8;font-family:'Noto Sans JP',sans-serif;}

/* ── 空ボックス ── */
.empty-box{padding:20px 16px;text-align:center;font-size:13px;color:#89adb8;font-family:'Noto Sans JP',sans-serif;}

/* ── パーミッション行 ── */
.perm-row{padding:12px 16px;border-bottom:1px solid #d8eaee;display:flex;align-items:center;gap:12px;}
.perm-row:last-child{border-bottom:none;}
.perm-name{flex:1;font-size:13px;font-weight:700;color:#0c1d24;font-family:'Noto Sans JP',sans-serif;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.perm-btn{flex-shrink:0;height:32px;padding:0 14px;border-radius:999px;border:none;font-size:12px;font-weight:700;font-family:'Noto Sans JP',sans-serif;cursor:pointer;-webkit-tap-highlight-color:transparent;}
.perm-btn.on{background:#006284;color:#fff;}
.perm-btn.off{background:rgba(0,98,132,0.7);color:#fff;}
`

// ── メイン ────────────────────────────────────────────────────────
export default function ShiftsManagePage() {
  const router = useRouter()
  const [meUser,    setMeUser]    = useState<Me | null>(null)
  const [loading,   setLoading]   = useState(true)
  const [err,       setErr]       = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<TabKey>("shift")

  const [cursor, setCursor] = useState<Date>(() => startOfMonth(new Date()))
  const range       = useMemo(() => monthRange(cursor), [cursor])
  const month       = useMemo(() => monthKey(cursor), [cursor])
  const dateOptions = useMemo(() => buildMonthDateOptions(cursor), [cursor])

  const [events,  setEvents]  = useState<CalendarEvent[]>([])
  const [daysOff, setDaysOff] = useState<ManagerDayOff[]>([])

  const [eventDate,  setEventDate]  = useState<string>(range.from)
  const [eventTitle, setEventTitle] = useState<string>("")
  const [offDate,    setOffDate]    = useState<string>(range.from)

  const [users,            setUsers]           = useState<UserRow[]>([])
  const [permUserIds,      setPermUserIds]      = useState<Set<number>>(new Set())
  // ✅ Fix B: submittedUserIds は allSubmissionDetails の useEffect のみが管理する
  const [submittedUserIds, setSubmittedUserIds] = useState<Set<number>>(new Set())

  const [selectedDate,   setSelectedDate]   = useState<string>(range.from)
  const [selectedUserId, setSelectedUserId] = useState<number>(0)
  const [shiftId,        setShiftId]        = useState<number | null>(null)
  const [shiftStart,     setShiftStart]     = useState("17:00")
  const [shiftEnd,       setShiftEnd]       = useState("22:00")
  const [lessonFields,   setLessonFields]   = useState<LessonField[]>([{ start: "", end: "", note: "" }])
  const [submissionDetail, setSubmissionDetail] = useState<SubmissionDetail | null>(null)
  const [allSubmissionDetails, setAllSubmissionDetails] = useState<Record<number, SubmissionDetail>>({})
  const [dayCandidates, setDayCandidates]   = useState<Array<{ user_id: number; username: string; staff_slots: Array<{ start: string; end: string }>; lesson_slots: Array<{ start: string; end: string }> }>>([])
  const [shifts, setShifts]                 = useState<ShiftRow[]>([])
  const [savingShift, setSavingShift]       = useState(false)
  const editCardRef = useRef<HTMLDivElement | null>(null)

  const canManage   = meUser?.role === "admin" || meUser?.role === "leader"
  const canSetPerms = meUser?.role === "admin"

  const filteredSubmission = useMemo(() => ({
    staff:   (submissionDetail?.staff_slots || []).filter(x => x.date === selectedDate),
    lessons: (submissionDetail?.lesson_slots || []).filter(x => x.date === selectedDate),
  }), [submissionDetail, selectedDate])

  const dayAvailableSubmissions = useMemo(() => {
    if (dayCandidates.length > 0) {
      return dayCandidates
        .map(c => ({
          user: users.find(u => u.id === c.user_id) || { id: c.user_id, username: c.username, role: "", staff_id: null },
          staff:   c.staff_slots.map(x  => ({ date: selectedDate, start: x.start, end: x.end, note: null })),
          lessons: c.lesson_slots.map(x => ({ date: selectedDate, start: x.start, end: x.end, note: null })),
        }))
        .filter(r => r.staff.length > 0 || r.lessons.length > 0) as Array<{ user: UserRow; staff: ShiftSlot[]; lessons: ShiftSlot[] }>
    }
    return users.map(u => {
      const d = allSubmissionDetails[u.id]
      const staff   = (d?.staff_slots||[]).filter(x => x.date === selectedDate)
      const lessons = (d?.lesson_slots||[]).filter(x => x.date === selectedDate)
      if (!staff.length && !lessons.length) return null
      return { user: u, staff, lessons }
    }).filter(Boolean) as Array<{ user: UserRow; staff: ShiftSlot[]; lessons: ShiftSlot[] }>
  }, [users, allSubmissionDetails, dayCandidates, selectedDate])

  const shiftsForMonth = useMemo(() =>
    [...shifts].sort((a,b) => a.date===b.date ? a.start.localeCompare(b.start) : a.date.localeCompare(b.date))
  , [shifts])

  // ── データ取得 ──────────────────────────────────────────────────
  useEffect(() => {
    ;(async () => {
      try {
        setLoading(true); setErr(null)
        const r = await apiGet<{ user: Me }>("me.php")
        setMeUser(r.user)
      } catch (e: any) {
        if (String(e?.message||"").includes("unauthorized")) { router.replace("/login/"); return }
        setErr(e?.message||"読み込みに失敗しました")
      } finally { setLoading(false) }
    })()
  }, [router])

  useEffect(() => {
    const html = document.documentElement, body = document.body
    const prev = [html.style.overflowX, body.style.overflowX, html.style.touchAction, body.style.touchAction]
    html.style.overflowX="hidden"; body.style.overflowX="hidden"; html.style.touchAction="pan-y"; body.style.touchAction="pan-y"
    return () => { html.style.overflowX=prev[0]; body.style.overflowX=prev[1]; html.style.touchAction=prev[2]; body.style.touchAction=prev[3] }
  }, [])

  useEffect(() => {
    setEventDate(p => p||range.from); setOffDate(p => p||range.from)
    setSelectedDate(p => (p&&p>=range.from&&p<=range.to)?p:range.from)
  }, [range.from, range.to])

  async function refreshEventsAndOff() {
    const [ev, off] = await Promise.all([
      apiGet<{ events: CalendarEvent[] }>(`calendar_events_list.php?from=${range.from}&to=${range.to}`),
      apiGet<{ days_off: ManagerDayOff[] }>(`manager_days_off_list.php?from=${range.from}&to=${range.to}`),
    ])
    setEvents(ev.events||[]); setDaysOff(off.days_off||[])
  }

  async function refreshUsersAndPerms() {
    if (!canManage) return
    const u = await apiGet<{ users: UserRow[] }>("shift_users_list.php")
    setUsers(u.users||[])
    if (canSetPerms) {
      const p = await apiGet<{ permissions: { user_id: number }[] }>(`shift_submission_permissions_list.php?month=${month}`)
      setPermUserIds(new Set((p.permissions||[]).map(x=>x.user_id)))
    } else {
      setPermUserIds(new Set())
    }
    // ✅ Fix B: ここでは submittedUserIds をセットしない
    // submittedUserIds は useEffect([canManage, month, users]) 側で一元管理する
  }

  async function refreshShifts() {
    try {
      const data = await apiGet<any>(`${SHIFT_LIST_ENDPOINT}?from=${range.from}&to=${range.to}`)
      const raw = data.items||data.shifts||data.list||[]
      setShifts(Array.isArray(raw) ? raw.map(normalizeShiftRow).filter(Boolean) as ShiftRow[] : [])
    } catch (e: any) { setShifts([]); throw new Error(e?.message||"シフト一覧の取得に失敗しました") }
  }

  useEffect(() => {
    if (!meUser) return
    if (!canManage) { router.replace("/shifts/"); return }
    ;(async () => {
      try { setErr(null); await Promise.all([refreshEventsAndOff(), refreshUsersAndPerms(), refreshShifts()]) }
      catch (e: any) { setErr(e?.message||"読み込みに失敗しました") }
    })()
  }, [meUser, canManage, month, range.from, range.to, router])

  // selectedUser が変わったとき提出詳細を取得
  useEffect(() => {
    if (!canManage || !selectedUserId) { setSubmissionDetail(null); return }
    ;(async () => {
      try {
        const d = await apiGet<{ submission: SubmissionDetail | null }>(`shift_submission_get_for_manage.php?month=${month}&user_id=${selectedUserId}`)
        setSubmissionDetail(d.submission)
      } catch { setSubmissionDetail(null) }
    })()
  }, [canManage, month, selectedUserId])

  // 選択日の候補を取得
  useEffect(() => {
    if (!canManage || !selectedDate) { setDayCandidates([]); return }
    let cancelled = false
    ;(async () => {
      try {
        const d = await apiGet<{ candidates?: any[] }>(`shift_submission_day_candidates.php?date=${selectedDate}`)
        if (!cancelled) setDayCandidates(Array.isArray(d.candidates) ? d.candidates : [])
      } catch { if (!cancelled) setDayCandidates([]) }
    })()
    return () => { cancelled = true }
  }, [canManage, selectedDate])

  // ✅ Fix B: submittedUserIds をここで一元管理
  // refreshUsersAndPerms() の後に users が更新されてこの useEffect が走るため競合しない
  useEffect(() => {
    if (!canManage || users.length === 0) { setAllSubmissionDetails({}); setSubmittedUserIds(new Set()); return }
    let cancelled = false
    ;(async () => {
      try {
        const results = await Promise.all(users.map(async u => {
          try {
            const d = await apiGet<{ submission: SubmissionDetail | null }>(`shift_submission_get_for_manage.php?month=${month}&user_id=${u.id}`)
            return [u.id, d.submission] as const
          } catch { return [u.id, null] as const }
        }))
        if (cancelled) return
        const next: Record<number, SubmissionDetail> = {}; const subIds = new Set<number>()
        for (const [uid, detail] of results) {
          // ✅ Fix C: エラー時もここまで来ないように try/catch 済み
          const has = !!(detail && (
            (detail.staff_slots||[]).some(s => isSameMonth(s.date, month)) ||
            (detail.lesson_slots||[]).some(s => isSameMonth(s.date, month))
          ))
          if (detail && has) { next[uid as number] = detail; subIds.add(uid as number) }
        }
        setAllSubmissionDetails(next)
        setSubmittedUserIds(subIds) // ✅ ここだけで更新（競合なし）
      } catch {
        if (!cancelled) {
          // ✅ Fix C: エラー時に allSubmissionDetails を空にしない（既存データ保持）
          // setAllSubmissionDetails({}) は削除
        }
      }
    })()
    return () => { cancelled = true }
  }, [canManage, month, users])

  // ── フォーム操作 ─────────────────────────────────────────────────
  function resetShiftForm(keepUser = false) {
    setShiftId(null)
    setSelectedDate(p => (p&&p>=range.from&&p<=range.to)?p:range.from)
    setSelectedUserId(p => keepUser?p:0)
    setShiftStart("17:00"); setShiftEnd("22:00"); setLessonFields([{ start:"", end:"", note:"" }])
  }

  function applyLessonsFromSubmission() {
    const match = dayAvailableSubmissions.find(x => x.user.id === selectedUserId)
    const lessons = (match?.lessons?.length ? match.lessons : filteredSubmission.lessons) || []
    if (!lessons.length) { setErr("このスタッフの提出済み授業はありません"); setLessonFields([{ start:"", end:"", note:"" }]); return }
    setErr(null); setLessonFields(lessons.map(x => ({ start:x.start, end:x.end, note:x.note||"" })))
  }

  async function addEvent() {
    try {
      setErr(null)
      const title = eventTitle.trim()
      if (!title) { setErr("イベント名を入力してください"); return }
      await apiPost("calendar_events_upsert.php", { id:null, event_date:eventDate, title, note:null })
      setEventTitle("")
      await refreshEventsAndOff()
    } catch (e: any) { setErr(e?.message||"登録に失敗しました") }
  }

  async function deleteEvent(id: number) {
    try { setErr(null); await apiPost("calendar_events_delete.php", { id }); await refreshEventsAndOff() }
    catch (e: any) { setErr(e?.message||"削除に失敗しました") }
  }

  function isOffDate(d: string) { return daysOff.some(x => x.off_date === d) }

  async function toggleDayOff() {
    try { setErr(null); await apiPost("manager_days_off_set.php", { off_date:offDate, enabled:!isOffDate(offDate), label:"教室長公休", note:null }); await refreshEventsAndOff() }
    catch (e: any) { setErr(e?.message||"更新に失敗しました") }
  }

  async function deleteDayOff(ds: string) {
    try { setErr(null); await apiPost("manager_days_off_set.php", { off_date:ds, enabled:false, label:"教室長公休", note:null }); await refreshEventsAndOff() }
    catch (e: any) { setErr(e?.message||"削除に失敗しました") }
  }

  async function setPermission(userId: number, allowed: boolean) {
    if (!canSetPerms) return
    try {
      setErr(null)
      await apiPost("shift_submission_permissions_set.php", { month, user_id:userId, allowed })
      setPermUserIds(p => { const n=new Set(p); allowed?n.add(userId):n.delete(userId); return n })
    } catch (e: any) { setErr(e?.message||"更新に失敗しました") }
  }

  async function saveShift() {
    if (savingShift) return
    try {
      setErr(null)
      if (!selectedDate) { setErr("日付を選択してください"); return }
      if (!selectedUserId) { setErr("スタッフを選択してください"); return }
      if (!shiftStart || !shiftEnd || shiftStart >= shiftEnd) { setErr("勤務時刻を正しく入力してください"); return }
      const lessons = lessonFields.map(x => ({ start:x.start, end:x.end, note:(x.note||"").trim()||null })).filter(x => x.start&&x.end)
      if (lessons.some(x => x.start >= x.end)) { setErr("授業時間を正しく入力してください"); return }
      const payload = { ...(shiftId?{id:shiftId}:{}), staff_user_id:selectedUserId, shift_date:selectedDate, start_time:shiftStart, end_time:shiftEnd, lesson_slots:lessons.map(x=>({date:selectedDate,...x})), note:null }
      setSavingShift(true)
      shiftId
        ? await apiPost(SHIFT_UPDATE_ENDPOINT, payload)
        : await apiPost(SHIFT_CREATE_ENDPOINT, payload)
      await refreshShifts(); resetShiftForm(true)
    } catch (e: any) { setErr(e?.message||"シフトの保存に失敗しました") }
    finally { setSavingShift(false) }
  }

  async function deleteShift(id: number) {
    try {
      if (!window.confirm("削除しますか？")) return
      setErr(null)
      await apiPost(SHIFT_DELETE_ENDPOINT, { id, shift_id:id })
      await refreshShifts()
      if (shiftId===id) resetShiftForm(true)
    } catch (e: any) { setErr(e?.message||"削除に失敗しました") }
  }

  function startEditShift(row: ShiftRow) {
    setActiveTab("shift"); setShiftId(row.id); setSelectedDate(row.date); setSelectedUserId(row.user_id)
    setShiftStart(row.start); setShiftEnd(row.end)
    setLessonFields(row.lesson_slots.length ? row.lesson_slots.map(x=>({start:x.start,end:x.end,note:x.note||""})) : [{ start:"", end:"", note:"" }])
    requestAnimationFrame(() => editCardRef.current?.scrollIntoView({ behavior:"smooth", block:"start" }))
  }

  function updateLessonField(i: number, k: keyof LessonField, v: string) { setLessonFields(p => p.map((it,j) => j===i?{...it,[k]:v}:it)) }
  function addLessonField()  { setLessonFields(p => [...p, { start:"", end:"", note:"" }]) }
  function removeLessonField(i: number) { setLessonFields(p => { const n=p.filter((_,j)=>j!==i); return n.length?n:[{ start:"", end:"", note:"" }] }) }

  const TABS: { key: TabKey; label: string }[] = [
    { key:"event",   label:"イベント" },
    { key:"manager", label:"教室長" },
    { key:"shift",   label:"シフト" },
    { key:"late",    label:"期限後提出" },
  ]

  if (loading) return (
    <div style={{ display:"flex",alignItems:"center",justifyContent:"center",minHeight:"60vh",fontFamily:"'Noto Sans JP',sans-serif",color:"#89adb8",fontSize:14 }}>
      <style>{CSS}</style>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#006284" strokeWidth="2" style={{ animation:"spin .8s linear infinite",marginRight:8 }}><path d="M21 12a9 9 0 11-6.22-8.56"/></svg>
      読み込み中…
    </div>
  )

  return (
    <div style={{ width:"100%", maxWidth:768, margin:"0 auto", background:"#f0f5f7", minHeight:"100vh", overflowX:"hidden", touchAction:"pan-y" }}>
      <style>{CSS}</style>

      {/* ── タブバー ── */}
      <div className="tab-bar">
        {TABS.map(t => (
          <button key={t.key} className={`tab-btn${activeTab===t.key?" on":""}`} onClick={() => setActiveTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── 月ナビ ── */}
      <div className="month-nav">
        <button className="month-nav-btn" aria-label="前月" onClick={() => setCursor(d => addMonths(d, -1))}>‹</button>
        <div className="month-nav-label">{monthLabel(cursor)}</div>
        <button className="month-nav-btn" aria-label="次月" onClick={() => setCursor(d => addMonths(d, 1))}>›</button>
      </div>

      {/* ── エラー ── */}
      {err && <div style={{ padding:"0 16px",marginTop:12,maxWidth:720,margin:"12px auto 0" }}><div className="err-box">{err}</div></div>}

      {/* ── コンテンツ ── */}
      <div className="content">

        {/* ══ イベントタブ ══ */}
        {activeTab === "event" && (
          <>
            <div className="sec-card">
              <div className="sec-head"><span className="sec-title">イベントを登録</span></div>
              <div className="field">
                <div className="field-label">日付</div>
                <input type="date" value={eventDate} onChange={e => setEventDate(e.target.value)} className="field-input" />
              </div>
              <div className="field">
                <div className="field-label">イベントタイトル</div>
                <input value={eventTitle} onChange={e => setEventTitle(e.target.value)} placeholder="〇〇イベント" className="field-input" />
              </div>
              <div className="field">
                <button className="btn-primary" style={{ width:"100%" }} onClick={addEvent}>登録する</button>
              </div>
            </div>

            <div className="sec-card">
              <div className="sec-head"><span className="sec-title">登録済みイベント</span></div>
              {events.length === 0
                ? <div className="empty-box">この月のイベントはありません</div>
                : events.map(ev => (
                  <div key={ev.id} className="list-row">
                    <span className="list-date">{ymdToSlash(ev.event_date)}{weekdayLabel(ev.event_date)}</span>
                    <span className="list-label">{ev.title}</span>
                    <button className="btn-outline btn-sm" onClick={() => deleteEvent(ev.id)}>削除</button>
                  </div>
                ))
              }
            </div>
          </>
        )}

        {/* ══ 教室長タブ ══ */}
        {activeTab === "manager" && (
          <>
            <div className="sec-card">
              <div className="sec-head"><span className="sec-title">公休を設定</span></div>
              <div className="field">
                <div className="field-label">日付</div>
                <select value={offDate} onChange={e => setOffDate(e.target.value)} className="field-input" style={{ cursor:"pointer" }}>
                  {dateOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div className="field">
                <button className="btn-primary" style={{ width:"100%" }} onClick={toggleDayOff}>
                  {isOffDate(offDate) ? "公休を解除する" : "公休に設定する"}
                </button>
              </div>
            </div>

            <div className="sec-card">
              <div className="sec-head"><span className="sec-title">登録済み公休</span></div>
              {daysOff.length === 0
                ? <div className="empty-box">この月の公休はありません</div>
                : daysOff.map(d => (
                  <div key={d.id} className="list-row">
                    <span className="list-date">{ymdToSlash(d.off_date)}{weekdayLabel(d.off_date)}</span>
                    <span className="list-label">{d.label}</span>
                    <button className="btn-outline btn-sm" onClick={() => deleteDayOff(d.off_date)}>削除</button>
                  </div>
                ))
              }
            </div>
          </>
        )}

        {/* ══ シフトタブ ══ */}
        {activeTab === "shift" && (
          <>
            {/* シフト登録・編集カード */}
            <div className="sec-card" ref={editCardRef}>
              <div className="sec-head">
                <span className="sec-title">{shiftId ? "シフトを編集" : "シフトを登録"}</span>
                {shiftId && <button className="btn-outline btn-sm" onClick={() => resetShiftForm()}>新規登録に戻す</button>}
              </div>

              {/* ── STEP① 日付選択 ── */}
              <div className="field">
                <div className="step-label">
                  <span className={`step-num${selectedDate ? " done" : ""}`}>1</span>
                  日付を選択
                </div>
                <select
                  value={selectedDate}
                  onChange={e => { setSelectedDate(e.target.value); setSelectedUserId(0); setShiftStart("17:00"); setShiftEnd("22:00"); setLessonFields([{ start:"", end:"", note:"" }]) }}
                  className="field-input"
                  style={{ cursor:"pointer" }}
                >
                  {dateOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>

              {/* ── STEP② その日の提出データ一覧（参照用・選択不可） ── */}
              <div className="field">
                <div className="step-label">
                  <span className={`step-num${dayAvailableSubmissions.length > 0 ? " done" : ""}`}>2</span>
                  {ymdToSlash(selectedDate)} のシフト希望
                </div>
                {dayAvailableSubmissions.length === 0 ? (
                  <div style={{ fontSize:12, color:"#89adb8", fontFamily:"'Noto Sans JP',sans-serif" }}>提出されているシフト希望はありません。</div>
                ) : (
                  <div style={{ display:"grid", gap:8 }}>
                    {dayAvailableSubmissions.map(x => (
                      <div key={x.user.id} className="candidate-card" style={{ cursor:"default" }}>
                        <div className="candidate-header">
                          <span className="candidate-name">{x.user.username}</span>
                          <span className="badge-submitted">✅ 提出済み</span>
                        </div>
                        <div className="candidate-chips">
                          {x.staff.map((s, j) => (
                            <span key={`s${j}`} className="chip work">🕐 {formatTimeRange(s.start, s.end)}</span>
                          ))}
                          {x.lessons.map((l, j) => (
                            <span key={`l${j}`} className="chip lesson">📚 {formatTimeRange(l.start, l.end)}</span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ── STEP③ スタッフ選択（プルダウン） ── */}
              <div className="field">
                <div className="step-label">
                  <span className={`step-num${selectedUserId ? " done" : ""}`}>3</span>
                  登録するスタッフ
                </div>
                {users.length === 0 ? (
                  <div style={{ fontSize:13, color:"#89adb8", fontFamily:"'Noto Sans JP',sans-serif" }}>スタッフ情報を取得中…</div>
                ) : (
                  <div className="staff-select-wrap">
                    <select
                      className={`staff-select${selectedUserId ? " has-value" : ""}`}
                      value={selectedUserId || ""}
                      onChange={e => {
                        const uid = Number(e.target.value)
                        setSelectedUserId(uid)
                        // 選択スタッフの提出データがあれば自動反映
                        const sub = dayAvailableSubmissions.find(x => x.user.id === uid)
                        if (sub) {
                          if (sub.staff.length > 0) { setShiftStart(sub.staff[0].start); setShiftEnd(sub.staff[0].end) }
                          if (sub.lessons.length > 0) { setLessonFields(sub.lessons.map(l => ({ start:l.start, end:l.end, note:l.note||"" }))) }
                          else { setLessonFields([{ start:"", end:"", note:"" }]) }
                        } else {
                          setShiftStart("17:00"); setShiftEnd("22:00"); setLessonFields([{ start:"", end:"", note:"" }])
                        }
                      }}
                    >
                      <option value="">スタッフを選択してください</option>
                      {users.map(u => (
                        <option key={u.id} value={u.id}>{u.username}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* ── STEP④〜⑤ スタッフ選択後に展開 ── */}
              {selectedUserId > 0 && (() => {
                const subData = dayAvailableSubmissions.find(x => x.user.id === selectedUserId)
                return (
                  <>

                    {/* STEP④ 勤務時間 */}
                    <div className="field">
                      <div className="step-label">
                        <span className="step-num">4</span>
                        勤務時間
                      </div>
                      {subData && subData.staff.length > 0 && (
                        <button
                          className="apply-btn"
                          onClick={() => { setShiftStart(subData.staff[0].start); setShiftEnd(subData.staff[0].end) }}
                        >
                          ↓ 提出データを反映（{formatTimeRange(subData.staff[0].start, subData.staff[0].end)}）
                        </button>
                      )}
                      <div style={{ display:"grid", gridTemplateColumns:"1fr auto 1fr", gap:10, alignItems:"end" }}>
                        <div>
                          <div style={{ fontSize:11, color:"#89adb8", fontWeight:700, fontFamily:"'Noto Sans JP',sans-serif", marginBottom:5 }}>開始</div>
                          <QuarterTimeSelect value={shiftStart} onChange={setShiftStart} />
                        </div>
                        <span style={{ color:"#89adb8", fontWeight:700, paddingBottom:8 }}>〜</span>
                        <div>
                          <div style={{ fontSize:11, color:"#89adb8", fontWeight:700, fontFamily:"'Noto Sans JP',sans-serif", marginBottom:5 }}>終了</div>
                          <QuarterTimeSelect value={shiftEnd} onChange={setShiftEnd} />
                        </div>
                      </div>
                    </div>

                    {/* STEP⑤ 授業枠 */}
                    <div className="field">
                      <div className="step-label">
                        <span className="step-num">5</span>
                        授業枠（任意）
                      </div>
                      {subData && subData.lessons.length > 0 && (
                        <button className="apply-btn" onClick={applyLessonsFromSubmission}>
                          ↓ 提出データから読み込む（{subData.lessons.length}件）
                        </button>
                      )}
                      <div style={{ display:"grid", gap:10 }}>
                        {lessonFields.map((lesson, i) => (
                          <div key={i} className="lesson-card">
                            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                              <span className="lesson-title">授業 {i + 1}</span>
                              <button className="btn-outline btn-sm" onClick={() => removeLessonField(i)}>削除</button>
                            </div>
                            <div style={{ display:"grid", gridTemplateColumns:"1fr auto 1fr", gap:8, alignItems:"center" }}>
                              <QuarterTimeSelect value={lesson.start} onChange={v => updateLessonField(i, "start", v)} />
                              <span style={{ color:"#89adb8", fontWeight:700 }}>〜</span>
                              <QuarterTimeSelect value={lesson.end}   onChange={v => updateLessonField(i, "end",   v)} />
                            </div>
                          </div>
                        ))}
                        <button className="btn-outline" onClick={addLessonField}>＋ 授業を追加</button>
                      </div>
                    </div>
                  </>
                )
              })()}

              {/* 保存ボタン */}
              <div className="field">
                <button
                  className="btn-primary"
                  style={{ width:"100%" }}
                  disabled={savingShift || !selectedUserId}
                  onClick={saveShift}
                >
                  {savingShift
                    ? <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" style={{ animation:"spin .8s linear infinite" }}><path d="M21 12a9 9 0 11-6.22-8.56"/></svg>保存中…</>
                    : (shiftId ? "更新する" : "登録する")
                  }
                </button>
                {!selectedUserId && (
                  <p style={{ fontSize:11, color:"#b8d0da", textAlign:"center", marginTop:6, fontFamily:"'Noto Sans JP',sans-serif" }}>
                    ↑ スタッフを選択してください
                  </p>
                )}
              </div>
            </div>

            {/* シフト一覧 */}
            <div className="sec-card">
              <div className="sec-head"><span className="sec-title">登録済みシフト</span></div>
              {shiftsForMonth.length === 0
                ? <div className="empty-box">この月のシフトはありません</div>
                : shiftsForMonth.map(row => (
                  <div key={row.id} className="shift-row">
                    <div className="shift-row-main">
                      {ymdToSlash(row.date)}{weekdayLabel(row.date)}　{hhmm(row.start)}〜{hhmm(row.end)}　{row.username}
                    </div>
                    <div className="shift-row-actions">
                      <button className="btn-outline btn-sm" style={{ flex:1 }} onClick={() => startEditShift(row)}>詳細・編集</button>
                      <button className="btn-primary danger btn-sm" style={{ flex:1 }} onClick={() => deleteShift(row.id)}>削除</button>
                    </div>
                  </div>
                ))
              }
            </div>
          </>
        )}

        {/* ══ 期限後提出タブ ══ */}
        {activeTab === "late" && (
          <div className="sec-card">
            <div className="sec-head">
              <span className="sec-title">期限後の提出を許可</span>
            </div>
            {!canSetPerms ? (
              <div className="empty-box">このタブは admin のみ操作できます</div>
            ) : (
              <>
                <div style={{ padding:"12px 16px", borderBottom:"1px solid #d8eaee" }}>
                  <p style={{ fontSize:12, color:"#89adb8", lineHeight:1.6, fontFamily:"'Noto Sans JP',sans-serif" }}>
                    期限（前月26日16:00）を過ぎても提出できるユーザーを {monthLabel(cursor)} 分として許可します。
                  </p>
                </div>
                {users.length === 0
                  ? <div className="empty-box">ユーザーが取得できませんでした</div>
                  : users.map(u => (
                    <div key={u.id} className="perm-row">
                      <div className="perm-name">{u.username}</div>
                      <button
                        className={`perm-btn${permUserIds.has(u.id)?" on":" off"}`}
                        onClick={() => setPermission(u.id, !permUserIds.has(u.id))}
                      >
                        {permUserIds.has(u.id) ? "許可中" : "提出を許可"}
                      </button>
                    </div>
                  ))
                }
              </>
            )}
          </div>
        )}

      </div>
    </div>
  )
}
