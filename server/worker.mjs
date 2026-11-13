import { DurableObject } from 'cloudflare:workers'
import { handleApi } from './nodes.mjs'

export class NodeStore extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env)
    ctx.blockConcurrencyWhile(async () => {
      ctx.storage.sql.exec(`CREATE TABLE IF NOT EXISTS app_state (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        body TEXT NOT NULL
      )`)
    })
  }

  readState() {
    const rows = [...this.ctx.storage.sql.exec('SELECT body FROM app_state WHERE id = 1')]
    if (rows.length === 0) return { revision: 0, nodes: [] }
    try {
      const parsed = JSON.parse(rows[0].body)
      if (!parsed || !Array.isArray(parsed.nodes) || !Number.isInteger(parsed.revision)) {
        return { revision: 0, nodes: [] }
      }
      return parsed
    } catch {
      return { revision: 0, nodes: [] }
    }
  }

  writeState(state) {
    this.ctx.storage.sql.exec(
      'INSERT INTO app_state (id, body) VALUES (1, ?) ON CONFLICT(id) DO UPDATE SET body = excluded.body',
      JSON.stringify(state),
    )
  }

  async fetch(request) {
    const url = new URL(request.url)
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: { 'Cache-Control': 'no-store' } })
    }

    let input = null
    if (request.method === 'POST' || request.method === 'PUT') {
      const raw = await request.text()
      if (raw.length > 1_000_000) {
        return Response.json(
          { message: '请求体过大' },
          { status: 413, headers: { 'Cache-Control': 'no-store' } },
        )
      }
      try {
        input = raw ? JSON.parse(raw) : {}
      } catch {
        return Response.json(
          { message: '请求体不是 JSON' },
          { status: 400, headers: { 'Cache-Control': 'no-store' } },
        )
      }
    }

    const state = this.readState()
    const result = handleApi(state, request.method || 'GET', url.pathname, input)
    if (result.changed) this.writeState(result.state)
    return Response.json(result.body, {
      status: result.status,
      headers: { 'Cache-Control': 'no-store' },
    })
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    if (url.pathname === '/api' || url.pathname.startsWith('/api/')) {
      const id = env.STORE.idFromName('record-draws')
      return env.STORE.get(id).fetch(request)
    }
    return env.ASSETS.fetch(request)
  },
}
