"use client"

import React from "react"
import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { Guard } from "@/components/Guard"
import { me, type User } from "@/lib/auth"
import type { ApiNg } from "@/lib/api"
import { toUserMessage } from "@/lib/errors"
import { doneList, deleteTask, listMainCategories, type MainCategory, type TaskCard as T } from "@/lib/tasks"

import { C, F_DISPLAY, F_BODY, F_MONO, GLOBAL_CSS, ErrorBanner, FieldInp, BrandTag, shortDate } from "../page"

function DoneInner() {
  const [meUser, setMeUser]         = useState<User|null>(null)
  const [tasks, setTasks]           = useState<T[]>([])
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState<string|null>(null)
  const [q, setQ]                   = useState("")
  const [mainCats, setMainCats]     = useState<MainCategory[]>([])
  const [mainId, setMainId]         = useState<number>(0)
  const [creator, setCreator]       = useState("")
  const [deletingId, setDeletingId] = useState<number|null>(null)
  const [filterOpen, setFilterOpen] = useState(false)
  const [qFocus, setQFocus]         = useState(false)
  const [crFocus, setCrFocus]       = useState(false)

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
      if (c.ok) setMainCats(c.main_categories.filter((x: MainCategory) => Number(x.is_active) === 1))
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
    return tasks.filter((t: T) => {
      if (mainId && Number(t.main_category_id) !== mainId) return false
      if (ck && !t.created_by_name.toLowerCase().includes(ck)) return false
      if (kw && !`${t.title} ${t.main_category_name} ${t.created_by_name}`.toLowerCase().includes(kw)) return false
      return true
    })
  }, [tasks, q, mainId, creator])

  const hasFilter = !!q || !!creator || !!mainId

  return (
    <div style={{ minHeight: "100vh", background: C.canvas, fontFamily: F_BODY }}>
      <style dangerouslySetInnerHTML={{ __html: GLOBAL_CSS() }}/>

      {/* ── ヘッダー ── */}
      <header style={{
        position: "sticky", top: 0, zIndex: 200,
        background: "rgba(255,255,255,0.96)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        borderBottom: `1px solid ${C.rule}`,
      }}>
        {/* タイトル行 */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 12px 10px" }}>
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

          <div style={{ flex: 1 }}>
            {/* Fraunces で大きく */}
            <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
              <h1 style={{
                margin: 0, fontFamily: F_DISPLAY, fontSize: 22, fontWeight: 600,
                color: C.textPrimary, letterSpacing: "-0.02em",
              }}>完了タスク</h1>
              <span style={{ fontFamily: F_MONO, fontSize: 13, color: C.textGhost }}>{tasks.length}</span>
            </div>
          </div>

          {/* ツールバー */}
          <div style={{ display: "flex", gap: 7 }}>
            <button onClick={load} disabled={loading} style={{
              width: 34, height: 34, borderRadius: 8,
              border: `1px solid ${C.rule}`, background: C.paper,
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: loading ? "default" : "pointer", opacity: loading ? 0.35 : 1,
              WebkitTapHighlightColor: "transparent",
            }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={C.ink} strokeWidth="2.2"
                style={{ animation: loading ? "_spin 0.7s linear infinite" : "none" }}>
                <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/>
              </svg>
            </button>
            <button onClick={() => setFilterOpen((v: boolean) => !v)} style={{
              width: 34, height: 34, borderRadius: 8, position: "relative",
              border: `1px solid ${filterOpen || hasFilter ? C.ink : C.rule}`,
              background: filterOpen || hasFilter ? C.inkWash : C.paper,
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", transition: "all 0.14s",
              WebkitTapHighlightColor: "transparent",
            }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                stroke={filterOpen || hasFilter ? C.ink : C.textMuted} strokeWidth="2.2">
                <line x1="4" y1="6" x2="20" y2="6"/>
                <line x1="8" y1="12" x2="16" y2="12"/>
                <line x1="11" y1="18" x2="13" y2="18"/>
              </svg>
              {hasFilter && !filterOpen && (
                <span style={{ position: "absolute", top: 6, right: 6, width: 5, height: 5, borderRadius: "50%", background: C.ink }}/>
              )}
            </button>
          </div>
        </div>

        {/* フィルターパネル */}
        {filterOpen && (
          <div className="t-slide" style={{
            borderTop: `1px solid ${C.ruleSoft}`,
            background: C.inkFaint, padding: "10px 12px 14px",
          }}>
            <div style={{ position: "relative", marginBottom: 8 }}>
              <svg style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}
                width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={C.textGhost} strokeWidth="2.4">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <FieldInp value={q} onChange={setQ} placeholder="タイトル・登録者で検索"
                focused={qFocus} onFocus={() => setQFocus(true)} onBlur={() => setQFocus(false)}
                style={{ paddingLeft: 32 }}
              />
            </div>
            <div style={{ display: "flex", gap: 7 }}>
              <FieldInp value={creator} onChange={setCreator} placeholder="登録者"
                focused={crFocus} onFocus={() => setCrFocus(true)} onBlur={() => setCrFocus(false)}
                style={{ flex: 1 }}
              />
              <div style={{ flex: 1.4, position: "relative" }}>
                <select className="field-inp" value={mainId} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setMainId(Number(e.target.value))} style={{
                  width: "100%", padding: "10px 30px 10px 13px",
                  borderRadius: 8, border: `1.5px solid ${C.rule}`,
                  background: C.paperSub, color: mainId ? C.textPrimary : C.textGhost,
                  fontSize: 14, fontFamily: F_BODY, outline: "none", cursor: "pointer",
                }}>
                  <option value={0}>カテゴリ：全て</option>
                  {mainCats.map((c: MainCategory) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <svg style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}
                  width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={C.textMuted} strokeWidth="2.4">
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* ── コンテンツ ── */}
      <main style={{ padding: "0 0 64px" }}>
        {!isAdmin && (
          <div style={{
            margin: "12px 12px 0",
            background: C.paper, border: `1px solid ${C.ruleSoft}`,
            borderRadius: 8, padding: "8px 12px",
            display: "flex", alignItems: "center", gap: 6,
            fontSize: 11.5, color: C.textMuted, fontFamily: F_BODY,
          }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={C.textGhost} strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            削除・再オープンは管理者のみ
          </div>
        )}

        {error && <div style={{ padding: "12px 12px 0" }}><ErrorBanner msg={error}/></div>}

        {loading && tasks.length === 0 && (
          <div style={{ padding: "80px 0", textAlign: "center", color: C.textMuted, fontSize: 13 }}>
            <div style={{
              width: 28, height: 28, borderRadius: "50%", margin: "0 auto 14px",
              border: `2px solid ${C.inkWash}`, borderTopColor: C.ink,
              animation: "_spin 0.7s linear infinite",
            }}/>
            読み込み中...
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div style={{ padding: "80px 24px", textAlign: "center" }}>
            <p style={{
              fontFamily: F_DISPLAY, fontStyle: "italic",
              fontSize: 22, fontWeight: 300,
              color: C.textGhost, margin: 0, letterSpacing: "-0.02em",
            }}>
              完了タスクがありません
            </p>
          </div>
        )}

        {filtered.length > 0 && (
          <div style={{ marginTop: 12 }}>
            {/* 上端ブランドライン */}
            <div style={{ height: 2, background: C.emerald, animation: "_linein 0.5s cubic-bezier(.22,1,.36,1) both" }}/>
            <div style={{ background: C.paper, borderBottom: `1px solid ${C.rule}` }}>
              {filtered.map((t: T, i: number) => (
                <div
                  key={t.id}
                  className="t-rise"
                  style={{
                    animationDelay: `${Math.min(i * 32, 260)}ms`,
                    borderBottom: `1px solid ${C.ruleSoft}`,
                    padding: "13px 14px",
                    display: "flex", alignItems: "center", gap: 11,
                  }}
                >
                  {/* 完了チェック */}
                  <div style={{
                    width: 26, height: 26, borderRadius: 8, flexShrink: 0,
                    background: C.emeraldWash,
                    border: `1px solid ${C.emeraldRule}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={C.emerald} strokeWidth="2.8">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  </div>

                  {/* テキスト */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ marginBottom: 4 }}>
                      <BrandTag label={t.main_category_name}/>
                    </div>
                    <p style={{
                      margin: 0, fontSize: 13.5, fontWeight: 500,
                      color: C.textPrimary, fontFamily: F_BODY,
                      whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                    }}>{t.title}</p>
                    <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                      <span style={{ fontSize: 11, color: C.textGhost, fontFamily: F_MONO }}>{t.due_date ?? "期限なし"}</span>
                      <span style={{ fontSize: 11, color: C.textGhost, fontFamily: F_BODY }}>{t.created_by_name}</span>
                    </div>
                  </div>

                  {/* アクション */}
                  <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                    <Link href={`/task/?id=${t.id}`} style={{
                      height: 30, display: "inline-flex", alignItems: "center",
                      padding: "0 11px", borderRadius: 7,
                      border: `1px solid ${C.rule}`, background: C.paperSub,
                      color: C.textSecond, fontSize: 11.5, fontWeight: 500,
                      textDecoration: "none", fontFamily: F_BODY,
                      WebkitTapHighlightColor: "transparent",
                    }}>詳細</Link>
                    {isAdmin && (
                      <button onClick={() => onDelete(t.id)} disabled={deletingId === t.id}
                        style={{
                          height: 30, padding: "0 11px", borderRadius: 7,
                          border: `1px solid ${C.roseRule}`, background: C.roseWash,
                          color: C.rose, fontSize: 11.5, fontWeight: 500,
                          cursor: "pointer", fontFamily: F_BODY,
                          opacity: deletingId === t.id ? 0.45 : 1,
                          WebkitTapHighlightColor: "transparent",
                        }}>削除</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export default function DonePage() { return <Guard><DoneInner/></Guard> }
