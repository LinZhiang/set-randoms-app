<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useNodesStore } from '@/stores/nodes'

const route = useRoute()
const router = useRouter()
const store = useNodesStore()
const confirming = ref(false)
const error = ref('')

const nodeId = computed(() => (typeof route.params.id === 'string' ? route.params.id : ''))
const node = computed(() => store.findNode(nodeId.value))
const children = computed(() => store.childrenOf(nodeId.value))
const crumbs = computed(() => store.pathOf(nodeId.value).slice(0, -1))
const updatedLabel = computed(() => {
  if (!node.value) return ''
  return new Date(node.value.updatedAt).toLocaleString('zh-CN', { hour12: false })
})

async function remove() {
  error.value = ''
  try {
    await store.removeNode(nodeId.value)
    await router.replace('/')
  } catch (err) {
    confirming.value = false
    error.value = err instanceof Error ? err.message : '删除失败'
  }
}
</script>

<template>
  <main class="screen detail">
    <p v-if="store.link === 'syncing' && !node" class="empty">正在读取…</p>
    <template v-else-if="node">
      <p v-if="crumbs.length" class="crumbs">
        <button
          v-for="crumb in crumbs"
          :key="crumb.id"
          type="button"
          @click="router.push(`/node/${crumb.id}`)"
        >
          {{ crumb.name }}
        </button>
      </p>
      <h2>{{ node.name }}</h2>
      <p class="time">更新于 {{ updatedLabel }}</p>
      <p v-if="node.details" class="details">{{ node.details }}</p>
      <p v-else class="details muted">还没有写详情。</p>

      <section v-if="children.length" class="children">
        <h3>子节点</h3>
        <button
          v-for="child in children"
          :key="child.id"
          class="child"
          type="button"
          @click="router.push(`/node/${child.id}`)"
        >
          {{ child.name }}
        </button>
      </section>

      <p v-if="error" class="form-error" role="alert">{{ error }}</p>

      <div v-if="confirming" class="confirm" role="dialog" aria-modal="true">
        <p>删除「{{ node.name }}」以及里面的子节点？删除后其他设备也会同步消失。</p>
        <div class="confirm-actions">
          <button class="danger" type="button" :disabled="store.saving" @click="remove">
            删除
          </button>
          <button class="ghost" type="button" @click="confirming = false">取消</button>
        </div>
      </div>

      <div v-show="!confirming" class="dock actions">
        <button
          type="button"
          :disabled="!store.canEdit"
          @click="router.push(`/node/${node.id}/edit`)"
        >
          编辑
        </button>
        <button
          class="ghost"
          type="button"
          :disabled="!store.canEdit"
          @click="router.push(`/new/${node.id}`)"
        >
          添加子项
        </button>
        <button class="danger" type="button" :disabled="!store.canEdit" @click="confirming = true">
          删除
        </button>
      </div>
    </template>

    <template v-else>
      <p class="empty">这个节点不存在，可能已在别的设备上删除。</p>
      <div class="dock">
        <button type="button" @click="router.push('/')">回到列表</button>
      </div>
    </template>
  </main>
</template>
