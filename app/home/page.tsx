"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Guard } from "@/components/Guard"
import { type User } from "@/lib/auth"
import { apiFetch, type ApiOk } from "@/lib/api"

// ── 型定義 ────────────────────────────────────────────────────────
type LessonSlot   = { date?: string; start: string; end: string; note?: string | null }
type Shift        = { id: number; staff_user_id: number; staff_username: string; shift_date: string; start_time: string; end_time: string; lesson_slots?: LessonSlot[]; note?: string | null }
type CalendarEvent= { id: number; event_date: string; title: string; note?: string | null }
type ManagerDayOff= { id: number; off_date: string; label: string; note?: string | null }
type Task         = { id: number; title: string; due_date: string | null; status: "todo"|"doing"; main_category_name: string }
type Notice       = { id: number; title: string; body: string; sender_name: string; is_pinned: 0|1; published_at: string; expires_at: string | null }

// ── ユーティリティ ────────────────────────────────────────────────
function ymd(d: Date) { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}` }
function hmDisp(hm: string) { return hm?.length >= 5 ? hm.slice(0,5) : (hm || "") }
function parseHm(hm: string) { const [h,m]=(hm||"").split(":"); return Number(h||0)*60+Number(m||0) }
function pad2(n: number) { return String(n).padStart(2,"0") }

const DOW_JP   = ["日","月","火","水","木","金","土"]
const MONTH_JP = ["1月","2月","3月","4月","5月","6月","7月","8月","9月","10月","11月","12月"]

function greetingText(h: number) {
  if (h < 11) return "おはようございます"
  if (h < 17) return "お疲れさまです"
  return "お疲れさまでした"
}

async function apiGet<T>(path: string): Promise<ApiOk<T>> {
  const r = await apiFetch<T>(path, { method: "GET" })
  if (!r.ok) { if (r.status === 401) throw new Error("unauthorized"); throw new Error(r.error || "API error") }
  return r as ApiOk<T>
}

function lessonSlotsForDate(s: Shift): LessonSlot[] {
  if (!Array.isArray(s.lesson_slots) || s.lesson_slots.length === 0) return []
  return s.lesson_slots
    .map(sl => {
      const start    = hmDisp(String(sl?.start || ""))
      const end      = hmDisp(String(sl?.end   || ""))
      const slotDate = (sl?.date && String(sl.date).trim().length === 10) ? String(sl.date).trim() : s.shift_date
      return { date: slotDate, start, end, note: sl?.note ?? null }
    })
    .filter(sl => sl.date === s.shift_date && sl.start && sl.end && parseHm(sl.start) < parseHm(sl.end))
}

// ── CSS ───────────────────────────────────────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=Noto+Sans+JP:wght@400;500;700&display=swap');
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

@keyframes fadeUp {
  from { opacity:0; transform:translateY(14px); }
  to   { opacity:1; transform:translateY(0); }
}
@keyframes shimmer {
  0%   { background-position:-200% center; }
  100% { background-position:200% center; }
}
@keyframes pulseDot {
  0%,100% { box-shadow:0 0 0 0 rgba(34,196,122,0.45); }
  60%     { box-shadow:0 0 0 5px rgba(34,196,122,0); }
}
@keyframes progressFill {
  from { width:0%; }
  to   { width:var(--pct,0%); }
}

.hw { background:#f0f5f7; font-family:'Noto Sans JP',sans-serif; min-height:100vh; padding-bottom:32px; }

/* ━━━ ヒーロー ━━━ */
.hero {
  background:#f0f5f7;
  padding:24px 20px 20px;
  border-bottom:1px solid #e8eef1;
}

.hero-greeting {
  font-size:11px; font-weight:700; letter-spacing:0.1em;
  color:#8fa8b4; text-transform:uppercase;
  font-family:'Noto Sans JP',sans-serif; margin-bottom:2px;
  animation:fadeUp 0.4s ease both;
}
.hero-name {
  font-family:'Noto Sans JP',sans-serif;
  font-size:20px; font-weight:700; color:#0c1d24; line-height:1.3;
  margin-bottom:20px;
  animation:fadeUp 0.4s ease 0.05s both;
}
.hero-name em { font-style:normal; color:#006284; }

.hero-date {
  display:flex; align-items:center; justify-content:space-between;
  background:#ffffff; border-radius:14px; padding:14px 18px;
  animation:fadeUp 0.4s ease 0.1s both;
}
.hero-date-left { display:flex; align-items:baseline; gap:6px; }
.hero-day {
  font-family:'DM Serif Display',serif;
  font-size:52px; color:#0c1d24; line-height:1; letter-spacing:-0.03em;
}
.hero-date-meta { display:flex; flex-direction:column; gap:2px; }
.hero-ym  { font-size:11px; font-weight:700; letter-spacing:0.06em; color:#8fa8b4; font-family:'Noto Sans JP',sans-serif; }
.hero-dow { font-size:18px; font-weight:700; color:#0c1d24; font-family:'Noto Sans JP',sans-serif; line-height:1.2; }
.hero-dow.sun { color:#e53935; }
.hero-dow.sat { color:#1565c0; }

.hero-badges { display:flex; gap:6px; flex-wrap:wrap; flex-direction:column; align-items:flex-end; }
.hbadge {
  font-size:10px; font-weight:700; letter-spacing:0.03em;
  padding:3px 10px; border-radius:6px;
  font-family:'Noto Sans JP',sans-serif;
}
.hbadge-hol  { background:#fdecea; color:#c62828; }
.hbadge-off  { background:#f3e5f5; color:#6a1b9a; }
.hbadge-ev   { background:#fff8e1; color:#e65100; }
.hbadge-norm { background:#e8eef1; color:#8fa8b4; }

/* ━━━ セクション ━━━ */
.sec { padding:0 16px; margin-top:22px; animation:fadeUp 0.45s ease both; }
.sec-hdr { display:flex; align-items:center; gap:8px; margin-bottom:12px; }
.sec-title { font-family:'DM Serif Display',serif; font-size:19px; color:#0c1d24; letter-spacing:-0.01em; line-height:1; }
.sec-badge { font-size:11px; font-weight:700; background:#006284; color:#fff; border-radius:999px; padding:2px 9px; font-family:'Noto Sans JP',sans-serif; }

/* ━━━ シフトカード ━━━ */
.sc {
  background:#fff; border-radius:16px; overflow:hidden;
  box-shadow:0 2px 14px rgba(0,40,60,0.07),0 1px 3px rgba(0,0,0,0.03);
  border:1px solid rgba(0,98,132,0.07); margin-bottom:10px;
  animation:fadeUp 0.4s ease both;
}
.sc-inner { display:flex; align-items:stretch; }
.sc-stripe { width:4px; flex-shrink:0; }
.sc-body { flex:1; padding:14px 14px 14px 15px; display:flex; flex-direction:column; gap:7px; }

.sc-top { display:flex; align-items:center; justify-content:space-between; gap:8px; }
.sc-name { font-size:15px; font-weight:700; color:#0c1d24; line-height:1.2; font-family:'Noto Sans JP',sans-serif; }
.sc-time {
  font-size:11px; font-weight:700; white-space:nowrap;
  color:#006284; background:rgba(0,98,132,0.09);
  border-radius:7px; padding:3px 9px; font-family:'Noto Sans JP',sans-serif;
}

.on-duty-row { display:flex; align-items:center; gap:6px; }
.on-dot {
  width:7px; height:7px; border-radius:50%; background:#22c47a; flex-shrink:0;
  animation:pulseDot 1.8s ease-in-out infinite;
}
.on-label { font-size:11px; font-weight:700; color:#1a8a5a; font-family:'Noto Sans JP',sans-serif; }

.progress-track { height:4px; background:rgba(0,98,132,0.1); border-radius:999px; overflow:hidden; margin-bottom:3px; }
.progress-fill { height:100%; border-radius:999px; background:linear-gradient(90deg,#006284,#22c47a); animation:progressFill 0.9s cubic-bezier(0.22,1,0.36,1) both; }
.progress-meta { display:flex; justify-content:space-between; }
.progress-label { font-size:10px; color:#8fa8b4; font-family:'Noto Sans JP',sans-serif; }

.next-label { font-size:10px; font-weight:700; color:#8fa8b4; font-family:'Noto Sans JP',sans-serif; }

.lesson-chips { display:flex; gap:5px; flex-wrap:wrap; }
.lchip {
  font-size:10px; font-weight:700; color:#4b6070;
  background:#eef4f7; border:1px solid #ffffff;
  border-radius:6px; padding:2px 8px; font-family:'Noto Sans JP',sans-serif;
  display:flex; align-items:center; gap:4px;
}
.lchip-dot { width:5px; height:5px; border-radius:50%; background:#8fa8b4; flex-shrink:0; }
.sc-note { font-size:11px; color:#8fa8b4; font-family:'Noto Sans JP',sans-serif; line-height:1.5; }

/* ━━━ 今日の情報 ━━━ */
.info-grid { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
.icard {
  background:#fff; border-radius:14px; padding:14px 14px 16px;
  display:flex; flex-direction:column; gap:5px;
  box-shadow:0 2px 10px rgba(0,40,60,0.06);
  border:1px solid rgba(0,98,132,0.07);
  border-left-width:3px; border-left-style:solid;
  animation:fadeUp 0.4s ease both;
}
.icard.full { grid-column:1 / -1; }
.icard-icon  { font-size:17px; line-height:1; margin-bottom:1px; }
.icard-label { font-size:9.5px; font-weight:700; letter-spacing:0.09em; text-transform:uppercase; color:#8fa8b4; font-family:'Noto Sans JP',sans-serif; }
.icard-value { font-size:13px; font-weight:700; color:#0c1d24; line-height:1.4; font-family:'Noto Sans JP',sans-serif; }
.icard-note  { font-size:11px; color:#8fa8b4; line-height:1.4; font-family:'Noto Sans JP',sans-serif; }

/* ━━━ お知らせ ━━━ */
.notice-card {
  background:#fff; border-radius:14px; overflow:hidden;
  box-shadow:0 2px 12px rgba(0,40,60,0.07); border:1px solid rgba(0,98,132,0.08);
  margin-bottom:10px; animation:fadeUp 0.4s ease both;
  -webkit-tap-highlight-color:transparent;
}
.notice-inner { display:flex; align-items:stretch; }
.notice-stripe { width:4px; flex-shrink:0; }
.notice-body { flex:1; padding:14px 14px 14px 15px; display:flex; flex-direction:column; gap:5px; }
.notice-top { display:flex; align-items:flex-start; justify-content:space-between; gap:8px; }
.notice-title { font-size:14px; font-weight:700; color:#0c1d24; line-height:1.4; font-family:'Noto Sans JP',sans-serif; }
.notice-new { font-size:9px; font-weight:700; letter-spacing:0.08em; background:#006284; color:#fff; border-radius:4px; padding:2px 6px; white-space:nowrap; flex-shrink:0; font-family:'Noto Sans JP',sans-serif; align-self:flex-start; margin-top:2px; }
.notice-text { font-size:12px; color:#4b6070; line-height:1.6; font-family:'Noto Sans JP',sans-serif; }
.notice-meta { display:flex; align-items:center; gap:8px; margin-top:2px; }
.notice-from { font-size:10px; font-weight:700; color:#8fa8b4; font-family:'Noto Sans JP',sans-serif; }
.notice-date { font-size:10px; color:#b8d0da; font-family:'Noto Sans JP',sans-serif; }
.notice-pin  { font-size:10px; color:#e9a000; font-weight:700; font-family:'Noto Sans JP',sans-serif; }

/* ━━━ タスク概要 ━━━ */
.task-summary {
  background:#fff; border-radius:16px; overflow:hidden;
  box-shadow:0 2px 12px rgba(0,40,60,0.07); border:1px solid rgba(0,98,132,0.08);
  animation:fadeUp 0.4s ease both;
}
.task-sum-hdr { padding:14px 16px 12px; border-bottom:1px solid #f0f5f7; display:flex; align-items:center; justify-content:space-between; }
.task-stats { display:flex; gap:18px; }
.task-stat { display:flex; flex-direction:column; gap:1px; }
.task-stat-num { font-family:'DM Serif Display',serif; font-size:26px; color:#0c1d24; line-height:1; }
.task-stat-num.urg { color:#e53935; }
.task-stat-lbl { font-size:9px; font-weight:700; letter-spacing:0.08em; color:#8fa8b4; text-transform:uppercase; font-family:'Noto Sans JP',sans-serif; }
.task-row { padding:11px 16px; border-bottom:1px solid #f5f8fa; display:flex; align-items:center; gap:10px; }
.task-row:last-child { border-bottom:none; }
.task-dot { width:8px; height:8px; border-radius:50%; flex-shrink:0; }
.task-row-txt { flex:1; font-size:13px; font-weight:500; color:#0c1d24; font-family:'Noto Sans JP',sans-serif; line-height:1.3; }
.task-cat { font-size:10px; font-weight:700; color:#8fa8b4; font-family:'Noto Sans JP',sans-serif; white-space:nowrap; }
.task-more { padding:10px 16px; text-align:center; font-size:11px; font-weight:700; color:#006284; font-family:'Noto Sans JP',sans-serif; }

/* shimmer */
.shimmer {
  background:linear-gradient(90deg,#e4ecef 25%,#f2f7f9 50%,#e4ecef 75%);
  background-size:200% 100%; border-radius:8px;
  animation:shimmer 1.5s ease-in-out infinite;
}
.empty { display:flex; flex-direction:column; align-items:center; gap:10px; padding:36px 0; color:#b8d0da; font-family:'Noto Sans JP',sans-serif; }
.empty p { font-size:13px; font-weight:500; color:#8fa8b4; }
`

