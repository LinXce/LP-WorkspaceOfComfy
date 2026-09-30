import { useWorkspace } from '@renderer/lib/store'
import { useMaximized } from '@renderer/hooks/useMaximized'
import { cn } from '@renderer/lib/utils'
import { NavRail } from '@renderer/layout/NavRail'
import { TopBar } from '@renderer/layout/TopBar'
import { StatusBar } from '@renderer/layout/StatusBar'
import { InspectorPanel } from '@renderer/layout/InspectorPanel'
import { VIEWS } from './views'

export function AppShell(): React.JSX.Element {
  const view = useWorkspace((s) => s.view)
  const density = useWorkspace((s) => s.density)
  const maximized = useMaximized()
  const definition = VIEWS[view]
  const ViewComponent = definition.View
  const InspectorComponent = definition.Inspector

  return (
    <div className={cn('relative h-full w-full overflow-hidden', !maximized && 'p-4')}>
      <div
        data-density={density}
        className={cn(
          'isolate relative flex h-full w-full overflow-hidden bg-canvas text-ink',
          // 非最大化：留出边距 + 圆角 + 投影 = 悬浮感；最大化：铺满，圆角与留白都去掉
          maximized
            ? 'rounded-none'
            : 'rounded-frame shadow-[0_14px_36px_-14px_oklch(0_0_0/0.85),inset_0_0_0_1px_oklch(1_0_0/0.07)]'
        )}
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
    </div>
  )
}
