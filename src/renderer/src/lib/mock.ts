import type { Dataset, ImageMeta, LoraRef, Tag, TagCategory, TagJob } from '@shared/types'
import { mulberry32 } from './rand'

const QUALITY = ['masterpiece', 'best quality', 'amazing quality', 'very aesthetic', 'absurdres']

const SUBJECT = ['1girl', '1boy', '2girls', 'solo', 'no humans']

const HAIR = [
  'silver hair',
  'black hair',
  'long hair',
  'twintails',
  'short hair',
  'blonde hair',
  'pink hair'
]

const EYES = ['blue eyes', 'red eyes', 'golden eyes', 'green eyes', 'purple eyes']

const CLOTHING = [
  'school uniform',
  'white dress',
  'hoodie',
  'kimono',
  'military uniform',
  'maid outfit',
  'leather jacket'
]

const SCENE = [
  'cherry blossoms',
  'night sky',
  'city lights',
  'forest',
  'ocean',
  'ruins',
  'cafe interior',
  'raining',
  'snowfield',
  'rooftop'
]

const STYLE = [
  'soft lighting',
  'cinematic lighting',
  'rim light',
  'depth of field',
  'backlighting',
  'watercolor',
  'oil painting',
  'flat color',
  'chibi',
  'monochrome'
]

const POSE = [
  'looking at viewer',
  'from above',
  'from side',
  'upper body',
  'full body',
  'dynamic pose',
  'smile',
  'serious',
  'hand on hip'
]

const NEGATIVE = [
  'worst quality',
  'low quality',
  'lowres',
  'bad anatomy',
  'bad hands',
  'extra digits',
  'fewer digits',
  'jpeg artifacts',
  'watermark',
  'signature',
  'username',
  'blurry',
  'text',
  'error'
]

const CHECKPOINTS = [
  'animagineXL_v31.safetensors',
  'ponyDiffusionV6XL.safetensors',
  'noobaiXL_vpred10.safetensors',
  'illustriousXL_v01.safetensors',
  'juggernautXL_v9.safetensors',
  'flux1-dev-fp8.safetensors'
]

const LORAS = [
  'detail_tweaker_xl',
  'add_detail',
  'niji_semi_realism',
  'pixel_art_xl',
  'film_grain_xl',
  'hands_xl_fix',
  'style_ghibli_xl',
  'lighting_slider_xl',
  'lcm_lora_sdxl',
  'yukinoshita_character_xl'
]

const SAMPLERS = ['euler', 'euler_ancestral', 'dpmpp_2m', 'dpmpp_2m_sde', 'dpmpp_3m_sde', 'uni_pc']
const SCHEDULERS = ['normal', 'karras', 'exponential', 'sgm_uniform', 'simple']

const DATASET_SEEDS: { id: string; name: string; path: string }[] = [
  {
    id: 'ds-character',
    name: '雪之下 · 角色 LoRA',
    path: 'D:\\ComfyUI\\datasets\\yukinoshita-lora'
  },
  {
    id: 'ds-cyber',
    name: '赛博朋克场景',
    path: 'D:\\ComfyUI\\datasets\\cyberpunk-scene'
  },
  {
    id: 'ds-watercolor',
    name: '水彩风格测试',
    path: 'D:\\ComfyUI\\datasets\\watercolor-test'
  },
  {
    id: 'ds-sdxl',
    name: 'SDXL 通用测试集',
    path: 'D:\\ComfyUI\\datasets\\sdxl-general'
  }
]

const TAG_CATEGORIES: TagCategory[] = ['person', 'style', 'scene', 'quality', 'object', 'other']

function pick<T>(rand: () => number, arr: T[]): T {
  return arr[Math.floor(rand() * arr.length)]
}

function pickMany<T>(rand: () => number, arr: T[], min: number, max: number): T[] {
  const n = min + Math.floor(rand() * (max - min + 1))
  const pool = [...arr]
  const out: T[] = []
  for (let i = 0; i < n && pool.length; i++) {
    out.push(pool.splice(Math.floor(rand() * pool.length), 1)[0])
  }
  return out
}

