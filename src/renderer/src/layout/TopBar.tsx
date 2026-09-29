import { PanelRight, Search } from 'lucide-react'
import { useWorkspace } from '@renderer/lib/store'
import { IconButton } from '@renderer/components/IconButton'
import { Kbd } from '@renderer/components/primitives'
import { Segmented } from '@renderer/components/fields'
import { Tooltip } from '@renderer/components/Tooltip'
import { WindowControls } from './WindowControls'

export function TopBar({
  title,
  description
}: {
  title: string
  description: string
}): React.JSX.Element {
  const setCommandOpen = useWorkspace((s) => s.setCommandOpen)
  const density = useWorkspace((s) => s.density)
  const setDensity = useWorkspace((s) => s.setDensity)
  const inspectorOpen = useWorkspace((s) => s.inspectorOpen)
  const toggleInspector = useWorkspace((s) => s.toggleInspector)

  return (
    <header className="drag-region flex h-[var(--topbar-h)] shrink-0 items-center gap-4 border-b border-line bg-surface pl-4">
      <div className="flex min-w-0 flex-col justify-center">
        <h1 className="truncate text-[13px] font-semibold leading-4 text-ink">{title}</h1>
        <p className="truncate text-2xs leading-[14px] text-ink-muted">{description}</p>
      </div>

      <div className="no-drag mx-auto flex w-[min(430px,34vw)] shrink-0 items-center">
        <button
          type="button"
          onClick={() => setCommandOpen(true)}
          className="field t-fast flex h-8 w-full items-center gap-2 px-2.5 text-ink-faint hover:border-line-strong"
        >
          <Search size={14} className="shrink-0" />
          <span className="flex-1 truncate text-left text-xs">搜索图片、标签、提示词…</span>
          <span className="flex shrink-0 items-center gap-0.5">
            <Kbd>Ctrl</Kbd>
            <Kbd>K</Kbd>
          </span>
        </button>
      </div>

      <div className="no-drag flex shrink-0 items-center gap-1.5">
        <Segmented
          ariaLabel="界面密度"
          value={density}
          onChange={(value) => setDensity(value as 'comfortable' | 'compact')}
          items={[
            { value: 'comfortable', label: '舒适' },
            { value: 'compact', label: '紧凑' }
          ]}
        />
        <Tooltip label={inspectorOpen ? '隐藏检视面板' : '显示检视面板'} shortcut={<Kbd>Ctrl+B</Kbd>}>
          <IconButton
            active={inspectorOpen}
            aria-label={inspectorOpen ? '隐藏检视面板' : '显示检视面板'}
            onClick={toggleInspector}
          >
            <PanelRight size={16} />
          </IconButton>
        </Tooltip>
      </div>

      <WindowControls />
    </header>
  )
}
