import type { RandomSet, StorageHealth, StoragePushResult } from '@/types/randomSet'

const REQUEST_TIMEOUT_MS = 2500

function apiUrl(path: string) {
  const base = (import.meta.env.VITE_API_BASE ?? '').replace(/\/$/, '')
  return `${base}${path}`
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  try {
    const response = await fetch(apiUrl(path), {
      ...init,
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      },
    })

    if (!response.ok) {
      throw new Error(`远程存储响应 ${response.status}`)
    }

    return (await response.json()) as T
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('远程存储没有在时限内响应')
    }
    throw error instanceof Error ? error : new Error('远程存储不可用')
  } finally {
    clearTimeout(timer)
  }
}

export function checkRemoteStorage() {
  return request<StorageHealth>('/api/health')
}

export function pushSets(sets: RandomSet[]) {
  return request<StoragePushResult>('/api/sets', {
    method: 'PUT',
    body: JSON.stringify({ sets }),
  })
}
