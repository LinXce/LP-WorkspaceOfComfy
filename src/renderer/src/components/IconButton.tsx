import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { cn } from '@renderer/lib/utils'

type IconButtonVariant = 'ghost' | 'solid' | 'danger'
type IconButtonSize = 'sm' | 'md' | 'lg'

const VARIANTS: Record<IconButtonVariant, string> = {
  ghost: 'glass bg-white/5 text-ink-soft hover:bg-hover hover:text-ink',
  solid: 'glass bg-card text-ink hover:bg-hover',
  danger:
    'glass bg-white/5 text-ink-muted hover:bg-danger-soft hover:text-danger ' +
    'hover:shadow-[inset_0_1px_0_0_oklch(1_0_0/0.14),inset_0_0_0_1px_oklch(0.65_0.2_27/0.55)]'
}

const SIZES: Record<IconButtonSize, string> = {
  sm: 'size-6 rounded-pill',
  md: 'size-8 rounded-pill',
  lg: 'size-10 rounded-pill'
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
        active ? 'glass glass-accent bg-accent-soft text-accent' : VARIANTS[variant],
        className
      )}
      {...props}
    />
  )
})
