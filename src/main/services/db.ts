import { app } from 'electron'
import { existsSync, cpSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { DEFAULT_SETTINGS, WORKSPACE_FILE_VERSION } from '@shared/defaults'
import type { AppSettings, Dataset, ImageMeta, OutputFormat, TagCategory } from '@shared/types'

const LEGACY_FORMAT: Record<string, OutputFormat> = {
  tags: 'tag',
  caption: 'nl',
  json: 'tag'
}

function sanitizeSettings(raw: Partial<AppSettings> | undefined): AppSettings {
  const merged = { ...DEFAULT_SETTINGS, ...(raw ?? {}) } as AppSettings & Record<string, unknown>

  if (merged.outputFormat !== 'tag' && merged.outputFormat !== 'nl') {
    merged.outputFormat = LEGACY_FORMAT[String(merged.outputFormat)] ?? 'tag'
  }

  // 端点信息搬去了 endpoints.json，导出后缀固定成 .txt，提示词搬去了 prompts.json
  for (const key of ['baseUrl', 'apiKey', 'model', 'availableModels', 'exportSuffix', 'template']) {
    delete merged[key]
  }

  return merged
}

export interface TagRecord {
  category: TagCategory
  aliases: string[]
  blacklisted: boolean
}

export interface WorkspaceFile {
  version: number
  datasets: Dataset[]
  images: ImageMeta[]
  tagMeta: Record<string, TagRecord>
  settings: AppSettings
}

let state: WorkspaceFile | null = null

function ensureDir(dir: string): string {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  return dir
}

export function dataDir(): string {
  return ensureDir(join(app.getPath('userData'), 'data'))
}

export function thumbnailDir(): string {
  return ensureDir(join(app.getPath('userData'), 'thumbnails'))
}

function defaultDatasetRoot(): string {
  try {
    return app.getPath('pictures')
  } catch {
    return app.getPath('home')
  }
}

function emptyState(): WorkspaceFile {
  return {
    version: WORKSPACE_FILE_VERSION,
    datasets: [],
    images: [],
    tagMeta: {},
    settings: { ...DEFAULT_SETTINGS, datasetRoot: defaultDatasetRoot() }
  }
}

function sanitizeImages(raw: unknown): ImageMeta[] {
  if (!Array.isArray(raw)) return []
  // 老版本没有 manualTags / hiddenTags，这里补齐，避免读的时候拿到 undefined
  return (raw as ImageMeta[]).map((image) => ({
    ...image,
    sidecarTags: image.sidecarTags ?? [],
    modelTags: image.modelTags ?? [],
    manualTags: image.manualTags ?? [],
    hiddenTags: image.hiddenTags ?? [],
    tags: image.tags ?? []
  }))
}

export function loadWorkspace(): WorkspaceFile {
  if (state) return state
  const file = join(dataDir(), 'workspace.json')
  if (!existsSync(file)) {
    state = emptyState()
    return state
  }
  try {
    const parsed = JSON.parse(readFileSync(file, 'utf8')) as Partial<WorkspaceFile>
    state = {
      version: WORKSPACE_FILE_VERSION,
      datasets: Array.isArray(parsed.datasets) ? parsed.datasets : [],
      images: sanitizeImages(parsed.images),
      tagMeta: parsed.tagMeta && typeof parsed.tagMeta === 'object' ? parsed.tagMeta : {},
      settings: sanitizeSettings(parsed.settings)
    }
  } catch {
    state = emptyState()
  }
  return state
}

export function saveWorkspace(): void {
  if (!state) return
  const file = join(dataDir(), 'workspace.json')
  const tmp = `${file}.tmp`
  writeFileSync(tmp, JSON.stringify(state), 'utf8')
  renameSync(tmp, file)
}

export function resetWorkspaceState(): void {
  state = null
}

/**
 * 项目改过几次名，数据目录也跟着变（lp-workspace-of-comfy → ComfyUI Workspace → LP-Tagger）。
 * 统一目录名之后搬一次过去，否则用户看到的就是「数据集被清空了」。
 * 只在目标目录还没有自己的 workspace.json 时搬，且用拷贝不用移动，旧目录留作兜底。
 */
const LEGACY_DATA_DIRS = ['ComfyUI Workspace', 'lp-workspace-of-comfy']

export function migrateLegacyDataDir(): void {
  const current = app.getPath('userData')
  if (existsSync(join(current, 'data', 'workspace.json'))) return

  for (const name of LEGACY_DATA_DIRS) {
    const legacy = join(app.getPath('appData'), name)
    if (resolve(legacy) === resolve(current)) continue
    if (!existsSync(join(legacy, 'data', 'workspace.json'))) continue

    try {
      ensureDir(current)
      cpSync(join(legacy, 'data'), join(current, 'data'), { recursive: true })
      if (existsSync(join(legacy, 'thumbnails'))) {
        cpSync(join(legacy, 'thumbnails'), join(current, 'thumbnails'), { recursive: true })
      }
    } catch {
      // 搬不动就照常启动，不因为这个挡住用户
    }
    return
  }
}
