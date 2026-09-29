import { TooltipProvider } from './components/Tooltip'
import { CommandPalette } from './components/CommandPalette'
import { Toaster } from './components/Toaster'
import { AppShell } from './app/AppShell'
import { useGlobalShortcuts } from './hooks/useGlobalShortcuts'

export default function App(): React.JSX.Element {
  useGlobalShortcuts()

  return (
    <TooltipProvider>
      <AppShell />
      <CommandPalette />
      <Toaster />
    </TooltipProvider>
  )
}
