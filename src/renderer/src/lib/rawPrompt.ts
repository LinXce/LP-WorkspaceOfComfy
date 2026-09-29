import type { ImageMeta } from '@shared/types'

export function buildRawPrompt(image: ImageMeta): Record<string, unknown> | null {
  if (!image.positive) return null

  const graph: Record<string, unknown> = {
    '4': {
      class_type: 'CheckpointLoaderSimple',
      inputs: { ckpt_name: image.checkpoint ?? 'unknown.safetensors' }
    }
  }

  let modelRef: [string, number] = ['4', 0]
  let clipRef: [string, number] = ['4', 1]

  image.loras.forEach((lora, index) => {
    const id = String(10 + index)
    graph[id] = {
      class_type: 'LoraLoader',
      inputs: {
        lora_name: `${lora.name}.safetensors`,
        strength_model: lora.weight,
        strength_clip: lora.weight,
        model: modelRef,
        clip: clipRef
      }
    }
    modelRef = [id, 0]
    clipRef = [id, 1]
  })

  graph['6'] = {
    class_type: 'CLIPTextEncode',
    inputs: { text: image.negative ?? '', clip: clipRef }
  }
  graph['7'] = {
    class_type: 'CLIPTextEncode',
    inputs: { text: image.positive, clip: clipRef }
  }
  graph['5'] = {
    class_type: 'EmptyLatentImage',
    inputs: { width: image.width, height: image.height, batch_size: 1 }
  }
  graph['3'] = {
    class_type: 'KSampler',
    inputs: {
      seed: image.seed ?? 0,
      steps: image.steps ?? 20,
      cfg: image.cfg ?? 7,
      sampler_name: image.sampler ?? 'euler',
      scheduler: image.scheduler ?? 'normal',
      denoise: 1,
      model: modelRef,
      positive: ['7', 0],
      negative: ['6', 0],
      latent_image: ['5', 0]
    }
  }
  graph['8'] = { class_type: 'VAEDecode', inputs: { samples: ['3', 0], vae: ['4', 2] } }
  graph['9'] = {
    class_type: 'SaveImage',
    inputs: { filename_prefix: 'ComfyUI', images: ['8', 0] }
  }

  return graph
}

export function buildRawWorkflow(image: ImageMeta): Record<string, unknown> | null {
  if (!image.positive) return null

  const nodes = [
    {
      id: 4,
      type: 'CheckpointLoaderSimple',
      widgets_values: [image.checkpoint ?? 'unknown.safetensors']
    },
    ...image.loras.map((lora, index) => ({
      id: 10 + index,
      type: 'LoraLoader',
      widgets_values: [`${lora.name}.safetensors`, lora.weight, lora.weight]
    })),
    { id: 7, type: 'CLIPTextEncode', widgets_values: [image.positive] },
    { id: 6, type: 'CLIPTextEncode', widgets_values: [image.negative ?? ''] },
    {
      id: 3,
      type: 'KSampler',
      widgets_values: [
        image.seed ?? 0,
        'randomize',
        image.steps ?? 20,
        image.cfg ?? 7,
        image.sampler ?? 'euler',
        image.scheduler ?? 'normal',
        1
      ]
    },
    { id: 5, type: 'EmptyLatentImage', widgets_values: [image.width, image.height, 1] },
    { id: 8, type: 'VAEDecode', widgets_values: [] },
    { id: 9, type: 'SaveImage', widgets_values: ['ComfyUI'] }
  ]

  return {
    last_node_id: 9,
    last_link_id: 12,
    nodes,
    links: [],
    version: 0.4,
    note: '由 ComfyUI 工作台从 PNG tEXt 块还原（mock 数据）'
  }
}
