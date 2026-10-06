import { createHash } from 'node:crypto'
import { existsSync, writeFileSync } from 'node:fs'
import { basename, resolve } from 'node:path'
import { API_KEY_ENV_CANDIDATES } from '@shared/defaults'
import { authModeOf, isTagged, type AppSettings, type Dataset, type EndpointConfig, type ImageMeta, type ImageTagPatch, type RawMetadata, type ScanProgress, type Tag, type TagCategory, type WorkspaceSnapshot, type ConnectionTestResult } from '@shared/types'
import * as db from './db'
import {
  activeEndpoint,
  effectiveApiKey,
  endpointsFilePath,
  listEndpoints,
  resolveApiKey,
  upsertEndpoint
} from './endpoints'
import { readRawMetadata } from './metadata'
import { activePrompt, listPrompts, promptsFilePath } from './prompts'
import { scanFolder } from './scanner'

type ProgressFn = (progress: ScanProgress) => void

export function datasetIdFor(folder: string): string {
  return createHash('sha1').update(resolve(folder).toLowerCase()).digest('hex').slice(0, 12)
}

function withCounts(dataset: Dataset, images: ImageMeta[]): Dataset {
  const own = images.filter((image) => image.datasetId === dataset.id)
  return {
    ...dataset,
    imageCount: own.length,
    taggedCount: own.filter((image) => isTagged(image)).length
  }
}

