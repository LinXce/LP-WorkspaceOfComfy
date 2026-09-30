import { Cpu, RotateCcw, Sparkles, Undo2 } from 'lucide-react'
import { useWorkspace } from '@renderer/lib/store'
import { Thumbnail } from '@renderer/components/Thumbnail'
import { TagPill } from '@renderer/components/TagPill'
import { Badge } from '@renderer/components/primitives'
import { InspectorGroup } from '@renderer/components/Panel'
import { Switch } from '@renderer/components/fields'
import { Button } from '@renderer/components/Button'
import { EmptyState } from '@renderer/components/states'

export function TaggingInspector(): React.JSX.Element {
  const primaryId = useWorkspace((s) => s.primaryId)
  const images = useWorkspace((s) => s.images)
  const tags = useWorkspace((s) => s.tags)
  const activeEndpoint = useWorkspace((s) => s.activeEndpoint)
  const settings = useWorkspace((s) => s.settings)
  const updateSettings = useWorkspace((s) => s.updateSettings)
  const requeueImages = useWorkspace((s) => s.requeueImages)
  const setTaggingTab = useWorkspace((s) => s.setTaggingTab)
  const setView = useWorkspace((s) => s.setView)

  const image = images.find((item) => item.id === primaryId)

  if (!image) {
    return (
      <EmptyState
        icon={<Sparkles size={18} />}
        title="选中队列里的一张图片"
        description="这里会显示它的标签、元数据，以及打标服务的调用参数。"
      />
    )
  }

  const vocabulary = new Set(tags.map((tag) => tag.name))

  return (
    <div className="flex flex-col">
      <div className="relative h-[200px] w-full shrink-0 border-b border-line-soft bg-inset">
        <Thumbnail imageId={image.id} alt={image.fileName} className="object-contain" />
        <span className="absolute bottom-2 left-2">
          <Badge tone={image.requeued ? 'accent' : image.tags.length > 0 ? 'signal' : 'warning'}>
            {image.requeued ? '已重新排队' : image.tags.length > 0 ? '已有标签' : '待打标'}
          </Badge>
        </span>
      </div>

      <InspectorGroup title="图片">
        <p className="mb-1.5 break-all font-mono text-[11px] text-ink-soft">{image.fileName}</p>
        <div className="grid grid-cols-2 gap-x-3">
          <div className="flex flex-col gap-0.5">
            <span className="text-2xs text-ink-faint">尺寸</span>
            <span className="num text-xs text-ink">
              {image.width} × {image.height}
            </span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-2xs text-ink-faint">模型</span>
            <span className="truncate text-xs text-ink" title={image.checkpoint}>
              {image.checkpoint ?? '—'}
            </span>
          </div>
        </div>
      </InspectorGroup>

      <InspectorGroup title={`当前标签 · ${image.tags.length}`}>
        {image.tags.length > 0 ? (
          <>
            <div className="flex flex-wrap gap-1">
              {image.tags.map((name) => (
                <TagPill
                  key={name}
                  name={name}
                  category={tags.find((tag) => tag.name === name)?.category ?? 'other'}
                />
              ))}
            </div>
            <p className="mt-2 text-[10px] leading-4 text-ink-faint">
              来源：
              {image.sidecarTags.length > 0 ? `旁车 .txt ${image.sidecarTags.length} 个` : '无旁车文件'}
              {image.modelTags.length > 0 ? ` · 模型生成 ${image.modelTags.length} 个` : ''}
              {image.manualTags.length > 0 ? ` · 手动添加 ${image.manualTags.length} 个` : ''}
              {image.hiddenTags.length > 0 ? ` · 已隐藏 ${image.hiddenTags.length} 个` : ''}
            </p>
          </>
        ) : (
          <p className="rounded-control border border-dashed border-line-soft px-2 py-2 text-2xs leading-[1.6] text-ink-faint">
            这张图还没有标签。点上面的「开始打标」，模型会根据画面生成；也可以切到「手动编辑」自己加。
          </p>
        )}
        <div className="mt-2.5 flex items-center gap-2">
          {image.requeued ? (
            <Button
              size="sm"
              variant="secondary"
              className="flex-1"
              onClick={() => void requeueImages([image.id], false)}
            >
              <Undo2 size={12} />
              撤销排队
            </Button>
          ) : (
            <Button
              size="sm"
              variant="secondary"
              className="flex-1"
              onClick={() => void requeueImages([image.id], true)}
            >
              <RotateCcw size={12} />
              移到准备打标
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setTaggingTab('manual')
              setView('tagging')
            }}
          >
            手动编辑
          </Button>
        </div>
      </InspectorGroup>

      {image.caption ? (
        <InspectorGroup title="图片描述">
          <p className="rounded-control border border-line-soft bg-inset px-2.5 py-2 text-[11.5px] leading-[1.7] text-ink-soft">
            {image.caption}
          </p>
        </InspectorGroup>
      ) : null}

      <InspectorGroup title="打标参数">
        <div className="flex flex-col gap-1.5 rounded-control border border-line-soft bg-inset p-2">
          <div className="flex items-center gap-1.5 text-2xs text-ink-muted">
            <Cpu size={12} />
            <span className="truncate font-mono">{activeEndpoint?.model || '（未选模型）'}</span>
          </div>
          <div className="grid grid-cols-3 gap-2 pt-1">
            {[
              { label: '输出', value: settings.outputFormat },
              { label: '并发', value: settings.concurrency },
              { label: '超时', value: `${settings.timeoutMs / 1000}s` }
            ].map((item) => (
              <div key={item.label} className="flex flex-col gap-0.5">
                <span className="text-[10px] text-ink-faint">{item.label}</span>
                <span className="num truncate text-xs text-ink-soft">{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-2.5 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs text-ink">覆盖已有标签</p>
            <p className="text-2xs leading-4 text-ink-faint">关闭时只追加模型新识别出的标签</p>
          </div>
          <Switch
            ariaLabel="覆盖已有标签"
            checked={settings.overwrite}
            onChange={(checked) => updateSettings({ overwrite: checked })}
          />
        </div>
        <div className="mt-2.5 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs text-ink">允许模型自造新标签</p>
            <p className="text-2xs leading-4 text-ink-faint">
              关闭后只使用标签库里的 {vocabulary.size} 个受控词
            </p>
          </div>
          <Switch
            ariaLabel="允许模型自造新标签"
            checked={settings.allowNewTags}
            onChange={(checked) => updateSettings({ allowNewTags: checked })}
          />
        </div>
        <Button
          size="sm"
          variant="ghost"
          className="mt-2.5 w-full"
          onClick={() => setView('settings')}
        >
          去设置里调整
        </Button>
      </InspectorGroup>

      <InspectorGroup title="提示词模板">
        <pre className="max-h-52 overflow-auto rounded-control border border-line-soft bg-inset p-2 font-mono text-[10.5px] leading-[1.6] text-ink-muted">
          {settings.template}
        </pre>
      </InspectorGroup>
    </div>
  )
}
