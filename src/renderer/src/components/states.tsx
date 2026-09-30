import type { ReactNode } from 'react'
import { AlertTriangle, Inbox, Loader2 } from 'lucide-react'
import { cn } from '@renderer/lib/utils'
import { Button } from './Button'

export function EmptyState({
  icon,
  title,
  description,
  action,
  secondary,
  className
}: {
  icon?: ReactNode
  title: string
  description?: ReactNode
  action?: ReactNode
  secondary?: ReactNode
  className?: string
}): React.JSX.Element {
  return (
    <div
      className={cn(
        'flex h-full min-h-[220px] flex-col items-center justify-center gap-3 px-8 py-10 text-center',
        className
      )}
    >
      <div className="glass flex size-11 items-center justify-center rounded-pill bg-white/5 text-ink-faint">
        {icon ?? <Inbox size={18} />}
      </div>
      <div className="flex max-w-[38ch] flex-col gap-1.5">
        <p className="text-[13px] font-medium text-ink">{title}</p>
        {description ? (
          <p className="text-xs leading-[1.6] text-ink-muted">{description}</p>
        ) : null}
      </div>
      {action || secondary ? (
        <div className="mt-1 flex items-center gap-2">
          {action}
          {secondary}
        </div>
      ) : null}
    </div>
  )
}

export function ErrorState({
  title = '加载失败',
  description,
  onRetry,
  className
}: {
  title?: string
  description?: ReactNode
  onRetry?: () => void
  className?: string
}): React.JSX.Element {
  return (
    <div
      role="alert"
      className={cn(
        'flex h-full min-h-[220px] flex-col items-center justify-center gap-3 px-8 py-10 text-center',
        className
      )}
    >
      <div className="glass flex size-11 items-center justify-center rounded-pill bg-danger-soft text-danger">
        <AlertTriangle size={18} />
      </div>
      <div className="flex max-w-[42ch] flex-col gap-1.5">
        <p className="text-[13px] font-medium text-ink">{title}</p>
        {description ? (
          <p className="text-xs leading-[1.6] text-ink-muted">{description}</p>
        ) : null}
      </div>
      {onRetry ? (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          重试
        </Button>
      ) : null}
    </div>
  )
}

export function LoadingState({
  title = '正在读取…',
  description,
  className
}: {
  title?: string
  description?: ReactNode
  className?: string
}): React.JSX.Element {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'flex h-full min-h-[220px] flex-col items-center justify-center gap-3 px-8 py-10 text-center',
        className
      )}
    >
      <Loader2 size={18} className="animate-spin text-accent" />
      <div className="flex max-w-[42ch] flex-col gap-1.5">
        <p className="text-[13px] font-medium text-ink">{title}</p>
        {description ? <p className="text-xs text-ink-muted">{description}</p> : null}
      </div>
    </div>
  )
}
