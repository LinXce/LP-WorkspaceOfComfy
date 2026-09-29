import { hashString, mulberry32 } from '@renderer/lib/rand'
import { cn } from '@renderer/lib/utils'

const INKS = [
  'oklch(0.64 0.125 240)',
  'oklch(0.40 0.070 236)',
  'oklch(0.82 0.170 128)',
  'oklch(0.945 0.006 92)'
]

export function MockArtwork({
  seed,
  className,
  label
}: {
  seed: string
  className?: string
  label?: string
}): React.JSX.Element {
  const h = hashString(seed)
  const rand = mulberry32(h)
  const uid = h.toString(36)

  const circles = Array.from({ length: 3 }, () => {
    const roll = rand()
    const ink =
      roll > 0.78 ? INKS[3] : roll > 0.46 ? INKS[2] : roll > 0.16 ? INKS[0] : INKS[1]
    return {
      cx: 12 + rand() * 76,
      cy: 12 + rand() * 76,
      r: 18 + rand() * 18,
      ink,
      opacity: 0.62 + rand() * 0.3
    }
  })

  const tilt = -18 + rand() * 36

  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="xMidYMid slice"
      role={label ? 'img' : 'presentation'}
      aria-label={label}
      className={cn('block h-full w-full', className)}
    >
      <defs>
        <linearGradient id={`bg-${uid}`} x1="0" y1="0" x2="0.7" y2="1">
          <stop offset="0%" stopColor="oklch(0.245 0.022 243)" />
          <stop offset="100%" stopColor="oklch(0.155 0.016 243)" />
        </linearGradient>
        <radialGradient id={`vig-${uid}`} cx="50%" cy="42%" r="72%">
          <stop offset="0%" stopColor="oklch(0 0 0 / 0)" />
          <stop offset="100%" stopColor="oklch(0 0 0 / 0.42)" />
        </radialGradient>
      </defs>
      <rect width="100" height="100" fill={`url(#bg-${uid})`} />
      <g transform={`rotate(${tilt} 50 50)`} style={{ mixBlendMode: 'screen' }}>
        {circles.map((c, i) => (
          <circle
            key={i}
            cx={c.cx}
            cy={c.cy}
            r={c.r}
            fill={c.ink}
            opacity={c.opacity}
            style={{ mixBlendMode: 'screen' }}
          />
        ))}
      </g>
      <rect width="100" height="100" fill={`url(#vig-${uid})`} />
    </svg>
  )
}
