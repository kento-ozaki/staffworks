"use client"

import { useEffect } from "react"

type Props = {
  open: boolean
  title: string
  onClose: () => void
  children: React.ReactNode
}

export function BottomSheet({ open, title, onClose, children }: Props) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.35)",
          zIndex: 60,
        }}
      />
      <div
        role="dialog"
        aria-modal="true"
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 70,
          background: "#fff",
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16,
          borderTop: "1px solid #eee",
          boxShadow: "0 -10px 30px rgba(0,0,0,0.12)",
          maxHeight: "85vh",
          overflow: "auto",
        }}
      >
        <div
          style={{
            padding: 12,
            borderBottom: "1px solid #eee",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 10,
          }}
        >
          <div style={{ fontWeight: 900 }}>{title}</div>
          <button onClick={onClose} style={{ border: "1px solid #ddd", background: "#fff", borderRadius: 10, padding: "6px 10px" }}>
            ✕
          </button>
        </div>

        <div style={{ padding: 12 }}>{children}</div>
      </div>
    </>
  )
}
