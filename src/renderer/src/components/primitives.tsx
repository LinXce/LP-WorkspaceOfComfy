import type { ReactNode } from 'react'
import { cn } from '@renderer/lib/utils'

type Tone = 'neutral' | 'accent' | 'signal' | 'warning' | 'danger' | 'brand'

const TONES: Record<Tone, string> = {
  neutral: 'border-line bg-elevated text-ink-soft',
  accent: 'border-accent/35 bg-accent-soft text-accent',
  signal: 'border-signal/35 bg-signal-soft text-signal',
  warning: 'border-warning/35 bg-warning-soft text-warning',
  danger: 'border-danger/35 bg-danger-soft text-danger',
  brand: 'border-brand/50 bg-brand-soft text-ink'
}

export function Badge({
  children,
  tone = 'neutral',
  className,
  icon
}: {
  children: ReactNode
  tone?: Tone
  className?: string
  icon?: ReactNode
}): React.JSX.Element {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1 rounded-pill border px-2 py-px text-2xs font-medium leading-4',
        TONES[tone],
        className
      )}
    >
      {icon}
      {children}
    </span>
  )
}

export function Dot({ tone = 'neutral', className }: { tone?: Tone; className?: string }): React.JSX.Element {
  const color: Record<Tone, string> = {
    neutral: 'bg-ink-faint',
    accent: 'bg-accent',
    signal: 'bg-signal',
    warning: 'bg-warning',
    danger: 'bg-danger',
    brand: 'bg-brand'
  }
  return <span className={cn('inline-block size-1.5 shrink-0 rounded-pill', color[tone], className)} />
}

export function Kbd({ children }: { children: ReactNode }): React.JSX.Element {
  return (
    <kbd className="glass-flat inline-flex h-5 min-w-5 items-center justify-center rounded-xs bg-elevated px-1 font-sans text-2xs text-ink-muted">
      {children}
    </kbd>
  )
}

export function Skeleton({ className }: { className?: string }): React.JSX.Element {
  return <div className={cn('shimmer rounded-control', className)} />
}

export function ProgressBar({
  value,
  max = 100,
  tone = 'accent',
  className,
  label
}: {
  value: number
  max?: number
  tone?: 'accent' | 'signal' | 'danger'
  className?: string
  label?: string
}): React.JSX.Element {
  const pct = max <= 0 ? 0 : Math.min(100, Math.max(0, (value / max) * 100))
  const fill: Record<string, string> = {
    accent: 'bg-accent',
    signal: 'bg-signal',
    danger: 'bg-danger'
  }
  return (
    <div
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-label={label}
      className={cn('h-1 w-full overflow-hidden rounded-pill bg-inset', className)}
    >
      <div
        className={cn('h-full rounded-pill t-base', fill[tone])}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

export function SectionLabel({
  children,
  action
}: {
  children: ReactNode
  action?: ReactNode
}): React.JSX.Element {
  return (
    <div className="flex h-7 items-center justify-between gap-2">
      <span className="text-2xs font-medium tracking-wide text-ink-muted">{children}</span>
      {action}
    </div>
  )
}
