import { useState } from 'react'
import { ImageOff } from 'lucide-react'
import { cn } from '@renderer/lib/utils'

export function Thumbnail({
  imageId,
  alt,
  className
}: {
  imageId: string
  alt: string
  className?: string
}): React.JSX.Element {
  const [failed, setFailed] = useState(false)

  if (failed) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-inset text-ink-faint">
        <ImageOff size={16} />
      </div>
    )
  }

  return (
    <img
      src={`thumb://t/${imageId}`}
      alt={alt}
      loading="lazy"
      decoding="async"
      draggable={false}
      onError={() => setFailed(true)}
      className={cn('h-full w-full object-cover', className)}
    />
  )
}
