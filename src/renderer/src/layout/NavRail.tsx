import { CircleHelp, Images, LayoutGrid, SlidersHorizontal, Sparkles, Tags } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useWorkspace, type ViewId } from '@renderer/lib/store'
import { cn } from '@renderer/lib/utils'
import { Tooltip } from '@renderer/components/Tooltip'
import { Kbd } from '@renderer/components/primitives'

export interface RailItem {
  id: ViewId
  label: string
  icon: LucideIcon
  hint: string
}

export const RAIL_ITEMS: RailItem[] = [
  { id: 'gallery', label: '图库', icon: Images, hint: 'Ctrl+1' },
  { id: 'datasets', label: '数据集', icon: LayoutGrid, hint: 'Ctrl+2' },
  { id: 'tagging', label: '打标', icon: Sparkles, hint: 'Ctrl+3' },
  { id: 'tags', label: '标签库', icon: Tags, hint: 'Ctrl+4' },
  { id: 'settings', label: '设置', icon: SlidersHorizontal, hint: 'Ctrl+5' }
]

export function NavRail(): React.JSX.Element {
  const view = useWorkspace((s) => s.view)
  const setView = useWorkspace((s) => s.setView)
  const pushToast = useWorkspace((s) => s.pushToast)

  return (
    <nav
      aria-label="主导航"
      className="flex w-[var(--rail-w)] shrink-0 flex-col items-stretch border-r border-line bg-surface py-2"
    >
      <div className="flex flex-col gap-0.5">
        {RAIL_ITEMS.map((item) => {
          const active = view === item.id
          const Icon = item.icon
          return (
            <Tooltip
              key={item.id}
              side="right"
              label={item.label}
              shortcut={<Kbd>{item.hint}</Kbd>}
            >
              <button
                type="button"
                aria-current={active ? 'page' : undefined}
                onClick={() => setView(item.id)}
                className={cn(
                  't-fast relative flex h-13 flex-col items-center justify-center gap-1 outline-offset-[-3px]',
                  active
                    ? 'bg-elevated text-ink'
                    : 'text-ink-muted hover:bg-hover hover:text-ink-soft'
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    'absolute left-0 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-r-pill bg-signal t-fast',
                    active ? 'opacity-100' : 'opacity-0'
                  )}
                />
                <Icon size={19} strokeWidth={active ? 2.1 : 1.8} />
                <span className="text-[10px] leading-none tracking-tight">{item.label}</span>
              </button>
            </Tooltip>
          )
        })}
      </div>

      <div className="mt-auto flex flex-col gap-0.5">
        <Tooltip side="right" label="帮助与快捷键">
          <button
            type="button"
            aria-label="帮助与快捷键"
            onClick={() =>
              pushToast({
                tone: 'info',
                title: '快捷键',
                description: 'Ctrl+K 命令面板 · Ctrl+B 检视面板 · Ctrl+A 全选 · Esc 取消选择'
              })
            }
            className="t-fast flex h-11 items-center justify-center text-ink-muted outline-offset-[-3px] hover:bg-hover hover:text-ink-soft"
          >
            <CircleHelp size={18} strokeWidth={1.8} />
          </button>
        </Tooltip>
        <div className="px-3 pt-1">
          <div className="rounded-control border border-line-soft bg-inset py-1.5 text-center">
            <p className="num text-[10px] leading-none text-ink-faint">v0.1.0</p>
          </div>
        </div>
      </div>
    </nav>
  )
}
