import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { cn } from '@renderer/lib/utils'

type IconButtonVariant = 'ghost' | 'solid' | 'danger'
type IconButtonSize = 'sm' | 'md' | 'lg'

const VARIANTS: Record<IconButtonVariant, string> = {
  ghost: 'text-ink-soft hover:bg-hover hover:text-ink',
  solid: 'border border-line bg-elevated text-ink hover:bg-hover hover:border-line-strong',
  danger: 'text-ink-muted hover:bg-danger-soft hover:text-danger'
}

const SIZES: Record<IconButtonSize, string> = {
  sm: 'size-6 rounded-xs',
  md: 'size-8 rounded-control',
  lg: 'size-10 rounded-control'
}

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: IconButtonVariant
  size?: IconButtonSize
  active?: boolean
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { variant = 'ghost', size = 'md', active, className, type = 'button', ...props },
  ref
) {
  return (
    <button
      ref={ref}
      type={type}
      aria-pressed={active}
      className={cn(
        't-fast inline-flex shrink-0 items-center justify-center',
        'disabled:pointer-events-none disabled:opacity-40',
        SIZES[size],
        active ? 'bg-accent-soft text-accent' : VARIANTS[variant],
        className
      )}
      {...props}
    />
  )
})
