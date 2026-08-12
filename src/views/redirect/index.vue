<script setup lang="ts">
import { onBeforeMount } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

onBeforeMount(() => {
  const { params, query } = route
  const raw = params.path
  const path = Array.isArray(raw) ? raw.join('/') : String(raw || '')
  router.replace({ path: `/${path}`.replace(/\/+/g, '/'), query })
})
</script>

<template>
  <div />
</template>
