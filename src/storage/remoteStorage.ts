import type { CardNode, NodeDraft, NodeSnapshot } from '@/types/node'

const REQUEST_TIMEOUT_MS = 10000

function apiUrl(path: string) {
  const base = (import.meta.env.VITE_API_BASE ?? '').replace(/\/$/, '')
  return `${base}${path}`
}

function headers(hasBody: boolean) {
  const token = import.meta.env.VITE_API_TOKEN
  return {
    Accept: 'application/json',
    ...(hasBody ? { 'Content-Type': 'application/json' } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  try {
    const response = await fetch(apiUrl(path), {
      ...init,
      cache: 'no-store',
      signal: controller.signal,
      headers: headers(Boolean(init?.body)),
    })
    const body = (await response.json().catch(() => null)) as { message?: string } | null
    if (!response.ok) {
      throw new Error(body?.message || `存储服务响应 ${response.status}`)
    }
    return body as T
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('存储服务没有在时限内响应')
    }
    throw error instanceof Error ? error : new Error('存储服务不可用')
  } finally {
    clearTimeout(timer)
  }
}

export function fetchNodes() {
  return request<NodeSnapshot>('/api/nodes')
}

export function createNode(draft: NodeDraft) {
  return request<{ node: CardNode; revision: number }>('/api/nodes', {
    method: 'POST',
    body: JSON.stringify(draft),
  })
}

export function updateNode(id: string, draft: NodeDraft) {
  return request<{ node: CardNode; revision: number }>(`/api/nodes/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(draft),
  })
}

export function recordView(id: string) {
  return request<{ node: CardNode; revision: number }>(
    `/api/nodes/${encodeURIComponent(id)}/view`,
    { method: 'POST' },
  )
}

export function deleteNode(id: string) {
  return request<{ deletedIds: string[]; revision: number }>(
    `/api/nodes/${encodeURIComponent(id)}`,
    { method: 'DELETE' },
  )
}
