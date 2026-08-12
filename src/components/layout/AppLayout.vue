<script setup lang="ts">
import { storeToRefs } from 'pinia'
import AppHeader from './AppHeader.vue'
import AppSidebar from './AppSidebar.vue'
import TagsView from './TagsView.vue'
import { useTagsViewStore } from '@/stores/tags-view'

const tagsViewStore = useTagsViewStore()
const { cachedViews } = storeToRefs(tagsViewStore)
</script>

<template>
  <el-container class="app-layout">
    <AppSidebar />
    <el-container class="app-layout__main">
      <AppHeader />
      <TagsView />
      <el-main class="app-layout__content">
        <router-view v-slot="{ Component }">
          <keep-alive :include="cachedViews">
            <component :is="Component" />
          </keep-alive>
        </router-view>
      </el-main>
    </el-container>
  </el-container>
</template>

<style scoped lang="scss">
.app-layout {
  height: 100vh;

  &__main {
    flex-direction: column;
  }

  &__content {
    padding: var(--page-padding);
    background: var(--color-bg-page);
  }
}
</style>
