"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { me, type User } from "@/lib/auth"
import { apiFetch, type ApiOk } from "@/lib/api"

// ── 型 ────────────────────────────────────────────────────────────
type LessonSlot    = { date?: string; start: string; end: string; note?: string | null }
type Shift         = { id: number; staff_user_id: number; staff_username: string; shift_date: string; start_time: string; end_time: string; lesson_slots?: LessonSlot[]; note?: string | null }
type CalendarEvent = { id: number; event_date: string; title: string; note?: string | null }
type ManagerDayOff = { id: number; off_date: string; label: string; note?: string | null }
type HolidayMap    = Record<string, string>

// ── 定数 ─────────────────────────────────────────────────────────
const MAX_W      = 47.9375
const MIN_W      = 20
const BOTTOM_NAV = 4.25
const APP_HEADER = 3.5
const HOUR_START = 12
const HOUR_END   = 23
const GRID_HOURS = HOUR_END - HOUR_START + 1
const HOUR_ROW   = 5.0      // rem/hour
const TIME_COL   = 3.75     // rem
// ⑤ タイムライン先頭に余白を追加して12:00ラベルが隠れないようにする
const TIMELINE_TOP_PAD = 0.75  // rem
const DOW        = ["日","月","火","水","木","金","土"]
type ViewMode    = "month" | "day"

// ── カラー ─────────────────────────────────────────────────────────
const BRAND      = "#006284"
const BRAND_DARK = "#004d66"
const BRAND_TINT = "rgba(0,98,132,0.07)"
const TEXT       = "#111827"
const TEXT_SUB   = "#4b6070"
const TEXT_MUTED = "#8fa8b4"
const LINE       = "#dde8ed"
const LINE_STR   = "#b8d0da"
const SUN_COL    = "#d0372a"
const SAT_COL    = "#1d5bb5"
const OFF_COL    = "#a0306a"
const EV_COL     = "#7a4800"
const SHIFT_BG   = "#eaf4f8"
const SHIFT_LINE = "#b0cdd8"

