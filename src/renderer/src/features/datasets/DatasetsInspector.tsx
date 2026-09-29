import { Download, FolderOpen, RefreshCw, Trash2 } from 'lucide-react'
import { MOCK_DATASETS, MOCK_IMAGES } from '@renderer/lib/mock'
import { useWorkspace } from '@renderer/lib/store'
import { formatRelativeTime } from '@renderer/lib/utils'
import { Button } from '@renderer/components/Button'
import { IconButton } from '@renderer/components/IconButton'
import { Badge, ProgressBar } from '@renderer/components/primitives'
import { DefinitionRow, InspectorGroup } from '@renderer/components/Panel'
import { EmptyState } from '@renderer/components/states'
import { ImageDetail } from '../images/ImageDetail'

export function DatasetsInspector(): React.JSX.Element {
  const activeDatasetId = useWorkspace((s) => s.activeDatasetId)
  const primaryId = useWorkspace((s) => s.primaryId)
  const pushToast = useWorkspace((s) => s.pushToast)

  const dataset = MOCK_DATASETS.find((item) => item.id === activeDatasetId)
  const image = MOCK_IMAGES.find((item) => item.id === primaryId)

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
            onClick={() => pushToast({ tone: 'info', title: '开始重新扫描', description: dataset.path })}
          >
            <RefreshCw size={13} />
          </IconButton>
        }
      >
        <div className="flex flex-col gap-2">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-[13px] font-medium text-ink">{dataset.name}</p>
              <p className="truncate font-mono text-[10px] text-ink-faint" title={dataset.path}>
                {dataset.path}
              </p>
            </div>
            <Badge tone={complete ? 'signal' : 'accent'} className="shrink-0">
              {complete ? '打标完成' : '打标中'}
            </Badge>
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between text-2xs text-ink-muted">
              <span>已打标</span>
              <span className="num">
                {dataset.taggedCount} / {dataset.imageCount}
              </span>
            </div>
            <ProgressBar
              value={dataset.taggedCount}
              max={dataset.imageCount}
              tone={complete ? 'signal' : 'accent'}
              label="数据集打标进度"
            />
          </div>

          <DefinitionRow label="更新于">{formatRelativeTime(dataset.updatedAt)}</DefinitionRow>

          <div className="mt-0.5 flex flex-wrap gap-1.5">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => pushToast({ tone: 'info', title: '导出标签', description: '按 WD14 格式导出 .txt。' })}
            >
              <Download size={13} />
              导出标签
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => pushToast({ tone: 'info', title: '在文件管理器中打开' })}
            >
              <FolderOpen size={13} />
              打开目录
            </Button>
            <Button
              size="sm"
              variant="danger"
              onClick={() =>
                pushToast({
                  tone: 'warning',
                  title: '移除数据集',
                  description: '只从工作台移除，不会删除磁盘上的文件。'
                })
              }
            >
              <Trash2 size={13} />
              移除
            </Button>
          </div>
        </div>
      </InspectorGroup>

      {image ? (
        <ImageDetail image={image} />
      ) : (
        <EmptyState
          title="选中一张图片编辑标签"
          description="这张图的标签会写入数据集，并作为下一步打标的受控词表参考。"
        />
      )}
    </div>
  )
}
