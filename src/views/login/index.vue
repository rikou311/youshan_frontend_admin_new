<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { FormInstance, FormRules } from 'element-plus'
import { ElMessage } from 'element-plus'
import { useUserStore } from '@/stores/user'
import type { LoginParams } from '@/types/api'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const formRef = ref<FormInstance>()
const loading = ref(false)
/** 留空，便于浏览器密码管理器展示历史账号列表 */
const form = reactive<LoginParams>({
  username: '',
  password: '',
})

const rules: FormRules<LoginParams> = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
}

/**
 * SPA Ajax 登录不会触发「传统表单提交」，浏览器通常不会自动弹出保存密码。
 * 登录成功后主动调用 Credential Management API（Chrome/Edge 支持）。
 */
async function offerSavePassword() {
  try {
    const PasswordCredentialCtor = (
      window as unknown as {
        PasswordCredential?: new (data: { id: string; password: string; name?: string }) => Credential
      }
    ).PasswordCredential
    if (!PasswordCredentialCtor || !navigator.credentials?.store) {
      return
    }
    const credential = new PasswordCredentialCtor({
      id: form.username,
      name: form.username,
      password: form.password,
    })
    await navigator.credentials.store(credential)
  } catch {
    // 用户拒绝、站点曾选「永不」、或不支持时忽略
  }
}

async function handleSubmit() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) {
    return
  }

  loading.value = true
  try {
    await userStore.login({ ...form })
    await offerSavePassword()
    ElMessage.success('登录成功')
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/'
    await router.push(redirect)
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="login-page">
    <el-card class="login-page__card" shadow="hover">
      <h2 class="login-page__title">有善管理后台</h2>
      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        method="post"
        action="/login"
        autocomplete="on"
        label-width="80px"
        @submit.prevent="handleSubmit"
      >
        <el-form-item label="用户名" prop="username">
          <el-input
            v-model="form.username"
            name="username"
            type="text"
            tabindex="1"
            autocomplete="username"
            placeholder="请输入用户名"
          />
        </el-form-item>
        <el-form-item label="密码" prop="password">
          <el-input
            v-model="form.password"
            name="password"
            type="password"
            tabindex="2"
            autocomplete="current-password"
            show-password
            placeholder="请输入密码"
            @keyup.enter="handleSubmit"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="loading" native-type="submit" style="width: 100%">
            登录
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<style scoped lang="scss">
.login-page {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: linear-gradient(135deg, #eef2ff 0%, #f5f7fa 100%);

  &__card {
    width: 420px;
    padding: 12px 8px 4px;
  }

  &__title {
    margin: 0 0 24px;
    text-align: center;
    font-size: 22px;
    color: #303133;
  }

  &__hint {
    margin: 0;
    text-align: center;
    color: #909399;
    font-size: 13px;
  }
}
</style>
