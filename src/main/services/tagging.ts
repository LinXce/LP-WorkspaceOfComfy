import { existsSync } from 'node:fs'
import { nativeImage } from 'electron'
import type { ImageMeta, StartTaggingResult, TaggingJob } from '@shared/types'
import * as db from './db'
import { activeEndpoint, effectiveApiKey } from './endpoints'
import { applyTaggingResults, tagVocabulary } from './workspace'

const MAX_IMAGE_EDGE = 1024
const JPEG_QUALITY = 85
const FLUSH_EVERY = 4

export type TaggingProgress = (job: TaggingJob) => void

interface TaggingOutput {
  tags?: string[]
  caption?: string
}

let job: TaggingJob = { status: 'idle', total: 0, done: 0, failed: 0 }
let notify: TaggingProgress = () => {}
let pauseRequested = false
let cancelRequested = false

export function taggingJob(): TaggingJob {
  return { ...job }
}

export function pauseTagging(): TaggingJob {
  if (job.status === 'running') {
    pauseRequested = true
    job = { ...job, status: 'paused' }
    notify(taggingJob())
  }
  return taggingJob()
}

export function resumeTagging(): TaggingJob {
  if (job.status === 'paused') {
    pauseRequested = false
    job = { ...job, status: 'running' }
    notify(taggingJob())
  }
  return taggingJob()
}

export function cancelTagging(): TaggingJob {
  if (job.status === 'running' || job.status === 'paused') {
    cancelRequested = true
    pauseRequested = false
    job = { ...job, status: 'paused' }
    notify(taggingJob())
  }
  return taggingJob()
}

const delay = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms))

function describe(error: unknown): string {
  if (!(error instanceof Error)) return String(error)
  const cause = (error as { cause?: unknown }).cause
  if (cause instanceof Error && cause.message) return `${error.message}（${cause.message}）`
  return error.message
}

function encodeImage(filePath: string): string | null {
  const image = nativeImage.createFromPath(filePath)
  if (image.isEmpty()) return null

  const { width, height } = image.getSize()
  if (width === 0 || height === 0) return null

  const longest = Math.max(width, height)
  const resized =
    longest > MAX_IMAGE_EDGE
      ? image.resize({
          width: Math.max(1, Math.round((width * MAX_IMAGE_EDGE) / longest)),
          height: Math.max(1, Math.round((height * MAX_IMAGE_EDGE) / longest)),
          quality: 'good'
        })
      : image

  return `data:image/jpeg;base64,${resized.toJPEG(JPEG_QUALITY).toString('base64')}`
}

function buildSystemPrompt(): string {
  const settings = db.loadWorkspace().settings
  const blocks = [settings.template.trim()]

  if (settings.outputFormat === 'tag' && !settings.allowNewTags) {
    const vocabulary = tagVocabulary()
    if (vocabulary.length > 0) {
      blocks.push(
        `Only use tags from this controlled vocabulary. Do not invent new tags.\n${vocabulary.join(', ')}`
      )
    }
  }

  return blocks.join('\n\n')
}

