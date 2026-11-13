import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { createNode, deleteNode, fetchNodes, recordView, updateNode } from '@/storage/remoteStorage'
import type { CardNode, NodeDraft, NodeSnapshot } from '@/types/node'

const CACHE_KEY = 'record-draws-tree'

export type LinkState = 'syncing' | 'synced' | 'offline'

function readCache(): NodeSnapshot | null {
  try {
    if (typeof localStorage === 'undefined') return null
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as NodeSnapshot
    if (!parsed || !Array.isArray(parsed.nodes)) return null
    return normalize(parsed)
  } catch {
    return null
  }
}

function normalize(snapshot: NodeSnapshot): NodeSnapshot {
  return {
    revision: snapshot.revision,
    nodes: snapshot.nodes.map((node) => ({ ...node, views: node.views ?? 0 })),
  }
}

function writeCache(snapshot: NodeSnapshot) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(snapshot))
  } catch {
    // The phone can keep going if storage is full. The server remains the source of truth.
  }
}

interface InstallPrompt extends Event {
  prompt: () => Promise<void>
}

export const useNodesStore = defineStore('nodes', () => {
  const cached = readCache()
  const nodes = ref<CardNode[]>(cached?.nodes ?? [])
  const revision = ref(cached?.revision ?? 0)
  const link = ref<LinkState>('syncing')
  const message = ref('')
  const saving = ref(false)
  const syncedAt = ref<Date | null>(null)
  const expanded = ref<string[]>([])
  const installPrompt = ref<InstallPrompt | null>(null)

  if (typeof window !== 'undefined') {
    window.addEventListener('beforeinstallprompt', (event) => {
      event.preventDefault()
      installPrompt.value = event as InstallPrompt
    })
  }

  const canEdit = computed(() => link.value === 'synced' && !saving.value)

  function childrenOf(parentId: string | null) {
    return nodes.value
      .filter((node) => node.parentId === parentId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  }

  function findNode(id: string) {
    return nodes.value.find((node) => node.id === id) ?? null
  }

  function pathOf(id: string) {
    const items: CardNode[] = []
    const guard = new Set<string>()
    let currentId: string | null = id
    while (currentId && !guard.has(currentId)) {
      guard.add(currentId)
      const current = findNode(currentId)
      if (!current) break
      items.unshift(current)
      currentId = current.parentId
    }
    return items
  }

  function leavesUnder(rootId: string) {
    const leaves: CardNode[] = []
    const seen = new Set<string>()
    const walk = (id: string) => {
      if (seen.has(id)) return
      seen.add(id)
      const children = childrenOf(id)
      if (id !== rootId && children.length === 0) {
        const node = findNode(id)
        if (node) leaves.push(node)
        return
      }
      for (const child of children) walk(child.id)
    }
    walk(rootId)
    return leaves
  }

  function isExpanded(id: string) {
    return expanded.value.includes(id)
  }

  function toggle(id: string) {
    expanded.value = isExpanded(id)
      ? expanded.value.filter((item) => item !== id)
      : [...expanded.value, id]
  }

  async function refresh(options?: { quiet?: boolean }) {
    if (!options?.quiet) link.value = 'syncing'
    try {
      const snapshot = normalize(await fetchNodes())
      revision.value = snapshot.revision
      nodes.value = snapshot.nodes
      writeCache(snapshot)
      link.value = 'synced'
      syncedAt.value = new Date()
      message.value = ''
      return true
    } catch (error) {
      link.value = 'offline'
      message.value = error instanceof Error ? error.message : '同步失败'
      return false
    }
  }

  function remember(node: CardNode) {
    const rest = nodes.value.filter((item) => item.id !== node.id)
    nodes.value = [...rest, node]
  }

  async function addNode(draft: NodeDraft) {
    saving.value = true
    try {
      const result = await createNode(draft)
      const synced = await refresh({ quiet: true })
      if (!synced) remember(result.node)
      return result.node
    } finally {
      saving.value = false
    }
  }

  async function saveNode(id: string, draft: NodeDraft) {
    saving.value = true
    try {
      const result = await updateNode(id, draft)
      const synced = await refresh({ quiet: true })
      if (!synced) remember(result.node)
      return result.node
    } finally {
      saving.value = false
    }
  }

  async function markViewed(id: string) {
    const current = findNode(id)
    if (!current || childrenOf(id).length > 0) return current
    const optimistic = { ...current, views: (current.views ?? 0) + 1 }
    remember(optimistic)
    try {
      const result = await recordView(id)
      const node = { ...result.node, views: result.node.views ?? optimistic.views }
      remember(node)
      revision.value = result.revision
      writeCache({ revision: revision.value, nodes: nodes.value })
      return node
    } catch {
      return optimistic
    }
  }

  async function promptInstall() {
    const event = installPrompt.value
    if (!event) return
    await event.prompt()
    installPrompt.value = null
  }

  async function removeNode(id: string) {
    saving.value = true
    try {
      const result = await deleteNode(id)
      const synced = await refresh({ quiet: true })
      if (!synced) {
        const removed = new Set(result.deletedIds)
        nodes.value = nodes.value.filter((node) => !removed.has(node.id))
      }
      expanded.value = expanded.value.filter((item) => item !== id)
    } finally {
      saving.value = false
    }
  }

  return {
    nodes,
    revision,
    link,
    message,
    saving,
    syncedAt,
    canEdit,
    childrenOf,
    findNode,
    pathOf,
    leavesUnder,
    isExpanded,
    toggle,
    installPrompt,
    markViewed,
    promptInstall,
    refresh,
    addNode,
    saveNode,
    removeNode,
  }
})
