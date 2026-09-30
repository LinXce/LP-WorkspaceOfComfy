import { readdir, stat } from 'node:fs/promises'
import { basename, join } from 'node:path'
import type { ImageMeta, ScanProgress } from '@shared/types'
import { probeImage } from './metadata'
import { ensureThumbnail, makeImageId } from './thumbnails'

const IMAGE_FILE = /\.(png|jpe?g|webp)$/i
const MAX_FILES = 20000

type ProgressFn = (progress: Omit<ScanProgress, 'datasetId' | 'datasetName'>) => void

async function walk(root: string): Promise<string[]> {
  const found: string[] = []
  const stack: string[] = [root]

  while (stack.length > 0 && found.length < MAX_FILES) {
    const dir = stack.pop()
    if (!dir) break
    let entries
    try {
      entries = await readdir(dir, { withFileTypes: true })
    } catch {
      continue
    }
    for (const entry of entries) {
      if (entry.name.startsWith('.')) continue
      const full = join(dir, entry.name)
      if (entry.isDirectory()) {
        stack.push(full)
      } else if (IMAGE_FILE.test(entry.name)) {
        found.push(full)
        if (found.length >= MAX_FILES) break
      }
    }
  }

  found.sort((a, b) => a.localeCompare(b))
  return found
}

const yieldToLoop = (): Promise<void> => new Promise((resolve) => setImmediate(resolve))

export async function scanFolder(
  folder: string,
  datasetId: string,
  preserved: Map<string, ImageMeta>,
  onProgress: ProgressFn
): Promise<{ images: ImageMeta[]; skipped: number }> {
  onProgress({ phase: 'walking', current: 0, total: 0 })
  const files = await walk(folder)

  const images: ImageMeta[] = []
  let skipped = 0

  for (let index = 0; index < files.length; index++) {
    const file = files[index]
    try {
      const info = await stat(file)
      const probe = probeImage(file)
      const id = makeImageId(datasetId, file)
      const previous = preserved.get(id)

      const sidecarTags = probe.tags
      const modelTags = previous?.modelTags ?? []
      const manualTags = previous?.manualTags ?? []
      const hiddenTags = previous?.hiddenTags ?? []

      images.push({
        id,
        datasetId,
        path: file,
        fileName: basename(file),
        width: probe.width,
        height: probe.height,
        sizeBytes: info.size,
        mtime: info.mtimeMs,
        source: probe.source,
        positive: probe.meta.positive,
        negative: probe.meta.negative,
        checkpoint: probe.meta.checkpoint,
        loras: probe.meta.loras,
        sampler: probe.meta.sampler,
        scheduler: probe.meta.scheduler,
        steps: probe.meta.steps,
        cfg: probe.meta.cfg,
        seed: probe.meta.seed,
        clipSkip: probe.meta.clipSkip,
        sidecarTags,
        modelTags,
        manualTags,
        hiddenTags,
        tags: [...new Set([...sidecarTags, ...modelTags, ...manualTags])].filter(
          (tag) => !hiddenTags.includes(tag)
        ),
        requeued: previous?.requeued,
        caption: previous?.caption,
        taggedAt: previous?.taggedAt
      })
    } catch {
      skipped += 1
    }

    if (index % 25 === 0 || index === files.length - 1) {
      onProgress({ phase: 'parsing', current: index + 1, total: files.length })
      await yieldToLoop()
    }
  }

  for (let index = 0; index < images.length; index++) {
    const image = images[index]
    try {
      ensureThumbnail(image.id, image.path)
    } catch {
      skipped += 1
    }
    if (index % 8 === 0 || index === images.length - 1) {
      onProgress({ phase: 'thumbnails', current: index + 1, total: images.length })
      await yieldToLoop()
    }
  }

  onProgress({ phase: 'done', current: images.length, total: images.length })
  return { images, skipped }
}
