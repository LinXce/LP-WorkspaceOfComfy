import type { ReactNode } from 'react'
import {
  ArrowRight,
  Check,
  CircleDashed,
  FolderPlus,
  Images,
  LayoutGrid,
  Play,
  Sparkles,
  Tags
} from 'lucide-react'
import { useWorkspace } from '@renderer/lib/store'
import { cn, formatCount, formatRelativeTime, truncateMiddle } from '@renderer/lib/utils'
import { Badge, ProgressBar } from '@renderer/components/primitives'
import { BrandMark } from '@renderer/components/BrandMark'
import { Button } from '@renderer/components/Button'
import { Panel } from '@renderer/components/Panel'
import { Thumbnail } from '@renderer/components/Thumbnail'
import { ToolbarCount, ToolbarSeparator, ViewToolbar } from '@renderer/components/ViewToolbar'
import { EmptyState } from '@renderer/components/states'

function StatTile({
  icon,
  label,
  value,
  hint,
  tone = 'accent'
}: {
  icon: ReactNode
  label: string
  value: string
  hint?: string
  tone?: 'accent' | 'signal' | 'warning' | 'brand'
}): React.JSX.Element {
  const toneClass = {
    accent: 'border-transparent bg-accent text-on-accent',
    signal: 'border-transparent bg-signal text-on-accent',
    warning: 'border-transparent bg-warning text-on-accent',
    brand: 'border-transparent bg-brand text-ink'
  }[tone]

  const valueClass = {
    accent: 'text-accent',
    signal: 'text-signal',
    warning: 'text-warning',
    brand: 'text-ink'
  }[tone]

  return (
    <div className="glass flex items-center gap-3 rounded-panel bg-card p-3">
      <span
        className={cn(
          'flex size-9 shrink-0 items-center justify-center rounded-control border',
          toneClass
        )}
      >
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className={cn('num text-[19px] font-semibold leading-6', valueClass)}>{value}</p>
        <p className="truncate text-2xs text-ink-muted">{label}</p>
      </div>
      {hint ? <span className="shrink-0 text-[10px] text-ink-faint">{hint}</span> : null}
    </div>
  )
}

function ChecklistRow({
  done,
  title,
  description,
  action
}: {
  done: boolean
  title: string
  description: string
  action: ReactNode
}): React.JSX.Element {
  return (
    <li className="flex items-center gap-3 border-b border-line-soft px-3 py-2.5 last:border-b-0">
      <span
        className={cn(
          'flex size-5 shrink-0 items-center justify-center rounded-pill border',
          done ? 'border-signal/50 bg-signal-soft text-signal' : 'border-line bg-inset text-ink-faint'
        )}
      >
        {done ? <Check size={11} strokeWidth={3.5} /> : <CircleDashed size={11} />}
      </span>
      <div className="min-w-0 flex-1">
        <p className={cn('text-xs', done ? 'text-ink-muted line-through' : 'text-ink')}>{title}</p>
        <p className="truncate text-2xs text-ink-faint">{description}</p>
      </div>
      {done ? null : <div className="shrink-0">{action}</div>}
    </li>
  )
}

