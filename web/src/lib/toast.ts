import { toast } from 'sonner'
import { ApiError } from '../api/client'
import { cnError } from './errors'

/** 统一 toast 封装：错误自动中文化。全站用它做反馈。 */
export const notify = {
  success: (msg: string) => toast.success(msg),
  info: (msg: string) => toast.info(msg),
  error: (e: unknown, fallback = '操作失败') => {
    const detail = e instanceof ApiError ? e.detail : typeof e === 'string' ? e : fallback
    toast.error(cnError(detail))
  },
}
