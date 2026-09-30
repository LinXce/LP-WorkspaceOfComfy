import { useEffect } from 'react'
import { useWorkspace, type ViewId } from '@renderer/lib/store'

const VIEW_BY_DIGIT: Record<string, ViewId> = {
  '1': 'home',
  '2': 'gallery',
  '3': 'datasets',
  '4': 'tagging',
  '5': 'tags',
  '6': 'settings'
}

function isTypingTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null
  if (!el) return false
  return (
    el.tagName === 'INPUT' ||
    el.tagName === 'TEXTAREA' ||
    el.tagName === 'SELECT' ||
    el.isContentEditable
  )
}

export function useGlobalShortcuts(): void {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      const state = useWorkspace.getState()
      const mod = event.ctrlKey || event.metaKey
      const key = event.key.toLowerCase()
      const dialogOpen = Boolean(document.querySelector('[role="dialog"]'))

      if (mod && key === 'k') {
        event.preventDefault()
        state.setCommandOpen(true)
        return
      }

      if (mod && VIEW_BY_DIGIT[event.key]) {
        event.preventDefault()
        state.setView(VIEW_BY_DIGIT[event.key])
        return
      }

      if (mod && key === 'b') {
        event.preventDefault()
        state.toggleInspector()
        return
      }

      if (event.key === 'Escape' && !dialogOpen) {
        state.clearSelection()
        return
      }

      if (isTypingTarget(event.target)) return

      if (mod && key === 'a') {
        event.preventDefault()
        state.selectAll()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const motion = useWorkspace((s) => s.motion)
  useEffect(() => {
    document.documentElement.dataset.motion = motion
  }, [motion])
}
