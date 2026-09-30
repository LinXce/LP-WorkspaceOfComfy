import type { AppSettings, OutputFormat } from './types'

export const TAG_PROMPT_TEMPLATE = `You are an image tagging assistant building a dataset for diffusion model training.

Look at the image and reply with ONLY a comma-separated list of English tags.

Rules:
- lowercase, multi-word tags use single spaces (for example: silver hair)
- describe only what is actually visible: number of subjects, appearance, clothing, pose, setting, lighting, art style, image quality
- 15 to 35 tags, ordered from most to least important
- no sentences, no bullet points, no numbering, no quotes, no code fences, no explanation

Reply format:
tag one, tag two, tag three`

export const NL_PROMPT_TEMPLATE = `You are an image captioning assistant building a dataset for diffusion model training.

Look at the image and reply with ONLY one natural English sentence describing it.

Rules:
- a single sentence, 15 to 40 words
- cover the subject, what they are doing, the setting, the lighting and the art style
- no bullet points, no quotes, no code fences, no explanation

Reply format:
One English sentence.`

export const DEFAULT_PROMPT_TEMPLATE = TAG_PROMPT_TEMPLATE

export const DEFAULT_SETTINGS: AppSettings = {
  outputFormat: 'tag',
  template: TAG_PROMPT_TEMPLATE,
  concurrency: 3,
  timeoutMs: 60000,
  allowNewTags: true,
  overwrite: false,
  datasetRoot: '',
  thumbnailLimitMb: 2048
}

export const TEMPLATE_BY_MODE: Record<OutputFormat, string> = {
  tag: TAG_PROMPT_TEMPLATE,
  nl: NL_PROMPT_TEMPLATE
}

export interface EndpointPreset {
  id: string
  label: string
  baseUrl: string
  envVars: string[]
  models: string[]
  note?: string
}

/**
 * 首次运行时自动建好的那条配置。刻意不放进 ENDPOINT_PRESETS：
 * 它不出现在「添加配置」的预置模板里，但已有的配置文件照旧保留。
 */
export const DEFAULT_ENDPOINT: EndpointPreset = {
  id: 'faro',
  label: 'Faro 中转',
  baseUrl: 'https://faroapi.com/v1',
  envVars: ['FARO_API_KEY'],
  models: ['gemini-3.7-flash', 'gemini-3.8-flash', 'grok-4.6'],
  note: 'OpenAI 兼容中转端点'
}

/** 新建配置时的预置模板：选中后自动填 Base URL、环境变量名建议、默认模型。 */
export const ENDPOINT_PRESETS: EndpointPreset[] = [
  {
    id: 'openai',
    label: 'OpenAI 官方',
    baseUrl: 'https://api.openai.com/v1',
    envVars: ['OPENAI_API_KEY'],
    models: ['gpt-4o-mini', 'gpt-4o', 'gpt-4.1-mini']
  },
  {
    id: 'deepseek',
    label: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com/v1',
    envVars: ['DEEPSEEK_API_KEY'],
    models: [],
    note: '注意：DeepSeek 目前没有多模态模型，打标需要换成支持图片输入的端点'
  },
  {
    id: 'dashscope',
    label: '通义千问',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    envVars: ['DASHSCOPE_API_KEY'],
    models: ['qwen-vl-max', 'qwen-vl-plus']
  },
  {
    id: 'local',
    label: '本地服务',
    baseUrl: 'http://127.0.0.1:11434/v1',
    envVars: [],
    models: [],
    note: 'Ollama / vLLM 这类本地端点通常不校验密钥'
  }
]

/** 环境变量名输入框的候选项，仅作建议。 */
export const API_KEY_ENV_CANDIDATES = [
  'FARO_API_KEY',
  'OPENAI_API_KEY',
  'DASHSCOPE_API_KEY',
  'DEEPSEEK_API_KEY'
]

export const ENDPOINT_FILE_VERSION = 1

export const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp'] as const

export const THUMBNAIL_SIZE = 420
export const WORKSPACE_FILE_VERSION = 1
