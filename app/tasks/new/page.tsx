"use client"

import React from "react"
import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Guard } from "@/components/Guard"
import type { ApiNg } from "@/lib/api"
import { toUserMessage } from "@/lib/errors"
import { createTask, listMainCategories, listSubCategories, type MainCategory, type SubCategory } from "@/lib/tasks"

import { C, F_DISPLAY, F_BODY, F_MONO, GLOBAL_CSS, ErrorBanner, FieldInp } from "../page"

function NewInner() {
  const router = useRouter()
  const [mainCats, setMainCats]       = useState<MainCategory[]>([])
  const [subCats, setSubCats]         = useState<SubCategory[]>([])
  const [title, setTitle]             = useState("")
  const [mainId, setMainId]           = useState<number>(0)
  const [selectedSubIds, setSelectedSubIds] = useState<number[]>([])
  const [detail, setDetail]           = useState("")
  const [due, setDue]                 = useState("")
  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState<string|null>(null)
  const [focused, setFocused]         = useState<string|null>(null)

  useEffect(() => {
    ;(async () => {
      const r = await listMainCategories()
      if (r.ok) setMainCats(r.main_categories.filter((c: MainCategory) => Number(c.is_active) === 1))
    })()
  }, [])

  useEffect(() => {
    ;(async () => {
      if (!mainId) { setSubCats([]); setSelectedSubIds([]); return }
      const r = await listSubCategories(mainId)
      if (r.ok) {
        const active = r.sub_categories.filter((c: SubCategory) => Number(c.is_active) === 1)
        setSubCats(active)
        const nm = mainCats.find((m: MainCategory) => m.id === mainId)?.name
        if (nm === "その他") { const o = active.find((s: SubCategory) => s.name === "その他"); setSelectedSubIds(o ? [o.id] : []) }
        else setSelectedSubIds([])
      }
    })()
  }, [mainId])

  const mainName    = useMemo(() => mainCats.find((m: MainCategory) => m.id === mainId)?.name ?? "", [mainCats, mainId])
  const subDisabled = mainName === "その他"

  function toggleSub(id: number) {
    if (subDisabled) return
    setSelectedSubIds((p: number[]) => p.includes(id) ? p.filter(x => x !== id) : [...p, id])
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setError(null)
    if (!title.trim()) return setError("タイトルを入力してください")
    if (!mainId)       return setError("メインカテゴリを選択してください")
    setLoading(true)
    const r = await createTask({
      title: title.trim(), main_category_id: mainId,
      sub_category_ids: selectedSubIds,
      detail: detail.trim() || undefined,
      due_date: due || undefined,
    })
    setLoading(false)
    if (!r.ok) { setError(toUserMessage(r as ApiNg, "作成に失敗しました")); return }
    router.replace(`/task/?id=${r.task_id}`)
  }

  const step = (title.trim() ? 1 : 0) + (mainId > 0 ? 1 : 0)

  /* ラベルスタイル */
  const LBL: React.CSSProperties = {
    display: "block", fontSize: 10.5, fontWeight: 600,
    color: C.textMuted, letterSpacing: "0.09em",
    textTransform: "uppercase", fontFamily: F_BODY,
    marginBottom: 8,
  }

  /* フィールドの共通スタイル */
  const inp = (name: string): React.CSSProperties => ({
    width: "100%", padding: "10px 13px",
    borderRadius: 8,
    border: `1.5px solid ${focused === name ? C.ink : C.rule}`,
    boxShadow: focused === name ? "0 0 0 3px rgba(0,98,132,0.09)" : "none",
    background: C.paperSub,
    color: C.textPrimary, fontSize: 14, fontFamily: F_BODY,
    outline: "none", transition: "border-color 0.15s, box-shadow 0.15s",
  })

  return (
    <div style={{ minHeight: "100vh", background: C.canvas, fontFamily: F_BODY }}>
      <style dangerouslySetInnerHTML={{ __html: GLOBAL_CSS() }}/>

      {/* ── ヘッダー ── */}
      <header style={{
        background: "rgba(255,255,255,0.96)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        borderBottom: `1px solid ${C.rule}`,
        padding: "13px 14px 14px",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: 16 }}>
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
          <div>
            <p style={{ margin: "0 0 2px", fontSize: 9.5, fontWeight: 600, color: C.ink, letterSpacing: "0.14em", textTransform: "uppercase", fontFamily: F_BODY }}>
              New Task
            </p>
            <h1 style={{ margin: 0, fontFamily: F_DISPLAY, fontSize: 22, fontWeight: 600, color: C.textPrimary, letterSpacing: "-0.02em" }}>
              新規タスク作成
            </h1>
          </div>
        </div>

        {/* ステップ進捗 — シンプルなドット列 */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {[
            { label: "タイトル", done: !!title.trim() },
            { label: "カテゴリ", done: mainId > 0 },
          ].map((s, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              {i > 0 && <div style={{ width: 16, height: 1, background: s.done ? C.ink : C.rule }}/>}
              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <div style={{
                  width: 18, height: 18, borderRadius: "50%",
                  background: s.done ? C.ink : C.paper,
                  border: `1.5px solid ${s.done ? C.ink : C.rule}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "all 0.2s",
                }}>
                  {s.done && (
                    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  )}
                </div>
                <span style={{ fontSize: 11, fontFamily: F_BODY, color: s.done ? C.ink : C.textMuted, fontWeight: s.done ? 600 : 400 }}>
                  {s.label}
                </span>
              </div>
            </div>
          ))}
          <span style={{ marginLeft: "auto", fontSize: 11, fontFamily: F_MONO, color: step === 2 ? C.ink : C.textGhost }}>
            {step}/2
          </span>
        </div>
      </header>

      {/* ── フォーム本体 ── */}
      <main style={{ padding: "16px 14px 48px" }}>
        {error && <ErrorBanner msg={error}/>}

        <form onSubmit={onSubmit}>
          {/* フィールドカード */}
          <div style={{
            background: C.paper,
            borderRadius: 16, border: `1px solid ${C.rule}`,
            boxShadow: "0 1px 12px rgba(0,98,132,0.06)",
            overflow: "hidden", marginBottom: 14,
          }}>

            {/* タイトル */}
            <div style={{ padding: "18px 16px", borderBottom: `1px solid ${C.ruleSoft}` }}>
              <label style={LBL}>タイトル <span style={{ color: C.rose }}>*</span></label>
              <input
                className="field-inp"
                value={title} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)}
                onFocus={() => setFocused("t")} onBlur={() => setFocused(null)}
                placeholder="タスクのタイトルを入力"
                style={inp("t")}
              />
            </div>

            {/* メインカテゴリ */}
            <div style={{ padding: "18px 16px", borderBottom: `1px solid ${C.ruleSoft}` }}>
              <label style={LBL}>メインカテゴリ <span style={{ color: C.rose }}>*</span></label>
              <div style={{ position: "relative" }}>
                <select
                  className="field-inp"
                  value={mainId} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setMainId(Number(e.target.value))}
                  onFocus={() => setFocused("m")} onBlur={() => setFocused(null)}
                  style={{ ...inp("m"), cursor: "pointer", color: mainId ? C.textPrimary : C.textGhost, paddingRight: 34 }}
                >
                  <option value={0}>カテゴリを選択</option>
                  {mainCats.map((c: MainCategory) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <svg style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}
                  width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={C.textMuted} strokeWidth="2.4">
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </div>
            </div>

            {/* サブカテゴリ */}
            {mainId > 0 && (
              <div style={{ padding: "18px 16px", borderBottom: `1px solid ${C.ruleSoft}` }}>
                <label style={LBL}>サブカテゴリ</label>
                {subDisabled && (
                  <p style={{ margin: "0 0 8px", fontSize: 12, color: C.textMuted }}>「その他」のため自動選択されます</p>
                )}
                {subCats.length === 0
                  ? <p style={{ margin: 0, fontSize: 13, color: C.textMuted }}>サブカテゴリがありません</p>
                  : (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                      {subCats.map((s: SubCategory) => {
                        const on = selectedSubIds.includes(s.id)
                        return (
                          <button key={s.id} type="button" onClick={() => toggleSub(s.id)} disabled={subDisabled}
                            style={{
                              padding: "6px 12px", borderRadius: 6,
                              border: `1.5px solid ${on ? C.ink : C.rule}`,
                              background: on ? C.inkWash : C.paperSub,
                              color: on ? C.ink : C.textSecond,
                              fontSize: 13, fontWeight: on ? 600 : 400,
                              cursor: subDisabled ? "default" : "pointer", fontFamily: F_BODY,
                              opacity: subDisabled ? 0.45 : 1,
                              display: "inline-flex", alignItems: "center", gap: 5,
                              transition: "all 0.14s",
                              WebkitTapHighlightColor: "transparent",
                            }}>
                            {on && (
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={C.ink} strokeWidth="3">
                                <polyline points="20 6 9 17 4 12"/>
                              </svg>
                            )}
                            {s.name}
                          </button>
                        )
                      })}
                    </div>
                  )
                }
              </div>
            )}

            {/* 詳細 */}
            <div style={{ padding: "18px 16px", borderBottom: `1px solid ${C.ruleSoft}` }}>
              <label style={LBL}>詳細メモ（任意）</label>
              <textarea
                className="field-inp"
                value={detail} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDetail(e.target.value)}
                onFocus={() => setFocused("d")} onBlur={() => setFocused(null)}
                placeholder="タスクの背景・詳細を記入（任意）"
                rows={4}
                style={{ ...inp("d"), lineHeight: 1.75 }}
              />
            </div>

            {/* 期日 */}
            <div style={{ padding: "18px 16px" }}>
              <label style={LBL}>期日（任意）</label>
              <input
                type="date" className="field-inp"
                value={due} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDue(e.target.value)}
                onFocus={() => setFocused("du")} onBlur={() => setFocused(null)}
                style={{ ...inp("du"), maxWidth: 200 }}
              />
            </div>
          </div>

          {/* 送信ボタン */}
          <button type="submit" disabled={loading} style={{
            width: "100%", height: 48, borderRadius: 12, border: "none",
            background: loading ? C.textGhost : C.ink,
            color: "#fff", fontSize: 14.5, fontWeight: 600, fontFamily: F_BODY,
            cursor: loading ? "not-allowed" : "pointer",
            boxShadow: loading ? "none" : "0 3px 14px rgba(0,98,132,0.26)",
            transition: "background 0.18s, box-shadow 0.18s",
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
                作成中...
              </>
            ) : (
              <>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8">
                  <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                タスクを作成する
              </>
            )}
          </button>
        </form>
      </main>
    </div>
  )
}

export default function NewTaskPage() { return <Guard><NewInner/></Guard> }
