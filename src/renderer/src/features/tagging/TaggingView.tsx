import { useMemo, useState } from 'react'
import { CircleSlash, Pause, Play, RotateCcw, Sparkles } from 'lucide-react'
import type { JobItemStatus } from '@shared/types'
import { IMAGE_BY_ID, MOCK_JOBS, MOCK_MODELS, MOCK_TAGS } from '@renderer/lib/mock'
import { useWorkspace } from '@renderer/lib/store'
import { cn } from '@renderer/lib/utils'
import { Button } from '@renderer/components/Button'
import { Badge, ProgressBar } from '@renderer/components/primitives'
import { Segmented, Select, Slider } from '@renderer/components/fields'
import { MockArtwork } from '@renderer/components/MockArtwork'
import { TagPill } from '@renderer/components/TagPill'
import { Tooltip } from '@renderer/components/Tooltip'
import {
  StatePreviewSwitch,
  ToolbarSeparator,
  ViewToolbar
} from '@renderer/components/ViewToolbar'
import { EmptyState, ErrorState, LoadingState } from '@renderer/components/states'

const MODEL_OPTIONS = [
  ...MOCK_MODELS.slice(0, 3).map((name) => ({ value: name, label: name.replace('.safetensors', '') })),
  { value: 'gpt-4o-mini', label: 'gpt-4o-mini（视觉）' },
  { value: 'qwen-vl-max', label: 'qwen-vl-max' }
]

const CATEGORY_BY_NAME = new Map(MOCK_TAGS.map((tag) => [tag.name, tag.category]))

const STATUS_META: Record<JobItemStatus, { label: string; className: string }> = {
  queued: { label: '排队中', className: 'border-line bg-elevated text-ink-muted' },
  running: { label: '打标中', className: 'border-accent/40 bg-accent-soft text-accent' },
  done: { label: '已完成', className: 'border-signal/40 bg-signal-soft text-signal' },
  error: { label: '失败', className: 'border-danger/40 bg-danger-soft text-danger' }
}

function Metric({
  label,
  value,
  tone
}: {
  label: string
  value: string | number
  tone?: 'signal' | 'danger' | 'accent'
}): React.JSX.Element {
  const color = tone
    ? { signal: 'text-signal', danger: 'text-danger', accent: 'text-accent' }[tone]
    : 'text-ink'
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] text-ink-faint">{label}</span>
      <span className={cn('num text-[15px] font-semibold leading-5', color)}>{value}</span>
    </div>
  )
}

