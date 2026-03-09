import type { Metadata, Viewport } from "next"
import type { ReactNode } from "react"
import "./globals.css"
import { AppShell } from "@/components/shell/AppShell"
import { ZoomBlocker } from "./ZoomBlocker"

export const metadata: Metadata = {
  title: "StaffWorks",
}

// Next.js の `export const viewport` が <meta name="viewport"> を自動生成する。
// output: "export"（静的エクスポート）モードでは <head> に手動で
// <meta name="viewport"> を書くと重複エラーになるため、ここでのみ定義する。
// minimum-scale=1 を明示することで、PC のブラウザ設定による
// デフォルトズームが初期表示に影響しないようにする。
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  minimumScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({ children }: { children: ReactNode }) {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? ""

  return (
    <html lang="ja" style={{ background: "#f0f5f7" }}>
      <head>
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

        <style>{`html, body { background: #f0f5f7; }`}</style>
      </head>

      <body
        style={{
          margin: 0,
          padding: 0,
          background: "#f0f5f7",
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
