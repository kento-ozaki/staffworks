"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useEffect, useMemo, useRef, useState, type ReactNode, type CSSProperties } from "react"
import { me, logout, type User } from "@/lib/auth"
import { toUserMessage } from "@/lib/errors"

type BottomNavItem = { href: string; label: string; icon: string }

const BOTTOM_NAV: BottomNavItem[] = [
  { href: "/shifts/", label: "シフト", icon: "bottom_shifts.svg" },
  { href: "/home/",   label: "ホーム", icon: "bottom_home.svg"   },
  { href: "/tasks/",  label: "タスク", icon: "bottom_tasks.svg"  },
]

// サイドメニュー（新仕様）
type SideNavItem = {
  key: string
  label: string
  href?: string
  icon: string
  roles?: Array<User["role"] | "leader">
  maintenance?: boolean
}

const SIDE_NAV: SideNavItem[] = [
  { key: "page1", label: "お知らせ一覧", href: "/home/", icon: "navi_notifications.svg" },
  { key: "page2", label: "備品管理", icon: "equipment_manage.svg", maintenance: true },
  { key: "page3", label: "清掃記録", icon: "clean.svg", maintenance: true },
  { key: "page4", label: "リンク", icon: "link.svg", maintenance: true },
  { key: "page5", label: "ファイル共有", icon: "file.svg", maintenance: true },
  { key: "page6", label: "オンライン", icon: "zoom.svg", maintenance: true },
  { key: "page7", label: "シフト希望提出", href: "/shifts/submit/", icon: "shift_submissions.svg" },
  // leader も許可（User.role に leader が無い可能性があるので string で許容）
  { key: "page8", label: "シフト管理", href: "/shifts/manage/" ,icon: "shift_manage.svg", roles: ["admin", "leader"] },
  { key: "page9", label: "アカウント管理", href: "/admin/users/", icon: "account_manage.svg", roles: ["admin"] },
  { key: "page10", label: "アプリ設定", href: "/admin/settings/notices/", icon: "app_setting.svg", roles: ["admin"] },
]

function isAuthFreePath(pathname: string): boolean {
  return pathname.startsWith("/login") || pathname.startsWith("/open") || pathname.startsWith("/terms")
}

function isChangePasswordPath(pathname: string): boolean {
  return pathname.startsWith("/change-password")
}

function toErrorMessage(e: unknown): string {
  if (e instanceof Error) return e.message
  if (typeof e === "string") return e
  return "エラーが発生しました"
}