export function HomeView(): React.JSX.Element {
  const status = useWorkspace((s) => s.status)
  const datasets = useWorkspace((s) => s.datasets)
  const images = useWorkspace((s) => s.images)
  const tags = useWorkspace((s) => s.tags)
  const scan = useWorkspace((s) => s.scan)
  const settings = useWorkspace((s) => s.settings)
  const setView = useWorkspace((s) => s.setView)
  const setActiveDatasetId = useWorkspace((s) => s.setActiveDatasetId)
  const addDataset = useWorkspace((s) => s.addDataset)

  const apiReady = useWorkspace((s) => s.apiKey.ready)
  const apiVariable = useWorkspace((s) => s.apiKey.variable)
  const tagged = images.filter((image) => image.tags.length > 0).length
  const untagged = images.length - tagged
  const ratio = images.length === 0 ? 0 : Math.round((tagged / images.length) * 100)
  const scanning = scan !== null && scan.phase !== 'done'

  const steps = [
    {
      done: datasets.length > 0,
      title: '添加数据集文件夹',
      description: '把 ComfyUI 的出图目录纳进来，自动解析提示词与模型',
      action: (
        <Button size="sm" variant="secondary" disabled={scanning} onClick={() => void addDataset()}>
          <FolderPlus size={13} />
          添加
        </Button>
      )
    },
    {
      done: apiReady,
      title: '配置打标用的视觉模型',
      description: '填 OpenAI 兼容端点的 Base URL 与 API Key',
      action: (
        <Button size="sm" variant="secondary" onClick={() => setView('settings')}>
          去设置
        </Button>
      )
    },
    {
      done: tagged > 0,
      title: '让图片带上标签',
      description: '目前从每张图旁边的同名 .txt 读取，打标接入后可直接生成',
      action: (
        <Button size="sm" variant="secondary" onClick={() => setView('datasets')}>
          查看数据集
        </Button>
      )
    }
  ]

  const recentImages = [...images].sort((a, b) => b.mtime - a.mtime).slice(0, 8)

  return (
    <div className="flex h-full min-h-0 flex-col">
      <ViewToolbar
        actions={
          <>
            <ToolbarCount>
              {datasets.length} 个数据集 · {images.length} 张图片
            </ToolbarCount>
            <ToolbarSeparator />
            <Button
              size="sm"
              variant="secondary"
              disabled={scanning}
              onClick={() => void addDataset()}
            >
              <FolderPlus size={13} />
              添加数据集
            </Button>
          </>
        }
      >
        <Button size="sm" variant="ghost" onClick={() => setView('gallery')}>
          <Images size={13} />
          浏览图库
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setView('tagging')}>
          <Sparkles size={13} />
          打标工作台
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setView('tags')}>
          <Tags size={13} />
          标签库
        </Button>
      </ViewToolbar>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {status === 'loading' ? (
          <EmptyState title="正在读取本地数据…" description="从工作台的本地数据库载入数据集与图片索引。" />
        ) : datasets.length === 0 ? (
          <EmptyState
            title="工作台还是空的"
            description="先把 ComfyUI 的出图目录加进来。工作台会逐个读取文件头，解析出提示词、模型与 LoRA，并按文件夹整理成数据集。"
            action={
              <Button variant="primary" disabled={scanning} onClick={() => void addDataset()}>
                <FolderPlus size={14} />
                添加数据集文件夹
              </Button>
            }
          />
        ) : (
          <div className="mx-auto flex max-w-[1080px] flex-col gap-3 p-3">
            <div
              className="glass flex items-center gap-3 rounded-panel p-4"
              style={{
                backgroundImage:
                  'linear-gradient(118deg, var(--brand) 0%, var(--brand-deep) 58%, var(--bg-card) 140%)'
              }}
            >
              <BrandMark size={38} />
              <div className="min-w-0 flex-1">
                <h2 className="text-[15px] font-semibold leading-5 text-ink">LP-Tagger</h2>
                <p className="truncate text-2xs text-ink-soft">
                  {datasets.length} 个数据集 · {formatCount(images.length)} 张图片 ·{' '}
                  {formatCount(tags.length)} 个标签词条，全部保存在本机
                </p>
              </div>
              <div className="hidden shrink-0 items-center gap-2 lg:flex">
                <Badge tone={apiReady ? 'signal' : 'warning'}>
                  {apiReady ? (apiVariable ? `密钥 · ${apiVariable}` : 'API 已就绪') : 'API 未配置'}
                </Badge>
                {scanning ? <Badge tone="accent">正在扫描</Badge> : null}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
              <StatTile
                icon={<Images size={16} />}
                label="图片总数"
                value={formatCount(images.length)}
                hint={`${datasets.length} 个数据集`}
              />
              <StatTile
                icon={<Check size={16} />}
                label="已有标签"
                value={`${ratio}%`}
                hint={`${untagged} 张待处理`}
                tone="signal"
              />
              <StatTile
                icon={<Tags size={16} />}
                label="标签词条"
                value={formatCount(tags.length)}
                hint={`${tags.filter((tag) => tag.blacklisted).length} 个已屏蔽`}
                tone="brand"
              />
              <StatTile
                icon={<Sparkles size={16} />}
                label="待打标"
                value={formatCount(untagged)}
                hint={apiReady ? '可以开始' : '先配 API'}
                tone={untagged > 0 ? 'warning' : 'signal'}
              />
            </div>

            <div className="grid gap-3 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
              <Panel
                title="数据集"
                actions={
                  <Button size="sm" variant="ghost" onClick={() => setView('datasets')}>
                    全部
                    <ArrowRight size={12} />
                  </Button>
                }
              >
                <ul>
                  {datasets.slice(0, 5).map((dataset) => {
                    const complete =
                      dataset.imageCount > 0 && dataset.taggedCount === dataset.imageCount
                    return (
                      <li key={dataset.id}>
                        <button
                          type="button"
                          onClick={() => {
                            setActiveDatasetId(dataset.id)
                            setView('datasets')
                          }}
                          className="t-fast flex w-full items-center gap-3 border-b border-line-soft px-3 py-2 text-left last:border-b-0 hover:bg-hover"
                        >
                          <span className="flex size-8 shrink-0 items-center justify-center rounded-control border border-line bg-inset text-ink-muted">
                            <LayoutGrid size={14} />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-xs text-ink">{dataset.name}</span>
                            <span className="mt-1 flex items-center gap-2">
                              <ProgressBar
                                value={dataset.taggedCount}
                                max={Math.max(dataset.imageCount, 1)}
                                tone={complete ? 'signal' : 'accent'}
                                className="min-w-0 flex-1"
                                label={`${dataset.name} 打标进度`}
                              />
                              <span className="num shrink-0 text-[10px] text-ink-muted">
                                {dataset.taggedCount}/{dataset.imageCount}
                              </span>
                            </span>
                          </span>
                          <span className="shrink-0 text-[10px] text-ink-faint">
                            {formatRelativeTime(dataset.updatedAt)}
                          </span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </Panel>

              <Panel
                title="最近改动"
                actions={
                  <Button size="sm" variant="ghost" onClick={() => setView('gallery')}>
                    去图库
                    <ArrowRight size={12} />
                  </Button>
                }
              >
                <ul>
                  {recentImages.map((image) => (
                    <li key={image.id}>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveDatasetId(image.datasetId)
                          setView('gallery')
                        }}
                        className="t-fast flex w-full items-center gap-2.5 border-b border-line-soft px-3 py-2 text-left last:border-b-0 hover:bg-hover"
                      >
                        <span className="size-8 shrink-0 overflow-hidden rounded-xs border border-line-soft bg-inset">
                          <Thumbnail imageId={image.id} alt={image.fileName} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-xs text-ink-soft">
                            {truncateMiddle(image.fileName, 28)}
                          </span>
                          <span className="text-[10px] text-ink-faint">
                            {image.source === 'none' ? '无元数据' : image.source.toUpperCase()} ·{' '}
                            {image.tags.length} 个标签
                          </span>
                        </span>
                        <span className="shrink-0 text-[10px] text-ink-faint">
                          {formatRelativeTime(image.mtime)}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </Panel>
            </div>

            <Panel
              title="开始使用"
              actions={
                <Button size="sm" variant="secondary" onClick={() => setView('tagging')}>
                  <Play size={12} />
                  打标工作台
                </Button>
              }
            >
              <ul>
                {steps.map((step) => (
                  <ChecklistRow key={step.title} {...step} />
                ))}
              </ul>
            </Panel>
          </div>
        )}
      </div>
    </div>
  )
}
