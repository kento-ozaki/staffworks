"use client"

import { useEffect } from "react"

export function ZoomBlocker() {
  useEffect(() => {
    // iOS Safari pinch gestures (older)
    const prevent = (e: Event) => e.preventDefault()
    document.addEventListener("gesturestart", prevent as any, { passive: false } as any)
    document.addEventListener("gesturechange", prevent as any, { passive: false } as any)
    document.addEventListener("gestureend", prevent as any, { passive: false } as any)

    // Multi-touch pinch (modern iOS)
    const touchStart = (e: TouchEvent) => {
      if (e.touches && e.touches.length > 1) e.preventDefault()
    }
    const touchMove = (e: TouchEvent) => {
      if (e.touches && e.touches.length > 1) e.preventDefault()
    }
    document.addEventListener("touchstart", touchStart, { passive: false })
    document.addEventListener("touchmove", touchMove, { passive: false })

    // Double-tap zoom sometimes surfaces as dblclick
    const dbl = (e: MouseEvent) => e.preventDefault()
    document.addEventListener("dblclick", dbl, { passive: false } as any)

    // Ctrl + wheel / trackpad zoom (desktop)
    const wheel = (e: WheelEvent) => {
      if (e.ctrlKey) e.preventDefault()
    }
    window.addEventListener("wheel", wheel, { passive: false })

    // Ctrl/⌘ + '+' '-' zoom shortcuts
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