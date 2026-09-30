import { useWorkspace } from '@renderer/lib/store'
import { NavRail } from '@renderer/layout/NavRail'
import { TopBar } from '@renderer/layout/TopBar'
import { StatusBar } from '@renderer/layout/StatusBar'
import { InspectorPanel } from '@renderer/layout/InspectorPanel'
import { VIEWS } from './views'

export function AppShell(): React.JSX.Element {
  const view = useWorkspace((s) => s.view)
  const density = useWorkspace((s) => s.density)
  const definition = VIEWS[view]
  const ViewComponent = definition.View
  const InspectorComponent = definition.Inspector

  return (
    <div
      data-density={density}
      className="isolate relative flex h-full w-full overflow-hidden bg-canvas text-ink"
    >
      <div
        aria-hidden
        className="ambient ambient-noise pointer-events-none absolute inset-0 -z-10"
      />
      <NavRail />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar title={definition.title} description={definition.description} />
        <div className="relative flex min-h-0 flex-1">
          <main aria-label={definition.title} className="min-w-0 flex-1 overflow-hidden">
            <ViewComponent />
          </main>
          <InspectorPanel title={definition.inspectorTitle}>
            <InspectorComponent />
          </InspectorPanel>
        </div>
        <StatusBar />
      </div>
    </div>
  )
}
