import { AlertTriangle, Check, Info, X, Zap } from 'lucide-react'
import { useWorkspace, type ToastTone } from '@renderer/lib/store'
import { cn } from '@renderer/lib/utils'

const TONE_ICON: Record<ToastTone, React.JSX.Element> = {
  info: <Info size={14} />,
  success: <Check size={14} />,
  warning: <AlertTriangle size={14} />,
  danger: <Zap size={14} />
}

const TONE_CLASS: Record<ToastTone, string> = {
  info: 'text-ink-soft',
  success: 'text-signal',
  warning: 'text-warning',
  danger: 'text-danger'
}

export function Toaster(): React.JSX.Element {
  const toasts = useWorkspace((s) => s.toasts)
  const dismiss = useWorkspace((s) => s.dismissToast)

  return (
    <div
      aria-live="polite"
      aria-label="通知"
      className="pointer-events-none fixed bottom-10 right-4 z-[60] flex w-[336px] flex-col gap-2"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="pointer-events-auto flex items-start gap-2.5 rounded-panel border border-line bg-elevated p-3 shadow-[var(--shadow-pop)]"
        >
          <span className={cn('mt-px shrink-0', TONE_CLASS[toast.tone])}>
            {TONE_ICON[toast.tone]}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-ink">{toast.title}</p>
            {toast.description ? (
              <p className="mt-0.5 text-2xs leading-4 text-ink-muted">{toast.description}</p>
            ) : null}
          </div>
          <button
            type="button"
            aria-label="关闭通知"
            onClick={() => dismiss(toast.id)}
            className="t-fast shrink-0 rounded-xs p-0.5 text-ink-faint hover:bg-hover hover:text-ink"
          >
            <X size={13} />
          </button>
        </div>
      ))}
    </div>
  )
}
