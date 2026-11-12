export interface RandomSet {
  id: string
  name: string
  items: string[]
  createdAt: string
}

export interface StorageHealth {
  ok: boolean
  persistence: boolean
  message: string
}

export interface StoragePushResult {
  persistence: boolean
  accepted: boolean
  stored: boolean
  message: string
}

export type StorageLinkState = 'checking' | 'offline' | 'connected'

export interface StorageLink {
  state: StorageLinkState
  persistence: boolean
  message: string
}
