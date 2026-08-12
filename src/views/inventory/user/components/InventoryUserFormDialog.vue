<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import type { FormInstance, FormRules } from 'element-plus'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  addInventoryUser,
  updateInventoryUser,
  type InventoryUserForm,
} from '@/api/inventory/user'
import {
  addInventoryUserAddress,
  deleteInventoryUserAddress,
  formatMerchantUserAddress,
  queryInventoryUserAddressesByUserId,
  updateInventoryUserAddress,
  type UserAddressItem,
} from '@/api/merchant/user-address'
import AddressFormDialog from '@/components/user/AddressFormDialog.vue'
import { useUserStore } from '@/stores/user'

interface Props {
  visible: boolean
  mode: 'add' | 'edit'
  model?: InventoryUserForm | null
}

const props = defineProps<Props>()
const emit = defineEmits<{
  success: []
  'update:visible': [value: boolean]
}>()

const userStore = useUserStore()
const formRef = ref<FormInstance>()
const loading = ref(false)
const addressVisible = ref(false)
const editingAddress = ref<UserAddressItem | null>(null)

const form = reactive<InventoryUserForm>({
  uname: '',
  unick: '',
  upass: '',
  umail: '',
  phone: '',
  mobile: '',
  name: '',
  wechat: '',
  memo: '',
  address: '',
  addressList: [],
})

const rules: FormRules = {
  uname: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { pattern: /^[a-zA-Z0-9]+$/, message: '用户名只能包含英文字符和数字', trigger: 'blur' },
  ],
  phone: [{ required: true, message: '请输入电话', trigger: 'blur' }],
  upass: [
    {
      validator: (_rule, value, callback) => {
        if (props.mode === 'add' && !value) {
          callback(new Error('请输入密码'))
          return
        }
        callback()
      },
      trigger: 'blur',
    },
  ],
}

function createEmptyForm(): InventoryUserForm {
  return {
    uname: '',
    unick: '',
    upass: '',
    umail: '',
    phone: '',
    mobile: '',
    name: '',
    wechat: '',
    memo: '',
    address: '',
    addressList: [],
  }
}

watch(
  () => props.visible,
  async (visible) => {
    if (!visible) {
      return
    }
    if (props.mode === 'edit' && props.model?.id) {
      Object.assign(form, createEmptyForm(), {
        ...props.model,
        uname: props.model.uname || props.model.username || '',
        upass: '',
        phone: props.model.phone || '',
        address: props.model.address ?? '',
        addressList: [],
      })
      try {
        const list = await queryInventoryUserAddressesByUserId(props.model.id)
        form.addressList = list ?? []
        if (!form.address && form.addressList.length) {
          form.address = form.addressList[0].id
        }
      } catch {
        form.addressList = []
      }
    } else {
      Object.assign(form, createEmptyForm())
    }
    formRef.value?.clearValidate()
  },
)

function openAddAddress() {
  editingAddress.value = null
  addressVisible.value = true
}

function openEditAddress(row: UserAddressItem) {
  editingAddress.value = row
  addressVisible.value = true
}

async function handleAddressSave(address: UserAddressItem) {
  const list = form.addressList ?? []
  const index = list.findIndex((item) => String(item.id) === String(address.id))

  if (props.mode === 'add') {
    if (index < 0) {
      if (!list.length) {
        form.address = address.id
      }
      list.push(address)
    } else {
      list.splice(index, 1, address)
    }
    form.addressList = [...list]
    return
  }

  const payload = {
    ...address,
    user_id: form.id,
    uid: form.id,
    uname: form.uname,
  }
  if (index < 0) {
    await addInventoryUserAddress(payload)
    if (!list.length) {
      form.address = address.id
    }
    list.push(payload)
  } else {
    await updateInventoryUserAddress(payload)
    list.splice(index, 1, payload)
  }
  form.addressList = [...list]
  ElMessage.success('地址已保存')
}

