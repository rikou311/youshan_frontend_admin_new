<script setup lang="ts">
import ImageUploadField from '@/components/upload/ImageUploadField.vue'
import RichTextEditor from '@/components/editor/RichTextEditor.vue'
import type { FormFieldItem } from '@/utils/form-design'

defineOptions({ name: 'FormFieldPreview' })

interface Props {
  field: FormFieldItem
  model: Record<string, unknown>
  disabled?: boolean
}

withDefaults(defineProps<Props>(), {
  disabled: true,
})
</script>

<template>
  <template v-if="field.type === 'title'">
    <div :style="field.styles">{{ field.value || field.label }}</div>
  </template>

  <el-form-item
    v-else-if="field.type !== 'group' && field.type !== 'dynamic'"
    :label="field.label"
    :required="field.required"
    :prop="field.prop"
  >
    <el-input
      v-if="field.type === 'input' || field.type === 'password'"
      v-model="model[field.prop!]"
      :type="field.type === 'password' ? 'password' : 'text'"
      :placeholder="field.placeholder"
      :disabled="disabled"
    />
    <el-input
      v-else-if="field.type === 'textarea'"
      v-model="model[field.prop!]"
      type="textarea"
      :rows="3"
      :placeholder="field.placeholder"
      :disabled="disabled"
    />
    <el-input-number
      v-else-if="field.type === 'number'"
      v-model="model[field.prop!] as number"
      :controls="field.controls !== false"
      :disabled="disabled"
    />
    <el-select
      v-else-if="field.type === 'select'"
      v-model="model[field.prop!]"
      :multiple="field.multiple"
      :disabled="disabled"
      style="width: 100%"
    >
      <el-option
        v-for="opt in field.dicData || []"
        :key="String(opt.value)"
        :label="opt.label"
        :value="opt.value"
      />
    </el-select>
    <el-radio-group
      v-else-if="field.type === 'radio'"
      v-model="model[field.prop!]"
      :disabled="disabled"
    >
      <el-radio v-for="opt in field.dicData || []" :key="String(opt.value)" :value="opt.value">
        {{ opt.label }}
      </el-radio>
    </el-radio-group>
    <el-checkbox-group
      v-else-if="field.type === 'checkbox'"
      v-model="model[field.prop!] as Array<string | number | boolean>"
      :disabled="disabled"
    >
      <el-checkbox
        v-for="opt in field.dicData || []"
        :key="String(opt.value)"
        :value="opt.value"
      >
        {{ opt.label }}
      </el-checkbox>
    </el-checkbox-group>
    <el-cascader
      v-else-if="field.type === 'cascader'"
      v-model="model[field.prop!]"
      :options="(field.dicData || []) as never"
      :props="{ checkStrictly: field.checkStrictly, label: 'label', value: 'value', children: 'children' }"
      :disabled="disabled"
      clearable
      style="width: 100%"
    />
    <el-switch
      v-else-if="field.type === 'switch'"
      v-model="model[field.prop!] as boolean"
      :disabled="disabled"
    />
    <el-rate
      v-else-if="field.type === 'rate'"
      v-model="model[field.prop!] as number"
      :max="field.max || 5"
      :disabled="disabled"
    />
    <el-slider
      v-else-if="field.type === 'slider'"
      v-model="model[field.prop!] as number"
      :min="field.min ?? 0"
      :max="field.max ?? 100"
      :step="field.step ?? 1"
      :disabled="disabled"
    />
    <el-time-picker
      v-else-if="field.type === 'time'"
      v-model="model[field.prop!]"
      :disabled="disabled"
      style="width: 100%"
    />
    <el-date-picker
      v-else-if="field.type === 'date' || field.type === 'datetime' || field.type === 'daterange' || field.type === 'datetimerange'"
      v-model="model[field.prop!]"
      :type="field.type"
      :disabled="disabled"
      style="width: 100%"
    />
    <ImageUploadField
      v-else-if="field.type === 'upload'"
      v-model="model[field.prop!] as string"
      tip="设计器预览：上传走公共资源接口"
    />
    <RichTextEditor
      v-else-if="field.type === 'ueditor'"
      v-model="model[field.prop!] as string"
      :height="220"
      :disabled="disabled"
      :placeholder="field.placeholder"
    />
    <el-input v-else v-model="model[field.prop!]" :disabled="disabled" />
  </el-form-item>

  <div v-else-if="field.type === 'group'" class="form-field-preview__group">
    <div class="form-field-preview__group-title">{{ field.label }}</div>
    <FormFieldPreview
      v-for="(child, index) in field.children || []"
      :key="`${child.prop || child.type}-${index}`"
      :field="child"
      :model="model"
      :disabled="disabled"
    />
    <el-empty v-if="!(field.children || []).length" description="分组内暂无字段" :image-size="48" />
  </div>

  <div v-else class="form-field-preview__dynamic">
    <div class="form-field-preview__group-title">{{ field.label }}（动态子表）</div>
    <el-table :data="[{}]" border size="small" style="width: 100%">
      <el-table-column
        v-for="(child, index) in field.children || []"
        :key="`${child.prop || child.type}-${index}`"
        :label="child.label"
        min-width="120"
      >
        <template #default>
          <span class="form-field-preview__placeholder">{{ child.type }}</span>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="80" align="center">
        <template #default>
          <el-button link type="danger" size="small" disabled>删除</el-button>
        </template>
      </el-table-column>
    </el-table>
    <el-button class="form-field-preview__add-row" type="primary" link disabled>+ 新增一行</el-button>
  </div>
</template>

<style scoped lang="scss">
.form-field-preview {
  &__group,
  &__dynamic {
    padding: 8px;
    border: 1px solid #ebeef5;
    border-radius: 4px;
    background: #fafafa;
  }

  &__group-title {
    margin-bottom: 8px;
    font-weight: 600;
    color: #303133;
  }

  &__placeholder {
    color: #909399;
    font-size: 12px;
  }

  &__add-row {
    margin-top: 8px;
  }
}
</style>
