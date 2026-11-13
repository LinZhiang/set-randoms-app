import { handleApi } from '../../server/nodes.mjs'

const KEY = 'snapshot'

function json(status, body) {
  return Response.json(body, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  })
}

async function readState(namespace) {
  const raw = await namespace.get(KEY)
  if (!raw) return { revision: 0, nodes: [] }
  try {
    const parsed = JSON.parse(raw)
    if (!parsed || !Array.isArray(parsed.nodes) || !Number.isInteger(parsed.revision)) {
      return { revision: 0, nodes: [] }
    }
    return parsed
  } catch {
    return { revision: 0, nodes: [] }
  }
}

export async function onRequest(context) {
  const { request, env } = context
  if (!env.NODES) return json(500, { message: '存储没有绑定' })

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: { 'Cache-Control': 'no-store' } })
  }

  let input = null
  if (request.method === 'POST' || request.method === 'PUT') {
    const raw = await request.text()
    if (raw.length > 1_000_000) return json(413, { message: '请求体过大' })
    try {
      input = raw ? JSON.parse(raw) : {}
    } catch {
      return json(400, { message: '请求体不是 JSON' })
    }
  }

  const state = await readState(env.NODES)
  const result = handleApi(state, request.method, new URL(request.url).pathname, input)
  if (result.changed) await env.NODES.put(KEY, JSON.stringify(result.state))
  return json(result.status, result.body)
}
