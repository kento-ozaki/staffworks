"use client"

import { useEffect, useState } from "react"
import { Guard } from "@/components/Guard"
import { apiFetch } from "@/lib/api"

// ── 型 ────────────────────────────────────────────────────────────
type Notice = {
  id: number
  title: string
  body: string
  sender_name: string
  is_pinned: 0 | 1
  published_at: string
  expires_at: string | null
}

// ── カラー ────────────────────────────────────────────────────────
const C = {
  bg:         "#f0f5f7",
  card:       "#ffffff",
  brand:      "#006284",
  brandTint:  "#e4f2f7",
  text:       "#0c1d24",
  sub:        "#3b6878",
  muted:      "#89adb8",
  line:       "#cde4eb",
  pin:        "#e53935",
  pinTint:    "#fff5f5",
  warn:       "#7a5400",
  warnTint:   "#fdf6e0",
} as const

// ── CSS ───────────────────────────────────────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=Noto+Sans+JP:wght@400;500;700&display=swap');
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html { -webkit-text-size-adjust: 100%; }
body { background: ${C.bg}; }

@keyframes fadeUp { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:none; } }
@keyframes spin   { to { transform:rotate(360deg); } }
@keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
@keyframes slideUp { from { opacity:0; transform:translateY(32px); } to { opacity:1; transform:none; } }
@keyframes shimmer {
  0%   { background-position:-200% center; }
  100% { background-position:200% center; }
}

.page { min-height:100vh; background:${C.bg}; font-family:'Noto Sans JP',sans-serif; }

