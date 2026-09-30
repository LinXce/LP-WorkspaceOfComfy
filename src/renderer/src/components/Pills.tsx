import { cn } from '@renderer/lib/utils'

export interface PillItem {
  value: string
  label: string
  title?: string
  icon?: React.JSX.Element
}

/** 横向胶囊单选组，用于服务来源、预置模板这类「选一个」的场景。 */
export function Pills({
  items,
  value,
  onChange,
  ariaLabel,
  className
}: {
  items: PillItem[]
  value: string
  onChange: (value: string) => void
  ariaLabel: string
  className?: string
}): React.JSX.Element {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn('flex flex-wrap items-center gap-1.5', className)}
    >
      {items.map((item) => {
        const selected = item.value === value
        return (
          <button
            key={item.value}
            type="button"
            role="radio"
            aria-checked={selected}
            title={item.title}
            onClick={() => onChange(item.value)}
            className={cn(
              't-fast inline-flex h-7 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-pill px-3 text-xs outline-offset-2',
              selected
                ? 'glass-accent bg-elevated text-ink'
                : 'glass text-ink-muted hover:bg-hover hover:text-ink'
            )}
          >
            {item.icon}
            {item.label}
          </button>
        )
      })}
    </div>
  )
}