function cleanTag(raw: string): string {
  return raw
    .replace(/^\s*(?:[-*•]|\d+[.)])\s+/, '')
    .replace(/["'`]+/g, '')
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .trim()
}

function parseTags(text: string): string[] {
  let source = text.trim()

  const fence = source.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (fence) source = fence[1].trim()

  if (source.startsWith('{') || source.startsWith('[')) {
    try {
      const parsed: unknown = JSON.parse(source)
      const collected: string[] = []
      const walk = (value: unknown): void => {
        if (typeof value === 'string') collected.push(value)
        else if (Array.isArray(value)) value.forEach(walk)
        else if (value && typeof value === 'object') {
          Object.values(value as Record<string, unknown>).forEach(walk)
        }
      }
      walk(parsed)
      source = collected.join(', ')
    } catch {
      /* 不是合法 JSON，按纯文本继续 */
    }
  }

  const seen = new Set<string>()
  for (const part of source.split(/[,\n;]+/)) {
    const tag = cleanTag(part)
    if (!tag || tag.length > 64) continue
    seen.add(tag)
  }
  return [...seen].slice(0, 80)
}

function extractText(payload: unknown): string {
  const choices = (payload as { choices?: unknown[] })?.choices
  if (!Array.isArray(choices) || choices.length === 0) return ''

  const message = (choices[0] as { message?: { content?: unknown } })?.message
  const content = message?.content

  if (typeof content === 'string') return content.trim()

  if (Array.isArray(content)) {
    return content
      .map((part) =>
        typeof part === 'string'
          ? part
          : typeof (part as { text?: unknown })?.text === 'string'
            ? ((part as { text: string }).text ?? '')
            : ''
      )
      .join(' ')
      .trim()
  }

  return ''
}

async function tagOne(image: ImageMeta, key: string): Promise<TaggingOutput> {
  const { settings } = db.loadWorkspace()
  const endpoint = activeEndpoint()
  if (!endpoint) throw new Error('没有可用的端点配置')

  const dataUri = encodeImage(image.path)
  if (!dataUri) throw new Error('无法读取图片')

  const url = `${endpoint.baseUrl.replace(/\/+$/, '')}/chat/completions`
  const instruction =
    settings.outputFormat === 'tag'
      ? 'Tag this image following the system instruction.'
      : 'Describe this image following the system instruction.'

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${key}`
    },
    body: JSON.stringify({
      model: endpoint.model,
      temperature: 0.2,
      messages: [
        { role: 'system', content: buildSystemPrompt() },
        {
          role: 'user',
          content: [
            { type: 'text', text: instruction },
            { type: 'image_url', image_url: { url: dataUri } }
          ]
        }
      ]
    }),
    signal: AbortSignal.timeout(Math.max(5000, settings.timeoutMs))
  })

  if (!response.ok) {
    const detail = await response.text().catch(() => '')
    throw new Error(
      `端点返回 ${response.status} ${response.statusText}${detail ? `：${detail.slice(0, 200)}` : ''}`
    )
  }

  const text = extractText(await response.json())
  if (!text) throw new Error('端点没有返回任何内容')

  if (settings.outputFormat === 'tag') {
    const tags = parseTags(text)
    if (tags.length === 0) {
      throw new Error(
        `没有解析出标签（检查提示词模板是否要求输出逗号分隔的标签）。原始返回：${text.slice(0, 80)}`
      )
    }
    return { tags }
  }

  return { caption: text.replace(/^["'`]+|["'`]+$/g, '').replace(/\s+/g, ' ').trim() }
}

export async function startTagging(
  imageIds: string[],
  onProgress: TaggingProgress,
  onFinished?: () => void
): Promise<StartTaggingResult> {
  if (job.status === 'running' || job.status === 'paused') {
    return { started: false, total: 0, message: '已经有打标任务在进行中' }
  }

  const state = db.loadWorkspace()
  const targets = state.images.filter(
    (image) => imageIds.includes(image.id) && existsSync(image.path)
  )

  if (targets.length === 0) {
    return { started: false, total: 0, message: '没有可打标的图片（可能路径已失效）' }
  }

  if (!effectiveApiKey()) {
    return { started: false, total: 0, message: '没有可用的 API Key' }
  }

  notify = onProgress
  pauseRequested = false
  cancelRequested = false
  job = {
    status: 'running',
    total: targets.length,
    done: 0,
    failed: 0,
    startedAt: Date.now()
  }
  notify(taggingJob())

  const settings = state.settings
  const overwrite = settings.overwrite
  const pending = new Map<string, TaggingOutput>()
  let cursor = 0

  const flush = (): void => {
    if (pending.size === 0) return
    applyTaggingResults(
      [...pending.entries()].map(([imageId, output]) => ({ imageId, ...output })),
      overwrite
    )
    pending.clear()
  }

  const worker = async (): Promise<void> => {
    for (;;) {
      if (cancelRequested) return
      while (pauseRequested && !cancelRequested) await delay(200)
      if (cancelRequested) return

      const index = cursor
      cursor += 1
      if (index >= targets.length) return

      const image = targets[index]
      job = { ...job, current: image.fileName }
      notify(taggingJob())

      try {
        const key = effectiveApiKey()
        if (!key) throw new Error('API Key 已不可用')
        pending.set(image.id, await tagOne(image, key))
        job = { ...job, done: job.done + 1 }
      } catch (error) {
        job = { ...job, failed: job.failed + 1, lastError: describe(error) }
      }

      if (pending.size >= FLUSH_EVERY) flush()
      notify(taggingJob())
    }
  }

  const workers = Math.max(1, Math.min(8, settings.concurrency))

  // 不阻塞调用方：立刻返回，任务在后台跑完再收尾。
  void Promise.all(Array.from({ length: workers }, worker)).then(() => {
    flush()
    job = { ...job, status: 'done', current: undefined, finishedAt: Date.now() }
    notify(taggingJob())
    onFinished?.()
  })

  return { started: true, total: targets.length }
}
