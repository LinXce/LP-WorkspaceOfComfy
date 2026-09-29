import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { MOCK_PROMPT_TEMPLATE } from './mock'
import type { AppSettings } from '@shared/types'

export type ViewId = 'gallery' | 'datasets' | 'tagging' | 'tags' | 'settings'
export type PreviewState = 'ready' | 'loading' | 'empty' | 'error'
export type Density = 'comfortable' | 'compact'
export type MotionLevel = 'full' | 'reduced' | 'none'
export type ToastTone = 'info' | 'success' | 'warning' | 'danger'

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

  previewState: PreviewState
  setPreviewState: (state: PreviewState) => void

  visibleIds: string[]
  setVisibleIds: (ids: string[]) => void
  selectedIds: string[]
  primaryId: string | null
  select: (id: string, mode?: 'replace' | 'toggle' | 'range') => void
  selectAll: () => void
  clearSelection: () => void

  selectedTagId: string | null
  setSelectedTagId: (id: string | null) => void

  tagOverrides: Record<string, string[]>
  setImageTags: (imageId: string, tags: string[]) => void

  activeDatasetId: string
  setActiveDatasetId: (id: string) => void

  tagQuery: string
  setTagQuery: (q: string) => void
  tagCategoryFilter: string
  setTagCategoryFilter: (c: string) => void

  toasts: ToastItem[]
  pushToast: (toast: Omit<ToastItem, 'id'>) => void
  dismissToast: (id: string) => void

  settings: AppSettings
  updateSettings: (patch: Partial<AppSettings>) => void

  unsavedChanges: boolean
  setUnsavedChanges: (value: boolean) => void
}

const initialSettings: AppSettings = {
  baseUrl: 'https://api.openai.com/v1',
  apiKey: '',
  model: 'gpt-4o-mini',
  outputFormat: 'json',
  template: MOCK_PROMPT_TEMPLATE,
  concurrency: 3,
  timeoutMs: 30000,
  allowNewTags: true,
  overwrite: false,
  datasetRoot: 'D:\\ComfyUI\\datasets',
  thumbnailDir: 'C:\\Users\\Administrator\\AppData\\Roaming\\ComfyUI Workspace\\thumbnails',
  thumbnailLimitMb: 2048
}

let toastSeq = 0

export const useWorkspace = create<WorkspaceState>()(
  immer((set, get) => ({
    view: 'gallery',
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
    motion: 'full',
    setMotion: (motion) => set((s) => void (s.motion = motion)),

    tileSize: 168,
    setTileSize: (size) => set((s) => void (s.tileSize = size)),

    previewState: 'ready',
    setPreviewState: (state) => set((s) => void (s.previewState = state)),

    visibleIds: [],
    setVisibleIds: (ids) => set((s) => void (s.visibleIds = ids)),
    selectedIds: [],
    primaryId: null,
    select: (id, mode = 'replace') => {
      const { selectedIds, visibleIds } = get()
      if (mode === 'toggle') {
        const exists = selectedIds.includes(id)
        set((s) => {
          s.selectedIds = exists ? s.selectedIds.filter((x) => x !== id) : [...s.selectedIds, id]
          s.primaryId = exists ? (s.selectedIds.at(-1) ?? null) : id
        })
      } else if (mode === 'range' && selectedIds.length > 0) {
        const anchor = selectedIds[selectedIds.length - 1]
        const a = visibleIds.indexOf(anchor)
        const b = visibleIds.indexOf(id)
        if (a === -1 || b === -1) {
          set((s) => {
            s.selectedIds = [id]
            s.primaryId = id
          })
          return
        }
        const [lo, hi] = a < b ? [a, b] : [b, a]
        set((s) => {
          s.selectedIds = visibleIds.slice(lo, hi + 1)
          s.primaryId = id
        })
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

    selectedTagId: null,
    setSelectedTagId: (id) =>
      set((s) => {
        s.selectedTagId = id
        if (id) s.inspectorOpen = true
      }),

    tagOverrides: {},
    setImageTags: (imageId, tags) =>
      set((s) => {
        s.tagOverrides[imageId] = tags
      }),

    activeDatasetId: 'ds-character',
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

    settings: initialSettings,
    updateSettings: (patch) =>
      set((s) => {
        Object.assign(s.settings, patch)
        s.unsavedChanges = true
      }),

    unsavedChanges: false,
    setUnsavedChanges: (value) => set((s) => void (s.unsavedChanges = value))
  }))
)

export function useImageTags(imageId: string, fallback: string[]): string[] {
  return useWorkspace((s) => s.tagOverrides[imageId] ?? fallback)
}
