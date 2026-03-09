"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { logout } from "@/lib/auth"
import type { ApiNg } from "@/lib/api"
import { toUserMessage } from "@/lib/errors"

type Props = {
  title: string
  backHref?: string
  backLabel?: string
}

export function AdminBar({ title, backHref, backLabel }: Props) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function onLogout() {
    setError(null)
    setLoading(true)
    const r = await logout()
    setLoading(false)

    if (!r.ok) {
      setError(toUserMessage(r as ApiNg, "ログアウトに失敗しました"))
      return
    }
    router.replace("/login/")
  }

  return (
    <div style={{ display: "grid", gap: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <h1 style={{ margin: 0 }}>{title}</h1>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {backHref && (
            <Link href={backHref} style={{ padding: "8px 10px", border: "1px solid #ccc" }}>
              {backLabel ?? "戻る"}
            </Link>
          )}
          <button onClick={onLogout} disabled={loading} style={{ padding: "8px 10px" }}>
            {loading ? "ログアウト中..." : "ログアウト"}
          </button>
        </div>
      </div>
      {error && <div style={{ color: "crimson" }}>{error}</div>}
    </div>
  )
}
