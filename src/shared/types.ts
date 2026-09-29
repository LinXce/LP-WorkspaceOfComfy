export type MetadataSource = 'comfyui' | 'a1111' | 'novelai' | 'exif' | 'none'

export interface LoraRef {
  name: string
  weight: number
}

export interface ImageMeta {
  id: string
  path: string
  fileName: string
  width: number
  height: number
  sizeBytes: number
  mtime: number
  source: MetadataSource
  positive?: string
  negative?: string
  checkpoint?: string
  loras: LoraRef[]
  sampler?: string
  scheduler?: string
  steps?: number
  cfg?: number
  seed?: number
  clipSkip?: number
  rawPrompt?: unknown
  rawWorkflow?: unknown
  tags: string[]
  rating?: number
  note?: string
  datasetId?: string
}

export type TagCategory = 'person' | 'style' | 'scene' | 'quality' | 'object' | 'other'

export interface Tag {
  id: string
  name: string
  category: TagCategory
  aliases: string[]
  count: number
  blacklisted: boolean
  origin: 'manual' | 'model' | 'import'
}

export interface Dataset {
  id: string
  name: string
  path: string
  imageCount: number
  taggedCount: number
  updatedAt: number
  coverIds: string[]
}

export type JobItemStatus = 'queued' | 'running' | 'done' | 'error'

export interface TagJobItem {
  imageId: string
  status: JobItemStatus
  tags?: string[]
  error?: string
  ms?: number
}

export interface TagJob {
  id: string
  name: string
  status: 'queued' | 'running' | 'paused' | 'done' | 'error'
  done: number
  failed: number
  createdAt: number
  items: TagJobItem[]
}

export type OutputFormat = 'tags' | 'caption' | 'json'

export interface TaggingConfig {
  model: string
  outputFormat: OutputFormat
  template: string
  concurrency: number
  allowNewTags: boolean
  overwrite: boolean
}

export interface AppSettings extends TaggingConfig {
  baseUrl: string
  apiKey: string
  timeoutMs: number
  datasetRoot: string
  thumbnailDir: string
  thumbnailLimitMb: number
}

export interface ConnectionTestResult {
  ok: boolean
  latencyMs?: number
  models?: string[]
  message: string
}
