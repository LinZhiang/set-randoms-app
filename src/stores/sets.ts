import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { checkRemoteStorage, pushSets } from '@/storage/remoteStorage'
import type { RandomSet, StorageLink } from '@/types/randomSet'

export interface DrawResult {
  setId: string
  setName: string
  item: string
}

const offlineLink: StorageLink = {
  state: 'offline',
  persistence: false,
  message: '远程存储未连接，集合只留在这次打开的页面里',
}

export const useSetsStore = defineStore('sets', () => {
  const sets = ref<RandomSet[]>([])
  const lastDraw = ref<DrawResult | null>(null)
  const link = ref<StorageLink>({
    state: 'checking',
    persistence: false,
    message: '正在检查 Node 远程存储',
  })
  const syncMessage = ref('')
  const syncing = ref(false)

  const totalItems = computed(() => sets.value.reduce((sum, set) => sum + set.items.length, 0))

  async function refreshLink() {
    link.value = { ...link.value, state: 'checking', message: '正在检查 Node 远程存储' }
    try {
      const health = await checkRemoteStorage()
      link.value = {
        state: 'connected',
        persistence: health.persistence,
        message: health.message,
      }
    } catch {
      link.value = offlineLink
    }
  }

  function addSet(name: string, items: string[]) {
    const set: RandomSet = {
      id: crypto.randomUUID(),
      name,
      items,
      createdAt: new Date().toISOString(),
    }
    sets.value = [set, ...sets.value]
    syncMessage.value = ''
  }

  function removeSet(id: string) {
    sets.value = sets.value.filter((set) => set.id !== id)
    if (lastDraw.value?.setId === id) lastDraw.value = null
  }

  function draw(id: string) {
    const set = sets.value.find((item) => item.id === id)
    const roll = crypto.getRandomValues(new Uint32Array(1))[0]
    if (!set || roll === undefined || set.items.length === 0) return

    const item = set.items[roll % set.items.length]
    if (!item) return

    lastDraw.value = { setId: set.id, setName: set.name, item }
  }

  async function syncRemote() {
    syncing.value = true
    syncMessage.value = ''
    try {
      const result = await pushSets(sets.value)
      link.value = {
        state: 'connected',
        persistence: result.persistence,
        message: result.message,
      }
      syncMessage.value = result.stored ? '已写入远程存储' : result.message
    } catch (error) {
      link.value = offlineLink
      syncMessage.value = error instanceof Error ? error.message : '发送失败'
    } finally {
      syncing.value = false
    }
  }

  return {
    sets,
    lastDraw,
    link,
    syncMessage,
    syncing,
    totalItems,
    refreshLink,
    addSet,
    removeSet,
    draw,
    syncRemote,
  }
})
