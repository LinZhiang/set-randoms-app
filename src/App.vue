<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue'
import { RouterView, useRoute, useRouter } from 'vue-router'
import { useNodesStore } from '@/stores/nodes'

const store = useNodesStore()
const route = useRoute()
const router = useRouter()

const title = computed(() => {
  if (route.name === 'create') return '新建'
  if (route.name === 'edit') return '编辑'
  if (route.name === 'detail') return '详情'
  if (route.name === 'test') return '测试'
  if (route.name === 'level' && typeof route.params.id === 'string') {
    return store.findNode(route.params.id)?.name || '子节点'
  }
  return '记录抽卡'
})

const statusText = computed(() => {
  if (store.link === 'syncing') return '正在同步'
  if (store.link === 'offline') return '未连接'
  if (!store.syncedAt) return '已同步'
  return `已同步 ${store.syncedAt.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`
})

let timer = 0

function syncIfVisible() {
  if (document.visibilityState === 'visible') void store.refresh({ quiet: true })
}

function levelOf(nodeId: string | null) {
  if (!nodeId) return '/'
  return `/level/${nodeId}`
}

function goBack() {
  const id = typeof route.params.id === 'string' ? route.params.id : ''
  const parentId = typeof route.params.parentId === 'string' ? route.params.parentId : ''
  if (route.name === 'level') {
    void router.push(levelOf(store.findNode(id)?.parentId ?? null))
    return
  }
  if (route.name === 'test' || route.name === 'edit') {
    void router.push(levelOf(store.findNode(id)?.parentId ?? null))
    return
  }
  if (route.name === 'create') {
    void router.push(parentId ? `/level/${parentId}` : '/')
    return
  }
  void router.push('/')
}

onMounted(() => {
  void store.refresh()
  timer = window.setInterval(syncIfVisible, 10000)
  document.addEventListener('visibilitychange', syncIfVisible)
})

onUnmounted(() => {
  window.clearInterval(timer)
  document.removeEventListener('visibilitychange', syncIfVisible)
})
</script>

<template>
  <div class="app">
    <header class="topbar">
      <button v-if="route.name !== 'tree'" class="icon-btn" type="button" @click="goBack">
        返回
      </button>
      <span v-else class="icon-btn"></span>
      <h1>
        {{ title }}
        <small :data-state="store.link">{{ statusText }}</small>
      </h1>
      <button class="icon-btn" type="button" @click="store.refresh()">同步</button>
    </header>
    <RouterView />
  </div>
</template>