export function deriveTags(images: ImageMeta[], tagMeta: Record<string, db.TagRecord>): Tag[] {
  const counts = new Map<string, number>()
  for (const image of images) {
    for (const tag of image.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1)
  }

  const names = new Set([...counts.keys(), ...Object.keys(tagMeta)])
  return [...names]
    .map((name) => ({
      name,
      category: tagMeta[name]?.category ?? ('other' as TagCategory),
      aliases: tagMeta[name]?.aliases ?? [],
      blacklisted: tagMeta[name]?.blacklisted ?? false,
      count: counts.get(name) ?? 0
    }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
}

export function snapshot(): WorkspaceSnapshot {
  const state = db.loadWorkspace()
  const endpoints = listEndpoints()
  const active = activeEndpoint()
  const prompt = activePrompt()

  return {
    datasets: state.datasets.map((dataset) => withCounts(dataset, state.images)),
    images: state.images,
    tags: deriveTags(state.images, state.tagMeta),
    settings: state.settings,
    endpoints,
    activeEndpointId: active?.id ?? null,
    activeEndpoint: active,
    prompts: listPrompts(),
    activePromptId: prompt?.id ?? null,
    activePrompt: prompt,
    apiKey: resolveApiKey(),
    envCandidates: [...API_KEY_ENV_CANDIDATES],
    dataDir: db.dataDir(),
    endpointsFile: endpointsFilePath(),
    promptsFile: promptsFilePath()
  }
}

export async function fetchModels(): Promise<{
  result: ConnectionTestResult
  settings: AppSettings
  endpoint: EndpointConfig | null
}> {
  const settings = db.loadWorkspace().settings
  const endpoint = activeEndpoint()

  if (!endpoint) {
    return {
      result: { ok: false, message: '还没有选择端点配置，先在设置里添加一条。' },
      settings,
      endpoint: null
    }
  }

  const key = effectiveApiKey()
  if (!key) {
    return {
      result: {
        ok: false,
        message:
          authModeOf(endpoint) === 'env'
            ? `环境变量 ${endpoint.envVar} 里没有值，检查一下是否设置、以及是否重启过工作台。`
            : '这条配置还没有填 API Key 或环境变量名。'
      },
      settings,
      endpoint
    }
  }

  if (!/^https?:\/\//.test(endpoint.baseUrl)) {
    return {
      result: { ok: false, message: 'Base URL 需要以 http:// 或 https:// 开头。' },
      settings,
      endpoint
    }
  }

  const url = `${endpoint.baseUrl.replace(/\/+$/, '')}/models`
  const started = Date.now()

  try {
    const response = await fetch(url, {
      headers: { authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(Math.max(3000, settings.timeoutMs))
    })
    const latencyMs = Date.now() - started

    if (!response.ok) {
      return {
        result: {
          ok: false,
          latencyMs,
          message: `端点返回 ${response.status} ${response.statusText}`
        },
        settings,
        endpoint
      }
    }

    const payload = (await response.json()) as { data?: { id?: unknown }[] }
    const models = (payload.data ?? [])
      .map((item) => (typeof item.id === 'string' ? item.id : null))
      .filter((id): id is string => id !== null)
      .sort((a, b) => a.localeCompare(b))

    let updated = endpoint
    if (models.length > 0) {
      updated = upsertEndpoint({
        id: endpoint.id,
        availableModels: models,
        model: models.includes(endpoint.model) ? endpoint.model : models[0]
      })
    }

    return {
      result: {
        ok: true,
        latencyMs,
        models,
        message: models.length
          ? `连接正常，拿到 ${models.length} 个可用模型。`
          : '端点可用，但没有返回模型列表。'
      },
      settings,
      endpoint: updated
    }
  } catch (error) {
    return {
      result: {
        ok: false,
        latencyMs: Date.now() - started,
        message: `请求失败：${describeError(error)}`
      },
      settings,
      endpoint
    }
  }
}

function describeError(error: unknown): string {
  if (!(error instanceof Error)) return String(error)
  const cause = (error as { cause?: unknown }).cause
  if (cause instanceof Error && cause.message) {
    return `${error.message}（${cause.message}）`
  }
  return error.message
}

export async function addDataset(folder: string, onProgress: ProgressFn): Promise<Dataset> {
  const state = db.loadWorkspace()
  const absolute = resolve(folder)

  if (!existsSync(absolute)) {
    throw new Error(`目录不存在：${absolute}`)
  }

  const id = datasetIdFor(absolute)
  const name = basename(absolute) || absolute

  const existingIndex = state.datasets.findIndex((dataset) => dataset.id === id)
  const dataset: Dataset = {
    id,
    name,
    path: absolute,
    imageCount: 0,
    taggedCount: 0,
    addedAt: existingIndex === -1 ? Date.now() : state.datasets[existingIndex].addedAt,
    updatedAt: Date.now()
  }

  const preserved = new Map(
    state.images.filter((image) => image.datasetId === id).map((image) => [image.id, image])
  )

  const { images } = await scanFolder(absolute, id, preserved, (progress) =>
    onProgress({ ...progress, datasetId: id, datasetName: name })
  )

  state.images = state.images.filter((image) => image.datasetId !== id).concat(images)
  if (existingIndex === -1) state.datasets.push(dataset)
  else state.datasets[existingIndex] = dataset

  db.saveWorkspace()
  return withCounts(dataset, state.images)
}

export async function rescanDataset(id: string, onProgress: ProgressFn): Promise<Dataset> {
  const state = db.loadWorkspace()
  const dataset = state.datasets.find((item) => item.id === id)
  if (!dataset) throw new Error('数据集不存在')
  return addDataset(dataset.path, onProgress)
}

export function removeDataset(id: string): void {
  const state = db.loadWorkspace()
  state.datasets = state.datasets.filter((dataset) => dataset.id !== id)
  state.images = state.images.filter((image) => image.datasetId !== id)
  db.saveWorkspace()
}

export function updateTag(
  name: string,
  patch: { category?: TagCategory; aliases?: string[]; blacklisted?: boolean }
): void {
  const state = db.loadWorkspace()
  const current = state.tagMeta[name] ?? {
    category: 'other' as TagCategory,
    aliases: [],
    blacklisted: false
  }
  state.tagMeta[name] = { ...current, ...patch }
  db.saveWorkspace()
}

export function saveSettings(patch: Partial<AppSettings>): AppSettings {
  const state = db.loadWorkspace()
  state.settings = { ...state.settings, ...patch }
  db.saveWorkspace()
  return state.settings
}

export function rawMetadataFor(imageId: string): RawMetadata | null {
  const state = db.loadWorkspace()
  const image = state.images.find((item) => item.id === imageId)
  if (!image) return null
  return readRawMetadata(image.path)
}

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))]
}

