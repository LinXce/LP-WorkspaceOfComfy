import { useEffect, useMemo, useState } from 'react'
import { FolderPlus, RefreshCw, Trash2 } from 'lucide-react'
import { useWorkspace } from '@renderer/lib/store'
import { cn, formatRelativeTime } from '@renderer/lib/utils'
import { Button } from '@renderer/components/Button'
import { Badge, ProgressBar } from '@renderer/components/primitives'
import { SearchInput, Select } from '@renderer/components/fields'
import { ToolbarCount, ToolbarSeparator, ViewToolbar } from '@renderer/components/ViewToolbar'
import { EmptyState, ErrorState } from '@renderer/components/states'
import { ImageGrid } from '../images/ImageGrid'
import { GridSkeleton, ScanStatus } from '../images/GridSkeleton'

const SORT_OPTIONS = [
  { value: 'mtime-desc', label: '最近修改' },
  { value: 'name-asc', label: '文件名 A→Z' }
]

export function DatasetsView(): React.JSX.Element {
  const status = useWorkspace((s) => s.status)
  const error = useWorkspace((s) => s.error)
  const datasets = useWorkspace((s) => s.datasets)
  const images = useWorkspace((s) => s.images)
  const scan = useWorkspace((s) => s.scan)
  const refresh = useWorkspace((s) => s.refresh)
  const addDataset = useWorkspace((s) => s.addDataset)
  const rescanDataset = useWorkspace((s) => s.rescanDataset)
  const removeDataset = useWorkspace((s) => s.removeDataset)
  const activeDatasetId = useWorkspace((s) => s.activeDatasetId)
  const setActiveDatasetId = useWorkspace((s) => s.setActiveDatasetId)
  const tileSize = useWorkspace((s) => s.tileSize)
  const setVisibleIds = useWorkspace((s) => s.setVisibleIds)

  const [query, setQuery] = useState('')
  const [sort, setSort] = useState('mtime-desc')

  const active = datasets.find((dataset) => dataset.id === activeDatasetId)

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = images
      .filter((image) => image.datasetId === activeDatasetId)
      .filter((image) => !q || image.fileName.toLowerCase().includes(q))
    const sorted = [...list]
    if (sort === 'name-asc') sorted.sort((a, b) => a.fileName.localeCompare(b.fileName))
    else sorted.sort((a, b) => b.mtime - a.mtime)
    return sorted
  }, [images, activeDatasetId, query, sort])

  useEffect(() => {
    setVisibleIds(visible.map((image) => image.id))
  }, [visible, setVisibleIds])

  const scanning = scan !== null && scan.phase !== 'done'

  return (
    <div className="flex h-full min-h-0 flex-col">
      <ViewToolbar
        actions={
          <>
            <Button
              size="sm"
              variant="secondary"
              disabled={!active || scanning}
              onClick={() => active && void rescanDataset(active.id)}
            >
              <RefreshCw size={13} className={cn(scanning && 'animate-spin')} />
              重新扫描
            </Button>
            <Button size="sm" variant="primary" disabled={scanning} onClick={() => void addDataset()}>
              <FolderPlus size={13} />
              添加数据集
            </Button>
            <ToolbarSeparator />
            <ToolbarCount>{visible.length} 张</ToolbarCount>
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

      {status !== 'loading' && datasets.length > 0 ? (
        <div className="shrink-0 border-b border-line-soft bg-canvas px-3 py-2.5">
          <div className="mb-2 flex items-center justify-between gap-3">
            <h2 className="text-2xs font-medium text-ink-muted">数据集</h2>
            <span className="num text-2xs text-ink-faint">{datasets.length} 个</span>
          </div>
          <div className="flex gap-2.5 overflow-x-auto pb-1">
            {datasets.map((dataset) => {
              const isActive = dataset.id === activeDatasetId
              const complete = dataset.imageCount > 0 && dataset.taggedCount === dataset.imageCount
              return (
                <div
                  key={dataset.id}
                  className={cn(
                    't-fast glass flex w-[232px] shrink-0 flex-col gap-1.5 rounded-panel p-2.5',
                    isActive ? 'glass-accent bg-accent-soft' : 'bg-card hover:bg-hover'
                  )}
                >
                  <button
                    type="button"
                    onClick={() => setActiveDatasetId(dataset.id)}
                    className="flex items-center justify-between gap-2 text-left"
                  >
                    <span className="min-w-0 truncate text-xs font-medium text-ink">
                      {dataset.name}
                    </span>
                    {isActive ? <Badge tone="accent">当前</Badge> : null}
                  </button>
                  <p className="truncate font-mono text-[10px] text-ink-faint" title={dataset.path}>
                    {dataset.path}
                  </p>
                  <div className="mt-1 flex items-center gap-2">
                    <ProgressBar
                      value={dataset.taggedCount}
                      max={Math.max(dataset.imageCount, 1)}
                      tone={complete ? 'signal' : 'accent'}
                      label={`${dataset.name} 打标进度`}
                      className="min-w-0 flex-1"
                    />
                    <span className="num shrink-0 text-[10px] text-ink-muted">
                      {dataset.taggedCount}/{dataset.imageCount}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] text-ink-faint">
                      {formatRelativeTime(dataset.updatedAt)}
                    </span>
                    <button
                      type="button"
                      aria-label={`移除 ${dataset.name}`}
                      onClick={() => void removeDataset(dataset.id)}
                      className="t-fast rounded-xs p-0.5 text-ink-faint hover:bg-danger-soft hover:text-danger"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ) : null}

      <div className="min-h-0 flex-1">
        {status === 'loading' ? (
          <div className="flex h-full flex-col">
            <ScanStatus label="正在读取本地数据…" />
            <div className="min-h-0 flex-1 overflow-hidden">
              <GridSkeleton tileSize={tileSize} />
            </div>
          </div>
        ) : status === 'error' ? (
          <ErrorState
            title="读取本地数据失败"
            description={error ?? '无法读取工作台数据。'}
            onRetry={() => void refresh()}
          />
        ) : scanning ? (
          <div className="flex h-full flex-col">
            <ScanStatus
              label={`正在扫描「${scan.datasetName}」`}
              detail={`已处理 ${scan.current} / ${scan.total || '…'} 个文件`}
            />
            <div className="min-h-0 flex-1 overflow-hidden">
              <GridSkeleton tileSize={tileSize} />
            </div>
          </div>
        ) : datasets.length === 0 ? (
          <EmptyState
            title="还没有数据集"
            description="数据集就是一个装着图片的文件夹。添加后可以按文件夹浏览、解析元数据，并在接入打标后批量生成标签。"
            action={
              <Button variant="primary" onClick={() => void addDataset()}>
                <FolderPlus size={14} />
                选择文件夹
              </Button>
            }
          />
        ) : visible.length === 0 ? (
          <EmptyState
            title={query ? '没有匹配的图片' : '这个数据集里没有图片'}
            description={
              query
                ? '当前数据集里没有文件名符合这个关键词的图片。'
                : '目录里没有找到 png / jpg / webp 文件。'
            }
            action={
              query ? (
                <Button variant="secondary" onClick={() => setQuery('')}>
                  清除搜索
                </Button>
              ) : (
                <Button variant="secondary" onClick={() => active && void rescanDataset(active.id)}>
                  <RefreshCw size={13} />
                  重新扫描
                </Button>
              )
            }
          />
        ) : (
          <ImageGrid images={visible} tileSize={tileSize} />
        )}
      </div>
    </div>
  )
}
