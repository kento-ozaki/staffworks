"use client"

import { useEffect } from "react"

export function ZoomBlocker() {
  useEffect(() => {
    // ── ① ページ読み込み時のズームリセット ────────────────────────────
    //
    // Chrome はサイトごとにズーム倍率を記憶する。
    // window.devicePixelRatio が 1 より大きく、かつ CSS の 1px が
    // 物理ピクセルと一致しない（= ブラウザズームが掛かっている）場合、
    // document.body に zoom: (1 / devicePixelRatio) を適用して
    // 見かけ上のズームを打ち消す。
    //
    // ※ CSS zoom は標準化が進んでいるプロパティだが、Firefox では
    //   効かない場合がある。Firefox は別途 transform: scale で対応。
    // ※ Retina / HiDPI（devicePixelRatio >= 2）の場合は正常な高解像度
    //   表示なので、このリセットを適用しない。
    //   スクリーンが HiDPI かどうかは matchMedia で判定する。

    function applyZoomReset() {
      const dpr = window.devicePixelRatio ?? 1

      // HiDPI（Retina等）は devicePixelRatio が OS レベルで 2 以上に
      // なっている。この場合はブラウザズームではないためスキップ。
      const isHiDPI = window.matchMedia(
        "(-webkit-min-device-pixel-ratio: 2), (min-resolution: 192dpi)"
      ).matches

      if (isHiDPI) return

      // ブラウザのズームが 100% のとき devicePixelRatio ≒ 1。
      // 150% ズームなら ≒ 1.5 になる。
      // 誤差を考慮して 1.05 超を「ズームあり」と判定する。
      if (dpr > 1.05) {
        // CSS zoom で打ち消す（Chrome / Edge / Safari 対応）
        document.documentElement.style.zoom = String(1 / dpr)
      } else {
        // ズームなし or リセット済みの場合は zoom を解除
        document.documentElement.style.zoom = ""
      }
    }

    applyZoomReset()

    // ── ② ブラウザズームの変化を監視してリアルタイムでリセット ────────
    // resize イベントは Ctrl+ホイール によるズーム変更でも発火する
    const onResize = () => applyZoomReset()
    window.addEventListener("resize", onResize)

    // ── ③ iOS Safari pinch gestures (older) ──────────────────────────
    const prevent = (e: Event) => e.preventDefault()
    document.addEventListener("gesturestart", prevent as any, { passive: false } as any)
    document.addEventListener("gesturechange", prevent as any, { passive: false } as any)
    document.addEventListener("gestureend", prevent as any, { passive: false } as any)

    // ── ④ Multi-touch pinch (modern iOS) ─────────────────────────────
    const touchStart = (e: TouchEvent) => {
      if (e.touches && e.touches.length > 1) e.preventDefault()
    }
    const touchMove = (e: TouchEvent) => {
      if (e.touches && e.touches.length > 1) e.preventDefault()
    }
    document.addEventListener("touchstart", touchStart, { passive: false })
    document.addEventListener("touchmove", touchMove, { passive: false })

    // ── ⑤ Double-tap zoom ────────────────────────────────────────────
    const dbl = (e: MouseEvent) => e.preventDefault()
    document.addEventListener("dblclick", dbl, { passive: false } as any)

    // ── ⑥ Ctrl + wheel / trackpad zoom (desktop) ─────────────────────
    const wheel = (e: WheelEvent) => {
      if (e.ctrlKey) e.preventDefault()
    }
    window.addEventListener("wheel", wheel, { passive: false })

    // ── ⑦ Ctrl/⌘ + '+' '-' zoom shortcuts ───────────────────────────
    const keydown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toLowerCase().includes("mac")
      const mod = isMac ? e.metaKey : e.ctrlKey
      if (!mod) return
      if (e.key === "+" || e.key === "-" || e.key === "=" || e.key === "0") {
        e.preventDefault()
      }
    }
    window.addEventListener("keydown", keydown, { passive: false } as any)

    return () => {
      // クリーンアップ時は zoom をリセット
      document.documentElement.style.zoom = ""

      window.removeEventListener("resize", onResize)

      document.removeEventListener("gesturestart", prevent as any)
      document.removeEventListener("gesturechange", prevent as any)
      document.removeEventListener("gestureend", prevent as any)

      document.removeEventListener("touchstart", touchStart as any)
      document.removeEventListener("touchmove", touchMove as any)

      document.removeEventListener("dblclick", dbl as any)
      window.removeEventListener("wheel", wheel as any)
      window.removeEventListener("keydown", keydown as any)
    }
  }, [])

  return null
}
