import {
  CircleHelp,
  Home,
  Images,
  LayoutGrid,
  SlidersHorizontal,
  Sparkles,
  Tags
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useWorkspace, type ViewId } from '@renderer/lib/store'
import { cn } from '@renderer/lib/utils'
import { Tooltip } from '@renderer/components/Tooltip'
import { BrandMark } from '@renderer/components/BrandMark'
import { Kbd } from '@renderer/components/primitives'

export interface RailItem {
  id: ViewId
  label: string
  icon: LucideIcon
  hint: string
}

export const RAIL_ITEMS: RailItem[] = [
  { id: 'home', label: '主页', icon: Home, hint: 'Ctrl+1' },
  { id: 'gallery', label: '图库', icon: Images, hint: 'Ctrl+2' },
  { id: 'datasets', label: '数据集', icon: LayoutGrid, hint: 'Ctrl+3' },
  { id: 'tagging', label: '打标', icon: Sparkles, hint: 'Ctrl+4' },
  { id: 'tags', label: '标签库', icon: Tags, hint: 'Ctrl+5' },
  { id: 'settings', label: '设置', icon: SlidersHorizontal, hint: 'Ctrl+6' }
]

export function NavRail(): React.JSX.Element {
  const view = useWorkspace((s) => s.view)
  const setView = useWorkspace((s) => s.setView)
  const appVersion = useWorkspace((s) => s.appVersion)
  const pushToast = useWorkspace((s) => s.pushToast)

  return (
    <nav
      aria-label="主导航"
      className="rail-glass relative flex w-[var(--rail-w)] shrink-0 flex-col items-stretch py-3"
    >
      <div className="mb-2.5 flex justify-center">
        <Tooltip side="right" label="ComfyUI 工作台">
          <span className="flex size-9 items-center justify-center overflow-hidden rounded-pill shadow-[inset_0_1px_0_0_oklch(1_0_0/0.35),0_4px_12px_-4px_oklch(0_0_0/0.5)]">
            <BrandMark size={38} />
          </span>
        </Tooltip>
      </div>

      <div className="flex flex-col gap-1">
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
                  't-fast relative flex h-13 flex-col items-center justify-center gap-1 rounded-r-panel outline-offset-[-3px]',
                  active
                    ? 'rail-active-glass text-ink-rail-strong'
                    : 'text-ink-rail hover:bg-white/15 hover:text-ink-rail-strong'
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    't-fast absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 bg-signal',
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

      <div className="mt-auto flex flex-col gap-1.5">
        <Tooltip side="right" label="帮助与快捷键">
          <button
            type="button"
            aria-label="帮助与快捷键"
            onClick={() =>
              pushToast({
                tone: 'info',
                title: '快捷键',
                description:
                  'Ctrl+K 命令面板 · Ctrl+B 检视面板 · Ctrl+A 全选 · Esc 取消选择'
              })
            }
            className="t-fast flex h-10 w-full items-center justify-center rounded-r-panel text-ink-rail outline-offset-[-3px] hover:bg-white/15 hover:text-ink-rail-strong"
          >
            <CircleHelp size={18} strokeWidth={1.8} />
          </button>
        </Tooltip>
        <div className="px-3">
          <div className="rounded-pill border border-black/15 bg-black/10 py-1.5 text-center">
            <p className="num text-[10px] leading-none text-ink-rail-faint">
              v{appVersion || '—'}
            </p>
          </div>
        </div>
      </div>
    </nav>
  )
}