async function removeAddress(row: UserAddressItem) {
  await ElMessageBox.confirm('确认删除该地址吗？', '删除', { type: 'warning' })
  const list = form.addressList ?? []
  const index = list.findIndex((item) => String(item.id) === String(row.id))
  if (index < 0) {
    return
  }
  if (props.mode === 'edit') {
    await deleteInventoryUserAddress(row.id)
  }
  list.splice(index, 1)
  if (String(form.address) === String(row.id)) {
    form.address = list[0]?.id ?? ''
  }
  form.addressList = [...list]
  ElMessage.success('已删除')
}

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
    const operator = userStore.userInfo?.username ?? 'admin'
    const payload: InventoryUserForm = {
      ...form,
      username: form.uname,
      authenmodifyoperator: operator,
    }
    if (props.mode === 'add') {
      payload.authenappendoperator = operator
      await addInventoryUser(payload)
      ElMessage.success('新增成功')
    } else {
      if (!payload.upass) {
        delete payload.upass
      }
      await updateInventoryUser(payload)
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
    :title="mode === 'add' ? '创建用户' : '更新用户'"
    width="780px"
    top="4vh"
    destroy-on-close
    @update:model-value="emit('update:visible', $event)"
  >
    <el-form ref="formRef" :model="form" :rules="rules" label-width="110px">
      <el-form-item label="用户名" prop="uname">
        <el-input v-model="form.uname" autocomplete="off" />
      </el-form-item>
      <el-form-item label="昵称">
        <el-input v-model="form.unick" />
      </el-form-item>
      <el-form-item label="密码" prop="upass">
        <el-input
          v-model="form.upass"
          type="password"
          show-password
          autocomplete="new-password"
          :placeholder="mode === 'edit' ? '留空则不修改' : '请输入密码'"
        />
      </el-form-item>
      <el-form-item label="邮箱">
        <el-input v-model="form.umail" />
      </el-form-item>
      <el-form-item label="电话" prop="phone">
        <el-input v-model="form.phone" />
      </el-form-item>
      <el-form-item label="手机">
        <el-input v-model="form.mobile" />
      </el-form-item>
      <el-form-item label="姓名">
        <el-input v-model="form.name" />
      </el-form-item>
      <el-form-item label="微信">
        <el-input v-model="form.wechat" />
      </el-form-item>
      <el-form-item label="备注">
        <el-input v-model="form.memo" type="textarea" :rows="2" />
      </el-form-item>
      <el-form-item label="地址">
        <div class="user-address">
          <el-button type="primary" link @click="openAddAddress">新增地址</el-button>
          <el-radio-group v-model="form.address" class="user-address__list">
            <div
              v-for="item in form.addressList"
              :key="String(item.id)"
              class="user-address__item"
            >
              <el-radio :value="item.id">{{ formatMerchantUserAddress(item) }}</el-radio>
              <div class="user-address__actions">
                <el-button type="primary" link @click="openEditAddress(item)">编辑</el-button>
                <el-button type="danger" link @click="removeAddress(item)">删除</el-button>
              </div>
            </div>
          </el-radio-group>
          <el-empty
            v-if="!(form.addressList && form.addressList.length)"
            description="暂无地址"
            :image-size="56"
          />
        </div>
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="closeDialog">取消</el-button>
      <el-button type="primary" :loading="loading" @click="handleSubmit">保存</el-button>
    </template>

    <AddressFormDialog
      v-model:visible="addressVisible"
      :model="editingAddress"
      @save="handleAddressSave"
    />
  </el-dialog>
</template>

<style scoped lang="scss">
.user-address {
  width: 100%;

  &__list {
    display: flex;
    flex-direction: column;
    gap: 8px;
    width: 100%;
    margin-top: 8px;
  }

  &__item {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    padding: 8px 10px;
    background: #f5f7fa;
    border-radius: 6px;
  }

  &__actions {
    display: flex;
    flex-shrink: 0;
    gap: 4px;
  }
}
</style>
