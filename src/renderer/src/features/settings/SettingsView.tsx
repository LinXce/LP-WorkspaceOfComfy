import { useState } from 'react'
import { Download, Eye, EyeOff, Plus, Radio, RotateCcw, Save, ShieldCheck, Trash2 } from 'lucide-react'
import type { OutputFormat } from '@shared/types'
import { useWorkspace, type Density, type MotionLevel } from '@renderer/lib/store'
import { OUTPUT_FORMAT_OPTIONS, modelOptionsFor } from '@renderer/lib/catalog'
import { Button } from '@renderer/components/Button'
import { Badge } from '@renderer/components/primitives'
import { Panel } from '@renderer/components/Panel'
import { IconButton } from '@renderer/components/IconButton'
import { Pills } from '@renderer/components/Pills'
import {
  Field,
  Segmented,
  Select,
  SettingRow,
  Slider,
  Switch,
  TextArea,
  TextInput
} from '@renderer/components/fields'
import { EndpointDialog } from './EndpointDialog'
import { PromptDialog } from './PromptDialog'
import { useEndpointDraft } from './useEndpointDraft'
import { usePromptDraft } from './usePromptDraft'

export function SettingsView(): React.JSX.Element {
  const settings = useWorkspace((s) => s.settings)
  const apiKey = useWorkspace((s) => s.apiKey)
  const endpoints = useWorkspace((s) => s.endpoints)
  const endpointsFile = useWorkspace((s) => s.endpointsFile)
  const activateEndpoint = useWorkspace((s) => s.activateEndpoint)
  const removeEndpoint = useWorkspace((s) => s.removeEndpoint)
  const upsertEndpoint = useWorkspace((s) => s.upsertEndpoint)
  const prompts = useWorkspace((s) => s.prompts)
  const promptsFile = useWorkspace((s) => s.promptsFile)
  const activatePrompt = useWorkspace((s) => s.activatePrompt)
  const removePrompt = useWorkspace((s) => s.removePrompt)
  const resetPrompt = useWorkspace((s) => s.resetPrompt)
  const upsertPrompt = useWorkspace((s) => s.upsertPrompt)
  const setOutputFormat = useWorkspace((s) => s.setOutputFormat)
  const updateSettings = useWorkspace((s) => s.updateSettings)
  const saveSettings = useWorkspace((s) => s.saveSettings)
  const fetchModels = useWorkspace((s) => s.fetchModels)
  const fetchingModels = useWorkspace((s) => s.fetchingModels)
  const unsaved = useWorkspace((s) => s.unsavedChanges)
  const dataDir = useWorkspace((s) => s.dataDir)
  const density = useWorkspace((s) => s.density)
  const setDensity = useWorkspace((s) => s.setDensity)
  const motion = useWorkspace((s) => s.motion)
  const setMotion = useWorkspace((s) => s.setMotion)
  const inspectorWidth = useWorkspace((s) => s.inspectorWidth)
  const setInspectorWidth = useWorkspace((s) => s.setInspectorWidth)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [promptDialogOpen, setPromptDialogOpen] = useState(false)
  const [revealed, setRevealed] = useState(false)
  const { draft, patch } = useEndpointDraft()
  const { draft: promptDraft, patch: patchPrompt } = usePromptDraft()

  const models = modelOptionsFor(draft)
  const usingEnv = Boolean(draft?.envVar.trim())
  const usingKey = Boolean(draft?.apiKey.trim())
  const envLive = usingEnv && draft && apiKey.variable === draft.envVar.trim()

  const changeMode = (mode: string): void => {
    setOutputFormat(mode as OutputFormat)
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex max-w-[820px] flex-col gap-4 p-4">
          <Panel
            title="API 配置"
            bodyClassName="px-4 py-1"
            actions={
              apiKey.ready ? (
                <Badge tone={apiKey.source === 'env' ? 'signal' : 'accent'}>
                  {apiKey.source === 'env' ? `环境变量 ${apiKey.variable}` : '已填密钥'}
                </Badge>
              ) : (
                <Badge tone="warning">未配置</Badge>
              )
            }
          >
            <div className="border-b border-line-soft py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs text-ink">服务来源</p>
                  <p className="mt-0.5 text-2xs leading-[1.7] text-ink-faint">
                    选中的那条立刻生效，同时只有一条在工作。配置存在本地文件里，改完即时保存。
                  </p>
                </div>
                <Button size="sm" variant="secondary" onClick={() => setDialogOpen(true)}>
                  <Plus size={13} />
                  添加配置
                </Button>
              </div>
              <Pills
                ariaLabel="服务来源"
                className="mt-2.5"
                value={draft?.id ?? ''}
                onChange={(id) => void activateEndpoint(id)}
                items={endpoints.map((item) => ({
                  value: item.id,
                  label: item.name || item.baseUrl || '未命名配置'
                }))}
              />
            </div>

            {!draft ? (
              <div className="py-6">
                <p className="text-center text-xs text-ink-muted">
                  还没有任何配置，点右上角「添加配置」新建一条。
                </p>
              </div>
            ) : (
              <>
                <SettingRow
                  label="配置名称"
                  description="只在上面这排胶囊里显示。"
                  control={
                    <TextInput
                      value={draft.name}
                      onChange={(e) => patch({ name: e.target.value })}
                      placeholder="例如：Faro 中转"
                      aria-label="配置名称"
                    />
                  }
                />
                <SettingRow
                  label="Base URL"
                  description="任意 OpenAI 兼容端点，需要支持图片输入。"
                  control={
                    <TextInput
                      value={draft.baseUrl}
                      onChange={(e) => patch({ baseUrl: e.target.value, availableModels: [] })}
                      placeholder="https://faroapi.com/v1"
                      aria-label="Base URL"
                      className="font-mono text-[11.5px]"
                    />
                  }
                />
                <SettingRow
                  label="环境变量名"
                  description={
                    envLive
                      ? apiKey.ready
                        ? `已读到 ${apiKey.variable} 的值（${apiKey.masked}）。`
                        : `系统里没有 ${apiKey.variable}，或者启动后没重启过工作台。`
                      : '填了这栏就会忽略下面的 API Key，两者只能填一个。'
                  }
                  control={
                    <TextInput
                      value={draft.envVar}
                      onChange={(e) =>
                        patch({ envVar: e.target.value, ...(e.target.value ? { apiKey: '' } : {}) })
                      }
                      placeholder="FARO_API_KEY"
                      aria-label="环境变量名"
                      className="font-mono text-[11.5px]"
                      disabled={usingKey}
                    />
                  }
                />
                <SettingRow
                  label="API Key"
                  description={
                    usingKey
                      ? '直接写在配置里，明文存在本地文件中。'
                      : '填了这栏就会清空上面的环境变量名。'
                  }
                  control={
                    <div className="relative w-full">
                      <TextInput
                        type={revealed ? 'text' : 'password'}
                        value={draft.apiKey}
                        onChange={(e) =>
                          patch({ apiKey: e.target.value, ...(e.target.value ? { envVar: '' } : {}) })
                        }
                        placeholder={usingEnv ? '（由环境变量提供）' : 'sk-...'}
                        aria-label="API Key"
                        className="pr-9 font-mono text-[11.5px]"
                        disabled={usingEnv}
                      />
                      <span className="absolute right-1 top-1">
                        <IconButton
                          size="sm"
                          aria-label={revealed ? '隐藏 API Key' : '显示 API Key'}
                          onClick={() => setRevealed((value) => !value)}
                          disabled={usingEnv}
                        >
                          {revealed ? <EyeOff size={13} /> : <Eye size={13} />}
                        </IconButton>
                      </span>
                    </div>
                  }
                />
                <SettingRow
                  label="视觉模型"
                  description={
                    draft.availableModels.length > 0
                      ? `列表来自端点，共 ${draft.availableModels.length} 个。`
                      : '点右边的「获取」可以从这个端点拉真实模型列表。'
                  }
                  control={
                    <div className="flex w-full items-center gap-2">
                      <Select
                        ariaLabel="视觉模型"
                        value={draft.model}
                        onChange={(value) => patch({ model: value })}
                        options={models}
                        className="min-w-0 flex-1"
                      />
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={fetchingModels}
                        onClick={() => void fetchModels()}
                      >
                        <Download size={13} />
                        {fetchingModels ? '获取中' : '获取'}
                      </Button>
                    </div>
                  }
                />
                <div className="border-b border-line-soft py-3 last:border-b-0">
                  <div className="flex items-start gap-2 rounded-control border border-line-soft bg-inset p-2.5">
                    <Radio size={13} className="mt-px shrink-0 text-ink-faint" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-ink">用环境变量免填密钥</p>
                      <p className="mt-0.5 text-2xs leading-[1.7] text-ink-faint">
                        工作台每次启动读一次环境变量。改了变量要重启工作台才会生效。
                      </p>
                      <pre className="mt-1.5 overflow-x-auto rounded-xs bg-canvas px-2 py-1.5 font-mono text-[10.5px] leading-[1.7] text-ink-soft">
                        {`# PowerShell，当前会话有效
$env:${draft.envVar || 'FARO_API_KEY'}="你的密钥"

# PowerShell，永久生效（重开终端）
[Environment]::SetEnvironmentVariable("${draft.envVar || 'FARO_API_KEY'}","你的密钥","User")`}
                      </pre>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="text-xs text-ink">删除这条配置</p>
                    <p className="mt-0.5 text-2xs leading-[1.7] text-ink-faint">
                      {endpoints.length <= 1
                        ? '这是最后一条，删掉之后要先新建一条才能打标。'
                        : '只删配置，不动已经打好的标签。'}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => void removeEndpoint(draft.id)}
                  >
                    <Trash2 size={13} />
                    删除
                  </Button>
                </div>
              </>
            )}
          </Panel>

          <Panel title="打标默认值" bodyClassName="px-4 py-1">
            <SettingRow
              label="默认输出格式"
              description="「标签」输出逗号分隔的 tag；「描述」输出一句自然语言。切换会自动换上对应的预设模板。"
              control={
                <Segmented
                  ariaLabel="默认输出格式"
                  value={settings.outputFormat}
                  onChange={changeMode}
                  items={OUTPUT_FORMAT_OPTIONS}
                />
              }
            />
            <SettingRow
              label="请求超时"
              description="单张图片超过这个时间就判定失败。"
              control={
                <div className="flex w-full items-center gap-2.5">
                  <Slider
                    ariaLabel="请求超时"
                    min={5000}
                    max={180000}
                    step={5000}
                    value={settings.timeoutMs}
                    onChange={(value) => updateSettings({ timeoutMs: value })}
                  />
                  <span className="num w-12 shrink-0 text-right text-xs text-ink-soft">
                    {settings.timeoutMs / 1000}s
                  </span>
                </div>
              }
            />
            <SettingRow
              label="并发请求数"
              description="调低可以避开服务商的速率限制。"
              control={
                <div className="flex w-full items-center gap-2.5">
                  <Slider
                    ariaLabel="并发请求数"
                    min={1}
                    max={12}
                    value={settings.concurrency}
                    onChange={(value) => updateSettings({ concurrency: value })}
                  />
                  <span className="num w-6 shrink-0 text-right text-xs text-ink-soft">
                    {settings.concurrency}
                  </span>
                </div>
              }
            />
            <SettingRow
              label="允许模型自造新标签"
              description="关闭后只允许输出标签库里已有的词。"
              control={
                <Switch
                  ariaLabel="允许模型自造新标签"
                  checked={settings.allowNewTags}
                  onChange={(checked) => updateSettings({ allowNewTags: checked })}
                />
              }
            />
            <SettingRow
              label="覆盖已有标签"
              description="开启后每次打标会先清空该图原有标签。"
              control={
                <Switch
                  ariaLabel="覆盖已有标签"
                  checked={settings.overwrite}
                  onChange={(checked) => updateSettings({ overwrite: checked })}
                />
              }
            />
          </Panel>

          <Panel
            title="提示词模板"
            bodyClassName="px-4 py-1"
            actions={
              promptDraft ? (
                <Badge tone={promptDraft.builtin ? 'neutral' : 'accent'}>
                  {promptDraft.builtin ? '内置' : '自定义'}
                </Badge>
              ) : null
            }
          >
            <div className="border-b border-line-soft py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs text-ink">用哪套提示词</p>
                  <p className="mt-0.5 text-2xs leading-[1.7] text-ink-faint">
                    选中的那套作为 system prompt 发给模型，改完即时保存到本地文件。
                    切换输出模式时，内置模板会跟着换成对应模式那套。
                  </p>
                </div>
                <Button size="sm" variant="secondary" onClick={() => setPromptDialogOpen(true)}>
                  <Plus size={13} />
                  添加提示词
                </Button>
              </div>
              <Pills
                ariaLabel="提示词模板"
                className="mt-2.5"
                value={promptDraft?.id ?? ''}
                onChange={(id) => void activatePrompt(id)}
                items={prompts.map((item) => ({ value: item.id, label: item.name }))}
              />
            </div>

            {!promptDraft ? (
              <div className="py-6">
                <p className="text-center text-xs text-ink-muted">
                  还没有提示词，点右上角「添加提示词」新建一套。
                </p>
              </div>
            ) : (
              <>
                <SettingRow
                  label="模板名称"
                  description="只在上面这排胶囊里显示。"
                  control={
                    <TextInput
                      value={promptDraft.name}
                      onChange={(e) => patchPrompt({ name: e.target.value })}
                      placeholder="例如：我的标签模板"
                      aria-label="模板名称"
                    />
                  }
                />
                <div className="border-b border-line-soft py-3">
                  <Field
                    label="模板内容"
                    hint="原样作为 system prompt 发出；受控词表和输出格式要求会自动追加在后面。"
                  >
                    <TextArea
                      rows={14}
                      value={promptDraft.text}
                      onChange={(e) => patchPrompt({ text: e.target.value })}
                      className="font-mono text-[11.5px]"
                      aria-label="模板内容"
                    />
                  </Field>
                </div>
                <div className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="text-xs text-ink">这套提示词</p>
                    <p className="mt-0.5 text-2xs leading-[1.7] text-ink-faint">
                      {promptDraft.builtin
                        ? '内置模板，内容可以改，也能随时恢复原样。'
                        : '你自己加的模板，改坏了没法还原内置内容。'}
                      {prompts.length <= 1 ? ' 这是最后一套，删不掉。' : ''}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {promptDraft.builtin ? (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => void resetPrompt(promptDraft.id)}
                      >
                        <RotateCcw size={12} />
                        恢复内置内容
                      </Button>
                    ) : null}
                    <Button
                      size="sm"
                      variant="danger"
                      disabled={prompts.length <= 1}
                      onClick={() => void removePrompt(promptDraft.id)}
                    >
                      <Trash2 size={13} />
                      删除
                    </Button>
                  </div>
                </div>
              </>
            )}
          </Panel>

          <Panel title="存储" bodyClassName="px-4 py-1">
            <SettingRow
              label="数据集起始目录"
              description="「添加数据集」时文件选择器的默认位置。"
              control={
                <TextInput
                  value={settings.datasetRoot}
                  onChange={(e) => updateSettings({ datasetRoot: e.target.value })}
                  aria-label="数据集起始目录"
                  className="font-mono text-[11.5px]"
                />
              }
            />
            <SettingRow
              label="缩略图缓存上限"
              description="超出后按最久未访问优先清理（当前版本尚未自动清理）。"
              control={
                <div className="flex w-full items-center gap-2.5">
                  <Slider
                    ariaLabel="缩略图缓存上限"
                    min={256}
                    max={8192}
                    step={256}
                    value={settings.thumbnailLimitMb}
                    onChange={(value) => updateSettings({ thumbnailLimitMb: value })}
                  />
                  <span className="num w-14 shrink-0 text-right text-xs text-ink-soft">
                    {settings.thumbnailLimitMb / 1024} GB
                  </span>
                </div>
              }
            />
            <div className="border-b border-line-soft py-3 last:border-b-0">
              <p className="text-xs font-medium text-ink-soft">索引与缩略图</p>
              <p className="mt-0.5 break-all font-mono text-[11px] text-ink-faint">
                {dataDir || '—'}
              </p>
              <p className="mt-2.5 text-xs font-medium text-ink-soft">API 配置文件</p>
              <p className="mt-0.5 break-all font-mono text-[11px] text-ink-faint">
                {endpointsFile || '—'}
              </p>
              <Button
                size="sm"
                variant="secondary"
                className="mt-2"
                disabled={!dataDir}
                onClick={() => void window.workspace?.shell.openPath(dataDir)}
              >
                在文件管理器中打开
              </Button>
            </div>
          </Panel>

          <Panel title="外观" bodyClassName="px-4 py-1">
            <SettingRow
              label="界面密度"
              description="紧凑模式会减小行高与缩略图间距。"
              control={
                <Segmented
                  ariaLabel="界面密度"
                  value={density}
                  onChange={(value) => setDensity(value as Density)}
                  items={[
                    { value: 'comfortable', label: '舒适' },
                    { value: 'compact', label: '紧凑' }
                  ]}
                />
              }
            />
            <SettingRow
              label="动效级别"
              description="面板开合与悬停反馈的动画强度。"
              control={
                <Segmented
                  ariaLabel="动效级别"
                  value={motion}
                  onChange={(value) => setMotion(value as MotionLevel)}
                  items={[
                    { value: 'full', label: '完整' },
                    { value: 'reduced', label: '精简' },
                    { value: 'none', label: '无' }
                  ]}
                />
              }
            />
            <SettingRow
              label="检视面板宽度"
              description="也可以直接拖拽检视面板的左边缘。"
              control={
                <div className="flex w-full items-center gap-2.5">
                  <Slider
                    ariaLabel="检视面板宽度"
                    min={288}
                    max={520}
                    value={inspectorWidth}
                    onChange={setInspectorWidth}
                  />
                  <span className="num w-10 shrink-0 text-right text-xs text-ink-soft">
                    {inspectorWidth}
                  </span>
                </div>
              }
            />
          </Panel>
        </div>
      </div>

      <div className="flex h-12 shrink-0 items-center justify-between gap-3 border-t border-line-soft bg-surface px-4">
        <div className="flex items-center gap-2 text-2xs">
          {unsaved ? (
            <>
              <span className="size-1.5 rounded-pill bg-warning" />
              <span className="text-warning">有未保存的修改</span>
            </>
          ) : (
            <>
              <ShieldCheck size={12} className="text-signal" />
              <span className="text-ink-muted">所有修改已保存</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="primary" size="sm" disabled={!unsaved} onClick={() => void saveSettings()}>
            <Save size={13} />
            保存设置
          </Button>
        </div>
      </div>

      <EndpointDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={(config) => void upsertEndpoint(config)}
      />

      <PromptDialog
        open={promptDialogOpen}
        onOpenChange={setPromptDialogOpen}
        onSubmit={(prompt) => void upsertPrompt(prompt)}
      />
    </div>
  )
}
