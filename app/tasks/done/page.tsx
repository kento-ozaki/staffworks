"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { Guard } from "@/components/Guard"
import { me, type User } from "@/lib/auth"
import type { ApiNg } from "@/lib/api"
import { toUserMessage } from "@/lib/errors"
import { doneList, deleteTask, listMainCategories, type MainCategory, type TaskCard as T } from "@/lib/tasks"

import { C, FD, FB, FM, GLOBAL_CSS, ErrorBar, inputStyle } from "../page"

function DoneInner() {
  const [meUser, setMeUser]   = useState<User|null>(null)
  const [tasks, setTasks]     = useState<T[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string|null>(null)
  const [q, setQ]             = useState("")
  const [mainCats, setMainCats] = useState<MainCategory[]>([])
  const [mainId, setMainId]   = useState<number>(0)
  const [creator, setCreator] = useState("")
  const [deletingId, setDeletingId] = useState<number|null>(null)
  const [filterOpen, setFilterOpen] = useState(false)

  const isAdmin = meUser?.role === "admin"

  async function load() {
    setError(null); setLoading(true)
    const r = await doneList(); setLoading(false)
    if (!r.ok) { setError(toUserMessage(r as ApiNg, "取得に失敗しました")); return }
    setTasks(r.done)
  }

  useEffect(() => {
    ;(async () => {
      const r = await me(); if (r.ok) setMeUser(r.user)
      const c = await listMainCategories()
      if (c.ok) setMainCats(c.main_categories.filter(x => Number(x.is_active) === 1))
    })()
    load()
  }, [])

  async function onDelete(id: number) {
    if (!confirm("この完了タスクを削除しますか？")) return
    setDeletingId(id)
    const r = await deleteTask(id); setDeletingId(null)
    if (!r.ok) { setError(toUserMessage(r as ApiNg, "削除に失敗しました")); return }
    load()
  }

  const filtered = useMemo(() => {
    const kw = q.trim().toLowerCase(); const ck = creator.trim().toLowerCase()
    return tasks.filter(t => {
      if (mainId && Number(t.main_category_id) !== mainId) return false
      if (ck && !t.created_by_name.toLowerCase().includes(ck)) return false
      if (kw && !`${t.title} ${t.main_category_name} ${t.created_by_name}`.toLowerCase().includes(kw)) return false
      return true
    })
  }, [tasks, q, mainId, creator])

  const hasFilter = !!q || !!creator || !!mainId

  return (
    <div style={{ minHeight:"100vh", background:C.bg, fontFamily:FB, WebkitFontSmoothing:"antialiased" }}>
      <style>{GLOBAL_CSS}</style>

      {/* ━━ ヘッダー ━━ */}
      <div style={{
        position:"sticky", top:0, zIndex:100,
        background:C.header,
        backgroundImage:`
          radial-gradient(ellipse at 0% 0%, rgba(0,130,173,0.18) 0%, transparent 55%),
          radial-gradient(ellipse at 100% 100%, rgba(0,98,132,0.12) 0%, transparent 50%)
        `,
      }}>
        {/* タイトル行 */}
        <div style={{ display:"flex", alignItems:"center", gap:12, padding:"14px 12px 10px" }}>
          <Link href="/tasks/" style={{
            width:36, height:36, borderRadius:12, flexShrink:0,
            border:`1px solid ${C.whiteA30}`, background:C.whiteA08,
            display:"flex", alignItems:"center", justifyContent:"center",
            color:C.whiteA80, textDecoration:"none", backdropFilter:"blur(6px)",
            WebkitTapHighlightColor:"transparent",
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <line x1="19" y1="12" x2="5" y2="12"/>
              <polyline points="12 19 5 12 12 5"/>
            </svg>
          </Link>

          <div style={{ flex:1 }}>
            <p style={{ margin:"0 0 1px", fontSize:9.5, fontWeight:700, color:"rgba(255,255,255,0.38)", letterSpacing:"0.16em", textTransform:"uppercase", fontFamily:FD }}>
              Done
            </p>
            <div style={{ display:"flex", alignItems:"baseline", gap:8 }}>
              <h1 style={{ margin:0, fontSize:20, fontWeight:800, color:C.white, letterSpacing:"-0.02em", fontFamily:FD }}>
                完了タスク
              </h1>
              <span style={{ fontSize:13, fontWeight:700, color:"rgba(255,255,255,0.45)", fontFamily:FD }}>
                {tasks.length}件
              </span>
            </div>
          </div>

          <div style={{ display:"flex", gap:8 }}>
            {/* 更新 */}
            <button onClick={load} disabled={loading} style={{
              width:36, height:36, borderRadius:10,
              border:`1px solid ${C.whiteA30}`, background:C.whiteA08,
              backdropFilter:"blur(6px)",
              display:"flex", alignItems:"center", justifyContent:"center",
              cursor: loading ? "default" : "pointer", opacity: loading ? 0.4 : 1,
              WebkitTapHighlightColor:"transparent",
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                stroke={C.whiteA80} strokeWidth="2.4"
                style={{ animation: loading ? "spin 0.7s linear infinite" : "none" }}>
                <polyline points="23 4 23 10 17 10"/>
                <path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/>
              </svg>
            </button>
            {/* フィルター */}
            <button onClick={()=>setFilterOpen(v=>!v)} style={{
              width:36, height:36, borderRadius:10, position:"relative",
              border:`1px solid ${filterOpen||hasFilter ? "rgba(255,255,255,0.55)" : C.whiteA30}`,
              background: filterOpen||hasFilter ? C.whiteA30 : C.whiteA08,
              backdropFilter:"blur(6px)",
              display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer",
              WebkitTapHighlightColor:"transparent",
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                stroke={filterOpen||hasFilter ? C.white : C.whiteA50} strokeWidth="2.2">
                <line x1="4" y1="6" x2="20" y2="6"/>
                <line x1="8" y1="12" x2="16" y2="12"/>
                <line x1="11" y1="18" x2="13" y2="18"/>
              </svg>
              {hasFilter && (
                <span style={{ position:"absolute", top:6, right:6, width:6, height:6, borderRadius:"50%", background:C.done, border:`1.5px solid ${C.header}` }}/>
              )}
            </button>
          </div>
        </div>

        {/* フィルタードロワー */}
        {filterOpen && (
          <div style={{
            background:C.headerMid, borderTop:`1px solid ${C.whiteA08}`,
            padding:"8px 12px 14px",
            animation:"fadeSlide 0.2s cubic-bezier(.22,1,.36,1) both",
          }}>
            <div style={{ position:"relative", marginBottom:8 }}>
              <svg style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)", pointerEvents:"none" }}
                width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="2.4">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input className="fi" value={q} onChange={e=>setQ(e.target.value)} placeholder="検索..."
                style={{
                  height:40, width:"100%", paddingLeft:36, paddingRight:14,
                  borderRadius:10, border:`1px solid ${C.whiteA30}`,
                  background:C.whiteA08, color:C.white, fontSize:13.5, fontFamily:FB,
                  backdropFilter:"blur(6px)", outline:"none",
                }}
              />
            </div>
            <div style={{ display:"flex", gap:8 }}>
              <input className="fi" value={creator} onChange={e=>setCreator(e.target.value)} placeholder="登録者"
                style={{
                  flex:1, height:40, padding:"0 13px",
                  borderRadius:10, border:`1px solid ${C.whiteA30}`,
                  background:C.whiteA08, color:C.white, fontSize:13.5, fontFamily:FB,
                  backdropFilter:"blur(6px)", outline:"none",
                }}
              />
              <div style={{ flex:1.3, position:"relative" }}>
                <select className="fi" value={mainId} onChange={e=>setMainId(Number(e.target.value))} style={{
                  width:"100%", height:40, padding:"0 30px 0 13px",
                  borderRadius:10, border:`1px solid ${C.whiteA30}`,
                  background:C.whiteA08, color: mainId ? C.white : "rgba(255,255,255,0.38)",
                  fontSize:13.5, fontFamily:FB,
                  backdropFilter:"blur(6px)", outline:"none", cursor:"pointer",
                }}>
                  <option value={0}>カテゴリ：全て</option>
                  {mainCats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <svg style={{ position:"absolute", right:10, top:"50%", transform:"translateY(-50%)", pointerEvents:"none" }}
                  width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2.5">
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ━━ コンテンツ ━━ */}
      <div style={{ padding:"16px 14px 48px" }}>
        {!isAdmin && (
          <div style={{
            background:C.surface, border:`1px solid ${C.line}`,
            borderRadius:12, padding:"10px 14px", marginBottom:14,
            display:"flex", alignItems:"center", gap:8,
            fontSize:12, color:C.muted, fontFamily:FB,
          }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            削除・再オープンは管理者のみ操作できます
          </div>
        )}

        {error && <ErrorBar msg={error}/>}

        {loading && tasks.length === 0 && (
          <div style={{ padding:"80px 0", textAlign:"center", color:C.muted, fontSize:13 }}>
            <div style={{
              width:34, height:34, borderRadius:"50%", margin:"0 auto 14px",
              border:`2.5px solid ${C.brandPale}`, borderTopColor:C.brand,
              animation:"spin 0.7s linear infinite",
            }}/>
            読み込み中...
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div style={{ padding:"80px 0", textAlign:"center" }}>
            <div style={{
              width:56, height:56, borderRadius:18,
              background:`linear-gradient(135deg, ${C.donePale}, ${C.bg})`,
              border:`1px solid ${C.doneLine}`,
              display:"flex", alignItems:"center", justifyContent:"center",
              margin:"0 auto 18px",
            }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={C.done} strokeWidth="1.8">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            <p style={{ fontSize:15, fontWeight:700, color:C.sub, fontFamily:FD, margin:0 }}>
              完了タスクがありません
            </p>
          </div>
        )}

        {filtered.length > 0 && (
          <div style={{ display:"flex", flexDirection:"column", gap:9 }}>
            {filtered.map((t, i) => (
              <div key={t.id} className="row-in" style={{ animationDelay:`${Math.min(i*35,280)}ms` }}>
                <div style={{
                  background:C.surface,
                  borderRadius:18,
                  border:`1px solid ${C.line}`,
                  padding:"15px 16px",
                  display:"flex", alignItems:"center", gap:12,
                  boxShadow:`0 1px 6px rgba(0,98,132,0.05)`,
                }}>
                  {/* 完了アイコン */}
                  <div style={{
                    width:36, height:36, borderRadius:12, flexShrink:0,
                    background:C.donePale, border:`1.5px solid ${C.doneLine}`,
                    display:"flex", alignItems:"center", justifyContent:"center",
                  }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={C.done} strokeWidth="2.8">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  </div>

                  {/* テキスト */}
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:5, marginBottom:4 }}>
                      <div style={{ width:5, height:5, borderRadius:"50%", background:C.brand, flexShrink:0 }}/>
                      <span style={{
                        fontSize:10, fontWeight:700, color:C.brand,
                        textTransform:"uppercase", letterSpacing:"0.08em", fontFamily:FD,
                      }}>{t.main_category_name}</span>
                    </div>
                    <p style={{
                      margin:0, fontSize:14, fontWeight:600, color:C.text,
                      whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis", fontFamily:FB,
                    }}>{t.title}</p>
                    <div style={{ marginTop:5, display:"flex", gap:10, flexWrap:"wrap" }}>
                      <span style={{ fontSize:11, color:C.muted, fontFamily:FM }}>
                        {t.due_date ?? "期限なし"}
                      </span>
                      <span style={{ fontSize:11, color:C.muted, fontFamily:FB }}>
                        {t.created_by_name}
                      </span>
                    </div>
                  </div>

                  {/* アクション */}
                  <div style={{ display:"flex", gap:7, flexShrink:0 }}>
                    <Link href={`/task/?id=${t.id}`} style={{
                      height:32, display:"inline-flex", alignItems:"center",
                      padding:"0 12px", borderRadius:9,
                      border:`1px solid ${C.line}`, background:C.surfaceSub,
                      color:C.sub, fontSize:12, fontWeight:600,
                      textDecoration:"none", fontFamily:FB, whiteSpace:"nowrap",
                      WebkitTapHighlightColor:"transparent",
                    }}>
                      詳細
                    </Link>
                    {isAdmin && (
                      <button onClick={()=>onDelete(t.id)} disabled={deletingId===t.id}
                        style={{
                          height:32, padding:"0 12px", borderRadius:9,
                          border:`1px solid ${C.dangerLine}`, background:"transparent",
                          color:C.danger, fontSize:12, fontWeight:600,
                          cursor:"pointer", fontFamily:FB,
                          opacity: deletingId===t.id ? 0.5 : 1,
                          WebkitTapHighlightColor:"transparent",
                        }}>
                        削除
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default function DonePage() { return <Guard><DoneInner/></Guard> }
