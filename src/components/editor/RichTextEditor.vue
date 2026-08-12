<script setup lang="ts">
import { computed, onBeforeUnmount, shallowRef, watch } from 'vue'
import { Editor, Toolbar } from '@wangeditor/editor-for-vue'
import type { IDomEditor, IEditorConfig, IToolbarConfig } from '@wangeditor/editor'
import '@wangeditor/editor/dist/css/style.css'
import {
  getPublicUploadUrl,
  getUploadHeaders,
  resolveUploadImageUrl,
} from '@/utils/upload'

interface Props {
  modelValue?: string
  height?: number
  placeholder?: string
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: '',
  height: 360,
  placeholder: '请输入内容',
  disabled: false,
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const editorRef = shallowRef<IDomEditor | null>(null)
const html = shallowRef(props.modelValue || '')
let syncingFromProp = false

watch(
  () => props.modelValue,
  (value) => {
    const next = value || ''
    if (next === html.value) {
      return
    }
    syncingFromProp = true
    html.value = next
    syncingFromProp = false
  },
)

watch(html, (value) => {
  if (syncingFromProp) {
    return
  }
  emit('update:modelValue', value)
})

watch(
  () => props.disabled,
  (disabled) => {
    const editor = editorRef.value
    if (!editor) {
      return
    }
    if (disabled) {
      editor.disable()
    } else {
      editor.enable()
    }
  },
)

const toolbarConfig: Partial<IToolbarConfig> = {
  excludeKeys: ['group-video', 'fullScreen'],
}

const editorConfig = computed<Partial<IEditorConfig>>(() => ({
  placeholder: props.placeholder,
  readOnly: props.disabled,
  MENU_CONF: {
    uploadImage: {
      server: getPublicUploadUrl(),
      fieldName: 'file',
      headers: getUploadHeaders(),
      customInsert(
        res: { code?: number; data?: Array<{ url: string }> },
        insertFn: (url: string, alt?: string, href?: string) => void,
      ) {
        const url = resolveUploadImageUrl(res)
        if (!url) {
          throw new Error('图片上传失败')
        }
        insertFn(url, 'image', url)
      },
    },
  },
}))

const editorStyle = computed(() => ({
  height: `${props.height}px`,
  overflowY: 'hidden' as const,
}))

function handleCreated(editor: IDomEditor) {
  editorRef.value = editor
  if (props.disabled) {
    editor.disable()
  }
}

onBeforeUnmount(() => {
  const editor = editorRef.value
  if (!editor) {
    return
  }
  editor.destroy()
  editorRef.value = null
})
</script>

<template>
  <div class="rich-text-editor" :class="{ 'is-disabled': disabled }">
    <Toolbar
      class="rich-text-editor__toolbar"
      :editor="editorRef"
      :default-config="toolbarConfig"
      mode="default"
    />
    <Editor
      v-model="html"
      class="rich-text-editor__body"
      :default-config="editorConfig"
      :style="editorStyle"
      mode="default"
      @on-created="handleCreated"
    />
  </div>
</template>

<style scoped lang="scss">
.rich-text-editor {
  width: 100%;
  border: 1px solid var(--el-border-color);
  border-radius: 4px;
  overflow: hidden;
  background: #fff;

  &__toolbar {
    border-bottom: 1px solid var(--el-border-color);
  }

  &__body {
    :deep(.w-e-text-container) {
      background: #fff;
    }
  }

  &.is-disabled {
    opacity: 0.85;
  }
}
</style>