function buildImages(): ImageMeta[] {
  const rand = mulberry32(20260114)
  const images: ImageMeta[] = []
  const total = 96

  for (let i = 0; i < total; i++) {
    const dataset = DATASET_SEEDS[i % DATASET_SEEDS.length]
    const hasMeta = rand() > 0.14

    const positive = hasMeta
      ? [
          ...pickMany(rand, QUALITY, 1, 2),
          ...pickMany(rand, SUBJECT, 1, 2),
          ...pickMany(rand, HAIR, 0, 1),
          ...pickMany(rand, EYES, 0, 1),
          ...pickMany(rand, CLOTHING, 0, 1),
          ...pickMany(rand, SCENE, 1, 2),
          ...pickMany(rand, STYLE, 1, 2),
          ...pickMany(rand, POSE, 1, 3)
        ].join(', ')
      : undefined

    const loras: LoraRef[] = hasMeta
      ? pickMany(rand, LORAS, 0, 3).map((name) => ({
          name,
          weight: Number((0.35 + rand() * 0.65).toFixed(2))
        }))
      : []

    const width = pick(rand, [832, 1024, 1216, 1344])
    const height = pick(rand, [832, 1024, 1216, 1536])

    images.push({
      id: `img-${String(i + 1).padStart(3, '0')}`,
      path: `${dataset.path}\\ComfyUI_${String(i + 1).padStart(5, '0')}_.png`,
      fileName: `ComfyUI_${String(i + 1).padStart(5, '0')}_.png`,
      width,
      height,
      sizeBytes: Math.round(680_000 + rand() * 3_400_000),
      mtime: Date.now() - Math.round(rand() * 46 * 24 * 3600 * 1000),
      source: hasMeta ? (rand() > 0.12 ? 'comfyui' : 'a1111') : rand() > 0.5 ? 'exif' : 'none',
      positive,
      negative: hasMeta ? pickMany(rand, NEGATIVE, 6, 11).join(', ') : undefined,
      checkpoint: hasMeta ? pick(rand, CHECKPOINTS) : undefined,
      loras,
      sampler: hasMeta ? pick(rand, SAMPLERS) : undefined,
      scheduler: hasMeta ? pick(rand, SCHEDULERS) : undefined,
      steps: hasMeta ? 20 + Math.floor(rand() * 24) : undefined,
      cfg: hasMeta ? Number((3.5 + rand() * 4).toFixed(1)) : undefined,
      seed: hasMeta ? Math.floor(rand() * 9_999_999_999) : undefined,
      clipSkip: hasMeta ? pick(rand, [1, 1, 2, 2, 3]) : undefined,
      tags: [],
      rating: rand() > 0.72 ? 1 + Math.floor(rand() * 5) : 0,
      datasetId: dataset.id
    })
  }

  return images
}

function buildTags(images: ImageMeta[]): Tag[] {
  const rand = mulberry32(77021)
  const names = new Set<string>()

  const keywordTags: { name: string; category: TagCategory }[] = [
    { name: '1girl', category: 'person' },
    { name: 'solo', category: 'person' },
    { name: 'silver hair', category: 'person' },
    { name: 'blue eyes', category: 'person' },
    { name: 'twintails', category: 'person' },
    { name: 'school uniform', category: 'object' },
    { name: 'kimono', category: 'object' },
    { name: 'maid outfit', category: 'object' },
    { name: 'cherry blossoms', category: 'scene' },
    { name: 'night sky', category: 'scene' },
    { name: 'city lights', category: 'scene' },
    { name: 'raining', category: 'scene' },
    { name: 'cafe interior', category: 'scene' },
    { name: 'watercolor', category: 'style' },
    { name: 'oil painting', category: 'style' },
    { name: 'cinematic lighting', category: 'style' },
    { name: 'rim light', category: 'style' },
    { name: 'depth of field', category: 'style' },
    { name: 'monochrome', category: 'style' },
    { name: 'chibi', category: 'style' },
    { name: 'masterpiece', category: 'quality' },
    { name: 'best quality', category: 'quality' },
    { name: 'lowres', category: 'quality' },
    { name: 'jpeg artifacts', category: 'quality' },
    { name: 'blurry', category: 'quality' },
    { name: 'watermark', category: 'quality' },
    { name: 'looking at viewer', category: 'other' },
    { name: 'from above', category: 'other' },
    { name: 'dynamic pose', category: 'other' },
    { name: 'full body', category: 'other' },
    { name: 'upper body', category: 'other' },
    { name: 'smile', category: 'other' },
    { name: 'backlighting', category: 'style' },
    { name: 'snowfield', category: 'scene' },
    { name: 'rooftop', category: 'scene' },
    { name: 'ocean', category: 'scene' },
    { name: 'ruins', category: 'scene' },
    { name: 'leather jacket', category: 'object' },
    { name: 'hoodie', category: 'object' },
    { name: 'pink hair', category: 'person' },
    { name: 'blonde hair', category: 'person' },
    { name: 'red eyes', category: 'person' },
    { name: 'flat color', category: 'style' },
    { name: 'pixel art', category: 'style' },
    { name: 'sketch', category: 'style' },
    { name: 'daylight', category: 'scene' },
    { name: 'portrait', category: 'other' }
  ]

  const tags: Tag[] = keywordTags.map((t, i) => {
    names.add(t.name)
    return {
      id: `tag-${String(i + 1).padStart(3, '0')}`,
      name: t.name,
      category: t.category,
      aliases: [],
      count: 4 + Math.floor(rand() * 78),
      blacklisted: ['lowres', 'jpeg artifacts', 'blurry', 'watermark'].includes(t.name),
      origin: rand() > 0.35 ? 'model' : 'manual'
    }
  })

  const pool = tags.map((t) => t.name)
  for (const image of images) {
    const n = 3 + Math.floor(rand() * 6)
    image.tags = pickMany(rand, pool, n, n)
  }

  const counted = new Map<string, number>()
  for (const image of images) {
    for (const t of image.tags) counted.set(t, (counted.get(t) ?? 0) + 1)
  }
  for (const tag of tags) {
    tag.count = counted.get(tag.name) ?? 0
  }

  return tags
}

