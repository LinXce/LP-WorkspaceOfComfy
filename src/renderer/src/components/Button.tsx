import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { cn } from '@renderer/lib/utils'

export type ButtonVariant = 'primary' | 'signal' | 'secondary' | 'ghost' | 'danger' | 'link'
export type ButtonSize = 'sm' | 'md'

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    'bg-accent text-on-accent hover:bg-accent-hover active:bg-accent-press ' +
    'shadow-[inset_0_1px_0_0_oklch(1_0_0/0.28),inset_0_0_0_1px_oklch(0.8_0.12_250/0.5),0_8px_20px_-10px_oklch(0.66_0.145_250/0.95)]',
  signal:
    'bg-signal text-on-accent hover:brightness-105 active:brightness-95 ' +
    'shadow-[inset_0_1px_0_0_oklch(1_0_0/0.35),inset_0_0_0_1px_oklch(0.95_0.12_135/0.45),0_8px_20px_-10px_oklch(0.85_0.185_130/0.8)]',
  secondary: 'glass bg-card text-ink hover:bg-hover',
  ghost: 'glass bg-white/5 text-ink-soft hover:bg-hover hover:text-ink',
  danger:
    'glass bg-danger-soft text-danger hover:bg-danger/25 ' +
    'hover:shadow-[inset_0_1px_0_0_oklch(1_0_0/0.14),inset_0_0_0_1px_oklch(0.65_0.2_27/0.55)]',
  link: 'text-accent hover:text-accent-hover underline-offset-4 hover:underline'
}

const SIZES: Record<ButtonSize, string> = {
  sm: 'h-7 gap-1.5 px-2.5 text-xs',
  md: 'h-8 gap-2 px-3 text-[13px]'
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'secondary', size = 'md', className, type = 'button', ...props },
  ref
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        't-fast inline-flex shrink-0 select-none items-center justify-center whitespace-nowrap rounded-pill font-medium',
        'disabled:pointer-events-none disabled:opacity-40',
        variant === 'link' ? 'h-auto px-0' : SIZES[size],
        VARIANTS[variant],
        className
      )}
      {...props}
    />
  )
})
