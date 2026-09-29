import { useMemo, useState } from 'react'
import { Check, Copy, FilePlus2, FileWarning, Plus, Sparkles } from 'lucide-react'
import type { ImageMeta, TagCategory } from '@shared/types'
import { useImageTags, useWorkspace } from '@renderer/lib/store'
import { MOCK_TAGS } from '@renderer/lib/mock'
import { buildRawPrompt, buildRawWorkflow } from '@renderer/lib/rawPrompt'
import { copyText } from '@renderer/lib/clipboard'
import { cn, formatBytes, formatRelativeTime } from '@renderer/lib/utils'
import { MockArtwork } from '@renderer/components/MockArtwork'
import { TagPill } from '@renderer/components/TagPill'
import { IconButton } from '@renderer/components/IconButton'
import { Badge, SectionLabel } from '@renderer/components/primitives'
import { InspectorGroup } from '@renderer/components/Panel'
import { Button } from '@renderer/components/Button'
import { Segmented } from '@renderer/components/fields'
import { PromptBlock } from './PromptBlock'

const CATEGORY_BY_NAME = new Map<string, TagCategory>(
  MOCK_TAGS.map((tag) => [tag.name, tag.category])
)

function categoryOf(name: string): TagCategory {
  return CATEGORY_BY_NAME.get(name) ?? 'other'
}

const SOURCE_LABEL: Record<ImageMeta['source'], string> = {
  comfyui: 'ComfyUI 节点图',
  a1111: 'A1111 parameters',
  novelai: 'NovelAI 注释',
  exif: 'EXIF / XMP',
  none: '无嵌入元数据'
}

