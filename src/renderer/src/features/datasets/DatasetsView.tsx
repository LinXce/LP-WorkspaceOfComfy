import { useEffect, useMemo, useState } from 'react'
import { FolderPlus, RefreshCw } from 'lucide-react'
import { MOCK_DATASETS, MOCK_IMAGES } from '@renderer/lib/mock'
import { useWorkspace } from '@renderer/lib/store'
import { cn, formatRelativeTime } from '@renderer/lib/utils'
import { Button } from '@renderer/components/Button'
import { Badge, ProgressBar } from '@renderer/components/primitives'
import { SearchInput, Select } from '@renderer/components/fields'
import {
  StatePreviewSwitch,
  ToolbarCount,
  ToolbarSeparator,
  ViewToolbar
} from '@renderer/components/ViewToolbar'
import { EmptyState, ErrorState } from '@renderer/components/states'
import { ImageGrid } from '../images/ImageGrid'
import { GridSkeleton, ScanStatus } from '../images/GridSkeleton'

const SORT_OPTIONS = [
  { value: 'mtime-desc', label: '最近修改' },
  { value: 'name-asc', label: '文件名 A→Z' },
  { value: 'rating-desc', label: '评分最高' }
]

function DatasetCard({
  name,
  path,
  imageCount,
  taggedCount,
  updatedAt,
  active,
  onSelect
}: {
  name: string
  path: string
  imageCount: number
  taggedCount: number
  updatedAt: number
  active: boolean
  onSelect: () => void
}): React.JSX.Element {
  const complete = imageCount > 0 && taggedCount === imageCount

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={active}
      className={cn(
        't-fast flex w-[232px] shrink-0 flex-col gap-1.5 rounded-panel border p-2.5 text-left',
        active
          ? 'border-accent bg-accent-soft'
          : 'border-line bg-surface hover:border-line-strong hover:bg-hover'
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="min-w-0 truncate text-xs font-medium text-ink">{name}</span>
        {active ? <Badge tone="accent">当前</Badge> : null}
      </div>
      <p className="truncate font-mono text-[10px] text-ink-faint" title={path}>
        {path}
      </p>
      <div className="mt-1 flex items-center gap-2">
        <ProgressBar
          value={taggedCount}
          max={imageCount}
          tone={complete ? 'signal' : 'accent'}
          label={`${name} 打标进度`}
          className="min-w-0 flex-1"
        />
        <span className="num shrink-0 text-[10px] text-ink-muted">
          {taggedCount}/{imageCount}
        </span>
      </div>
      <p className="text-[10px] text-ink-faint">更新于 {formatRelativeTime(updatedAt)}</p>
    </button>
  )
}

export function DatasetsView(): React.JSX.Element {
  const previewState = useWorkspace((s) => s.previewState)
  const activeDatasetId = useWorkspace((s) => s.activeDatasetId)
  const setActiveDatasetId = useWorkspace((s) => s.setActiveDatasetId)
  const tileSize = useWorkspace((s) => s.tileSize)
  const setVisibleIds = useWorkspace((s) => s.setVisibleIds)
  const clearSelection = useWorkspace((s) => s.clearSelection)
  const pushToast = useWorkspace((s) => s.pushToast)
  const selectedIds = useWorkspace((s) => s.selectedIds)

  const [query, setQuery] = useState('')
  const [sort, setSort] = useState('mtime-desc')
  const [scanning, setScanning] = useState(false)

  const images = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = MOCK_IMAGES.filter((image) => image.datasetId === activeDatasetId).filter(
      (image) => !q || image.fileName.toLowerCase().includes(q)
    )
    const sorted = [...list]
    if (sort === 'name-asc') sorted.sort((a, b) => a.fileName.localeCompare(b.fileName))
    else if (sort === 'rating-desc') sorted.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
    else sorted.sort((a, b) => b.mtime - a.mtime)
    return sorted
  }, [activeDatasetId, query, sort])

  useEffect(() => {
    setVisibleIds(images.map((image) => image.id))
  }, [images, setVisibleIds])

  useEffect(() => {
    clearSelection()
  }, [activeDatasetId, clearSelection])

  const startScan = (): void => {
    setScanning(true)
    pushToast({ tone: 'info', title: '开始扫描目录', description: '增量扫描，只处理新增或变更的文件。' })
    window.setTimeout(() => setScanning(false), 2600)
  }

  const emptyDatasets = MOCK_DATASETS.length === 0

  return (
    <div className="relative flex h-full min-h-0 flex-col">
      <ViewToolbar
        actions={
          <>
            <Button size="sm" variant="secondary" onClick={startScan} disabled={scanning}>
              <RefreshCw size={13} className={cn(scanning && 'animate-spin')} />
              {scanning ? '扫描中' : '重新扫描'}
            </Button>
            <Button
              size="sm"
              variant="primary"
              onClick={() =>
                pushToast({
                  tone: 'info',
                  title: '添加数据集',
                  description: '选择要纳入管理的文件夹。'
                })
              }
            >
              <FolderPlus size={13} />
              添加数据集
            </Button>
            <ToolbarSeparator />
            <ToolbarCount>{images.length} 张</ToolbarCount>
            <ToolbarSeparator />
            <StatePreviewSwitch />
          </>
        }
      >
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="在数据集内搜索文件名"
          className="w-[220px]"
        />
        <Select
          ariaLabel="排序方式"
          value={sort}
          onChange={setSort}
          options={SORT_OPTIONS}
          className="w-[118px]"
        />
      </ViewToolbar>

      {previewState === 'ready' && !emptyDatasets ? (
        <div className="shrink-0 border-b border-line bg-canvas px-3 py-2.5">
          <div className="mb-2 flex items-center justify-between gap-3">
            <h2 className="text-2xs font-medium text-ink-muted">数据集</h2>
            <span className="num text-2xs text-ink-faint">{MOCK_DATASETS.length} 个</span>
          </div>
          <div className="flex gap-2.5 overflow-x-auto pb-1">
            {MOCK_DATASETS.map((dataset) => (
              <DatasetCard
                key={dataset.id}
                name={dataset.name}
                path={dataset.path}
                imageCount={dataset.imageCount}
                taggedCount={dataset.taggedCount}
                updatedAt={dataset.updatedAt}
                active={dataset.id === activeDatasetId}
                onSelect={() => setActiveDatasetId(dataset.id)}
              />
            ))}
          </div>
        </div>
      ) : null}

      <div className="min-h-0 flex-1">
        {previewState === 'loading' || scanning ? (
          <div className="flex h-full flex-col">
            <ScanStatus
              label={scanning ? '正在增量扫描数据集…' : '正在载入数据集…'}
              detail="已扫描 128 / 340 个文件"
            />
            <div className="min-h-0 flex-1 overflow-hidden">
              <GridSkeleton tileSize={tileSize} />
            </div>
          </div>
        ) : previewState === 'error' ? (
          <ErrorState
            title="数据集目录不可用"
            description="D:\ComfyUI\datasets\watercolor-test 已被移动或删除。可以重新指定路径，或把这个数据集从列表移除。"
            onRetry={startScan}
          />
        ) : emptyDatasets || previewState === 'empty' ? (
          <EmptyState
            title={emptyDatasets ? '还没有数据集' : '这个数据集是空的'}
            description="数据集就是一个图片文件夹。添加后可以批量打标、按标签筛选，并导出训练用的标签文件。"
            action={
              <Button variant="primary" onClick={startScan}>
                <FolderPlus size={14} />
                添加数据集文件夹
              </Button>
            }
          />
        ) : images.length === 0 ? (
          <EmptyState
            title="没有匹配的图片"
            description="当前数据集里没有文件名符合这个关键词的图片。"
            action={
              <Button variant="secondary" onClick={() => setQuery('')}>
                清除搜索
              </Button>
            }
          />
        ) : (
          <ImageGrid images={images} tileSize={tileSize} />
        )}
      </div>

      {selectedIds.length > 0 ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-3 z-30 flex justify-center px-4">
          <div className="pointer-events-auto flex items-center gap-2 rounded-panel border border-line-strong bg-elevated px-3 py-2 text-xs shadow-[var(--shadow-pop)]">
            <span className="num rounded-pill bg-accent-soft px-2 py-0.5 text-2xs font-semibold text-accent">
              {selectedIds.length} 项
            </span>
            <span className="text-ink-muted">已选中</span>
            <Button size="sm" variant="ghost" onClick={clearSelection}>
              取消选择
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