function buildDatasets(images: ImageMeta[]): Dataset[] {
  return DATASET_SEEDS.map((seed, i) => {
    const own = images.filter((img) => img.datasetId === seed.id)
    return {
      id: seed.id,
      name: seed.name,
      path: seed.path,
      imageCount: own.length,
      taggedCount: own.filter((img) => img.tags.length > 0).length,
      updatedAt: Date.now() - (i + 1) * 3.5 * 24 * 3600 * 1000,
      coverIds: own.slice(0, 4).map((img) => img.id)
    }
  })
}

function buildJobs(images: ImageMeta[]): TagJob[] {
  const done = images.slice(0, 24)
  const running = images.slice(24, 60)
  const failedId = images[44]?.id

  return [
    {
      id: 'job-1',
      name: '赛博朋克场景 · 批量打标',
      status: 'running',
      done: 18,
      failed: 1,
      createdAt: Date.now() - 12 * 60 * 1000,
      items: running.map((img, i) => ({
        imageId: img.id,
        status: i < 18 ? 'done' : i === 18 ? 'running' : 'queued',
        tags: i < 18 ? img.tags.slice(0, 5) : undefined,
        ms: i < 18 ? 900 + Math.floor(Math.random() * 1400) : undefined
      }))
    },
    {
      id: 'job-2',
      name: '水彩风格测试 · 全量打标',
      status: 'done',
      done: done.length - 1,
      failed: 1,
      createdAt: Date.now() - 2 * 24 * 3600 * 1000,
      items: done.map((img, i) => ({
        imageId: img.id,
        status: img.id === failedId ? 'error' : 'done',
        tags: img.id === failedId ? undefined : img.tags.slice(0, 5),
        error: img.id === failedId ? '请求超时（30s），已重试 3 次' : undefined,
        ms: img.id === failedId ? 30000 : 800 + Math.floor(Math.random() * 1600)
      }))
    }
  ]
}

export const MOCK_IMAGES: ImageMeta[] = buildImages()
export const MOCK_TAGS: Tag[] = buildTags(MOCK_IMAGES)
export const MOCK_DATASETS: Dataset[] = buildDatasets(MOCK_IMAGES)
export const MOCK_JOBS: TagJob[] = buildJobs(MOCK_IMAGES)

export const IMAGE_BY_ID = new Map(MOCK_IMAGES.map((img) => [img.id, img]))

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

export const ALL_TAG_CATEGORIES = TAG_CATEGORIES

export const MOCK_MODELS = CHECKPOINTS

export const MOCK_PROMPT_TEMPLATE = `你是图像数据集标注助手。请只输出 JSON，不要任何解释。

观察图片，按以下类别给出标签：
- person：人物特征（发色、瞳色、服装、人数）
- style：画风与光影
- scene：场景与环境
- quality：画质相关

约束：
- 优先使用受控词表，词表外的新标签最多 3 个
- 每个标签使用英文小写，多词用空格分隔
- 不要输出敏感或不当内容

输出格式：
{"person": [], "style": [], "scene": [], "quality": []}`