function useDrawerWidth(breakpointPx = 744, narrow = 250, wide = 300) {
  const [width, setWidth] = useState<number>(narrow)
  useEffect(() => {
    const mq = window.matchMedia(`(min-width: ${breakpointPx}px)`)
    const apply = () => setWidth(mq.matches ? wide : narrow)
    apply()
    mq.addEventListener?.("change", apply)
    return () => mq.removeEventListener?.("change", apply)
  }, [breakpointPx, narrow, wide])
  return width
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathnameRaw = usePathname()
  const pathname = pathnameRaw ?? ""
  const pathnameReady = pathnameRaw !== null
  const router = useRouter()
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? ""
  const isChangePassword = useMemo(() => isChangePasswordPath(pathname), [pathname])
  const isLogin = useMemo(() => pathname.startsWith("/login"), [pathname])
  const isOpen = useMemo(() => pathname.startsWith("/open"), [pathname])
  const isTerms = useMemo(() => pathname.startsWith("/terms"), [pathname])
  const authFree = useMemo(() => isAuthFreePath(pathname), [pathname])
  const hideShell = !pathnameReady || pathname === "/" || isLogin || isChangePassword || isOpen || isTerms
  const showShell = !hideShell
  const [open, setOpen] = useState(false)
  const [meUser, setMeUser] = useState<User | null>(null)
  const [logoutError, setLogoutError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const drawerWidth = useDrawerWidth(744, 250, 300)

  const [bouncingHref, setBouncingHref] = useState<string|null>(null)
  useEffect(() => {
    setBouncingHref(pathname)
    const t = setTimeout(() => setBouncingHref(null), 500)
    return () => clearTimeout(t)
  }, [pathname])

  useEffect(() => {
    if (authFree || isChangePassword || isOpen) return
    let cancelled = false
    ;(async () => {
      const res = await me()
      if (cancelled) return
      if (res.ok) {
        setMeUser(res.user)
      } else {
        setMeUser(null)
      }
    })()
    return () => { cancelled = true }
  }, [authFree, isChangePassword, isOpen])

  useEffect(() => {
    setOpen(false)
    setNotice(null)
  }, [pathname])

  const scrollYRef = useRef(0)
  useEffect(() => {
    if (!showShell) return
    if (!open) return

    scrollYRef.current = window.scrollY || 0
    const body = document.body
    const prev = {
      position: body.style.position,
      top: body.style.top,
      left: body.style.left,
      right: body.style.right,
      width: body.style.width,
      overflow: body.style.overflow,
    }

    body.style.position = "fixed"
    body.style.top = `-${scrollYRef.current}px`
    body.style.left = "0"
    body.style.right = "0"
    body.style.width = "100%"
    body.style.overflow = "hidden"

    return () => {
      body.style.position = prev.position
      body.style.top = prev.top
      body.style.left = prev.left
      body.style.right = prev.right
      body.style.width = prev.width
      body.style.overflow = prev.overflow
      window.scrollTo(0, scrollYRef.current)
    }
  }, [open, showShell])

  async function onLogout() {
    setLogoutError(null)
    try {
      await logout()
      router.replace("/login/")
    } catch (e: unknown) {
      setLogoutError(toErrorMessage(e))
    }
  }

  const visibleSideNav = useMemo(() => {
    const role = (meUser?.role as unknown as string) ?? ""
    return SIDE_NAV.filter(item => {
      if (!item.roles || item.roles.length === 0) return true
      return item.roles.includes(role as any)
    })
  }, [meUser])

  function onMaintenanceClick(label: string) {
    setNotice(`「${label}」はメンテナンス中です。`)
    window.setTimeout(() => setNotice(null), 2500)
  }

  return (
    <div style={{ minHeight: "100%", background: "#f0f5f7" }}> {/* 旧: 100vh → zoom適用時のズレを避けるため100%に変更 */}
      <style>{`
        html, body { overflow-x: hidden; max-width: 100%; }
        * { scrollbar-width: none; }
        *::-webkit-scrollbar { display: none; }
      `}</style>

      {/* Header */}
      {/* position: fixed + left/right:0 に変更。
          旧: position:sticky + width:100vw + marginLeft:calc(50%-50vw)
          → CSS zoom 適用時に vw の計算基準がズレてヘッダーが途中で切れる問題を修正。
          fixed にすることで zoom の影響を受けず常に画面全幅に固定される。
          その分 main に paddingTop を追加してコンテンツが隠れないようにする。 */}
      {showShell && (
        <header
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            zIndex: 20,
            height: 64,
            padding: "0 16px",
            boxSizing: "border-box",
            background: "#006284",
            display: "flex",
            alignItems: "center",
          }}
        >
          <div
            style={{
              height: "100%",
              width: "100%",
              display: "grid",
              gridTemplateColumns: "44px 1fr 44px",
              alignItems: "center",
            }}
          >
            <button
              type="button"
              onClick={() => setOpen(true)}
              aria-label="メニュー"
              style={{
                width: 44,
                height: 44,
                border: "none",
                borderRadius: 12,
                background: "transparent",
                display: "grid",
                placeItems: "center",
                cursor: "pointer",
              }}
            >
              <img src={`${basePath}/sidemenu.svg`} alt="menu" style={{ height: 28, width: "auto", display: "block" }} />
            </button>

            <div style={{ display: "grid", placeItems: "center" }}>
              <img src={`${basePath}/logo.svg`} alt="logo" style={{ height: 32, width: "auto", display: "block" }} />
            </div>

            <button
              type="button"
              onClick={(e) => e.preventDefault()}
              aria-label="アカウント"
              style={{
                width: 44,
                height: 44,
                border: "none",
                borderRadius: 12,
                background: "transparent",
                display: "grid",
                placeItems: "center",
                cursor: "not-allowed",
              }}
            >
              <img src={`${basePath}/account.svg`} alt="account" style={{ height: 28, width: "auto", display: "block" }} />
            </button>
          </div>
        </header>
      )}

      {/* Overlay */}
      {showShell && open && (
        <div
          role="presentation"
          onClick={() => setOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.25)",
            zIndex: 40,
          }}
        />
      )}

      {/* Side Drawer */}
      {showShell && (
        <aside
          aria-label="サイドメニュー"
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            bottom: 0,           /* height: 100dvh の代替。zoom 適用時に dvh がズレる問題を修正 */
            width: drawerWidth,
            background: "#006284",
            paddingBottom: "env(safe-area-inset-bottom)",
            zIndex: 45,
            transform: open ? "translateX(0)" : "translateX(-110%)",
            transition: "transform 180ms ease",
            boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Head */}
          <div
            style={{
              height: 64,
              padding: "0 8px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <img src={`${basePath}/logo.svg`} alt="logo" style={{ height: 32, width: "auto", display: "block" }} />
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="閉じる"
              style={{
                width: 44,
                height: 44,
                border: "none",
                borderRadius: 12,
                background: "transparent",
                cursor: "pointer",
                fontSize: 18,
                color: "#fff",
              }}
            >
              <img
                src={`${basePath}/back.svg`}
                alt=""
                width={20}
                height={20}
                style={{ display: "block" }}
              />
            </button>
          </div>

          {/* Scroll Area */}
          <div style={{ flex: 1, overflowY: "auto", WebkitOverflowScrolling: "touch" }}>

            {/* Pages */}
            <nav style={{ padding: "16px 8px", display: "flex", flexDirection: "column", gap: 8 }}>
              {visibleSideNav.map((item) => {
                const href = item.href ?? "#"
                const active = item.href ? pathname === href || pathname.startsWith(href) : false

                const rowStyle: CSSProperties = {
                  height: 50,
                  padding: "0 8px",
                  background: "#ffffff",
                  borderRadius: 8,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  textDecoration: "none",
                  color: "#1C1C1C",
                  fontWeight: 700,
                  boxSizing: "border-box",
                  outline: active ? "2px solid rgba(255,255,255,0.85)" : "none",
                }

                const iconSrc = `${basePath}/${item.icon}`

                if (item.maintenance || !item.href) {
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => onMaintenanceClick(item.label)}
                      style={{
                        ...rowStyle,
                        width: "100%",
                        border: "none",
                        cursor: "pointer",
                      }}
                    >
                      <img src={iconSrc} alt="" style={{ width: 28, height: 28, display: "block" }} />
                      <span style={{ fontSize: 16 }}>{item.label}</span>
                    </button>
                  )
                }

                return (
                  <Link key={item.key} href={href} prefetch={false} aria-current={active ? "page" : undefined} style={rowStyle}>
                    <img src={iconSrc} alt="" style={{ width: 28, height: 28, display: "block" }} />
                    <span style={{ fontSize: 16 }}>{item.label}</span>
                  </Link>
                )
              })}

              {notice && (
                <div
                  role="status"
                  style={{
                    marginTop: 8,
                    padding: "10px 10px",
                    borderRadius: 8,
                    background: "rgba(255,255,255,0.18)",
                    color: "#fff",
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  {notice}
                </div>
              )}
            </nav>
          </div>

          {/* Logout (bottom) */}
          <div style={{ padding: "16px 8px calc(24px + env(safe-area-inset-bottom))", borderTop: "1px solid rgba(255,255,255,0.25)" }}>
            {logoutError && <div style={{ marginBottom: 8, color: "#fff", fontSize: 12, fontWeight: 700 }}>{logoutError}</div>}
            <button
              type="button"
              onClick={onLogout}
              style={{
                width: "100%",
                height: 45,
                borderRadius: 8,
                border: "none",
                background: "#CB4042",
                color: "#fff",
                fontWeight: 700,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                padding: "0 8px",
              }}
            >
              <img src={`${basePath}/logout.svg`} alt="" width={18} height={18} style={{ display: "block" }} />
              <span style={{ fontSize: 16 }}>ログアウト</span>
            </button>
          </div>
        </aside>
      )}

      {/* Main */}
      {/* paddingTop: 64px を追加。ヘッダーが fixed になったため、その高さ分コンテンツが隠れないようにオフセットする。 */}
      <main
        style={{
          padding: 0,
          paddingTop: showShell ? 64 : 0,
          paddingBottom: showShell ? "calc(84px + env(safe-area-inset-bottom))" : 0,
          pointerEvents: showShell && open ? "none" : "auto",
        }}
      >
        {/* Content Shell — minWidth: 320px（rem依存を排除、全端末で320px未満に縮まない） */}
        <div style={{ width: "100%", maxWidth: "47.9375rem", minWidth: "320px", margin: "0 auto" }}>
          {children}
        </div>
      </main>

      {/* ── Global CSS for bottom nav animations ── */}
      {showShell && (
        <style>{`
          @keyframes navBounce {
            0%   { transform: scale(1) translateY(0); }
            30%  { transform: scale(1.18) translateY(-4px); }
            55%  { transform: scale(0.93) translateY(1px); }
            75%  { transform: scale(1.06) translateY(-2px); }
            100% { transform: scale(1) translateY(0); }
          }
          @keyframes ripple {
            0%   { transform: scale(0); opacity: 0.5; }
            100% { transform: scale(3.5); opacity: 0; }
          }
          @keyframes navSlideUp {
            from { transform: translateY(100%); opacity: 0; }
            to   { transform: translateY(0);    opacity: 1; }
          }
          .bottom-nav-item {
            position: relative;
            overflow: hidden;
            -webkit-tap-highlight-color: transparent;
          }
          .bottom-nav-item::after {
            content: '';
            position: absolute;
            inset: 0;
            border-radius: inherit;
            background: rgba(255,255,255,0.12);
            opacity: 0;
            transition: opacity 0.15s;
          }
          .bottom-nav-item:active::after { opacity: 1; }
        `}</style>
      )}

      {/* Bottom Navigation */}
      {showShell && (
        <nav
          aria-label="ボトムナビゲーション"
          style={{
            position: "fixed",
            left: 0,
            right: 0,
            bottom: 0,
            height: "calc(84px + env(safe-area-inset-bottom))",
            zIndex: open ? 30 : 50,
            background: "transparent",
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "center",
            paddingTop: 10,
            paddingLeft: 12,
            paddingRight: 12,
            paddingBottom: "env(safe-area-inset-bottom)",
            boxSizing: "border-box",
            pointerEvents: "none",
          }}
        >
          {/* ピル型コンテナ — minWidth: 320px（rem依存を排除、全端末で320px未満に縮まない） */}
          <div
            style={{
              width: "100%",
              maxWidth: "47.9375rem",
              minWidth: "320px",
              paddingLeft: 20,
              paddingRight: 20,
              background: "rgba(0, 98, 132, 0.82)",
              borderRadius: 28,
              display: "flex",
              alignItems: "center",
              gap: 6,
              height: 64,
              boxSizing: "border-box",
              backdropFilter: "blur(14px)",
              WebkitBackdropFilter: "blur(14px)",
              border: "1px solid rgba(255,255,255,0.08)",
              transition: "box-shadow 0.3s ease",
              boxShadow: "0 4px 20px rgba(0,40,60,0.22)",
              pointerEvents: "auto",
            }}
          >
            {BOTTOM_NAV.map((n) => {
              const active   = pathname === n.href || pathname.startsWith(n.href)
              const bouncing = bouncingHref === n.href && active

              return (
                <Link
                  key={n.href}
                  href={n.href}
                  prefetch={false}
                  aria-current={active ? "page" : undefined}
                  className="bottom-nav-item"
                  style={{
                    flex: "1 1 0",
                    height: 52,
                    borderRadius: active ? 22 : 18,
                    background: active ? "rgba(0,98,132,0.95)" : "transparent",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 2,
                    textDecoration: "none",
                    transition: "background 0.2s ease, box-shadow 0.2s ease, border-radius 0.2s ease",
                    boxShadow: active
                      ? "0 0 0 1px rgba(255,255,255,0.15) inset, 0 4px 16px rgba(0,0,0,0.3)"
                      : "none",
                  }}
                >
                  {/* アイコン — バウンスアニメーション */}
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      animation: bouncing ? "navBounce 0.5s cubic-bezier(0.34,1.56,0.64,1)" : "none",
                    }}
                  >
                    <img
                      src={`${basePath}/${n.icon}`}
                      alt={n.label}
                      style={{
                        width: 32,
                        height: 32,
                        display: "block",
                        filter: "brightness(0) invert(1)",
                        opacity: active ? 1 : 0.65,
                        transition: "opacity 0.2s ease, transform 0.2s ease",
                        transform: active ? "scale(1)" : "scale(0.9)",
                      }}
                    />
                  </div>
                  {/* アクティブ時のみラベルをフェードイン */}
                  <span
                    style={{
                      fontSize: 9,
                      fontWeight: 700,
                      fontFamily: "'Noto Sans JP', sans-serif",
                      color: "rgba(255,255,255,0.9)",
                      letterSpacing: "0.06em",
                      lineHeight: 1,
                      maxHeight: active ? 12 : 0,
                      opacity: active ? 1 : 0,
                      overflow: "hidden",
                      transition: "max-height 0.25s ease, opacity 0.25s ease",
                    }}
                  >
                    {n.label}
                  </span>
                </Link>
              )
            })}
          </div>
        </nav>
      )}
    </div>
  )
}
