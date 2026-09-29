import type { ReactNode } from 'react'
import * as RTooltip from '@radix-ui/react-tooltip'

export function TooltipProvider({ children }: { children: ReactNode }): React.JSX.Element {
  return (
    <RTooltip.Provider delayDuration={360} skipDelayDuration={140}>
      {children}
    </RTooltip.Provider>
  )
}

export function Tooltip({
  label,
  children,
  side = 'bottom',
  shortcut
}: {
  label: ReactNode
  children: ReactNode
  side?: 'top' | 'right' | 'bottom' | 'left'
  shortcut?: ReactNode
}): React.JSX.Element {
  return (
    <RTooltip.Root>
      <RTooltip.Trigger asChild>{children}</RTooltip.Trigger>
      <RTooltip.Portal>
        <RTooltip.Content
          side={side}
          sideOffset={6}
          collisionPadding={8}
          className="z-50 flex max-w-70 items-center gap-2 rounded-control border border-line bg-elevated px-2 py-1 text-xs text-ink shadow-[var(--shadow-pop)]"
        >
          <span>{label}</span>
          {shortcut}
        </RTooltip.Content>
      </RTooltip.Portal>
    </RTooltip.Root>
  )
}
