import { randomUUID } from 'node:crypto'
import { existsSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  BUILTIN_PROMPTS,
  PROMPT_FILE_VERSION,
  TAG_PROMPT_TEMPLATE
} from '@shared/defaults'
import type { PromptStore, PromptTemplate } from '@shared/types'
import { dataDir } from './db'

let cache: PromptStore | null = null

export function promptsFilePath(): string {
  return join(dataDir(), 'prompts.json')
}

/** 从旧的 workspace.json 里捞一次提示词，只用于首次迁移。 */
function legacyTemplate(): string | null {
  try {
    const raw = JSON.parse(readFileSync(join(dataDir(), 'workspace.json'), 'utf8')) as {
      settings?: Record<string, unknown>
    }
    const text = raw.settings?.template
    return typeof text === 'string' && text.trim() ? text : null
  } catch {
    return null
  }
}

function builtinItems(): PromptTemplate[] {
  return BUILTIN_PROMPTS.map((item) => ({
    id: randomUUID(),
    name: item.name,
    text: item.text,
    builtin: item.mode
  }))
}

function normalize(item: Partial<PromptTemplate>): PromptTemplate {
  return {
    id: typeof item.id === 'string' && item.id ? item.id : randomUUID(),
    name: typeof item.name === 'string' && item.name.trim() ? item.name : '未命名模板',
    text: typeof item.text === 'string' ? item.text : '',
    builtin: item.builtin === 'tag' || item.builtin === 'nl' ? item.builtin : undefined
  }
}

function seed(): PromptStore {
  const items = builtinItems()
  const legacy = legacyTemplate()
  const builtinTexts = BUILTIN_PROMPTS.map((item) => item.text)

  // 老版本只有一条 template：改过就留成一条自定义模板，没改过就激活对应的内置模板
  if (legacy && !builtinTexts.includes(legacy)) {
    const custom: PromptTemplate = {
      id: randomUUID(),
      name: '我之前用的模板',
      text: legacy
    }
    items.push(custom)
    return { version: PROMPT_FILE_VERSION, activeId: custom.id, items }
  }

  const matched = BUILTIN_PROMPTS.findIndex((item) => item.text === legacy)
  return {
    version: PROMPT_FILE_VERSION,
    activeId: items[matched >= 0 ? matched : 0].id,
    items
  }
}

export function loadPrompts(): PromptStore {
  if (cache) return cache

  const file = promptsFilePath()
  if (!existsSync(file)) {
    cache = seed()
    savePrompts()
    return cache
  }

  try {
    const parsed = JSON.parse(readFileSync(file, 'utf8')) as Partial<PromptStore>
    const items = Array.isArray(parsed.items) ? parsed.items.map(normalize) : []
    cache = {
      version: PROMPT_FILE_VERSION,
      activeId:
        typeof parsed.activeId === 'string' && items.some((item) => item.id === parsed.activeId)
          ? parsed.activeId
          : (items[0]?.id ?? null),
      items
    }
    if (items.length === 0) {
      cache = seed()
      savePrompts()
    }
  } catch {
    cache = seed()
  }
  return cache
}

export function savePrompts(): void {
  if (!cache) return
  const file = promptsFilePath()
  const tmp = `${file}.tmp`
  writeFileSync(tmp, JSON.stringify(cache, null, 2), 'utf8')
  renameSync(tmp, file)
}

export function listPrompts(): PromptTemplate[] {
  return loadPrompts().items
}

export function activePrompt(): PromptTemplate | null {
  const store = loadPrompts()
  return store.items.find((item) => item.id === store.activeId) ?? null
}

/** 打标实际使用的那段提示词，取不到就退回内置标签模板。 */
export function activePromptText(): string {
  return activePrompt()?.text ?? TAG_PROMPT_TEMPLATE
}

export function setActivePrompt(id: string | null): void {
  const store = loadPrompts()
  store.activeId = id && store.items.some((item) => item.id === id) ? id : null
  savePrompts()
}

export function upsertPrompt(patch: Partial<PromptTemplate> & { id?: string }): PromptTemplate {
  const store = loadPrompts()
  const index = patch.id ? store.items.findIndex((item) => item.id === patch.id) : -1

  if (index >= 0) {
    const merged = normalize({ ...store.items[index], ...patch, id: store.items[index].id })
    store.items[index] = merged
    savePrompts()
    return merged
  }

  const created = normalize(patch)
  store.items.push(created)
  store.activeId = created.id
  savePrompts()
  return created
}

export function removePrompt(id: string): void {
  const store = loadPrompts()
  if (store.items.length <= 1) return
  store.items = store.items.filter((item) => item.id !== id)
  if (store.activeId === id) store.activeId = store.items[0]?.id ?? null
  savePrompts()
}

/** 把内置模板恢复成出厂内容。 */
export function resetPrompt(id: string): PromptTemplate | null {
  const store = loadPrompts()
  const item = store.items.find((entry) => entry.id === id)
  if (!item?.builtin) return null
  const builtin = BUILTIN_PROMPTS.find((entry) => entry.mode === item.builtin)
  if (!builtin) return null
  item.text = builtin.text
  item.name = builtin.name
  savePrompts()
  return { ...item }
}
