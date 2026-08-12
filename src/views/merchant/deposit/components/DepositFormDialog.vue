<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import type { FormInstance, FormRules } from 'element-plus'
import { ElMessage } from 'element-plus'
import {
  addMerchantDeposit,
  searchDepositBySender,
  searchMerchantUserByUnick,
  updateMerchantDeposit,
  type MerchantDepositForm,
  type MerchantDepositItem,
} from '@/api/merchant'
import { queryDictionaryGroups } from '@/api/dictionary'
import { useUserStore } from '@/stores/user'
import { formatDateToString } from '@/utils/format'
import { formatDictionary, getDictionaryOptions } from '@/utils/dictionary'
import { saveDictionary } from '@/utils/storage'

interface Props {
  visible: boolean
  mode: 'add' | 'edit'
  model?: MerchantDepositItem | null
}

const props = defineProps<Props>()
const emit = defineEmits<{
  success: []
  'update:visible': [value: boolean]
}>()

const userStore = useUserStore()
const formRef = ref<FormInstance>()
const loading = ref(false)
const loadingSender = ref(false)
const loadingUser = ref(false)
const senderOptions = ref<Array<{ label: string; value: string }>>([])
const userOptions = ref<Array<{ label: string; value: number; money?: number }>>([])
const dictTick = ref(0)
const locked = computed(() => String(form.state) === '0')

const bankOptions = computed(() => {
  void dictTick.value
  return getDictionaryOptions('deposit_type')
})

function formatStateLabel(value?: string | number | null) {
  void dictTick.value
  return formatDictionary('deposit_state', value ?? '') || String(value ?? '-')
}

const form = reactive<MerchantDepositForm>({
  sender: '',
  bank: '0',
  username: '',
  unick: '',
  deposit: 0,
  beforedeposit: 0,
  deposittime: '',
  state: 2,
  type: 0,
  remark: '',
  createtime: '',
  creater: '',
})

const rules: FormRules = {
  sender: [{ required: true, message: '请输入打款人', trigger: 'change' }],
  username: [{ required: true, message: '请选择商家', trigger: 'change' }],
  deposit: [{ required: true, message: '请输入入金金额', trigger: 'blur' }],
  deposittime: [{ required: true, message: '请选择打款时间', trigger: 'change' }],
}

function createEmptyForm(): MerchantDepositForm {
  const username = userStore.userInfo?.username ?? 'admin'
  return {
    sender: '',
    bank: '0',
    username: '',
    unick: '',
    deposit: 0,
    beforedeposit: 0,
    deposittime: formatDateToString(new Date()),
    state: 2,
    type: 0,
    remark: '',
    creater: username,
    updateuser: username,
  }
}

async function ensureDictionaries() {
  try {
    const data = await queryDictionaryGroups(['deposit_type', 'deposit_state'])
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
    senderOptions.value = []
    userOptions.value = []
    if (props.mode === 'edit' && props.model) {
      Object.assign(form, {
        id: props.model.id,
        sender: props.model.sender ?? '',
        bank: String(props.model.bank ?? '0'),
        username: props.model.username ?? '',
        unick: props.model.unick ?? props.model.name ?? '',
        deposit: Number(props.model.deposit ?? props.model.total ?? 0),
        beforedeposit: Number(props.model.beforedeposit ?? 0),
        deposittime: props.model.deposittime
          ? formatDateToString(new Date(props.model.deposittime))
          : formatDateToString(new Date()),
        state: props.model.state ?? props.model.status ?? 2,
        type: Number(props.model.type ?? 0),
        remark: props.model.remark ?? '',
        createtime: props.model.createtime ?? '',
        creater: props.model.creater ?? '',
        updateuser: userStore.userInfo?.username ?? 'admin',
      })
      if (form.sender) {
        senderOptions.value = [{ label: form.sender, value: form.sender }]
      }
      if (form.username) {
        userOptions.value = [
          {
            label: `${form.unick || form.username}「${form.username}」`,
            value: Number(form.username),
            money: form.beforedeposit,
          },
        ]
      }
    } else {
      Object.assign(form, createEmptyForm())
    }
    formRef.value?.clearValidate()
  },
)

async function remoteSender(query: string) {
  if (!query) {
    return
  }
  loadingSender.value = true
  try {
    const rows = await searchDepositBySender(query)
    senderOptions.value = rows.map((item) => ({
      label: item.username ? `${item.sender}「${item.username}」` : item.sender,
      value: item.sender,
    }))
  } finally {
    loadingSender.value = false
  }
}

