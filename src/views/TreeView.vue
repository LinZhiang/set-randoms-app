<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import NodeBlock from '@/components/NodeBlock.vue'
import { useNodesStore } from '@/stores/nodes'

const store = useNodesStore()
const route = useRoute()
const router = useRouter()
const selectedId = ref<string | null>(null)
const detailsOpenId = ref<string | null>(null)
const confirmingId = ref<string | null>(null)
const actionError = ref('')

const parentId = computed(() =>
  route.name === 'level' && typeof route.params.id === 'string' ? route.params.id : null,
)
const items = computed(() =>
  store.childrenOf(parentId.value).map((node) => ({
    id: node.id,
    name: node.name,
    details: node.details,
    views: node.views,
    hasChildren: store.childrenOf(node.id).length > 0,
  })),
)

watch(parentId, () => {
  selectedId.value = null
  detailsOpenId.value = null
  confirmingId.value = null
  actionError.value = ''
})

function onName(id: string) {
  actionError.value = ''
  if (selectedId.value !== id) {
    selectedId.value = id
    detailsOpenId.value = null
    confirmingId.value = null
    return
  }
  detailsOpenId.value = detailsOpenId.value === id ? null : id
}

async function remove(id: string) {
  actionError.value = ''
  try {
    await store.removeNode(id)
    if (selectedId.value === id) selectedId.value = null
    detailsOpenId.value = null
    confirmingId.value = null
  } catch (error) {
    actionError.value = error instanceof Error ? error.message : '删除失败'
  }
}
</script>

<template>
  <main class="screen">
    <p v-if="store.link === 'offline'" class="banner" role="status">存储服务没连上，先不要修改。</p>

    <p v-if="store.link === 'syncing' && items.length === 0" class="empty">正在读取…</p>
    <p v-else-if="items.length === 0" class="empty">
      {{ parentId ? '这里还没有子节点。' : '还没有记录。先加一个最顶层的类型。' }}
    </p>

    <ul v-else class="groups">
      <li v-for="item in items" :key="item.id" class="group">
        <NodeBlock
          :name="item.name"
          :details="item.details"
          :views="item.views"
          :has-test="item.hasChildren"
          :has-deeper="item.hasChildren"
          :selected="selectedId === item.id"
          :details-open="detailsOpenId === item.id"
          :confirming="confirmingId === item.id"
          :can-edit="store.canEdit"
          :saving="store.saving"
          @select="onName(item.id)"
          @test="router.push(`/test/${item.id}`)"
          @deeper="router.push(`/level/${item.id}`)"
          @add="router.push(`/new/${item.id}`)"
          @edit="router.push(`/node/${item.id}/edit`)"
          @ask-remove="confirmingId = item.id"
          @remove="remove(item.id)"
          @cancel-remove="confirmingId = null"
        />
      </li>
    </ul>

    <p v-if="actionError" class="form-error" role="alert">{{ actionError }}</p>

    <div class="dock">
      <button
        type="button"
        :disabled="!store.canEdit"
        @click="router.push(parentId ? `/new/${parentId}` : '/new')"
      >
        {{ parentId ? '添加子项' : '添加' }}
      </button>
    </div>
  </main>
</template>
