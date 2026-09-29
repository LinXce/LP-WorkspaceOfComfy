import { useMemo, useState } from 'react'
import { Combine, PencilLine, Trash2 } from 'lucide-react'
import type { TagCategory } from '@shared/types'
import { ALL_TAG_CATEGORIES, MOCK_TAGS, TAG_CATEGORY_LABEL } from '@renderer/lib/mock'
import { useWorkspace } from '@renderer/lib/store'
import { cn } from '@renderer/lib/utils'
import { Button } from '@renderer/components/Button'
import { Badge, Dot, ProgressBar } from '@renderer/components/primitives'
import { Checkbox, SearchInput, Select } from '@renderer/components/fields'
import {
  StatePreviewSwitch,
  ToolbarCount,
  ToolbarSeparator,
  ViewToolbar
} from '@renderer/components/ViewToolbar'
import { EmptyState, ErrorState, LoadingState } from '@renderer/components/states'

const CATEGORY_OPTIONS = [
  { value: 'all', label: '全部类别' },
  ...ALL_TAG_CATEGORIES.map((value) => ({ value, label: TAG_CATEGORY_LABEL[value] }))
]

const SORT_OPTIONS = [
  { value: 'count-desc', label: '使用最多' },
  { value: 'count-asc', label: '使用最少' },
  { value: 'name-asc', label: '标签 A→Z' }
]

const GRID = 'grid-cols-[30px_minmax(0,1fr)_76px_132px_84px_76px]'

const CATEGORY_DOT: Record<TagCategory, 'accent' | 'signal' | 'warning' | 'danger' | 'brand' | 'neutral'> = {
  person: 'accent',
  style: 'signal',
  scene: 'warning',
  quality: 'danger',
  object: 'brand',
  other: 'neutral'
}