// ── コンポーネント ────────────────────────────────────────────────
function HomeInner() {
  const router   = useRouter()
  const now      = useMemo(() => new Date(), [])
  const today    = useMemo(() => ymd(now), [now])

  const [user,        setUser]        = useState<User|null>(null)
  const [shifts,      setShifts]      = useState<Shift[]>([])
  const [events,      setEvents]      = useState<CalendarEvent[]>([])
  const [mgrOff,      setMgrOff]      = useState<ManagerDayOff[]>([])
  const [holidayName, setHolidayName] = useState<string|null>(null)
  const [loading,     setLoading]     = useState(true)
  const [tasks,       setTasks]       = useState<Task[]>([])
  const [notices,     setNotices]     = useState<Notice[]>([])



  // 1分ごとに現在時刻を更新（勤務中バッジ・進捗バーをリアルタイム更新）
  const [nowMin, setNowMin] = useState(() => now.getHours()*60 + now.getMinutes())
  useEffect(() => {
    const id = setInterval(() => setNowMin(new Date().getHours()*60 + new Date().getMinutes()), 60_000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const [meRes, shiftRes, evRes, offRes, holRes, boardRes, noticeRes] = await Promise.all([
          apiGet<{user:User}>("/me.php"),
          apiGet<{shifts:Shift[]}>(`/api/shift_list.php?from=${today}&to=${today}`),
          apiGet<{events:CalendarEvent[]}>(`calendar_events_list.php?from=${today}&to=${today}`),
          apiGet<{days_off:ManagerDayOff[]}>(`manager_days_off_list.php?from=${today}&to=${today}`),
          apiGet<{holidays:{date:string;name:string}[]}>(`holidays_list.php?from=${today}&to=${today}`),
          apiGet<{todo:Task[];doing:Task[]}>("tasks_board.php"),
          apiGet<{notices:Notice[]}>("notices_list.php"),
        ])
        if (!alive) return
        setUser(meRes.user)
        setShifts((shiftRes.shifts||[]).sort((a,b) => parseHm(a.start_time)-parseHm(b.start_time)))
        setEvents(evRes.events||[])
        setMgrOff(offRes.days_off||[])
        const hol = (holRes.holidays||[]).find(h => h.date === today)
        setHolidayName(hol?.name ?? null)
        // todo + doing を合算し、期限超過→doing→todoの順で並べる
        const allTasks = [...(boardRes.todo||[]), ...(boardRes.doing||[])]
        allTasks.sort((a,b) => {
          const aOver = a.due_date && a.due_date < today ? 0 : 1
          const bOver = b.due_date && b.due_date < today ? 0 : 1
          if (aOver !== bOver) return aOver - bOver
          if (!a.due_date && b.due_date) return 1
          if (a.due_date && !b.due_date) return -1
          return (a.due_date||"").localeCompare(b.due_date||"")
        })
        setTasks(allTasks)
        setNotices(noticeRes.notices || [])
      } catch(e: any) {
        if (!alive) return
        if (String(e?.message||"").includes("unauthorized")) router.push("/login/")
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => { alive = false }
  }, [today, router])

  const dow     = now.getDay()
  const hour    = now.getHours()
  const todayOff= mgrOff.filter(o => o.off_date === today)
  const hasInfo = !!holidayName || todayOff.length > 0 || events.length > 0

  function isOnDuty(s: Shift)   { return parseHm(s.start_time) <= nowMin && nowMin < parseHm(s.end_time) }
  function isUpcoming(s: Shift)  { return parseHm(s.start_time) > nowMin }

  function shiftProgress(s: Shift): number {
    const st = parseHm(s.start_time), et = parseHm(s.end_time)
    if (et <= st) return 0
    return Math.min(100, Math.max(0, Math.round((nowMin - st) / (et - st) * 100)))
  }

  function remaining(s: Shift): string {
    const diff = parseHm(s.end_time) - nowMin
    if (diff <= 0) return "終了"
    return `残 ${Math.floor(diff/60)}h${pad2(diff%60)}m`
  }

  return (
    <div className="hw">
      <style>{CSS}</style>

      {/* ━━━ ヒーロー ━━━ */}
      <div className="hero">
        <div className="hero-greeting">{greetingText(hour)}</div>
        <div className="hero-name">
          {loading
            ? <span style={{opacity:0.4}}>読み込み中…</span>
            : <><em>{user?.username ?? "ゲスト"}</em> さん</>}
        </div>

        <div className="hero-date">
          <div className="hero-date-left">
            <div className="hero-day">{now.getDate()}</div>
            <div className="hero-date-meta">
              <div className="hero-ym">{now.getFullYear()} / {MONTH_JP[now.getMonth()]}</div>
              <div className={`hero-dow${dow===0?" sun":dow===6?" sat":""}`}>{DOW_JP[dow]}曜日</div>
            </div>
          </div>
          <div className="hero-badges">
            {!loading && <>
              {holidayName && <span className="hbadge hbadge-hol">🎌 {holidayName}</span>}
              {todayOff.map(o => <span key={o.id} className="hbadge hbadge-off">📅 公休</span>)}
              {events.map(ev => <span key={ev.id} className="hbadge hbadge-ev">📌 {ev.title}</span>)}
              {!holidayName && todayOff.length===0 && events.length===0 &&
                <span className="hbadge hbadge-norm">通常営業日</span>}
            </>}
          </div>
        </div>
      </div>

      {/* ━━━ 本日のスタッフ ━━━ */}
      <div className="sec" style={{animationDelay:"0.08s"}}>
        <div className="sec-hdr">
          <span className="sec-title">本日のスタッフ</span>
          {!loading && <span className="sec-badge">{shifts.length}名</span>}
        </div>

        {loading && [0,1,2].map(i => (
          <div key={i} className="sc" style={{animationDelay:`${i*0.07}s`}}>
            <div className="sc-inner">
              <div className="sc-stripe" style={{background:"#dde8ed"}}/>
              <div className="sc-body">
                <div className="shimmer" style={{height:15,width:"52%",marginBottom:6}}/>
                <div className="shimmer" style={{height:11,width:"35%"}}/>
              </div>
            </div>
          </div>
        ))}

        {!loading && shifts.length === 0 && (
          <div className="empty">
            <svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
              <rect x="3" y="4" width="18" height="18" rx="3"/>
              <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
              <line x1="8" y1="14" x2="16" y2="14" strokeDasharray="2 2"/>
            </svg>
            <p>本日のシフトはありません</p>
          </div>
        )}

        {!loading && shifts.map((s, i) => {
          const onDuty   = isOnDuty(s)
          const upcoming = isUpcoming(s)
          const prog     = onDuty ? shiftProgress(s) : 0
          const lessons  = lessonSlotsForDate(s)
          const stripeColor = onDuty ? "#22c47a" : upcoming ? "#006284" : "#b8d0da"

          return (
            <div key={s.id} className="sc" style={{animationDelay:`${0.1+i*0.07}s`}}>
              <div className="sc-inner">
                <div className="sc-stripe" style={{background:stripeColor}}/>
                <div className="sc-body">
                  <div className="sc-top">
                    <span className="sc-name">{s.staff_username}</span>
                    <span className="sc-time">{hmDisp(s.start_time)} – {hmDisp(s.end_time)}</span>
                  </div>

                  {onDuty && <>
                    <div className="on-duty-row">
                      <div className="on-dot"/>
                      <span className="on-label">勤務中 · {remaining(s)}</span>
                    </div>
                    <div>
                      <div className="progress-track">
                        <div className="progress-fill" style={{"--pct":`${prog}%`} as React.CSSProperties}/>
                      </div>
                      <div className="progress-meta">
                        <span className="progress-label">{hmDisp(s.start_time)} 出勤</span>
                        <span className="progress-label">{prog}%</span>
                      </div>
                    </div>
                  </>}

                  {upcoming && (
                    <span className="next-label">
                      ⏰ {hmDisp(s.start_time)} 出勤予定
                      {(() => { const d=parseHm(s.start_time)-nowMin; return d<60?` · あと${d}分`:"" })()}
                    </span>
                  )}

                  {lessons.length > 0 && (
                    <div className="lesson-chips">
                      {lessons.map((ls,li) => (
                        <div key={li} className="lchip">
                          <div className="lchip-dot"/>
                          授業 {hmDisp(ls.start)}–{hmDisp(ls.end)}
                        </div>
                      ))}
                    </div>
                  )}

                  {s.note && <div className="sc-note">{s.note}</div>}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* ━━━ 今日の情報 ━━━ */}
      {!loading && hasInfo && (
        <div className="sec" style={{animationDelay:"0.22s"}}>
          <div className="sec-hdr">
            <span className="sec-title">今日の情報</span>
          </div>
          <div className="info-grid">
            {holidayName && (
              <div className="icard" style={{borderLeftColor:"#e57373",animationDelay:"0.24s"}}>
                <div className="icard-icon">🎌</div>
                <div className="icard-label">祝日</div>
                <div className="icard-value">{holidayName}</div>
              </div>
            )}
            {todayOff.map((o,i) => (
              <div key={o.id} className="icard" style={{borderLeftColor:"#ba68c8",animationDelay:`${0.26+i*0.05}s`}}>
                <div className="icard-icon">📅</div>
                <div className="icard-label">教室長公休</div>
                <div className="icard-value">{o.label || "公休"}</div>
                {o.note && <div className="icard-note">{o.note}</div>}
              </div>
            ))}
            {events.map((ev,i) => (
              <div key={ev.id}
                className={`icard${events.length===1&&!holidayName&&todayOff.length===0?" full":""}`}
                style={{borderLeftColor:"#f9a825",animationDelay:`${0.28+i*0.05}s`}}>
                <div className="icard-icon">📌</div>
                <div className="icard-label">予定</div>
                <div className="icard-value">{ev.title}</div>
                {ev.note && <div className="icard-note">{ev.note}</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ━━━ 管理者からのお知らせ ━━━ */}
      <div className="sec" style={{animationDelay:"0.3s"}}>
        <div className="sec-hdr">
          <span className="sec-title">お知らせ</span>
          {!loading && notices.length > 0 && <span className="sec-badge">{notices.length}</span>}
        </div>

        {loading ? (
          [0,1].map(i => (
            <div key={i} className="notice-card" style={{animationDelay:`${0.32+i*0.07}s`}}>
              <div className="notice-inner">
                <div className="notice-stripe" style={{background:"#d8eaee"}}/>
                <div className="notice-body" style={{gap:8}}>
                  <div className="shimmer" style={{height:14,width:"70%",borderRadius:6}}/>
                  <div className="shimmer" style={{height:11,width:"90%",borderRadius:6}}/>
                </div>
              </div>
            </div>
          ))
        ) : notices.length === 0 ? (
          <div className="empty">
            <p>お知らせはありません</p>
          </div>
        ) : (
          <>
            {notices.slice(0, 3).map((n, i) => (
              <Link key={n.id} href="/notices/" className="notice-card" style={{animationDelay:`${0.32+i*0.07}s`,display:"block",textDecoration:"none"}}>
                <div className="notice-inner">
                  <div className="notice-stripe" style={{background: n.is_pinned ? "#e53935" : "#006284"}}/>
                  <div className="notice-body">
                    <div className="notice-top">
                      <span className="notice-title">{n.is_pinned ? "📌 " : ""}{n.title}</span>
                    </div>
                    <div className="notice-text">{n.body}</div>
                    <div className="notice-meta">
                      {n.is_pinned === 1 && <span className="notice-pin">📌 重要</span>}
                      <span className="notice-from">{n.sender_name}</span>
                      <span className="notice-date">{n.published_at.replaceAll("-", "/")}</span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
            {notices.length > 3 && (
              <Link href="/notices/" style={{display:"block",textDecoration:"none"}}>
                <div style={{textAlign:"center",padding:"10px 0",fontSize:11,fontWeight:700,color:"#006284",fontFamily:"'Noto Sans JP',sans-serif"}}>
                  ＋ 残り{notices.length - 3}件のお知らせを見る
                </div>
              </Link>
            )}
          </>
        )}
      </div>

      {/* ━━━ タスク概要 ━━━ */}
      <div className="sec" style={{animationDelay:"0.5s", marginBottom:8}}>
        <div className="sec-hdr">
          <span className="sec-title">タスク</span>
        </div>

        {loading ? (
          <div className="task-summary" style={{animationDelay:"0.52s"}}>
            <div className="task-sum-hdr">
              <div className="shimmer" style={{height:24,width:120}}/>
            </div>
            {[0,1,2].map(i => (
              <div key={i} className="task-row">
                <div className="shimmer" style={{width:8,height:8,borderRadius:"50%",flexShrink:0}}/>
                <div className="shimmer" style={{flex:1,height:13}}/>
                <div className="shimmer" style={{width:30,height:11}}/>
              </div>
            ))}
          </div>
        ) : (
          <div className="task-summary" style={{animationDelay:"0.52s"}}>
            {/* 統計ヘッダー */}
            <div className="task-sum-hdr">
              <div className="task-stats">
                {(() => {
                  const overdue = tasks.filter(t => t.due_date && t.due_date < today).length
                  const total   = tasks.length
                  return (<>
                    {overdue > 0 && (
                      <div className="task-stat">
                        <span className="task-stat-num urg">{overdue}</span>
                        <span className="task-stat-lbl">期限超過</span>
                      </div>
                    )}
                    <div className="task-stat">
                      <span className="task-stat-num">{total}</span>
                      <span className="task-stat-lbl">未完了</span>
                    </div>
                  </>)
                })()}
              </div>
              <Link href="/tasks/" style={{fontSize:11,fontWeight:700,color:"#006284",textDecoration:"none",fontFamily:"'Noto Sans JP',sans-serif"}}>
                すべて見る →
              </Link>
            </div>

            {/* タスクなし */}
            {tasks.length === 0 && (
              <div className="empty" style={{padding:"24px 0"}}>
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3">
                  <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
                </svg>
                <p>未完了のタスクはありません</p>
              </div>
            )}

            {/* 上位4件表示 */}
            {tasks.slice(0,4).map(t => {
              const isOverdue = !!(t.due_date && t.due_date < today)
              const isDoing   = t.status === "doing"
              const dotColor  = isOverdue ? "#e53935" : isDoing ? "#f9a825" : "#006284"
              return (
                <div key={t.id} className="task-row">
                  <div className="task-dot" style={{background:dotColor}}/>
                  <span className="task-row-txt">{t.title}</span>
                  <span className="task-cat">{t.main_category_name}</span>
                </div>
              )
            })}

            {/* 残件数 */}
            {tasks.length > 4 && (
              <Link href="/tasks/" style={{display:"block",textDecoration:"none"}}>
                <div className="task-more">＋ 残り{tasks.length - 4}件</div>
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default function HomePage() {
  return (
    <Guard>
      <HomeInner />
    </Guard>
  )
}