// ── ユーティリティ ─────────────────────────────────────────────────
function ymd(d: Date) { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}` }
function parseYmd(s: string) { return new Date(`${s}T12:00:00`) }
function addDays(d: Date, n: number) { const x = new Date(d); x.setDate(x.getDate()+n); return x }
function startOfMonth(d: Date) { const x = new Date(d); x.setDate(1); x.setHours(12,0,0,0); return x }
function startOfWeekSunday(d: Date) { const x = new Date(d); x.setHours(12,0,0,0); return addDays(x, -x.getDay()) }
function parseHm(hm: string) { const [h,m] = (hm||"").split(":"); return Number(h||0)*60+Number(m||0) }
function hmDisp(hm: string) { return hm?.length >= 5 ? hm.slice(0,5) : (hm||"") }
function pad2(n: number) { return String(n).padStart(2,"0") }
function clamp(n: number, a: number, b: number) { return Math.max(a, Math.min(b, n)) }

// 授業スロット取得（date未設定時はshift_dateで補完）
function lessonSlotsForDate(s: Shift): LessonSlot[] {
  if (!Array.isArray(s.lesson_slots) || s.lesson_slots.length === 0) return []
  return s.lesson_slots
    .map(sl => {
      const start = hmDisp(String(sl?.start || ""))
      const end   = hmDisp(String(sl?.end   || ""))
      const slotDate = (sl?.date && String(sl.date).trim().length === 10)
        ? String(sl.date).trim()
        : s.shift_date
      return { date: slotDate, start, end, note: sl?.note ?? null }
    })
    .filter(sl =>
      sl.date === s.shift_date &&
      sl.start && sl.end &&
      parseHm(sl.start) < parseHm(sl.end)
    )
}

async function apiGet<T>(path: string): Promise<ApiOk<T>> {
  const r = await apiFetch<T>(path, { method: "GET" })
  if (!r.ok) { if (r.status === 401) throw new Error("unauthorized"); throw new Error(r.error || "API error") }
  return r as ApiOk<T>
}

type LaneShift = Shift & { lane: number }
function assignLanes(shifts: Shift[], maxLanes = 3): { lanes: number; items: LaneShift[] } {
  const items = [...shifts].sort((a,b) => parseHm(a.start_time)-parseHm(b.start_time))
  const laneEnd: number[] = []; const out: LaneShift[] = []
  for (const s of items) {
    const st = parseHm(s.start_time), et = parseHm(s.end_time)
    let lane = laneEnd.slice(0, maxLanes).findIndex(e => e <= st)
    if (lane === -1) {
      if (laneEnd.length < maxLanes) { lane = laneEnd.length; laneEnd.push(et) }
      else { let best=0; for(let i=1;i<maxLanes;i++) if((laneEnd[i]??1e9)<(laneEnd[best]??1e9)) best=i; lane=best; laneEnd[best]=Math.max(laneEnd[best]??0,et) }
    } else { laneEnd[lane] = et }
    out.push({ ...s, lane })
  }
  return { lanes: Math.max(1, Math.min(maxLanes, laneEnd.length)), items: out }
}

// ── CSS ───────────────────────────────────────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=Noto+Sans+JP:wght@400;500;700&display=swap');
*,*::before,*::after { box-sizing: border-box; margin: 0; padding: 0; }
html { -webkit-text-size-adjust: 100%; }

@keyframes slideR    { from { opacity:0; transform:translateX(18px) } to { opacity:1; transform:none } }
@keyframes slideL    { from { opacity:0; transform:translateX(-18px) } to { opacity:1; transform:none } }
@keyframes spin      { to { transform:rotate(360deg) } }
@keyframes fadeUp    { from { opacity:0; transform:translateY(8px) } to { opacity:1; transform:none } }
@keyframes cellIn    { from { opacity:0; transform:scale(.94) translateY(4px) } to { opacity:1; transform:none } }
@keyframes blockIn   { from { opacity:0; transform:translateX(-6px) scaleX(.97) } to { opacity:1; transform:none } }
@keyframes todayPulse {
  0%,100% { box-shadow:0 0 0 0 rgba(0,98,132,.45), 0 1px 5px rgba(0,98,132,.32); }
  50%     { box-shadow:0 0 0 5px rgba(0,98,132,0),  0 1px 5px rgba(0,98,132,.32); }
}
@keyframes nowBreathe {
  0%,100% { box-shadow:0 0 0 0 rgba(0,98,132,.5); transform:translate(-50%,-50%) scale(1); }
  50%     { box-shadow:0 0 0 6px rgba(0,98,132,0); transform:translate(-50%,-50%) scale(1.15); }
}
@keyframes fadeDown  { from { opacity:0; transform:translateY(-6px) } to { opacity:1; transform:none } }

/* ── ヘッダー ── */
.hdr {
  flex-shrink:0; height:58px;
  display:flex; align-items:center; gap:8px; padding:0 16px;
  background:#fff; border-bottom:1.5px solid ${LINE};
}
/* ② 年・月・日をすべて DM Serif Display に統一 */
.hdr-ym {
  font-family:'DM Serif Display',serif;
  font-size:21px; color:${TEXT};
  letter-spacing:-.01em; margin-right:auto; white-space:nowrap; line-height:1;
  display:flex; align-items:baseline; gap:3px;
}
.hdr-ym-year {
  font-family:'DM Serif Display',serif;
  font-size:13px; color:${TEXT_MUTED};
  letter-spacing:.01em; line-height:1;
}

.seg { display:flex; gap:2px; background:#f1f6f8; border-radius:9px; padding:3px; }
.seg-btn {
  height:36px; padding:0 14px; border:none; border-radius:7px;
  font-size:13px; font-weight:700; font-family:'Noto Sans JP',sans-serif;
  cursor:pointer; color:${TEXT_SUB}; background:transparent; white-space:nowrap;
  -webkit-tap-highlight-color:transparent; transition:background .12s, color .12s;
}
.seg-btn.on { background:${BRAND}; color:#fff; box-shadow:0 1px 4px rgba(0,98,132,.28); }
.seg-btn:disabled { opacity:.4; cursor:not-allowed; }
.today-btn {
  height:36px; padding:0 14px; border:1.5px solid ${LINE}; border-radius:9px;
  font-size:13px; font-weight:700; font-family:'Noto Sans JP',sans-serif;
  cursor:pointer; color:${TEXT_SUB}; background:#fff; white-space:nowrap;
  -webkit-tap-highlight-color:transparent; transition:border-color .12s, color .12s;
}
.today-btn:active { border-color:${BRAND}; color:${BRAND}; }

/* 追加提案3: PC幅でのみ表示する月ナビボタン */
.month-nav-btn {
  display:none;  /* モバイルでは非表示 */
  width:34px; height:34px; border-radius:8px;
  border:1.5px solid ${LINE}; background:#fff;
  align-items:center; justify-content:center;
  cursor:pointer; color:${TEXT_SUB}; font-size:18px; line-height:1;
  flex-shrink:0; -webkit-tap-highlight-color:transparent;
  transition:background .1s, border-color .1s;
}
.month-nav-btn:hover { background:${BRAND_TINT}; border-color:${LINE_STR}; transform:scale(1.08); }
.month-nav-btn:active { background:${BRAND_TINT}; border-color:${BRAND}; }
@media (min-width: 640px) {
  .month-nav-btn { display:flex; }  /* PC幅で表示 */
}

/* ── 曜日ヘッダー ── */
.dow-row { display:grid; grid-template-columns:repeat(7,1fr); flex-shrink:0; border-bottom:1.5px solid ${LINE}; }
.dow-cell {
  padding:6px 0 5px; text-align:center; font-size:10.5px; font-weight:700;
  font-family:'Noto Sans JP',sans-serif; color:${TEXT_MUTED}; letter-spacing:.04em;
  border-right:1px solid ${LINE};
}
.dow-cell:last-child { border-right:none; }
.dow-sun { color:${SUN_COL}; } .dow-sat { color:${SAT_COL}; }

/* ── 月グリッド ── */
.month-grid { flex:1; display:grid; grid-template-columns:repeat(7,1fr); grid-template-rows:repeat(6,1fr); }
.mcell {
  border-right:1px solid ${LINE}; border-bottom:1px solid ${LINE};
  padding:3px 3px 2px 3px;
  display:flex; flex-direction:column; gap:1px;
  overflow:hidden; cursor:pointer; background:#fff;
  -webkit-tap-highlight-color:transparent; transition:background .1s, transform .1s;
  animation:cellIn .32s cubic-bezier(.22,1,.36,1) both;
}
.mcell:nth-child(-n+7)               { animation-delay:.00s }
.mcell:nth-child(n+8):nth-child(-n+14)  { animation-delay:.04s }
.mcell:nth-child(n+15):nth-child(-n+21) { animation-delay:.08s }
.mcell:nth-child(n+22):nth-child(-n+28) { animation-delay:.12s }
.mcell:nth-child(n+29):nth-child(-n+35) { animation-delay:.16s }
.mcell:nth-child(n+36)               { animation-delay:.20s }
.mcell:active { transform:scale(.98); }
.mcell:nth-child(7n) { border-right:none; }
.mcell.other-m  { opacity:.28; }
.mcell.hol-m    { background:#fff9f9; }
.mcell.closed-m { background:#f5f7f8; }
.mcell.today-m  { background:${BRAND_TINT}; }

.dom {
  width:22px; height:22px; border-radius:6px; flex-shrink:0;
  display:flex; align-items:center; justify-content:center;
  font-size:12px; font-weight:700; font-family:'Noto Sans JP',sans-serif; line-height:1;
}
.dom.today-d { background:${BRAND}; color:#fff; animation:todayPulse 2.4s ease-in-out 0.6s infinite; }

.c-hol { font-size:8.5px; font-weight:700; color:${SUN_COL}; line-height:1.25; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-family:'Noto Sans JP',sans-serif; }
.c-off { font-size:8.5px; font-weight:700; color:${OFF_COL}; line-height:1.25; font-family:'Noto Sans JP',sans-serif; }
.c-ev  { font-size:8.5px; font-weight:500; color:${EV_COL};  line-height:1.25; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-family:'Noto Sans JP',sans-serif; }
.c-name {
  font-size:9px; font-weight:500; color:${BRAND_DARK};
  font-family:'Noto Sans JP',sans-serif;
  white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
  line-height:1.3; letter-spacing:-.015em;
}
.c-more { font-size:8px; font-weight:700; color:${TEXT_MUTED}; font-family:'Noto Sans JP',sans-serif; line-height:1.2; }

/* ── 日ビュー ヘッダー ── */
.day-hdr {
  flex-shrink:0; height:50px;
  display:flex; align-items:center; gap:8px; padding:0 12px;
  background:#fff; border-bottom:1.5px solid ${LINE};
  animation:fadeDown .25s cubic-bezier(.22,1,.36,1) both;
}
/* ② 日ビューの日付も DM Serif Display に統一 */
.day-date {
  font-family:'DM Serif Display',serif; font-size:20px; color:${TEXT};
  letter-spacing:-.01em; line-height:1;
  display:flex; align-items:baseline; gap:3px;
}
.day-date-year {
  font-family:'DM Serif Display',serif;
  font-size:13px; color:${TEXT_MUTED};
  letter-spacing:.01em;
}
.day-dow {
  font-size:11px; font-weight:700; font-family:'Noto Sans JP',sans-serif;
  padding:2px 7px; border-radius:5px; flex-shrink:0;
}
.day-badge {
  font-size:10px; font-weight:700; font-family:'Noto Sans JP',sans-serif;
  padding:2px 7px; border-radius:5px; flex-shrink:0;
}
.day-nav {
  width:34px; height:34px; border-radius:8px;
  border:1.5px solid ${LINE}; background:#fff;
  display:flex; align-items:center; justify-content:center;
  cursor:pointer; color:${TEXT_SUB}; font-size:18px; line-height:1;
  flex-shrink:0; -webkit-tap-highlight-color:transparent;
  transition:background .1s, border-color .1s;
}
.day-nav:hover { background:${BRAND_TINT}; border-color:${LINE_STR}; }
.day-nav:active { background:${BRAND_TINT}; border-color:${BRAND}; }

/* ── タイムライン ── */
.tl-wrap { flex:1; overflow-y:auto; -webkit-overflow-scrolling:touch; overscroll-behavior:contain; }
/* ⑤ グリッド全体のレイアウト — 上部に余白を設けて最初の時刻ラベルが見えるように */
.tl-grid { display:grid; grid-template-columns:${TIME_COL}rem 1fr; padding-top:${TIMELINE_TOP_PAD}rem; }

/* 時刻ラベル: 各ブロックの「先頭境界線」に対して中央揃え */
.t-tick { height:${HOUR_ROW}rem; position:relative; }
.t-label {
  position:absolute; top:0; right:8px; transform:translateY(-50%);
  font-size:10px; font-weight:700; font-family:'Noto Sans JP',sans-serif;
  color:${TEXT_MUTED}; white-space:nowrap;
  background:#fff; padding:0 3px; line-height:1;
  z-index:1;
}

/* ⑤ 最初と最後の時刻ラベルを適切に表示するために末尾に余白なし */
.t-tick:last-child { height:0; overflow:visible; }

.t-col { position:relative; border-left:1.5px solid ${LINE_STR}; }
.t-hour { height:${HOUR_ROW}rem; border-bottom:1px solid ${LINE}; position:relative; }
.t-hour.alt { background:#fafcfd; }
.t-half { position:absolute; left:0; right:0; top:50%; border-top:1px dashed #e8eef1; pointer-events:none; }

/* 現在時刻ライン */
.now-line { position:absolute; left:-5px; right:0; height:2px; background:${BRAND}; z-index:3; pointer-events:none; }
.now-dot {
  position:absolute; left:0; top:50%;
  width:9px; height:9px; border-radius:50%;
  background:${BRAND};
  animation:nowBreathe 2s ease-in-out infinite;
}

/* ① シフトブロック — 上揃え */
.s-block {
  position:absolute; border-radius:8px; overflow:hidden;
  display:flex; flex-direction:column;
  justify-content:flex-start;
  background:${SHIFT_BG}; border:1px solid ${SHIFT_LINE};
  border-left:3px solid ${BRAND};
  animation:blockIn .35s cubic-bezier(.22,1,.36,1) both;
  transition:box-shadow .15s ease;
}
.s-block:active { box-shadow:0 2px 12px rgba(0,98,132,.2); transform:scale(.99); }
/* ① 名前・時間はブロック上部に配置 */
.s-inner {
  padding:5px 7px 4px;
  position:relative; z-index:1;
  display:flex; flex-direction:column; gap:1px;
}
.s-name {
  font-size:12.5px; font-weight:700; font-family:'Noto Sans JP',sans-serif;
  color:${BRAND_DARK}; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; line-height:1.2;
}
.s-time { font-size:10px; font-weight:500; font-family:'Noto Sans JP',sans-serif; color:${TEXT_SUB}; white-space:nowrap; line-height:1.2; }

/* ③④ 授業予定オーバーレイ — 位置はシフト開始時刻からの相対remで正確に配置 */
.lesson-ov {
  position:absolute; left:0; right:0; z-index:2;
  background:rgba(0,0,0,0.10);
  border-top:1px solid rgba(0,0,0,0.14); border-bottom:1px solid rgba(0,0,0,0.14);
  display:flex; flex-direction:column; align-items:center; justify-content:center;
  gap:1px; pointer-events:none; overflow:hidden;
}
/* ③ 授業予定のラベルと時間 */
.lesson-lbl { font-size:9px; font-weight:700; font-family:'Noto Sans JP',sans-serif; color:${TEXT_SUB}; letter-spacing:.08em; line-height:1.2; }
.lesson-time { font-size:8.5px; font-weight:500; font-family:'Noto Sans JP',sans-serif; color:${TEXT_MUTED}; line-height:1.2; white-space:nowrap; }

/* empty / error */
.empty {
  flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:12px;
  color:${TEXT_MUTED}; font-family:'Noto Sans JP',sans-serif; animation:fadeUp .3s ease;
}
.empty p { font-size:13px; font-weight:500; }
.err-bar { padding:10px 16px; background:#fdf3f3; border-bottom:1px solid #f0c0c0; color:#c03030; font-size:12px; font-family:'Noto Sans JP',sans-serif; flex-shrink:0; line-height:1.5; }
`

