import { MousePointerClick } from 'lucide-react'
import { useWorkspace } from '@renderer/lib/store'
import { EmptyState } from '@renderer/components/states'
import { Badge } from '@renderer/components/primitives'
import { ImageDetail } from '../images/ImageDetail'

export function GalleryInspector(): React.JSX.Element {
  const primaryId = useWorkspace((s) => s.primaryId)
  const selectedCount = useWorkspace((s) => s.selectedIds.length)
  const images = useWorkspace((s) => s.images)
  const image = images.find((item) => item.id === primaryId)

  if (!image) {
    return (
      <EmptyState
        icon={<MousePointerClick size={18} />}
        title="选中一张图片查看详情"
        description="这里会显示这张图嵌入的提示词、模型、LoRA 与采样参数，数据直接从文件头解析。"
      />
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
