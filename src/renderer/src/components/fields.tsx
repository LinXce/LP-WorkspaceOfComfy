import {
  forwardRef,
  type InputHTMLAttributes,
  type ReactNode,
  type TextareaHTMLAttributes
} from 'react'
import * as RSelect from '@radix-ui/react-select'
import * as RSwitch from '@radix-ui/react-switch'
import * as RSlider from '@radix-ui/react-slider'
import * as RCheckbox from '@radix-ui/react-checkbox'
import * as RToggleGroup from '@radix-ui/react-toggle-group'
import { Check, ChevronDown, Minus, Search, X } from 'lucide-react'
import { cn } from '@renderer/lib/utils'

export function Field({
  label,
  hint,
  htmlFor,
  children,
  className
}: {
  label?: ReactNode
  hint?: ReactNode
  htmlFor?: string
  children: ReactNode
  className?: string
}): React.JSX.Element {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {label ? (
        <label htmlFor={htmlFor} className="text-xs font-medium text-ink-soft">
          {label}
        </label>
      ) : null}
      {children}
      {hint ? <p className="text-2xs leading-4 text-ink-faint">{hint}</p> : null}
    </div>
  )
}

export function SettingRow({
  label,
  description,
  control,
  htmlFor
}: {
  label: string
  description?: string
  control: ReactNode
  htmlFor?: string
}): React.JSX.Element {
  return (
    <div className="flex items-start justify-between gap-6 border-b border-line-soft py-3 last:border-b-0">
      <div className="min-w-0">
        <label htmlFor={htmlFor} className="block text-[13px] font-medium text-ink">
          {label}
        </label>
        {description ? (
          <p className="mt-0.5 max-w-[46ch] text-2xs leading-4 text-ink-muted">{description}</p>
        ) : null}
      </div>
      <div className="flex w-[268px] shrink-0 justify-end">{control}</div>
    </div>
  )
}

export const TextInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function TextInput({ className, ...props }, ref) {
    return <input ref={ref} className={cn('field h-8 px-2.5 text-[13px]', className)} {...props} />
  }
)

export const TextArea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function TextArea({ className, ...props }, ref) {
    return (
      <textarea
        ref={ref}
        className={cn('field resize-y px-2.5 py-2 text-[13px] leading-[1.6]', className)}
        {...props}
      />
    )
  }
)

export function SearchInput({
  value,
  onChange,
  placeholder = '搜索',
  className
}: {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}): React.JSX.Element {
  return (
    <div
      className={cn(
        'field flex h-8 items-center gap-2 px-2.5',
        className
      )}
    >
      <Search size={14} className="shrink-0 text-ink-faint" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="h-full min-w-0 flex-1 bg-transparent text-[13px] outline-none placeholder:text-ink-faint"
      />
      {value ? (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="清除搜索"
          className="shrink-0 rounded-xs text-ink-faint hover:text-ink"
        >
          <X size={13} />
        </button>
      ) : null}
    </div>
  )
}

export interface SelectOption {
  value: string
  label: string
}

export function Select({
  value,
  onChange,
  options,
  placeholder,
  className,
  ariaLabel
}: {
  value: string
  onChange: (value: string) => void
  options: SelectOption[]
  placeholder?: string
  className?: string
  ariaLabel?: string
}): React.JSX.Element {
  const selectedLabel = options.find((option) => option.value === value)?.label

  return (
    <RSelect.Root value={value} onValueChange={onChange}>
      <RSelect.Trigger
        aria-label={ariaLabel}
        // 名字太长时截断成省略号，悬停看全称
        title={selectedLabel}
        className={cn(
          'field t-fast flex h-8 items-center justify-between gap-2 px-2.5 text-[13px]',
          className
        )}
      >
        {/* 不用 RSelect.Value：它会把 className 丢掉（只透传 style），
            截断样式挂不上去。自己渲染一个 span，顺便管占位色。 */}
        <span className={cn('min-w-0 flex-1 truncate', !selectedLabel && 'text-ink-faint')}>
          {selectedLabel ?? placeholder ?? ''}
        </span>
        <RSelect.Icon>
          <ChevronDown size={14} className="text-ink-faint" />
        </RSelect.Icon>
      </RSelect.Trigger>
      <RSelect.Portal>
        <RSelect.Content
          position="popper"
          sideOffset={4}
          className="glass-strong z-50 max-h-72 min-w-[var(--radix-select-trigger-width)] max-w-[min(440px,90vw)] overflow-hidden rounded-panel bg-elevated"
        >
          <RSelect.Viewport className="p-1">
            {options.map((option) => (
              <RSelect.Item
                key={option.value}
                value={option.value}
                title={option.label}
                className="t-fast flex h-7 cursor-default select-none items-center justify-between gap-3 rounded-pill px-3 text-[13px] text-ink-soft outline-none data-[highlighted]:bg-hover data-[highlighted]:text-ink"
              >
                <RSelect.ItemText className="min-w-0 truncate">
                  {option.label}
                </RSelect.ItemText>
                <RSelect.ItemIndicator>
                  <Check size={13} className="text-accent" />
                </RSelect.ItemIndicator>
              </RSelect.Item>
            ))}
          </RSelect.Viewport>
        </RSelect.Content>
      </RSelect.Portal>
    </RSelect.Root>
  )
}

