import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { API_KEY_ENV_CANDIDATES, DEFAULT_SETTINGS } from '@shared/defaults'
import type {
  ApiKeyState,
  AppSettings,
  ConnectionTestResult,
  Dataset,
  EndpointConfig,
  ImageMeta,
  ImageTagPatch,
  OutputFormat,
  PromptTemplate,
  RawMetadata,
  ScanProgress,
  Tag,
  TagCategory,
  TaggingJob
} from '@shared/types'

export type ViewId = 'home' | 'gallery' | 'datasets' | 'tagging' | 'tags' | 'settings'
export type Density = 'comfortable' | 'compact'
export type TaggingTab = 'pending' | 'finished' | 'manual'

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true
  )
}

export type MotionLevel = 'full' | 'reduced' | 'none'
export type ToastTone = 'info' | 'success' | 'warning' | 'danger'
export type DataStatus = 'loading' | 'ready' | 'error'

export interface ToastItem {
  id: string
  title: string
  description?: string
  tone: ToastTone
}

interface WorkspaceState {
  view: ViewId
  setView: (view: ViewId) => void

  inspectorOpen: boolean
  inspectorWidth: number
  setInspectorWidth: (width: number) => void
  toggleInspector: () => void
  openInspector: () => void

  commandOpen: boolean
  setCommandOpen: (open: boolean) => void

  density: Density
  setDensity: (density: Density) => void
  motion: MotionLevel
  setMotion: (motion: MotionLevel) => void

  tileSize: number
  setTileSize: (size: number) => void

  visibleIds: string[]
  setVisibleIds: (ids: string[]) => void
  selectedIds: string[]
  primaryId: string | null
  select: (id: string, mode?: 'replace' | 'toggle' | 'range') => void
  selectAll: () => void
  clearSelection: () => void

  selectedTagName: string | null
  setSelectedTagName: (name: string | null) => void

  activeDatasetId: string
  setActiveDatasetId: (id: string) => void

  tagQuery: string
  setTagQuery: (q: string) => void
  tagCategoryFilter: string
  setTagCategoryFilter: (c: string) => void

  toasts: ToastItem[]
  pushToast: (toast: Omit<ToastItem, 'id'>) => void
  dismissToast: (id: string) => void

  status: DataStatus
  error: string | null
  datasets: Dataset[]
  images: ImageMeta[]
  tags: Tag[]
  settings: AppSettings
  apiKey: ApiKeyState
  envCandidates: string[]
  endpoints: EndpointConfig[]
  activeEndpoint: EndpointConfig | null
  endpointsFile: string
  prompts: PromptTemplate[]
  activePrompt: PromptTemplate | null
  promptsFile: string
  dataDir: string
  appVersion: string
  scan: ScanProgress | null
  unsavedChanges: boolean
  fetchingModels: boolean

  refresh: () => Promise<void>
  addDataset: (path?: string) => Promise<void>
  rescanDataset: (id: string) => Promise<void>
  removeDataset: (id: string) => Promise<void>
  setScan: (progress: ScanProgress | null) => void
  tagging: TaggingJob
  taggingTab: TaggingTab
  taggingDatasetFilter: string
  setTaggingDatasetFilter: (id: string) => void
  setTaggingTab: (tab: TaggingTab) => void
  setTagging: (job: TaggingJob) => void
  startTagging: (imageIds: string[]) => Promise<void>
  pauseTagging: () => Promise<void>
  resumeTagging: () => Promise<void>
  cancelTagging: () => Promise<void>
  requeueImages: (imageIds: string[], requeued: boolean) => Promise<void>
  setImageTags: (patch: ImageTagPatch) => Promise<void>
  exportTags: (scope: string) => Promise<void>
  updateTagMeta: (payload: {
    name: string
    category?: TagCategory
    aliases?: string[]
    blacklisted?: boolean
  }) => Promise<void>
  loadRawMetadata: (imageId: string) => Promise<RawMetadata | null>
  updateSettings: (patch: Partial<AppSettings>) => void
  setOutputFormat: (mode: OutputFormat) => void
  saveSettings: () => Promise<void>
  fetchModels: () => Promise<ConnectionTestResult | null>
  upsertEndpoint: (patch: Partial<EndpointConfig>) => Promise<void>
  removeEndpoint: (id: string) => Promise<void>
  activateEndpoint: (id: string) => Promise<void>
  upsertPrompt: (patch: Partial<PromptTemplate>) => Promise<void>
  removePrompt: (id: string) => Promise<void>
  activatePrompt: (id: string) => Promise<void>
  resetPrompt: (id: string) => Promise<void>
}

