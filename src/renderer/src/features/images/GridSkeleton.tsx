import { Skeleton } from '@renderer/components/primitives'

export function GridSkeleton({
  tileSize,
  count = 24
}: {
  tileSize: number
  count?: number
}): React.JSX.Element {
  return (
    <div aria-hidden className="p-3">
      <div
        className="grid gap-3"
        style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${tileSize}px, 1fr))` }}
      >
        {Array.from({ length: count }, (_, index) => (
          <div key={index} className="flex flex-col gap-1.5">
            <Skeleton className="aspect-[4/3] w-full rounded-panel" />
            <Skeleton className="h-2.5 w-2/3 rounded-xs" />
          </div>
        ))}
      </div>
    </div>
  )
}

export function ScanStatus({
  label,
  detail
}: {
  label: string
  detail?: string
}): React.JSX.Element {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex h-9 shrink-0 items-center gap-2 border-b border-line-soft bg-canvas px-3"
    >
      <span className="shimmer size-2 rounded-pill" />
      <span className="truncate text-2xs text-ink-soft">{label}</span>
      {detail ? <span className="truncate text-2xs text-ink-faint">{detail}</span> : null}
    </div>
  )
}
