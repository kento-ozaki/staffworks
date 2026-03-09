"use client"

import Link from "next/link"
import type { TaskCard as T } from "@/lib/tasks"

export function TaskCard({ task }: { task: T }) {
  const due = task.due_date ? task.due_date : "-"
  return (
    <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 10, display: "grid", gap: 6 }}>
      <div style={{ fontWeight: 700 }}>{task.title}</div>
      <div style={{ fontSize: 12, color: "#555" }}>
        {task.main_category_name} / 期限: {due}
      </div>
      <div style={{ fontSize: 12, color: "#555" }}>登録: {task.created_by_name}</div>

      <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
        <Link href={`/task/?id=${task.id}`} style={{ padding: "6px 8px", border: "1px solid #ccc" }}>
          詳細 / 進捗
        </Link>
      </div>
    </div>
  )
}
