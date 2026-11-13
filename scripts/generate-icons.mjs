import { deflateSync } from 'node:zlib'
import { writeFileSync } from 'node:fs'

function crc32(buffer) {
  let crc = ~0
  for (const byte of buffer) {
    crc ^= byte
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1))
  }
  return ~crc >>> 0
}

function chunk(type, data) {
  const name = Buffer.from(type)
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length)
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(Buffer.concat([name, data])))
  return Buffer.concat([length, name, data, crc])
}

function inRoundRect(x, y, left, top, right, bottom, radius) {
  const nearestX = Math.max(left + radius, Math.min(x, right - radius))
  const nearestY = Math.max(top + radius, Math.min(y, bottom - radius))
  const insideCore =
    x >= left + radius && x <= right - radius && y >= top && y <= bottom
    || y >= top + radius && y <= bottom - radius && x >= left && x <= right
  if (insideCore) return true
  return (x - nearestX) ** 2 + (y - nearestY) ** 2 <= radius ** 2
}

function createIcon(size) {
  const raw = Buffer.alloc((size * 4 + 1) * size)
  const ink = [28, 25, 21]
  const card = [243, 239, 230]
  const line = [214, 203, 188]
  const accent = [194, 65, 12]
  const cardLeft = size * 0.3
  const cardRight = size * 0.7
  const cardTop = size * 0.22
  const cardBottom = size * 0.74
  const cardRadius = size * 0.06
  const dotX = size * 0.6
  const dotY = size * 0.56
  const dotRadius = size * 0.075

  for (let y = 0; y < size; y += 1) {
    const row = y * (size * 4 + 1)
    raw[row] = 0
    for (let x = 0; x < size; x += 1) {
      let color = ink
      if (inRoundRect(x, y, cardLeft, cardTop, cardRight, cardBottom, cardRadius)) color = card
      const lineY1 = cardTop + (cardBottom - cardTop) * 0.28
      const lineY2 = cardTop + (cardBottom - cardTop) * 0.42
      if (
        x > cardLeft + size * 0.08 &&
        x < cardRight - size * 0.08 &&
        (Math.abs(y - lineY1) < size * 0.012 || Math.abs(y - lineY2) < size * 0.012)
      ) {
        color = line
      }
      if ((x - dotX) ** 2 + (y - dotY) ** 2 <= dotRadius ** 2) color = accent
      const offset = row + 1 + x * 4
      raw[offset] = color[0]
      raw[offset + 1] = color[1]
      raw[offset + 2] = color[2]
      raw[offset + 3] = 255
    }
  }

  const header = Buffer.alloc(13)
  header.writeUInt32BE(size, 0)
  header.writeUInt32BE(size, 4)
  header[8] = 8
  header[9] = 6
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

writeFileSync(new URL('../public/icon-192.png', import.meta.url), createIcon(192))
writeFileSync(new URL('../public/icon-512.png', import.meta.url), createIcon(512))
writeFileSync(new URL('../public/apple-touch-icon.png', import.meta.url), createIcon(180))
