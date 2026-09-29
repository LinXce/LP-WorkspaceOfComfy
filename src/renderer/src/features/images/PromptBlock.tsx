import { useState } from 'react'
import { Check, ChevronDown, ChevronUp, Copy } from 'lucide-react'
import { copyText } from '@renderer/lib/clipboard'
import { cn } from '@renderer/lib/utils'
import { IconButton } from '@renderer/components/IconButton'

export function PromptBlock({
  text,
  emptyHint = '没有内容',
  muted
}: {
  text?: string
  emptyHint?: string
  muted?: boolean
}): React.JSX.Element {
  const [expanded, setExpanded] = useState(false)
  const [copied, setCopied] = useState(false)

  if (!text) {
    return (
      <p className="rounded-control border border-dashed border-line-soft px-2 py-2 text-2xs text-ink-faint">
        {emptyHint}
      </p>
    )
  }

  const overflows = text.length > 220

  const copy = async (): Promise<void> => {
    const ok = await copyText(text)
    if (!ok) return
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1400)
  }

  return (
    <div className="overflow-hidden rounded-control border border-line-soft bg-inset">
      <div className="flex items-start gap-1.5 p-1.5 pl-2">
        <pre
          style={{ maxHeight: expanded ? undefined : 108 }}
          className={cn(
            'min-w-0 flex-1 overflow-hidden whitespace-pre-wrap break-words font-mono text-[11.5px] leading-[1.65]',
            muted ? 'text-ink-muted' : 'text-ink-soft'
          )}
        >
          {text}
        </pre>
        <IconButton size="sm" onClick={copy} aria-label={copied ? '已复制' : '复制内容'}>
          {copied ? <Check size={13} className="text-signal" /> : <Copy size={13} />}
        </IconButton>
      </div>

      {overflows ? (
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="t-fast flex w-full items-center justify-center gap-1 border-t border-line-soft py-1 text-2xs text-ink-muted hover:bg-hover hover:text-ink"
        >
          {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          {expanded ? '收起' : `展开全部（${text.length} 字符）`}
        </button>
      ) : null}
    </div>
  )
}