/* ── ヘッダー ── */
.page-header {
  background:${C.brand}; padding:18px 16px 20px;
  position:sticky; top:0; z-index:10;
}
.page-header-inner { max-width:640px; margin:0 auto; }
.page-eyebrow { font-size:10px; font-weight:500; color:rgba(255,255,255,.5); letter-spacing:.18em; text-transform:uppercase; margin-bottom:3px; }
.page-title   { font-size:24px; font-weight:400; color:#fff; font-family:'DM Serif Display',serif; line-height:1.1; }

/* ── ボディ ── */
.page-body { max-width:640px; margin:0 auto; padding:16px 12px 80px; }
@media (min-width:560px) { .page-body { padding:20px 16px 80px; } }

/* ── カード ── */
.nc {
  background:${C.card}; border:1px solid ${C.line};
  border-radius:14px; overflow:hidden;
  box-shadow:0 2px 8px rgba(0,98,132,.06);
  margin-bottom:10px;
  cursor:pointer;
  -webkit-tap-highlight-color:transparent;
  animation:fadeUp .35s ease both;
  transition:box-shadow .15s;
}
.nc:active { box-shadow:0 1px 4px rgba(0,98,132,.1); }
.nc.pinned { border-left:3px solid ${C.pin}; }
.nc-inner  { display:flex; align-items:stretch; }
.nc-stripe { width:4px; flex-shrink:0; }
.nc-body   { flex:1; padding:14px 14px 14px 15px; display:flex; flex-direction:column; gap:5px; }
.nc-top    { display:flex; align-items:flex-start; justify-content:space-between; gap:8px; }
.nc-title  { font-size:14px; font-weight:700; color:${C.text}; line-height:1.4; }
.nc-text   {
  font-size:12px; color:${C.sub}; line-height:1.6;
  display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;
}
.nc-meta   { display:flex; align-items:center; gap:8px; margin-top:2px; }
.nc-pin    { font-size:10px; color:${C.pin}; font-weight:700; }
.nc-from   { font-size:10px; font-weight:700; color:${C.muted}; }
.nc-date   { font-size:10px; color:#b8d0da; }
.nc-arrow  { font-size:12px; color:${C.muted}; flex-shrink:0; align-self:center; padding-right:14px; }
.badge-pin {
  font-size:10px; font-weight:700; color:${C.pin};
  background:${C.pinTint}; border:1px solid ${C.pin}30;
  padding:2px 7px; border-radius:4px; white-space:nowrap; flex-shrink:0;
}

/* ── shimmer ── */
.shimmer {
  background:linear-gradient(90deg,#e4ecef 25%,#f2f7f9 50%,#e4ecef 75%);
  background-size:200% 100%; border-radius:8px;
  animation:shimmer 1.5s ease-in-out infinite;
}

/* ── 空状態 ── */
.empty { display:flex; flex-direction:column; align-items:center; gap:10px; padding:56px 0; color:${C.muted}; }
.empty p { font-size:13px; font-weight:500; }

/* ── モーダル ── */
.modal-overlay {
  position:fixed; inset:0; z-index:100;
  background:rgba(12,29,36,.45);
  display:flex; align-items:flex-end; justify-content:center;
  padding:0;
  animation:fadeIn .18s ease both;
}
@media (min-width:560px) {
  .modal-overlay { align-items:center; padding:24px; }
}
.modal-sheet {
  background:${C.card}; border-radius:20px 20px 0 0;
  width:100%; max-width:600px;
  max-height:88vh; display:flex; flex-direction:column;
  overflow:hidden;
  animation:slideUp .22s cubic-bezier(.22,1,.36,1) both;
}
@media (min-width:560px) {
  .modal-sheet { border-radius:20px; max-height:80vh; }
}
.modal-handle {
  width:36px; height:4px; border-radius:2px;
  background:${C.line}; margin:12px auto 4px; flex-shrink:0;
}
@media (min-width:560px) { .modal-handle { display:none; } }
.modal-header {
  padding:14px 16px 12px; border-bottom:1px solid ${C.line};
  display:flex; align-items:flex-start; gap:12px; flex-shrink:0;
}
.modal-title-wrap { flex:1; }
.modal-title { font-size:17px; font-weight:700; color:${C.text}; line-height:1.4; }
.modal-close {
  width:32px; height:32px; border-radius:50%; border:none;
  background:${C.bg}; color:${C.muted};
  display:flex; align-items:center; justify-content:center;
  cursor:pointer; flex-shrink:0;
  -webkit-tap-highlight-color:transparent;
}
.modal-meta {
  padding:10px 16px; border-bottom:1px solid ${C.bg};
  display:flex; align-items:center; gap:10px; flex-shrink:0; flex-wrap:wrap;
}
.modal-body {
  flex:1; overflow-y:auto; padding:16px;
  font-size:14px; color:${C.sub}; line-height:1.8;
  white-space:pre-wrap; word-break:break-all;
}
.modal-expires {
  margin:12px 16px 0; padding:10px 12px;
  background:${C.warnTint}; border:1px solid #dfc060;
  border-radius:8px; font-size:12px; color:${C.warn};
  flex-shrink:0;
}
`

// ── コンポーネント ────────────────────────────────────────────────
function NoticesInner() {
  const [notices,  setNotices]  = useState<Notice[]>([])
  const [loading,  setLoading]  = useState(true)
  const [selected, setSelected] = useState<Notice | null>(null)

  useEffect(() => {
    ;(async () => {
      const r = await apiFetch<{ notices: Notice[] }>("/notices_list.php", { method: "GET" })
      setLoading(false)
      if (r.ok) setNotices((r as any).notices ?? [])
    })()
  }, [])

  // モーダルを開いている間、背景スクロールを止める
  useEffect(() => {
    document.body.style.overflow = selected ? "hidden" : ""
    return () => { document.body.style.overflow = "" }
  }, [selected])

  return (
    <div className="page">
      <style>{CSS}</style>

      {/* ヘッダー */}
      <header className="page-header">
        <div className="page-header-inner">
          <p className="page-eyebrow">Information</p>
          <h1 className="page-title">お知らせ</h1>
        </div>
      </header>

      <main className="page-body">
        {/* ローディング */}
        {loading && [0,1,2].map(i => (
          <div key={i} className="nc" style={{animationDelay:`${i*0.06}s`, cursor:"default"}}>
            <div className="nc-inner">
              <div className="nc-stripe" style={{background:"#d8eaee"}}/>
              <div className="nc-body" style={{gap:8}}>
                <div className="shimmer" style={{height:14,width:"65%"}}/>
                <div className="shimmer" style={{height:11,width:"90%"}}/>
                <div className="shimmer" style={{height:11,width:"50%",marginTop:2}}/>
              </div>
            </div>
          </div>
        ))}

        {/* 空状態 */}
        {!loading && notices.length === 0 && (
          <div className="empty">
            <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
            <p>お知らせはありません</p>
          </div>
        )}

        {/* 一覧 */}
        {!loading && notices.map((n, i) => (
          <div
            key={n.id}
            className={`nc${n.is_pinned ? " pinned" : ""}`}
            style={{animationDelay:`${Math.min(i*0.05, 0.25)}s`}}
            onClick={() => setSelected(n)}
          >
            <div className="nc-inner">
              <div className="nc-stripe" style={{background: n.is_pinned ? C.pin : C.brand}}/>
              <div className="nc-body">
                <div className="nc-top">
                  <div style={{display:"flex", flexDirection:"column", gap:4, flex:1}}>
                    {n.is_pinned === 1 && <span className="badge-pin">📌 重要</span>}
                    <span className="nc-title">{n.title}</span>
                  </div>
                </div>
                <div className="nc-text">{n.body}</div>
                <div className="nc-meta">
                  <span className="nc-from">{n.sender_name}</span>
                  <span className="nc-date">{n.published_at.replaceAll("-", "/")}</span>
                </div>
              </div>
              <span className="nc-arrow">›</span>
            </div>
          </div>
        ))}
      </main>

      {/* ── モーダル ── */}
      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal-sheet" onClick={e => e.stopPropagation()}>
            <div className="modal-handle"/>

            {/* モーダルヘッダー */}
            <div className="modal-header">
              <div className="modal-title-wrap">
                {selected.is_pinned === 1 && (
                  <span className="badge-pin" style={{display:"inline-block", marginBottom:6}}>📌 重要</span>
                )}
                <div className="modal-title">{selected.title}</div>
              </div>
              <button className="modal-close" onClick={() => setSelected(null)}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            {/* メタ */}
            <div className="modal-meta">
              <span style={{fontSize:11, fontWeight:700, color:C.muted}}>{selected.sender_name}</span>
              <span style={{fontSize:11, color:"#b8d0da"}}>{selected.published_at.replaceAll("-", "/")}</span>
              {selected.expires_at && (
                <span style={{fontSize:11, color:C.warn, background:C.warnTint, padding:"2px 7px", borderRadius:4}}>
                  〜{selected.expires_at.replaceAll("-", "/")}まで
                </span>
              )}
            </div>

            {/* 本文 */}
            <div className="modal-body">{selected.body}</div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function NoticesPage() {
  return (
    <Guard>
      <NoticesInner />
    </Guard>
  )
}
