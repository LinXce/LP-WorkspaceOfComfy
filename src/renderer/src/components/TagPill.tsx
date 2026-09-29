import { X } from 'lucide-react'
import type { TagCategory } from '@shared/types'
import { cn } from '@renderer/lib/utils'

const CATEGORY_CLASS: Record<TagCategory, string> = {
  person: 'border-accent/35 bg-accent-soft text-accent',
  style: 'border-signal/35 bg-signal-soft text-signal',
  scene: 'border-warning/35 bg-warning-soft text-warning',
  quality: 'border-danger/35 bg-danger-soft text-danger',
  object: 'border-brand/50 bg-brand-soft text-ink-soft',
  other: 'border-line bg-elevated text-ink-muted'
}

export function TagPill({
  name,
  category = 'other',
  onRemove,
  selected,
  onClick,
  size = 'md',
  muted,
  className
}: {
  name: string
  category?: TagCategory
  onRemove?: () => void
  selected?: boolean
  onClick?: () => void
  size?: 'sm' | 'md'
  muted?: boolean
  className?: string
}): React.JSX.Element {
  const interactive = Boolean(onClick)
  const Tag = interactive ? 'button' : 'span'

  return (
    <Tag
      type={interactive ? 'button' : undefined}
      onClick={onClick}
      aria-pressed={interactive ? selected : undefined}
      className={cn(
        'inline-flex max-w-full items-center gap-1 rounded-pill border font-medium',
        size === 'sm' ? 'h-5 px-1.5 text-2xs' : 'h-6 px-2 text-2xs',
        muted ? 'border-line bg-inset text-ink-faint line-through' : CATEGORY_CLASS[category],
        selected && 'ring-1 ring-accent ring-offset-1 ring-offset-canvas',
        interactive && 't-fast hover:brightness-110',
        className
      )}
    >
      <span className="truncate">{name}</span>
      {onRemove ? (
        <span
          role="button"
          tabIndex={-1}
          aria-label={`移除标签 ${name}`}
          onClick={(e) => {
            e.stopPropagation()
            onRemove()
          }}
          className="t-fast -mr-0.5 rounded-pill p-px hover:bg-on-accent/15"
        >
          <X size={10} strokeWidth={3} />
        </span>
      ) : null}
    </Tag>
  )
}
