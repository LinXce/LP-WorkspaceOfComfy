import { useEffect } from 'react'
import { TooltipProvider } from './components/Tooltip'
import { CommandPalette } from './components/CommandPalette'
import { Toaster } from './components/Toaster'
import { AppShell } from './app/AppShell'
import { useGlobalShortcuts } from './hooks/useGlobalShortcuts'
import { useWorkspace } from './lib/store'

export default function App(): React.JSX.Element {
  useGlobalShortcuts()
  const refresh = useWorkspace((s) => s.refresh)
  const setScan = useWorkspace((s) => s.setScan)
  const setTagging = useWorkspace((s) => s.setTagging)

  useEffect(() => {
    void refresh()

    const api = window.workspace
    if (!api) return

    void api.tagging.state().then(setTagging)

    const offScan = api.datasets.onScanProgress((progress) => setScan(progress))
    const offChanged = api.workspace.onChanged(() => void refresh())
    const offTagging = api.tagging.onProgress((job) => setTagging(job))

    return () => {
      offScan()
      offChanged()
      offTagging()
    }
  }, [refresh, setScan, setTagging])

  return (
    <TooltipProvider>
      <AppShell />
      <CommandPalette />
      <Toaster />
    </TooltipProvider>
  )
}
