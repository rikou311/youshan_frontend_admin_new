import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { usePermissionStore } from '@/stores/permission'
import type { PageButtonMap } from '@/types/permission'

function resolvePageButtons(
  pageButtons: PageButtonMap,
  routePath: string,
  permission?: unknown,
): PageButtonMap[string] {
  const candidates = [
    routePath,
    routePath.endsWith('/index') ? routePath.replace(/\/index$/, '') : `${routePath}/index`,
    typeof permission === 'string' ? permission : '',
  ].filter(Boolean)

  for (const key of candidates) {
    const matched = pageButtons[key]
    if (matched && Object.keys(matched).length) {
      return matched
    }
  }

  // 旧版曾按页面相对 path（如 /merchant/order）存按钮
  const segments = routePath.replace(/\/+$/, '').split('/').filter(Boolean)
  for (let i = 0; i < segments.length - 1; i++) {
    const shortPath = `/${segments.slice(i).join('/')}`
    const matched = pageButtons[shortPath] ?? pageButtons[`${shortPath}/index`]
    if (matched && Object.keys(matched).length) {
      return matched
    }
  }

  return {}
}

export function usePageButtons() {
  const route = useRoute()
  const permissionStore = usePermissionStore()

  const buttons = computed(() =>
    resolvePageButtons(permissionStore.pageButtons, route.path, route.meta.permission),
  )

  function hasButton(name: string) {
    return Boolean(buttons.value[name])
  }

  return {
    buttons,
    hasButton,
  }
}
