import { useMemo, useState } from 'react'
import { FolderPlus } from 'lucide-react'
import type { TagCategory } from '@shared/types'
import { useWorkspace } from '@renderer/lib/store'
import { CATEGORY_OPTIONS, TAG_CATEGORY_LABEL } from '@renderer/lib/catalog'
import { cn, formatCount } from '@renderer/lib/utils'
import { Button } from '@renderer/components/Button'
import { Badge, Dot, ProgressBar } from '@renderer/components/primitives'
import { Checkbox, SearchInput, Select } from '@renderer/components/fields'
import {
  ToolbarCount,
  ToolbarSeparator,
  ViewToolbar
} from '@renderer/components/ViewToolbar'
import { EmptyState, ErrorState } from '@renderer/components/states'

const SORT_OPTIONS = [
  { value: 'count-desc', label: '使用最多' },
  { value: 'count-asc', label: '使用最少' },
  { value: 'name-asc', label: '标签 A→Z' }
]

const GRID = 'grid-cols-[30px_minmax(0,1fr)_76px_132px_84px]'

const CATEGORY_DOT: Record<TagCategory, 'accent' | 'signal' | 'warning' | 'danger' | 'brand' | 'neutral'> = {
  person: 'accent',
  style: 'signal',
  scene: 'warning',
  quality: 'danger',
  object: 'brand',
  other: 'neutral'
}

export function TagsView(): React.JSX.Element {
  const status = useWorkspace((s) => s.status)
  const error = useWorkspace((s) => s.error)
  const tags = useWorkspace((s) => s.tags)
  const images = useWorkspace((s) => s.images)
  const refresh = useWorkspace((s) => s.refresh)
  const setView = useWorkspace((s) => s.setView)
  const tagQuery = useWorkspace((s) => s.tagQuery)
  const setTagQuery = useWorkspace((s) => s.setTagQuery)
  const categoryFilter = useWorkspace((s) => s.tagCategoryFilter)
  const setCategoryFilter = useWorkspace((s) => s.setTagCategoryFilter)
  const selectedTagName = useWorkspace((s) => s.selectedTagName)
  const setSelectedTagName = useWorkspace((s) => s.setSelectedTagName)

  const [sort, setSort] = useState('count-desc')

  const filtered = useMemo(() => {
    const q = tagQuery.trim().toLowerCase()
    const list = tags.filter((tag) => {
      if (categoryFilter !== 'all' && tag.category !== categoryFilter) return false
      if (!q) return true
      return tag.name.includes(q) || tag.aliases.some((alias) => alias.includes(q))
    })
    const sorted = [...list]
    if (sort === 'name-asc') sorted.sort((a, b) => a.name.localeCompare(b.name))
    else if (sort === 'count-asc') sorted.sort((a, b) => a.count - b.count)
    else sorted.sort((a, b) => b.count - a.count)
    return sorted
  }, [tags, tagQuery, categoryFilter, sort])

  const maxCount = useMemo(() => Math.max(1, ...tags.map((tag) => tag.count)), [tags])

  if (status === 'loading') {
    return (
      <div className="flex h-full items-center justify-center text-2xs text-ink-muted">
        正在读取标签…
      </div>
    )
  }

  if (status === 'error') {
    return (
      <ErrorState
        title="读取本地数据失败"
        description={error ?? '无法读取工作台数据。'}
        onRetry={() => void refresh()}
      />
    )
  }

  if (images.length === 0) {
    return (
      <EmptyState
        title="还没有标签可统计"
        description="标签来自每张图旁边的同名 .txt 文件（kohya / A1111 的常见格式）。先添加一个图片文件夹，工作台会把标签读进来。"
        action={
          <Button variant="primary" onClick={() => setView('datasets')}>
            <FolderPlus size={14} />
            去添加数据集
          </Button>
        }
      />
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <ViewToolbar
        actions={
          <>
            <ToolbarCount>{filtered.length} 个标签</ToolbarCount>
            <ToolbarSeparator />
            <Button size="sm" variant="secondary" onClick={() => void refresh()}>
              重新统计
            </Button>
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
          options={[{ value: 'all', label: '全部类别' }, ...CATEGORY_OPTIONS]}
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

      {tags.length === 0 ? (
        <EmptyState
          title="没有找到任何标签"
          description="扫描到的图片旁边都没有同名 .txt 文件。给数据集补上标签文件后重新扫描即可。"
          action={
            <Button variant="secondary" onClick={() => setView('datasets')}>
              去数据集重新扫描
            </Button>
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="没有匹配的标签"
          description="换个关键词或类别试试。"
          action={
            <Button
              variant="secondary"
              onClick={() => {
                setTagQuery('')
                setCategoryFilter('all')
              }}
            >
              清除筛选
            </Button>
          }
        />
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div
            className={cn(
              'sticky top-0 z-10 grid h-8 items-center gap-2 border-b border-line-soft bg-surface px-3 text-2xs text-ink-muted',
              GRID
            )}
          >
            <span />
            <span>标签</span>
            <span>类别</span>
            <span>使用次数</span>
            <span>状态</span>
          </div>

          <ul>
            {filtered.map((tag) => {
              const active = selectedTagName === tag.name
              return (
                <li key={tag.name}>
                  <div
                    style={{ height: 'var(--row-h)' }}
                    className={cn(
                      't-fast grid items-center gap-2 border-b border-line-soft px-3 hover:bg-hover',
                      active && 'bg-accent-soft',
                      GRID
                    )}
                  >
                    <span className="flex justify-center">
                      <Checkbox
                        ariaLabel={`选择标签 ${tag.name}`}
                        checked={active}
                        onChange={() => setSelectedTagName(active ? null : tag.name)}
                      />
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedTagName(tag.name)}
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
                        {formatCount(tag.count)}
                      </span>
                    </div>
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
