"use client"

import { useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { me } from "@/lib/auth"

/**
 * Root entry:
 *  - ログイン済み: /home/（初回PW変更なら /change-password/）
 *  - 未ログイン: /open/（open → login の演出へ）
 *
 * ※ ここにログイン画面を置かない（/login/ に統一）
 */
export default function RootPage() {
  const router = useRouter()
  const base = process.env.NEXT_PUBLIC_BASE_PATH ?? ""
  const logoSrc = useMemo(() => `${base}/logo.svg`, [base])

  useEffect(() => {
    ;(async () => {
      try {
        const r = await me()
        if (r.ok) {
          const must = Number(r.user.must_change_password) === 1
          router.replace(must ? "/change-password/" : "/home/")
          return
        }
      } catch {}
      router.replace("/open/")
    })()
  }, [router])

  // 遷移までの間は青背景スプラッシュ（ヘッダー/ボトムナビのチラつきを防ぐ）
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "#006284",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 999999,
      }}
    >
      <img
        src={logoSrc}
        alt="STAFFWORKS"
        width={220}
        height={44}
        style={{ height: 44, width: "auto", display: "block", filter: "drop-shadow(0 10px 18px rgba(0,0,0,0.22))" }}
      />
      <style jsx global>{`html,body{margin:0;padding:0;height:100%;background:#006284;}`}</style>
    </div>
  )
}
