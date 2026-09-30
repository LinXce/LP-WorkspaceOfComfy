import { Download, FolderOpen, RefreshCw, Sparkles, Trash2 } from 'lucide-react'
import { useWorkspace } from '@renderer/lib/store'
import { formatRelativeTime } from '@renderer/lib/utils'
import { Button } from '@renderer/components/Button'
import { IconButton } from '@renderer/components/IconButton'
import { Badge, ProgressBar } from '@renderer/components/primitives'
import { DefinitionRow, InspectorGroup } from '@renderer/components/Panel'
import { EmptyState } from '@renderer/components/states'
import { ImageDetail } from '../images/ImageDetail'

export function DatasetsInspector(): React.JSX.Element {
  const datasets = useWorkspace((s) => s.datasets)
  const activeDatasetId = useWorkspace((s) => s.activeDatasetId)
  const images = useWorkspace((s) => s.images)
  const primaryId = useWorkspace((s) => s.primaryId)
  const rescanDataset = useWorkspace((s) => s.rescanDataset)
  const removeDataset = useWorkspace((s) => s.removeDataset)
  const exportTags = useWorkspace((s) => s.exportTags)
  const setView = useWorkspace((s) => s.setView)

  const dataset = datasets.find((item) => item.id === activeDatasetId)
  const image = images.find((item) => item.id === primaryId)

  if (!dataset) {
    return (
      <EmptyState
        title="没有选中数据集"
        description="在中间选择一个数据集，或用「添加数据集」把一个图片文件夹纳入管理。"
      />
    )
  }

  const complete = dataset.imageCount > 0 && dataset.taggedCount === dataset.imageCount

  return (
    <div className="flex flex-col">
      <InspectorGroup
        title="数据集"
        actions={
          <IconButton
            size="sm"
            aria-label="重新扫描数据集"
            onClick={() => void rescanDataset(dataset.id)}
          >
            <RefreshCw size={13} />
          </IconButton>
        }
      >
        <div className="flex flex-col gap-2">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-[13px] font-medium text-ink">{dataset.name}</p>
              <p className="break-all font-mono text-[10px] text-ink-faint">{dataset.path}</p>
            </div>
            <Badge tone={complete ? 'signal' : 'accent'}>
              {complete ? '全部有标签' : `${dataset.imageCount - dataset.taggedCount} 张待打标`}
            </Badge>
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between text-2xs text-ink-muted">
              <span>已有标签的图片</span>
              <span className="num">
                {dataset.taggedCount} / {dataset.imageCount}
              </span>
            </div>
            <ProgressBar
              value={dataset.taggedCount}
              max={Math.max(dataset.imageCount, 1)}
              tone={complete ? 'signal' : 'accent'}
              label="数据集打标进度"
            />
          </div>

          <DefinitionRow label="加入时间">{formatRelativeTime(dataset.addedAt)}</DefinitionRow>
          <DefinitionRow label="最近扫描">{formatRelativeTime(dataset.updatedAt)}</DefinitionRow>

          <div className="mt-0.5 flex flex-wrap gap-1.5">
            <Button
              size="sm"
              variant="secondary"
              disabled={dataset.taggedCount === 0}
              onClick={() => void exportTags(dataset.id)}
            >
              <Download size={13} />
              导出标签
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                void window.workspace?.shell.openPath(dataset.path)
              }}
            >
              <FolderOpen size={13} />
              打开目录
            </Button>
            <Button size="sm" variant="danger" onClick={() => void removeDataset(dataset.id)}>
              <Trash2 size={13} />
              移除
            </Button>
          </div>
          <p className="text-[10px] leading-4 text-ink-faint">
            导出会为每张图写出同名的 <span className="font-mono">.txt</span>（标签，逗号分隔）和{' '}
            <span className="font-mono">.caption</span>（描述）。已有的 .txt 会被覆盖，内容 =
            原本读到的标签 + 模型生成的标签。
          </p>
          <p className="text-[10px] leading-4 text-ink-faint">
            移除只会把数据集从工作台里摘掉，不会删除磁盘上的任何文件。
          </p>

          <Button
            size="sm"
            variant="ghost"
            disabled={dataset.imageCount === dataset.taggedCount}
            onClick={() => setView('tagging')}
          >
            <Sparkles size={13} />
            {dataset.imageCount === dataset.taggedCount ? '这个数据集已全部有标签' : '去打标工作台'}
          </Button>
        </div>
      </InspectorGroup>

      {image ? (
        <ImageDetail image={image} />
      ) : (
        <EmptyState
          title="选中一张图片查看元数据"
          description="中间网格里点一张图，这里会显示它嵌入的提示词、模型、LoRA 与采样参数。"
        />
      )}
    </div>
  )
}
