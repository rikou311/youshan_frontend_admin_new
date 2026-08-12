<script setup lang="ts">
import { computed } from 'vue'
import TagTemplateSheet from '@/components/tag/TagTemplateSheet.vue'
import type { TagLabelRecord } from '@/types/tag-label'
import type { TagTemplateLayoutForm } from '@/types/tag-template-layout'
import { chunkLabelsByPage } from '@/utils/tag-template-print'

interface Props {
  layout: TagTemplateLayoutForm
  labels: TagLabelRecord[]
  printMode?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  printMode: false,
})

const pages = computed(() => chunkLabelsByPage(props.layout, props.labels))
</script>

<template>
  <div class="tag-template-batch" :class="{ 'tag-template-batch--print': printMode }">
    <TagTemplateSheet
      v-for="(pageLabels, pageIndex) in pages"
      :key="pageIndex"
      :layout="layout"
      :label="null"
      :cell-labels="pageLabels"
      :print-mode="printMode"
      class="tag-template-batch__page"
    />
  </div>
</template>

<style scoped lang="scss">
.tag-template-batch {
  display: flex;
  flex-direction: column;
  gap: 16px;

  &__page {
    margin: 0 auto;
  }

  &--print {
    gap: 0;
  }
}

@media print {
  .tag-template-batch {
    gap: 0;
  }

  .tag-template-batch__page {
    page-break-after: always;
    break-after: page;
  }

  .tag-template-batch__page:last-child {
    page-break-after: auto;
    break-after: auto;
  }
}
</style>
