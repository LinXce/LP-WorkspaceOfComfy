import type { ReactNode } from 'react'
import { cn } from '@renderer/lib/utils'

export function Panel({
  title,
  actions,
  children,
  className,
  bodyClassName
}: {
  title?: ReactNode
  actions?: ReactNode
  children: ReactNode
  className?: string
  bodyClassName?: string
}): React.JSX.Element {
  return (
    <section
      className={cn('flex min-w-0 flex-col rounded-panel border border-line bg-surface', className)}
    >
      {title || actions ? (
        <header className="flex h-10 shrink-0 items-center justify-between gap-3 border-b border-line-soft px-3">
          <h2 className="truncate text-[13px] font-medium text-ink">{title}</h2>
          {actions ? <div className="flex shrink-0 items-center gap-1">{actions}</div> : null}
        </header>
      ) : null}
      <div className={cn('min-w-0 flex-1', bodyClassName)}>{children}</div>
    </section>
  )
}

export function InspectorGroup({
  title,
  actions,
  children,
  tone = 'default'
}: {
  title: ReactNode
  actions?: ReactNode
  children: ReactNode
  tone?: 'default' | 'accent'
}): React.JSX.Element {
  return (
    <div className="border-b border-line-soft px-3 py-3 last:border-b-0">
      <div className="mb-2 flex h-5 items-center justify-between gap-2">
        <h3
          className={cn(
            'text-2xs font-semibold tracking-wide',
            tone === 'accent' ? 'text-accent' : 'text-ink-muted'
          )}
        >
          {title}
        </h3>
        {actions ? <div className="flex items-center gap-0.5">{actions}</div> : null}
      </div>
      {children}
    </div>
  )
}

export function DefinitionRow({
  label,
  children,
  mono
}: {
  label: string
  children: ReactNode
  mono?: boolean
}): React.JSX.Element {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1">
      <span className="shrink-0 text-2xs text-ink-faint">{label}</span>
      <span
        className={cn(
          'min-w-0 truncate text-right text-xs text-ink-soft',
          mono && 'font-mono text-2xs'
        )}
        title={typeof children === 'string' ? children : undefined}
      >
        {children}
      </span>
    </div>
  )
}
