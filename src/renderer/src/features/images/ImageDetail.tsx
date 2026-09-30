import { useEffect, useMemo, useState } from 'react'
import { Check, Copy, FileText, Loader2, Sparkles } from 'lucide-react'
import type { ImageMeta, RawMetadata } from '@shared/types'
import { useWorkspace } from '@renderer/lib/store'
import { SOURCE_LABEL } from '@renderer/lib/catalog'
import { copyText } from '@renderer/lib/clipboard'
import { cn, formatBytes, formatRelativeTime } from '@renderer/lib/utils'
import { Thumbnail } from '@renderer/components/Thumbnail'
import { TagPill } from '@renderer/components/TagPill'
import { IconButton } from '@renderer/components/IconButton'
import { Badge } from '@renderer/components/primitives'
import { InspectorGroup } from '@renderer/components/Panel'
import { Segmented } from '@renderer/components/fields'
import { PromptBlock } from './PromptBlock'

type RawTab = 'prompt' | 'workflow' | 'parameters'

export function ImageDetail({ image }: { image: ImageMeta }): React.JSX.Element {
  const pushToast = useWorkspace((s) => s.pushToast)
  const loadRawMetadata = useWorkspace((s) => s.loadRawMetadata)
  const [raw, setRaw] = useState<RawMetadata | null>(null)
  const [loadingRaw, setLoadingRaw] = useState(true)
  const [rawTab, setRawTab] = useState<RawTab>('prompt')
  const [copiedAll, setCopiedAll] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoadingRaw(true)
    setRaw(null)
    void loadRawMetadata(image.id).then((result) => {
      if (cancelled) return
      setRaw(result)
      setLoadingRaw(false)
      if (result && !result.prompt && !result.workflow && result.parameters) {
        setRawTab('parameters')
      } else {
        setRawTab('prompt')
      }
    })
    return () => {
      cancelled = true
    }
  }, [image.id, loadRawMetadata])

  const tabs = useMemo(() => {
    if (!raw) return []
    const available: { value: RawTab; label: string }[] = []
    if (raw.prompt) available.push({ value: 'prompt', label: 'prompt' })
    if (raw.workflow) available.push({ value: 'workflow', label: 'workflow' })
    if (raw.parameters) available.push({ value: 'parameters', label: 'parameters' })
    return available
  }, [raw])

  const rawText = useMemo(() => {
    if (!raw) return null
    if (rawTab === 'parameters') return raw.parameters
    const value = rawTab === 'prompt' ? raw.prompt : raw.workflow
    return value ? JSON.stringify(value, null, 2) : null
  }, [raw, rawTab])

  const copyMetadata = async (): Promise<void> => {
    const payload = [
      `# ${image.fileName}`,
      `路径: ${image.path}`,
      `尺寸: ${image.width}x${image.height}`,
      `来源: ${SOURCE_LABEL[image.source]}`,
      `模型: ${image.checkpoint ?? '—'}`,
      image.loras.length
        ? `LoRA: ${image.loras.map((lora) => `${lora.name}@${lora.weight}`).join(', ')}`
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
        <Thumbnail imageId={image.id} alt={image.fileName} className="object-contain" />
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
            <span className="text-2xs text-ink-faint">标签来源</span>
            <span className="text-xs text-ink">
              {image.sidecarTags.length > 0
                ? `旁车 .txt · ${image.sidecarTags.length}`
                : image.modelTags.length > 0
                  ? `模型生成 · ${image.modelTags.length}`
                  : '无'}
            </span>
          </div>
        </div>
      </InspectorGroup>

      <InspectorGroup title={`标签 · ${image.tags.length}`}>
        {image.tags.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {image.tags.map((name) => (
              <TagPill
                key={name}
                name={name}
                category={image.modelTags.includes(name) ? 'style' : 'other'}
              />
            ))}
          </div>
        ) : (
          <p className="rounded-control border border-dashed border-line-soft px-2 py-2 text-2xs leading-[1.6] text-ink-faint">
            还没有标签。到「打标工作台」可以让模型根据画面生成，然后导出成旁车 <span className="font-mono">.txt</span>。
          </p>
        )}
      </InspectorGroup>

      {image.caption ? (
        <InspectorGroup title="图片描述">
          <p className="rounded-control border border-line-soft bg-inset px-2.5 py-2 text-[11.5px] leading-[1.7] text-ink-soft">
            {image.caption}
          </p>
        </InspectorGroup>
      ) : null}

      {image.source === 'none' ? (
        <InspectorGroup title="元数据缺失" tone="accent">
          <div className="flex flex-col gap-2 rounded-control border border-warning/35 bg-warning-soft p-2.5">
            <p className="text-2xs leading-[1.6] text-ink-soft">
              这个文件的头部没有嵌入 ComfyUI / A1111 / NovelAI 的元数据，可能出图时关闭了写入，或者图片被二次压缩过。
            </p>
            <button
              type="button"
              onClick={() => pushToast({ tone: 'info', title: '打标功能尚未接入' })}
              className="t-fast flex items-center justify-center gap-1.5 rounded-control border border-line bg-card py-1.5 text-2xs text-ink hover:bg-hover"
            >
              <Sparkles size={12} />
              接入后可用大模型反推提示词
            </button>
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
          <div className="flex flex-col gap-0.5">
            <span className="text-2xs text-ink-faint">Checkpoint</span>
            <span className="break-all font-mono text-[11px] text-ink-soft">
              {image.checkpoint ?? '—'}
            </span>
          </div>
          <div>
            <div className="mb-1 flex items-center justify-between">
              <span className="text-2xs text-ink-faint">LoRA · {image.loras.length}</span>
            </div>
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
          tabs.length > 1 ? (
            <Segmented
              ariaLabel="原始元数据来源"
              value={rawTab}
              onChange={(value) => setRawTab(value as RawTab)}
              items={tabs}
            />
          ) : null
        }
      >
        {loadingRaw ? (
          <p className="flex items-center gap-1.5 text-2xs text-ink-faint">
            <Loader2 size={12} className="animate-spin" />
            正在读取文件头…
          </p>
        ) : rawText ? (
          <pre className="max-h-64 overflow-auto rounded-control border border-line-soft bg-inset p-2 font-mono text-[10.5px] leading-[1.6] text-ink-muted">
            {rawText}
          </pre>
        ) : (
          <p className="flex items-center gap-1.5 rounded-control border border-dashed border-line-soft px-2 py-2 text-2xs text-ink-faint">
            <FileText size={12} />
            这个文件没有可解析的嵌入数据块。
          </p>
        )}
      </InspectorGroup>
    </div>
  )
}
