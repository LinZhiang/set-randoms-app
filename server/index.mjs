import { createServer } from 'node:http'

const port = Number(process.env.PORT || 3000)
const host = process.env.HOST || '127.0.0.1'
const maxBytes = 1_000_000

function send(res, status, body) {
  const payload = JSON.stringify(body)
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': process.env.CORS_ORIGIN || '*',
    'Access-Control-Allow-Methods': 'GET,PUT,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Accept',
    'Content-Length': Buffer.byteLength(payload),
  })
  res.end(payload)
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

function isRandomSet(value) {
  if (!value || typeof value !== 'object') return false
  if (typeof value.id !== 'string' || value.id.length === 0 || value.id.length > 80) return false
  if (typeof value.name !== 'string' || value.name.length === 0 || value.name.length > 80) return false
  if (typeof value.createdAt !== 'string' || value.createdAt.length > 40) return false
  if (!Array.isArray(value.items) || value.items.length === 0 || value.items.length > 500) return false
  return value.items.every((item) => typeof item === 'string' && item.length > 0 && item.length <= 200)
}

function validatePayload(raw) {
  let parsed
  try {
    parsed = JSON.parse(raw || '{}')
  } catch {
    return { error: '请求体不是 JSON' }
  }

  if (!parsed || !Array.isArray(parsed.sets) || parsed.sets.length > 100) {
    return { error: 'sets 需要是不超过 100 个集合的数组' }
  }
  if (!parsed.sets.every(isRandomSet)) {
    return { error: '集合格式不正确' }
  }
  return { sets: parsed.sets }
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url || '/', 'http://127.0.0.1')

  if (req.method === 'OPTIONS') {
    send(res, 204, {})
    return
  }

  if (req.method === 'GET' && url.pathname === '/api/health') {
    send(res, 200, {
      ok: true,
      persistence: false,
      message: 'Node 远程存储已连接，当前只接收、不写入',
    })
    return
  }

  if (req.method === 'GET' && url.pathname === '/api/sets') {
    send(res, 200, {
      persistence: false,
      sets: [],
      message: '存储尚未启用，没有可读取的数据',
    })
    return
  }

  if (req.method === 'PUT' && url.pathname === '/api/sets') {
    try {
      const raw = await readBody(req)
      const result = validatePayload(raw)
      if (result.error) {
        send(res, 400, { persistence: false, accepted: false, stored: false, message: result.error })
        return
      }

      // 暂时不存：校验通过后直接丢弃，不写内存、文件或数据库。
      void result.sets
      send(res, 200, {
        persistence: false,
        accepted: true,
        stored: false,
        message: '已接收，按当前配置不保存',
      })
    } catch (error) {
      const statusCode = error?.statusCode || 400
      send(res, statusCode, {
        persistence: false,
        accepted: false,
        stored: false,
        message: error instanceof Error ? error.message : '无法读取请求',
      })
    }
    return
  }

  send(res, 404, { message: '没有这个接口' })
})

server.listen(port, host, () => {
  console.log(`set-randoms storage listening on http://${host}:${port} (persistence off)`)
})
