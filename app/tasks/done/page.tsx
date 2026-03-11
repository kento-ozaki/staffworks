"use client"

import React from "react"
import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { Guard } from "@/components/Guard"
import { me, type User } from "@/lib/auth"
import type { ApiNg } from "@/lib/api"
import { toUserMessage } from "@/lib/errors"
import { doneList, deleteTask, listMainCategories, type MainCategory, type TaskCard as T } from "@/lib/tasks"
import { C, FB, FM, GLOBAL_CSS, ErrBar, Chip, fieldStyle } from "../page"

function DoneInner() {
  const [meUser,    setMeUser]    = useState<User|null>(null)
  const [tasks,     setTasks]     = useState<T[]>([])
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState<string|null>(null)
  const [q,         setQ]         = useState("")
  const [mainCats,  setMainCats]  = useState<MainCategory[]>([])
  const [mainId,    setMainId]    = useState<number>(0)
  const [creator,   setCreator]   = useState("")
  const [deletingId,setDeletingId]= useState<number|null>(null)
  const [filterOpen,setFilterOpen]= useState(false)
  const [qFocus,    setQFocus]    = useState(false)
  const [crFocus,   setCrFocus]   = useState(false)

  const isAdmin = meUser?.role==="admin"

  async function load() {
    setError(null); setLoading(true)
    const r = await doneList(); setLoading(false)
    if (!r.ok) { setError(toUserMessage(r as ApiNg,"取得に失敗しました")); return }
    setTasks(r.done)
  }
  useEffect(() => {
    ;(async () => {
      const r = await me(); if (r.ok) setMeUser(r.user)
      const c = await listMainCategories()
      if (c.ok) setMainCats(c.main_categories.filter((x: MainCategory) => Number(x.is_active)===1))
    })()
    load()
  }, [])

  async function onDelete(id: number) {
    if (!confirm("この完了タスクを削除しますか？")) return
    setDeletingId(id)
    const r = await deleteTask(id); setDeletingId(null)
    if (!r.ok) { setError(toUserMessage(r as ApiNg,"削除に失敗しました")); return }
    load()
  }

  const filtered = useMemo(() => {
    const kw=q.trim().toLowerCase(); const ck=creator.trim().toLowerCase()
    return tasks.filter((t: T): boolean => {
      if (mainId && Number(t.main_category_id)!==mainId) return false
      if (ck && !t.created_by_name.toLowerCase().includes(ck)) return false
      if (kw && !`${t.title} ${t.main_category_name} ${t.created_by_name}`.toLowerCase().includes(kw)) return false
      return true
    })
  }, [tasks,q,mainId,creator])

  const hasFilter = !!q||!!creator||!!mainId

  return (
    <div style={{ minHeight:"100vh", background:C.bg, fontFamily:FB }}>
      <style dangerouslySetInnerHTML={{ __html: GLOBAL_CSS }}/>

      {/* ── ヘッダー ── */}
      <header style={{
        position:"sticky", top:0, zIndex:200,
        background:"rgba(255,255,255,0.97)",
        backdropFilter:"blur(20px)",
        WebkitBackdropFilter:"blur(20px)",
        borderBottom:`1px solid ${C.stroke}`,
      }}>
        <div style={{ display:"flex", alignItems:"center", gap:10, padding:"12px 14px 11px" }}>
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

          <div style={{ flex:1 }}>
            <p style={{ margin:"0 0 1px", fontSize:10, fontWeight:700, color:C.done, letterSpacing:"0.14em", textTransform:"uppercase", fontFamily:FB }}>Done</p>
            <div style={{ display:"flex", alignItems:"baseline", gap:7 }}>
              <h1 style={{ margin:0, fontFamily:FB, fontWeight:800, fontSize:20, color:C.text, letterSpacing:"-0.03em" }}>完了タスク</h1>
              <span style={{ fontFamily:FM, fontSize:13, color:C.ghost, fontWeight:500 }}>{tasks.length}</span>
            </div>
          </div>

          <div style={{ display:"flex", gap:7 }}>
            <button onClick={load} disabled={loading} style={{
              width:36, height:36, borderRadius:10,
              border:`1.5px solid ${C.stroke}`, background:C.surface,
              display:"flex", alignItems:"center", justifyContent:"center",
              cursor:loading?"default":"pointer", opacity:loading?0.35:1,
              WebkitTapHighlightColor:"transparent",
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.brand} strokeWidth="2.3"
                style={{ animation:loading?"_spin 0.7s linear infinite":"none" }}>
                <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/>
              </svg>
            </button>
            <button onClick={() => setFilterOpen((v:boolean)=>!v)} style={{
              width:36, height:36, borderRadius:10, position:"relative",
              border:`1.5px solid ${filterOpen||hasFilter?C.brand:C.stroke}`,
              background:filterOpen||hasFilter?C.brandFaint:C.surface,
              display:"flex", alignItems:"center", justifyContent:"center",
              cursor:"pointer", transition:"all 0.15s",
              WebkitTapHighlightColor:"transparent",
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                stroke={filterOpen||hasFilter?C.brand:C.muted} strokeWidth="2.2">
                <line x1="4" y1="6" x2="20" y2="6"/>
                <line x1="8" y1="12" x2="16" y2="12"/>
                <line x1="11" y1="18" x2="13" y2="18"/>
              </svg>
              {hasFilter && !filterOpen && (
                <span style={{ position:"absolute", top:6, right:6, width:6, height:6, borderRadius:"50%", background:C.brand, boxShadow:`0 0 0 2px ${C.surface}` }}/>
              )}
            </button>
          </div>
        </div>

        {filterOpen && (
          <div className="slide-down" style={{
            borderTop:`1px solid ${C.strokeSoft}`,
            background:C.brandFaint, padding:"12px 14px 14px",
          }}>
            <div style={{ position:"relative", marginBottom:8 }}>
              <svg style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)", pointerEvents:"none" }}
                width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={C.ghost} strokeWidth="2.4">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input className="fi" value={q}
                onChange={(e:React.ChangeEvent<HTMLInputElement>) => setQ(e.target.value)}
                onFocus={() => setQFocus(true)} onBlur={() => setQFocus(false)}
                placeholder="タイトル・登録者で検索"
                style={{ ...fieldStyle(qFocus), paddingLeft:36 }}
              />
            </div>
            <div style={{ display:"flex", gap:8 }}>
              <input className="fi" value={creator}
                onChange={(e:React.ChangeEvent<HTMLInputElement>) => setCreator(e.target.value)}
                onFocus={() => setCrFocus(true)} onBlur={() => setCrFocus(false)}
                placeholder="登録者"
                style={{ ...fieldStyle(crFocus), flex:1 }}
              />
              <div style={{ flex:1.4, position:"relative" }}>
                <select className="fi" value={mainId}
                  onChange={(e:React.ChangeEvent<HTMLSelectElement>) => setMainId(Number(e.target.value))}
                  style={{ ...fieldStyle(false), cursor:"pointer", color:mainId?C.text:C.ghost, paddingRight:32 }}>
                  <option value={0}>カテゴリ：全て</option>
                  {mainCats.map((c:MainCategory) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <svg style={{ position:"absolute", right:11, top:"50%", transform:"translateY(-50%)", pointerEvents:"none" }}
                  width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="2.4">
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* ── コンテンツ ── */}
      <main style={{ paddingTop:"14px", paddingLeft:"14px", paddingRight:"14px", paddingBottom:"calc(var(--nav-h) + 16px + var(--safe-b))" }}>
        {!isAdmin && (
          <div style={{
            background:C.surface, border:`1px solid ${C.strokeSoft}`,
            borderRadius:10, padding:"9px 13px", marginBottom:12,
            display:"flex", alignItems:"center", gap:7,
            fontSize:12, color:C.muted, fontFamily:FB,
          }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={C.ghost} strokeWidth="2">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            削除は管理者のみ操作できます
          </div>
        )}

        {error && <ErrBar msg={error}/>}

        {loading && tasks.length===0 && (
          <div style={{ padding:"80px 0", textAlign:"center", color:C.muted, fontSize:13 }}>
            <div style={{
              width:30, height:30, borderRadius:"50%", margin:"0 auto 14px",
              border:`2.5px solid ${C.brandPale}`, borderTopColor:C.brand,
              animation:"_spin 0.7s linear infinite",
            }}/>
            読み込み中...
          </div>
        )}

        {!loading && filtered.length===0 && (
          <div style={{ padding:"80px 0", textAlign:"center" }}>
            <div style={{
              width:52, height:52, borderRadius:16,
              background:C.donePale, border:`1.5px solid ${C.doneStroke}`,
              display:"flex", alignItems:"center", justifyContent:"center",
              margin:"0 auto 16px",
            }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={C.done} strokeWidth="1.8" strokeOpacity="0.6">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            <p style={{ fontSize:14.5, fontWeight:700, color:C.textSub, fontFamily:FB, margin:0 }}>完了タスクがありません</p>
          </div>
        )}

        {filtered.length > 0 && (
          <div style={{ display:"flex", flexDirection:"column", gap:9 }}>
            {filtered.map((t:T, i:number) => (
              <div key={t.id} className="card-up" style={{ animationDelay:`${Math.min(i*35,260)}ms` }}>
                <div style={{
                  background:C.surface, borderRadius:14,
                  border:`1px solid ${C.stroke}`,
                  padding:"13px 14px",
                  display:"flex", alignItems:"center", gap:11,
                  boxShadow:`0 1px 6px rgba(0,98,132,0.05)`,
                  position:"relative", overflow:"hidden",
                }}>
                  {/* 左アクセントバー（緑） */}
                  <div style={{
                    position:"absolute", left:0, top:0, bottom:0, width:3,
                    background:`linear-gradient(180deg, ${C.done}, #28a065)`,
                  }}/>

                  {/* 完了アイコン */}
                  <div style={{
                    width:32, height:32, borderRadius:10, flexShrink:0,
                    background:C.donePale, border:`1.5px solid ${C.doneStroke}`,
                    display:"flex", alignItems:"center", justifyContent:"center",
                    marginLeft:8,
                  }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={C.done} strokeWidth="2.8">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  </div>

                  {/* テキスト */}
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ marginBottom:4 }}>
                      <Chip label={t.main_category_name}/>
                    </div>
                    <p style={{
                      margin:0, fontSize:13.5, fontWeight:600, color:C.text,
                      whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis", fontFamily:FB,
                    }}>{t.title}</p>
                    <div style={{ display:"flex", gap:10, marginTop:4 }}>
                      <span style={{ fontSize:11, color:C.ghost, fontFamily:FM }}>{t.due_date??"期限なし"}</span>
                      <span style={{ fontSize:11, color:C.ghost, fontFamily:FB }}>{t.created_by_name}</span>
                    </div>
                  </div>

                  {/* アクション */}
                  <div style={{ display:"flex", gap:6, flexShrink:0 }}>
                    <Link href={`/task/?id=${t.id}`} style={{
                      height:30, display:"inline-flex", alignItems:"center",
                      padding:"0 11px", borderRadius:8,
                      border:`1.5px solid ${C.stroke}`, background:C.surfaceRaised,
                      color:C.textSub, fontSize:12, fontWeight:600,
                      textDecoration:"none", fontFamily:FB,
                      WebkitTapHighlightColor:"transparent",
                    }}>詳細</Link>
                    {isAdmin && (
                      <button onClick={() => onDelete(t.id)} disabled={deletingId===t.id}
                        style={{
                          height:30, padding:"0 11px", borderRadius:8,
                          border:`1.5px solid ${C.dangerStroke}`, background:C.dangerPale,
                          color:C.danger, fontSize:12, fontWeight:600,
                          cursor:"pointer", fontFamily:FB,
                          opacity:deletingId===t.id?0.45:1,
                          WebkitTapHighlightColor:"transparent",
                        }}>削除</button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

export default function DonePage() { return <Guard><DoneInner/></Guard> }