export function mergeTags(image: ImageMeta): void {
  image.sidecarTags = image.sidecarTags ?? []
  image.modelTags = image.modelTags ?? []
  image.manualTags = image.manualTags ?? []
  image.hiddenTags = image.hiddenTags ?? []

  const hidden = new Set(image.hiddenTags)
  image.tags = unique([...image.sidecarTags, ...image.modelTags, ...image.manualTags]).filter(
    (tag) => !hidden.has(tag)
  )
}

/** 受控词表：出现在图片上的标签，按出现次数排序，屏蔽掉黑名单里的。 */
export function tagVocabulary(limit = 120): string[] {
  const state = db.loadWorkspace()
  const counts = new Map<string, number>()
  for (const image of state.images) {
    for (const tag of image.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1)
  }
  return [...counts.entries()]
    .filter(([name]) => !state.tagMeta[name]?.blacklisted)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([name]) => name)
}

export function applyTaggingResults(
  results: { imageId: string; tags?: string[]; caption?: string }[],
  overwrite: boolean
): void {
  const state = db.loadWorkspace()
  const byId = new Map(state.images.map((image) => [image.id, image]))
  const now = Date.now()

  for (const result of results) {
    const image = byId.get(result.imageId)
    if (!image) continue

    // 被移回待打标队列的图，这次重打按「覆盖」处理
    const replace = overwrite || image.requeued === true

    if (result.tags) {
      image.modelTags = replace ? result.tags : unique([...(image.modelTags ?? []), ...result.tags])
    }
    if (result.caption) image.caption = result.caption
    delete image.requeued
    mergeTags(image)
    image.taggedAt = now
  }

  db.saveWorkspace()
}

/** 把图片移回待打标队列（或取消）。手动标签和描述都留着。 */
export function setImageRequeued(imageIds: string[], requeued: boolean): void {
  const state = db.loadWorkspace()
  const wanted = new Set(imageIds)
  for (const image of state.images) {
    if (!wanted.has(image.id)) continue
    if (requeued) image.requeued = true
    else delete image.requeued
  }
  db.saveWorkspace()
}

/**
 * 手动编辑生效标签：新加进 manualTags，删掉的记进 hiddenTags
 * （这样旁车 .txt 或模型下次再带出同一个词也压得住）。
 */
export function updateImageTags(patch: ImageTagPatch): void {
  const state = db.loadWorkspace()
  const image = state.images.find((item) => item.id === patch.imageId)
  if (!image) return

  image.manualTags = image.manualTags ?? []
  image.hiddenTags = image.hiddenTags ?? []

  if (patch.tags) {
    const before = unique([...image.sidecarTags, ...image.modelTags, ...image.manualTags])
    const next = unique(patch.tags.map((tag) => tag.trim()).filter(Boolean))
    const nextSet = new Set(next)
    const fromMachine = new Set([...image.sidecarTags, ...image.modelTags])

    image.manualTags = next.filter((tag) => !fromMachine.has(tag))
    image.hiddenTags = before.filter((tag) => !nextSet.has(tag))
    mergeTags(image)
    image.taggedAt = Date.now()
  }

  if (patch.caption !== undefined) {
    image.caption = patch.caption?.trim() || undefined
  }

  db.saveWorkspace()
}

export function exportSidecarFiles(scope: string): { written: number; skipped: number } {
  const state = db.loadWorkspace()
  const images =
    scope === 'all' ? state.images : state.images.filter((image) => image.datasetId === scope)

  const preferCaption = state.settings.outputFormat === 'nl'

  let written = 0
  let skipped = 0

  for (const image of images) {
    // 内容跟着输出模式走：标签模式写逗号分隔的标签串，描述模式写那句话。
    // 该模式没内容就退回另一种，两种都空就跳过。
    const primary = preferCaption ? (image.caption ?? '') : image.tags.join(', ')
    const secondary = preferCaption ? image.tags.join(', ') : (image.caption ?? '')
    const body = (primary.trim() ? primary : secondary).trim()

    if (!body) {
      skipped += 1
      continue
    }

    const base = image.path.replace(/\.[^./\\]+$/, '')
    try {
      writeFileSync(`${base}.txt`, body, 'utf8')
      written += 1
    } catch {
      skipped += 1
    }
  }

  return { written, skipped }
}