export function ImageDetail({ image }: { image: ImageMeta }): React.JSX.Element {
  const tags = useImageTags(image.id, image.tags)
  const setImageTags = useWorkspace((s) => s.setImageTags)
  const pushToast = useWorkspace((s) => s.pushToast)
  const [draft, setDraft] = useState('')
  const [rawTab, setRawTab] = useState('prompt')
  const [copiedAll, setCopiedAll] = useState(false)

  const rawPrompt = useMemo(() => buildRawPrompt(image), [image])
  const rawWorkflow = useMemo(() => buildRawWorkflow(image), [image])
  const rawValue = rawTab === 'prompt' ? rawPrompt : rawWorkflow

  const addTag = (): void => {
    const value = draft.trim().toLowerCase()
    if (!value) return
    if (tags.includes(value)) {
      pushToast({ tone: 'warning', title: '标签已存在', description: value })
      setDraft('')
      return
    }
    setImageTags(image.id, [...tags, value])
    setDraft('')
  }

  const copyMetadata = async (): Promise<void> => {
    const payload = [
      `# ${image.fileName}`,
      `尺寸: ${image.width}x${image.height}`,
      `模型: ${image.checkpoint ?? '—'}`,
      image.loras.length
        ? `LoRA: ${image.loras.map((l) => `${l.name}@${l.weight}`).join(', ')}`
        : null,
      '',
      image.positive ?? '',
      '',
      `Negative: ${image.negative ?? ''}`
    ]
      .filter((line) => line !== null)
      .join('\n')
    const ok = await copyText(payload)
    if (ok) {
      setCopiedAll(true)
      window.setTimeout(() => setCopiedAll(false), 1400)
    }
  }

  return (
    <div className="flex flex-col">
      <div className="relative h-[200px] w-full shrink-0 border-b border-line-soft bg-inset">
        <MockArtwork seed={image.id} />
        <span className="absolute bottom-2 left-2">
          <Badge tone={image.source === 'none' ? 'warning' : 'accent'}>
            {SOURCE_LABEL[image.source]}
          </Badge>
        </span>
      </div>

      <InspectorGroup
        title="文件"
        actions={
          <IconButton size="sm" aria-label="复制元数据" onClick={copyMetadata}>
            {copiedAll ? <Check size={13} className="text-signal" /> : <Copy size={13} />}
          </IconButton>
        }
      >
        <p className="mb-1.5 break-all font-mono text-[11px] leading-[1.5] text-ink-soft">
          {image.path}
        </p>
        <div className="grid grid-cols-2 gap-x-3">
          <div className="flex flex-col gap-0.5">
            <span className="text-2xs text-ink-faint">尺寸</span>
            <span className="num text-xs text-ink">
              {image.width} × {image.height}
            </span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-2xs text-ink-faint">文件大小</span>
            <span className="num text-xs text-ink">{formatBytes(image.sizeBytes)}</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-2xs text-ink-faint">修改时间</span>
            <span className="text-xs text-ink">{formatRelativeTime(image.mtime)}</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-2xs text-ink-faint">评分</span>
            <span className="num text-xs text-ink">
              {image.rating ? `${image.rating} / 5` : '未评分'}
            </span>
          </div>
        </div>
      </InspectorGroup>

      <InspectorGroup
        title={`标签 · ${tags.length}`}
        actions={
          <IconButton
            size="sm"
            aria-label="用大模型生成标签"
            onClick={() =>
              pushToast({
                tone: 'info',
                title: '加入打标队列',
                description: `${image.fileName} 已加入待打标队列。`,
              })
            }
          >
            <Sparkles size={13} />
          </IconButton>
        }
      >
        {tags.length > 0 ? (
          <div className="mb-2 flex flex-wrap gap-1">
            {tags.map((name) => (
              <TagPill
                key={name}
                name={name}
                category={categoryOf(name)}
                onRemove={() => setImageTags(image.id, tags.filter((t) => t !== name))}
              />
            ))}
          </div>
        ) : (
          <p className="mb-2 text-2xs text-ink-faint">这张图还没有标签。</p>
        )}

        <div className="field flex h-7 items-center gap-1.5 px-2">
          <Plus size={12} className="shrink-0 text-ink-faint" />
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') addTag()
            }}
            placeholder="添加标签后回车"
            aria-label="添加标签"
            className="h-full min-w-0 flex-1 bg-transparent text-xs outline-none placeholder:text-ink-faint"
          />
        </div>
      </InspectorGroup>

      {image.source === 'none' ? (
        <InspectorGroup title="元数据缺失" tone="accent">
          <div className="flex flex-col gap-2 rounded-control border border-warning/35 bg-warning-soft p-2.5">
            <div className="flex items-start gap-2">
              <FileWarning size={14} className="mt-px shrink-0 text-warning" />
              <p className="text-2xs leading-[1.6] text-ink-soft">
                这个 PNG 里没有嵌入 ComfyUI / A1111 的元数据块。可能出图时关闭了写入，或图片被二次压缩过。
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <Button
                size="sm"
                variant="secondary"
                onClick={() =>
                  pushToast({
                    tone: 'warning',
                    title: '未找到旁车文件',
                    description: `没有与 ${image.fileName} 同名的 .txt / .json。`
                  })
                }
              >
                <FilePlus2 size={13} />
                读取同名旁车文件
              </Button>
              <Button
                size="sm"
                variant="primary"
                onClick={() =>
                  pushToast({
                    tone: 'info',
                    title: '加入打标队列',
                    description: '用视觉模型反推提示词与标签。'
                  })
                }
              >
                <Sparkles size={13} />
                用大模型生成
              </Button>
            </div>
          </div>
        </InspectorGroup>
      ) : null}

      <InspectorGroup title="正向提示词">
        <PromptBlock text={image.positive} emptyHint="没有解析到正向提示词" />
      </InspectorGroup>

      <InspectorGroup title="负向提示词">
        <PromptBlock text={image.negative} emptyHint="没有解析到负向提示词" muted />
      </InspectorGroup>

      <InspectorGroup title="模型">
        <div className="flex flex-col gap-2">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-2xs text-ink-faint">Checkpoint</p>
              <p className="break-all font-mono text-[11px] text-ink-soft">
                {image.checkpoint ?? '—'}
              </p>
            </div>
            {image.checkpoint ? (
              <Badge tone="brand" className="shrink-0">
                主模型
              </Badge>
            ) : null}
          </div>

          <div>
            <SectionLabel>LoRA · {image.loras.length}</SectionLabel>
            {image.loras.length > 0 ? (
              <ul className="flex flex-col gap-1">
                {image.loras.map((lora) => (
                  <li
                    key={lora.name}
                    className="flex items-center justify-between gap-2 rounded-control border border-line-soft bg-inset px-2 py-1"
                  >
                    <span className="min-w-0 truncate font-mono text-[11px] text-ink-soft">
                      {lora.name}
                    </span>
                    <span
                      className={cn(
                        'num shrink-0 rounded-pill px-1.5 text-[10px]',
                        lora.weight >= 0.8 ? 'bg-accent-soft text-accent' : 'bg-inset text-ink-muted'
                      )}
                    >
                      {lora.weight.toFixed(2)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-2xs text-ink-faint">未使用 LoRA。</p>
            )}
          </div>
        </div>
      </InspectorGroup>

      <InspectorGroup title="采样参数">
        <div className="grid grid-cols-2 gap-x-3">
          {[
            { label: 'Sampler', value: image.sampler ?? '—' },
            { label: 'Scheduler', value: image.scheduler ?? '—' },
            { label: 'Steps', value: image.steps ?? '—' },
            { label: 'CFG', value: image.cfg ?? '—' },
            { label: 'Seed', value: image.seed ?? '—' },
            { label: 'Clip skip', value: image.clipSkip ?? '—' }
          ].map((item) => (
            <div key={item.label} className="flex items-baseline justify-between gap-2 py-1">
              <span className="text-2xs text-ink-faint">{item.label}</span>
              <span className="num truncate text-xs text-ink-soft">{item.value}</span>
            </div>
          ))}
        </div>
      </InspectorGroup>

      <InspectorGroup
        title="原始元数据"
        actions={
          <Segmented
            ariaLabel="原始元数据来源"
            value={rawTab}
            onChange={setRawTab}
            items={[
              { value: 'prompt', label: 'prompt' },
              { value: 'workflow', label: 'workflow' }
            ]}
          />
        }
      >
        {rawValue ? (
          <pre className="max-h-64 overflow-auto rounded-control border border-line-soft bg-inset p-2 font-mono text-[10.5px] leading-[1.6] text-ink-muted">
            {JSON.stringify(rawValue, null, 2)}
          </pre>
        ) : (
          <p className="rounded-control border border-dashed border-line-soft px-2 py-2 text-2xs text-ink-faint">
            这张图没有可解析的 {rawTab} 数据块。
          </p>
        )}
      </InspectorGroup>
    </div>
  )
}
