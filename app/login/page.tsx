"use client"

import Link from "next/link"
import { useMemo, useState, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { login } from "@/lib/auth"


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
  const [id, setId] = useState("")
  const [pw, setPw] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
// ログイン失敗時の表示文言はここで一元管理できます
function toLoginErrorMessage(raw?: string | null): string {
  const s = (raw ?? "").toLowerCase().trim()

  // APIが具体的なエラー文字列を返さない場合もあるので、デフォルト文言を用意
  if (!s) return "IDまたはパスワードが違います。"

  // 必要に応じて条件を追加してOK（APIの返却に合わせて調整）
  if (s.includes("invalid")) return "IDまたはパスワードが違います。"
  if (s.includes("password")) return "IDまたはパスワードが違います。"
  if (s.includes("user")) return "IDまたはパスワードが違います。"
  if (s.includes("locked")) return "アカウントがロックされています。管理者に連絡してください。"
  if (s.includes("network") || s.includes("fetch")) return "通信に失敗しました。時間をおいて再度お試しください。"

  return "ログインに失敗しました。入力内容をご確認ください。"
}

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await login(id, pw)
      if (!res.ok) {
        setError(toLoginErrorMessage(res.error))
        return
      }if (Number(res.user?.must_change_password ?? 0) === 1) {
        router.replace("/change-password/")
      } else {
        router.replace("/home/")
      }
    } catch {
      setError("通信に失敗しました。時間をおいて再度お試しください。")
    } finally {
      setLoading(false)
    }
  }

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
            ID
          </div>
          <input
            value={id}
            onChange={(e) => setId(e.target.value)}
            type="text"
            autoComplete="username"
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
            パスワード
          </div>
          <input
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            type="password"
            autoComplete="current-password"
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

          {error ? (
            <div style={{ color: "#B00020", fontSize: 12, fontFamily: '"Noto Sans JP", sans-serif', textAlign: "center" }}>{error}</div>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: 6,
              width: "100%",
              height: 40,
              borderRadius: 10,
              border: "0.5px solid #006284",
              background: "#006284",
              color: "#fff",
              fontSize: 14,
              fontFamily: '"Noto Sans JP", sans-serif',
              fontWeight: 700,
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? "ログイン中..." : "ログイン"}
          </button>

          <div style={{ marginTop: 6, textAlign: "center" }}>
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
