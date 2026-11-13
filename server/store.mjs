import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { handleApi } from './nodes.mjs'

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

function fromResult(result) {
  if (result.status >= 400) return { error: result.body.message, status: result.status }
  return result.body
}

export function readNodes() {
  return exclusive(async () => {
    const state = await load()
    return handleApi(state, 'GET', '/api/nodes', null).body
  })
}

export function createNode(input) {
  return exclusive(async () => {
    const state = await load()
    const result = handleApi(state, 'POST', '/api/nodes', input)
    if (result.changed) await save(result.state)
    return fromResult(result)
  })
}

export function updateNode(id, input) {
  return exclusive(async () => {
    const state = await load()
    const result = handleApi(state, 'PUT', `/api/nodes/${encodeURIComponent(id)}`, input)
    if (result.changed) await save(result.state)
    return fromResult(result)
  })
}

export function recordView(id) {
  return exclusive(async () => {
    const state = await load()
    const result = handleApi(state, 'POST', `/api/nodes/${encodeURIComponent(id)}/view`, null)
    if (result.changed) await save(result.state)
    return fromResult(result)
  })
}

export function deleteNode(id) {
  return exclusive(async () => {
    const state = await load()
    const result = handleApi(state, 'DELETE', `/api/nodes/${encodeURIComponent(id)}`, null)
    if (result.changed) await save(result.state)
    return fromResult(result)
  })
}
