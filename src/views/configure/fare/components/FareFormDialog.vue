<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import type { FormInstance, FormRules } from 'element-plus'
import { ElMessage } from 'element-plus'
import { addFare, updateFare, type FareForm } from '@/api/configure'
import { queryDictionaryGroups } from '@/api/dictionary'
import { getDictionaryOptions } from '@/utils/dictionary'
import { saveDictionary } from '@/utils/storage'

interface Props {
  visible: boolean
  mode: 'add' | 'edit'
  model?: FareForm | null
}

const props = defineProps<Props>()
const emit = defineEmits<{
  success: []
  'update:visible': [value: boolean]
}>()

const formRef = ref<FormInstance>()
const loading = ref(false)
const dictTick = ref(0)
const form = reactive<FareForm>({
  title: '',
  fare: 0,
  usertype: '',
  type: '',
})

const userTypeOptions = computed(() => {
  void dictTick.value
  return getDictionaryOptions('user_type')
})

const fareTypeOptions = computed(() => {
  void dictTick.value
  return getDictionaryOptions('fare_type')
})

const rules: FormRules<FareForm> = {
  title: [{ required: true, message: '请输入名称', trigger: 'blur' }],
  usertype: [{ required: true, message: '请选择用户类型', trigger: 'change' }],
  type: [{ required: true, message: '请选择运费类型', trigger: 'change' }],
}

async function ensureDictionaries() {
  try {
    const data = await queryDictionaryGroups(['fare_type', 'user_type'])
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
  () => props.visible,
  async (visible) => {
    if (!visible) {
      return
    }
    await ensureDictionaries()
    Object.assign(
      form,
      props.mode === 'edit' && props.model
        ? {
            ...props.model,
            usertype: props.model.usertype != null ? String(props.model.usertype) : '',
            type: props.model.type != null ? String(props.model.type) : '',
          }
        : {
            id: undefined,
            title: '',
            fare: 0,
            usertype: '',
            type: '',
          },
    )
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
    const payload: FareForm = {
      ...form,
      usertype: form.usertype != null ? String(form.usertype) : '',
      type: form.type != null ? String(form.type) : '',
    }
    if (props.mode === 'add') {
      await addFare(payload)
      ElMessage.success('新增成功')
    } else {
      await updateFare(payload)
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
    :title="mode === 'add' ? '创建运费' : '更新运费'"
    width="70%"
    destroy-on-close
    @close="closeDialog"
  >
    <el-form ref="formRef" :model="form" :rules="rules" label-width="150px" class="fare-form">
      <el-form-item label="名称" prop="title">
        <el-input v-model="form.title" placeholder="名称" />
      </el-form-item>
      <el-form-item label="费用" prop="fare">
        <el-input-number v-model="form.fare" :min="0" placeholder="费用" />
      </el-form-item>
      <el-form-item label="用户类型" prop="usertype">
        <el-select v-model="form.usertype" placeholder="请选择" style="width: 280px">
          <el-option
            v-for="item in userTypeOptions"
            :key="String(item.value)"
            :label="item.display"
            :value="String(item.value)"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="运费类型" prop="type">
        <el-select v-model="form.type" placeholder="请选择" style="width: 280px">
          <el-option
            v-for="item in fareTypeOptions"
            :key="String(item.value)"
            :label="item.display"
            :value="String(item.value)"
          />
        </el-select>
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="closeDialog">取消</el-button>
      <el-button type="primary" :loading="loading" @click="handleSubmit">保存</el-button>
    </template>
  </el-dialog>
</template>

<style scoped lang="scss">
.fare-form {
  max-width: 720px;
}
</style>
