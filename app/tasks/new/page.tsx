"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Guard } from "@/components/Guard"
import type { ApiNg } from "@/lib/api"
import { toUserMessage } from "@/lib/errors"
import { createTask, listMainCategories, listSubCategories, type MainCategory, type SubCategory } from "@/lib/tasks"

const C = {
  bg:        "#f4f8fa",
  surface:   "#ffffff",
  brand:     "#006284",
  brandPale: "#e0f0f5",
  text:      "#0d1f26",
  sub:       "#4a7a8a",
  muted:     "#8aacb5",
  line:      "#d4e8ee",
  danger:    "#c0392b",
  dangerBg:  "#fdf2f2",
  dangerLine:"#e8b4b4",
} as const

const FH = `'Outfit', 'Noto Sans JP', sans-serif`
const FB = `'Noto Sans JP', 'Outfit', sans-serif`

function NewInner() {
  const router = useRouter()
  const [mainCats, setMainCats] = useState<MainCategory[]>([])
  const [subCats, setSubCats] = useState<SubCategory[]>([])
  const [title, setTitle] = useState("")
  const [mainId, setMainId] = useState<number>(0)
  const [selectedSubIds, setSelectedSubIds] = useState<number[]>([])
  const [detail, setDetail] = useState("")
  const [due, setDue] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [focused, setFocused] = useState<string | null>(null)

  useEffect(() => {
    ;(async () => {
      const r = await listMainCategories()
      if (r.ok) setMainCats(r.main_categories.filter(c => Number(c.is_active) === 1))
    })()
  }, [])

  useEffect(() => {
    ;(async () => {
      if (!mainId) { setSubCats([]); setSelectedSubIds([]); return }
      const r = await listSubCategories(mainId)
      if (r.ok) {
        const active = r.sub_categories.filter(c => Number(c.is_active) === 1)
        setSubCats(active)
        const nm = mainCats.find(m => m.id === mainId)?.name
        if (nm === "その他") { const o = active.find(s => s.name === "その他"); setSelectedSubIds(o ? [o.id] : []) }
        else setSelectedSubIds([])
      }
    })()
  }, [mainId])

  const mainName = useMemo(() => mainCats.find(m => m.id === mainId)?.name ?? "", [mainCats, mainId])
  const subDisabled = mainName === "その他"

  function toggleSub(id: number) {
    if (subDisabled) return
    setSelectedSubIds(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id])
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault(); setError(null)
    if (!title.trim()) return setError("タイトルを入力してください")
    if (!mainId) return setError("メインカテゴリを選択してください")
    setLoading(true)
    const r = await createTask({ title: title.trim(), main_category_id: mainId, sub_category_ids: selectedSubIds, detail: detail.trim() || undefined, due_date: due || undefined })
    setLoading(false)
    if (!r.ok) { setError(toUserMessage(r as ApiNg, "作成に失敗しました")); return }
    router.replace(`/task/?id=${r.task_id}`)
  }

  /* フィールドのfocusボーダー */
  const fBorder = (name: string) => focused === name ? `1.5px solid ${C.brand}` : `1px solid ${C.line}`
  const baseInp: React.CSSProperties = { width: "100%", padding: "10px 13px", borderRadius: 8, background: C.bg, color: C.text, fontSize: 14, fontFamily: FB, outline: "none", transition: "border 0.15s", boxSizing: "border-box" as const }

  const LBL: React.CSSProperties = { display: "block", fontSize: 11, fontWeight: 700, color: C.sub, letterSpacing: "0.09em", textTransform: "uppercase", marginBottom: 8, fontFamily: FH }

  /* ステップ進捗 */
  const step = (title.trim() ? 1 : 0) + (mainId > 0 ? 1 : 0)

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

      <div style={{ maxWidth: 600, margin: "0 auto" }}>

        {/* ── ヘッダー ── */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 36 }}>
          <Link href="/tasks/" style={{ width: 36, height: 36, borderRadius: "50%", border: `1px solid ${C.line}`, background: C.surface, display: "flex", alignItems: "center", justifyContent: "center", color: C.muted, textDecoration: "none", flexShrink: 0 }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
          </Link>
          <div>
            <p style={{ margin: "0 0 4px", fontSize: 11, fontWeight: 700, color: C.brand, letterSpacing: "0.12em", textTransform: "uppercase", fontFamily: FH }}>New Task</p>
            <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, color: C.text, letterSpacing: "-0.02em", fontFamily: FH }}>新規タスク作成</h1>
          </div>
        </div>

        {/* ── 進捗バー ── */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: C.muted, marginBottom: 6, fontFamily: FB }}>
            <span>入力進捗</span>
            <span style={{ color: step === 2 ? C.brand : C.muted, fontWeight: 700 }}>{step}/2 完了</span>
          </div>
          <div style={{ height: 3, background: C.line, borderRadius: 999 }}>
            <div style={{ height: "100%", width: `${(step / 2) * 100}%`, background: C.brand, borderRadius: 999, transition: "width 0.35s ease" }} />
          </div>
        </div>

        <form onSubmit={onSubmit}>
          {/* ── カードボディ ── */}
          <div style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: 12, overflow: "hidden", boxShadow: "0 2px 10px rgba(0,98,132,0.06)" }}>

            {/* タイトル */}
            <div style={{ padding: "22px 24px", borderBottom: `1px solid ${C.line}` }}>
              <label style={LBL}>タイトル <span style={{ color: C.danger }}>*</span></label>
              <input value={title} onChange={e => setTitle(e.target.value)}
                onFocus={() => setFocused("t")} onBlur={() => setFocused(null)}
                placeholder="タスクのタイトルを入力してください"
                style={{ ...baseInp, border: fBorder("t") }} />
            </div>

            {/* メインカテゴリ */}
            <div style={{ padding: "22px 24px", borderBottom: `1px solid ${C.line}` }}>
              <label style={LBL}>メインカテゴリ <span style={{ color: C.danger }}>*</span></label>
              <select value={mainId} onChange={e => setMainId(Number(e.target.value))}
                onFocus={() => setFocused("m")} onBlur={() => setFocused(null)}
                style={{ ...baseInp, border: fBorder("m"), cursor: "pointer", color: mainId ? C.text : C.muted }}>
                <option value={0}>カテゴリを選択してください</option>
                {mainCats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            {/* サブカテゴリ */}
            {mainId > 0 && (
              <div style={{ padding: "22px 24px", borderBottom: `1px solid ${C.line}` }}>
                <label style={LBL}>サブカテゴリ</label>
                {subDisabled && <p style={{ margin: "0 0 10px", fontSize: 12, color: C.muted, fontFamily: FB }}>「その他」のため自動選択されます</p>}
                {subCats.length === 0
                  ? <p style={{ margin: 0, fontSize: 13, color: C.muted, fontFamily: FB }}>サブカテゴリがありません</p>
                  : (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {subCats.map(s => {
                        const on = selectedSubIds.includes(s.id)
                        return (
                          <button key={s.id} type="button" onClick={() => toggleSub(s.id)} disabled={subDisabled}
                            style={{
                              padding: "6px 14px", borderRadius: 6,
                              border: `1px solid ${on ? C.brand : C.line}`,
                              background: on ? C.brandPale : C.bg,
                              color: on ? C.brand : C.sub,
                              fontSize: 13, fontWeight: on ? 700 : 400,
                              cursor: subDisabled ? "default" : "pointer", fontFamily: FB,
                              transition: "all 0.13s", opacity: subDisabled ? 0.5 : 1,
                            }}>
                            {on && <span style={{ marginRight: 4, fontSize: 11 }}>✓</span>}{s.name}
                          </button>
                        )
                      })}
                    </div>
                  )
                }
              </div>
            )}

            {/* 詳細 */}
            <div style={{ padding: "22px 24px", borderBottom: `1px solid ${C.line}` }}>
              <label style={LBL}>詳細</label>
              <textarea value={detail} onChange={e => setDetail(e.target.value)}
                onFocus={() => setFocused("d")} onBlur={() => setFocused(null)}
                placeholder="タスクの背景や詳細を記入してください（任意）"
                rows={4}
                style={{ ...baseInp, border: fBorder("d"), lineHeight: 1.75 }} />
            </div>

            {/* 期日 */}
            <div style={{ padding: "22px 24px" }}>
              <label style={LBL}>期日</label>
              <input type="date" value={due} onChange={e => setDue(e.target.value)}
                onFocus={() => setFocused("du")} onBlur={() => setFocused(null)}
                style={{ ...baseInp, border: fBorder("du"), maxWidth: 180 }} />
            </div>
          </div>

          {/* エラー */}
          {error && (
            <div style={{ marginTop: 14, background: C.dangerBg, border: `1px solid ${C.dangerLine}`, borderRadius: 8, padding: "11px 15px", color: C.danger, fontSize: 13, fontFamily: FB, display: "flex", alignItems: "center", gap: 8 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              {error}
            </div>
          )}

          {/* 送信ボタン */}
          <button type="submit" disabled={loading} style={{
            marginTop: 18, width: "100%", height: 46, borderRadius: 9, border: "none",
            background: loading ? C.muted : C.brand,
            color: "#fff", fontSize: 14, fontWeight: 700, fontFamily: FH,
            cursor: loading ? "not-allowed" : "pointer",
            boxShadow: loading ? "none" : "0 2px 16px rgba(0,98,132,0.30)",
            transition: "background 0.15s",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            letterSpacing: "0.02em",
          }}>
            {loading
              ? <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" style={{ animation: "spin 0.8s linear infinite" }}><path d="M21 12a9 9 0 11-6.22-8.56"/></svg>作成中...</>
              : "タスクを作成する"
            }
          </button>
        </form>
      </div>
    </div>
  )
}

export default function NewTaskPage() { return <Guard><NewInner /></Guard> }
