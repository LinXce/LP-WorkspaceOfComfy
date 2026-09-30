import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { PanelRightClose, PanelRightOpen } from 'lucide-react'
import { useWorkspace } from '@renderer/lib/store'
import { IconButton } from '@renderer/components/IconButton'
import { Tooltip } from '@renderer/components/Tooltip'
import { cn } from '@renderer/lib/utils'

const MIN_WIDTH = 288
const MAX_WIDTH = 520
const NARROW_BREAKPOINT = 1180

export function InspectorPanel({
  title,
  children
}: {
  title: string
  children: ReactNode
}): React.JSX.Element {
  const open = useWorkspace((s) => s.inspectorOpen)
  const width = useWorkspace((s) => s.inspectorWidth)
  const setWidth = useWorkspace((s) => s.setInspectorWidth)
  const toggle = useWorkspace((s) => s.toggleInspector)
  const [narrow, setNarrow] = useState(false)

  useEffect(() => {
    const onResize = (): void => setNarrow(window.innerWidth < NARROW_BREAKPOINT)
    onResize()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const startResize = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      event.preventDefault()
      const startX = event.clientX
      const startWidth = useWorkspace.getState().inspectorWidth
      const target = event.currentTarget
      target.setPointerCapture(event.pointerId)

      const onMove = (moveEvent: PointerEvent): void => {
        const next = Math.min(
          MAX_WIDTH,
          Math.max(MIN_WIDTH, startWidth - (moveEvent.clientX - startX))
        )
        setWidth(next)
      }
      const onUp = (): void => {
        target.releasePointerCapture(event.pointerId)
        target.removeEventListener('pointermove', onMove)
        target.removeEventListener('pointerup', onUp)
      }
      target.addEventListener('pointermove', onMove)
      target.addEventListener('pointerup', onUp)
    },
    [setWidth]
  )

  const header = (
    <div className="flex h-10 shrink-0 items-center justify-between gap-2 border-b border-line-soft px-3">
      <h2 className="truncate text-2xs font-semibold tracking-wide text-ink-muted">{title}</h2>
      <Tooltip side="left" label="隐藏检视面板">
        <IconButton size="sm" aria-label="隐藏检视面板" onClick={toggle}>
          <PanelRightClose size={15} />
        </IconButton>
      </Tooltip>
    </div>
  )

  if (narrow) {
    if (!open) {
      return (
        <div className="glass-chrome flex w-10 shrink-0 flex-col items-center gap-2 border-l border-line-soft bg-surface py-2">
          <Tooltip side="left" label="显示检视面板">
            <IconButton size="sm" aria-label="显示检视面板" onClick={toggle}>
              <PanelRightOpen size={15} />
            </IconButton>
          </Tooltip>
        </div>
      )
    }
    return (
      <>
        <div
          aria-hidden
          onClick={toggle}
          className="absolute inset-0 z-30 bg-canvas/60"
        />
        <aside
          aria-label="检视面板"
          style={{ width: Math.min(width, 380) }}
          className="glass-strong absolute right-0 top-0 z-40 flex h-full shrink-0 flex-col border-l border-line-soft bg-surface"
        >
          {header}
          <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
        </aside>
      </>
    )
  }

  if (!open) {
    return (
      <div className="glass-chrome flex w-10 shrink-0 flex-col items-center gap-2 border-l border-line-soft bg-surface py-2">
        <Tooltip side="left" label="显示检视面板">
          <IconButton size="sm" aria-label="显示检视面板" onClick={toggle}>
            <PanelRightOpen size={15} />
          </IconButton>
        </Tooltip>
        <span className="mt-1 text-[10px] text-ink-faint [writing-mode:vertical-rl]">检视面板</span>
      </div>
    )
  }

  return (
    <aside
      aria-label="检视面板"
      style={{ width }}
      className={cn('glass-chrome relative flex shrink-0 flex-col border-l border-line-soft bg-surface')}
    >
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label="调整检视面板宽度"
        onPointerDown={startResize}
        className="absolute -left-1 top-0 z-20 h-full w-2 cursor-col-resize hover:bg-accent/25"
      />
      {header}
      <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
    </aside>
  )
}
