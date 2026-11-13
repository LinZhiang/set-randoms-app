import { createServer } from 'node:http'
import { createNode, deleteNode, readNodes, recordView, updateNode } from './store.mjs'

const port = Number(process.env.PORT || 3000)
const host = process.env.HOST || '127.0.0.1'
const maxBytes = 1_000_000
const token = process.env.API_TOKEN || ''

function send(res, status, body) {
  const payload = status === 204 ? '' : JSON.stringify(body)
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': process.env.CORS_ORIGIN || '*',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Accept, Authorization',
    'Cache-Control': 'no-store',
    'Content-Length': Buffer.byteLength(payload),
  })
  res.end(payload)
}

function authorized(req) {
  if (!token) return true
  return req.headers.authorization === `Bearer ${token}`
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    let size = 0
    req.on('data', (chunk) => {
      size += chunk.length
      if (size > maxBytes) {
        reject(Object.assign(new Error('请求体过大'), { statusCode: 413 }))
        req.destroy()
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    req.on('error', reject)
  })
}

async function readJson(req) {
  const raw = await readBody(req)
  if (!raw) return {}
  try {
    return JSON.parse(raw)
  } catch {
    throw Object.assign(new Error('请求体不是 JSON'), { statusCode: 400 })
  }
}

function nodeId(pathname) {
  const match = pathname.match(/^\/api\/nodes\/([^/]+)$/)
  return match ? decodeURIComponent(match[1]) : ''
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url || '/', 'http://127.0.0.1')

  if (req.method === 'OPTIONS') {
    send(res, 204, {})
    return
  }

  if (!authorized(req)) {
    send(res, 401, { message: '没有存储权限' })
    return
  }

  try {
    if (req.method === 'GET' && url.pathname === '/api/health') {
      send(res, 200, {
        ok: true,
        persistence: true,
        message: 'Node 存储已开启，多台设备会同步同一份记录',
      })
      return
    }

    if (req.method === 'GET' && url.pathname === '/api/nodes') {
      send(res, 200, await readNodes())
      return
    }

    if (req.method === 'POST' && url.pathname === '/api/nodes') {
      const result = await createNode(await readJson(req))
      send(
        res,
        result.error ? result.status : 201,
        result.error ? { message: result.error } : result,
      )
      return
    }

    const viewed = url.pathname.match(/^\/api\/nodes\/([^/]+)\/view$/)
    if (viewed && req.method === 'POST') {
      const result = await recordView(decodeURIComponent(viewed[1]))
      send(
        res,
        result.error ? result.status : 200,
        result.error ? { message: result.error } : result,
      )
      return
    }

    const id = nodeId(url.pathname)
    if (id && req.method === 'PUT') {
      const result = await updateNode(id, await readJson(req))
      send(
        res,
        result.error ? result.status : 200,
        result.error ? { message: result.error } : result,
      )
      return
    }

    if (id && req.method === 'DELETE') {
      const result = await deleteNode(id)
      send(
        res,
        result.error ? result.status : 200,
        result.error ? { message: result.error } : result,
      )
      return
    }

    send(res, 404, { message: '没有这个接口' })
  } catch (error) {
    const status = error && error.statusCode ? error.statusCode : 500
    send(res, status, { message: error instanceof Error ? error.message : '存储服务出错' })
  }
})

server.listen(port, host, () => {
  console.log(`卡片式练习 storage listening on http://${host}:${port}`)
})
