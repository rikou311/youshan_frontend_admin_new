<script setup lang="ts">
import { ref, watch } from 'vue'
import type { TreeInstance } from 'element-plus'
import { ElMessage } from 'element-plus'
import {
  getAuthorityTrees,
  grantRoleAuthorities,
  type AuthorityTreeNode,
  type EntityId,
} from '@/api/system'

interface Props {
  visible: boolean
  roleId?: EntityId
  roleName?: string
}

const props = defineProps<Props>()
const emit = defineEmits<{
  success: []
  'update:visible': [value: boolean]
}>()

const loading = ref(false)
const submitting = ref(false)
const treeData = ref<AuthorityTreeNode[]>([])
const defaultCheckedKeys = ref<number[]>([])
const treeRef = ref<TreeInstance>()

watch(
  () => props.visible,
  async (visible) => {
    if (!visible || !props.roleId) {
      return
    }
    loading.value = true
    try {
      const res = await getAuthorityTrees(props.roleId)
      treeData.value = res.trees ?? []
      defaultCheckedKeys.value = res.grantedAuthorityIds ?? []
    } finally {
      loading.value = false
    }
  },
)

function closeDialog() {
  emit('update:visible', false)
}

async function handleSubmit() {
  if (!props.roleId || !treeRef.value) {
    return
  }
  const checked = treeRef.value.getCheckedKeys(false) as number[]
  const halfChecked = treeRef.value.getHalfCheckedKeys() as number[]
  const authorityIds = [...checked, ...halfChecked]

  submitting.value = true
  try {
    await grantRoleAuthorities(props.roleId, authorityIds)
    ElMessage.success('授权成功')
    emit('success')
    closeDialog()
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <el-dialog
    :model-value="visible"
    :title="`角色授权 - ${roleName ?? ''}`"
    width="560px"
    @close="closeDialog"
  >
    <el-tree
      v-if="!loading"
      ref="treeRef"
      :data="treeData"
      node-key="id"
      show-checkbox
      default-expand-all
      :default-checked-keys="defaultCheckedKeys"
      :props="{ label: 'authName', children: 'children' }"
    />
    <el-skeleton v-else :rows="6" animated />
    <template #footer>
      <el-button @click="closeDialog">取消</el-button>
      <el-button type="primary" :loading="submitting" @click="handleSubmit">确定</el-button>
    </template>
  </el-dialog>
</template>
