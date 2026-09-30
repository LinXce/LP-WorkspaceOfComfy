import { useEffect, useState } from 'react'
import { bridge } from '@renderer/lib/bridge'

/** 窗口是否处于最大化（最大化时应用要铺满，不留悬浮边距与圆角）。 */
export function useMaximized(): boolean {
  const [maximized, setMaximized] = useState(false)

  useEffect(() => {
    void bridge.isMaximized().then(setMaximized)
    return bridge.onMaximizedChange(setMaximized)
  }, [])

  return maximized
}
