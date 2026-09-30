export type MetadataSource = 'comfyui' | 'a1111' | 'novelai' | 'none'

export interface LoraRef {
  name: string
  weight: number
}

export interface ImageMeta {
  id: string
  datasetId: string
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
  /** 生效标签 = (sidecarTags ∪ modelTags ∪ manualTags) − hiddenTags */
  tags: string[]
  /** 扫描时从同名 .txt 读到的 */
  sidecarTags: string[]
  /** 打标服务生成的 */
  modelTags: string[]
  /** 手动编辑时加上去的 */
  manualTags: string[]
  /** 手动编辑时删掉的，用来压住旁车/模型里的同名标签 */
  hiddenTags: string[]
  /** 被移回待打标队列：重新打标时按「覆盖」处理 */
  requeued?: boolean
  /** nl 模式生成的描述 */
  caption?: string
  taggedAt?: number
}

export interface RawMetadata {
  prompt: unknown | null
  workflow: unknown | null
  parameters: string | null
}

/** 手动编辑：传 tags 就是整份覆盖生效标签，传 caption 就是改描述。 */
export interface ImageTagPatch {
  imageId: string
  tags?: string[]
  caption?: string | null
}

export type TagCategory = 'person' | 'style' | 'scene' | 'quality' | 'object' | 'other'

export interface Tag {
  name: string
  category: TagCategory
  aliases: string[]
  blacklisted: boolean
  count: number
}

export interface Dataset {
  id: string
  name: string
  path: string
  imageCount: number
  taggedCount: number
  addedAt: number
  updatedAt: number
}

export interface DatasetWithImages {
  dataset: Dataset
  images: ImageMeta[]
}

export type ScanPhase = 'walking' | 'parsing' | 'thumbnails' | 'done' | 'error'

export interface ScanProgress {
  datasetId: string
  datasetName: string
  phase: ScanPhase
  current: number
  total: number
  message?: string
}

export type OutputFormat = 'tag' | 'nl'

export interface TaggingConfig {
  outputFormat: OutputFormat
  template: string
  concurrency: number
  allowNewTags: boolean
  overwrite: boolean
}

/**
 * 一条端点配置。环境变量名与 API Key 二者只能填一个，
 * 用哪个看哪个有值（都为空表示还没配好）。
 */
export interface EndpointConfig {
  id: string
  name: string
  baseUrl: string
  envVar: string
  apiKey: string
  model: string
  availableModels: string[]
  presetId?: string
}

export type AuthMode = 'env' | 'key' | 'none'

export function authModeOf(endpoint: Pick<EndpointConfig, 'envVar' | 'apiKey'>): AuthMode {
  if (endpoint.envVar.trim()) return 'env'
  if (endpoint.apiKey.trim()) return 'key'
  return 'none'
}

export interface EndpointStore {
  version: number
  activeId: string | null
  items: EndpointConfig[]
}

export type TaggingStatus = 'idle' | 'running' | 'paused' | 'done' | 'error'

export interface TaggingJob {
  status: TaggingStatus
  total: number
  done: number
  failed: number
  current?: string
  lastError?: string
  startedAt?: number
  finishedAt?: number
}

export interface StartTaggingResult {
  started: boolean
  total: number
  message?: string
}

export interface AppSettings extends TaggingConfig {
  timeoutMs: number
  datasetRoot: string
  thumbnailLimitMb: number
}

export type ApiKeySource = 'env' | 'key' | 'none'

export interface ApiKeyState {
  ready: boolean
  source: ApiKeySource
  variable?: string
  masked?: string
}

export interface WorkspaceSnapshot {
  datasets: Dataset[]
  images: ImageMeta[]
  tags: Tag[]
  settings: AppSettings
  endpoints: EndpointConfig[]
  activeEndpointId: string | null
  activeEndpoint: EndpointConfig | null
  apiKey: ApiKeyState
  envCandidates: string[]
  dataDir: string
  endpointsFile: string
}

export interface ConnectionTestResult {
  ok: boolean
  latencyMs?: number
  models?: string[]
  message: string
}
