import { useEffect, useRef, useState } from 'react'
import type { EndpointConfig } from '@shared/types'
import { useWorkspace } from '@renderer/lib/store'

/**
 * 端点配置的编辑草稿：输入时先改本地，停顿一下再落到 endpoints.json。
 * 每敲一个字都写盘会连带重建整份快照，这里防抖 450ms。
 */
export function useEndpointDraft(): {
  draft: EndpointConfig | null
  patch: (next: Partial<EndpointConfig>) => void
} {
  const endpoint = useWorkspace((s) => s.activeEndpoint)
  const upsertEndpoint = useWorkspace((s) => s.upsertEndpoint)
  const [draft, setDraft] = useState<EndpointConfig | null>(endpoint)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pending = useRef<Partial<EndpointConfig>>({})

  useEffect(() => {
    if (Object.keys(pending.current).length > 0) return
    setDraft(endpoint)
  }, [endpoint])

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current)
    },
    []
  )

  const patch = (next: Partial<EndpointConfig>): void => {
    setDraft((prev) => (prev ? { ...prev, ...next } : prev))
    pending.current = { ...pending.current, ...next }
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      const merged = pending.current
      pending.current = {}
      if (endpoint && Object.keys(merged).length > 0) {
        void upsertEndpoint({ id: endpoint.id, ...merged })
      }
    }, 450)
  }

  return { draft, patch }
}
