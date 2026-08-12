import { TOKEN_KEY, USER_KEY } from '@/constants/storage'
import type { UserInfo } from '@/types/api'

export function getToken() {
  return sessionStorage.getItem(TOKEN_KEY) ?? ''
}

export function setToken(token: string) {
  sessionStorage.setItem(TOKEN_KEY, token)
}

export function removeToken() {
  sessionStorage.removeItem(TOKEN_KEY)
}

export function getUser(): UserInfo | null {
  const raw = sessionStorage.getItem(USER_KEY)
  if (!raw) {
    return null
  }
  return JSON.parse(raw) as UserInfo
}

export function setUser(user: UserInfo) {
  sessionStorage.setItem(USER_KEY, JSON.stringify(user))
}

export function removeUser() {
  sessionStorage.removeItem(USER_KEY)
}

export function saveDictionary(groupId: string, values: unknown) {
  sessionStorage.setItem(groupId, JSON.stringify(values))
}

export function getDictionary<T = unknown>(groupId: string): T | null {
  const raw = sessionStorage.getItem(groupId)
  if (!raw) {
    return null
  }
  return JSON.parse(raw) as T
}

export function clearAuthStorage() {
  sessionStorage.removeItem(TOKEN_KEY)
  sessionStorage.removeItem(USER_KEY)
}
