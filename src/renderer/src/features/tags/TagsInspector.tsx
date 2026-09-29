import { useMemo, useState } from 'react'
import { Ban, Hash, Plus, Tag as TagIcon } from 'lucide-react'
import type { TagCategory } from '@shared/types'
import {
  ALL_TAG_CATEGORIES,
  MOCK_IMAGES,
  MOCK_TAGS,
  TAG_CATEGORY_LABEL
} from '@renderer/lib/mock'
import { useWorkspace } from '@renderer/lib/store'
import { formatCount } from '@renderer/lib/utils'
import { Button } from '@renderer/components/Button'
import { Badge } from '@renderer/components/primitives'
import { InspectorGroup } from '@renderer/components/Panel'
import { Select, Switch } from '@renderer/components/fields'
import { MockArtwork } from '@renderer/components/MockArtwork'
import { TagPill } from '@renderer/components/TagPill'
import { EmptyState } from '@renderer/components/states'

const CATEGORY_OPTIONS = ALL_TAG_CATEGORIES.map((value) => ({
  value,
  label: TAG_CATEGORY_LABEL[value]
}))

export function TagsInspector(): React.JSX.Element {
  const selectedTagId = useWorkspace((s) => s.selectedTagId)
  const select = useWorkspace((s) => s.select)
  const setView = useWorkspace((s) => s.setView)
  const pushToast = useWorkspace((s) => s.pushToast)
  const [category, setCategory] = useState<TagCategory | null>(null)
  const [blacklisted, setBlacklisted] = useState<boolean | null>(null)
  const [draft, setDraft] = useState('')

  const tag = MOCK_TAGS.find((item) => item.id === selectedTagId)

  const related = useMemo(() => {
    if (!tag) return []
    return MOCK_IMAGES.filter((image) => image.tags.includes(tag.name))
  }, [tag])

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

  const effectiveCategory = category ?? tag.category
  const effectiveBlacklisted = blacklisted ?? tag.blacklisted

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
              value={effectiveCategory}
              onChange={(value) => setCategory(value as TagCategory)}
              options={CATEGORY_OPTIONS}
            />
          </div>

          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 text-xs text-ink">
                <Ban size={12} className="text-danger" />
                屏蔽这个标签
              </p>
              <p className="text-2xs leading-4 text-ink-faint">打标时提示模型不要输出它</p>
            </div>
            <Switch
              ariaLabel="屏蔽标签"
              checked={effectiveBlacklisted}
              onChange={setBlacklisted}
            />
          </div>
        </div>
      </InspectorGroup>

      <InspectorGroup title={`别名 · ${tag.aliases.length}`}>
        {tag.aliases.length > 0 ? (
          <div className="mb-2 flex flex-wrap gap-1">
            {tag.aliases.map((alias) => (
              <TagPill key={alias} name={alias} category="other" />
            ))}
          </div>
        ) : (
          <p className="mb-2 text-2xs text-ink-faint">别名用于把模型输出的不同写法归并到同一个标签。</p>
        )}
        <div className="field flex h-7 items-center gap-1.5 px-2">
          <Plus size={12} className="shrink-0 text-ink-faint" />
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key !== 'Enter') return
              const value = draft.trim().toLowerCase()
              if (value) pushToast({ tone: 'success', title: `已添加别名 ${value}` })
              setDraft('')
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
              const hit = MOCK_TAGS.find((item) => item.name === name)
              return (
                <TagPill
                  key={name}
                  name={name}
                  category={hit?.category ?? 'other'}
                  size="sm"
                  onClick={() => hit && useWorkspace.getState().setSelectedTagId(hit.id)}
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
                  className="t-fast aspect-square overflow-hidden rounded-control border border-line-soft hover:border-accent"
                >
                  <MockArtwork seed={image.id} />
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
    </div>
  )
}
