import { useEffect, useMemo, useRef, useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import {
  ArrowDown,
  CornerDownLeft,
  FolderPlus,
  Home,
  Images,
  LayoutGrid,
  PanelRight,
  Play,
  Rows3,
  Search,
  Tags,
  SlidersHorizontal,
  Sparkles
} from 'lucide-react'
import { useWorkspace, type ViewId } from '@renderer/lib/store'
import { cn } from '@renderer/lib/utils'

interface Command {
  id: string
  label: string
  group: string
  icon: React.JSX.Element
  hint?: string
  run: () => void
}

export function CommandPalette(): React.JSX.Element {
  const open = useWorkspace((s) => s.commandOpen)
  const setOpen = useWorkspace((s) => s.setCommandOpen)
  const pushToast = useWorkspace((s) => s.pushToast)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const listRef = useRef<HTMLDivElement>(null)

  const commands = useMemo<Command[]>(() => {
    const go = (view: ViewId, label: string, icon: React.JSX.Element, hint: string): Command => ({
      id: `view-${view}`,
      label,
      group: '切换视图',
      icon,
      hint,
      run: () => useWorkspace.getState().setView(view)
    })

    return [
      go('home', '打开 主页', <Home size={15} />, 'Ctrl+1'),
      go('gallery', '打开 图库', <Images size={15} />, 'Ctrl+2'),
      go('datasets', '打开 数据集', <LayoutGrid size={15} />, 'Ctrl+3'),
      go('tagging', '打开 打标工作台', <Sparkles size={15} />, 'Ctrl+4'),
      go('tags', '打开 标签库', <Tags size={15} />, 'Ctrl+5'),
      go('settings', '打开 设置', <SlidersHorizontal size={15} />, 'Ctrl+6'),
      {
        id: 'select-all',
        label: '全选当前视图的项目',
        group: '选择',
        icon: <Rows3 size={15} />,
        hint: 'Ctrl+A',
        run: () => useWorkspace.getState().selectAll()
      },
      {
        id: 'clear-selection',
        label: '取消全部选择',
        group: '选择',
        icon: <Rows3 size={15} />,
        hint: 'Esc',
        run: () => useWorkspace.getState().clearSelection()
      },
      {
        id: 'toggle-inspector',
        label: '显示 / 隐藏检视面板',
        group: '界面',
        icon: <PanelRight size={15} />,
        hint: 'Ctrl+B',
        run: () => useWorkspace.getState().toggleInspector()
      },
      {
        id: 'toggle-density',
        label: '切换紧凑密度',
        group: '界面',
        icon: <Rows3 size={15} />,
        run: () => {
          const s = useWorkspace.getState()
          s.setDensity(s.density === 'compact' ? 'comfortable' : 'compact')
        }
      },
      {
        id: 'add-dataset',
        label: '添加数据集文件夹',
        group: '数据集',
        icon: <FolderPlus size={15} />,
        run: () =>
          pushToast({
            tone: 'info',
            title: '添加数据集',
            description: '接入本地目录后，这里会弹出文件夹选择器。'
          })
      },
      {
        id: 'start-job',
        label: '开始批量打标',
        group: '打标',
        icon: <Play size={15} />,
        run: () => {
          useWorkspace.getState().setView('tagging')
          pushToast({
            tone: 'warning',
            title: '尚未配置 API',
            description: '先在设置里填写 Base URL 与 API Key。'
          })
        }
      }
    ]
  }, [pushToast])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return commands
    return commands.filter((c) => `${c.group}${c.label}`.toLowerCase().includes(q))
  }, [commands, query])

  const grouped = useMemo(() => {
    const map = new Map<string, Command[]>()
    for (const cmd of filtered) {
      const list = map.get(cmd.group) ?? []
      list.push(cmd)
      map.set(cmd.group, list)
    }
    return [...map.entries()]
  }, [filtered])

  useEffect(() => {
    if (open) {
      setQuery('')
      setActive(0)
    }
  }, [open])

  useEffect(() => setActive(0), [query])

  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)
    el?.scrollIntoView({ block: 'nearest' })
  }, [active])

  const runActive = (): void => {
    const cmd = filtered[active]
    if (!cmd) return
    setOpen(false)
    cmd.run()
  }

  const onKeyDown = (event: React.KeyboardEvent): void => {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActive((i) => Math.min(i + 1, filtered.length - 1))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActive((i) => Math.max(i - 1, 0))
    } else if (event.key === 'Enter') {
      event.preventDefault()
      runActive()
    }
  }

  let flatIndex = -1

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-canvas/60 backdrop-blur-[3px]" />
        <Dialog.Content
          aria-label="命令面板"
          onKeyDown={onKeyDown}
          className="glass-strong fixed left-1/2 top-[11%] z-50 flex max-h-[62vh] w-[min(640px,88vw)] -translate-x-1/2 flex-col overflow-hidden rounded-panel bg-elevated"
        >
          <Dialog.Title className="sr-only">命令面板</Dialog.Title>
          <Dialog.Description className="sr-only">
            输入关键字筛选命令，方向键选择，回车执行。
          </Dialog.Description>

          <div className="flex h-11 shrink-0 items-center gap-2.5 border-b border-line-soft px-3">
            <Search size={15} className="shrink-0 text-ink-faint" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="输入命令，例如「打标」「紧凑」"
              aria-label="搜索命令"
              className="h-full flex-1 bg-transparent text-[13px] outline-none placeholder:text-ink-faint"
            />
            <span className="flex shrink-0 items-center gap-1 text-2xs text-ink-faint">
              <ArrowDown size={11} />
              选择
              <CornerDownLeft size={11} className="ml-1" />
              执行
            </span>
          </div>

          <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto p-1.5">
            {grouped.length === 0 ? (
              <p className="px-3 py-8 text-center text-xs text-ink-muted">
                没有匹配「{query}」的命令
              </p>
            ) : (
              grouped.map(([group, items]) => (
                <div key={group} className="mb-1 last:mb-0">
                  <p className="px-2 py-1.5 text-2xs font-medium text-ink-faint">{group}</p>
                  {items.map((cmd) => {
                    flatIndex += 1
                    const index = flatIndex
                    return (
                      <button
                        key={cmd.id}
                        type="button"
                        data-index={index}
                        onMouseMove={() => setActive(index)}
                        onClick={() => {
                          setOpen(false)
                          cmd.run()
                        }}
                        className={cn(
                          't-fast flex h-8 w-full items-center gap-2.5 rounded-pill px-3 text-left text-[13px]',
                          index === active
                            ? 'bg-accent-soft text-ink'
                            : 'text-ink-soft hover:bg-hover'
                        )}
                      >
                        <span className={index === active ? 'text-accent' : 'text-ink-faint'}>
                          {cmd.icon}
                        </span>
                        <span className="min-w-0 flex-1 truncate">{cmd.label}</span>
                        {cmd.hint ? (
                          <span className="shrink-0 text-2xs text-ink-faint">{cmd.hint}</span>
                        ) : null}
                      </button>
                    )
                  })}
                </div>
              ))
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
