"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { me, type User } from "./auth"
import type { ApiNg } from "./api"
import { reasonFromError } from "./errors"

type Options = {
  requireAdmin?: boolean
  redirectUnauthedTo?: string // default /login/
  redirectNonAdminTo?: string // default /home/
  redirectMustChangePwTo?: string // default /change-password/
}

export function useAuthGuard(opts: Options = {}) {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  // ✅ オプションを ref に固定する。
  //    認証ガードのオプションは初回マウント時に決まるものであり、
  //    その後動的に変わることは想定していない。
  //    呼び出し元で毎回オブジェクトリテラルを渡しても
  //    useEffect が再実行されないよう ref で保持する。
  const optsRef = useRef(opts)

  useEffect(() => {
    const { requireAdmin, redirectUnauthedTo, redirectNonAdminTo, redirectMustChangePwTo } = optsRef.current

    ;(async () => {
      // 認証の有効期限（例：10分無操作）は API（PHPセッション）側で判定します。
      // フロントではタブ切替/新規起動で logout() しません（誤爆で即ログアウトが起きるため）。

      const r = await me()
      if (!r.ok) {
        setLoading(false)
        const reason = reasonFromError(r as ApiNg)
        const to = redirectUnauthedTo ?? "/login/"
        router.replace(`${to}?reason=${encodeURIComponent(reason)}`)
        return
      }

      const must = Number(r.user.must_change_password) === 1
      if (must) {
        setLoading(false)
        router.replace(redirectMustChangePwTo ?? "/change-password/")
        return
      }

      if (requireAdmin && r.user.role !== "admin") {
        setLoading(false)
        const to = redirectNonAdminTo ?? "/home/"
        router.replace(`${to}?reason=forbidden`)
        return
      }

      setUser(r.user)
      setLoading(false)
    })()
  }, [router]) // optsRef は ref のため依存配列不要

  return { user, loading }
}
