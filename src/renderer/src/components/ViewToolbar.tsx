import type { ReactNode } from 'react'

export function ViewToolbar({
  children,
  actions
}: {
  children: ReactNode
  actions?: ReactNode
}): React.JSX.Element {
  return (
    <div className="glass-chrome flex min-h-11 shrink-0 flex-wrap items-center gap-x-2 gap-y-1.5 border-b border-line-soft bg-surface px-3 py-1.5">
      <div className="flex min-w-0 flex-wrap items-center gap-2">{children}</div>
      {actions ? (
        <div className="ml-auto flex flex-wrap items-center justify-end gap-2">{actions}</div>
      ) : null}
    </div>
  )
}

export function ToolbarSeparator(): React.JSX.Element {
  return <span aria-hidden className="mx-0.5 h-5 w-px shrink-0 bg-white/15" />
}

export function ToolbarCount({ children }: { children: ReactNode }): React.JSX.Element {
  return <span className="num shrink-0 whitespace-nowrap text-2xs text-ink-muted">{children}</span>
}
