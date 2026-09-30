import { closeSync, fstatSync, openSync, readSync } from 'node:fs'
import { inflateSync } from 'node:zlib'

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

export function readHead(filePath: string, maxBytes: number): Buffer {
  const fd = openSync(filePath, 'r')
  try {
    const size = Math.min(fstatSync(fd).size, maxBytes)
    const buffer = Buffer.allocUnsafe(size)
    const read = readSync(fd, buffer, 0, size, 0)
    return buffer.subarray(0, read)
  } finally {
    closeSync(fd)
  }
}

export interface PngInfo {
  width: number
  height: number
  texts: Record<string, string>
}

export function parsePng(buffer: Buffer): PngInfo | null {
  if (buffer.length < 8 || !buffer.subarray(0, 8).equals(PNG_SIGNATURE)) return null

  const texts: Record<string, string> = {}
  let width = 0
  let height = 0
  let offset = 8

  while (offset + 8 <= buffer.length) {
    const length = buffer.readUInt32BE(offset)
    const type = buffer.toString('latin1', offset + 4, offset + 8)
    const dataStart = offset + 8
    const dataEnd = dataStart + length

    if (type === 'IEND' || type === 'IDAT') break
    if (dataEnd + 4 > buffer.length) break

    const data = buffer.subarray(dataStart, dataEnd)

    if (type === 'IHDR' && data.length >= 8) {
      width = data.readUInt32BE(0)
      height = data.readUInt32BE(4)
    } else if (type === 'tEXt') {
      const nul = data.indexOf(0)
      if (nul > 0) texts[data.toString('latin1', 0, nul)] = data.toString('latin1', nul + 1)
    } else if (type === 'iTXt') {
      const nul = data.indexOf(0)
      if (nul > 0) {
        const keyword = data.toString('latin1', 0, nul)
        const compressed = data[nul + 1] === 1
        const langEnd = data.indexOf(0, nul + 3)
        const transEnd = langEnd === -1 ? -1 : data.indexOf(0, langEnd + 1)
        if (transEnd !== -1) {
          const payload = data.subarray(transEnd + 1)
          try {
            texts[keyword] = compressed
              ? inflateSync(payload).toString('utf8')
              : payload.toString('utf8')
          } catch {
            /* 压缩块损坏时忽略 */
          }
        }
      }
    } else if (type === 'zTXt') {
      const nul = data.indexOf(0)
      if (nul > 0) {
        try {
          texts[data.toString('latin1', 0, nul)] = inflateSync(
            data.subarray(nul + 2)
          ).toString('latin1')
        } catch {
          /* 忽略损坏的 zTXt */
        }
      }
    }

    offset = dataEnd + 4
  }

  return { width, height, texts }
}

export function parseJpegSize(buffer: Buffer): { width: number; height: number } | null {
  if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) return null

  let offset = 2
  while (offset + 9 < buffer.length) {
    if (buffer[offset] !== 0xff) {
      offset += 1
      continue
    }
    const marker = buffer[offset + 1]
    if (marker === 0xff) {
      offset += 1
      continue
    }
    if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      offset += 2
      continue
    }
    const length = buffer.readUInt16BE(offset + 2)
    const isSof =
      marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc
    if (isSof) {
      return {
        height: buffer.readUInt16BE(offset + 5),
        width: buffer.readUInt16BE(offset + 7)
      }
    }
    offset += 2 + length
  }
  return null
}

export function parseWebpSize(buffer: Buffer): { width: number; height: number } | null {
  if (buffer.length < 30) return null
  if (buffer.toString('latin1', 0, 4) !== 'RIFF') return null
  if (buffer.toString('latin1', 8, 12) !== 'WEBP') return null

  const format = buffer.toString('latin1', 12, 16)
  if (format === 'VP8X') {
    return { width: 1 + buffer.readUIntLE(24, 3), height: 1 + buffer.readUIntLE(27, 3) }
  }
  if (format === 'VP8 ') {
    return { width: buffer.readUInt16LE(26) & 0x3fff, height: buffer.readUInt16LE(28) & 0x3fff }
  }
  if (format === 'VP8L') {
    const bits = buffer.readUInt32LE(21)
    return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 }
  }
  return null
}

export function readDimensions(filePath: string): { width: number; height: number } {
  const buffer = readHead(filePath, 256 * 1024)
  const png = parsePng(buffer)
  if (png) return { width: png.width, height: png.height }
  return (
    parseJpegSize(buffer) ??
    parseWebpSize(buffer) ?? { width: 0, height: 0 }
  )
}
