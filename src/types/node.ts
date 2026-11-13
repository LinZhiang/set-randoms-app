export interface CardNode {
  id: string
  parentId: string | null
  name: string
  details: string
  createdAt: string
  updatedAt: string
}

export interface NodeSnapshot {
  revision: number
  nodes: CardNode[]
}

export interface NodeDraft {
  parentId?: string | null
  name: string
  details: string
}
