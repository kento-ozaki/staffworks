"use client"

import { useEffect } from "react"

export function ZoomBlocker() {
  useEffect(() => {

    function applyZoomReset() {
      const dpr = window.devicePixelRatio ?? 1

      const isHiDPI = window.matchMedia(
        "(-webkit-min-device-pixel-ratio: 2), (min-resolution: 192dpi)"
      ).matches

      if (isHiDPI) return

      if (dpr > 1.05) {

        document.documentElement.style.zoom = String(1 / dpr)
      } else {

        document.documentElement.style.zoom = ""
      }
    }

    applyZoomReset()

    const onResize = () => applyZoomReset()
    window.addEventListener("resize", onResize)

    const prevent = (e: Event) => e.preventDefault()
    document.addEventListener("gesturestart", prevent as any, { passive: false } as any)
    document.addEventListener("gesturechange", prevent as any, { passive: false } as any)
    document.addEventListener("gestureend", prevent as any, { passive: false } as any)

    const touchStart = (e: TouchEvent) => {
      if (e.touches && e.touches.length > 1) e.preventDefault()
    }
    const touchMove = (e: TouchEvent) => {
      if (e.touches && e.touches.length > 1) e.preventDefault()
    }
    document.addEventListener("touchstart", touchStart, { passive: false })
    document.addEventListener("touchmove", touchMove, { passive: false })

    const dbl = (e: MouseEvent) => e.preventDefault()
    document.addEventListener("dblclick", dbl, { passive: false } as any)

    const wheel = (e: WheelEvent) => {
      if (e.ctrlKey) e.preventDefault()
    }
    window.addEventListener("wheel", wheel, { passive: false })

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
