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

/**
 * 导航项尺寸。高度和间距用常量而不是 Tailwind 类，
 * 因为下面那块滑动高亮要按这两个数算位移，必须是同一个来源。
 */
const ITEM_HEIGHT = 52
const ITEM_GAP = 4

export function NavRail(): React.JSX.Element {
  const view = useWorkspace((s) => s.view)
  const setView = useWorkspace((s) => s.setView)
  const appVersion = useWorkspace((s) => s.appVersion)
  const pushToast = useWorkspace((s) => s.pushToast)
  const activeIndex = Math.max(
    RAIL_ITEMS.findIndex((item) => item.id === view),
    0
  )

  return (
    <nav
      aria-label="主导航"
      className="rail-glass relative flex w-[var(--rail-w)] shrink-0 flex-col items-stretch py-3"
    >
      <div className="mb-2.5 flex justify-center">
        <Tooltip side="right" label="LP-Tagger">
          <span className="flex size-9 items-center justify-center overflow-hidden rounded-pill shadow-[inset_0_1px_0_0_oklch(1_0_0/0.35),0_4px_12px_-4px_oklch(0_0_0/0.5)]">
            <BrandMark size={38} />
          </span>
        </Tooltip>
      </div>

      <div className="relative grid" style={{ gap: ITEM_GAP }}>
        {/* 选中高亮是一整块，切换时滑过去而不是原地闪一下；
            最左边那根柠檬绿竖条跟着一起走 */}
        <span
          aria-hidden
          className="rail-active-glass t-base pointer-events-none absolute inset-x-0 top-0 rounded-r-panel"
          style={{
            height: ITEM_HEIGHT,
            transform: `translateY(${activeIndex * (ITEM_HEIGHT + ITEM_GAP)}px)`
          }}
        >
          <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 bg-signal" />
        </span>

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
                style={{ height: ITEM_HEIGHT }}
                className={cn(
                  't-base relative z-10 flex flex-col items-center justify-center gap-1 rounded-r-panel outline-offset-[-3px]',
                  active
                    ? 'text-ink-rail-strong'
                    : 'text-ink-rail hover:bg-white/15 hover:text-ink-rail-strong'
                )}
              >
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
