import { useEffect, useMemo, useRef, useState } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { Check, FileWarning, Sparkles } from 'lucide-react'
import type { ImageMeta } from '@shared/types'
import { useWorkspace } from '@renderer/lib/store'
import { cn, truncateMiddle } from '@renderer/lib/utils'
import { MockArtwork } from '@renderer/components/MockArtwork'

function SourceMark({ image }: { image: ImageMeta }): React.JSX.Element {
  if (image.source === 'none') {
    return (
      <span className="inline-flex items-center gap-0.5 rounded-xs bg-warning/90 px-1 py-px text-[9px] font-semibold text-on-accent">
        <FileWarning size={9} />
        无元数据
      </span>
    )
  }
  if (image.source === 'exif') {
    return (
      <span className="rounded-xs bg-elevated/90 px-1 py-px text-[9px] font-medium text-ink-muted">
        EXIF
      </span>
    )
  }
  return (
    <span className="rounded-xs bg-accent/90 px-1 py-px text-[9px] font-semibold uppercase text-on-accent">
      {image.source === 'comfyui' ? 'Comfy' : 'A1111'}
    </span>
  )
}

function ImageTile({
  image,
  selected,
  primary,
  onSelect,
  onOpen
}: {
  image: ImageMeta
  selected: boolean
  primary: boolean
  onSelect: (event: React.MouseEvent) => void
  onOpen: () => void
}): React.JSX.Element {
  return (
    <div
      role="option"
      id={`tile-${image.id}`}
      aria-selected={selected}
      tabIndex={-1}
      onClick={onSelect}
      onDoubleClick={onOpen}
      title={`${image.fileName}\n${image.width} × ${image.height}`}
      className={cn(
        't-fast group relative flex cursor-default flex-col overflow-hidden rounded-panel border p-1.5 outline-offset-1',
        'hover:border-line-strong hover:bg-hover',
        selected
          ? 'border-accent bg-accent-soft'
          : primary
            ? 'border-line-strong bg-surface'
            : 'border-line-soft bg-surface'
      )}
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-control bg-inset">
        <MockArtwork seed={image.id} />
        {selected ? (
          <span className="absolute right-1.5 top-1.5 flex size-4 items-center justify-center rounded-pill bg-accent text-on-accent">
            <Check size={11} strokeWidth={3.5} />
          </span>
        ) : null}
        <span className="absolute bottom-1.5 left-1.5">
          <SourceMark image={image} />
        </span>
      </div>

      <div className="mt-1.5 flex min-w-0 items-center gap-1.5 px-0.5">
        <p className="min-w-0 flex-1 truncate text-2xs text-ink-soft">
          {truncateMiddle(image.fileName, 22)}
        </p>
        {image.tags.length > 0 ? (
          <span className="num flex shrink-0 items-center gap-0.5 text-[10px] text-ink-faint">
            <Sparkles size={9} />
            {image.tags.length}
          </span>
        ) : null}
      </div>
    </div>
  )
}

export function ImageGrid({
  images,
  tileSize,
  onOpen
}: {
  images: ImageMeta[]
  tileSize: number
  onOpen?: (image: ImageMeta) => void
}): React.JSX.Element {
  const parentRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)

  const selectedIds = useWorkspace((s) => s.selectedIds)
  const primaryId = useWorkspace((s) => s.primaryId)
  const select = useWorkspace((s) => s.select)
  const openInspector = useWorkspace((s) => s.openInspector)

  useEffect(() => {
    const el = parentRef.current
    if (!el) return
    setWidth(el.clientWidth)
    const observer = new ResizeObserver((entries) => {
      setWidth(entries[0].contentRect.width)
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const gap = useWorkspace((s) => s.density) === 'compact' ? 8 : 12
  const cols = Math.max(1, Math.floor((Math.max(width, tileSize) - gap) / (tileSize + gap)))
  const tileWidth = cols > 1 ? (width - gap * (cols - 1)) / cols : Math.max(0, width)
  const rowHeight = Math.max(120, (tileWidth * 3) / 4 + 30)
  const rowCount = Math.ceil(images.length / cols)

  const virtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => parentRef.current,
    estimateSize: () => rowHeight + gap,
    overscan: 3
  })

  useEffect(() => {
    virtualizer.measure()
  }, [rowHeight, cols, virtualizer])

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds])

  const moveFocus = (delta: number): void => {
    const currentIndex = images.findIndex((img) => img.id === primaryId)
    const base = currentIndex === -1 ? 0 : currentIndex
    const next = Math.min(images.length - 1, Math.max(0, base + delta))
    const target = images[next]
    if (target) {
      select(target.id, 'replace')
      const el = document.getElementById(`tile-${target.id}`)
      el?.scrollIntoView({ block: 'nearest' })
    }
  }

  const onKeyDown = (event: React.KeyboardEvent): void => {
    switch (event.key) {
      case 'ArrowRight':
        event.preventDefault()
        moveFocus(1)
        break
      case 'ArrowLeft':
        event.preventDefault()
        moveFocus(-1)
        break
      case 'ArrowDown':
        event.preventDefault()
        moveFocus(cols)
        break
      case 'ArrowUp':
        event.preventDefault()
        moveFocus(-cols)
        break
      case ' ':
        event.preventDefault()
        if (primaryId) select(primaryId, 'toggle')
        break
      case 'Enter': {
        event.preventDefault()
        const target = images.find((img) => img.id === primaryId)
        if (target) {
          openInspector()
          onOpen?.(target)
        }
        break
      }
      case 'Home':
        event.preventDefault()
        if (images[0]) select(images[0].id, 'replace')
        break
      case 'End':
        event.preventDefault()
        if (images.length) select(images[images.length - 1].id, 'replace')
        break
      default:
        break
    }
  }

  if (images.length === 0) return <div className="h-full" />

  return (
    <div
      ref={parentRef}
      role="listbox"
      aria-multiselectable
      aria-label="图片列表"
      aria-activedescendant={primaryId ? `tile-${primaryId}` : undefined}
      tabIndex={0}
      onKeyDown={onKeyDown}
      className="h-full overflow-y-auto p-3 outline-offset-[-2px]"
    >
      <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
        {virtualizer.getVirtualItems().map((row) => {
          const rowImages = images.slice(row.index * cols, row.index * cols + cols)
          return (
            <div
              key={row.key}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: rowHeight,
                transform: `translateY(${row.start}px)`,
                display: 'grid',
                gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
                gap
              }}
            >
              {rowImages.map((image) => (
                <ImageTile
                  key={image.id}
                  image={image}
                  selected={selectedSet.has(image.id)}
                  primary={primaryId === image.id}
                  onSelect={(event) => {
                    const mode = event.shiftKey
                      ? 'range'
                      : event.ctrlKey || event.metaKey
                        ? 'toggle'
                        : 'replace'
                    select(image.id, mode)
                  }}
                  onOpen={() => onOpen?.(image)}
                />
              ))}
            </div>
          )
        })}
      </div>
    </div>
  )
}
