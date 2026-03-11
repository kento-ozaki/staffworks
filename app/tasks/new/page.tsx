"use client"

import React from "react"
import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Guard } from "@/components/Guard"
import type { ApiNg } from "@/lib/api"
import { toUserMessage } from "@/lib/errors"
import { createTask, listMainCategories, listSubCategories, type MainCategory, type SubCategory } from "@/lib/tasks"
import { C, FB, FM, GLOBAL_CSS, ErrBar, FieldLabel, fieldStyle } from "../page"

function NewInner() {
  const router = useRouter()
  const [mainCats, setMainCats]             = useState<MainCategory[]>([])
  const [subCats,  setSubCats]              = useState<SubCategory[]>([])
  const [title,    setTitle]                = useState("")
  const [mainId,   setMainId]               = useState<number>(0)
  const [selectedSubIds, setSelectedSubIds] = useState<number[]>([])
  const [detail,   setDetail]               = useState("")
  const [due,      setDue]                  = useState("")
  const [loading,  setLoading]              = useState(false)
  const [error,    setError]                = useState<string|null>(null)
  const [focused,  setFocused]              = useState<string|null>(null)

  useEffect(() => {
    ;(async () => {
      const r = await listMainCategories()
      if (r.ok) setMainCats(r.main_categories.filter((c: MainCategory) => Number(c.is_active)===1))
    })()
  }, [])

  useEffect(() => {
    ;(async () => {
      if (!mainId) { setSubCats([]); setSelectedSubIds([]); return }
      const r = await listSubCategories(mainId)
      if (r.ok) {
        const active = r.sub_categories.filter((c: SubCategory) => Number(c.is_active)===1)
        setSubCats(active)
        const nm = mainCats.find((m: MainCategory) => m.id===mainId)?.name
        if (nm==="その他") { const o = active.find((s: SubCategory) => s.name==="その他"); setSelectedSubIds(o?[o.id]:[]) }
        else setSelectedSubIds([])
      }
    })()
  }, [mainId])

  const mainName    = useMemo(() => mainCats.find((m: MainCategory) => m.id===mainId)?.name ?? "", [mainCats, mainId])
  const subDisabled = mainName==="その他"
  const step        = (title.trim()?1:0) + (mainId>0?1:0)

  function toggleSub(id: number) {
    if (subDisabled) return
    setSelectedSubIds((p: number[]) => p.includes(id) ? p.filter(x => x!==id) : [...p, id])
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setError(null)
    if (!title.trim()) return setError("タイトルを入力してください")
    if (!mainId)       return setError("メインカテゴリを選択してください")
    setLoading(true)
    const r = await createTask({ title:title.trim(), main_category_id:mainId, sub_category_ids:selectedSubIds, detail:detail.trim()||undefined, due_date:due||undefined })
    setLoading(false)
    if (!r.ok) { setError(toUserMessage(r as ApiNg,"作成に失敗しました")); return }
    router.replace(`/task/?id=${r.task_id}`)
  }

  const F: React.CSSProperties = { margin:"0 0 7px", fontSize:10.5, fontWeight:600, color:C.muted, letterSpacing:"0.10em", textTransform:"uppercase" as const, fontFamily:FB }

  return (
    <div style={{ minHeight:"100vh", background:C.bg, fontFamily:FB }}>
      <style dangerouslySetInnerHTML={{ __html: GLOBAL_CSS }}/>

      {/* ── ヘッダー ── */}
      <header style={{
        background:"rgba(255,255,255,0.97)",
        backdropFilter:"blur(20px)",
        WebkitBackdropFilter:"blur(20px)",
        borderBottom:`1px solid ${C.stroke}`,
        padding:"12px 14px 14px",
      }}>
        <div style={{ display:"flex", alignItems:"center", gap:11, marginBottom:16 }}>
          <Link href="/tasks/" style={{
            width:36, height:36, borderRadius:10, flexShrink:0,
            border:`1.5px solid ${C.stroke}`, background:C.surface,
            display:"flex", alignItems:"center", justifyContent:"center",
            color:C.muted, textDecoration:"none",
            WebkitTapHighlightColor:"transparent",
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
            </svg>
          </Link>
          <div>
            <p style={{ margin:"0 0 2px", fontSize:10, fontWeight:700, color:C.brand, letterSpacing:"0.14em", textTransform:"uppercase", fontFamily:FB }}>New Task</p>
            <h1 style={{ margin:0, fontFamily:FB, fontWeight:800, fontSize:20, color:C.text, letterSpacing:"-0.03em" }}>新規タスク作成</h1>
          </div>
        </div>

        {/* ステッパー */}
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          {[
            { label:"タイトル", done: !!title.trim() },
            { label:"カテゴリ", done: mainId>0 },
          ].map((s, i) => (
            <React.Fragment key={i}>
              {i > 0 && <div style={{ flex:1, height:1.5, background: s.done ? C.brand : C.stroke, borderRadius:1, transition:"background 0.3s" }}/>}
              <div style={{ display:"flex", alignItems:"center", gap:5, flexShrink:0 }}>
                <div style={{
                  width:20, height:20, borderRadius:"50%",
                  background: s.done ? C.brand : C.surface,
                  border:`1.5px solid ${s.done ? C.brand : C.stroke}`,
                  display:"flex", alignItems:"center", justifyContent:"center",
                  transition:"all 0.22s",
                }}>
                  {s.done
                    ? <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                    : <span style={{ width:6, height:6, borderRadius:"50%", background:C.stroke, display:"block" }}/>
                  }
                </div>
                <span style={{ fontSize:11.5, fontFamily:FB, fontWeight: s.done?600:400, color: s.done?C.brand:C.muted }}>
                  {s.label}
                </span>
              </div>
            </React.Fragment>
          ))}
          <span style={{ marginLeft:"auto", fontSize:11, fontFamily:FM, color: step===2?C.brand:C.ghost, fontWeight:500 }}>
            {step}/2
          </span>
        </div>
      </header>

      {/* ── フォーム ── */}
      <main style={{ paddingTop:"16px", paddingLeft:"14px", paddingRight:"14px", paddingBottom:"calc(var(--nav-h) + 16px + var(--safe-b))" }}>
        {error && <ErrBar msg={error}/>}
        <form onSubmit={onSubmit}>
          <div style={{
            background:C.surface, borderRadius:16,
            border:`1px solid ${C.stroke}`,
            boxShadow:`0 2px 16px rgba(0,98,132,0.07)`,
            overflow:"hidden", marginBottom:14,
          }}>

            {/* タイトル */}
            <div style={{ padding:"18px 16px", borderBottom:`1px solid ${C.strokeSoft}` }}>
              <p style={F}>タイトル <span style={{ color:C.danger }}>*</span></p>
              <input className="fi" value={title}
                onChange={(e:React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)}
                onFocus={() => setFocused("t")} onBlur={() => setFocused(null)}
                placeholder="タスクのタイトルを入力"
                style={fieldStyle(focused==="t")}
              />
            </div>

            {/* メインカテゴリ */}
            <div style={{ padding:"18px 16px", borderBottom:`1px solid ${C.strokeSoft}` }}>
              <p style={F}>メインカテゴリ <span style={{ color:C.danger }}>*</span></p>
              <div style={{ position:"relative" }}>
                <select className="fi" value={mainId}
                  onChange={(e:React.ChangeEvent<HTMLSelectElement>) => setMainId(Number(e.target.value))}
                  onFocus={() => setFocused("m")} onBlur={() => setFocused(null)}
                  style={{ ...fieldStyle(focused==="m"), cursor:"pointer", color:mainId?C.text:C.ghost, paddingRight:36 }}>
                  <option value={0}>カテゴリを選択</option>
                  {mainCats.map((c:MainCategory) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <svg style={{ position:"absolute", right:12, top:"50%", transform:"translateY(-50%)", pointerEvents:"none" }}
                  width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="2.4">
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </div>
            </div>

            {/* サブカテゴリ */}
            {mainId > 0 && (
              <div style={{ padding:"18px 16px", borderBottom:`1px solid ${C.strokeSoft}` }}>
                <p style={F}>サブカテゴリ</p>
                {subDisabled && <p style={{ margin:"0 0 8px", fontSize:12, color:C.muted }}>「その他」のため自動選択されます</p>}
                {subCats.length===0
                  ? <p style={{ margin:0, fontSize:13, color:C.muted }}>サブカテゴリがありません</p>
                  : (
                    <div style={{ display:"flex", flexWrap:"wrap", gap:7 }}>
                      {subCats.map((s:SubCategory) => {
                        const on = selectedSubIds.includes(s.id)
                        return (
                          <button key={s.id} type="button" onClick={() => toggleSub(s.id)} disabled={subDisabled}
                            style={{
                              padding:"6px 13px", borderRadius:8,
                              border:`1.5px solid ${on?C.brand:C.stroke}`,
                              background: on?C.brandFaint:C.surfaceRaised,
                              color: on?C.brand:C.textSub,
                              fontSize:13, fontWeight:on?700:400,
                              cursor:subDisabled?"default":"pointer", fontFamily:FB,
                              opacity:subDisabled?0.45:1,
                              display:"inline-flex", alignItems:"center", gap:5,
                              transition:"all 0.14s",
                              WebkitTapHighlightColor:"transparent",
                            }}>
                            {on && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={C.brand} strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>}
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
            <div style={{ padding:"18px 16px", borderBottom:`1px solid ${C.strokeSoft}` }}>
              <p style={F}>詳細メモ（任意）</p>
              <textarea className="fi" value={detail}
                onChange={(e:React.ChangeEvent<HTMLTextAreaElement>) => setDetail(e.target.value)}
                onFocus={() => setFocused("d")} onBlur={() => setFocused(null)}
                placeholder="タスクの背景・詳細（任意）" rows={4}
                style={{ ...fieldStyle(focused==="d"), lineHeight:1.75 }}
              />
            </div>

            {/* 期日 */}
            <div style={{ padding:"18px 16px" }}>
              <p style={F}>期日（任意）</p>
              <input type="date" className="fi" value={due}
                onChange={(e:React.ChangeEvent<HTMLInputElement>) => setDue(e.target.value)}
                onFocus={() => setFocused("du")} onBlur={() => setFocused(null)}
                style={{ ...fieldStyle(focused==="du"), maxWidth:200 }}
              />
            </div>
          </div>

          {/* 送信 */}
          <button type="submit" disabled={loading} style={{
            width:"100%", height:50, borderRadius:14, border:"none",
            background: loading ? C.ghost : C.brand,
            color:"#fff", fontSize:15, fontWeight:700, fontFamily:FB,
            cursor:loading?"not-allowed":"pointer",
            boxShadow: loading?"none":`0 4px 18px rgba(0,98,132,0.30), inset 0 1px 0 rgba(255,255,255,0.08)`,
            transition:"background 0.18s, box-shadow 0.18s",
            display:"flex", alignItems:"center", justifyContent:"center", gap:8,
            letterSpacing:"0.01em",
            WebkitTapHighlightColor:"transparent",
          }}>
            {loading
              ? <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" style={{ animation:"_spin 0.8s linear infinite" }}><path d="M21 12a9 9 0 11-6.22-8.56"/></svg>作成中...</>
              : <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>タスクを作成する</>
            }
          </button>
        </form>
      </main>
    </div>
  )
}

export default function NewTaskPage() { return <Guard><NewInner/></Guard> }