export function TaggingView(): React.JSX.Element {
  const previewState = useWorkspace((s) => s.previewState)
  const settings = useWorkspace((s) => s.settings)
  const updateSettings = useWorkspace((s) => s.updateSettings)
  const pushToast = useWorkspace((s) => s.pushToast)
  const setView = useWorkspace((s) => s.setView)
  const select = useWorkspace((s) => s.select)
  const primaryId = useWorkspace((s) => s.primaryId)
  const [paused, setPaused] = useState(false)

  const job = MOCK_JOBS[0]
  const queue = useMemo(
    () => job.items.filter((item) => item.status === 'queued' || item.status === 'running'),
    [job]
  )
  const results = useMemo(() => job.items.filter((item) => item.status === 'done'), [job])

  const total = job.items.length
  const apiReady = settings.apiKey.trim().length > 0

  const start = (): void => {
    if (!apiReady) return
    setPaused(false)
    pushToast({
      tone: 'success',
      title: '打标任务已开始',
      description: `使用 ${settings.model}，并发 ${settings.concurrency}。`
    })
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <ViewToolbar
        actions={
          <>
            <Tooltip
              side="bottom"
              label={apiReady ? '对选中或整个数据集开始打标' : '先在设置里填写 Base URL 与 API Key'}
            >
              <span>
                <Button variant="signal" size="sm" disabled={!apiReady} onClick={start}>
                  <Play size={13} />
                  {paused ? '继续打标' : '开始打标'}
                </Button>
              </span>
            </Tooltip>
            <Button
              size="sm"
              variant="secondary"
              disabled={!apiReady}
              onClick={() => setPaused((value) => !value)}
            >
              <Pause size={13} />
              {paused ? '已暂停' : '暂停'}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() =>
                pushToast({ tone: 'info', title: '已重新计时', description: '失败项将重新入队。' })
              }
            >
              <RotateCcw size={13} />
              重试失败项
            </Button>
            <ToolbarSeparator />
            <StatePreviewSwitch />
          </>
        }
      >
        <Select
          ariaLabel="打标模型"
          value={settings.model}
          onChange={(value) => updateSettings({ model: value })}
          options={MODEL_OPTIONS}
          className="w-[172px]"
        />
        <ToolbarSeparator />
        <Segmented
          ariaLabel="输出格式"
          value={settings.outputFormat}
          onChange={(value) =>
            updateSettings({ outputFormat: value as typeof settings.outputFormat })
          }
          items={[
            { value: 'tags', label: '逗号标签' },
            { value: 'caption', label: '自然语言' },
            { value: 'json', label: '分类 JSON' }
          ]}
        />
        <ToolbarSeparator />
        <div className="flex w-[124px] shrink-0 items-center gap-2 px-1">
          <span className="shrink-0 text-2xs text-ink-faint">并发</span>
          <Slider
            ariaLabel="并发数"
            min={1}
            max={12}
            value={settings.concurrency}
            onChange={(value) => updateSettings({ concurrency: value })}
          />
          <span className="num w-4 shrink-0 text-2xs text-ink-muted">{settings.concurrency}</span>
        </div>
      </ViewToolbar>

      {previewState === 'loading' ? (
        <LoadingState
          title="正在准备打标任务…"
          description="压缩图片、拼装提示词，并把受控词表注入到模板里。"
        />
      ) : previewState === 'error' ? (
        <ErrorState
          title="打标任务中断"
          description="连续 3 次请求返回 429（超出速率限制）。任务已保存，可以降低并发后继续，不会重复消耗已经完成的图片。"
          onRetry={start}
        />
      ) : previewState === 'empty' ? (
        <EmptyState
          icon={<Sparkles size={18} />}
          title="还没有待打标的图片"
          description="在数据集里选中图片集合，加入队列后就能用视觉大模型批量生成标签。"
          action={
            <Button variant="primary" onClick={() => setView('datasets')}>
              去数据集选择图片
            </Button>
          }
        />
      ) : (
        <>
          <div className="shrink-0 border-b border-line bg-canvas px-3 py-2.5">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <span className="truncate text-[13px] font-medium text-ink">{job.name}</span>
                <Badge tone={paused ? 'warning' : 'signal'}>
                  {paused ? '已暂停' : '运行中'}
                </Badge>
              </div>
              <div className="flex items-center gap-6">
                <Metric label="总计" value={total} />
                <Metric label="已完成" value={job.done} tone="signal" />
                <Metric label="失败" value={job.failed} tone="danger" />
                <Metric label="剩余" value={Math.max(0, total - job.done - job.failed)} />
                <Metric label="平均耗时" value="1.3s" />
              </div>
            </div>
            <ProgressBar
              value={job.done}
              max={total}
              tone={paused ? 'accent' : 'signal'}
              label="打标总进度"
            />
          </div>

          <div className="flex min-h-0 flex-1">
            <section className="flex min-w-0 flex-1 flex-col border-r border-line">
              <header className="flex h-8 shrink-0 items-center justify-between gap-2 bg-surface px-3">
                <h2 className="text-2xs font-medium text-ink-muted">待打标队列</h2>
                <span className="num text-2xs text-ink-faint">{queue.length}</span>
              </header>
              <ul className="min-h-0 flex-1 overflow-y-auto">
                {queue.length === 0 ? (
                  <li className="px-3 py-6 text-center text-2xs text-ink-faint">队列已清空</li>
                ) : (
                  queue.map((item, index) => {
                    const image = IMAGE_BY_ID.get(item.imageId)
                    if (!image) return null
                    const meta = STATUS_META[item.status]
                    return (
                      <li key={item.imageId}>
                        <button
                          type="button"
                          onClick={() => select(item.imageId, 'replace')}
                          className={cn(
                            't-fast flex w-full items-center gap-2.5 border-b border-line-soft px-3 py-2 text-left hover:bg-hover',
                            primaryId === item.imageId && 'bg-accent-soft'
                          )}
                        >
                          <span className="num w-5 shrink-0 text-2xs text-ink-faint">
                            {index + 1}
                          </span>
                          <span className="size-8 shrink-0 overflow-hidden rounded-xs border border-line-soft">
                            <MockArtwork seed={image.id} />
                          </span>
                          <span className="min-w-0 flex-1 truncate text-xs text-ink-soft">
                            {image.fileName}
                          </span>
                          <span
                            className={cn(
                              'shrink-0 rounded-pill border px-1.5 py-px text-[10px]',
                              meta.className
                            )}
                          >
                            {meta.label}
                          </span>
                        </button>
                      </li>
                    )
                  })
                )}
              </ul>
            </section>

            <section className="flex w-[42%] min-w-[300px] flex-col">
              <header className="flex h-8 shrink-0 items-center justify-between gap-2 bg-surface px-3">
                <h2 className="text-2xs font-medium text-ink-muted">已完成</h2>
                <span className="num text-2xs text-ink-faint">{results.length}</span>
              </header>
              <ul className="min-h-0 flex-1 overflow-y-auto">
                {results.map((item) => {
                  const image = IMAGE_BY_ID.get(item.imageId)
                  if (!image) return null
                  return (
                    <li key={item.imageId} className="border-b border-line-soft px-3 py-2">
                      <div className="flex items-center gap-2">
                        <span className="min-w-0 flex-1 truncate text-xs text-ink-soft">
                          {image.fileName}
                        </span>
                        <span className="num shrink-0 text-[10px] text-ink-faint">
                          {item.ms ? `${(item.ms / 1000).toFixed(1)}s` : ''}
                        </span>
                      </div>
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {(item.tags ?? []).map((name) => (
                          <TagPill key={name} name={name} category={CATEGORY_BY_NAME.get(name) ?? 'other'} size="sm" />
                        ))}
                      </div>
                    </li>
                  )
                })}
              </ul>
            </section>
          </div>
        </>
      )}
    </div>
  )
}
