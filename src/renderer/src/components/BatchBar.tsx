import type { ReactNode } from 'react'
import { X } from 'lucide-react'
import { Button } from './Button'

export function BatchBar({
  count,
  summary,
  children,
  onClear
}: {
  count: number
  summary?: ReactNode
  children: ReactNode
  onClear: () => void
}): React.JSX.Element {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-3 z-30 flex justify-center px-4">
      <div className="pointer-events-auto flex max-w-full items-center gap-2 rounded-panel border border-line-strong bg-elevated px-3 py-2 shadow-[var(--shadow-pop)]">
        <span className="num shrink-0 rounded-pill bg-accent-soft px-2 py-0.5 text-2xs font-semibold text-accent">
          {count} 项
        </span>
        {summary ? (
          <span className="max-w-[22ch] truncate text-xs text-ink-muted">{summary}</span>
        ) : null}
        <span className="mx-1 h-5 w-px shrink-0 bg-line" />
        <div className="flex items-center gap-1.5">{children}</div>
        <span className="mx-1 h-5 w-px shrink-0 bg-line" />
        <Button variant="ghost" size="sm" onClick={onClear} aria-label="取消选择">
          <X size={13} />
          取消选择
        </Button>
      </div>
    </div>
  )
}
