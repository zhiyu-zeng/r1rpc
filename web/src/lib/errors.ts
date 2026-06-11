// 后端错误信息已全部是中文，前端直接透传。
// 仅处理浏览器自身产生的英文网络错误（fetch 失败等）。
export function cnError(detail?: string): string {
  if (!detail) return '操作失败'
  if (/failed to fetch|networkerror|network error|load failed/i.test(detail)) {
    return '网络异常，无法连接服务器'
  }
  return detail
}
