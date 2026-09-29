import type { ReactNode } from 'react'
import { CircleCheck, Eye, Inbox, Loader, TriangleAlert } from 'lucide-react'
import { useWorkspace, type PreviewState } from '@renderer/lib/store'
import { Segmented } from './fields'
import { Tooltip } from './Tooltip'

export function ViewToolbar({
  children,
  actions
}: {
  children: ReactNode
  actions?: ReactNode
}): React.JSX.Element {
  return (
    <div className="flex min-h-11 shrink-0 flex-wrap items-center gap-x-2 gap-y-1.5 border-b border-line bg-surface px-3 py-1.5">
      <div className="flex min-w-0 flex-wrap items-center gap-2">{children}</div>
      {actions ? (
        <div className="ml-auto flex flex-wrap items-center justify-end gap-2">{actions}</div>
      ) : null}
    </div>
  )
}

export function ToolbarSeparator(): React.JSX.Element {
  return <span aria-hidden className="mx-0.5 h-5 w-px shrink-0 bg-line" />
}

export function ToolbarCount({ children }: { children: ReactNode }): React.JSX.Element {
  return <span className="num shrink-0 whitespace-nowrap text-2xs text-ink-muted">{children}</span>
}

const PREVIEW_ITEMS: { value: PreviewState; icon: ReactNode; title: string }[] = [
  { value: 'ready', icon: <CircleCheck size={13} />, title: '正常状态' },
  { value: 'loading', icon: <Loader size={13} />, title: '加载状态' },
  { value: 'empty', icon: <Inbox size={13} />, title: '空状态' },
  { value: 'error', icon: <TriangleAlert size={13} />, title: '错误状态' }
]

export function StatePreviewSwitch(): React.JSX.Element {
  const previewState = useWorkspace((s) => s.previewState)
  const setPreviewState = useWorkspace((s) => s.setPreviewState)

  return (
    <Tooltip side="bottom" label="状态预览：切换查看界面的加载 / 空 / 错误态">
      <div className="flex shrink-0 items-center gap-1.5">
        <Eye size={13} className="shrink-0 text-ink-faint" />
        <Segmented
          ariaLabel="状态预览"
          activeTone="accent"
          value={previewState}
          onChange={(value) => setPreviewState(value as PreviewState)}
          items={PREVIEW_ITEMS.map((item) => ({
            value: item.value,
            label: item.icon,
            title: item.title
          }))}
        />
      </div>
    </Tooltip>
  )
}