export function Switch({
  checked,
  onChange,
  ariaLabel,
  disabled
}: {
  checked: boolean
  onChange: (checked: boolean) => void
  ariaLabel: string
  disabled?: boolean
}): React.JSX.Element {
  return (
    <RSwitch.Root
      checked={checked}
      onCheckedChange={onChange}
      aria-label={ariaLabel}
      disabled={disabled}
      className={cn(
        't-fast relative h-[18px] w-8 shrink-0 rounded-pill border',
        checked ? 'border-signal/50 bg-signal-soft' : 'border-line bg-inset',
        'disabled:opacity-40'
      )}
    >
      <RSwitch.Thumb
        className={cn(
          't-fast block size-3 rounded-pill',
          checked ? 'translate-x-[15px] bg-signal' : 'translate-x-[2px] bg-ink-faint'
        )}
      />
    </RSwitch.Root>
  )
}

export function Checkbox({
  checked,
  onChange,
  ariaLabel,
  indeterminate
}: {
  checked: boolean
  onChange: (checked: boolean) => void
  ariaLabel: string
  indeterminate?: boolean
}): React.JSX.Element {
  const state = indeterminate ? 'indeterminate' : checked
  return (
    <RCheckbox.Root
      checked={state}
      onCheckedChange={(value) => onChange(value === true)}
      aria-label={ariaLabel}
      className={cn(
        't-fast flex size-4 shrink-0 items-center justify-center rounded-xs',
        checked || indeterminate
          ? 'bg-accent text-on-accent shadow-[inset_0_1px_0_0_oklch(1_0_0/0.3),inset_0_0_0_1px_oklch(0.8_0.12_250/0.5)]'
          : 'glass-well bg-inset text-ink-faint hover:text-ink'
      )}
    >
      <RCheckbox.Indicator>
        {indeterminate ? <Minus size={11} strokeWidth={3} /> : <Check size={11} strokeWidth={3.5} />}
      </RCheckbox.Indicator>
    </RCheckbox.Root>
  )
}

export function Slider({
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  ariaLabel
}: {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  step?: number
  ariaLabel: string
}): React.JSX.Element {
  return (
    <RSlider.Root
      value={[value]}
      min={min}
      max={max}
      step={step}
      onValueChange={([next]) => onChange(next)}
      className="relative flex h-5 w-full touch-none select-none items-center"
    >
      <RSlider.Track className="relative h-1 grow rounded-pill bg-inset">
        <RSlider.Range className="absolute h-full rounded-pill bg-accent" />
      </RSlider.Track>
      <RSlider.Thumb
        aria-label={ariaLabel}
        className="t-fast block size-3.5 rounded-pill border-2 border-accent bg-canvas hover:scale-110"
      />
    </RSlider.Root>
  )
}

export interface SegmentedItem {
  value: string
  label: ReactNode
  title?: string
}

export function Segmented({
  value,
  onChange,
  items,
  ariaLabel,
  className,
  activeTone = 'neutral'
}: {
  value: string
  onChange: (value: string) => void
  items: SegmentedItem[]
  ariaLabel: string
  className?: string
  activeTone?: 'neutral' | 'accent'
}): React.JSX.Element {
  return (
    <RToggleGroup.Root
      type="single"
      value={value}
      onValueChange={(next) => next && onChange(next)}
      aria-label={ariaLabel}
      className={cn(
        'glass-well inline-flex shrink-0 items-center gap-0.5 rounded-pill bg-inset p-0.5',
        className
      )}
    >
      {items.map((item) => (
        <RToggleGroup.Item
          key={item.value}
          value={item.value}
          title={item.title}
          className={cn(
            't-fast inline-flex h-6 min-w-6 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-pill px-2.5 text-xs text-ink-muted hover:text-ink',
            'data-[state=on]:bg-elevated',
            'data-[state=on]:shadow-[inset_0_1px_0_0_oklch(1_0_0/0.16),inset_0_0_0_1px_oklch(0.66_0.145_250/0.45)]',
            activeTone === 'accent' ? 'data-[state=on]:text-accent' : 'data-[state=on]:text-ink'
          )}
        >
          {item.label}
        </RToggleGroup.Item>
      ))}
    </RToggleGroup.Root>
  )
}
