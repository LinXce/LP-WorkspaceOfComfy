import { BrowserWindow, dialog, ipcMain, shell } from 'electron'
import { existsSync } from 'node:fs'
import type {
  AppSettings,
  ConnectionTestResult,
  Dataset,
  EndpointConfig,
  ImageTagPatch,
  PromptTemplate,
  RawMetadata,
  ScanProgress,
  StartTaggingResult,
  TagCategory,
  TaggingJob,
  WorkspaceSnapshot
} from '@shared/types'
import {
  addDataset,
  exportSidecarFiles,
  fetchModels,
  rawMetadataFor,
  removeDataset,
  rescanDataset,
  saveSettings,
  setImageRequeued,
  snapshot,
  updateImageTags,
  updateTag
} from './services/workspace'
import {
  removeEndpoint,
  setActiveEndpoint,
  upsertEndpoint
} from './services/endpoints'
import {
  removePrompt,
  resetPrompt,
  setActivePrompt,
  upsertPrompt
} from './services/prompts'
import {
  cancelTagging,
  pauseTagging,
  resumeTagging,
  startTagging,
  taggingJob
} from './services/tagging'

function broadcast(channel: string, payload: unknown): void {
  for (const window of BrowserWindow.getAllWindows()) {
    window.webContents.send(channel, payload)
  }
}

async function pickFolder(title: string): Promise<string | null> {
  const result = await dialog.showOpenDialog({
    title,
    properties: ['openDirectory', 'createDirectory'],
    buttonLabel: '选择'
  })
  if (result.canceled || result.filePaths.length === 0) return null
  return result.filePaths[0]
}

export function registerIpc(): void {
  ipcMain.handle('workspace:snapshot', (): WorkspaceSnapshot => snapshot())

  ipcMain.handle(
    'datasets:add',
    async (_event, targetPath?: string): Promise<Dataset | null> => {
      const folder = targetPath ?? (await pickFolder('选择数据集文件夹'))
      if (!folder) return null
      if (!existsSync(folder)) throw new Error(`目录不存在：${folder}`)
      const dataset = await addDataset(folder, (progress: ScanProgress) =>
        broadcast('scan:progress', progress)
      )
      broadcast('workspace:changed', null)
      return dataset
    }
  )

  ipcMain.handle('datasets:rescan', async (_event, id: string): Promise<Dataset> => {
    const dataset = await rescanDataset(id, (progress: ScanProgress) =>
      broadcast('scan:progress', progress)
    )
    broadcast('workspace:changed', null)
    return dataset
  })

  ipcMain.handle('datasets:remove', (_event, id: string): WorkspaceSnapshot => {
    removeDataset(id)
    return snapshot()
  })

  ipcMain.handle(
    'tags:update',
    (
      _event,
      payload: { name: string; category?: TagCategory; aliases?: string[]; blacklisted?: boolean }
    ): WorkspaceSnapshot => {
      updateTag(payload.name, {
        category: payload.category,
        aliases: payload.aliases,
        blacklisted: payload.blacklisted
      })
      return snapshot()
    }
  )

  ipcMain.handle('settings:save', (_event, patch: Partial<AppSettings>): AppSettings => {
    return saveSettings(patch)
  })

  ipcMain.handle('images:raw', (_event, imageId: string): RawMetadata | null => {
    return rawMetadataFor(imageId)
  })

  ipcMain.handle(
    'images:requeue',
    (_event, payload: { imageIds: string[]; requeued: boolean }): WorkspaceSnapshot => {
      setImageRequeued(payload.imageIds, payload.requeued)
      return snapshot()
    }
  )

  ipcMain.handle('images:set-tags', (_event, patch: ImageTagPatch): WorkspaceSnapshot => {
    updateImageTags(patch)
    return snapshot()
  })

  ipcMain.handle('dialog:pick-folder', (_event, title?: string): Promise<string | null> => {
    return pickFolder(title ?? '选择文件夹')
  })

  ipcMain.handle('shell:open-path', async (_event, target: string): Promise<string> => {
    return shell.openPath(target)
  })

  ipcMain.handle(
    'settings:fetch-models',
    async (): Promise<{
      result: ConnectionTestResult
      settings: AppSettings
      endpoint: EndpointConfig | null
      snapshot: WorkspaceSnapshot
    }> => {
      const outcome = await fetchModels()
      return { ...outcome, snapshot: snapshot() }
    }
  )

  ipcMain.handle(
    'endpoints:upsert',
    (_event, patch: Partial<EndpointConfig>): WorkspaceSnapshot => {
      upsertEndpoint(patch)
      return snapshot()
    }
  )

  ipcMain.handle('endpoints:remove', (_event, id: string): WorkspaceSnapshot => {
    removeEndpoint(id)
    return snapshot()
  })

  ipcMain.handle('endpoints:activate', (_event, id: string): WorkspaceSnapshot => {
    setActiveEndpoint(id)
    return snapshot()
  })

  ipcMain.handle('prompts:upsert', (_event, patch: Partial<PromptTemplate>): WorkspaceSnapshot => {
    upsertPrompt(patch)
    return snapshot()
  })

  ipcMain.handle('prompts:remove', (_event, id: string): WorkspaceSnapshot => {
    removePrompt(id)
    return snapshot()
  })

  ipcMain.handle('prompts:activate', (_event, id: string): WorkspaceSnapshot => {
    setActivePrompt(id)
    return snapshot()
  })

  ipcMain.handle('prompts:reset', (_event, id: string): WorkspaceSnapshot => {
    resetPrompt(id)
    return snapshot()
  })

  ipcMain.handle(
    'tagging:start',
    async (_event, imageIds: string[]): Promise<StartTaggingResult> => {
      return startTagging(
        imageIds,
        (progress) => broadcast('tagging:progress', progress),
        () => broadcast('workspace:changed', null)
      )
    }
  )

  ipcMain.handle('tagging:pause', (): TaggingJob => pauseTagging())
  ipcMain.handle('tagging:resume', (): TaggingJob => resumeTagging())
  ipcMain.handle('tagging:cancel', (): TaggingJob => cancelTagging())
  ipcMain.handle('tagging:state', (): TaggingJob => taggingJob())

  ipcMain.handle(
    'datasets:export-tags',
    (_event, scope: string): { written: number; skipped: number } => exportSidecarFiles(scope)
  )
}