async function remoteUser(query: string) {
  if (!query) {
    return
  }
  loadingUser.value = true
  try {
    const rows = await searchMerchantUserByUnick(query)
    userOptions.value = rows.map((item) => ({
      label: `${item.unick || item.uname || item.id}「${item.id}」`,
      value: item.id,
      money: item.money,
    }))
  } finally {
    loadingUser.value = false
  }
}

function onUserChange(userId: number) {
  const hit = userOptions.value.find((item) => item.value === userId)
  form.unick = hit?.label.split('「')[0] ?? ''
  form.beforedeposit = Number(hit?.money ?? 0)
}

function closeDialog() {
  emit('update:visible', false)
}

async function handleSubmit() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) {
    return
  }
  if (Number(form.deposit) <= 0) {
    ElMessage.warning('入金必须大于 0')
    return
  }

  loading.value = true
  try {
    const payload: MerchantDepositForm = {
      ...form,
      bank: String(form.bank),
      deposittime:
        form.deposittime instanceof Date
          ? formatDateToString(form.deposittime)
          : String(form.deposittime),
      createtime: form.createtime ?? props.model?.createtime ?? '',
      creater: form.creater || props.model?.creater || userStore.userInfo?.username || 'admin',
      updateuser: userStore.userInfo?.username ?? 'admin',
    }
    if (props.mode === 'add') {
      await addMerchantDeposit(payload)
      ElMessage.success('新增成功')
    } else {
      await updateMerchantDeposit(payload)
      ElMessage.success('保存成功')
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
    :title="mode === 'add' ? '添加入金' : '更新入金'"
    width="720px"
    destroy-on-close
    @update:model-value="emit('update:visible', $event)"
  >
    <el-form ref="formRef" :model="form" :rules="rules" label-width="120px">
      <el-form-item label="打款时间" prop="deposittime">
        <el-date-picker
          v-model="form.deposittime"
          type="date"
          value-format="YYYY-MM-DD"
          placeholder="选择日期"
          :disabled="locked"
          style="width: 100%"
        />
      </el-form-item>
      <el-form-item label="打款人" prop="sender">
        <el-select
          v-model="form.sender"
          filterable
          remote
          allow-create
          clearable
          default-first-option
          placeholder="打款人"
          :remote-method="remoteSender"
          :loading="loadingSender"
          :disabled="locked"
          style="width: 100%"
        >
          <el-option
            v-for="item in senderOptions"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="银行" prop="bank">
        <el-select v-model="form.bank" :disabled="locked" style="width: 100%">
          <el-option
            v-for="item in bankOptions"
            :key="String(item.value)"
            :label="item.display"
            :value="String(item.value)"
          />
        </el-select>
      </el-form-item>
      <el-form-item v-if="mode === 'add'" label="商家" prop="username">
        <el-select
          v-model="form.username"
          filterable
          remote
          clearable
          placeholder="商家"
          :remote-method="remoteUser"
          :loading="loadingUser"
          style="width: 100%"
          @change="onUserChange"
        >
          <el-option
            v-for="item in userOptions"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          />
        </el-select>
      </el-form-item>
      <el-form-item v-else label="商家">
        <span>{{ form.unick || form.username }}</span>
      </el-form-item>
      <el-form-item label="入金" prop="deposit">
        <el-input-number
          v-model="form.deposit"
          :min="0"
          :disabled="locked"
          style="width: 100%"
        />
      </el-form-item>
      <el-form-item v-if="form.type === 1" label="入金前金额">
        ¥{{ form.beforedeposit ?? 0 }}
      </el-form-item>
      <el-form-item v-if="mode === 'edit'" label="状态">
        {{ formatStateLabel(form.state) }}
      </el-form-item>
      <el-form-item v-if="mode === 'add'" label="类型">
        <el-radio-group v-model="form.type">
          <el-radio :value="0">记录</el-radio>
          <el-radio :value="1">入金</el-radio>
        </el-radio-group>
      </el-form-item>
      <el-form-item v-else label="类型">
        {{ form.type === 0 ? '记录' : '入金' }}
      </el-form-item>
      <el-form-item label="备注">
        <el-input v-model="form.remark" type="textarea" :rows="2" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="closeDialog">取消</el-button>
      <el-button type="primary" :loading="loading" @click="handleSubmit">保存</el-button>
    </template>
  </el-dialog>
</template>
