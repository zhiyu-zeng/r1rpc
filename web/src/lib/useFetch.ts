import { useEffect, useState } from 'react'
import { ApiError } from '../api/client'
import { notify } from './toast'

interface FetchState<T> {
  data: T | null
  loading: boolean
  error: string
}

/** 通用数据加载 hook：返回 {data, loading, error, reload}。deps 变化或 reload() 时重新拉取。 */
export function useFetch<T>(fn: () => Promise<T>, deps: unknown[] = []) {
  const [state, setState] = useState<FetchState<T>>({ data: null, loading: true, error: '' })
  const [tick, setTick] = useState(0)

  useEffect(() => {
    let alive = true
    setState((s) => ({ ...s, loading: true, error: '' }))
    fn()
      .then((d) => alive && setState({ data: d, loading: false, error: '' }))
      .catch((e) => {
        if (!alive) return
        setState({ data: null, loading: false, error: e instanceof ApiError ? e.detail : '加载失败' })
        notify.error(e, '加载失败')
      })
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick])

  return { ...state, reload: () => setTick((t) => t + 1) }
}
