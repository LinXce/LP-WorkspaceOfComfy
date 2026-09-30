import { useMemo, useState } from 'react'
import { Ban, Hash, Plus, Tag as TagIcon } from 'lucide-react'
import type { TagCategory } from '@shared/types'
import { useWorkspace } from '@renderer/lib/store'
import { CATEGORY_OPTIONS, TAG_CATEGORY_LABEL } from '@renderer/lib/catalog'
import { formatCount } from '@renderer/lib/utils'
import { Button } from '@renderer/components/Button'
import { Badge } from '@renderer/components/primitives'
import { InspectorGroup } from '@renderer/components/Panel'
import { Select, Switch } from '@renderer/components/fields'
import { Thumbnail } from '@renderer/components/Thumbnail'
import { TagPill } from '@renderer/components/TagPill'
import { EmptyState } from '@renderer/components/states'

export function TagsInspector(): React.JSX.Element {
  const tags = useWorkspace((s) => s.tags)
  const images = useWorkspace((s) => s.images)
  const selectedTagName = useWorkspace((s) => s.selectedTagName)
  const setSelectedTagName = useWorkspace((s) => s.setSelectedTagName)
  const updateTagMeta = useWorkspace((s) => s.updateTagMeta)
  const select = useWorkspace((s) => s.select)
  const setView = useWorkspace((s) => s.setView)
  const pushToast = useWorkspace((s) => s.pushToast)
  const [aliasDraft, setAliasDraft] = useState('')

  const tag = tags.find((item) => item.name === selectedTagName)

  const related = useMemo(
    () => (tag ? images.filter((image) => image.tags.includes(tag.name)) : []),
    [images, tag]
  )

  const cooccurring = useMemo(() => {
    if (!tag) return []
    const counter = new Map<string, number>()
    for (const image of related) {
      for (const name of image.tags) {
        if (name === tag.name) continue
        counter.set(name, (counter.get(name) ?? 0) + 1)
      }
    }
    return [...counter.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
      .map(([name]) => name)
  }, [related, tag])

  if (!tag) {
    return (
      <EmptyState
        icon={<TagIcon size={18} />}
        title="选中一个标签"
        description="这里可以改类别、加别名、屏蔽标签，并看到它出现在哪些图片上。标签库同时是打标的受控词表。"
      />
    )
  }

  const commitAliases = (aliases: string[]): void => {
    void updateTagMeta({ name: tag.name, aliases })
  }

  return (
    <div className="flex flex-col">
      <InspectorGroup
        title="标签"
        actions={<Badge tone="accent">#{formatCount(tag.count)} 次</Badge>}
      >
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center gap-2">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-control border border-line bg-inset text-ink-muted">
              <Hash size={14} />
            </span>
            <span className="min-w-0 truncate text-[15px] font-semibold text-ink">{tag.name}</span>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-2xs text-ink-faint">类别</span>
            <Select
              ariaLabel="标签类别"
              value={tag.category}
              onChange={(value) =>
                void updateTagMeta({ name: tag.name, category: value as TagCategory })
              }
              options={CATEGORY_OPTIONS}
            />
          </div>

          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 text-xs text-ink">
                <Ban size={12} className="text-danger" />
                屏蔽这个标签
              </p>
              <p className="text-2xs leading-4 text-ink-faint">
                作为受控词表时提示模型不要输出它
              </p>
            </div>
            <Switch
              ariaLabel="屏蔽标签"
              checked={tag.blacklisted}
              onChange={(checked) => void updateTagMeta({ name: tag.name, blacklisted: checked })}
            />
          </div>
          <p className="text-[10px] leading-4 text-ink-faint">
            类别、别名、屏蔽状态保存在工作台本地，不会改动磁盘上的标签文件。
          </p>
        </div>
      </InspectorGroup>

      <InspectorGroup title={`别名 · ${tag.aliases.length}`}>
        {tag.aliases.length > 0 ? (
          <div className="mb-2 flex flex-wrap gap-1">
            {tag.aliases.map((alias) => (
              <TagPill
                key={alias}
                name={alias}
                category="other"
                onRemove={() => commitAliases(tag.aliases.filter((item) => item !== alias))}
              />
            ))}
          </div>
        ) : (
          <p className="mb-2 text-2xs text-ink-faint">
            别名用于把不同写法归并到同一个标签，打标时会一起送进提示词。
          </p>
        )}
        <div className="field flex h-7 items-center gap-1.5 px-2">
          <Plus size={12} className="shrink-0 text-ink-faint" />
          <input
            value={aliasDraft}
            onChange={(e) => setAliasDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key !== 'Enter') return
              const value = aliasDraft.trim().toLowerCase()
              if (value && !tag.aliases.includes(value)) commitAliases([...tag.aliases, value])
              setAliasDraft('')
            }}
            placeholder="添加别名后回车"
            aria-label="添加别名"
            className="h-full min-w-0 flex-1 bg-transparent text-xs outline-none placeholder:text-ink-faint"
          />
        </div>
      </InspectorGroup>

      <InspectorGroup title={`常一起出现的标签 · ${cooccurring.length}`}>
        {cooccurring.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {cooccurring.map((name) => {
              const hit = tags.find((item) => item.name === name)
              return (
                <TagPill
                  key={name}
                  name={name}
                  category={hit?.category ?? 'other'}
                  size="sm"
                  onClick={() => hit && setSelectedTagName(hit.name)}
                />
              )
            })}
          </div>
        ) : (
          <p className="text-2xs text-ink-faint">暂时没有共现数据。</p>
        )}
      </InspectorGroup>

      <InspectorGroup title={`使用这个标签的图片 · ${related.length}`}>
        {related.length > 0 ? (
          <>
            <div className="grid grid-cols-3 gap-1.5">
              {related.slice(0, 9).map((image) => (
                <button
                  key={image.id}
                  type="button"
                  title={image.fileName}
                  onClick={() => {
                    select(image.id, 'replace')
                    setView('gallery')
                  }}
                  className="t-fast aspect-square overflow-hidden rounded-control border border-line-soft bg-inset hover:border-accent"
                >
                  <Thumbnail imageId={image.id} alt={image.fileName} />
                </button>
              ))}
            </div>
            {related.length > 9 ? (
              <Button
                size="sm"
                variant="ghost"
                className="mt-2 w-full"
                onClick={() => {
                  select(related[0].id, 'replace')
                  setView('gallery')
                }}
              >
                还有 {related.length - 9} 张，去图库查看
              </Button>
            ) : null}
          </>
        ) : (
          <p className="text-2xs text-ink-faint">还没有图片使用这个标签。</p>
        )}
      </InspectorGroup>

      <InspectorGroup title="提示">
        <button
          type="button"
          onClick={() =>
            pushToast({
              tone: 'info',
              title: '重命名 / 合并尚未开放',
              description: '这两步需要回写磁盘上的标签文件，会在打标接入时一起做。'
            })
          }
          className="text-left text-2xs leading-[1.6] text-ink-muted underline-offset-2 hover:text-ink hover:underline"
        >
          为什么不能重命名或合并标签？
        </button>
      </InspectorGroup>
    </div>
  )
}
