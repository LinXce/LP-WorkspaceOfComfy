import { useEffect, useState } from 'react'
import { Copy, Minus, Square, X } from 'lucide-react'
import { bridge } from '@renderer/lib/bridge'
import { cn } from '@renderer/lib/utils'

const CONTROL =
  'no-drag inline-flex h-full w-11 items-center justify-center text-ink-soft t-fast outline-offset-[-3px]'

export function WindowControls(): React.JSX.Element {
  const [maximized, setMaximized] = useState(false)

  useEffect(() => {
    void bridge.isMaximized().then(setMaximized)
    return bridge.onMaximizedChange(setMaximized)
  }, [])

  return (
    <div className="no-drag ml-1 flex h-[var(--topbar-h)] shrink-0 items-center self-center">
      <button
        type="button"
        aria-label="最小化窗口"
        onClick={() => bridge.minimize()}
        className={cn(CONTROL, 'hover:bg-hover hover:text-ink')}
      >
        <Minus size={15} />
      </button>
      <button
        type="button"
        aria-label={maximized ? '还原窗口' : '最大化窗口'}
        onClick={() => void bridge.toggleMaximize().then(setMaximized)}
        className={cn(CONTROL, 'hover:bg-hover hover:text-ink')}
      >
        {maximized ? <Copy size={12.5} /> : <Square size={12.5} />}
      </button>
      <button
        type="button"
        aria-label="关闭窗口"
        onClick={() => bridge.close()}
        className={cn(CONTROL, 'hover:bg-danger hover:text-on-accent')}
      >
        <X size={15} />
      </button>
    </div>
  )
}
