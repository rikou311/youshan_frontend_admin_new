<script setup lang="ts">
import { computed } from 'vue'
import SvgIcon from '@/components/SvgIcon.vue'
import { resolveMenuIcon } from '@/utils/menu-icon'

const props = defineProps<{
  name?: string
}>()

const resolved = computed(() => resolveMenuIcon(props.name))
</script>

<template>
  <el-icon v-if="resolved?.type === 'ep'" class="menu-icon">
    <component :is="resolved.component" />
  </el-icon>
  <SvgIcon v-else-if="resolved?.type === 'svg'" :name="resolved.name" class-name="menu-icon" />
</template>

<style scoped>
.menu-icon {
  margin-right: 8px;
  width: 1em;
  height: 1em;
  font-size: 18px;
  vertical-align: middle;
}
</style>
