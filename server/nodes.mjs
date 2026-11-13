function emptyState() {
  return { revision: 0, nodes: [] }
}

function fail(state, status, message) {
  return { status, changed: false, state, body: { message } }
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

function nodeId(pathname) {
  const match = pathname.match(/^\/api\/nodes\/([^/]+)$/)
  return match ? decodeURIComponent(match[1]) : ''
}

export function handleApi(state, method, pathname, input) {
  if (!state || !Array.isArray(state.nodes) || !Number.isInteger(state.revision)) {
    state = emptyState()
  }

  if (method === 'GET' && pathname === '/api/health') {
    return {
      status: 200,
      changed: false,
      state,
      body: {
        ok: true,
        persistence: true,
        message: '存储已开启，多台设备会同步同一份记录',
      },
    }
  }

  if (method === 'GET' && pathname === '/api/nodes') {
    return {
      status: 200,
      changed: false,
      state,
      body: { revision: state.revision, nodes: state.nodes },
    }
  }

  if (method === 'POST' && pathname === '/api/nodes') {
    const name = cleanName(input?.name)
    if (name.error) return fail(state, 400, name.error)
    const details = cleanDetails(input?.details)
    if (details.error) return fail(state, 400, details.error)
    const parent = cleanParentId(input?.parentId, state.nodes, null, null)
    if (parent.error) return fail(state, 400, parent.error)

    const now = new Date().toISOString()
    const node = {
      id: crypto.randomUUID(),
      parentId: parent.parentId,
      name: name.name,
      details: details.details,
      createdAt: now,
      updatedAt: now,
    }
    state.nodes.push(node)
    state.revision += 1
    return { status: 201, changed: true, state, body: { node, revision: state.revision } }
  }

  const id = nodeId(pathname)
  if (id && method === 'PUT') {
    const current = state.nodes.find((node) => node.id === id)
    if (!current) return fail(state, 404, '节点不存在')

    const name = cleanName(input?.name)
    if (name.error) return fail(state, 400, name.error)
    const details = cleanDetails(input?.details)
    if (details.error) return fail(state, 400, details.error)
    const parent = cleanParentId(input?.parentId, state.nodes, id, current.parentId)
    if (parent.error) return fail(state, 400, parent.error)

    current.name = name.name
    current.details = details.details
    current.parentId = parent.parentId
    current.updatedAt = new Date().toISOString()
    state.revision += 1
    return { status: 200, changed: true, state, body: { node: current, revision: state.revision } }
  }

  if (id && method === 'DELETE') {
    if (!state.nodes.some((node) => node.id === id)) return fail(state, 404, '节点不存在')

    const removed = descendantIds(state.nodes, id)
    removed.add(id)
    state.nodes = state.nodes.filter((node) => !removed.has(node.id))
    state.revision += 1
    return {
      status: 200,
      changed: true,
      state,
      body: { deletedIds: [...removed], revision: state.revision },
    }
  }

  return fail(state, 404, '没有这个接口')
}
