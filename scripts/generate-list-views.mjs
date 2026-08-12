import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve('src/views')

const pages = [
  {
    file: 'role/index.vue',
    apiImport: "import { getRoleList } from '@/api/system'",
    fetcher: 'getRoleList',
    searchKey: 'roleName',
    searchLabel: '角色名',
    columns: [
      { prop: 'id', label: 'ID', width: 80 },
      { prop: 'roleName', label: '角色名称', minWidth: 180 },
      { prop: 'active', label: '状态', width: 100 },
    ],
  },
  {
    file: 'user/index.vue',
    apiImport: "import { getSysUserList } from '@/api/system'",
    fetcher: 'getSysUserList',
    searchKey: 'username',
    searchLabel: '用户名',
    columns: [
      { prop: 'id', label: 'ID', width: 80 },
      { prop: 'username', label: '用户名', minWidth: 160 },
      { prop: 'realName', label: '姓名', minWidth: 160 },
      { prop: 'active', label: '状态', width: 100 },
    ],
  },
  {
    file: 'organization/index.vue',
    apiImport: "import { getOrganizationList } from '@/api/system'",
    fetcher: 'getOrganizationList',
    searchKey: 'orgName',
    searchLabel: '组织名称',
    columns: [
      { prop: 'id', label: 'ID', width: 80 },
      { prop: 'orgName', label: '组织名称', minWidth: 220 },
      { prop: 'active', label: '状态', width: 100 },
    ],
  },
  {
    file: 'dictionary/index.vue',
    apiImport: "import { getDictionaryManageList } from '@/api/system'",
    fetcher: 'getDictionaryManageList',
    searchKey: 'groupId',
    searchLabel: '分组',
    columns: [
      { prop: 'id', label: 'ID', width: 80 },
      { prop: 'groupId', label: '分组', minWidth: 160 },
      { prop: 'display', label: '显示值', minWidth: 160 },
      { prop: 'value', label: '值', minWidth: 120 },
    ],
  },
  {
    file: 'authority/index.vue',
    apiImport: "import { getAuthorityList } from '@/api/system'",
    fetcher: 'getAuthorityList',
    searchKey: 'authName',
    searchLabel: '权限名称',
    columns: [
      { prop: 'id', label: 'ID', width: 80 },
      { prop: 'authName', label: '权限名称', minWidth: 180 },
      { prop: 'path', label: '路径', minWidth: 220 },
    ],
  },
  {
    file: 'inventory/advertise/index.vue',
    apiImport: "import { getInventoryAdvertiseList } from '@/api/inventory/advertise'",
    fetcher: 'getInventoryAdvertiseList',
    searchKey: 'title',
    searchLabel: '标题',
    columns: [
      { prop: 'id', label: 'ID', width: 80 },
      { prop: 'title', label: '标题', minWidth: 220 },
      { prop: 'status', label: '状态', width: 100 },
      { prop: 'updatedAt', label: '更新时间', minWidth: 180 },
    ],
  },
  {
    file: 'inventory/user/index.vue',
    apiImport: "import { getInventoryUserList } from '@/api/inventory/user'",
    fetcher: 'getInventoryUserList',
    searchKey: 'keyword',
    searchLabel: '关键词',
    columns: [
      { prop: 'id', label: 'ID', width: 80 },
      { prop: 'username', label: '用户名', minWidth: 160 },
      { prop: 'phone', label: '手机号', minWidth: 140 },
      { prop: 'createdAt', label: '创建时间', minWidth: 180 },
    ],
  },
  {
    file: 'stock/rawFood/index.vue',
    apiImport: "import { getRawFoodList } from '@/api/stock'",
    fetcher: 'getRawFoodList',
    searchKey: 'name',
    searchLabel: '名称',
    columns: [
      { prop: 'id', label: 'ID', width: 80 },
      { prop: 'name', label: '名称', minWidth: 180 },
      { prop: 'quantity', label: '数量', width: 120 },
    ],
  },
  {
    file: 'stock/goodsQuantity/index.vue',
    apiImport: "import { getGoodsQuantityList } from '@/api/stock'",
    fetcher: 'getGoodsQuantityList',
    searchKey: 'goodsName',
    searchLabel: '商品名',
    columns: [
      { prop: 'id', label: 'ID', width: 80 },
      { prop: 'goodsName', label: '商品名', minWidth: 180 },
      { prop: 'quantity', label: '库存', width: 120 },
    ],
  },
  {
    file: 'configure/payment/index.vue',
    apiImport: "import { getPaymentList } from '@/api/configure'",
    fetcher: 'getPaymentList',
    searchKey: 'name',
    searchLabel: '名称',
    columns: [
      { prop: 'id', label: 'ID', width: 80 },
      { prop: 'name', label: '支付方式', minWidth: 180 },
      { prop: 'status', label: '状态', width: 100 },
    ],
  },
  {
    file: 'configure/fare/index.vue',
    apiImport: "import { getFareList } from '@/api/configure'",
    fetcher: 'getFareList',
    searchKey: 'name',
    searchLabel: '名称',
    columns: [
      { prop: 'id', label: 'ID', width: 80 },
      { prop: 'name', label: '运费模板', minWidth: 180 },
      { prop: 'amount', label: '金额', width: 120 },
    ],
  },
  {
    file: 'employee/employee/index.vue',
    apiImport: "import { getEmployeeList } from '@/api/employee'",
    fetcher: 'getEmployeeList',
    searchKey: 'name',
    searchLabel: '姓名',
    columns: [
      { prop: 'id', label: 'ID', width: 80 },
      { prop: 'name', label: '姓名', minWidth: 160 },
      { prop: 'department', label: '部门', minWidth: 160 },
    ],
  },
  {
    file: 'employee/attendanceRecord/index.vue',
    apiImport: "import { getAttendanceRecordList } from '@/api/employee'",
    fetcher: 'getAttendanceRecordList',
    searchKey: 'employeeName',
    searchLabel: '员工姓名',
    columns: [
      { prop: 'id', label: 'ID', width: 80 },
      { prop: 'employeeName', label: '员工', minWidth: 160 },
      { prop: 'checkDate', label: '考勤日期', minWidth: 180 },
    ],
  },
  {
    file: 'merchant/commoditydis/index.vue',
    apiImport: "import { getMerchantCommodityDisList } from '@/api/merchant'",
    fetcher: 'getMerchantCommodityDisList',
    searchKey: 'keyword',
    searchLabel: '关键词',
    columns: [
      { prop: 'id', label: 'ID', width: 80 },
      { prop: 'title', label: '商品', minWidth: 180 },
      { prop: 'price', label: '价格', width: 120 },
      { prop: 'stock', label: '库存', width: 100 },
    ],
  },
  {
    file: 'access/index.vue',
    apiImport: "import { getAccessList } from '@/api/platform'",
    fetcher: 'getAccessList',
    searchKey: 'resourceName',
    searchLabel: '资源名称',
    columns: [
      { prop: 'id', label: 'ID', width: 80 },
      { prop: 'resourceName', label: '资源名称', minWidth: 160 },
      { prop: 'resource', label: '资源值', minWidth: 220 },
      { prop: 'method', label: '请求类型', width: 100 },
      { prop: 'active', label: '状态', width: 80 },
    ],
  },
  {
    file: 'accessLog/index.vue',
    apiImport: "import { getAccessLogList } from '@/api/platform'",
    fetcher: 'getAccessLogList',
    searchKey: 'username',
    searchLabel: '用户名',
    columns: [
      { prop: 'id', label: 'ID', width: 80 },
      { prop: 'username', label: '用户', minWidth: 120 },
      { prop: 'resource', label: '资源', minWidth: 220 },
      { prop: 'method', label: '方法', width: 100 },
      { prop: 'createdAt', label: '时间', minWidth: 180 },
    ],
  },
  {
    file: 'client/index.vue',
    apiImport: "import { getClientList } from '@/api/platform'",
    fetcher: 'getClientList',
    searchKey: 'clientName',
    searchLabel: '客户端名称',
    columns: [
      { prop: 'id', label: 'ID', width: 80 },
      { prop: 'clientId', label: 'Client ID', minWidth: 140 },
      { prop: 'clientName', label: '名称', minWidth: 160 },
      { prop: 'active', label: '状态', width: 80 },
    ],
  },
  {
    file: 'module/index.vue',
    apiImport: "import { getModuleList } from '@/api/platform'",
    fetcher: 'getModuleList',
    searchKey: 'moduleName',
    searchLabel: '模块名称',
    columns: [
      { prop: 'id', label: 'ID', width: 80 },
      { prop: 'moduleName', label: '模块名称', minWidth: 160 },
      { prop: 'moduleCode', label: '编码', minWidth: 140 },
      { prop: 'version', label: '版本', width: 100 },
      { prop: 'installed', label: '已安装', width: 90 },
    ],
  },
  {
    file: 'firewall/index.vue',
    apiImport: "import { getFirewallList } from '@/api/platform'",
    fetcher: 'getFirewallList',
    searchKey: 'ruleName',
    searchLabel: '规则名称',
    columns: [
      { prop: 'id', label: 'ID', width: 80 },
      { prop: 'ruleName', label: '规则名称', minWidth: 160 },
      { prop: 'ip', label: 'IP', minWidth: 160 },
      { prop: 'action', label: '动作', width: 100 },
      { prop: 'active', label: '状态', width: 80 },
    ],
  },
  {
    file: 'staticResource/index.vue',
    apiImport: "import { getStaticResourceList } from '@/api/platform'",
    fetcher: 'getStaticResourceList',
    searchKey: 'fileName',
    searchLabel: '文件名',
    columns: [
      { prop: 'id', label: 'ID', width: 80 },
      { prop: 'fileName', label: '文件名', minWidth: 160 },
      { prop: 'filePath', label: '路径', minWidth: 220 },
      { prop: 'fileSize', label: '大小', width: 100 },
      { prop: 'createdAt', label: '上传时间', minWidth: 180 },
    ],
  },
  {
    file: 'processDefinitionModel/index.vue',
    apiImport: "import { getProcessDefinitionModelList } from '@/api/platform'",
    fetcher: 'getProcessDefinitionModelList',
    searchKey: 'name',
    searchLabel: '流程名称',
    columns: [
      { prop: 'id', label: 'ID', width: 80 },
      { prop: 'name', label: '名称', minWidth: 160 },
      { prop: 'key', label: 'Key', minWidth: 160 },
      { prop: 'version', label: '版本', width: 80 },
    ],
  },
  {
    file: 'processDeployment/index.vue',
    apiImport: "import { getProcessDeploymentList } from '@/api/platform'",
    fetcher: 'getProcessDeploymentList',
    searchKey: 'name',
    searchLabel: '部署名称',
    columns: [
      { prop: 'id', label: 'ID', width: 80 },
      { prop: 'name', label: '名称', minWidth: 160 },
      { prop: 'deploymentId', label: '部署ID', minWidth: 160 },
      { prop: 'version', label: '版本', width: 80 },
    ],
  },
  {
    file: 'formDefinitionModel/index.vue',
    apiImport: "import { getFormDefinitionModelList } from '@/api/platform'",
    fetcher: 'getFormDefinitionModelList',
    searchKey: 'name',
    searchLabel: '表单名称',
    columns: [
      { prop: 'id', label: 'ID', width: 80 },
      { prop: 'name', label: '名称', minWidth: 160 },
      { prop: 'key', label: 'Key', minWidth: 160 },
      { prop: 'version', label: '版本', width: 80 },
    ],
  },
  {
    file: 'formDeployment/index.vue',
    apiImport: "import { getFormDeploymentList } from '@/api/platform'",
    fetcher: 'getFormDeploymentList',
    searchKey: 'name',
    searchLabel: '部署名称',
    columns: [
      { prop: 'id', label: 'ID', width: 80 },
      { prop: 'name', label: '名称', minWidth: 160 },
      { prop: 'deploymentId', label: '部署ID', minWidth: 160 },
      { prop: 'version', label: '版本', width: 80 },
    ],
  },
]

