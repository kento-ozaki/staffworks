"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Guard } from "@/components/Guard"
import type { ApiNg } from "@/lib/api"
import { toUserMessage } from "@/lib/errors"
import { createTask, listMainCategories, listSubCategories, type MainCategory, type SubCategory } from "@/lib/tasks"

import { C, FD, FB, FM, GLOBAL_CSS, ErrorBar, FormSection, inputStyle } from "../page"

function NewInner() {
  const router = useRouter()
  const [mainCats, setMainCats] = useState<MainCategory[]>([])
  const [subCats, setSubCats]   = useState<SubCategory[]>([])
  const [title, setTitle]       = useState("")
  const [mainId, setMainId]     = useState<number>(0)
  const [selectedSubIds, setSelectedSubIds] = useState<number[]>([])
  const [detail, setDetail]     = useState("")
  const [due, setDue]           = useState("")
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState<string|null>(null)
  const [focused, setFocused]   = useState<string|null>(null)

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

  const mainName   = useMemo(() => mainCats.find(m => m.id === mainId)?.name ?? "", [mainCats, mainId])
  const subDisabled = mainName === "その他"

  function toggleSub(id: number) {
    if (subDisabled) return
    setSelectedSubIds(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id])
  }

  async function onSubmit(e: React.FormEvent) {
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

  /* 進捗ステップ */
  const step = (title.trim() ? 1 : 0) + (mainId > 0 ? 1 : 0)
  const pct  = (step / 2) * 100

  return (
    <div style={{ minHeight:"100vh", background:C.bg, fontFamily:FB, WebkitFontSmoothing:"antialiased" }}>
      <style>{GLOBAL_CSS}</style>

      {/* ━━ ヘッダー ━━ */}
      <div style={{
        background: C.header,
        backgroundImage:`
          radial-gradient(ellipse at 0% 0%, rgba(0,130,173,0.18) 0%, transparent 55%),
          radial-gradient(ellipse at 100% 100%, rgba(0,98,132,0.12) 0%, transparent 50%)
        `,
        padding:"14px 16px 20px",
      }}>
        <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:20 }}>
          <Link href="/tasks/" style={{
            width:36, height:36, borderRadius:12, flexShrink:0,
            border:`1px solid ${C.whiteA30}`, background:C.whiteA08,
            display:"flex", alignItems:"center", justifyContent:"center",
            color:C.whiteA80, textDecoration:"none",
            backdropFilter:"blur(6px)", WebkitTapHighlightColor:"transparent",
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <line x1="19" y1="12" x2="5" y2="12"/>
              <polyline points="12 19 5 12 12 5"/>
            </svg>
          </Link>
          <div>
            <p style={{ margin:"0 0 2px", fontSize:9.5, fontWeight:700, color:"rgba(255,255,255,0.4)", letterSpacing:"0.16em", textTransform:"uppercase", fontFamily:FD }}>
              New Task
            </p>
            <h1 style={{ margin:0, fontSize:20, fontWeight:800, color:C.white, letterSpacing:"-0.02em", fontFamily:FD }}>
              新規タスク作成
            </h1>
          </div>
        </div>

        {/* 進捗バー */}
        <div>
          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6, fontSize:11, fontFamily:FB }}>
            <span style={{ color:"rgba(255,255,255,0.4)" }}>必須項目の入力</span>
            <span style={{
              color: step === 2 ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.4)",
              fontWeight:700, fontFamily:FD,
            }}>{step} / 2</span>
          </div>
          <div style={{ height:3, background:"rgba(255,255,255,0.1)", borderRadius:99, overflow:"hidden" }}>
            <div style={{
              height:"100%", width:`${pct}%`,
              background: step === 2
                ? "rgba(255,255,255,0.85)"
                : "rgba(255,255,255,0.45)",
              borderRadius:99, transition:"width 0.4s cubic-bezier(.22,1,.36,1)",
            }}/>
          </div>
        </div>
      </div>

      {/* ━━ フォームボディ ━━ */}
      <div style={{ padding:"16px 14px 48px" }}>
        {error && <ErrorBar msg={error}/>}

        <form onSubmit={onSubmit}>
          <div style={{
            background:C.surface, borderRadius:20,
            border:`1px solid ${C.line}`,
            boxShadow:`0 2px 20px rgba(0,98,132,0.07)`,
            overflow:"hidden", marginBottom:14,
          }}>

            {/* タイトル */}
            <FormSection label="タイトル ＊">
              <input
                value={title} onChange={e=>setTitle(e.target.value)}
                onFocus={()=>setFocused("t")} onBlur={()=>setFocused(null)}
                placeholder="タスクのタイトルを入力"
                style={inputStyle(focused==="t")}
              />
            </FormSection>

            {/* メインカテゴリ */}
            <FormSection label="メインカテゴリ ＊">
              <div style={{ position:"relative" }}>
                <select
                  value={mainId} onChange={e=>setMainId(Number(e.target.value))}
                  onFocus={()=>setFocused("m")} onBlur={()=>setFocused(null)}
                  style={{
                    ...inputStyle(focused==="m"),
                    cursor:"pointer",
                    color: mainId ? C.text : C.muted,
                    paddingRight:36,
                  }}
                >
                  <option value={0}>カテゴリを選択</option>
                  {mainCats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <svg style={{ position:"absolute", right:13, top:"50%", transform:"translateY(-50%)", pointerEvents:"none" }}
                  width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="2.5">
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </div>
            </FormSection>

            {/* サブカテゴリ */}
            {mainId > 0 && (
              <FormSection label="サブカテゴリ">
                {subDisabled && (
                  <p style={{ margin:"0 0 10px", fontSize:12, color:C.muted, fontFamily:FB }}>
                    「その他」のため自動選択されます
                  </p>
                )}
                {subCats.length === 0
                  ? <p style={{ margin:0, fontSize:13, color:C.muted }}>サブカテゴリがありません</p>
                  : (
                    <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
                      {subCats.map(s => {
                        const on = selectedSubIds.includes(s.id)
                        return (
                          <button key={s.id} type="button" onClick={()=>toggleSub(s.id)}
                            disabled={subDisabled}
                            style={{
                              padding:"7px 14px", borderRadius:10,
                              border:`1.5px solid ${on ? C.brand : C.line}`,
                              background: on ? C.brandPale : C.surfaceSub,
                              color: on ? C.brand : C.sub,
                              fontSize:13, fontWeight: on ? 700 : 400,
                              cursor: subDisabled ? "default" : "pointer",
                              fontFamily:FB, opacity: subDisabled ? 0.5 : 1,
                              display:"inline-flex", alignItems:"center", gap:5,
                              transition:"all 0.14s",
                              WebkitTapHighlightColor:"transparent",
                            }}>
                            {on && (
                              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={C.brand} strokeWidth="3">
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
              </FormSection>
            )}

            {/* 詳細 */}
            <FormSection label="詳細メモ（任意）">
              <textarea
                value={detail} onChange={e=>setDetail(e.target.value)}
                onFocus={()=>setFocused("d")} onBlur={()=>setFocused(null)}
                placeholder="タスクの背景・詳細を記入（任意）"
                rows={4}
                style={{ ...inputStyle(focused==="d"), lineHeight:1.75 }}
              />
            </FormSection>

            {/* 期日 */}
            <FormSection label="期日（任意）" last>
              <input
                type="date" value={due} onChange={e=>setDue(e.target.value)}
                onFocus={()=>setFocused("du")} onBlur={()=>setFocused(null)}
                style={{ ...inputStyle(focused==="du"), maxWidth:200 }}
              />
            </FormSection>
          </div>

          {/* 送信 */}
          <button type="submit" disabled={loading} style={{
            width:"100%", height:50, borderRadius:14, border:"none",
            background: loading ? C.muted
              : `linear-gradient(135deg, ${C.brand}, ${C.brandDeep})`,
            color:C.white, fontSize:14.5, fontWeight:800, fontFamily:FD,
            cursor: loading ? "not-allowed" : "pointer",
            boxShadow: loading ? "none" : `0 4px 20px rgba(0,98,132,0.30), 0 2px 0 ${C.brandDeep}`,
            transition:"all 0.15s",
            display:"flex", alignItems:"center", justifyContent:"center", gap:8,
            letterSpacing:"0.02em",
            WebkitTapHighlightColor:"transparent",
          }}>
            {loading ? (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5"
                  style={{ animation:"spin 0.8s linear infinite" }}>
                  <path d="M21 12a9 9 0 11-6.22-8.56"/>
                </svg>
                作成中...
              </>
            ) : (
              <>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <line x1="12" y1="5" x2="12" y2="19"/>
                  <line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                タスクを作成する
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  )
}

export default function NewTaskPage() { return <Guard><NewInner/></Guard> }
