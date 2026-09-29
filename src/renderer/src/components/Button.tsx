import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { cn } from '@renderer/lib/utils'

export type ButtonVariant = 'primary' | 'signal' | 'secondary' | 'ghost' | 'danger' | 'link'
export type ButtonSize = 'sm' | 'md'

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-accent text-on-accent hover:bg-accent-hover active:bg-accent-press',
  signal: 'bg-signal text-on-accent hover:brightness-105 active:brightness-95',
  secondary: 'border border-line bg-elevated text-ink hover:bg-hover hover:border-line-strong',
  ghost: 'text-ink-soft hover:bg-hover hover:text-ink',
  danger: 'border border-transparent bg-danger-soft text-danger hover:border-danger',
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
        't-fast inline-flex shrink-0 select-none items-center justify-center whitespace-nowrap rounded-control font-medium',
        'disabled:pointer-events-none disabled:opacity-40',
        variant === 'link' ? 'h-auto px-0' : SIZES[size],
        VARIANTS[variant],
        className
      )}
      {...props}
    />
  )
})
