import type { Metadata } from "next"
import type { ReactNode } from "react"
import "./globals.css"
import { AppShell } from "@/components/shell/AppShell"
import { ZoomBlocker } from "./ZoomBlocker"

export const metadata: Metadata = {
  title: "StaffWorks",
}

// Next.js の viewport export は <meta name="viewport"> を生成するが、
// 一部の環境では反映が遅れる／上書きされるケースがあるため
// <head> 内にも直接 meta を記述して二重に保証する（後述）
export const viewport = {
  width: "device-width",
  initialScale: 1,
  minimumScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({ children }: { children: ReactNode }) {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? ""

  return (
    <html lang="ja" style={{ background: "#006284" }}>
      <head>
        {/*
          ── viewport を <meta> でも明示する ──────────────────────────
          Next.js の `export const viewport` が生成する meta と内容を
          一致させることで、フレームワークの処理タイミングに関係なく
          ブラウザが確実に正しい viewport を読み取れるようにする。
          minimum-scale=1 を加えることで、PC の「アクセシビリティ設定」
          によるブラウザデフォルトのズームが初期表示に影響しないように
          する。
        */}
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, minimum-scale=1, maximum-scale=1, user-scalable=no"
        />

        {/* PWA / Add to Home Screen */}
        <link rel="manifest" href={`${basePath}/manifest.webmanifest`} />

        {/* iOS Safari icons */}
        <link rel="apple-touch-icon" href={`${basePath}/apple-touch-icon.png`} />

        {/* Fallback icons (some browsers look for these) */}
        <link rel="icon" type="image/png" sizes="192x192" href={`${basePath}/icons/icon-192.png`} />
        <link rel="icon" type="image/png" sizes="512x512" href={`${basePath}/icons/icon-512.png`} />

        {/* iOS standalone mode */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="StaffWorks" />

        {/* Theme color (Android/Chrome UI) */}
        <meta name="theme-color" content="#006284" />

        <style>{`html, body { background: #006284; }`}</style>
      </head>

      <body
        style={{
          margin: 0,
          padding: 0,
          background: "#006284",
          overscrollBehavior: "none",
          touchAction: "manipulation",
        }}
      >
        <ZoomBlocker />
        <AppShell>{children}</AppShell>
      </body>
    </html>
  )
}
