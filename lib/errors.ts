import type { ApiNg } from "./api"

export function toUserMessage(err: ApiNg, fallback = "エラーが発生しました"): string {
  const status = err.status
  const raw = (err.error ?? "").trim()

  if (status === 401) return "ログイン期限が切れました。もう一度ログインしてください。"
  if (status === 403) return "権限がありません。"
  if (status === 409) return "そのSTAFFIDは既に使われています。別のSTAFFIDを指定してください。"

  // Common API messages
  if (/invalid credentials/i.test(raw)) return "STAFFID またはパスワードが正しくありません。"
  if (/birthdate must be 8 digits/i.test(raw)) return "生年月日は8桁（YYYYMMDD）で入力してください。"
  if (/staff_id already exists/i.test(raw)) return "そのSTAFFIDは既に使われています。"
  if (/unauthorized/i.test(raw)) return "ログインが必要です。"
  if (/forbidden/i.test(raw)) return "権限がありません。"

  return raw || fallback
}

// for guard redirects
export function reasonFromError(err: ApiNg): "unauthorized" | "forbidden" | "unknown" {
  if (err.status === 401) return "unauthorized"
  if (err.status === 403) return "forbidden"
  return "unknown"
}
