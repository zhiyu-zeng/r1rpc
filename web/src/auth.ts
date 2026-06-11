import type { User } from './types'

const TOKEN_KEY = 'r1rpc_token'
const USER_KEY = 'r1rpc_user'

type Listener = () => void
const listeners = new Set<Listener>()

export const auth = {
  get token(): string {
    return localStorage.getItem(TOKEN_KEY) || ''
  },
  get user(): User | null {
    try {
      return JSON.parse(localStorage.getItem(USER_KEY) || 'null')
    } catch {
      return null
    }
  },
  login(token: string, user: User | null) {
    localStorage.setItem(TOKEN_KEY, token)
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user))
    listeners.forEach((fn) => fn())
  },
  logout() {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
    listeners.forEach((fn) => fn())
  },
  subscribe(fn: Listener) {
    listeners.add(fn)
    return () => listeners.delete(fn)
  },
}
