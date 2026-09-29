import { useState } from 'react'
import { Check, Cpu, Plus, RefreshCw, Sparkles, Trash2 } from 'lucide-react'
import { IMAGE_BY_ID, MOCK_JOBS, MOCK_TAGS } from '@renderer/lib/mock'
import { useImageTags, useWorkspace } from '@renderer/lib/store'
import { cn } from '@renderer/lib/utils'
import { Button } from '@renderer/components/Button'
import { Badge } from '@renderer/components/primitives'
import { InspectorGroup } from '@renderer/components/Panel'
import { Switch } from '@renderer/components/fields'
import { MockArtwork } from '@renderer/components/MockArtwork'
import { TagPill } from '@renderer/components/TagPill'
import { EmptyState } from '@renderer/components/states'

const CATEGORY_BY_NAME = new Map(MOCK_TAGS.map((tag) => [tag.name, tag.category]))

export function TaggingInspector(): React.JSX.Element {
  const primaryId = useWorkspace((s) => s.primaryId)
  const settings = useWorkspace((s) => s.settings)
  const updateSettings = useWorkspace((s) => s.updateSettings)
  const setImageTags = useWorkspace((s) => s.setImageTags)
  const pushToast = useWorkspace((s) => s.pushToast)
  const [draft, setDraft] = useState('')

  const image = primaryId ? IMAGE_BY_ID.get(primaryId) : undefined

  if (!image) {
    return (
      <EmptyState
        icon={<Sparkles size={18} />}
        title="选中队列中的一张图片"
        description="这里会显示模型返回的标签、本次调用的耗时与 token 用量，可以直接改完再写入数据集。"
      />
    )
  }

  const jobItem = MOCK_JOBS[0].items.find((item) => item.imageId === image.id)
  const generated = jobItem?.tags ?? image.tags.slice(0, 5)
  const tags = image.tags
  const hasResult = Boolean(jobItem?.status === 'done')

  const addTag = (): void => {
    const value = draft.trim().toLowerCase()
    if (!value || tags.includes(value)) {
      setDraft('')
      return
    }
    setImageTags(image.id, [...tags, value])
    setDraft('')
  }

  return (
    <div className="flex flex-col">
      <div className="relative h-[200px] w-full shrink-0 border-b border-line-soft bg-inset">
        <MockArtwork seed={image.id} />
        <span className="absolute bottom-2 left-2">
          <Badge tone={hasResult ? 'signal' : 'accent'}>
            {hasResult ? '模型已返回' : jobItem?.status === 'running' ? '正在打标' : '等待中'}
          </Badge>
        </span>
      </div>

      <InspectorGroup
        title="模型输出"
        actions={
          <Button
            size="sm"
            variant="ghost"
            onClick={() => pushToast({ tone: 'info', title: '重新打标', description: image.fileName })}
          >
            <RefreshCw size={12} />
            重打
          </Button>
        }
      >
        <p className="mb-2 break-all font-mono text-[11px] text-ink-soft">{image.fileName}</p>
        {hasResult ? (
          <div className="flex flex-wrap gap-1">
            {generated.map((name) => (
              <TagPill
                key={name}
                name={name}
                category={CATEGORY_BY_NAME.get(name) ?? 'other'}
                onClick={() => {
                  if (tags.includes(name)) return
                  setImageTags(image.id, [...tags, name])
                  pushToast({ tone: 'success', title: `已采纳标签 ${name}` })
                }}
              />
            ))}
          </div>
        ) : (
          <p className="rounded-control border border-dashed border-line-soft px-2 py-2 text-2xs text-ink-faint">
            这张图还在队列里，模型返回后会显示标签。
          </p>
        )}
        {hasResult ? (
          <div className="mt-2 flex items-center gap-1.5">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                const merged = [...new Set([...tags, ...generated])]
                setImageTags(image.id, merged)
                pushToast({ tone: 'success', title: `已采纳 ${generated.length} 个标签` })
              }}
            >
              <Check size={12} />
              全部采纳
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => pushToast({ tone: 'warning', title: '已丢弃本次结果' })}
            >
              <Trash2 size={12} />
              丢弃
            </Button>
          </div>
        ) : null}
      </InspectorGroup>

      <InspectorGroup
        title={`图片现有标签 · ${tags.length}`}
        actions={
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setImageTags(image.id, [])}
            disabled={tags.length === 0}
          >
            清空
          </Button>
        }
      >
        {tags.length > 0 ? (
          <div className="mb-2 flex flex-wrap gap-1">
            {tags.map((name) => (
              <TagPill
                key={name}
                name={name}
                category={CATEGORY_BY_NAME.get(name) ?? 'other'}
                onRemove={() => setImageTags(image.id, tags.filter((t) => t !== name))}
              />
            ))}
          </div>
        ) : (
          <p className="mb-2 text-2xs text-ink-faint">还没有标签。</p>
        )}
        <div className="field flex h-7 items-center gap-1.5 px-2">
          <Plus size={12} className="shrink-0 text-ink-faint" />
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') addTag()
            }}
            placeholder="手动补一个标签"
            aria-label="手动添加标签"
            className="h-full min-w-0 flex-1 bg-transparent text-xs outline-none placeholder:text-ink-faint"
          />
        </div>
      </InspectorGroup>

      <InspectorGroup title="本次调用">
        <div className="flex flex-col gap-1.5 rounded-control border border-line-soft bg-inset p-2">
          <div className="flex items-center gap-1.5 text-2xs text-ink-muted">
            <Cpu size={12} />
            <span className="truncate font-mono">{settings.model}</span>
          </div>
          <div className="grid grid-cols-3 gap-2 pt-1">
            {[
              { label: '耗时', value: jobItem?.ms ? `${(jobItem.ms / 1000).toFixed(1)}s` : '—' },
              { label: '输入', value: hasResult ? '1.1k' : '—' },
              { label: '输出', value: hasResult ? '86' : '—' }
            ].map((item) => (
              <div key={item.label} className="flex flex-col gap-0.5">
                <span className="text-[10px] text-ink-faint">{item.label}</span>
                <span className="num text-xs text-ink-soft">{item.value}</span>
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
            <p className="text-2xs leading-4 text-ink-faint">关闭后只使用标签库里的受控词表</p>
          </div>
          <Switch
            ariaLabel="允许模型自造新标签"
            checked={settings.allowNewTags}
            onChange={(checked) => updateSettings({ allowNewTags: checked })}
          />
        </div>
      </InspectorGroup>

      <InspectorGroup title="提示词模板">
        <pre
          className={cn(
            'max-h-52 overflow-auto rounded-control border border-line-soft bg-inset p-2',
            'font-mono text-[10.5px] leading-[1.6] text-ink-muted'
          )}
        >
          {settings.template}
        </pre>
      </InspectorGroup>
    </div>
  )
}
