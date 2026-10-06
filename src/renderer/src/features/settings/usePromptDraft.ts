import { useEffect, useRef, useState } from 'react'
import type { PromptTemplate } from '@shared/types'
import { useWorkspace } from '@renderer/lib/store'

/**
 * 提示词编辑草稿：输入时先改本地，停顿一下再落到 prompts.json。
 * 每敲一个字都写盘会连带重建整份快照，这里防抖 450ms。
 */
export function usePromptDraft(): {
  draft: PromptTemplate | null
  patch: (next: Partial<PromptTemplate>) => void
} {
  const prompt = useWorkspace((s) => s.activePrompt)
  const upsertPrompt = useWorkspace((s) => s.upsertPrompt)
  const [draft, setDraft] = useState<PromptTemplate | null>(prompt)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pending = useRef<Partial<PromptTemplate>>({})

  useEffect(() => {
    if (Object.keys(pending.current).length > 0) return
    setDraft(prompt)
  }, [prompt])

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current)
    },
    []
  )

  const patch = (next: Partial<PromptTemplate>): void => {
    setDraft((prev) => (prev ? { ...prev, ...next } : prev))
    pending.current = { ...pending.current, ...next }
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      const merged = pending.current
      pending.current = {}
      if (prompt && Object.keys(merged).length > 0) {
        void upsertPrompt({ id: prompt.id, ...merged })
      }
    }, 450)
  }

  return { draft, patch }
}
