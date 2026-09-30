import { createHash } from 'node:crypto'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { nativeImage } from 'electron'
import { THUMBNAIL_SIZE } from '@shared/defaults'
import { thumbnailDir } from './db'

export function makeImageId(datasetId: string, filePath: string): string {
  return createHash('sha1').update(`${datasetId}|${filePath}`).digest('hex').slice(0, 16)
}

export function thumbnailFile(imageId: string): string {
  return join(thumbnailDir(), `${imageId}.jpg`)
}

export function ensureThumbnail(imageId: string, sourcePath: string): boolean {
  const target = thumbnailFile(imageId)
  if (existsSync(target)) return true

  const image = nativeImage.createFromPath(sourcePath)
  if (image.isEmpty()) return false

  const { width, height } = image.getSize()
  const longest = Math.max(width, height)
  const scale = longest > THUMBNAIL_SIZE ? THUMBNAIL_SIZE / longest : 1

  const resized =
    scale < 1
      ? image.resize({
          width: Math.max(1, Math.round(width * scale)),
          height: Math.max(1, Math.round(height * scale)),
          quality: 'good'
        })
      : image

  writeFileSync(target, resized.toJPEG(82))
  return true
}

export function readThumbnail(imageId: string): Buffer | null {
  const target = thumbnailFile(imageId)
  if (!existsSync(target)) return null
  try {
    return readFileSync(target)
  } catch {
    return null
  }
}
