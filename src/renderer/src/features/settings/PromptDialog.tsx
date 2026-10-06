import { useEffect, useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { Plus, X } from 'lucide-react'
import { BUILTIN_PROMPTS } from '@shared/defaults'
import type { PromptTemplate } from '@shared/types'
import { Button } from '@renderer/components/Button'
import { IconButton } from '@renderer/components/IconButton'
import { Pills } from '@renderer/components/Pills'
import { Field, TextArea, TextInput } from '@renderer/components/fields'

const BLANK = 'blank'

const STARTERS = [
  ...BUILTIN_PROMPTS.map((item) => ({ value: item.mode, label: `照抄${item.name}` })),
  { value: BLANK, label: '空白' }
]

/** 新增一套提示词。选个起点只是帮你把内容填好，存下来之前都能改。 */
export function PromptDialog({
  open,
  onOpenChange,
  onSubmit
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (patch: Partial<PromptTemplate>) => void
}): React.JSX.Element {
  const [starter, setStarter] = useState(BUILTIN_PROMPTS[0].mode as string)
  const [name, setName] = useState('')
  const [text, setText] = useState('')

  const applyStarter = (value: string): void => {
    setStarter(value)
    if (value === BLANK) {
      setName('')
      setText('')
      return
    }
    const builtin = BUILTIN_PROMPTS.find((item) => item.mode === value)
    if (!builtin) return
    setName(`我的${builtin.mode === 'tag' ? '标签' : '描述'}模板`)
    setText(builtin.text)
  }

  useEffect(() => {
    if (open) applyStarter(BUILTIN_PROMPTS[0].mode)
  }, [open])

  const canSubmit = name.trim().length > 0 && text.trim().length > 0

  const submit = (): void => {
    if (!canSubmit) return
    onSubmit({ name: name.trim(), text })
    onOpenChange(false)
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-canvas/70 backdrop-blur-[3px]" />
        <Dialog.Content
          aria-label="添加提示词"
          className="glass-strong fixed left-1/2 top-1/2 z-50 flex max-h-[88vh] w-[min(560px,92vw)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-panel bg-elevated"
        >
          <div className="flex h-11 shrink-0 items-center gap-2 border-b border-line-soft px-3.5">
            <Plus size={15} className="shrink-0 text-accent" />
            <Dialog.Title className="flex-1 text-[13px] font-medium text-ink">
              添加提示词
            </Dialog.Title>
            <Dialog.Close asChild>
              <IconButton size="sm" aria-label="关闭">
                <X size={14} />
              </IconButton>
            </Dialog.Close>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-3.5 py-3.5">
            <div className="flex flex-col gap-4">
              <Field label="起点" hint="照抄一套内置模板再来改，或者从空白开始。">
                <Pills
                  ariaLabel="提示词起点"
                  value={starter}
                  onChange={applyStarter}
                  items={STARTERS}
                />
              </Field>

              <Field label="模板名称" hint="只在提示词列表里显示，随便起。">
                <TextInput
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="例如：我的标签模板"
                  aria-label="模板名称"
                />
              </Field>

              <Field label="模板内容" hint="会作为 system prompt 原样发给模型。">
                <TextArea
                  rows={12}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="You are an image tagging assistant…"
                  className="font-mono text-[11.5px]"
                  aria-label="模板内容"
                />
              </Field>
            </div>
          </div>

          <div className="flex h-12 shrink-0 items-center justify-between gap-3 border-t border-line-soft px-3.5">
            <p className="text-2xs text-ink-faint">
              {canSubmit ? '会立刻保存并切到这套提示词' : '名称和内容都要填'}
            </p>
            <div className="flex items-center gap-2">
              <Dialog.Close asChild>
                <Button size="sm" variant="ghost">
                  取消
                </Button>
              </Dialog.Close>
              <Button size="sm" variant="primary" disabled={!canSubmit} onClick={submit}>
                保存
              </Button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
