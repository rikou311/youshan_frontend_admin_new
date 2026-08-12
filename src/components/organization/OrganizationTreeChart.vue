<script setup lang="ts">
import { ref, watch } from 'vue'
import { MoreFilled } from '@element-plus/icons-vue'
import type { OrganizationItem } from '@/api/system'
import type { PageButtonMap } from '@/types/permission'

defineOptions({ name: 'OrganizationTreeChart' })

interface Props {
  json: OrganizationItem
  buttons: PageButtonMap[string]
}

const props = defineProps<Props>()
const emit = defineEmits<{
  add: [node: OrganizationItem]
  del: [id: OrganizationItem['id']]
  update: [id: OrganizationItem['id']]
  show: [id: OrganizationItem['id']]
}>()

const treeData = ref<OrganizationItem>({ id: '', name: '', active: 1 })

watch(
  () => props.json,
  (value) => {
    if (!value) {
      return
    }
    treeData.value = {
      ...value,
      extend: value.extend ?? true,
    }
  },
  { immediate: true, deep: true },
)

function toggleExtend(node: OrganizationItem) {
  node.extend = !node.extend
}

function addNode(node: OrganizationItem) {
  emit('add', node)
}

function updateNode(id: OrganizationItem['id']) {
  emit('update', id)
}

function showNode(id: OrganizationItem['id']) {
  emit('show', id)
}

function delNode(id: OrganizationItem['id']) {
  emit('del', id)
}
</script>

<template>
  <table v-if="treeData.name" class="org-tree-chart">
    <tr>
      <td
        :colspan="treeData.children?.length ? treeData.children.length * 2 : 1"
        :class="{
          parentLevel: treeData.children?.length,
          extend: treeData.children?.length && treeData.extend,
        }"
      >
        <div :class="{ node: true }">
          <div class="person">
            <div class="avat">
              <el-popover placement="top" trigger="click" width="auto">
                <div class="org-tree-chart__actions">
                  <el-button
                    v-if="buttons.query"
                    type="default"
                    size="small"
                    @click="showNode(treeData.id)"
                  >
                    {{ buttons.query.authName }}
                  </el-button>
                  <el-button
                    v-if="buttons.update"
                    type="primary"
                    size="small"
                    @click="updateNode(treeData.id)"
                  >
                    {{ buttons.update.authName }}
                  </el-button>
                  <el-button
                    v-if="buttons.delete"
                    type="danger"
                    size="small"
                    @click="delNode(treeData.id)"
                  >
                    {{ buttons.delete.authName }}
                  </el-button>
                  <el-button
                    v-if="buttons.add"
                    type="success"
                    size="small"
                    @click="addNode(treeData)"
                  >
                    {{ buttons.add.authName }}
                  </el-button>
                </div>
                <template #reference>
                  <el-button class="more" type="primary" link>
                    <el-icon><MoreFilled /></el-icon>
                  </el-button>
                </template>
              </el-popover>
              <div>{{ treeData.name || treeData.orgName }}</div>
            </div>
          </div>
        </div>
        <div
          v-if="treeData.children?.length"
          class="extend_handle"
          @click="toggleExtend(treeData)"
        />
      </td>
    </tr>
    <tr v-if="treeData.children?.length && treeData.extend">
      <td
        v-for="(child, index) in treeData.children"
        :key="String(child.id ?? index)"
        colspan="2"
        class="childLevel"
      >
        <OrganizationTreeChart
          :json="child"
          :buttons="buttons"
          @add="emit('add', $event)"
          @del="emit('del', $event)"
          @update="emit('update', $event)"
          @show="emit('show', $event)"
        />
      </td>
    </tr>
  </table>
</template>

<style scoped lang="scss">
.org-tree-chart {
  border-collapse: separate !important;
  border-spacing: 0 !important;
  margin: 0 auto;
}

.org-tree-chart__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

td {
  position: relative;
  vertical-align: top;
  padding: 0 0 50px;
  text-align: center;
}

.extend_handle {
  position: absolute;
  left: 50%;
  bottom: 27px;
  width: 10px;
  height: 10px;
  padding: 10px;
  transform: translate3d(-15px, 0, 0);
  cursor: pointer;
}

.extend_handle::before {
  content: '';
  display: block;
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  border: 2px solid;
  border-color: #ccc #ccc transparent transparent;
  transform: rotateZ(135deg);
  transform-origin: 50% 50% 0;
  transition: transform ease 300ms;
}

.extend .extend_handle::before {
  transform: rotateZ(-45deg);
}

.extend::after {
  content: '';
  position: absolute;
  left: 50%;
  bottom: 15px;
  height: 15px;
  border-left: 2px solid #ccc;
  transform: translate3d(-1px, 0, 0);
}

.childLevel::before {
  content: '';
  position: absolute;
  left: 50%;
  bottom: 100%;
  height: 15px;
  border-left: 2px solid #ccc;
  transform: translate3d(-1px, 0, 0);
}

.childLevel::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  top: -15px;
  border-top: 2px solid #ccc;
}

.childLevel:first-child::before,
.childLevel:last-child::before {
  display: none;
}

.childLevel:first-child::after {
  left: 50%;
  height: 15px;
  border: 2px solid;
  border-color: #ccc transparent transparent #ccc;
  border-radius: 6px 0 0;
  transform: translate3d(1px, 0, 0);
}

.childLevel:last-child::after {
  right: 50%;
  height: 15px;
  border: 2px solid;
  border-color: #ccc #ccc transparent transparent;
  border-radius: 0 6px 0 0;
  transform: translate3d(-1px, 0, 0);
}

.node .person {
  padding-top: 15px;
  position: relative;
  display: inline-block;
  z-index: 2;
  width: 120px;
  overflow: hidden;
}

.node .person .avat {
  position: relative;
  padding: 20px;
  display: block;
  width: 100%;
  height: 100%;
  margin: auto;
  word-break: break-all;
  border: 1px solid #ccc;
  box-sizing: border-box;
  border-radius: 4px;

  .more {
    position: absolute;
    right: 5px;
    top: -10px;
  }
}
</style>
