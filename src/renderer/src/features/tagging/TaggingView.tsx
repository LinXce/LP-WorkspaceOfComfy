import { useMemo } from 'react'
import {
  Ban,
  Download,
  FolderOpen,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
  Square,
  Undo2
} from 'lucide-react'
import type { OutputFormat } from '@shared/types'
import { TEMPLATE_BY_MODE } from '@shared/defaults'
import { useWorkspace, type TaggingTab } from '@renderer/lib/store'
import { OUTPUT_FORMAT_OPTIONS, modelOptionsFor } from '@renderer/lib/catalog'
import { cn, formatCount } from '@renderer/lib/utils'
import { Button } from '@renderer/components/Button'
import { Badge, ProgressBar } from '@renderer/components/primitives'
import { Segmented, Select, Slider } from '@renderer/components/fields'
import { Thumbnail } from '@renderer/components/Thumbnail'
import { TagPill } from '@renderer/components/TagPill'
import { Tooltip } from '@renderer/components/Tooltip'
import { ToolbarSeparator, ViewToolbar } from '@renderer/components/ViewToolbar'
import { EmptyState } from '@renderer/components/states'
import { ManualTagger } from './ManualTagger'

const DATASET_ALL = 'all'

function Metric({
  label,
  value,
  tone
}: {
  label: string
  value: string | number
  tone?: 'signal' | 'accent' | 'warning'
}): React.JSX.Element {
  const color = tone
    ? { signal: 'text-signal', accent: 'text-accent', warning: 'text-warning' }[tone]
    : 'text-ink'
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] text-ink-faint">{label}</span>
      <span className={cn('num text-[15px] font-semibold leading-5', color)}>{value}</span>
    </div>
  )
}

function TabEmpty({ text }: { text: string }): React.JSX.Element {
  return <li className="px-3 py-8 text-center text-2xs text-ink-faint">{text}</li>
}

