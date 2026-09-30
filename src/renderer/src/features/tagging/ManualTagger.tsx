import { useEffect, useMemo, useRef, useState } from 'react'
import { Plus, RotateCcw, Tags as TagsIcon, Undo2 } from 'lucide-react'
import type { ImageMeta, OutputFormat } from '@shared/types'
import { useWorkspace } from '@renderer/lib/store'
import { SOURCE_LABEL } from '@renderer/lib/catalog'
import { cn } from '@renderer/lib/utils'
import { Button } from '@renderer/components/Button'
import { Badge } from '@renderer/components/primitives'
import { SearchInput, Segmented, TextArea } from '@renderer/components/fields'
import { Thumbnail } from '@renderer/components/Thumbnail'
import { TagPill } from '@renderer/components/TagPill'
import { EmptyState } from '@renderer/components/states'

const FILTERS = [
  { value: 'all', label: '全部' },
  { value: 'untagged', label: '无标签' },
  { value: 'tagged', label: '有标签' }
]

/** 标签与描述的本地草稿：标签改动立即落盘，描述打字防抖 500ms。 */
function useTagDraft(image: ImageMeta | null): {
  tags: string[]
  caption: string
  commitTags: (next: string[]) => void
  changeCaption: (value: string) => void
} {
  const setImageTags = useWorkspace((s) => s.setImageTags)
  const [tags, setTags] = useState<string[]>(image?.tags ?? [])
  const [caption, setCaption] = useState(image?.caption ?? '')
  const captionTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const imageId = image?.id ?? null

  useEffect(() => {
    setTags(image?.tags ?? [])
    setCaption(image?.caption ?? '')
    // 只在换图时重置；同一张图保存回来的新对象不覆盖正在编辑的内容
  }, [imageId])

  useEffect(
    () => () => {
      if (captionTimer.current) clearTimeout(captionTimer.current)
    },
    []
  )

  const commitTags = (next: string[]): void => {
    setTags(next)
    if (imageId) void setImageTags({ imageId, tags: next })
  }

  const changeCaption = (value: string): void => {
    setCaption(value)
    if (captionTimer.current) clearTimeout(captionTimer.current)
    captionTimer.current = setTimeout(() => {
      if (imageId) void setImageTags({ imageId, caption: value })
    }, 500)
  }

  return { tags, caption, commitTags, changeCaption }
}

function TagEditor({
  image,
  tags,
  commitTags
}: {
  image: ImageMeta
  tags: string[]
  commitTags: (next: string[]) => void
}): React.JSX.Element {
  const vocabulary = useWorkspace((s) => s.tags)
  const [input, setInput] = useState('')

  const add = (raw: string): void => {
    const value = raw.trim().replace(/[,，]+$/, '').trim()
    setInput('')
    if (!value || tags.includes(value)) return
    commitTags([...tags, value])
  }

  const suggestions = useMemo(() => {
    const query = input.trim().toLowerCase()
    if (!query) return []
    return vocabulary
      .filter(
        (tag) => tag.count > 0 && tag.name.toLowerCase().includes(query) && !tags.includes(tag.name)
      )
      .slice(0, 8)
  }, [input, vocabulary, tags])

  const hidden = image.hiddenTags ?? []

  return (
    <div className="flex flex-col gap-4">
      <div>
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <span className="text-2xs font-medium text-ink-muted">标签</span>
          <span className="num text-[10px] text-ink-faint">{tags.length}</span>
        </div>
        <div className="flex min-h-[48px] flex-wrap content-start items-center gap-1.5 rounded-control border border-line-soft bg-inset p-2">
          {tags.length === 0 ? (
            <span className="text-2xs text-ink-faint">还没有标签，在下面输入框里加</span>
          ) : (
            tags.map((name) => (
              <TagPill
                key={name}
                name={name}
                category="other"
                size="sm"
                onRemove={() => commitTags(tags.filter((tag) => tag !== name))}
              />
            ))
          )}
        </div>
        <div className="relative mt-2">
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-faint">
            <Plus size={13} />
          </span>
          <input
            value={input}
            onChange={(e) => {
              const value = e.target.value
              if (/[,，]/.test(value)) add(value)
              else setInput(value)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                add(input)
              } else if (e.key === 'Escape') {
                setInput('')
              }
            }}
            placeholder="加标签，回车或逗号确认"
            aria-label="新增标签"
            className="field h-8 w-full pl-7 pr-2.5 text-[13px]"
          />
        </div>
        {suggestions.length > 0 ? (
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] text-ink-faint">标签库里匹配：</span>
            {suggestions.map((tag) => (
              <TagPill
                key={tag.name}
                name={tag.name}
                category={tag.category}
                size="sm"
                onClick={() => add(tag.name)}
              />
            ))}
          </div>
        ) : null}
        {hidden.length > 0 ? (
          <div className="mt-2 flex flex-wrap items-center gap-1.5 rounded-control border border-line-soft bg-inset px-2 py-1.5">
            <span className="text-[10px] text-ink-faint">
              已隐藏 {hidden.length} 个（点一下恢复）：
            </span>
            {hidden.map((name) => (
              <TagPill
                key={name}
                name={name}
                category="other"
                size="sm"
                muted
                onClick={() => commitTags([...tags, name])}
              />
            ))}
          </div>
        ) : null}
      </div>
    </div>
  )
}

