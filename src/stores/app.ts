import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { SIDEBAR_STATUS_KEY } from '@/constants/storage'

function readSidebarOpened() {
  const raw = localStorage.getItem(SIDEBAR_STATUS_KEY)
  if (raw === null) {
    return true
  }
  return raw === '1'
}

export const useAppStore = defineStore('app', () => {
  const sidebarOpened = ref(readSidebarOpened())
  const withoutAnimation = ref(false)

  const isCollapse = computed(() => !sidebarOpened.value)

  function persistSidebar() {
    localStorage.setItem(SIDEBAR_STATUS_KEY, sidebarOpened.value ? '1' : '0')
  }

  function toggleSideBar() {
    sidebarOpened.value = !sidebarOpened.value
    withoutAnimation.value = false
    persistSidebar()
  }

  function closeSideBar(options?: { withoutAnimation?: boolean }) {
    sidebarOpened.value = false
    withoutAnimation.value = Boolean(options?.withoutAnimation)
    persistSidebar()
  }

  function openSideBar() {
    sidebarOpened.value = true
    withoutAnimation.value = false
    persistSidebar()
  }

  return {
    sidebarOpened,
    withoutAnimation,
    isCollapse,
    toggleSideBar,
    closeSideBar,
    openSideBar,
  }
})
