"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { me } from "@/lib/auth"

export default function OpenPage() {
  const router = useRouter()
  const [leaving, setLeaving] = useState(false)

  useEffect(() => {
    let t1: any
    let t2: any

    ;(async () => {
      const r = await me()
      if (r.ok) {
        const must = Number(r.user.must_change_password) === 1
        router.replace(must ? "/change-password/" : "/home/")
        return
      }

      // 未ログインなら、ロゴだけフェードアウトしてからログインへ
      t1 = setTimeout(() => setLeaving(true), 1000)
      t2 = setTimeout(() => router.replace("/login/"), 1450)
    })()

    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [router])

  const base = process.env.NEXT_PUBLIC_BASE_PATH ?? ""
  const logoSrc = `${base}/logo.svg`

  return (
    <div className="openPage">
      <div className={"center" + (leaving ? " leaving" : "")}>
        <img className="logo" src={logoSrc} alt="STAFFWORKS" width={220} height={44} />
      </div>

      <style jsx global>{`
        html,
        body {
          margin: 0;
          padding: 0;
          height: 100%;
          background: #006284;
        }
      `}</style>

      <style jsx>{`
        .openPage {
          position: fixed;
          inset: 0;
          background: #006284; /* ★背景は最後まで不透明のまま */
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 999999; /* ★下のAppShellやloginの白要素を絶対に透けさせない */
        }

        .center {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
          transform: translateY(-6px);
          opacity: 1;
          transition: opacity 420ms ease, transform 420ms ease;
        }

        .center.leaving {
          opacity: 0;
          transform: translateY(-10px);
        }

        .logo {
          width: 220px;
          height: 44px;
          display: block;
          object-fit: contain;
          filter: drop-shadow(0 10px 18px rgba(0, 0, 0, 0.22));
        }
      `}</style>
    </div>
  )
}