/** 标签模式下的打标文本：直接编辑逗号分隔的那串，导出时原样写进 .txt。 */
function TagTextArea({
  tags,
  commitTags
}: {
  tags: string[]
  commitTags: (next: string[]) => void
}): React.JSX.Element {
  const joined = tags.join(', ')
  const [text, setText] = useState(joined)
  const [editing, setEditing] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // 失焦后才跟随外部改动（比如点了上面的 × ），编辑中不抢用户正在敲的内容
  useEffect(() => {
    if (!editing) setText(joined)
  }, [joined, editing])

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current)
    },
    []
  )

  const commit = (value: string): void => {
    commitTags(
      value
        .split(/[,，\n]/)
        .map((tag) => tag.trim())
        .filter(Boolean)
    )
  }

  return (
    <>
      <TextArea
        rows={5}
        value={text}
        onChange={(e) => {
          const value = e.target.value
          setText(value)
          if (timer.current) clearTimeout(timer.current)
          timer.current = setTimeout(() => commit(value), 400)
        }}
        onFocus={() => setEditing(true)}
        onBlur={() => {
          setEditing(false)
          if (timer.current) clearTimeout(timer.current)
          commit(text)
        }}
        placeholder="1girl, sunset, outdoor"
        className="font-mono text-[12px]"
        aria-label="打标文本"
      />
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] text-ink-faint">逗号分隔，改动会自动保存</span>
        <span className="num text-[10px] text-ink-faint">{tags.length} 个标签</span>
      </div>
    </>
  )
}

function CaptionArea({
  caption,
  onChange
}: {
  caption: string
  onChange: (value: string) => void
}): React.JSX.Element {
  return (
    <>
      <TextArea
        rows={5}
        value={caption}
        onChange={(e) => onChange(e.target.value)}
        placeholder="一位少女站在黄昏的户外，逆光……"
        className="text-[12.5px] leading-[1.7]"
        aria-label="打标文本"
      />
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] text-ink-faint">改动会自动保存</span>
        {caption ? (
          <button
            type="button"
            onClick={() => onChange('')}
            className="t-fast text-[10px] text-ink-faint hover:text-danger"
          >
            清空
          </button>
        ) : null}
      </div>
    </>
  )
}

/**
 * 打标文本 = 真正会导出的那段文字，跟着当前模式走：
 * 标签模式是逗号分隔的 tag（写 .txt），描述模式是自然语言（写 .caption）。
 */
function TagTextSection({
  mode,
  tags,
  caption,
  commitTags,
  changeCaption
}: {
  mode: OutputFormat
  tags: string[]
  caption: string
  commitTags: (next: string[]) => void
  changeCaption: (value: string) => void
}): React.JSX.Element {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-2xs font-medium text-ink-muted">打标文本</span>
        <span className="text-[10px] text-ink-faint">
          {mode === 'tag' ? '导出到同名 .txt' : '导出到同名 .caption'}
        </span>
      </div>
      {mode === 'tag' ? (
        <TagTextArea tags={tags} commitTags={commitTags} />
      ) : (
        <CaptionArea caption={caption} onChange={changeCaption} />
      )}
    </div>
  )
}

