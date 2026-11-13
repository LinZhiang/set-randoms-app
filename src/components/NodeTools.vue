<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useNodesStore } from '@/stores/nodes'

const props = defineProps<{
  nodeId: string
}>()

const store = useNodesStore()
const router = useRouter()
const route = useRoute()
const confirming = ref(false)
const error = ref('')

const node = computed(() => store.findNode(props.nodeId))
const hasChildren = computed(() => store.childrenOf(props.nodeId).length > 0)

async function remove() {
  error.value = ''
  try {
    const parentId = node.value?.parentId ?? null
    await store.removeNode(props.nodeId)
    confirming.value = false
    if (route.params.id === props.nodeId) {
      await router.replace(parentId ? `/node/${parentId}` : '/')
    }
  } catch (err) {
    confirming.value = false
    error.value = err instanceof Error ? err.message : '删除失败'
  }
}
</script>

<template>
  <div v-if="node" class="tools">
    <button
      class="tool"
      type="button"
      aria-label="添加子节点"
      :disabled="!store.canEdit"
      @click="router.push(`/new/${node.id}`)"
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M12 5v14M5 12h14"
          fill="none"
          stroke="currentColor"
          stroke-width="1.8"
          stroke-linecap="round"
        />
      </svg>
    </button>
    <button
      class="tool"
      type="button"
      aria-label="编辑"
      :disabled="!store.canEdit"
      @click="router.push(`/node/${node.id}/edit`)"
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M14.5 5.5l4 4L8 20H4v-4L14.5 5.5z"
          fill="none"
          stroke="currentColor"
          stroke-width="1.8"
          stroke-linejoin="round"
        />
      </svg>
    </button>
    <button
      class="tool danger"
      type="button"
      aria-label="删除"
      :disabled="!store.canEdit"
      @click="confirming = true"
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M5 7h14M9 7V5h6v2M8 7l1 12h6l1-12"
          fill="none"
          stroke="currentColor"
          stroke-width="1.8"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    </button>
    <button
      v-if="hasChildren"
      class="tool test"
      type="button"
      @click="router.push(`/node/${node.id}/test`)"
    >
      测试
    </button>
    <p v-if="error" class="form-error" role="alert">{{ error }}</p>
  </div>

  <div v-if="confirming && node" class="confirm" role="dialog" aria-modal="true">
    <p>删除「{{ node.name }}」以及里面的子节点？删除后其他设备也会同步消失。</p>
    <div class="confirm-actions">
      <button class="danger" type="button" :disabled="store.saving" @click="remove">删除</button>
      <button class="ghost" type="button" @click="confirming = false">取消</button>
    </div>
  </div>
</template>
