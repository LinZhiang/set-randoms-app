import { randomUUID } from 'node:crypto'
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const dataFile =
  process.env.DATA_FILE || join(dirname(fileURLToPath(import.meta.url)), 'data', 'nodes.json')

let chain = Promise.resolve()

function exclusive(task) {
  const run = chain.then(task, task)
  chain = run.then(
    () => undefined,
    () => undefined,
  )
  return run
}

function emptyState() {
  return { revision: 0, nodes: [] }
}

async function load() {
  try {
    const parsed = JSON.parse(await readFile(dataFile, 'utf8'))
    if (!parsed || !Array.isArray(parsed.nodes) || !Number.isInteger(parsed.revision)) {
      throw new Error('存储文件已损坏')
    }
    return parsed
  } catch (error) {
    if (error && error.code === 'ENOENT') return emptyState()
    throw error
  }
}

async function save(state) {
  await mkdir(dirname(dataFile), { recursive: true })
  const tmp = `${dataFile}.${process.pid}.tmp`
  await writeFile(tmp, JSON.stringify(state))
  try {
    await rename(tmp, dataFile)
  } catch (error) {
    if (!error || (error.code !== 'EPERM' && error.code !== 'EEXIST')) throw error
    await rm(dataFile, { force: true })
    await rename(tmp, dataFile)
  }
}

function cleanName(value) {
  if (typeof value !== 'string') return { error: '名称不能为空' }
  const name = value.replace(/\s+/g, ' ').trim()
  if (!name) return { error: '名称不能为空' }
  if (name.length > 80) return { error: '名称不能超过 80 个字' }
  return { name }
}

function cleanDetails(value) {
  if (value == null || value === '') return { details: '' }
  if (typeof value !== 'string') return { error: '详情格式不正确' }
  const details = value.replace(/\r\n/g, '\n').replace(/^\s+|\s+$/g, '')
  if (details.length > 8000) return { error: '详情不能超过 8000 个字' }
  return { details }
}

function descendantIds(nodes, id) {
  const ids = new Set()
  const stack = [id]
  while (stack.length > 0) {
    const current = stack.pop()
    for (const node of nodes) {
      if (node.parentId === current && !ids.has(node.id)) {
        ids.add(node.id)
        stack.push(node.id)
      }
    }
  }
  return ids
}

function cleanParentId(value, nodes, selfId, fallback) {
  if (value === undefined) return { parentId: fallback ?? null }
  if (value == null || value === '') return { parentId: null }
  if (typeof value !== 'string') return { error: '父节点不正确' }
  if (selfId && value === selfId) return { error: '不能把节点放到自己下面' }
  if (!nodes.some((node) => node.id === value)) return { error: '父节点不存在' }
  if (selfId && descendantIds(nodes, selfId).has(value)) {
    return { error: '不能移动到自己的子节点下' }
  }
  return { parentId: value }
}

export function readNodes() {
  return exclusive(async () => {
    const state = await load()
    return { revision: state.revision, nodes: state.nodes }
  })
}

export function createNode(input) {
  return exclusive(async () => {
    const state = await load()
    const name = cleanName(input?.name)
    if (name.error) return { error: name.error, status: 400 }
    const details = cleanDetails(input?.details)
    if (details.error) return { error: details.error, status: 400 }
    const parent = cleanParentId(input?.parentId, state.nodes, null, null)
    if (parent.error) return { error: parent.error, status: 400 }

    const now = new Date().toISOString()
    const node = {
      id: randomUUID(),
      parentId: parent.parentId,
      name: name.name,
      details: details.details,
      createdAt: now,
      updatedAt: now,
    }
    state.nodes.push(node)
    state.revision += 1
    await save(state)
    return { node, revision: state.revision }
  })
}

export function updateNode(id, input) {
  return exclusive(async () => {
    const state = await load()
    const current = state.nodes.find((node) => node.id === id)
    if (!current) return { error: '节点不存在', status: 404 }

    const name = cleanName(input?.name)
    if (name.error) return { error: name.error, status: 400 }
    const details = cleanDetails(input?.details)
    if (details.error) return { error: details.error, status: 400 }
    const parent = cleanParentId(input?.parentId, state.nodes, id, current.parentId)
    if (parent.error) return { error: parent.error, status: 400 }

    current.name = name.name
    current.details = details.details
    current.parentId = parent.parentId
    current.updatedAt = new Date().toISOString()
    state.revision += 1
    await save(state)
    return { node: current, revision: state.revision }
  })
}

export function deleteNode(id) {
  return exclusive(async () => {
    const state = await load()
    if (!state.nodes.some((node) => node.id === id)) return { error: '节点不存在', status: 404 }

    const removed = descendantIds(state.nodes, id)
    removed.add(id)
    state.nodes = state.nodes.filter((node) => !removed.has(node.id))
    state.revision += 1
    await save(state)
    return { deletedIds: [...removed], revision: state.revision }
  })
}
