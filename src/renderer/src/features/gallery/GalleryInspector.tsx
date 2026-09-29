import { ImageOff, MousePointerClick } from 'lucide-react'
import { MOCK_IMAGES } from '@renderer/lib/mock'
import { useWorkspace } from '@renderer/lib/store'
import { EmptyState } from '@renderer/components/states'
import { Badge } from '@renderer/components/primitives'
import { ImageDetail } from '../images/ImageDetail'

export function GalleryInspector(): React.JSX.Element {
  const primaryId = useWorkspace((s) => s.primaryId)
  const selectedCount = useWorkspace((s) => s.selectedIds.length)
  const image = MOCK_IMAGES.find((item) => item.id === primaryId)

  if (!image) {
    return (
      <EmptyState
        icon={<MousePointerClick size={18} />}
        title="选中一张图片查看详情"
        description="左侧检视面板会显示这张图的提示词、模型、LoRA 与采样参数，可直接编辑标签。"
      />
    )
  }

  if (image.source === 'none' && image.tags.length === 0) {
    return (
      <>
        <div className="flex items-center gap-2 border-b border-line-soft bg-canvas px-3 py-1.5">
          <ImageOff size={12} className="text-warning" />
          <span className="text-2xs text-ink-muted">这张图没有任何可解析的元数据</span>
        </div>
        <ImageDetail image={image} />
      </>
    )
  }

  return (
    <div className="flex flex-col">
      {selectedCount > 1 ? (
        <div className="flex items-center gap-2 border-b border-line-soft bg-accent-soft px-3 py-1.5">
          <Badge tone="accent">多选 {selectedCount}</Badge>
          <span className="text-2xs text-ink-soft">下面显示的是主选中项</span>
        </div>
      ) : null}
      <ImageDetail image={image} />
    </div>
  )
}
