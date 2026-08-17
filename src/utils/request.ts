import axios, { type AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios'
import { ElMessage } from 'element-plus'
import { getToken, getUser } from '@/utils/storage'
import type { ApiResponse } from '@/types/api'

const request = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 20000,
})

const GENERIC_MESSAGES = new Set([
  'error',
  'ERROR',
  '未知错误',
  '操作失败',
  '请求失败',
  'fail',
  'FAIL',
])

function stringifyErrorData(data: unknown) {
  if (data == null || data === '') {
    return ''
  }
  if (typeof data === 'string' || typeof data === 'number' || typeof data === 'boolean') {
    return String(data).trim()
  }
  if (typeof data === 'object' && 'message' in (data as Record<string, unknown>)) {
    const nested = (data as { message?: unknown }).message
    if (typeof nested === 'string' && nested.trim()) {
      return nested.trim()
    }
  }
  try {
    return JSON.stringify(data)
  } catch {
    return ''
  }
}

/** 后台未知错误 message 常为 ERROR/未知错误，真正提示在 data */
function formatApiErrorTip(message?: string, data?: unknown, fallback = '请求失败') {
  const detail = stringifyErrorData(data)
  if (detail) {
    return detail
  }
  const msg = (message || '').trim()
  if (msg && !GENERIC_MESSAGES.has(msg)) {
    return msg
  }
  if (msg) {
    return msg
  }
  return fallback
}

request.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getToken()
  const user = getUser()

  if (token) {
    config.headers.Authorization = token
  }
  if (user) {
    config.headers['Jee-User-Id'] = user.id
    config.headers['Jee-User-Name'] = user.username
  }
  config.headers['Jee-Upload-Endpoint-Name'] = config.headers['Jee-Upload-Endpoint-Name'] ?? 'default'

  return config
})

request.interceptors.response.use(
  (response: AxiosResponse<ApiResponse>) => {
    const body = response.data
    const { code, data, message } = body

    // 对齐旧项目：仅 code === 200 为成功（业务失败常见 code: 0 + data 提示）
    if (code === 200) {
      // 兼容分页：total 与 data 同级（旧后端偶发）
      if (
        data != null &&
        typeof data === 'object' &&
        !Array.isArray(data) &&
        'total' in body &&
        !('total' in (data as Record<string, unknown>))
      ) {
        return {
          ...(data as Record<string, unknown>),
          total: (body as { total?: number }).total,
        } as never
      }
      // 兼容 data 直接为数组，total 在外层
      if (Array.isArray(data) && 'total' in body) {
        return {
          data,
          list: data,
          total: (body as { total?: number }).total ?? data.length,
        } as never
      }
      return data as never
    }

    const tip = formatApiErrorTip(message, data)
    ElMessage.error(tip)
    return Promise.reject(new Error(tip))
  },
  async (error: AxiosError<ApiResponse>) => {
    const status = error.response?.status
    const body = error.response?.data
    const message = body?.message
    const data = body?.data
    const tip = formatApiErrorTip(
      message,
      data,
      status ? `请求失败（${status}）` : error.message || '网络异常',
    )

    if (status === 401) {
      const [{ useUserStore }, { default: router }] = await Promise.all([
        import('@/stores/user'),
        import('@/router'),
      ])
      const userStore = useUserStore()
      await userStore.logout()
      await router.push({
        path: '/login',
        query: { redirect: router.currentRoute.value.fullPath },
      })
      ElMessage.error('登录已过期，请重新登录')
      return Promise.reject(new Error(tip))
    }

    ElMessage.error(tip)
    return Promise.reject(new Error(tip))
  },
)

export default request
