import { existsSync, readFileSync } from 'node:fs'
import type { MetadataSource, RawMetadata } from '@shared/types'
import { isA1111Parameters, parseA1111Parameters } from './a1111'
import { isComfyGraph, parseComfyGraph, type ParsedMetadata } from './comfyGraph'
import { parseJpegSize, parsePng, parseWebpSize, readHead } from './imageFile'

const SCAN_READ_LIMIT = 1024 * 1024
const RAW_READ_LIMIT = 64 * 1024 * 1024

export interface ImageProbe {
  width: number
  height: number
  source: MetadataSource
  meta: ParsedMetadata
  tags: string[]
}

function readSidecarTags(filePath: string): string[] {
  const sidecar = `${filePath.replace(/\.[^./\\]+$/, '')}.txt`
  if (!existsSync(sidecar)) return []
  try {
    const seen = new Set<string>()
    for (const raw of readFileSync(sidecar, 'utf8').split(/[,\n]/)) {
      const tag = raw.trim().toLowerCase()
      if (tag) seen.add(tag)
    }
    return [...seen]
  } catch {
    return []
  }
}

function parseNovelAi(text: string): ParsedMetadata | null {
  try {
    const data = JSON.parse(text) as Record<string, unknown>
    const positive = typeof data.prompt === 'string' ? data.prompt : undefined
    if (!positive) return null
    const result: ParsedMetadata = {
      positive,
      negative: typeof data.uc === 'string' ? data.uc : undefined,
      loras: []
    }
    if (typeof data.steps === 'number') result.steps = data.steps
    if (typeof data.scale === 'number') result.cfg = data.scale
    if (typeof data.seed === 'number') result.seed = data.seed
    if (typeof data.sampler === 'string') result.sampler = data.sampler
    return result
  } catch {
    return null
  }
}

export function probeImage(filePath: string): ImageProbe {
  const buffer = readHead(filePath, SCAN_READ_LIMIT)
  const png = parsePng(buffer)

  const probe: ImageProbe = {
    width: png?.width ?? 0,
    height: png?.height ?? 0,
    source: 'none',
    meta: { loras: [] },
    tags: []
  }

  if (!png) {
    const size = parseJpegSize(buffer) ?? parseWebpSize(buffer)
    if (size) {
      probe.width = size.width
      probe.height = size.height
    }
  } else {
    const { texts } = png

    if (texts.prompt) {
      try {
        const graph: unknown = JSON.parse(texts.prompt)
        if (isComfyGraph(graph)) {
          probe.meta = parseComfyGraph(graph)
          probe.source = 'comfyui'
        }
      } catch {
        /* 损坏的 graph JSON 按无元数据处理 */
      }
    }

    if (probe.source === 'none' && texts.parameters && isA1111Parameters(texts.parameters)) {
      probe.meta = parseA1111Parameters(texts.parameters)
      probe.source = 'a1111'
    }

    if (probe.source === 'none') {
      for (const key of ['Comment', 'Description']) {
        const text = texts[key]
        if (!text) continue
        const parsed = parseNovelAi(text)
        if (parsed) {
          probe.meta = parsed
          probe.source = 'novelai'
          break
        }
      }
    }
  }

  probe.tags = readSidecarTags(filePath)
  return probe
}

export function readRawMetadata(filePath: string): RawMetadata {
  const buffer = readHead(filePath, RAW_READ_LIMIT)
  const png = parsePng(buffer)
  if (!png) return { prompt: null, workflow: null, parameters: null }

  const parseJson = (value?: string): unknown | null => {
    if (!value) return null
    try {
      return JSON.parse(value)
    } catch {
      return null
    }
  }

  return {
    prompt: parseJson(png.texts.prompt),
    workflow: parseJson(png.texts.workflow),
    parameters: png.texts.parameters ?? null
  }
}
