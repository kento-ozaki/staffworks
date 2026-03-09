"use client"

import { useEffect, useState } from "react"
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

  useEffect(() => {
    ;(async () => {
      // 認証の有効期限（例：10分無操作）は API（PHPセッション）側で判定します。
      // フロントではタブ切替/新規起動で logout() しません（誤爆で即ログアウトが起きるため）。

      const r = await me()
      if (!r.ok) {
        setLoading(false)
        const reason = reasonFromError(r as ApiNg)
        const to = opts.redirectUnauthedTo ?? "/login/"
        router.replace(`${to}?reason=${encodeURIComponent(reason)}`)
        return
      }

      const must = Number(r.user.must_change_password) === 1
      if (must) {
        setLoading(false)
        router.replace(opts.redirectMustChangePwTo ?? "/change-password/")
        return
      }

      if (opts.requireAdmin && r.user.role !== "admin") {
        setLoading(false)
        const to = opts.redirectNonAdminTo ?? "/home/"
        router.replace(`${to}?reason=forbidden`)
        return
      }

      setUser(r.user)
      setLoading(false)
    })()
  }, [router, opts.requireAdmin, opts.redirectUnauthedTo, opts.redirectNonAdminTo, opts.redirectMustChangePwTo])

  return { user, loading }
}
