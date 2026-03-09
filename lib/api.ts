export type ApiOk<T> = { ok: true } & T
export type ApiNg = { ok: false; error?: string; status?: number }
export type ApiResponse<T> = ApiOk<T> | ApiNg

export const API_BASE = "/app/staffworks/api"

/**
 * パスを正規化して完全な URL を返す
 * - 絶対URL (https://...) はそのまま返す
 * - "/api/shift_list.php" のように "/api/" が二重になっているパスも正しく解決する
 * - "calendar_events_list.php" のようにファイル名だけのパスも正しく解決する
 * - "/shift_list.php" のような先頭スラッシュ付きパスも正しく解決する
 */
function resolveApiUrl(path: string): string {
  // 絶対URLはそのまま
  if (/^https?:\/\//i.test(path)) return path

  // クエリ文字列を分離
  const qsIndex = path.indexOf("?")
  const pathOnly = qsIndex >= 0 ? path.slice(0, qsIndex) : path
  const qs = qsIndex >= 0 ? path.slice(qsIndex) : ""

  // ファイル名だけを取り出す（パス区切りを除去）
  const filename = pathOnly.split("/").filter(Boolean).pop() || pathOnly

  return `${API_BASE}/${filename}${qs}`
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<ApiResponse<T>> {
  const url = resolveApiUrl(path)

  const res = await fetch(url, {
    ...init,
    credentials: "include",
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  })

  const status = res.status
  const text = await res.text()

  try {
    const json = JSON.parse(text) as any
    if (json && typeof json === "object" && "ok" in json) {
      if (json.ok === false) return { ...json, status }
      return json as ApiResponse<T>
    }
    return { ok: false, status, error: `Invalid JSON shape (${status})` }
  } catch {
    return { ok: false, status, error: `Invalid JSON response (${status})` }
  }
}
