export function BrandMark({
  size = 32,
  className,
  radius = 112
}: {
  size?: number
  className?: string
  radius?: number
}): React.JSX.Element {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 512 512"
      className={className}
      role="img"
      aria-label="LP-Tagger"
    >
      <rect width="512" height="512" rx={radius} fill="#F2EFEA" />
      <circle cx="106" cy="256" r="78" fill="#2A8FCE" />
      <circle cx="206" cy="256" r="78" fill="#F1EEE9" />
      <circle cx="306" cy="256" r="78" fill="#1C4E6E" />
      <circle cx="406" cy="256" r="78" fill="#A8D74F" />
    </svg>
  )
}
