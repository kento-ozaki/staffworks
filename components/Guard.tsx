"use client"

import { ReactNode } from "react"
import { useAuthGuard } from "@/lib/useAuthGuard"
import type { User } from "@/lib/auth"

type Props = {
  children: ReactNode | ((user: User) => ReactNode)
  requireAdmin?: boolean
  loadingFallback?: ReactNode
}

/**
 * Guard
 * - require login by default
 * - if must_change_password=1 => redirects to /change-password/
 * - if requireAdmin=true and role!=admin => redirects to /home/
 *
 * children に関数を渡すと、認証済みユーザー情報を受け取れます:
 *   <Guard>{(user) => <HomeInner user={user} />}</Guard>
 *
 * 従来通り ReactNode を渡す使い方も引き続き使えます:
 *   <Guard><SomePage /></Guard>
 */
export function Guard({ children, requireAdmin, loadingFallback }: Props) {
  const { user, loading } = useAuthGuard({ requireAdmin })

  if (loading) return <>{loadingFallback ?? <div>読み込み中...</div>}</>

  // children が関数（render prop）なら user を渡して呼び出す
  if (typeof children === "function") {
    return <>{user ? children(user) : null}</>
  }

  return <>{children}</>
}