function renderColumns(columns) {
  return columns
    .map((col) => {
      const width = col.width ? ` width="${col.width}"` : ''
      const minWidth = col.minWidth ? ` min-width="${col.minWidth}"` : ''
      return `        <el-table-column prop="${col.prop}" label="${col.label}"${width}${minWidth} />`
    })
    .join('\n')
}

for (const page of pages) {
  const content = `<script setup lang="ts">
import { onMounted, reactive } from 'vue'
${page.apiImport}
import { useTableList } from '@/composables/useTableList'

const searchForm = reactive({ ${page.searchKey}: '' })
const { loading, list, pagination, fetchList, handleSearch, handlePageChange, handleSizeChange } =
  useTableList(
    (params) => ${page.fetcher}({ ...params, ${page.searchKey}: searchForm.${page.searchKey} || undefined }),
    () => ({}),
  )

onMounted(() => fetchList())
</script>

<template>
  <div class="biz-page">
    <el-card shadow="never">
      <el-form :inline="true" @submit.prevent="handleSearch">
        <el-form-item label="${page.searchLabel}">
          <el-input v-model="searchForm.${page.searchKey}" clearable />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">查询</el-button>
        </el-form-item>
      </el-form>
    </el-card>
    <el-card shadow="never">
      <el-table v-loading="loading" :data="list" stripe>
        <template #empty><el-empty description="暂无数据" /></template>
${renderColumns(page.columns)}
      </el-table>
      <div class="biz-page__pagination">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.pageSize"
          :total="pagination.total"
          layout="total, sizes, prev, pager, next"
          :page-sizes="[10, 20, 50]"
          background
          @current-change="handlePageChange"
          @size-change="handleSizeChange"
        />
      </div>
    </el-card>
  </div>
</template>

<style scoped lang="scss">
.biz-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
  &__pagination {
    display: flex;
    justify-content: flex-end;
    margin-top: 16px;
  }
}
</style>
`
  const filePath = path.join(root, page.file)
  const componentsDir = path.join(root, path.dirname(page.file), 'components')
  if (fs.existsSync(componentsDir)) {
    console.log(`Skip ${page.file} (custom page)`)
    continue
  }
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, content)
}

console.log(`Generated ${pages.length} list views`)
