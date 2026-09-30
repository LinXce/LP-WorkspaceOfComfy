import type { LoraRef } from '@shared/types'

interface GraphNode {
  class_type?: string
  inputs?: Record<string, unknown>
}

export type ComfyGraph = Record<string, GraphNode>

export interface ParsedMetadata {
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
}

const TEXT_NODE_TYPES = new Set([
  'CLIPTextEncode',
  'CLIPTextEncodeSDXL',
  'CLIPTextEncodeSDXLRefiner',
  'CLIPTextEncodeFlux',
  'BNK_CLIPTextEncodeAdvanced',
  'BNK_CLIPTextEncodeSDXLAdvanced'
])

const SAMPLER_TYPES = new Set([
  'KSampler',
  'KSamplerAdvanced',
  'SamplerCustom',
  'SamplerCustomAdvanced'
])

const LORA_TYPES = new Set(['LoraLoader', 'LoraLoaderModelOnly'])

function refId(value: unknown): string | null {
  if (!Array.isArray(value) || value.length === 0) return null
  const head = value[0]
  if (typeof head === 'string' || typeof head === 'number') return String(head)
  return null
}

function num(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value))) {
    return Number(value)
  }
  return undefined
}

function str(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

function stripExtension(name: string): string {
  return name.replace(/\.(safetensors|ckpt|pt|sft|bin)$/i, '')
}

function collectText(
  graph: ComfyGraph,
  ref: unknown,
  depth = 0,
  visited = new Set<string>()
): string[] {
  const id = refId(ref)
  if (!id || depth > 16 || visited.has(id)) return []
  const node = graph[id]
  if (!node) return []

  visited.add(id)
  const inputs = node.inputs ?? {}

  if (TEXT_NODE_TYPES.has(node.class_type ?? '')) {
    const text = str(inputs.text) ?? str(inputs.text_g)
    return text ? [text] : []
  }

  const collected: string[] = []
  for (const value of Object.values(inputs)) {
    collected.push(...collectText(graph, value, depth + 1, visited))
  }
  return collected
}

function walkModelChain(
  graph: ComfyGraph,
  ref: unknown
): { checkpoint?: string; loras: LoraRef[] } {
  const loras: LoraRef[] = []
  let checkpoint: string | undefined
  let id = refId(ref)
  const visited = new Set<string>()

  while (id && !visited.has(id)) {
    visited.add(id)
    const node = graph[id]
    if (!node) break

    const cls = node.class_type ?? ''
    const inputs = node.inputs ?? {}

    if (cls === 'CheckpointLoaderSimple' || cls === 'CheckpointLoader') {
      checkpoint = str(inputs.ckpt_name)
      break
    }
    if (cls === 'UNETLoader') {
      checkpoint = str(inputs.unet_name)
      break
    }
    if (LORA_TYPES.has(cls)) {
      const name = str(inputs.lora_name)
      if (name) {
        loras.push({ name: stripExtension(name), weight: num(inputs.strength_model) ?? 1 })
      }
    }
    id = refId(inputs.model) ?? refId(inputs.MODEL) ?? refId(inputs.unet)
  }

  return { checkpoint, loras: loras.reverse() }
}

export function isComfyGraph(value: unknown): value is ComfyGraph {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const values = Object.values(value as Record<string, unknown>)
  if (values.length === 0) return false
  return values.every(
    (node) => node !== null && typeof node === 'object' && 'class_type' in (node as object)
  )
}

export function parseComfyGraph(graph: ComfyGraph): ParsedMetadata {
  const result: ParsedMetadata = { loras: [] }

  const sampler = Object.values(graph).find((node) =>
    SAMPLER_TYPES.has(node.class_type ?? '')
  )

  if (sampler) {
    const inputs = sampler.inputs ?? {}
    const positives = collectText(graph, inputs.positive)
    const negatives = collectText(graph, inputs.negative)
    if (positives.length) result.positive = positives.join(', ')
    if (negatives.length) result.negative = negatives.join(', ')

    const chain = walkModelChain(graph, inputs.model)
    result.checkpoint = chain.checkpoint
    result.loras = chain.loras

    result.seed = num(inputs.seed) ?? num(inputs.noise_seed)
    result.steps = num(inputs.steps)
    result.cfg = num(inputs.cfg)
    result.sampler = str(inputs.sampler_name)
    result.scheduler = str(inputs.scheduler)
  }

  if (!result.positive) {
    const fallback: string[] = []
    for (const node of Object.values(graph)) {
      if (!TEXT_NODE_TYPES.has(node.class_type ?? '')) continue
      const text = str(node.inputs?.text)
      if (text) fallback.push(text)
    }
    if (fallback.length) result.positive = fallback[0]
  }

  if (!result.checkpoint || result.loras.length === 0) {
    for (const node of Object.values(graph)) {
      const cls = node.class_type ?? ''
      const inputs = node.inputs ?? {}
      if (!result.checkpoint && (cls === 'CheckpointLoaderSimple' || cls === 'UNETLoader')) {
        result.checkpoint = str(inputs.ckpt_name) ?? str(inputs.unet_name)
      }
      if (LORA_TYPES.has(cls)) {
        const name = str(inputs.lora_name)
        if (name && !result.loras.some((lora) => lora.name === stripExtension(name))) {
          result.loras.push({
            name: stripExtension(name),
            weight: num(inputs.strength_model) ?? 1
          })
        }
      }
    }
  }

  return result
}
