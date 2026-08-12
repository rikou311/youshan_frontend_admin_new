import request from '@/utils/request'
import type { LoginParams, UserInfo } from '@/types/api'

interface LegacyLoginResult {
  access_token: string
  token_type: string
  user: UserInfo
}

export function login(data: LoginParams) {
  const body = `username=${encodeURIComponent(data.username)}&password=${encodeURIComponent(data.password)}&grant_type=password&scope=jee-fk&client_id=jee-fk&client_secret=jee-fk`
  return request.post<LegacyLoginResult>('/jee-fk/oauth/token', body, {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: '*/*',
    },
  })
}

export function getCurrentUser() {
  return request.get<UserInfo>('/jee-fk/sysuser/current')
}

export function logout() {
  return Promise.resolve()
}
