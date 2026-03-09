"use client"

import Link from "next/link"
import { useEffect, useMemo, useState, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { changePassword, me, logout } from "@/lib/auth"

const AGREEMENT_KEY = "staffworks_terms_agreed_v1"

function LogoHeader() {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? ""
  const logoSrc = useMemo(() => `${basePath}/logo.svg`, [basePath])

  return (
    <div style={{
      height: 60,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
    }}>
      <img
        src={logoSrc}
        alt="STAFFWORKS"
        width={220}
        height={44}
        style={{ height: 44, width: "auto", display: "block" }}
      />
    </div>
  )
}

export default function Page() {

  const router = useRouter()

  const [newPw, setNewPw] = useState("")
  const [newPw2, setNewPw2] = useState("")
  const [agree, setAgree] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    try {
      const v = window.localStorage.getItem(AGREEMENT_KEY)
      if (v === "1") setAgree(true)
    } catch {}
  }, [])

  useEffect(() => {
    ;(async () => {
      try {
        const r = await me()
        if (!r.ok) return router.replace("/login/")
        if (Number(r.user.must_change_password) === 0) return router.replace("/home/")
      } catch {
        router.replace("/login/")
      }
    })()
  }, [router])

  function toggleAgree(next?: boolean) {
    const v = typeof next === "boolean" ? next : !agree
    setAgree(v)
    try {
      window.localStorage.setItem(AGREEMENT_KEY, v ? "1" : "0")
    } catch {}
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    if (!agree) return setError("利用規約に同意してください")
    if (!newPw) return setError("新しいパスワードを入力してください")
    if (newPw.length < 8) return setError("新しいパスワードは8文字以上にしてください")
    if (newPw !== newPw2) return setError("新しいパスワード（確認）が一致しません")

    setLoading(true)
    try {
      const res = await changePassword("", newPw)
      if (!res.ok) {
        setError(res.error ?? "変更に失敗しました")
        return
      }
      router.replace("/home/")
    } catch {
      setError("変更に失敗しました")
    } finally {
      setLoading(false)
    }
  }

  async function onLogout() {
    try {
      await logout()
    } finally {
      router.replace("/login/")
    }
  }

  const canSubmit = agree && !loading

  return (
    <div style={{
      position: "fixed",
      inset: 0,
      background: "#006284",
      overflow: "hidden",
      display: "flex",
      justifyContent: "center",
      padding: "100px 32px 100px",
      boxSizing: "border-box",
    }}>
      <div style={{
        width: "100%",
        minWidth: 320,
        maxWidth: 768,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 16,
      }}>
        <LogoHeader />

        <form onSubmit={onSubmit} style={{
          width: "100%",
          background: "#fff",
          borderRadius: 30,
          boxShadow: "0 0 30px rgba(0,0,0,0.30)",
          padding: "32px 16px",
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}>

          <div style={{ alignSelf: "stretch", color: "#1C1C1C", fontSize: 14, fontFamily: '"Noto Sans JP", sans-serif' }}>
            新しいパスワード
          </div>
          <input
            value={newPw}
            onChange={(e) => setNewPw(e.target.value)}
            type="password"
            autoComplete="new-password"
            inputMode="text"
            style={{
              height: 40,
              borderRadius: 10,
              border: "0.5px solid #006284",
              background: "#F1F1F1",
              padding: "0 12px",
              fontSize: 16,
              outline: "none",
              fontFamily: '"Noto Sans JP", sans-serif',
              boxSizing: "border-box",
              width: "100%",
            }}
          />

          <div style={{ alignSelf: "stretch", color: "#1C1C1C", fontSize: 14, fontFamily: '"Noto Sans JP", sans-serif' }}>
            新しいパスワード（確認）
          </div>
          <input
            value={newPw2}
            onChange={(e) => setNewPw2(e.target.value)}
            type="password"
            autoComplete="new-password"
            inputMode="text"
            style={{
              height: 40,
              borderRadius: 10,
              border: "0.5px solid #006284",
              background: "#F1F1F1",
              padding: "0 12px",
              fontSize: 16,
              outline: "none",
              fontFamily: '"Noto Sans JP", sans-serif',
              boxSizing: "border-box",
              width: "100%",
            }}
          />

          <div style={{ marginTop: 2, textAlign: "center" }}>
            <Link
              href="/terms/"
              style={{
                color: "#006284",
                fontSize: 12,
                fontFamily: '"Noto Sans JP", sans-serif',
                fontWeight: 700,
                textDecoration: "none",
              }}
            >
              利用規約
            </Link>
          </div>

          <label
            style={{
              alignSelf: "stretch",
              padding: 8,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 12,
              cursor: "pointer",
              userSelect: "none",
            }}
          >
            <input type="checkbox" checked={agree} onChange={(e) => toggleAgree(e.target.checked)} style={{ display: "none" }} />
            <span
              aria-hidden
              style={{
                width: 17,
                height: 17,
                borderRadius: 4,
                background: "#F1F1F1",
                border: "0.5px solid #006284",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {agree ? <span style={{ width: 9, height: 9, borderRadius: 2, background: "#006284", display: "block" }} /> : null}
            </span>
            <span style={{ color: "#1C1C1C", fontSize: 12, fontFamily: '"Noto Sans JP", sans-serif', fontWeight: 500 }}>
              利用規約に同意する。
            </span>
          </label>

          {error ? <div style={{ color: "#B00020", fontSize: 12, fontFamily: '"Noto Sans JP", sans-serif', textAlign: "center" }}>{error}</div> : null}

          <button
            type="submit"
            disabled={!canSubmit}
            style={{
              marginTop: 4,
              width: "100%",
              height: 40,
              borderRadius: 10,
              border: "0.5px solid #006284",
              background: canSubmit ? "#006284" : "rgba(0,98,132,0.45)",
              color: "#fff",
              fontSize: 14,
              fontFamily: '"Noto Sans JP", sans-serif',
              fontWeight: 700,
              cursor: canSubmit ? "pointer" : "not-allowed",
            }}
          >
            {loading ? "変更中..." : "パスワード変更"}
          </button>

          <button
            type="button"
            onClick={onLogout}
            disabled={loading}
            style={{
              marginTop: 8,
              width: "100%",
              height: 40,
              borderRadius: 10,
              border: "0.5px solid #006284",
              background: "#fff",
              color: "#006284",
              fontSize: 14,
              fontFamily: '"Noto Sans JP", sans-serif',
              fontWeight: 700,
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.7 : 1,
            }}
          >
            ログアウト
          </button>

        </form>

        <div style={{
          width: "min(320px, 100%)",
          textAlign: "center",
          color: "#fff",
          fontSize: 11,
          fontFamily: '"Noto Sans JP", sans-serif',
          fontWeight: 500,
          textShadow: "0px 3px 3px rgba(0,0,0,0.25)",
        }}>
          © 2026 Spark Studio All Rights Reserved.
        </div>
      </div>
    </div>
  )
}