export function TagsView(): React.JSX.Element {
  const previewState = useWorkspace((s) => s.previewState)
  const tagQuery = useWorkspace((s) => s.tagQuery)
  const setTagQuery = useWorkspace((s) => s.setTagQuery)
  const categoryFilter = useWorkspace((s) => s.tagCategoryFilter)
  const setCategoryFilter = useWorkspace((s) => s.setTagCategoryFilter)
  const setSelectedTagId = useWorkspace((s) => s.setSelectedTagId)
  const selectedTagId = useWorkspace((s) => s.selectedTagId)
  const pushToast = useWorkspace((s) => s.pushToast)

  const [picked, setPicked] = useState<string[]>([])
  const [sort, setSort] = useState('count-desc')

  const tags = useMemo(() => {
    const q = tagQuery.trim().toLowerCase()
    const list = MOCK_TAGS.filter((tag) => {
      if (categoryFilter !== 'all' && tag.category !== categoryFilter) return false
      if (!q) return true
      return (
        tag.name.toLowerCase().includes(q) || tag.aliases.some((a) => a.toLowerCase().includes(q))
      )
    })
    const sorted = [...list]
    if (sort === 'name-asc') sorted.sort((a, b) => a.name.localeCompare(b.name))
    else if (sort === 'count-asc') sorted.sort((a, b) => a.count - b.count)
    else sorted.sort((a, b) => b.count - a.count)
    return sorted
  }, [tagQuery, categoryFilter, sort])

  const maxCount = useMemo(() => Math.max(1, ...MOCK_TAGS.map((tag) => tag.count)), [])
  const allPicked = tags.length > 0 && picked.length === tags.length

  const toggleAll = (): void => {
    setPicked(allPicked ? [] : tags.map((tag) => tag.id))
  }

  const toggleOne = (id: string): void => {
    setPicked((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <ViewToolbar
        actions={
          <>
            <Button
              size="sm"
              variant="secondary"
              disabled={picked.length < 2}
              onClick={() =>
                pushToast({
                  tone: 'info',
                  title: `合并 ${picked.length} 个标签`,
                  description: '选择要保留的目标标签，其余标签的出现记录会一起迁移过去。'
                })
              }
            >
              <Combine size={13} />
              合并
            </Button>
            <Button
              size="sm"
              variant="secondary"
              disabled={picked.length !== 1}
              onClick={() => pushToast({ tone: 'info', title: '重命名标签' })}
            >
              <PencilLine size={13} />
              重命名
            </Button>
            <Button
              size="sm"
              variant="danger"
              disabled={picked.length === 0}
              onClick={() => {
                pushToast({
                  tone: 'warning',
                  title: `已删除 ${picked.length} 个标签`,
                  description: '标签从图片上移除，图片本身不受影响。'
                })
                setPicked([])
              }}
            >
              <Trash2 size={13} />
              删除
            </Button>
            <ToolbarSeparator />
            <ToolbarCount>{tags.length} 个标签</ToolbarCount>
            <ToolbarSeparator />
            <StatePreviewSwitch />
          </>
        }
      >
        <SearchInput
          value={tagQuery}
          onChange={setTagQuery}
          placeholder="搜索标签或别名"
          className="w-[220px]"
        />
        <Select
          ariaLabel="类别筛选"
          value={categoryFilter}
          onChange={setCategoryFilter}
          options={CATEGORY_OPTIONS}
          className="w-[118px]"
        />
        <Select
          ariaLabel="排序方式"
          value={sort}
          onChange={setSort}
          options={SORT_OPTIONS}
          className="w-[118px]"
        />
      </ViewToolbar>

      {previewState === 'loading' ? (
        <LoadingState title="正在统计标签…" description="重建标签索引与共现关系。" />
      ) : previewState === 'error' ? (
        <ErrorState
          title="标签索引损坏"
          description="上一次写入被中断，索引与图片记录的计数对不上。可以重建索引，图片上的标签不会丢失。"
          onRetry={() => pushToast({ tone: 'info', title: '正在重建标签索引…' })}
        />
      ) : previewState === 'empty' || tags.length === 0 ? (
        <EmptyState
          title={
            tagQuery || categoryFilter !== 'all'
              ? '没有匹配的标签'
              : '标签库是空的'
          }
          description={
            tagQuery || categoryFilter !== 'all'
              ? '换个关键词或类别试试。'
              : '打标完成后标签会自动汇入这里，作为后续打标的受控词表。'
          }
          action={
            tagQuery || categoryFilter !== 'all' ? (
              <Button
                variant="secondary"
                onClick={() => {
                  setTagQuery('')
                  setCategoryFilter('all')
                }}
              >
                清除筛选
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div
            className={cn(
              'sticky top-0 z-10 grid h-8 items-center gap-2 border-b border-line bg-surface px-3 text-2xs text-ink-muted',
              GRID
            )}
          >
            <Checkbox
              ariaLabel="全选标签"
              checked={allPicked}
              indeterminate={picked.length > 0 && !allPicked}
              onChange={toggleAll}
            />
            <span>标签</span>
            <span>类别</span>
            <span>使用次数</span>
            <span>来源</span>
            <span>状态</span>
          </div>

          <ul>
            {tags.map((tag) => {
              const active = selectedTagId === tag.id
              const checked = picked.includes(tag.id)
              return (
                <li key={tag.id}>
                  <div
                    style={{ height: 'var(--row-h)' }}
                    className={cn(
                      't-fast grid items-center gap-2 border-b border-line-soft px-3 hover:bg-hover',
                      active && 'bg-accent-soft',
                      GRID
                    )}
                  >
                    <Checkbox
                      ariaLabel={`选择标签 ${tag.name}`}
                      checked={checked}
                      onChange={() => toggleOne(tag.id)}
                    />
                    <button
                      type="button"
                      onClick={() => setSelectedTagId(tag.id)}
                      className="min-w-0 text-left outline-offset-2"
                    >
                      <span
                        className={cn(
                          'block truncate text-xs',
                          tag.blacklisted ? 'text-ink-faint line-through' : 'text-ink'
                        )}
                      >
                        {tag.name}
                      </span>
                    </button>
                    <span className="flex items-center gap-1.5 text-2xs text-ink-soft">
                      <Dot tone={CATEGORY_DOT[tag.category]} />
                      {TAG_CATEGORY_LABEL[tag.category]}
                    </span>
                    <div className="flex items-center gap-2">
                      <ProgressBar
                        value={tag.count}
                        max={maxCount}
                        tone={tag.blacklisted ? 'danger' : 'accent'}
                        className="min-w-0 flex-1"
                        label={`${tag.name} 使用次数`}
                      />
                      <span className="num w-7 shrink-0 text-right text-2xs text-ink-muted">
                        {tag.count}
                      </span>
                    </div>
                    <span className="text-2xs text-ink-faint">
                      {tag.origin === 'model' ? '模型' : tag.origin === 'import' ? '导入' : '手动'}
                    </span>
                    <span>
                      {tag.blacklisted ? (
                        <Badge tone="danger">已屏蔽</Badge>
                      ) : tag.count === 0 ? (
                        <Badge tone="warning">未使用</Badge>
                      ) : (
                        <Badge tone="neutral">启用</Badge>
                      )}
                    </span>
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}
