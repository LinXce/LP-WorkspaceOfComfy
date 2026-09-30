import { useEffect, useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { Eye, EyeOff, Plus, X } from 'lucide-react'
import { ENDPOINT_PRESETS } from '@shared/defaults'
import type { EndpointConfig } from '@shared/types'
import { cn } from '@renderer/lib/utils'
import { Button } from '@renderer/components/Button'
import { IconButton } from '@renderer/components/IconButton'
import { Pills } from '@renderer/components/Pills'
import { Field, TextInput } from '@renderer/components/fields'

const CUSTOM = 'custom'

const PRESET_PILLS = [
  ...ENDPOINT_PRESETS.map((preset) => ({ value: preset.id, label: preset.label })),
  { value: CUSTOM, label: '自定义' }
]

/** 新增一条端点配置：预置模板只是帮你把字段填好，存下来之前都能改。 */
export function EndpointDialog({
  open,
  onOpenChange,
  onSubmit
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (patch: Partial<EndpointConfig>) => void
}): React.JSX.Element {
  const [presetId, setPresetId] = useState(ENDPOINT_PRESETS[0].id)
  const [name, setName] = useState('')
  const [baseUrl, setBaseUrl] = useState('')
  const [envVar, setEnvVar] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [model, setModel] = useState('')
  const [revealed, setRevealed] = useState(false)

  const applyPreset = (id: string): void => {
    setPresetId(id)
    setRevealed(false)
    if (id === CUSTOM) {
      setName('')
      setBaseUrl('')
      setEnvVar('')
      setApiKey('')
      setModel('')
      return
    }
    const preset = ENDPOINT_PRESETS.find((item) => item.id === id)
    if (!preset) return
    setName(preset.label)
    setBaseUrl(preset.baseUrl)
    setEnvVar(preset.envVars[0] ?? '')
    setApiKey('')
    setModel(preset.models[0] ?? '')
  }

  useEffect(() => {
    if (open) applyPreset(ENDPOINT_PRESETS[0].id)
  }, [open])

  const validUrl = /^https?:\/\/.+/.test(baseUrl.trim())
  const canSubmit = validUrl && (envVar.trim().length > 0 || apiKey.trim().length > 0)

  const submit = (): void => {
    if (!canSubmit) return
    onSubmit({
      name: name.trim() || baseUrl.trim(),
      baseUrl: baseUrl.trim(),
      envVar: envVar.trim(),
      apiKey: apiKey.trim(),
      model: model.trim(),
      availableModels: [],
      presetId: presetId === CUSTOM ? undefined : presetId
    })
    onOpenChange(false)
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-canvas/70 backdrop-blur-[3px]" />
        <Dialog.Content
          aria-label="添加配置"
          className="glass-strong fixed left-1/2 top-1/2 z-50 flex max-h-[86vh] w-[min(480px,90vw)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-panel bg-elevated"
        >
          <div className="flex h-11 shrink-0 items-center gap-2 border-b border-line-soft px-3.5">
            <Plus size={15} className="shrink-0 text-accent" />
            <Dialog.Title className="flex-1 text-[13px] font-medium text-ink">
              添加配置
            </Dialog.Title>
            <Dialog.Close asChild>
              <IconButton size="sm" aria-label="关闭">
                <X size={14} />
              </IconButton>
            </Dialog.Close>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-3.5 py-3.5">
            <div className="flex flex-col gap-4">
              <Field label="预置模板" hint="只是帮你把下面的字段填好，之后随时能改。">
                <Pills
                  ariaLabel="预置模板"
                  value={presetId}
                  onChange={applyPreset}
                  items={PRESET_PILLS}
                />
              </Field>

              <Field label="配置名称" hint="只在配置列表里显示，随便起。">
                <TextInput
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="例如：Faro 中转"
                  aria-label="配置名称"
                />
              </Field>

              <Field label="Base URL" hint="OpenAI 兼容端点，需要支持图片输入。">
                <TextInput
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  placeholder="https://faroapi.com/v1"
                  aria-label="Base URL"
                  aria-invalid={baseUrl.length > 0 && !validUrl ? true : undefined}
                  className={cn(
                    'font-mono text-[11.5px]',
                    baseUrl.length > 0 && !validUrl && 'shadow-[inset_0_0_0_1px_var(--danger)]'
                  )}
                />
              </Field>

              <Field label="认证方式" hint="环境变量名和 API Key 只能填一个，填了这边那边会自动清空。">
                <div className="flex flex-col gap-2">
                  <TextInput
                    value={envVar}
                    onChange={(e) => {
                      setEnvVar(e.target.value)
                      if (e.target.value) setApiKey('')
                    }}
                    placeholder="环境变量名，例如 FARO_API_KEY"
                    aria-label="环境变量名"
                    className="font-mono text-[11.5px]"
                    disabled={apiKey.trim().length > 0}
                  />
                  <div className="relative">
                    <TextInput
                      type={revealed ? 'text' : 'password'}
                      value={apiKey}
                      onChange={(e) => {
                        setApiKey(e.target.value)
                        if (e.target.value) setEnvVar('')
                      }}
                      placeholder="或直接填 sk-..."
                      aria-label="API Key"
                      className="pr-9 font-mono text-[11.5px]"
                      disabled={envVar.trim().length > 0}
                    />
                    <span className="absolute right-1 top-1">
                      <IconButton
                        size="sm"
                        aria-label={revealed ? '隐藏 API Key' : '显示 API Key'}
                        onClick={() => setRevealed((value) => !value)}
                      >
                        {revealed ? <EyeOff size={13} /> : <Eye size={13} />}
                      </IconButton>
                    </span>
                  </div>
                </div>
              </Field>

              <Field label="视觉模型" hint="可以先随便填，保存后点「获取」拉真实列表。">
                <TextInput
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  placeholder="例如 gemini-3.7-flash"
                  aria-label="视觉模型"
                  className="font-mono text-[11.5px]"
                />
              </Field>
            </div>
          </div>

          <div className="flex h-12 shrink-0 items-center justify-between gap-3 border-t border-line-soft px-3.5">
            <p className="text-2xs text-ink-faint">
              {canSubmit ? '会立刻保存并切到这条配置' : '填好 Base URL 和一种认证方式'}
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
