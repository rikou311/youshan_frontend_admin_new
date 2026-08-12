import { getToken, getUser } from '@/utils/storage'

const uploadBase = import.meta.env.VITE_UPLOAD_API || '/jee-fk/resource'
const resourceImgBase = import.meta.env.VITE_UPLOAD_API_IMG || '/public/resources'

export function getPublicUploadUrl() {
  return `${uploadBase}/public`
}

export function getModuleUploadUrl() {
  return `${uploadBase}/module`
}

/** 修复 https//xxx、重复粘贴的绝对地址等 */
function normalizeMaybeAbsoluteUrl(path: string) {
  let raw = path.trim()
  if (!raw) {
    return ''
  }

  // https//host/... → https://host/...
  raw = raw.replace(/^(https?):\/+(?!\/)/i, '$1://')
  // https:///host → https://host
  raw = raw.replace(/^(https?):\/{3,}/i, '$1://')

  // https://hosthttps://host/path 或 https://hosthttps//host/path → 取后一段绝对地址
  const glued = raw.match(/^(https?:\/\/[^/]+?)(https?:\/+.+)$/i)
  if (glued?.[2]) {
    raw = glued[2].replace(/^(https?):\/+(?!\/)/i, '$1://')
  }

  return raw
}

export function getResourceImgUrl(path?: string | null) {
  if (path === undefined || path === null || path === '') {
    return ''
  }

  const raw = normalizeMaybeAbsoluteUrl(String(path))
  if (!raw) {
    return ''
  }

  // 已是绝对地址，直接返回，禁止再拼 base
  if (/^https?:\/\//i.test(raw)) {
    return raw
  }
  if (raw.startsWith('//')) {
    return `https:${raw}`
  }

  // 已是带域名的路径（常见 S3），补全协议
  if (/\.amazonaws\.com(\/|$)/i.test(raw) || /^[\w.-]+\.[a-z]{2,}\//i.test(raw)) {
    return `https://${raw.replace(/^\/+/, '')}`
  }

  const base = String(resourceImgBase || '').replace(/\/+$/, '')
  const relative = raw.replace(/^\/+/, '')
  if (!base) {
    return `/${relative}`
  }

  // base 本身若被配成绝对地址，且 relative 也像绝对地址时不再拼接
  if (/^https?:/i.test(relative) || relative.includes('://')) {
    return normalizeMaybeAbsoluteUrl(relative)
  }

  return `${base}/${relative}`
}

export function getUploadHeaders() {
  const token = getToken()
  const user = getUser()
  return {
    Authorization: token,
    'Jee-User-Id': user?.id ? String(user.id) : '',
    'Jee-User-Name': user?.username ?? '',
    'Jee-Upload-Endpoint-Name': 'default',
  }
}

export function getFlowUploadHeaders() {
  return {
    ...getUploadHeaders(),
    'Jee-Upload-Endpoint-Name': 'flow',
  }
}

export interface UploadResponseItem {
  url: string
}

export function resolveUploadImageUrl(response: {
  code?: number
  data?: UploadResponseItem[]
}) {
  if (response.code === 200 && response.data?.length) {
    return getResourceImgUrl(response.data[0].url)
  }
  return ''
}
