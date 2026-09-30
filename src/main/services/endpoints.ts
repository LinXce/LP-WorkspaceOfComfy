import { randomUUID } from 'node:crypto'
import { existsSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { DEFAULT_ENDPOINT, ENDPOINT_FILE_VERSION, ENDPOINT_PRESETS } from '@shared/defaults'
import { authModeOf, type ApiKeyState, type EndpointConfig, type EndpointStore } from '@shared/types'
import { dataDir } from './db'

let cache: EndpointStore | null = null

export function endpointsFilePath(): string {
  return join(dataDir(), 'endpoints.json')
}

/** 从旧的 workspace.json 里捞一次端点信息，只用于首次迁移。 */
function legacyEndpoint(): EndpointConfig | null {
  try {
    const raw = JSON.parse(readFileSync(join(dataDir(), 'workspace.json'), 'utf8')) as {
      settings?: Record<string, unknown>
    }
    const settings = raw.settings ?? {}
    const baseUrl = typeof settings.baseUrl === 'string' ? settings.baseUrl : ''
    if (!baseUrl) return null

    const preset = ENDPOINT_PRESETS.find((item) => item.baseUrl === baseUrl.replace(/\/+$/, ''))
    return {
      id: randomUUID(),
      name: preset?.label ?? '默认配置',
      baseUrl,
      envVar: '',
      apiKey: typeof settings.apiKey === 'string' ? settings.apiKey : '',
      model: typeof settings.model === 'string' ? settings.model : '',
      availableModels: Array.isArray(settings.availableModels)
        ? (settings.availableModels as string[])
        : [],
      presetId: preset?.id
    }
  } catch {
    return null
  }
}

function emptyStore(): EndpointStore {
  // 首次运行给一条默认配置，方便直接开始。它不在预置模板列表里。
  const seed: EndpointConfig = {
    id: randomUUID(),
    name: DEFAULT_ENDPOINT.label,
    baseUrl: DEFAULT_ENDPOINT.baseUrl,
    envVar: DEFAULT_ENDPOINT.envVars[0] ?? '',
    apiKey: '',
    model: DEFAULT_ENDPOINT.models[0] ?? '',
    availableModels: [],
    presetId: DEFAULT_ENDPOINT.id
  }
  return { version: ENDPOINT_FILE_VERSION, activeId: seed.id, items: [seed] }
}

function normalize(item: Partial<EndpointConfig>): EndpointConfig {
  return {
    id: typeof item.id === 'string' && item.id ? item.id : randomUUID(),
    name: typeof item.name === 'string' ? item.name : '',
    baseUrl: typeof item.baseUrl === 'string' ? item.baseUrl : '',
    envVar: typeof item.envVar === 'string' ? item.envVar : '',
    apiKey: typeof item.apiKey === 'string' ? item.apiKey : '',
    model: typeof item.model === 'string' ? item.model : '',
    availableModels: Array.isArray(item.availableModels) ? item.availableModels : [],
    presetId: typeof item.presetId === 'string' ? item.presetId : undefined
  }
}

export function loadEndpoints(): EndpointStore {
  if (cache) return cache

  const file = endpointsFilePath()
  if (!existsSync(file)) {
    const migrated = legacyEndpoint()
    cache = migrated
      ? { version: ENDPOINT_FILE_VERSION, activeId: migrated.id, items: [migrated] }
      : emptyStore()
    saveEndpoints()
    return cache
  }

  try {
    const parsed = JSON.parse(readFileSync(file, 'utf8')) as Partial<EndpointStore>
    const items = Array.isArray(parsed.items) ? parsed.items.map(normalize) : []
    cache = {
      version: ENDPOINT_FILE_VERSION,
      activeId:
        typeof parsed.activeId === 'string' && items.some((item) => item.id === parsed.activeId)
          ? parsed.activeId
          : (items[0]?.id ?? null),
      items
    }
  } catch {
    cache = emptyStore()
  }
  return cache
}

export function saveEndpoints(): void {
  if (!cache) return
  const file = endpointsFilePath()
  const tmp = `${file}.tmp`
  writeFileSync(tmp, JSON.stringify(cache, null, 2), 'utf8')
  renameSync(tmp, file)
}

export function listEndpoints(): EndpointConfig[] {
  return loadEndpoints().items
}

export function activeEndpoint(): EndpointConfig | null {
  const store = loadEndpoints()
  return store.items.find((item) => item.id === store.activeId) ?? null
}

export function setActiveEndpoint(id: string | null): void {
  const store = loadEndpoints()
  store.activeId = id && store.items.some((item) => item.id === id) ? id : null
  saveEndpoints()
}

export function upsertEndpoint(patch: Partial<EndpointConfig> & { id?: string }): EndpointConfig {
  const store = loadEndpoints()
  const index = patch.id ? store.items.findIndex((item) => item.id === patch.id) : -1

  if (index >= 0) {
    const merged = normalize({ ...store.items[index], ...patch, id: store.items[index].id })
    store.items[index] = merged
    saveEndpoints()
    return merged
  }

  const created = normalize(patch)
  store.items.push(created)
  store.activeId = created.id
  saveEndpoints()
  return created
}

export function removeEndpoint(id: string): void {
  const store = loadEndpoints()
  store.items = store.items.filter((item) => item.id !== id)
  if (store.activeId === id) store.activeId = store.items[0]?.id ?? null
  saveEndpoints()
}

function maskSecret(value: string): string {
  if (value.length <= 8) return '•'.repeat(value.length)
  return `${value.slice(0, 4)}${'•'.repeat(Math.min(10, value.length - 6))}${value.slice(-2)}`
}

/** 当前生效的密钥：配置里填了环境变量名就读环境变量，否则用配置里的 API Key。 */
export function resolveApiKey(): ApiKeyState {
  const endpoint = activeEndpoint()
  if (!endpoint) return { ready: false, source: 'none' }

  const mode = authModeOf(endpoint)

  if (mode === 'env') {
    const value = process.env[endpoint.envVar.trim()]?.trim()
    if (!value) {
      return { ready: false, source: 'env', variable: endpoint.envVar.trim() }
    }
    return {
      ready: true,
      source: 'env',
      variable: endpoint.envVar.trim(),
      masked: maskSecret(value)
    }
  }

  if (mode === 'key') {
    return { ready: true, source: 'key', masked: maskSecret(endpoint.apiKey.trim()) }
  }

  return { ready: false, source: 'none' }
}

export function effectiveApiKey(): string {
  const endpoint = activeEndpoint()
  if (!endpoint) return ''
  return authModeOf(endpoint) === 'env'
    ? (process.env[endpoint.envVar.trim()]?.trim() ?? '')
    : endpoint.apiKey.trim()
}
