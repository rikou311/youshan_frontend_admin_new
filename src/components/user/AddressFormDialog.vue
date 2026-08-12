<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import type { FormInstance, FormRules } from 'element-plus'
import { ElMessage } from 'element-plus'
import { selectPostcodeByParam, type PostcodeItem } from '@/api/common/postcode'
import { queryDictionaryGroups } from '@/api/dictionary'
import {
  createAddressLocalId,
  type UserAddressItem,
} from '@/api/merchant/user-address'
import { getDictionaryOptions } from '@/utils/dictionary'
import { saveDictionary } from '@/utils/storage'

interface Props {
  visible: boolean
  model?: UserAddressItem | null
}

const props = defineProps<Props>()
const emit = defineEmits<{
  save: [address: UserAddressItem]
  'update:visible': [value: boolean]
}>()

const formRef = ref<FormInstance>()
const selectDisabled = ref(true)
const postcodeOptions = ref<PostcodeItem[]>([])
const dictTick = ref(0)

const socialOptions = computed(() => {
  void dictTick.value
  return getDictionaryOptions('social_type')
})

const form = reactive<UserAddressItem>({
  id: '',
  receive: '',
  postcode: '',
  prefecture: '',
  city: '',
  town: '',
  address: '',
  building: '',
  roomnumber: '',
  phone: '',
  socialtype: '',
  socialaccount: '',
})

const rules: FormRules = {
  receive: [{ required: true, message: '请输入收件人', trigger: 'blur' }],
  postcode: [{ required: true, message: '请输入邮编', trigger: 'blur' }],
  prefecture: [{ required: true, message: '请选择辖区', trigger: 'change' }],
  city: [{ required: true, message: '请选择市区', trigger: 'change' }],
  town: [{ required: true, message: '请选择町村', trigger: 'change' }],
  address: [{ required: true, message: '请输入丁目・番地・号', trigger: 'blur' }],
}

function resetEmpty() {
  Object.assign(form, {
    id: '',
    receive: '',
    postcode: '',
    prefecture: '',
    city: '',
    town: '',
    address: '',
    building: '',
    roomnumber: '',
    phone: '',
    socialtype: '',
    socialaccount: '',
  })
  postcodeOptions.value = []
  selectDisabled.value = true
}

async function ensureDictionaries() {
  try {
    const data = await queryDictionaryGroups(['social_type'])
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
    if (props.model?.id) {
      Object.assign(form, {
        ...props.model,
        socialtype:
          props.model.socialtype == null || props.model.socialtype === ''
            ? ''
            : String(props.model.socialtype),
        socialaccount: props.model.socialaccount ?? '',
      })
      if (form.postcode) {
        void lookupPostcode(false)
      }
    } else {
      resetEmpty()
    }
    formRef.value?.clearValidate()
  },
)

async function lookupPostcode(clearFields = true) {
  if (!form.postcode) {
    return
  }
  if (clearFields) {
    form.prefecture = ''
    form.city = ''
    form.town = ''
  }
  const rows = await selectPostcodeByParam({
    postcode: form.postcode,
    prefecture: clearFields ? '' : form.prefecture,
    city: clearFields ? '' : form.city,
    town: clearFields ? '' : form.town,
  })
  postcodeOptions.value = rows ?? []
  selectDisabled.value = !(postcodeOptions.value.length > 0)
  if (clearFields && !postcodeOptions.value.length) {
    ElMessage.warning('邮政编码查询失败，请检查邮政编码是否正确')
  }
}

async function refinePostcode() {
  const rows = await selectPostcodeByParam({
    postcode: form.postcode,
    prefecture: form.prefecture,
    city: form.city,
    town: form.town,
  })
  postcodeOptions.value = rows ?? []
  selectDisabled.value = !(postcodeOptions.value.length > 0)
}

function closeDialog() {
  emit('update:visible', false)
}

async function handleSubmit() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) {
    return
  }
  const payload: UserAddressItem = {
    ...form,
    id: form.id || createAddressLocalId(),
    socialtype: form.socialtype != null && form.socialtype !== '' ? String(form.socialtype) : '',
    socialaccount: form.socialaccount ?? '',
  }
  emit('save', payload)
  closeDialog()
}
</script>

<template>
  <el-dialog
    :model-value="visible"
    title="地址"
    width="720px"
    append-to-body
    destroy-on-close
    :close-on-click-modal="false"
    @update:model-value="emit('update:visible', $event)"
  >
    <el-form ref="formRef" :model="form" :rules="rules" label-width="160px">
      <el-row :gutter="12">
        <el-col :span="12">
          <el-form-item label="收件人" prop="receive">
            <el-input v-model="form.receive" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="邮政编码" prop="postcode">
            <el-input v-model="form.postcode" @blur="lookupPostcode(true)" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="辖区" prop="prefecture">
            <el-select
              v-model="form.prefecture"
              filterable
              :disabled="selectDisabled"
              style="width: 100%"
              @change="refinePostcode"
            >
              <el-option
                v-for="item in postcodeOptions"
                :key="`p-${item.id ?? item.prefecture}`"
                :label="item.prefecture"
                :value="item.prefecture || ''"
              />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="市区" prop="city">
            <el-select
              v-model="form.city"
              filterable
              :disabled="selectDisabled"
              style="width: 100%"
              @change="refinePostcode"
            >
              <el-option
                v-for="item in postcodeOptions"
                :key="`c-${item.id ?? item.city}`"
                :label="item.city"
                :value="item.city || ''"
              />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="町村" prop="town">
            <el-select
              v-model="form.town"
              filterable
              :disabled="selectDisabled"
              style="width: 100%"
              @change="refinePostcode"
            >
              <el-option
                v-for="item in postcodeOptions"
                :key="`t-${item.id ?? item.town}`"
                :label="item.town"
                :value="item.town || ''"
              />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="24">
          <el-form-item label="丁目・番地・号" prop="address">
            <el-input v-model="form.address" placeholder="例: 1-1-2" />
          </el-form-item>
        </el-col>
        <el-col :span="24">
          <el-form-item label="公寓/公司名称">
            <el-input v-model="form.building" placeholder="例: ◯◯マンション" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="房间号码">
            <el-input v-model="form.roomnumber" placeholder="例: 123" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="手机号">
            <el-input v-model="form.phone" placeholder="例: 090xxxxxxxx" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="社交App">
            <el-select
              v-model="form.socialtype"
              clearable
              filterable
              placeholder="请选择"
              style="width: 100%"
            >
              <el-option
                v-for="item in socialOptions"
                :key="String(item.value)"
                :label="item.display"
                :value="String(item.value)"
              />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="社交账号">
            <el-input v-model="form.socialaccount" />
          </el-form-item>
        </el-col>
      </el-row>
    </el-form>
    <template #footer>
      <el-button @click="closeDialog">取消</el-button>
      <el-button type="primary" @click="handleSubmit">保存</el-button>
    </template>
  </el-dialog>
</template>
