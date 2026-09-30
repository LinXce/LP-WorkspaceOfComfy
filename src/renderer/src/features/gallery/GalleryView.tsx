import { useEffect, useMemo, useState } from 'react'
import { Copy, FolderPlus } from 'lucide-react'
import { useWorkspace } from '@renderer/lib/store'
import { copyText } from '@renderer/lib/clipboard'
import { Button } from '@renderer/components/Button'
import { BatchBar } from '@renderer/components/BatchBar'
import { SearchInput, Select, Slider } from '@renderer/components/fields'
import { ToolbarCount, ToolbarSeparator, ViewToolbar } from '@renderer/components/ViewToolbar'
import { EmptyState, ErrorState } from '@renderer/components/states'
import { ImageGrid } from '../images/ImageGrid'
import { GridSkeleton, ScanStatus } from '../images/GridSkeleton'

const SOURCE_OPTIONS = [
  { value: 'all', label: '全部来源' },
  { value: 'comfyui', label: 'ComfyUI 节点图' },
  { value: 'a1111', label: 'A1111 parameters' },
  { value: 'without-meta', label: '无元数据' },
  { value: 'untagged', label: '无标签' }
]

const SORT_OPTIONS = [
  { value: 'mtime-desc', label: '最近修改' },
  { value: 'mtime-asc', label: '最早修改' },
  { value: 'name-asc', label: '文件名 A→Z' },
  { value: 'size-desc', label: '文件最大' }
]

export function GalleryView(): React.JSX.Element {
  const status = useWorkspace((s) => s.status)
  const error = useWorkspace((s) => s.error)
  const images = useWorkspace((s) => s.images)
  const scan = useWorkspace((s) => s.scan)
  const refresh = useWorkspace((s) => s.refresh)
  const addDataset = useWorkspace((s) => s.addDataset)
  const tileSize = useWorkspace((s) => s.tileSize)
  const setTileSize = useWorkspace((s) => s.setTileSize)
  const selectedIds = useWorkspace((s) => s.selectedIds)
  const clearSelection = useWorkspace((s) => s.clearSelection)
  const setVisibleIds = useWorkspace((s) => s.setVisibleIds)
  const pushToast = useWorkspace((s) => s.pushToast)
  const openInspector = useWorkspace((s) => s.openInspector)

  const [query, setQuery] = useState('')
  const [source, setSource] = useState('all')
  const [sort, setSort] = useState('mtime-desc')

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    const filtered = images.filter((image) => {
      if (source === 'comfyui' && image.source !== 'comfyui') return false
      if (source === 'a1111' && image.source !== 'a1111') return false
      if (source === 'without-meta' && image.source !== 'none') return false
      if (source === 'untagged' && image.tags.length > 0) return false
      if (!q) return true
      return (
        image.fileName.toLowerCase().includes(q) ||
        (image.positive?.toLowerCase().includes(q) ?? false) ||
        (image.checkpoint?.toLowerCase().includes(q) ?? false) ||
        image.loras.some((lora) => lora.name.toLowerCase().includes(q)) ||
        image.tags.some((tag) => tag.includes(q))
      )
    })

    const sorted = [...filtered]
    switch (sort) {
      case 'mtime-asc':
        sorted.sort((a, b) => a.mtime - b.mtime)
        break
      case 'name-asc':
        sorted.sort((a, b) => a.fileName.localeCompare(b.fileName))
        break
      case 'size-desc':
        sorted.sort((a, b) => b.sizeBytes - a.sizeBytes)
        break
      default:
        sorted.sort((a, b) => b.mtime - a.mtime)
    }
    return sorted
  }, [images, query, source, sort])

  useEffect(() => {
    setVisibleIds(visible.map((image) => image.id))
  }, [visible, setVisibleIds])

  const selectedImages = useMemo(
    () => images.filter((image) => selectedIds.includes(image.id)),
    [images, selectedIds]
  )

  const hasFilters = Boolean(query) || source !== 'all'

  const copyPrompts = async (): Promise<void> => {
    const payload = selectedImages
      .filter((image) => image.positive)
      .map((image) => `# ${image.fileName}\n${image.positive}`)
      .join('\n\n')
    if (!payload) {
      pushToast({ tone: 'warning', title: '选中的图片都没有可复制的提示词' })
      return
    }
    const ok = await copyText(payload)
    pushToast(
      ok
        ? { tone: 'success', title: `已复制 ${selectedImages.length} 条提示词` }
        : { tone: 'danger', title: '复制失败', description: '剪贴板不可用。' }
    )
  }

  const scanning = scan !== null && scan.phase !== 'done'

  return (
    <div className="relative flex h-full min-h-0 flex-col">
      <ViewToolbar
        actions={
          <>
            <ToolbarCount>{visible.length} 张</ToolbarCount>
            <ToolbarSeparator />
            <Button size="sm" variant="secondary" onClick={() => void refresh()}>
              重新载入
            </Button>
          </>
        }
      >
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="搜索文件名、提示词、模型、标签"
          className="w-[240px]"
        />
        <Select
          ariaLabel="来源筛选"
          value={source}
          onChange={setSource}
          options={SOURCE_OPTIONS}
          className="w-[140px]"
        />
        <Select
          ariaLabel="排序方式"
          value={sort}
          onChange={setSort}
          options={SORT_OPTIONS}
          className="w-[118px]"
        />
        <ToolbarSeparator />
        <div className="flex w-[124px] shrink-0 items-center gap-2 px-1">
          <span className="shrink-0 text-2xs text-ink-faint">缩略图</span>
          <Slider
            ariaLabel="缩略图尺寸"
            min={120}
            max={280}
            step={8}
            value={tileSize}
            onChange={setTileSize}
          />
        </div>
      </ViewToolbar>

      <div className="min-h-0 flex-1">
        {status === 'loading' ? (
          <LoadingPane />
        ) : status === 'error' ? (
          <ErrorState
            title="读取本地数据失败"
            description={error ?? '无法读取工作台数据，请重启应用后重试。'}
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
        ) : images.length === 0 ? (
          <EmptyState
            title="图库里还没有图片"
            description="把 ComfyUI 的出图目录加进来，工作台会解析每张图嵌入的提示词、模型与 LoRA，并生成缩略图。"
            action={
              <Button variant="primary" onClick={() => void addDataset()}>
                <FolderPlus size={14} />
                添加图片目录
              </Button>
            }
          />
        ) : visible.length === 0 ? (
          <EmptyState
            title="没有符合条件的图片"
            description="换一个关键词，或把筛选条件放宽。"
            action={
              <Button
                variant="secondary"
                onClick={() => {
                  setQuery('')
                  setSource('all')
                }}
              >
                清除筛选
              </Button>
            }
          />
        ) : (
          <ImageGrid images={visible} tileSize={tileSize} onOpen={() => openInspector()} />
        )}
      </div>

      {selectedIds.length > 0 ? (
        <BatchBar
          count={selectedIds.length}
          summary={selectedImages[0]?.fileName}
          onClear={clearSelection}
        >
          <Button size="sm" variant="ghost" onClick={copyPrompts}>
            <Copy size={13} />
            复制提示词
          </Button>
        </BatchBar>
      ) : null}
    </div>
  )
}

function LoadingPane(): React.JSX.Element {
  const tileSize = useWorkspace((s) => s.tileSize)
  return (
    <div className="flex h-full flex-col">
      <ScanStatus label="正在读取本地数据…" />
      <div className="min-h-0 flex-1 overflow-hidden">
        <GridSkeleton tileSize={tileSize} />
      </div>
    </div>
  )
}