export function ManualTagger({ images }: { images: ImageMeta[] }): React.JSX.Element {
  const primaryId = useWorkspace((s) => s.primaryId)
  const select = useWorkspace((s) => s.select)
  const requeueImages = useWorkspace((s) => s.requeueImages)
  const setView = useWorkspace((s) => s.setView)
  const outputFormat = useWorkspace((s) => s.settings.outputFormat)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('all')

  const list = useMemo(() => {
    const sorted = [...images].sort((a, b) => b.mtime - a.mtime)
    const keyword = query.trim().toLowerCase()
    return sorted.filter((image) => {
      if (filter === 'untagged' && image.tags.length > 0) return false
      if (filter === 'tagged' && image.tags.length === 0) return false
      if (!keyword) return true
      return (
        image.fileName.toLowerCase().includes(keyword) ||
        image.tags.some((tag) => tag.toLowerCase().includes(keyword))
      )
    })
  }, [images, query, filter])

  // 编辑对象：优先用全局选中项（可能被筛掉了，仍继续编辑），否则退回列表第一张
  const active = images.find((image) => image.id === primaryId) ?? list[0] ?? null
  const draft = useTagDraft(active)

  return (
    <div className="flex min-h-0 flex-1">
      <section className="flex w-[38%] min-w-[264px] flex-col border-r border-line-soft">
        <header className="flex h-8 shrink-0 items-center justify-between gap-2 bg-surface px-3">
          <h2 className="text-2xs font-medium text-ink-muted">图片</h2>
          <span className="num text-2xs text-ink-faint">{list.length}</span>
        </header>
        <div className="flex shrink-0 items-center gap-2 border-b border-line-soft px-3 py-2">
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder="文件名或标签"
            className="min-w-0 flex-1"
          />
          <Segmented ariaLabel="标签筛选" value={filter} onChange={setFilter} items={FILTERS} />
        </div>
        <ul className="min-h-0 flex-1 overflow-y-auto">
          {list.length === 0 ? (
            <li className="px-3 py-8 text-center text-2xs text-ink-faint">没有匹配的图片</li>
          ) : (
            list.map((image) => (
              <li key={image.id}>
                <button
                  type="button"
                  onClick={() => select(image.id, 'replace')}
                  className={cn(
                    't-fast flex w-full items-center gap-2.5 border-b border-line-soft px-3 py-1.5 text-left hover:bg-hover',
                    active?.id === image.id && 'bg-accent-soft'
                  )}
                >
                  <span className="size-8 shrink-0 overflow-hidden rounded-xs border border-line-soft bg-inset">
                    <Thumbnail imageId={image.id} alt={image.fileName} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs text-ink-soft">{image.fileName}</span>
                    <span className="block truncate text-[10px] text-ink-faint">
                      {image.tags.length > 0 ? `${image.tags.length} 个标签` : '无标签'}
                      {image.requeued ? ' · 重新排队' : ''}
                    </span>
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>
      </section>

      <section className="flex min-w-0 flex-1 flex-col">
        {!active ? (
          <EmptyState
            icon={<TagsIcon size={18} />}
            title="没有可编辑的图片"
            description="换个数据集，或先添加图片文件夹。"
          />
        ) : (
          <>
            <header className="flex shrink-0 items-center gap-3 border-b border-line-soft bg-surface px-3 py-2.5">
              <span className="size-14 shrink-0 overflow-hidden rounded-control border border-line-soft bg-inset">
                <Thumbnail imageId={active.id} alt={active.fileName} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs text-ink" title={active.path}>
                  {active.fileName}
                </p>
                <p className="num mt-0.5 text-[10px] text-ink-faint">
                  {active.width}×{active.height}
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  <Badge tone="neutral">{SOURCE_LABEL[active.source]}</Badge>
                  {active.sidecarTags.length > 0 ? (
                    <Badge tone="neutral">旁车 {active.sidecarTags.length}</Badge>
                  ) : null}
                  {active.modelTags.length > 0 ? (
                    <Badge tone="accent">模型 {active.modelTags.length}</Badge>
                  ) : null}
                  {active.manualTags.length > 0 ? (
                    <Badge tone="signal">手动 {active.manualTags.length}</Badge>
                  ) : null}
                  {active.requeued ? <Badge tone="warning">已重新排队</Badge> : null}
                </div>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1.5">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => void requeueImages([active.id], true)}
                >
                  <RotateCcw size={12} />
                  移到准备打标
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setView('gallery')}>
                  在图库中查看
                </Button>
              </div>
            </header>
            <div className="min-h-0 flex-1 overflow-y-auto p-3.5">
              <div className="flex flex-col gap-5">
                <TagEditor image={active} tags={draft.tags} commitTags={draft.commitTags} />
                <TagTextSection
                  mode={outputFormat}
                  tags={draft.tags}
                  caption={draft.caption}
                  commitTags={draft.commitTags}
                  changeCaption={draft.changeCaption}
                />
                <p className="flex items-start gap-1.5 text-[10px] leading-4 text-ink-faint">
                  <Undo2 size={11} className="mt-px shrink-0" />
                  <span>
                    删掉的标签会记成「已隐藏」而不是永久丢弃，点一下就能恢复；旁车 .txt
                    或模型下次再带出同一个词也会被压住。
                  </span>
                </p>
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  )
}
