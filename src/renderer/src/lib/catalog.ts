import type { EndpointConfig, MetadataSource, TagCategory } from '@shared/types'
import { ENDPOINT_PRESETS } from '@shared/defaults'

export const SOURCE_LABEL: Record<MetadataSource, string> = {
  comfyui: 'ComfyUI 节点图',
  a1111: 'A1111 parameters',
  novelai: 'NovelAI 注释',
  none: '无嵌入元数据'
}

export const TAG_CATEGORY_LABEL: Record<TagCategory, string> = {
  person: '人物',
  style: '风格',
  scene: '场景',
  quality: '质量',
  object: '物件',
  other: '其他'
}

export const TAG_CATEGORY_TONE: Record<TagCategory, string> = {
  person: 'text-accent',
  style: 'text-signal',
  scene: 'text-warning',
  quality: 'text-danger',
  object: 'text-ink-soft',
  other: 'text-ink-muted'
}

export const ALL_TAG_CATEGORIES: TagCategory[] = [
  'person',
  'style',
  'scene',
  'quality',
  'object',
  'other'
]

export const CATEGORY_OPTIONS = ALL_TAG_CATEGORIES.map((value) => ({
  value,
  label: TAG_CATEGORY_LABEL[value]
}))

export const MODEL_SUGGESTIONS = [
  { value: 'gemini-3.7-flash', label: 'gemini-3.7-flash' },
  { value: 'gemini-3.8-flash', label: 'gemini-3.8-flash' },
  { value: 'grok-4.6', label: 'grok-4.6' },
  { value: 'gpt-4o-mini', label: 'gpt-4o-mini' },
  { value: 'gpt-4o', label: 'gpt-4o' },
  { value: 'qwen-vl-max', label: 'qwen-vl-max' },
  { value: 'glm-4v-plus', label: 'glm-4v-plus' },
  { value: 'llava-1.6-34b', label: 'llava-1.6-34b（本地 vLLM）' }
]

export function presetForBaseUrl(baseUrl: string): string {
  const normalized = baseUrl.replace(/\/+$/, '')
  return ENDPOINT_PRESETS.find((preset) => preset.baseUrl === normalized)?.id ?? 'custom'
}

export function presetModels(baseUrl: string): string[] {
  const normalized = baseUrl.replace(/\/+$/, '')
  return ENDPOINT_PRESETS.find((preset) => preset.baseUrl === normalized)?.models ?? []
}

/** 模型下拉的选项：优先用端点拉回来的真实列表，其次用预设，最后兜底到内置建议。 */
export function modelOptionsFor(endpoint: EndpointConfig | null): { value: string; label: string }[] {
  if (!endpoint) return []

  const fromPreset = presetModels(endpoint.baseUrl)
  const source =
    endpoint.availableModels.length > 0
      ? endpoint.availableModels
      : fromPreset.length > 0
        ? fromPreset
        : MODEL_SUGGESTIONS.map((item) => item.value)

  const names = new Set<string>(source)
  if (endpoint.model) names.add(endpoint.model)

  return [...names].map((name) => ({ value: name, label: name }))
}

export const OUTPUT_FORMAT_OPTIONS = [
  { value: 'tag', label: '标签' },
  { value: 'nl', label: '描述' }
]
