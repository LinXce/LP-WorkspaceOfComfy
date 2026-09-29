import { useEffect, useMemo, useState } from 'react'
import { Copy, Sparkles, Tag, Trash2 } from 'lucide-react'
import { MOCK_IMAGES } from '@renderer/lib/mock'
import { useWorkspace } from '@renderer/lib/store'
import { copyText } from '@renderer/lib/clipboard'
import { Button } from '@renderer/components/Button'
import { BatchBar } from '@renderer/components/BatchBar'
import { SearchInput, Select, Slider } from '@renderer/components/fields'
import {
  StatePreviewSwitch,
  ToolbarCount,
  ToolbarSeparator,
  ViewToolbar
} from '@renderer/components/ViewToolbar'
import { EmptyState, ErrorState } from '@renderer/components/states'
import { ImageGrid } from '../images/ImageGrid'
import { GridSkeleton, ScanStatus } from '../images/GridSkeleton'

const SOURCE_OPTIONS = [
  { value: 'all', label: '全部来源' },
  { value: 'comfyui', label: 'ComfyUI 节点图' },
  { value: 'a1111', label: 'A1111 parameters' },
  { value: 'with-meta', label: '有元数据' },
  { value: 'without-meta', label: '无元数据' }
]

const SORT_OPTIONS = [
  { value: 'mtime-desc', label: '最近修改' },
  { value: 'mtime-asc', label: '最早修改' },
  { value: 'name-asc', label: '文件名 A→Z' },
  { value: 'size-desc', label: '文件最大' },
  { value: 'rating-desc', label: '评分最高' }
]

export function GalleryView(): React.JSX.Element {
  const previewState = useWorkspace((s) => s.previewState)
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

  const images = useMemo(() => {
    const q = query.trim().toLowerCase()
    const filtered = MOCK_IMAGES.filter((image) => {
      if (source === 'comfyui' && image.source !== 'comfyui') return false
      if (source === 'a1111' && image.source !== 'a1111') return false
      if (source === 'with-meta' && image.source === 'none') return false
      if (source === 'without-meta' && image.source !== 'none') return false
      if (!q) return true
      return (
        image.fileName.toLowerCase().includes(q) ||
        (image.positive?.toLowerCase().includes(q) ?? false) ||
        (image.checkpoint?.toLowerCase().includes(q) ?? false) ||
        image.loras.some((lora) => lora.name.toLowerCase().includes(q)) ||
        image.tags.some((tag) => tag.toLowerCase().includes(q))
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
      case 'rating-desc':
        sorted.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
        break
      default:
        sorted.sort((a, b) => b.mtime - a.mtime)
    }
    return sorted
  }, [query, source, sort])

  useEffect(() => {
    setVisibleIds(images.map((image) => image.id))
  }, [images, setVisibleIds])

  const selectedImages = useMemo(
    () => MOCK_IMAGES.filter((image) => selectedIds.includes(image.id)),
    [selectedIds]
  )

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

  const hasFilters = Boolean(query) || source !== 'all'
  const forcedEmpty = previewState === 'empty'
  const showFilteredEmpty = hasFilters && !forcedEmpty

  return (
    <div className="relative flex h-full min-h-0 flex-col">
      <ViewToolbar
        actions={
          <>
            <ToolbarCount>{images.length} 张</ToolbarCount>
            <ToolbarSeparator />
            <StatePreviewSwitch />
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
        {previewState === 'loading' ? (
          <div className="flex h-full flex-col">
            <ScanStatus
              label="正在扫描图片库…"
              detail="已扫描 128 / 340 个文件，缩略图在后台继续生成"
            />
            <div className="min-h-0 flex-1 overflow-hidden">
              <GridSkeleton tileSize={tileSize} />
            </div>
          </div>
        ) : previewState === 'error' ? (
          <ErrorState
            title="无法读取图片目录"
            description="D:\ComfyUI\datasets\cyberpunk-scene 当前不可访问，可能是外置磁盘未连接或路径被移动。"
            onRetry={() =>
              pushToast({ tone: 'info', title: '重新扫描', description: '已重新开始扫描目录。' })
            }
          />
        ) : forcedEmpty || images.length === 0 ? (
          <EmptyState
            title={showFilteredEmpty ? '没有符合条件的图片' : '图库里还没有图片'}
            description={
              showFilteredEmpty
                ? '换一个关键词，或把筛选条件放宽。'
                : '把 ComfyUI 的出图目录加进来，这里会自动解析每张图的提示词、模型与 LoRA。'
            }
            action={
              showFilteredEmpty ? (
                <Button
                  variant="secondary"
                  onClick={() => {
                    setQuery('')
                    setSource('all')
                  }}
                >
                  清除筛选
                </Button>
              ) : (
                <Button
                  variant="primary"
                  onClick={() =>
                    pushToast({ tone: 'info', title: '添加目录', description: '选择要扫描的文件夹。' })
                  }
                >
                  添加图片目录
                </Button>
              )
            }
          />
        ) : (
          <ImageGrid images={images} tileSize={tileSize} onOpen={() => openInspector()} />
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
          <Button
            size="sm"
            variant="ghost"
            onClick={() =>
              pushToast({ tone: 'info', title: '加入打标队列', description: '已加入待打标队列。' })
            }
          >
            <Sparkles size={13} />
            加入打标队列
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => pushToast({ tone: 'info', title: '批量加标签', description: '为选中的图片统一添加标签。' })}
          >
            <Tag size={13} />
            加标签
          </Button>
          <Button
            size="sm"
            variant="danger"
            onClick={() =>
              pushToast({
                tone: 'warning',
                title: '已移入回收站',
                description: `${selectedIds.length} 张图片，可随时撤销。`
              })
            }
          >
            <Trash2 size={13} />
            移入回收站
          </Button>
        </BatchBar>
      ) : null}
    </div>
  )
}
