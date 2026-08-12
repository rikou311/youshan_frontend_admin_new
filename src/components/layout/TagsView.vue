<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { ComponentPublicInstance } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Close } from '@element-plus/icons-vue'
import { useTagsViewStore, type TagView } from '@/stores/tags-view'

const route = useRoute()
const router = useRouter()
const tagsViewStore = useTagsViewStore()

const visible = ref(false)
const top = ref(0)
const left = ref(0)
const selectedTag = ref<TagView | null>(null)
const scrollRef = ref<HTMLElement | null>(null)
const tagElMap = new Map<string, HTMLElement>()

function setTagRef(el: Element | ComponentPublicInstance | null, path: string) {
  if (!el) {
    tagElMap.delete(path)
    return
  }
  const node = el instanceof HTMLElement ? el : ((el as ComponentPublicInstance).$el as HTMLElement)
  if (node) {
    tagElMap.set(path, node)
  }
}

function isActive(tag: TagView) {
  return tag.path === route.path
}

function isAffix(tag: TagView) {
  return Boolean(tag.meta?.affix)
}

function addTags() {
  if (!route.name || route.meta?.hidden || route.name === 'Redirect') {
    return
  }
  tagsViewStore.addView(route)
}

function moveToCurrentTag() {
  nextTick(() => {
    const current = tagElMap.get(route.path)
    const container = scrollRef.value
    if (!current || !container) {
      return
    }
    const cRect = container.getBoundingClientRect()
    const tRect = current.getBoundingClientRect()
    if (tRect.left < cRect.left) {
      container.scrollLeft -= cRect.left - tRect.left + 12
    } else if (tRect.right > cRect.right) {
      container.scrollLeft += tRect.right - cRect.right + 12
    }
    tagsViewStore.updateVisitedView(route)
  })
}

function toLastView(visitedViews: TagView[]) {
  const latest = visitedViews[visitedViews.length - 1]
  if (latest) {
    void router.push(latest.fullPath)
    return
  }
  void router.push('/dashboard')
}

function closeSelectedTag(tag: TagView) {
  if (isAffix(tag)) {
    return
  }
  const { visitedViews } = tagsViewStore.delView(tag)
  if (isActive(tag)) {
    toLastView(visitedViews)
  }
}

function closeOthersTags() {
  if (!selectedTag.value) {
    return
  }
  void router.push(selectedTag.value.fullPath)
  tagsViewStore.delOthersViews(selectedTag.value)
  moveToCurrentTag()
}

function closeAllTags() {
  const current = selectedTag.value
  const { visitedViews } = tagsViewStore.delAllViews()
  if (current && isAffix(current)) {
    return
  }
  toLastView(visitedViews)
}

async function refreshSelectedTag() {
  const tag = selectedTag.value
  if (!tag?.name) {
    return
  }
  tagsViewStore.delCachedView(tag)
  const { fullPath } = tag
  await nextTick()
  await router.replace(`/redirect${fullPath}`)
}

function openMenu(tag: TagView, e: MouseEvent) {
  const menuMinWidth = 105
  const el = e.currentTarget as HTMLElement
  const container = el.parentElement?.parentElement
  if (!container) {
    return
  }
  const offsetLeft = container.getBoundingClientRect().left
  const offsetWidth = container.offsetWidth
  const maxLeft = offsetWidth - menuMinWidth
  const nextLeft = e.clientX - offsetLeft + 15
  left.value = nextLeft > maxLeft ? maxLeft : nextLeft
  top.value = e.clientY - container.getBoundingClientRect().top + 10
  visible.value = true
  selectedTag.value = tag
}

function closeMenu() {
  visible.value = false
}

watch(
  () => route.fullPath,
  () => {
    addTags()
    moveToCurrentTag()
  },
)

watch(visible, (value) => {
  if (value) {
    document.body.addEventListener('click', closeMenu)
  } else {
    document.body.removeEventListener('click', closeMenu)
  }
})

onMounted(() => {
  addTags()
})

onBeforeUnmount(() => {
  document.body.removeEventListener('click', closeMenu)
})
</script>

<template>
  <div class="tags-view">
    <div ref="scrollRef" class="tags-view__scroll">
      <router-link
        v-for="tag in tagsViewStore.visitedViews"
        :key="tag.path"
        :ref="(el) => setTagRef(el as Element | ComponentPublicInstance | null, tag.path)"
        :to="{ path: tag.path, query: tag.query }"
        class="tags-view__item"
        :class="{ 'is-active': isActive(tag) }"
        @click.middle.prevent="closeSelectedTag(tag)"
        @contextmenu.prevent="openMenu(tag, $event)"
      >
        <span class="tags-view__title">{{ tag.title }}</span>
        <el-icon
          v-if="!isAffix(tag)"
          class="tags-view__close"
          @click.prevent.stop="closeSelectedTag(tag)"
        >
          <Close />
        </el-icon>
      </router-link>
    </div>

    <ul
      v-show="visible"
      class="tags-view__menu"
      :style="{ left: `${left}px`, top: `${top}px` }"
    >
      <li @click="refreshSelectedTag">刷新</li>
      <li v-if="selectedTag && !isAffix(selectedTag)" @click="closeSelectedTag(selectedTag)">
        关闭
      </li>
      <li @click="closeOthersTags">关闭其他</li>
      <li @click="closeAllTags">关闭全部</li>
    </ul>
  </div>
</template>

<style scoped lang="scss">
.tags-view {
  position: relative;
  height: 34px;
  width: 100%;
  background: #fff;
  border-bottom: 1px solid #d8dce5;
  box-shadow:
    0 1px 3px 0 rgb(0 0 0 / 12%),
    0 0 3px 0 rgb(0 0 0 / 4%);

  &__scroll {
    white-space: nowrap;
    overflow-x: auto;
    overflow-y: hidden;
    height: 100%;

    &::-webkit-scrollbar {
      height: 0;
    }
  }

  &__item {
    display: inline-flex;
    align-items: center;
    position: relative;
    cursor: pointer;
    height: 26px;
    line-height: 26px;
    border: 1px solid #d8dce5;
    color: #495060;
    background: #fff;
    padding: 0 8px;
    font-size: 12px;
    margin-left: 5px;
    margin-top: 4px;
    text-decoration: none;
    border-radius: 2px;

    &:first-of-type {
      margin-left: 15px;
    }

    &:last-of-type {
      margin-right: 15px;
    }

    &.is-active {
      background-color: #42b983;
      color: #fff;
      border-color: #42b983;

      &::before {
        content: '';
        background: #fff;
        display: inline-block;
        width: 8px;
        height: 8px;
        border-radius: 50%;
        margin-right: 4px;
      }
    }
  }

  &__close {
    margin-left: 4px;
    width: 14px;
    height: 14px;
    border-radius: 50%;
    transition: all 0.2s;

    &:hover {
      background-color: #b4bccc;
      color: #fff;
    }
  }

  &__menu {
    margin: 0;
    background: #fff;
    z-index: 3000;
    position: absolute;
    list-style: none;
    padding: 5px 0;
    border-radius: 4px;
    font-size: 12px;
    color: #333;
    box-shadow: 2px 2px 3px 0 rgb(0 0 0 / 30%);

    li {
      margin: 0;
      padding: 7px 16px;
      cursor: pointer;

      &:hover {
        background: #eee;
      }
    }
  }
}
</style>
