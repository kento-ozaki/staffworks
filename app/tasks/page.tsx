"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { Guard } from "@/components/Guard"
import type { ApiNg } from "@/lib/api"
import { toUserMessage } from "@/lib/errors"
import { board, listMainCategories, type MainCategory, type TaskCard as T } from "@/lib/tasks"

const C = {
  bg:          "#f0f5f7",
  surface:     "#ffffff",
  surfaceDeep: "#f7fafb",
  brand:       "#006284",
  brandMid:    "#004d66",
  brandDeep:   "#003a4d",
  brandPale:   "#e0f0f5",
  brandPaler:  "#f0f8fb",
  text:        "#0d1f26",
  sub:         "#4a7a8a",
  muted:       "#8aacb5",
  line:        "#daeaf0",
  lineSoft:    "#edf5f8",
  danger:      "#c0392b",
  dangerBg:    "#fdf2f2",
  dangerLine:  "#e8b4b4",
  dangerPale:  "#fff5f5",
} as const

const FH = `'DM Sans', 'Noto Sans JP', sans-serif`
const FB = `'Noto Sans JP', 'DM Sans', sans-serif`
const FM = `'DM Mono', 'Noto Sans JP', monospace`

function today() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`
}
const isOverdue = (due: string | null) => !!due && due < today()
function fmtDue(due: string | null) {
  if (!due) return null
  const d = new Date(due + "T00:00:00")
  return `${d.getMonth()+1}/${d.getDate()}`
}

function TaskCard({ task, index }: { task: T; index: number }) {
  const [pressed, setPressed] = useState(false)
  const overdue = isOverdue(task.due_date)
  const due = fmtDue(task.due_date)

  return (
    <Link
      href={`/task/?id=${task.id}`}
      style={{ textDecoration: "none", color: "inherit", display: "block" }}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      onMouseLeave={() => setPressed(false)}
      onTouchStart={() => setPressed(true)}
      onTouchEnd={() => setPressed(false)}
    >
      <article
        className="task-card"
        data-overdue={overdue}
        style={{
          animationDelay: `${Math.min(index * 40, 300)}ms`,
          transform: pressed ? "scale(0.985)" : "scale(1)",
          transition: "transform 0.12s cubic-bezier(.22,1,.36,1), box-shadow 0.18s ease",
        }}
      >
        {/* 上部：カテゴリ ＋ 期日 */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 10 }}>
          <span className="category-pill">
            {task.main_category_name}
          </span>
          {due && (
            <span className={overdue ? "due-badge due-overdue" : "due-badge"}>
              {overdue && (
                <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                </svg>
              )}
              {due}
            </span>
          )}
        </div>

        {/* タイトル */}
        <p style={{
          margin: "0 0 12px", fontSize: 14.5, fontWeight: 600,
          color: C.text, lineHeight: 1.6, fontFamily: FB,
          letterSpacing: "-0.01em",
        }}>
          {task.title}
        </p>

        {/* 下部：登録者 */}
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <div className="avatar">
            {(task.created_by_name ?? "?")[0].toUpperCase()}
          </div>
          <span style={{ fontSize: 12, color: C.muted, fontFamily: FB, letterSpacing: "0.01em" }}>
            {task.created_by_name}
          </span>
        </div>

        {/* 右矢印 */}
        <div className="card-arrow">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 18l6-6-6-6"/>
          </svg>
        </div>
      </article>
    </Link>
  )
}

function BoardInner() {
  const [tab, setTab] = useState<"todo" | "doing">("todo")
  const [todo, setTodo] = useState<T[]>([])
  const [doing, setDoing] = useState<T[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [q, setQ] = useState("")
  const [mainCats, setMainCats] = useState<MainCategory[]>([])
  const [mainId, setMainId] = useState<number>(0)
  const [creator, setCreator] = useState("")
  const [onlyOverdue, setOnlyOverdue] = useState(false)
  const [filterOpen, setFilterOpen] = useState(false)

  async function load() {
    setError(null); setLoading(true)
    const r = await board(); setLoading(false)
    if (!r.ok) { setError(toUserMessage(r as ApiNg, "取得に失敗しました")); return }
    setTodo(r.todo); setDoing(r.doing)
  }

  useEffect(() => {
    load()
    ;(async () => {
      const r = await listMainCategories()
      if (r.ok) setMainCats(r.main_categories.filter(c => Number(c.is_active) === 1))
    })()
  }, [])

  const list = useMemo(() => {
    const src = tab === "todo" ? todo : doing
    const kw = q.trim().toLowerCase()
    const ck = creator.trim().toLowerCase()
    return src.filter(t => {
      if (mainId && Number(t.main_category_id) !== mainId) return false
      if (onlyOverdue && !isOverdue(t.due_date)) return false
      if (ck && !t.created_by_name.toLowerCase().includes(ck)) return false
      if (kw) { if (!`${t.title} ${t.main_category_name} ${t.created_by_name}`.toLowerCase().includes(kw)) return false }
      return true
    })
  }, [tab, todo, doing, q, mainId, creator, onlyOverdue])

  const overdueCount = (tab === "todo" ? todo : doing).filter(t => isOverdue(t.due_date)).length
  const hasFilter = !!q || !!creator || !!mainId || onlyOverdue

  return (
    <div className="root">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500&family=Noto+Sans+JP:wght@400;500;600;700&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .root {
          min-height: 100vh;
          background: ${C.bg};
          /* 微細なグリッドテクスチャで奥行きを演出 */
          background-image:
            radial-gradient(circle at 20% 0%, rgba(0,98,132,0.04) 0%, transparent 50%),
            radial-gradient(circle at 80% 100%, rgba(0,98,132,0.03) 0%, transparent 50%);
          font-family: ${FB};
          -webkit-font-smoothing: antialiased;
        }

        /* ─── トップバー ─── */
        .topbar {
          position: sticky; top: 0; z-index: 100;
          background: rgba(255,255,255,0.92);
          backdrop-filter: blur(16px) saturate(180%);
          -webkit-backdrop-filter: blur(16px) saturate(180%);
          border-bottom: 1px solid ${C.line};
        }

        /* ─── タブ行 ─── */
        .tab-row {
          display: flex;
          align-items: stretch;
          padding: 0 4px;
          border-bottom: 1px solid ${C.lineSoft};
        }

        .tab-btn {
          flex: 1; border: none; background: transparent;
          padding: 15px 8px 13px;
          display: flex; align-items: center; justify-content: center; gap: 7px;
          font-size: 13px; font-family: ${FB}; font-weight: 500;
          color: ${C.muted}; cursor: pointer; position: relative;
          -webkit-tap-highlight-color: transparent;
          transition: color 0.2s;
        }
        .tab-btn::after {
          content: ''; position: absolute; bottom: -1px; left: 16px; right: 16px;
          height: 2px; border-radius: 2px 2px 0 0;
          background: ${C.brand};
          transform: scaleX(0); transform-origin: center;
          transition: transform 0.25s cubic-bezier(.34,1.56,.64,1);
        }
        .tab-btn.active { color: ${C.brand}; font-weight: 700; }
        .tab-btn.active::after { transform: scaleX(1); }

        .tab-count {
          font-size: 11px; font-weight: 700; font-family: ${FH};
          padding: 2px 7px; border-radius: 99px;
          background: ${C.bg}; color: ${C.muted};
          transition: background 0.2s, color 0.2s;
        }
        .tab-btn.active .tab-count {
          background: ${C.brandPale}; color: ${C.brand};
        }

        .overdue-badge {
          font-size: 10px; font-weight: 700; font-family: ${FH};
          padding: 1px 6px; border-radius: 99px;
          background: ${C.dangerBg}; color: ${C.danger};
          border: 1px solid ${C.dangerLine};
          animation: pulse 2s ease infinite;
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }

        /* ─── アクション行 ─── */
        .action-row {
          display: flex; align-items: center;
          padding: 9px 12px; gap: 8px;
        }

        .btn-done {
          height: 38px; flex-shrink: 0;
          display: inline-flex; align-items: center; gap: 5px;
          padding: 0 13px; border-radius: 12px;
          border: 1.5px solid ${C.line};
          background: ${C.surfaceDeep}; color: ${C.sub};
          font-size: 12.5px; font-weight: 600; font-family: ${FB};
          text-decoration: none; white-space: nowrap;
          -webkit-tap-highlight-color: transparent;
          transition: background 0.15s, border-color 0.15s;
        }
        .btn-done:active { background: ${C.brandPaler}; border-color: ${C.brand}; }

        .btn-new {
          flex: 1; height: 38px;
          display: inline-flex; align-items: center; justify-content: center; gap: 6px;
          border-radius: 12px; border: none;
          background: linear-gradient(135deg, ${C.brand} 0%, ${C.brandDeep} 100%);
          color: #fff; font-size: 13.5px; font-weight: 700; font-family: ${FH};
          text-decoration: none; letter-spacing: 0.01em;
          box-shadow: 0 2px 0 ${C.brandDeep}, 0 4px 16px rgba(0,98,132,0.28);
          -webkit-tap-highlight-color: transparent;
          transition: transform 0.1s, box-shadow 0.1s;
        }
        .btn-new:active {
          transform: translateY(1px);
          box-shadow: 0 1px 0 ${C.brandDeep}, 0 2px 8px rgba(0,98,132,0.2);
        }

        .icon-btn {
          width: 38px; height: 38px; flex-shrink: 0;
          border-radius: 12px; border: 1.5px solid ${C.line};
          background: ${C.surfaceDeep};
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; position: relative;
          -webkit-tap-highlight-color: transparent;
          transition: background 0.15s, border-color 0.15s;
        }
        .icon-btn:active { background: ${C.brandPaler}; border-color: ${C.brand}; }
        .icon-btn.active-filter {
          background: ${C.brandPale}; border-color: ${C.brand};
        }
        .filter-dot {
          position: absolute; top: 6px; right: 6px;
          width: 6px; height: 6px; border-radius: 50%;
          background: ${C.brand}; border: 1.5px solid white;
        }

        /* ─── フィルターパネル ─── */
        .filter-panel {
          padding: 6px 12px 14px;
          border-top: 1px solid ${C.lineSoft};
          display: flex; flex-direction: column; gap: 9px;
          animation: slideDown 0.2s cubic-bezier(.22,1,.36,1) both;
        }
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: none; }
        }

        .filter-input {
          height: 42px; width: 100%; padding: 0 14px;
          background: ${C.bg};
          border: 1.5px solid ${C.line};
          border-radius: 11px;
          color: ${C.text}; font-size: 14px; font-family: ${FB};
          outline: none;
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        .filter-input:focus {
          border-color: ${C.brand};
          box-shadow: 0 0 0 3px rgba(0,98,132,0.10);
        }
        ::placeholder { color: ${C.muted}; }

        .filter-row { display: flex; gap: 8px; }
        .filter-row .filter-input { flex: 1; }

        /* ─── カード ─── */
        .task-card {
          position: relative;
          background: ${C.surface};
          border-radius: 18px;
          border: 1px solid ${C.line};
          padding: 16px 44px 16px 20px;
          cursor: pointer;
          box-shadow: 0 1px 2px rgba(0,98,132,0.04), 0 4px 12px rgba(0,98,132,0.04);
          animation: cardUp 0.3s cubic-bezier(.22,1,.36,1) both;
          overflow: hidden;
          -webkit-tap-highlight-color: transparent;
        }
        .task-card::before {
          content: '';
          position: absolute; left: 0; top: 0; bottom: 0;
          width: 3px; border-radius: 18px 0 0 18px;
          background: ${C.line};
          transition: background 0.2s;
        }
        .task-card:active::before,
        .task-card:hover::before {
          background: linear-gradient(to bottom, ${C.brand}, ${C.brandMid});
        }
        .task-card[data-overdue="true"]::before {
          background: linear-gradient(to bottom, ${C.danger}, #e74c3c);
        }
        .task-card[data-overdue="true"] {
          background: ${C.dangerPale};
          border-color: ${C.dangerLine};
        }

        @keyframes cardUp {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: none; }
        }

        .category-pill {
          font-size: 10px; font-weight: 700;
          font-family: ${FH};
          color: ${C.brand};
          background: ${C.brandPale};
          padding: 3px 9px; border-radius: 99px;
          letter-spacing: 0.06em; text-transform: uppercase;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
          max-width: 60%;
        }

        .due-badge {
          display: inline-flex; align-items: center; gap: 3px;
          font-size: 11.5px; font-weight: 700; font-family: ${FM};
          color: ${C.sub};
          background: ${C.brandPaler};
          border: 1px solid ${C.line};
          padding: 3px 9px; border-radius: 99px;
          flex-shrink: 0;
        }
        .due-overdue {
          color: ${C.danger};
          background: ${C.dangerBg};
          border-color: ${C.dangerLine};
        }

        .avatar {
          width: 22px; height: 22px; border-radius: 50%; flex-shrink: 0;
          background: linear-gradient(135deg, ${C.brand}, ${C.brandDeep});
          display: flex; align-items: center; justify-content: center;
          font-size: 9.5px; font-weight: 700; color: #fff; font-family: ${FH};
          box-shadow: 0 1px 4px rgba(0,98,132,0.3);
        }

        .card-arrow {
          position: absolute; right: 14px; top: 50%; transform: translateY(-50%);
          color: ${C.line};
          display: flex; align-items: center;
          transition: color 0.15s, transform 0.15s;
        }
        .task-card:hover .card-arrow,
        .task-card:active .card-arrow {
          color: ${C.brand};
          transform: translateY(-50%) translateX(2px);
        }

        /* ─── スピナー ─── */
        @keyframes spin { to { transform: rotate(360deg); } }
        .spinner {
          width: 36px; height: 36px; border-radius: 50%;
          border: 3px solid ${C.brandPale};
          border-top-color: ${C.brand};
          animation: spin 0.7s linear infinite;
          margin: 0 auto 16px;
        }

        /* ─── 空状態 ─── */
        .empty-icon {
          width: 60px; height: 60px; border-radius: 20px;
          background: linear-gradient(135deg, ${C.brandPale}, ${C.brandPaler});
          display: flex; align-items: center; justify-content: center;
          margin: 0 auto 18px;
          box-shadow: 0 4px 20px rgba(0,98,132,0.08);
        }

        /* ─── トグル ─── */
        .toggle-track {
          position: relative; width: 42px; height: 24px; border-radius: 99px;
          border: none; padding: 0; cursor: pointer; flex-shrink: 0;
          transition: background 0.22s;
        }
        .toggle-thumb {
          position: absolute; top: 3px;
          width: 18px; height: 18px; border-radius: 50%;
          background: #fff;
          box-shadow: 0 1px 5px rgba(0,0,0,0.18);
          transition: left 0.22s cubic-bezier(.34,1.56,.64,1);
          display: block;
        }

        /* ─── エラー ─── */
        .error-bar {
          background: ${C.dangerBg}; border: 1px solid ${C.dangerLine};
          border-radius: 12px; padding: 12px 14px; margin-bottom: 14px;
          color: ${C.danger}; font-size: 13px; font-family: ${FB};
          display: flex; align-items: center; gap: 8px;
        }

        select { appearance: none; -webkit-appearance: none; }
        select option { background: #fff; color: ${C.text}; }
      `}</style>

      {/* ══════════════════════════════════════
          トップバー（sticky）
      ══════════════════════════════════════ */}
      <div className="topbar">

        {/* 行①：タブ */}
        <div className="tab-row">
          {([["todo","未着手"] as const, ["doing","進行中"] as const]).map(([key, label]) => {
            const cnt = key === "todo" ? todo.length : doing.length
            const active = tab === key
            const oc = active ? overdueCount : 0
            return (
              <button key={key}
                className={`tab-btn${active ? " active" : ""}`}
                onClick={() => setTab(key)}
              >
                {label}
                <span className="tab-count">{cnt}</span>
                {oc > 0 && <span className="overdue-badge">!{oc}</span>}
              </button>
            )
          })}
        </div>

        {/* 行②：アクションボタン群 */}
        <div className="action-row">
          {/* 完了一覧 */}
          <Link href="/tasks/done/" className="btn-done">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            完了一覧
          </Link>

          {/* 新規タスク */}
          <Link href="/tasks/new/" className="btn-new">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            新規タスク
          </Link>

          {/* 更新 */}
          <button
            className="icon-btn"
            onClick={load}
            disabled={loading}
            style={{ opacity: loading ? 0.45 : 1, cursor: loading ? "default" : "pointer" }}
            aria-label="更新"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={C.brand} strokeWidth="2.4"
              style={{ animation: loading ? "spin 0.7s linear infinite" : "none" }}>
              <polyline points="23 4 23 10 17 10"/>
              <path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/>
            </svg>
          </button>

          {/* フィルター */}
          <button
            className={`icon-btn${filterOpen || hasFilter ? " active-filter" : ""}`}
            onClick={() => setFilterOpen(v => !v)}
            aria-label="フィルター"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
              stroke={filterOpen || hasFilter ? C.brand : C.muted} strokeWidth="2.2">
              <line x1="4" y1="6" x2="20" y2="6"/>
              <line x1="8" y1="12" x2="16" y2="12"/>
              <line x1="11" y1="18" x2="13" y2="18"/>
            </svg>
            {hasFilter && <span className="filter-dot"/>}
          </button>
        </div>

        {/* 行③：フィルターパネル（アコーディオン） */}
        {filterOpen && (
          <div className="filter-panel">
            {/* キーワード検索 */}
            <div style={{ position: "relative" }}>
              <svg style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}
                width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="2.4">
                <circle cx="11" cy="11" r="8"/>
                <line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input
                className="filter-input"
                value={q}
                onChange={e => setQ(e.target.value)}
                placeholder="タイトル・カテゴリ・登録者で検索"
                style={{ paddingLeft: 38 }}
              />
            </div>

            {/* 登録者 ＋ カテゴリ */}
            <div className="filter-row">
              <input
                className="filter-input"
                value={creator}
                onChange={e => setCreator(e.target.value)}
                placeholder="登録者"
              />
              <div style={{ flex: 1.2, position: "relative" }}>
                <select
                  className="filter-input"
                  value={mainId}
                  onChange={e => setMainId(Number(e.target.value))}
                  style={{ cursor: "pointer", color: mainId ? C.text : C.muted, paddingRight: 32 }}
                >
                  <option value={0}>カテゴリ：全て</option>
                  {mainCats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <svg style={{ position: "absolute", right: 11, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}
                  width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="2.5">
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </div>
            </div>

            {/* 期限超過トグル */}
            <label style={{
              display: "flex", alignItems: "center", gap: 10, cursor: "pointer",
              userSelect: "none", fontSize: 13, fontFamily: FB,
              color: onlyOverdue ? C.danger : C.sub,
              fontWeight: onlyOverdue ? 600 : 400,
            }}>
              <button
                type="button"
                className="toggle-track"
                onClick={() => setOnlyOverdue(v => !v)}
                style={{ background: onlyOverdue ? "#f5c6c6" : C.line }}
              >
                <span
                  className="toggle-thumb"
                  style={{ left: onlyOverdue ? 21 : 3, background: onlyOverdue ? C.danger : "#fff" }}
                />
              </button>
              期限超過のみ表示
            </label>
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════
          コンテンツ
      ══════════════════════════════════════ */}
      <div style={{ padding: "16px 14px 40px" }}>

        {/* エラー */}
        {error && (
          <div className="error-bar">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.danger} strokeWidth="2.2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            {error}
          </div>
        )}

        {/* ローディング */}
        {loading && list.length === 0 && (
          <div style={{ padding: "80px 0", textAlign: "center", color: C.muted, fontSize: 13, fontFamily: FB }}>
            <div className="spinner"/>
            読み込み中...
          </div>
        )}

        {/* 空状態 */}
        {!loading && list.length === 0 && (
          <div style={{ padding: "80px 0", textAlign: "center" }}>
            <div className="empty-icon">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={C.brand} strokeWidth="1.6">
                <rect x="3" y="3" width="7" height="7" rx="1.5"/>
                <rect x="14" y="3" width="7" height="7" rx="1.5"/>
                <rect x="3" y="14" width="7" height="7" rx="1.5"/>
                <rect x="14" y="14" width="7" height="7" rx="1.5"/>
              </svg>
            </div>
            <p style={{ fontSize: 15, fontWeight: 700, color: C.sub, fontFamily: FH }}>
              タスクがありません
            </p>
            <p style={{ marginTop: 6, fontSize: 12.5, color: C.muted, fontFamily: FB }}>
              条件を変えてみてください
            </p>
          </div>
        )}

        {/* カードリスト */}
        {list.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
            {list.map((t, i) => (
              <TaskCard key={t.id} task={t} index={i} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default function TasksPage() { return <Guard><BoardInner /></Guard> }