let toastSeq = 0

const bridge = (): Window['workspace'] | undefined => window.workspace

export const useWorkspace = create<WorkspaceState>()(
  immer((set, get) => ({
    view: 'home',
    setView: (view) => set((s) => void (s.view = view)),

    inspectorOpen: true,
    inspectorWidth: 340,
    setInspectorWidth: (width) => set((s) => void (s.inspectorWidth = width)),
    toggleInspector: () => set((s) => void (s.inspectorOpen = !s.inspectorOpen)),
    openInspector: () => set((s) => void (s.inspectorOpen = true)),

    commandOpen: false,
    setCommandOpen: (open) => set((s) => void (s.commandOpen = open)),

    density: 'comfortable',
    setDensity: (density) => set((s) => void (s.density = density)),
    // 默认跟随系统的「减少动态效果」，但这个值一旦被设置面板改过就以它为准。
    // 之前用 CSS 的 prefers-reduced-motion 直接清零时长，会把用户明确选的「完整」也盖掉。
    motion: prefersReducedMotion() ? 'reduced' : 'full',
    setMotion: (motion) => set((s) => void (s.motion = motion)),

    tileSize: 168,
    setTileSize: (size) => set((s) => void (s.tileSize = size)),

    visibleIds: [],
    setVisibleIds: (ids) => set((s) => void (s.visibleIds = ids)),
    selectedIds: [],
    primaryId: null,
    select: (id, mode = 'replace') => {
      const { selectedIds, visibleIds } = get()
      if (mode === 'toggle') {
        const exists = selectedIds.includes(id)
        set((s) => {
          s.selectedIds = exists ? s.selectedIds.filter((item) => item !== id) : [...s.selectedIds, id]
          s.primaryId = exists ? (s.selectedIds.at(-1) ?? null) : id
        })
      } else if (mode === 'range' && selectedIds.length > 0) {
        const anchor = selectedIds[selectedIds.length - 1]
        const from = visibleIds.indexOf(anchor)
        const to = visibleIds.indexOf(id)
        if (from === -1 || to === -1) {
          set((s) => {
            s.selectedIds = [id]
            s.primaryId = id
          })
        } else {
          const [lo, hi] = from < to ? [from, to] : [to, from]
          set((s) => {
            s.selectedIds = visibleIds.slice(lo, hi + 1)
            s.primaryId = id
          })
        }
      } else {
        set((s) => {
          s.selectedIds = [id]
          s.primaryId = id
        })
      }
      set((s) => void (s.inspectorOpen = true))
    },
    selectAll: () => set((s) => void (s.selectedIds = [...s.visibleIds])),
    clearSelection: () =>
      set((s) => {
        s.selectedIds = []
        s.primaryId = null
      }),

    selectedTagName: null,
    setSelectedTagName: (name) =>
      set((s) => {
        s.selectedTagName = name
        if (name) s.inspectorOpen = true
      }),

    activeDatasetId: '',
    setActiveDatasetId: (id) => set((s) => void (s.activeDatasetId = id)),

    tagQuery: '',
    setTagQuery: (q) => set((s) => void (s.tagQuery = q)),
    tagCategoryFilter: 'all',
    setTagCategoryFilter: (c) => set((s) => void (s.tagCategoryFilter = c)),

    toasts: [],
    pushToast: (toast) => {
      const id = `toast-${++toastSeq}`
      set((s) => void s.toasts.push({ ...toast, id }))
      window.setTimeout(() => get().dismissToast(id), 4200)
    },
    dismissToast: (id) => set((s) => void (s.toasts = s.toasts.filter((t) => t.id !== id))),

    status: 'loading',
    error: null,
    datasets: [],
    images: [],
    tags: [],
    settings: DEFAULT_SETTINGS,
    apiKey: { ready: false, source: 'none' },
    envCandidates: [...API_KEY_ENV_CANDIDATES],
    endpoints: [],
    activeEndpoint: null,
    endpointsFile: '',
    prompts: [],
    activePrompt: null,
    promptsFile: '',
    dataDir: '',
    appVersion: '',
    scan: null,
    unsavedChanges: false,
    fetchingModels: false,

    refresh: async () => {
      const api = bridge()
      if (!api) {
        set((s) => {
          s.status = 'error'
          s.error = '当前不在 Electron 环境中，无法读取本地数据。'
        })
        return
      }
      try {
        const snapshot = await api.workspace.snapshot()
        const { version } = await api.app.info()
        set((s) => {
          s.datasets = snapshot.datasets
          s.images = snapshot.images
          s.tags = snapshot.tags
          s.settings = snapshot.settings
          s.apiKey = snapshot.apiKey
          s.envCandidates = snapshot.envCandidates
          s.endpoints = snapshot.endpoints
          s.activeEndpoint = snapshot.activeEndpoint
          s.endpointsFile = snapshot.endpointsFile
          s.prompts = snapshot.prompts
          s.activePrompt = snapshot.activePrompt
          s.promptsFile = snapshot.promptsFile
          s.dataDir = snapshot.dataDir
          s.appVersion = version
          s.status = 'ready'
          s.error = null
          if (!s.datasets.some((dataset) => dataset.id === s.activeDatasetId)) {
            s.activeDatasetId = s.datasets[0]?.id ?? ''
          }
        })
      } catch (error) {
        set((s) => {
          s.status = 'error'
          s.error = error instanceof Error ? error.message : String(error)
        })
      }
    },

    addDataset: async (path) => {
      const api = bridge()
      if (!api) return
      try {
        const dataset = await api.datasets.add(path)
        if (!dataset) return
        await get().refresh()
        set((s) => void (s.activeDatasetId = dataset.id))
        get().pushToast({
          tone: 'success',
          title: `已添加「${dataset.name}」`,
          description: `扫描到 ${dataset.imageCount} 张图片。`
        })
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        get().pushToast({ tone: 'danger', title: '添加数据集失败', description: message })
      }
    },

    rescanDataset: async (id) => {
      const api = bridge()
      if (!api) return
      try {
        const dataset = await api.datasets.rescan(id)
        await get().refresh()
        get().pushToast({
          tone: 'success',
          title: '重新扫描完成',
          description: `${dataset.name}：${dataset.imageCount} 张图片。`
        })
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        get().pushToast({ tone: 'danger', title: '重新扫描失败', description: message })
      }
    },

    removeDataset: async (id) => {
      const api = bridge()
      if (!api) return
      try {
        const snapshot = await api.datasets.remove(id)
        set((s) => {
          s.datasets = snapshot.datasets
          s.images = snapshot.images
          s.tags = snapshot.tags
          if (!s.datasets.some((dataset) => dataset.id === s.activeDatasetId)) {
            s.activeDatasetId = s.datasets[0]?.id ?? ''
          }
          s.selectedIds = []
          s.primaryId = null
        })
        get().pushToast({ tone: 'warning', title: '已移除数据集', description: '磁盘上的文件没有被删除。' })
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        get().pushToast({ tone: 'danger', title: '移除失败', description: message })
      }
    },

    setScan: (progress) => set((s) => void (s.scan = progress)),

    updateTagMeta: async (payload) => {
      const api = bridge()
      if (!api) return
      try {
        const snapshot = await api.tags.update(payload)
        set((s) => {
          s.tags = snapshot.tags
        })
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        get().pushToast({ tone: 'danger', title: '标签更新失败', description: message })
      }
    },

    loadRawMetadata: async (imageId) => {
      const api = bridge()
      if (!api) return null
      try {
        return await api.images.raw(imageId)
      } catch {
        return null
      }
    },

    updateSettings: (patch) =>
      set((s) => {
        Object.assign(s.settings, patch)
        s.unsavedChanges = true
      }),

    /**
     * 切换输出模式。如果当前用的正好是内置提示词，
     * 就顺手换到新模式对应的那套；用户自己加的模板不动。
     */
    setOutputFormat: (mode) => {
      get().updateSettings({ outputFormat: mode })
      const { activePrompt, prompts } = get()
      if (activePrompt?.builtin && activePrompt.builtin !== mode) {
        const target = prompts.find((item) => item.builtin === mode)
        if (target) void get().activatePrompt(target.id)
      }
    },

    saveSettings: async () => {
      const api = bridge()
      if (!api) return
      try {
        const settings = await api.settings.save(get().settings)
        set((s) => {
          s.settings = settings
          s.unsavedChanges = false
        })
        get().pushToast({ tone: 'success', title: '设置已保存' })
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        get().pushToast({ tone: 'danger', title: '保存失败', description: message })
      }
    },

    fetchModels: async () => {
      const api = bridge()
      if (!api) return null
      set((s) => void (s.fetchingModels = true))
      try {
        const { result, snapshot } = await api.settings.fetchModels()
        const snap = snapshot
        set((s) => {
          s.settings = snap.settings
          s.endpoints = snap.endpoints
          s.activeEndpoint = snap.activeEndpoint
          s.apiKey = snap.apiKey
          s.unsavedChanges = false
        })
        get().pushToast(
          result.ok
            ? { tone: 'success', title: result.message }
            : { tone: 'danger', title: '获取模型列表失败', description: result.message }
        )
        return result
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        get().pushToast({ tone: 'danger', title: '获取模型列表失败', description: message })
        return null
      } finally {
        set((s) => void (s.fetchingModels = false))
      }
    },

    upsertEndpoint: async (patch) => {
      const api = bridge()
      if (!api) return
      try {
        const snap = await api.endpoints.upsert(patch)
        set((s) => {
          s.endpoints = snap.endpoints
          s.activeEndpoint = snap.activeEndpoint
          s.apiKey = snap.apiKey
        })
      } catch (error) {
        get().pushToast({
          tone: 'danger',
          title: '保存配置失败',
          description: error instanceof Error ? error.message : String(error)
        })
      }
    },

    removeEndpoint: async (id) => {
      const api = bridge()
      if (!api) return
      try {
        const snap = await api.endpoints.remove(id)
        set((s) => {
          s.endpoints = snap.endpoints
          s.activeEndpoint = snap.activeEndpoint
          s.apiKey = snap.apiKey
        })
        get().pushToast({ tone: 'warning', title: '配置已删除' })
      } catch (error) {
        get().pushToast({
          tone: 'danger',
          title: '删除失败',
          description: error instanceof Error ? error.message : String(error)
        })
      }
    },

    activateEndpoint: async (id) => {
      const api = bridge()
      if (!api) return
      try {
        const snap = await api.endpoints.activate(id)
        set((s) => {
          s.endpoints = snap.endpoints
          s.activeEndpoint = snap.activeEndpoint
          s.apiKey = snap.apiKey
        })
      } catch (error) {
        get().pushToast({
          tone: 'danger',
          title: '切换配置失败',
          description: error instanceof Error ? error.message : String(error)
        })
      }
    },

    upsertPrompt: async (patch) => {
      const api = bridge()
      if (!api) return
      try {
        const snap = await api.prompts.upsert(patch)
        set((s) => {
          s.prompts = snap.prompts
          s.activePrompt = snap.activePrompt
        })
      } catch (error) {
        get().pushToast({
          tone: 'danger',
          title: '保存提示词失败',
          description: error instanceof Error ? error.message : String(error)
        })
      }
    },

    removePrompt: async (id) => {
      const api = bridge()
      if (!api) return
      try {
        const snap = await api.prompts.remove(id)
        set((s) => {
          s.prompts = snap.prompts
          s.activePrompt = snap.activePrompt
        })
      } catch (error) {
        get().pushToast({
          tone: 'danger',
          title: '删除提示词失败',
          description: error instanceof Error ? error.message : String(error)
        })
      }
    },

    activatePrompt: async (id) => {
      const api = bridge()
      if (!api) return
      try {
        const snap = await api.prompts.activate(id)
        set((s) => {
          s.prompts = snap.prompts
          s.activePrompt = snap.activePrompt
        })
      } catch (error) {
        get().pushToast({
          tone: 'danger',
          title: '切换提示词失败',
          description: error instanceof Error ? error.message : String(error)
        })
      }
    },

    resetPrompt: async (id) => {
      const api = bridge()
      if (!api) return
      try {
        const snap = await api.prompts.reset(id)
        set((s) => {
          s.prompts = snap.prompts
          s.activePrompt = snap.activePrompt
        })
        get().pushToast({ tone: 'info', title: '已恢复成内置内容' })
      } catch (error) {
        get().pushToast({
          tone: 'danger',
          title: '恢复失败',
          description: error instanceof Error ? error.message : String(error)
        })
      }
    },

    tagging: { status: 'idle', total: 0, done: 0, failed: 0 },
    taggingTab: 'pending',
    setTaggingTab: (tab) => set((s) => void (s.taggingTab = tab)),
    taggingDatasetFilter: 'all',
    setTaggingDatasetFilter: (id) => set((s) => void (s.taggingDatasetFilter = id)),
    setTagging: (job) => set((s) => void (s.tagging = job)),

    startTagging: async (imageIds) => {
      const api = bridge()
      if (!api) return
      if (get().unsavedChanges) await get().saveSettings()
      try {
        const result = await api.tagging.start(imageIds)
        if (!result.started) {
          get().pushToast({
            tone: 'warning',
            title: '没能开始打标',
            description: result.message
          })
          return
        }
        get().pushToast({
          tone: 'info',
          title: `已开始打标 ${result.total} 张图片`,
          description: '结果会实时写回，随时可以暂停或取消。'
        })
      } catch (error) {
        get().pushToast({
          tone: 'danger',
          title: '启动打标失败',
          description: error instanceof Error ? error.message : String(error)
        })
      }
    },

    pauseTagging: async () => {
      const api = bridge()
      if (!api) return
      const job = await api.tagging.pause()
      set((s) => void (s.tagging = job))
    },

    resumeTagging: async () => {
      const api = bridge()
      if (!api) return
      const job = await api.tagging.resume()
      set((s) => void (s.tagging = job))
    },

    cancelTagging: async () => {
      const api = bridge()
      if (!api) return
      const job = await api.tagging.cancel()
      set((s) => void (s.tagging = job))
      get().pushToast({
        tone: 'warning',
        title: '已请求取消',
        description: '正在跑的那几张会先结束。'
      })
    },

    requeueImages: async (imageIds, requeued) => {
      const api = bridge()
      if (!api || imageIds.length === 0) return
      try {
        const snap = await api.images.requeue(imageIds, requeued)
        set((s) => {
          s.images = snap.images
          s.datasets = snap.datasets
          s.tags = snap.tags
        })
        get().pushToast(
          requeued
            ? {
                tone: 'info',
                title: `已把 ${imageIds.length} 张图移回准备打标`,
                description: '原有标签和描述都留着，重新打标时按覆盖处理。'
              }
            : {
                tone: 'info',
                title: `已把 ${imageIds.length} 张图移回已打标`,
                description: '它们不会再排在准备打标队列里。'
              }
        )
      } catch (error) {
        get().pushToast({
          tone: 'danger',
          title: '移动失败',
          description: error instanceof Error ? error.message : String(error)
        })
      }
    },

    setImageTags: async (patch) => {
      const api = bridge()
      if (!api) return
      try {
        const snap = await api.images.setTags(patch)
        set((s) => {
          s.images = snap.images
          s.datasets = snap.datasets
          s.tags = snap.tags
        })
      } catch (error) {
        get().pushToast({
          tone: 'danger',
          title: '保存标签失败',
          description: error instanceof Error ? error.message : String(error)
        })
      }
    },

    exportTags: async (scope) => {
      const api = bridge()
      if (!api) return
      try {
        const result = await api.datasets.exportTags(scope)
        const parts = [`已写出 ${result.written} 个 .txt`]
        if (result.skipped > 0) parts.push(`${result.skipped} 张没有内容、已跳过`)
        get().pushToast({
          tone: result.written > 0 ? 'success' : 'warning',
          title: parts.join(' · '),
          description: '文件写在同一目录下，覆盖同名 .txt。内容跟当前输出模式走。'
        })
      } catch (error) {
        get().pushToast({
          tone: 'danger',
          title: '导出失败',
          description: error instanceof Error ? error.message : String(error)
        })
      }
    }
  }))
)
