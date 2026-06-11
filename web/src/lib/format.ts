export function fmtTime(s?: string | null): string {
  if (!s) return '—'
  const d = new Date(s)
  return isNaN(d.getTime()) ? s : d.toLocaleString('zh-CN', { hour12: false })
}

export function prettyJson(v: unknown): string {
  if (v == null || v === '') return '—'
  if (typeof v === 'string') {
    try {
      return JSON.stringify(JSON.parse(v), null, 2)
    } catch {
      return v
    }
  }
  return JSON.stringify(v, null, 2)
}
