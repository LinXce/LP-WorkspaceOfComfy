import { contextBridge, ipcRenderer } from 'electron'
import type {
  AppSettings,
  ConnectionTestResult,
  Dataset,
  EndpointConfig,
  ImageTagPatch,
  RawMetadata,
  ScanProgress,
  StartTaggingResult,
  TagCategory,
  TaggingJob,
  WorkspaceSnapshot
} from '@shared/types'

const api = {
  window: {
    minimize: () => ipcRenderer.invoke('window:minimize'),
    toggleMaximize: (): Promise<boolean> => ipcRenderer.invoke('window:toggle-maximize'),
    close: () => ipcRenderer.invoke('window:close'),
    isMaximized: (): Promise<boolean> => ipcRenderer.invoke('window:is-maximized'),
    onMaximizedChange: (cb: (maximized: boolean) => void) => {
      const listener = (_e: unknown, value: boolean): void => cb(value)
      ipcRenderer.on('window:maximized-changed', listener)
      return () => ipcRenderer.removeListener('window:maximized-changed', listener)
    }
  },
  app: {
    info: (): Promise<{ version: string; name: string; platform: string; userData: string }> =>
      ipcRenderer.invoke('app:info')
  },
  workspace: {
    snapshot: (): Promise<WorkspaceSnapshot> => ipcRenderer.invoke('workspace:snapshot'),
    onChanged: (cb: () => void) => {
      const listener = (): void => cb()
      ipcRenderer.on('workspace:changed', listener)
      return () => ipcRenderer.removeListener('workspace:changed', listener)
    }
  },
  datasets: {
    add: (path?: string): Promise<Dataset | null> => ipcRenderer.invoke('datasets:add', path),
    rescan: (id: string): Promise<Dataset> => ipcRenderer.invoke('datasets:rescan', id),
    remove: (id: string): Promise<WorkspaceSnapshot> => ipcRenderer.invoke('datasets:remove', id),
    exportTags: (scope: string): Promise<{ written: number; captions: number; skipped: number }> =>
      ipcRenderer.invoke('datasets:export-tags', scope),
    onScanProgress: (cb: (progress: ScanProgress) => void) => {
      const listener = (_e: unknown, progress: ScanProgress): void => cb(progress)
      ipcRenderer.on('scan:progress', listener)
      return () => ipcRenderer.removeListener('scan:progress', listener)
    }
  },
  tagging: {
    start: (imageIds: string[]): Promise<StartTaggingResult> =>
      ipcRenderer.invoke('tagging:start', imageIds),
    pause: (): Promise<TaggingJob> => ipcRenderer.invoke('tagging:pause'),
    resume: (): Promise<TaggingJob> => ipcRenderer.invoke('tagging:resume'),
    cancel: (): Promise<TaggingJob> => ipcRenderer.invoke('tagging:cancel'),
    state: (): Promise<TaggingJob> => ipcRenderer.invoke('tagging:state'),
    onProgress: (cb: (job: TaggingJob) => void) => {
      const listener = (_e: unknown, job: TaggingJob): void => cb(job)
      ipcRenderer.on('tagging:progress', listener)
      return () => ipcRenderer.removeListener('tagging:progress', listener)
    }
  },
  tags: {
    update: (payload: {
      name: string
      category?: TagCategory
      aliases?: string[]
      blacklisted?: boolean
    }): Promise<WorkspaceSnapshot> => ipcRenderer.invoke('tags:update', payload)
  },
  settings: {
    save: (patch: Partial<AppSettings>): Promise<AppSettings> =>
      ipcRenderer.invoke('settings:save', patch),
    fetchModels: (): Promise<{
      result: ConnectionTestResult
      settings: AppSettings
      endpoint: EndpointConfig | null
      snapshot: WorkspaceSnapshot
    }> => ipcRenderer.invoke('settings:fetch-models')
  },
  endpoints: {
    upsert: (patch: Partial<EndpointConfig>): Promise<WorkspaceSnapshot> =>
      ipcRenderer.invoke('endpoints:upsert', patch),
    remove: (id: string): Promise<WorkspaceSnapshot> =>
      ipcRenderer.invoke('endpoints:remove', id),
    activate: (id: string): Promise<WorkspaceSnapshot> =>
      ipcRenderer.invoke('endpoints:activate', id)
  },
  images: {
    raw: (imageId: string): Promise<RawMetadata | null> =>
      ipcRenderer.invoke('images:raw', imageId),
    requeue: (imageIds: string[], requeued: boolean): Promise<WorkspaceSnapshot> =>
      ipcRenderer.invoke('images:requeue', { imageIds, requeued }),
    setTags: (patch: ImageTagPatch): Promise<WorkspaceSnapshot> =>
      ipcRenderer.invoke('images:set-tags', patch)
  },
  dialog: {
    pickFolder: (title?: string): Promise<string | null> =>
      ipcRenderer.invoke('dialog:pick-folder', title)
  },
  shell: {
    openPath: (target: string): Promise<string> => ipcRenderer.invoke('shell:open-path', target)
  }
}

export type WorkspaceApi = typeof api

contextBridge.exposeInMainWorld('workspace', api)