export function TaggingView(): React.JSX.Element {
  const images = useWorkspace((s) => s.images)
  const datasets = useWorkspace((s) => s.datasets)
  const settings = useWorkspace((s) => s.settings)
  const updateSettings = useWorkspace((s) => s.updateSettings)
  const activeEndpoint = useWorkspace((s) => s.activeEndpoint)
  const upsertEndpoint = useWorkspace((s) => s.upsertEndpoint)
  const tagging = useWorkspace((s) => s.tagging)
  const tab = useWorkspace((s) => s.taggingTab)
  const setTab = useWorkspace((s) => s.setTaggingTab)
  const filter = useWorkspace((s) => s.taggingDatasetFilter)
  const setFilter = useWorkspace((s) => s.setTaggingDatasetFilter)
  const startTagging = useWorkspace((s) => s.startTagging)
  const pauseTagging = useWorkspace((s) => s.pauseTagging)
  const resumeTagging = useWorkspace((s) => s.resumeTagging)
  const cancelTagging = useWorkspace((s) => s.cancelTagging)
  const requeueImages = useWorkspace((s) => s.requeueImages)
  const exportTags = useWorkspace((s) => s.exportTags)
  const apiReady = useWorkspace((s) => s.apiKey.ready)
  const apiVariable = useWorkspace((s) => s.apiKey.variable)
  const select = useWorkspace((s) => s.select)
  const selectedIds = useWorkspace((s) => s.selectedIds)
  const primaryId = useWorkspace((s) => s.primaryId)
  const setView = useWorkspace((s) => s.setView)
  const scan = useWorkspace((s) => s.scan)

  const scoped = useMemo(
    () => (filter === DATASET_ALL ? images : images.filter((image) => image.datasetId === filter)),
    [images, filter]
  )

  const { pending, finished, uniqueTags } = useMemo(() => {
    const sorted = [...scoped].sort((a, b) => b.mtime - a.mtime)
    const open = sorted.filter((image) => image.tags.length === 0 || image.requeued)
    const closed = sorted.filter((image) => image.tags.length > 0 && !image.requeued)
    const vocabulary = new Set<string>()
    for (const image of sorted) for (const tag of image.tags) vocabulary.add(tag)
    return { pending: open, finished: closed, uniqueTags: vocabulary.size }
  }, [scoped])

  const total = scoped.length
  const coverage = total === 0 ? 0 : Math.round((finished.length / total) * 100)
  const running = tagging.status === 'running'
  const paused = tagging.status === 'paused'
  const busy = running || paused

  const targets = settings.overwrite ? scoped : pending
  const canStart = apiReady && !busy && targets.length > 0

  const startHint = !apiReady
    ? '先在设置里配置端点，或设置 FARO_API_KEY 环境变量'
    : targets.length === 0
      ? settings.overwrite
        ? '当前范围内没有图片'
        : '当前范围内的图片都已经有标签了（可在设置里打开「覆盖已有标签」）'
      : `将对 ${targets.length} 张图片调用 ${activeEndpoint?.model || '（未选模型）'}`

  const changeMode = (mode: OutputFormat): void => {
    const known = Object.values(TEMPLATE_BY_MODE)
    const shouldSwap = known.includes(settings.template.trim())
    updateSettings({
      outputFormat: mode,
      ...(shouldSwap ? { template: TEMPLATE_BY_MODE[mode] } : {})
    })
  }

  const datasetOptions = useMemo(
    () => [
      { value: DATASET_ALL, label: `全部数据集（${images.length}）` },
      ...datasets.map((dataset) => ({
        value: dataset.id,
        label: `${dataset.name}（${dataset.imageCount}）`
      }))
    ],
    [datasets, images.length]
  )

  const activeDataset = datasets.find((dataset) => dataset.id === filter)
  const requeuedCount = pending.filter((image) => image.requeued).length

  const selectionInScope = finished.filter((image) => selectedIds.includes(image.id))

  return (
    <div className="flex h-full min-h-0 flex-col">
      <ViewToolbar
        actions={
          <>
            {busy ? (
              <>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => void (paused ? resumeTagging() : pauseTagging())}
                >
                  <Play size={13} />
                  {paused ? '继续' : '暂停'}
                </Button>
                <Button size="sm" variant="danger" onClick={() => void cancelTagging()}>
                  <Square size={13} />
                  取消
                </Button>
              </>
            ) : (
              <Tooltip side="bottom" label={startHint}>
                <span>
                  <Button
                    variant="signal"
                    size="sm"
                    disabled={!canStart}
                    onClick={() => void startTagging(targets.map((image) => image.id))}
                  >
                    <Sparkles size={13} />
                    开始打标
                  </Button>
                </span>
              </Tooltip>
            )}
            <Button
              size="sm"
              variant="ghost"
              disabled={finished.length === 0}
              onClick={() => void exportTags(filter)}
            >
              <Download size={13} />
              导出标签
            </Button>
            <ToolbarSeparator />
            <Button size="sm" variant="ghost" onClick={() => setView('settings')}>
              打标设置
            </Button>
          </>
        }
      >
        <Select
          ariaLabel="数据集筛选"
          value={filter}
          onChange={setFilter}
          options={datasetOptions}
          className="w-[196px]"
        />
        <ToolbarSeparator />
        <Segmented
          ariaLabel="打标模式"
          value={settings.outputFormat}
          onChange={(value) => changeMode(value as OutputFormat)}
          items={OUTPUT_FORMAT_OPTIONS}
        />
        <ToolbarSeparator />
        <Select
          ariaLabel="打标模型"
          value={activeEndpoint?.model ?? ''}
          onChange={(value) => {
            if (activeEndpoint) void upsertEndpoint({ id: activeEndpoint.id, model: value })
          }}
          options={modelOptionsFor(activeEndpoint)}
          className="w-[168px]"
        />
        <div className="flex w-[124px] shrink-0 items-center gap-2 px-1">
          <span className="shrink-0 text-2xs text-ink-faint">并发</span>
          <Slider
            ariaLabel="并发数"
            min={1}
            max={8}
            value={settings.concurrency}
            onChange={(value) => updateSettings({ concurrency: value })}
          />
          <span className="num w-4 shrink-0 text-2xs text-ink-muted">{settings.concurrency}</span>
        </div>
      </ViewToolbar>

      {images.length === 0 ? (
        <EmptyState
          icon={<Sparkles size={18} />}
          title="还没有可打标的图片"
          description={
            scan && scan.phase !== 'done'
              ? '正在扫描数据集，扫描完成后这里会列出待打标的图片。'
              : '先添加一个图片文件夹，工作台会把没有标签的图片排进队列。'
          }
          action={
            <Button variant="primary" onClick={() => setView('datasets')}>
              <FolderOpen size={14} />
              去添加数据集
            </Button>
          }
        />
      ) : (
        <>
          <div className="shrink-0 border-b border-line-soft bg-canvas px-3 py-2.5">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <Segmented
                  ariaLabel="打标页面"
                  value={tab}
                  onChange={(value) => setTab(value as TaggingTab)}
                  items={[
                    {
                      value: 'pending',
                      label: `准备打标 ${pending.length}`,
                      title: '还没有标签、或被移回队列的图片'
                    },
                    {
                      value: 'finished',
                      label: `已有标签 ${finished.length}`,
                      title: '已经打过标的图片'
                    },
                    {
                      value: 'manual',
                      label: '手动编辑',
                      title: '逐张手动增删标签、改描述'
                    }
                  ]}
                />
                <span className="truncate text-xs text-ink-muted">
                  {activeDataset ? activeDataset.name : '全部数据集'}
                </span>
                <Badge tone={coverage >= 90 ? 'signal' : coverage > 0 ? 'accent' : 'warning'}>
                  {coverage}%
                </Badge>
                {running ? (
                  <Badge tone="signal">打标中 · {tagging.current ?? '准备中'}</Badge>
                ) : paused ? (
                  <Badge tone="warning">已暂停</Badge>
                ) : !apiReady ? (
                  <Badge tone="warning">API 未配置</Badge>
                ) : apiVariable ? (
                  <Badge tone="neutral">密钥 · {apiVariable}</Badge>
                ) : null}
                {requeuedCount > 0 ? (
                  <Badge tone="accent">重新排队 {requeuedCount}</Badge>
                ) : null}
              </div>
              <div className="flex items-center gap-6">
                <Metric label="范围内图片" value={formatCount(total)} />
                <Metric label="已有标签" value={formatCount(finished.length)} tone="signal" />
                <Metric label="待打标" value={formatCount(pending.length)} tone="warning" />
                <Metric label="标签词条" value={formatCount(uniqueTags)} tone="accent" />
              </div>
            </div>
            {busy ? (
              <div className="flex items-center gap-2">
                <ProgressBar
                  value={tagging.done + tagging.failed}
                  max={Math.max(tagging.total, 1)}
                  tone={paused ? 'accent' : 'signal'}
                  className="min-w-0 flex-1"
                  label="打标进度"
                />
                <span className="num shrink-0 text-2xs text-ink-muted">
                  {tagging.done + tagging.failed}/{tagging.total}
                </span>
                {tagging.failed > 0 ? (
                  <span className="num shrink-0 text-2xs text-danger">失败 {tagging.failed}</span>
                ) : null}
              </div>
            ) : (
              <ProgressBar value={finished.length} max={total} tone="signal" label="打标覆盖率" />
            )}
            {tagging.lastError && tagging.failed > 0 ? (
              <p className="mt-1.5 flex items-start gap-1.5 text-[10px] leading-4 text-danger">
                <Ban size={11} className="mt-px shrink-0" />
                <span className="min-w-0 truncate">最近一次失败：{tagging.lastError}</span>
              </p>
            ) : null}
          </div>

          {tab === 'pending' ? (
            <section className="flex min-h-0 flex-1 flex-col">
              <header className="flex h-8 shrink-0 items-center justify-between gap-2 bg-surface px-3">
                <h2 className="text-2xs font-medium text-ink-muted">
                  准备打标
                  <span className="ml-2 font-normal text-ink-faint">
                    没有标签，或被手动移回队列的图片
                  </span>
                </h2>
                <span className="num text-2xs text-ink-faint">{pending.length}</span>
              </header>
              <ul className="min-h-0 flex-1 overflow-y-auto">
                {pending.length === 0 ? (
                  <TabEmpty text="当前范围内的图片都有标签了" />
                ) : (
                  pending.map((image, index) => {
                    const isCurrent = running && tagging.current === image.fileName
                    return (
                      <li key={image.id} className="flex items-center">
                        <button
                          type="button"
                          onClick={() => select(image.id, 'replace')}
                          className={cn(
                            't-fast flex min-w-0 flex-1 items-center gap-2.5 border-b border-line-soft px-3 py-2 text-left hover:bg-hover',
                            primaryId === image.id && 'bg-accent-soft'
                          )}
                        >
                          <span className="num w-6 shrink-0 text-2xs text-ink-faint">
                            {index + 1}
                          </span>
                          <span className="size-9 shrink-0 overflow-hidden rounded-xs border border-line-soft bg-inset">
                            <Thumbnail imageId={image.id} alt={image.fileName} />
                          </span>
                          <span className="min-w-0 flex-1 truncate text-xs text-ink-soft">
                            {image.fileName}
                          </span>
                          {image.tags.length > 0 ? (
                            <span className="hidden shrink-0 text-[10px] text-ink-faint lg:inline">
                              还有 {image.tags.length} 个标签
                            </span>
                          ) : null}
                          <span
                            className={cn(
                              'shrink-0 rounded-pill border px-1.5 py-px text-[10px]',
                              isCurrent
                                ? 'border-accent/40 bg-accent-soft text-accent'
                                : image.requeued
                                  ? 'border-accent/40 bg-accent-soft text-accent'
                                  : 'border-line bg-card text-ink-muted'
                            )}
                          >
                            {isCurrent ? '打标中' : image.requeued ? '重新排队' : '排队中'}
                          </span>
                        </button>
                        {image.requeued ? (
                          <Tooltip side="left" label="撤销：放回已打标">
                            <button
                              type="button"
                              onClick={() => void requeueImages([image.id], false)}
                              className="t-fast mr-3 inline-flex size-7 shrink-0 items-center justify-center rounded-pill text-ink-faint hover:bg-hover hover:text-ink"
                            >
                              <Undo2 size={13} />
                            </button>
                          </Tooltip>
                        ) : null}
                      </li>
                    )
                  })
                )}
              </ul>
            </section>
          ) : tab === 'finished' ? (
            <section className="flex min-h-0 flex-1 flex-col">
              <header className="flex h-8 shrink-0 items-center justify-between gap-2 bg-surface px-3">
                <h2 className="text-2xs font-medium text-ink-muted">
                  {settings.outputFormat === 'nl' ? '已有描述' : '已有标签'}
                  <span className="ml-2 font-normal text-ink-faint">
                    点行选中，右侧按钮把它移回准备打标
                  </span>
                </h2>
                <div className="flex items-center gap-2">
                  {selectionInScope.length > 0 ? (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() =>
                        void requeueImages(
                          selectionInScope.map((image) => image.id),
                          true
                        )
                      }
                    >
                      <RotateCcw size={12} />
                      移回准备打标 {selectionInScope.length}
                    </Button>
                  ) : null}
                  <span className="num text-2xs text-ink-faint">{finished.length}</span>
                </div>
              </header>
              <ul className="min-h-0 flex-1 overflow-y-auto">
                {finished.length === 0 ? (
                  <TabEmpty text="还没有图片带标签" />
                ) : (
                  finished.map((image) => (
                    <li
                      key={image.id}
                      className={cn(
                        't-fast flex items-center gap-3 border-b border-line-soft px-3 py-2 hover:bg-hover',
                        primaryId === image.id && 'bg-accent-soft'
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => select(image.id, 'replace')}
                        className="flex min-w-0 flex-1 items-center gap-3 text-left"
                      >
                        <span className="size-9 shrink-0 overflow-hidden rounded-xs border border-line-soft bg-inset">
                          <Thumbnail imageId={image.id} alt={image.fileName} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-2">
                            <span className="min-w-0 truncate text-xs text-ink-soft">
                              {image.fileName}
                            </span>
                            <span className="shrink-0 text-[10px] text-ink-faint">
                              {image.sidecarTags.length > 0 ? '旁车' : ''}
                              {image.sidecarTags.length > 0 && image.modelTags.length > 0
                                ? ' + '
                                : ''}
                              {image.modelTags.length > 0 ? '模型' : ''}
                              {image.manualTags.length > 0
                                ? `${image.sidecarTags.length + image.modelTags.length > 0 ? ' + ' : ''}手动`
                                : ''}
                            </span>
                          </span>
                          {image.caption ? (
                            <span className="mt-0.5 line-clamp-1 block text-[11px] leading-[1.6] text-ink-muted">
                              {image.caption}
                            </span>
                          ) : null}
                          {image.tags.length > 0 ? (
                            <span className="mt-1 flex flex-wrap gap-1">
                              {image.tags.slice(0, 10).map((name) => (
                                <TagPill key={name} name={name} category="other" size="sm" />
                              ))}
                              {image.tags.length > 10 ? (
                                <span className="self-center text-[10px] text-ink-faint">
                                  +{image.tags.length - 10}
                                </span>
                              ) : null}
                            </span>
                          ) : null}
                        </span>
                      </button>
                      <Tooltip side="left" label="移回准备打标（标签保留）">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="shrink-0"
                          onClick={() => void requeueImages([image.id], true)}
                        >
                          <RotateCcw size={12} />
                          移回
                        </Button>
                      </Tooltip>
                    </li>
                  ))
                )}
              </ul>
            </section>
          ) : (
            <ManualTagger images={scoped} />
          )}
        </>
      )}
    </div>
  )
}