// ── コンポーネント ─────────────────────────────────────────────────
export default function ShiftsPage() {
  const router   = useRouter()
  const today    = useMemo(() => new Date(), [])
  const todayStr = useMemo(() => ymd(today), [today])

  const [meUser, setMeUser] = useState<User|null>(null)
  const [scope,  setScope]  = useState<"all"|"mine">("all")

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const res: any = await me()
        const user: User|null = (res && "user" in res ? res.user : res) ?? null
        if (alive) setMeUser(user)
      } catch { if (alive) setMeUser(null) }
    })()
    return () => { alive = false }
  }, [])

  const [viewMode,     setViewMode]     = useState<ViewMode>("month")
  const [selectedDate, setSelectedDate] = useState(() => ymd(new Date()))
  const [monthCursor,  setMonthCursor]  = useState(() => startOfMonth(new Date()))

  useEffect(() => { setMonthCursor(startOfMonth(parseYmd(selectedDate))) }, [selectedDate])

  const monthGridDays = useMemo(() => {
    const s = startOfWeekSunday(startOfMonth(monthCursor))
    return Array.from({ length: 42 }, (_, i) => addDays(s, i))
  }, [monthCursor])

  const fetchRange = useMemo(() => ({ from: ymd(monthGridDays[0]), to: ymd(monthGridDays[41]) }), [monthGridDays])

  const [rangeShifts,  setRangeShifts]  = useState<Shift[]>([])
  const [rangeEvents,  setRangeEvents]  = useState<CalendarEvent[]>([])
  const [rangeMgrOff,  setRangeMgrOff]  = useState<ManagerDayOff[]>([])
  const [holidayMap,   setHolidayMap]   = useState<HolidayMap>({})
  const [loading,      setLoading]      = useState(false)
  const [err,          setErr]          = useState("")

  const rangeShiftsScoped = useMemo(() => {
    if (scope !== "mine") return rangeShifts
    const uid = meUser?.id; if (!uid) return []
    return rangeShifts.filter(x => x.staff_user_id === uid)
  }, [rangeShifts, scope, meUser])

  useEffect(() => {
    let alive = true
    ;(async () => {
      setLoading(true); setErr("")
      try {
        const [shiftRes, evRes, offRes, holRes] = await Promise.all([
          apiGet<{shifts:Shift[]}>(`/api/shift_list.php?from=${fetchRange.from}&to=${fetchRange.to}`),
          apiGet<{events:CalendarEvent[]}>("calendar_events_list.php?from="+fetchRange.from+"&to="+fetchRange.to),
          apiGet<{days_off:ManagerDayOff[]}>("manager_days_off_list.php?from="+fetchRange.from+"&to="+fetchRange.to),
          apiGet<{holidays:{date:string;name:string}[]}>(`holidays_list.php?from=${fetchRange.from}&to=${fetchRange.to}`),
        ])
        if (!alive) return
        setRangeShifts(shiftRes.shifts || [])
        setRangeEvents(evRes.events || [])
        setRangeMgrOff(offRes.days_off || [])
        const map: HolidayMap = {}
        for (const h of holRes.holidays || []) { if (h?.date && h?.name) map[String(h.date)] = String(h.name) }
        setHolidayMap(map)
      } catch (e: any) {
        if (!alive) return
        if (String(e?.message||"").includes("unauthorized")) { router.push("/login/"); return }
        setErr(e?.message || "読み込みに失敗しました")
      } finally { if (alive) setLoading(false) }
    })()
    return () => { alive = false }
  }, [fetchRange.from, fetchRange.to, router])

  const shiftsByDate = useMemo(() => {
    const map = new Map<string, Shift[]>()
    for (const s of rangeShiftsScoped) { const arr = map.get(s.shift_date) || []; arr.push(s); map.set(s.shift_date, arr) }
    for (const [k, arr] of map.entries()) { arr.sort((a,b) => parseHm(a.start_time)-parseHm(b.start_time)); map.set(k, arr) }
    return map
  }, [rangeShiftsScoped])

  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>()
    for (const e of rangeEvents) { const arr = map.get(e.event_date) || []; arr.push(e); map.set(e.event_date, arr) }
    return map
  }, [rangeEvents])

  const mgrOffSet = useMemo(() => {
    const s = new Set<string>(); for (const o of rangeMgrOff) s.add(o.off_date); return s
  }, [rangeMgrOff])

  const isHoliday = (ds: string) => !!holidayMap?.[ds]

  const dayShifts = useMemo(() => shiftsByDate.get(selectedDate) || [], [shiftsByDate, selectedDate])
  const lane      = useMemo(() => assignLanes(dayShifts, 3), [dayShifts])

  const hdrYear  = useMemo(() => { const b = viewMode==="month"?monthCursor:parseYmd(selectedDate); return b.getFullYear() }, [viewMode, monthCursor, selectedDate])
  const hdrMonth = useMemo(() => { const b = viewMode==="month"?monthCursor:parseYmd(selectedDate); return b.getMonth()+1 }, [viewMode, monthCursor, selectedDate])

  function goToday() { setSelectedDate(todayStr); setMonthCursor(startOfMonth(today)); setViewMode("day") }

  const [anim, setAnim] = useState<{ key: number; dir: "next"|"prev"|null }>({ key: 0, dir: null })
  function triggerAnim(dir: "next"|"prev") { setAnim(a => ({ key: a.key+1, dir })) }

  // タッチスワイプ
  const swipe = useRef<{ x: number; y: number; dragging: boolean }|null>(null)
  function onSwipeStart(e: React.TouchEvent) { const t = e.touches[0]; swipe.current = { x: t.clientX, y: t.clientY, dragging: false } }
  function onSwipeMove(e: React.TouchEvent) {
    const st = swipe.current; if (!st) return
    const t = e.touches[0]; const dx = t.clientX-st.x, dy = t.clientY-st.y
    if (!st.dragging && Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy)) st.dragging = true
  }
  function onSwipeEnd(e: React.TouchEvent) {
    const st = swipe.current; swipe.current = null; if (!st?.dragging) return
    const dx = e.changedTouches[0].clientX - st.x; const th = 48
    if (dx <= -th) {
      triggerAnim("next")
      if (viewMode==="month") setMonthCursor(d => { const x=new Date(d); x.setMonth(x.getMonth()+1); return startOfMonth(x) })
      else setSelectedDate(ymd(addDays(parseYmd(selectedDate), 1)))
    }
    if (dx >= th) {
      triggerAnim("prev")
      if (viewMode==="month") setMonthCursor(d => { const x=new Date(d); x.setMonth(x.getMonth()-1); return startOfMonth(x) })
      else setSelectedDate(ymd(addDays(parseYmd(selectedDate), -1)))
    }
  }

  // 追加提案2: 最初のシフト開始30分前に自動スクロール
  const dayScrollRef = useRef<HTMLDivElement|null>(null)
  useEffect(() => {
    if (viewMode !== "day" || dayShifts.length === 0) return
    const el = dayScrollRef.current; if (!el) return
    const earliest = Math.min(...dayShifts.map(s => parseHm(s.start_time)))
    const scrollToMin = Math.max(HOUR_START * 60, earliest - 30)
    // TIMELINE_TOP_PAD(rem) + offsetMinutes * HOUR_ROW(rem)/60 をpxに変換
    const rootFontSize = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16
    // tl-wrap のスクロール量 = padding-top(TIMELINE_TOP_PAD) + シフト開始前30分のオフセット
    const topPx = TIMELINE_TOP_PAD * rootFontSize + ((scrollToMin - HOUR_START * 60) / 60) * HOUR_ROW * rootFontSize
    el.scrollTo({ top: topPx, behavior: "smooth" })
  }, [dayShifts, viewMode, selectedDate])

  const animCss = (d: "next"|"prev"|null) => d ? { animation: `${d==="next"?"slideR":"slideL"} 200ms cubic-bezier(.22,1,.36,1)` } : {}

  // ── render ────────────────────────────────────────────────────────
  return (
    <div style={{ position:"fixed", inset:0, overflow:"hidden", overscrollBehavior:"none",
      background:"#f0f5f7", display:"flex", justifyContent:"center",
      paddingTop:`calc(env(safe-area-inset-top) + ${APP_HEADER}rem)` }}>
      <style>{CSS}</style>

      <div style={{ width:"100%", maxWidth:`${MAX_W}rem`, minWidth:`${MIN_W}rem`,
        height:"100%", overflow:"hidden", display:"flex", flexDirection:"column",
        background:"#fff",
        paddingBottom:`calc(env(safe-area-inset-bottom) + ${BOTTOM_NAV}rem)` }}>

        {/* ━━━ ヘッダー ━━━ */}
        <header className="hdr">
          {/* ② 年・月を同じ DM Serif Display フォントで統一 */}
          <div className="hdr-ym">
            <span className="hdr-ym-year">{hdrYear}</span>
            <span>{hdrMonth}月</span>
          </div>

          {loading && (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
              stroke={TEXT_MUTED} strokeWidth="2.5"
              style={{ animation:"spin .8s linear infinite", flexShrink:0 }}>
              <path d="M21 12a9 9 0 11-6.22-8.56"/>
            </svg>
          )}

          {/* 追加提案3: PC幅でのみ表示する月ナビボタン（月ビュー時） */}
          {viewMode === "month" && (
            <button className="month-nav-btn" onClick={() => {
              triggerAnim("prev")
              setMonthCursor(d => { const x=new Date(d); x.setMonth(x.getMonth()-1); return startOfMonth(x) })
            }}>‹</button>
          )}
          {viewMode === "month" && (
            <button className="month-nav-btn" onClick={() => {
              triggerAnim("next")
              setMonthCursor(d => { const x=new Date(d); x.setMonth(x.getMonth()+1); return startOfMonth(x) })
            }}>›</button>
          )}

          <div className="seg">
            <button className={`seg-btn${scope==="all"?" on":""}`} onClick={() => setScope("all")}>全体</button>
            <button className={`seg-btn${scope==="mine"?" on":""}`} onClick={() => setScope("mine")} disabled={!meUser}>自分</button>
          </div>
          <button className="today-btn" onClick={goToday}>今日</button>
          <div className="seg">
            <button className={`seg-btn${viewMode==="month"?" on":""}`} onClick={() => setViewMode("month")}>月</button>
            <button className={`seg-btn${viewMode==="day"?" on":""}`}   onClick={() => setViewMode("day")}>日</button>
          </div>
        </header>

        {err && <div className="err-bar">{err}</div>}

        <div style={{ flex:1, overflow:"hidden", display:"flex", flexDirection:"column" }}>

          {/* ━━━ 月ビュー ━━━ */}
          {viewMode === "month" && (
            <div
              key={`m-${monthCursor.getFullYear()}-${monthCursor.getMonth()}-${anim.key}`}
              style={{ flex:1, overflow:"hidden", display:"flex", flexDirection:"column",
                touchAction:"pan-x", overscrollBehavior:"none" }}
              onTouchStart={onSwipeStart} onTouchMove={onSwipeMove} onTouchEnd={onSwipeEnd}
            >
              <div className="dow-row">
                {DOW.map((w,i) => (
                  <div key={w} className={`dow-cell${i===0?" dow-sun":i===6?" dow-sat":""}`}>{w}</div>
                ))}
              </div>

              <div className="month-grid" style={animCss(anim.dir)}>
                {monthGridDays.map(d => {
                  const ds      = ymd(d)
                  const inMonth = d.getMonth() === monthCursor.getMonth()
                  const isTod   = ds === todayStr
                  const dow     = d.getDay()
                  const holiday = isHoliday(ds)
                  const hasMgrOff = mgrOffSet.has(ds)
                  const shifts  = shiftsByDate.get(ds) || []
                  const events  = eventsByDate.get(ds) || []

                  const domColor = isTod ? undefined : holiday||dow===0 ? SUN_COL : dow===6 ? SAT_COL : TEXT

                  let cls = "mcell"
                  if (isTod)    cls += " today-m"
                  if (!inMonth) cls += " other-m"
                  else if (holiday) cls += " hol-m"
                  else if (hasMgrOff && shifts.length===0) cls += " closed-m"

                  const uniq: string[] = []
                  const seen = new Set<string>()
                  for (const s of shifts) { if (!seen.has(s.staff_username)) { seen.add(s.staff_username); uniq.push(s.staff_username) } }
                  const showNames = uniq.slice(0, 3)
                  const moreCount = uniq.length - showNames.length

                  return (
                    <div key={ds} className={cls}
                      onClick={() => { setSelectedDate(ds); setViewMode("day") }}
                      role="button" aria-label={ds}>
                      <div className={`dom${isTod?" today-d":""}`} style={{ color: isTod ? undefined : domColor }}>
                        {d.getDate()}
                      </div>
                      {holiday    && <div className="c-hol">{holidayMap[ds]}</div>}
                      {hasMgrOff  && <div className="c-off">公休</div>}
                      {events.slice(0,1).map(ev => <div key={ev.id} className="c-ev">{ev.title}</div>)}
                      {showNames.map(nm => <div key={nm} className="c-name">{nm}</div>)}
                      {moreCount > 0 && <div className="c-more">+{moreCount}</div>}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* ━━━ 日ビュー ━━━ */}
          {viewMode === "day" && (
            <div
              key={`d-${selectedDate}-${anim.key}`}
              style={{ flex:1, overflow:"hidden", display:"flex", flexDirection:"column",
                touchAction:"pan-x", overscrollBehavior:"none" }}
              onTouchStart={onSwipeStart} onTouchMove={onSwipeMove} onTouchEnd={onSwipeEnd}
            >
              {/* 日ヘッダー */}
              {(() => {
                const d = parseYmd(selectedDate)
                const dow = d.getDay()
                const holiday    = isHoliday(selectedDate)
                const hasMgrOff  = mgrOffSet.has(selectedDate)
                const dayEvents  = eventsByDate.get(selectedDate) || []   // ① イベント取得
                const dowColor   = dow===0 ? SUN_COL : dow===6 ? SAT_COL : TEXT_SUB
                return (
                  <div className="day-hdr" style={animCss(anim.dir)}>
                    <button className="day-nav" onClick={() => { triggerAnim("prev"); setSelectedDate(ymd(addDays(parseYmd(selectedDate),-1))) }}>‹</button>

                    {/* ③ 年なし — 月/日（曜）のみ */}
                    <div className="day-date" style={{ color: dow===0?SUN_COL:dow===6?SAT_COL:TEXT }}>
                      {d.getMonth()+1}/{d.getDate()}
                    </div>
                    <div className="day-dow" style={{ background:`${dowColor}18`, color:dowColor }}>{DOW[dow]}</div>

                    {holiday   && <div className="day-badge" style={{ background:"#fff0f0", color:SUN_COL, border:`1px solid ${SUN_COL}20` }}>{holidayMap[selectedDate]}</div>}
                    {hasMgrOff && <div className="day-badge" style={{ background:"#fff0f6", color:OFF_COL, border:`1px solid ${OFF_COL}20` }}>教室長公休</div>}
                    {/* ① カレンダーイベントをバッジ表示 */}
                    {dayEvents.map(ev => (
                      <div key={ev.id} className="day-badge" style={{ background:"#fff8ee", color:EV_COL, border:`1px solid ${EV_COL}20` }}>{ev.title}</div>
                    ))}

                    <div style={{ flex:1 }}/>

                    {loading && (
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                        stroke={TEXT_MUTED} strokeWidth="2.5"
                        style={{ animation:"spin .8s linear infinite", flexShrink:0 }}>
                        <path d="M21 12a9 9 0 11-6.22-8.56"/>
                      </svg>
                    )}

                    <button className="day-nav" onClick={() => { triggerAnim("next"); setSelectedDate(ymd(addDays(parseYmd(selectedDate),1))) }}>›</button>
                  </div>
                )
              })()}

              {/* タイムライン */}
              {dayShifts.length === 0 && !loading ? (
                <div className="empty">
                  <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke={TEXT_MUTED} strokeWidth="1.3">
                    <rect x="3" y="4" width="18" height="18" rx="3"/>
                    <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
                    <line x1="3" y1="10" x2="21" y2="10"/>
                    <line x1="8" y1="14" x2="16" y2="14" strokeDasharray="2 2"/>
                  </svg>
                  <p>この日のシフトはありません</p>
                </div>
              ) : (
                <div className="tl-wrap" ref={dayScrollRef}>
                  {/* ⑤ tl-grid に padding-top を持たせているため、
                      ここに paddingBottom は不要。グリッド終端がそのまま末尾になる */}
                  <div className="tl-grid">

                    {/* ② 時刻列
                        各 t-tick は 1時間分の高さ。
                        ラベルはブロック上端（transform:translateY(-50%)）で
                        境界線と一致。最後に HOUR_END+1(24:00)ラベルだけ追加。 */}
                    <div>
                      {Array.from({ length: GRID_HOURS }, (_, i) => HOUR_START + i).map(h => (
                        <div key={h} className="t-tick">
                          <span className="t-label">{pad2(h)}:00</span>
                        </div>
                      ))}
                      {/* 末尾境界線ラベル (24:00) */}
                      <div className="t-tick" style={{ height:0, overflow:"visible" }}>
                        <span className="t-label">{pad2(HOUR_END + 1)}:00</span>
                      </div>
                    </div>

                    {/* イベント列 */}
                    <div className="t-col">
                      {/* ⑤ グリッドブロックは GRID_HOURS 個のみ（末尾に余白なし） */}
                      {Array.from({ length: GRID_HOURS }, (_, i) => HOUR_START + i).map(h => (
                        <div key={h} className={`t-hour${h%2===0?"":" alt"}`}>
                          <div className="t-half"/>
                        </div>
                      ))}

                      {/* 現在時刻ライン */}
                      {selectedDate === todayStr && (() => {
                        const now = new Date()
                        const nowMin = now.getHours()*60 + now.getMinutes()
                        if (nowMin < HOUR_START*60 || nowMin > (HOUR_END+1)*60) return null
                        // t-col は tl-grid の padding-top の影響を受けない（gridセル内の絶対配置）
                        const topRem = ((nowMin - HOUR_START*60) / 60) * HOUR_ROW
                        return (
                          <div className="now-line" style={{ top:`${topRem}rem` }}>
                            <div className="now-dot"/>
                          </div>
                        )
                      })()}

                      {/* シフトブロック */}
                      {lane.items.map((s, i) => {
                        const st = parseHm(s.start_time), et = parseHm(s.end_time)
                        const base  = HOUR_START * 60
                        const total = GRID_HOURS * 60
                        const topMin    = clamp(st - base, 0, total)
                        const durMin    = clamp(et - st, 15, total - topMin)
                        // t-col はグリッド内の絶対配置 — TIMELINE_TOP_PAD は不要
                        const topRem    = (topMin / 60) * HOUR_ROW
                        const heightRem = (durMin / 60) * HOUR_ROW
                        const lanes  = Math.max(1, lane.lanes)
                        const gap    = 0.3
                        const laneW  = `calc((100% - ${(lanes-1)*gap}rem - 10px) / ${lanes})`
                        const left   = `calc(5px + ${s.lane} * (${laneW} + ${gap}rem))`
                        const isShort = heightRem < 1.6

                        const lessons = lessonSlotsForDate(s)

                        return (
                          <div key={s.id} className="s-block"
                            style={{ top:`${topRem}rem`, height:`${heightRem}rem`, left, width:laneW,
                              animationDelay:`${i*0.06}s` }}>

                            {/* ③④ 授業予定オーバーレイ — シフト開始からの相対位置で正確に配置 */}
                            {lessons.map((ls, li) => {
                              const lTop = clamp(parseHm(ls.start) - st, 0, durMin)
                              const lDur = clamp(parseHm(ls.end) - parseHm(ls.start), 15, durMin - lTop)
                              const lTopRem = (lTop / 60) * HOUR_ROW
                              const lHRem   = (lDur / 60) * HOUR_ROW
                              // ③ 時間表示
                              const lTimeStr = `${hmDisp(ls.start)} – ${hmDisp(ls.end)}`
                              const showTime = lHRem >= 0.9
                              return (
                                <div key={li} className="lesson-ov"
                                  style={{ top:`${lTopRem}rem`, height:`${lHRem}rem` }}>
                                  <span className="lesson-lbl">授業予定</span>
                                  {showTime && <span className="lesson-time">{lTimeStr}</span>}
                                </div>
                              )
                            })}

                            {/* ① 名前・時間はブロック上部に配置 */}
                            <div className="s-inner">
                              <div className="s-name">{s.staff_username}</div>
                              {!isShort && <div className="s-time">{hmDisp(s.start_time)} – {hmDisp(s.end_time)}</div>}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
