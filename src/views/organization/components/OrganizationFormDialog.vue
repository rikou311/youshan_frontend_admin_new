<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import type { FormInstance, FormRules } from 'element-plus'
import { ElMessage } from 'element-plus'
import { addOrganization, updateOrganization, type OrganizationForm } from '@/api/system'
import { queryDictionaryGroups } from '@/api/dictionary'
import { getDictionaryOptions, getYesNoOptions } from '@/utils/dictionary'
import { saveDictionary } from '@/utils/storage'

interface Props {
  visible: boolean
  mode: 'add' | 'edit'
  model?: OrganizationForm | null
}

const props = defineProps<Props>()
const emit = defineEmits<{
  success: []
  'update:visible': [value: boolean]
}>()

const formRef = ref<FormInstance>()
const loading = ref(false)
const dictTick = ref(0)
const form = reactive<OrganizationForm>({
  name: '',
  type: '',
  superid: '0',
  superName: '无',
  sort: 1,
  address: '',
  active: '1',
})

const organizationTypeOptions = computed(() => {
  void dictTick.value
  return getDictionaryOptions('organization_type')
})

const yesNoOptions = computed(() => {
  void dictTick.value
  return getYesNoOptions()
})

const rules: FormRules<OrganizationForm> = {
  name: [{ required: true, message: '请输入名称', trigger: 'blur' }],
  type: [{ required: true, message: '请选择类型', trigger: 'change' }],
  sort: [{ required: true, message: '请输入排序', trigger: 'blur' }],
  active: [{ required: true, message: '请选择是否有效', trigger: 'change' }],
}

async function ensureDictionaries() {
  try {
    const data = await queryDictionaryGroups(['yesno', 'organization_type'])
    Object.entries(data).forEach(([groupId, values]) => {
      if (Array.isArray(values) && values.length) {
        saveDictionary(groupId, values)
      }
    })
  } catch {
    // ignore
  } finally {
    dictTick.value += 1
  }
}

watch(
  () => [props.visible, props.model, props.mode] as const,
  async ([visible]) => {
    if (!visible) {
      return
    }
    await ensureDictionaries()
    if (props.model) {
      Object.assign(form, props.model)
      return
    }
    Object.assign(form, {
      id: undefined,
      name: '',
      type: '',
      superid: '0',
      superName: '无',
      sort: 1,
      address: '',
      active: '1',
    })
  },
)

function closeDialog() {
  emit('update:visible', false)
}

async function handleSubmit() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) {
    return
  }

  loading.value = true
  try {
    const payload: OrganizationForm = {
      ...form,
      sort: Number(form.sort),
      active: Number(form.active),
      superid: form.superid ?? '0',
    }
    if (props.mode === 'add') {
      await addOrganization(payload)
      ElMessage.success('新增成功')
    } else {
      await updateOrganization(payload)
      ElMessage.success('更新成功')
    }
    emit('success')
    closeDialog()
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <el-dialog
    :model-value="visible"
    :title="mode === 'add' ? '添加' : '编辑'"
    width="800px"
    destroy-on-close
    @close="closeDialog"
  >
    <el-form ref="formRef" :model="form" :rules="rules" label-width="90px" class="org-form">
      <el-row :gutter="12">
        <el-col :span="12">
          <el-form-item label="名称" prop="name">
            <el-input v-model="form.name" placeholder="请输入名称" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="类型" prop="type">
            <el-select v-model="form.type" placeholder="请选择类型" style="width: 100%">
              <el-option
                v-for="item in organizationTypeOptions"
                :key="String(item.value)"
                :label="item.display"
                :value="String(item.value)"
              />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="上级">
            {{ form.superName || '无' }}
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="排序" prop="sort">
            <el-input v-model="form.sort" placeholder="请输入排序" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="地址" prop="address">
            <el-input v-model="form.address" placeholder="请输入地址,添加分公司会需要" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="有效" prop="active">
            <el-radio-group v-model="form.active">
              <el-radio
                v-for="item in yesNoOptions"
                :key="String(item.value)"
                :value="String(item.value)"
              >
                {{ item.display }}
              </el-radio>
            </el-radio-group>
          </el-form-item>
        </el-col>
      </el-row>
    </el-form>
    <template #footer>
      <el-button @click="closeDialog">取消</el-button>
      <el-button type="primary" :loading="loading" @click="handleSubmit">确定</el-button>
    </template>
  </el-dialog>
</template>

<style scoped lang="scss">
.org-form {
  display: flex;
  flex-wrap: wrap;
}
</style>
