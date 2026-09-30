import type { ParsedMetadata } from './comfyGraph'

function stripExtension(name: string): string {
  return name.replace(/\.(safetensors|ckpt|pt|sft|bin)$/i, '').trim()
}

function parseParams(line: string): Record<string, string> {
  const params: Record<string, string> = {}
  const parts = line.split(/,\s*(?=[A-Za-z][A-Za-z ]*:)/)
  for (const part of parts) {
    const index = part.indexOf(':')
    if (index === -1) continue
    params[part.slice(0, index).trim()] = part.slice(index + 1).trim()
  }
  return params
}

export function isA1111Parameters(text: string): boolean {
  return /(^|\n)\s*Steps:\s*\d+/.test(text)
}

export function parseA1111Parameters(text: string): ParsedMetadata {
  const result: ParsedMetadata = { loras: [] }
  const lines = text.split(/\r?\n/)

  let paramsIndex = -1
  for (let i = lines.length - 1; i >= 0; i--) {
    if (/^\s*Steps:\s*\d+/.test(lines[i])) {
      paramsIndex = i
      break
    }
  }
  if (paramsIndex === -1) return result

  const promptBlock = lines.slice(0, paramsIndex).join('\n')
  const negativeMarker = 'Negative prompt:'
  const negativeAt = promptBlock.indexOf(negativeMarker)

  if (negativeAt === -1) {
    result.positive = promptBlock.trim() || undefined
  } else {
    result.positive = promptBlock.slice(0, negativeAt).trim() || undefined
    result.negative = promptBlock.slice(negativeAt + negativeMarker.length).trim() || undefined
  }

  const params = parseParams(lines[paramsIndex])

  const steps = Number(params['Steps'])
  if (Number.isFinite(steps)) result.steps = steps

  const cfg = Number(params['CFG scale'])
  if (Number.isFinite(cfg)) result.cfg = cfg

  const seed = Number(params['Seed'])
  if (Number.isFinite(seed)) result.seed = seed

  const clipSkip = Number(params['Clip skip'])
  if (Number.isFinite(clipSkip)) result.clipSkip = clipSkip

  result.sampler = params['Sampler']
  result.scheduler = params['Schedule type'] ?? params['Scheduler']
  result.checkpoint = params['Model'] ? stripExtension(params['Model']) : undefined

  for (const [key, value] of Object.entries(params)) {
    if (!key.startsWith('Lora hashes')) continue
    for (const entry of value.split(',')) {
      const [name] = entry.split(':')
      if (name?.trim()) result.loras.push({ name: name.trim(), weight: 1 })
    }
  }

  return result
}
