import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import * as authApi from '@/api/auth'
import { clearAuthStorage, getToken, getUser, setToken, setUser } from '@/utils/storage'
import type { LoginParams, UserInfo } from '@/types/api'

export const useUserStore = defineStore('user', () => {
  const token = ref(getToken())
  const userInfo = ref<UserInfo | null>(getUser())

  const isLoggedIn = computed(() => Boolean(token.value))
  const permissions = computed(() => userInfo.value?.permissions ?? [])

  function applyAuth(nextToken: string, user: UserInfo) {
    token.value = nextToken
    userInfo.value = user
    setToken(nextToken)
    setUser(user)
  }

  function clearAuth() {
    token.value = ''
    userInfo.value = null
    clearAuthStorage()
  }

  async function login(params: LoginParams) {
    const result = await authApi.login(params)
    const nextToken = `${result.token_type} ${result.access_token}`
    applyAuth(nextToken, result.user)
  }

  async function fetchUserInfo() {
    const user = await authApi.getCurrentUser()
    userInfo.value = user
    setUser(user)
  }

  function hasPermission(permission?: string) {
    if (!permission) {
      return true
    }
    if (permission.startsWith('/')) {
      return true
    }
    return permissions.value.includes(permission)
  }

  async function logout() {
    try {
      await authApi.logout()
    } finally {
      const [{ usePermissionStore }, { useDictionaryStore }, { useTagsViewStore }] =
        await Promise.all([
          import('@/stores/permission'),
          import('@/stores/dictionary'),
          import('@/stores/tags-view'),
        ])
      usePermissionStore().resetPermission()
      useDictionaryStore().reset()
      useTagsViewStore().resetTagsView()
      clearAuth()
    }
  }

  return {
    token,
    userInfo,
    isLoggedIn,
    permissions,
    login,
    fetchUserInfo,
    hasPermission,
    logout,
    clearAuth,
  }
})
