<script setup lang="ts">
import { computed } from 'vue'
import { getSvgIconRaw } from '@/icons'

const props = defineProps<{
  name: string
  className?: string
}>()

const raw = computed(() => getSvgIconRaw(props.name) || '')

const viewBox = computed(() => {
  const matched = raw.value.match(/\sviewBox=["']([^"']+)["']/)
  if (matched?.[1]) {
    return matched[1]
  }
  const width = raw.value.match(/\swidth=["'](\d+(?:\.\d+)?)["']/)?.[1]
  const height = raw.value.match(/\sheight=["'](\d+(?:\.\d+)?)["']/)?.[1]
  if (width && height) {
    return `0 0 ${width} ${height}`
  }
  return '0 0 1024 1024'
})

const innerHtml = computed(() =>
  raw.value
    .replace(/<\?xml[\s\S]*?\?>/g, '')
    .replace(/<!DOCTYPE[\s\S]*?>/gi, '')
    .replace(/<svg[^>]*>/i, '')
    .replace(/<\/svg>/i, '')
    .trim(),
)

const svgClass = computed(() => ['svg-icon', props.className].filter(Boolean).join(' '))
</script>

<template>
  <svg :class="svgClass" :viewBox="viewBox" aria-hidden="true" v-html="innerHtml" />
</template>

<style scoped>
.svg-icon {
  width: 1em;
  height: 1em;
  vertical-align: -0.15em;
  fill: currentColor;
  overflow: hidden;
}
</style>
