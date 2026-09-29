import { useState } from 'react'
import { Eye, EyeOff, Save, ShieldCheck } from 'lucide-react'
import { useWorkspace, type Density, type MotionLevel } from '@renderer/lib/store'
import { Button } from '@renderer/components/Button'
import { Badge } from '@renderer/components/primitives'
import { Panel } from '@renderer/components/Panel'
import { IconButton } from '@renderer/components/IconButton'
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

const MODEL_OPTIONS = [
  { value: 'gpt-4o-mini', label: 'gpt-4o-mini' },
  { value: 'gpt-4o', label: 'gpt-4o' },
  { value: 'qwen-vl-max', label: 'qwen-vl-max' },
  { value: 'glm-4v-plus', label: 'glm-4v-plus' },
  { value: 'llava-1.6-34b', label: 'llava-1.6-34b（本地 vLLM）' }
]

const FORMAT_OPTIONS = [
  { value: 'tags', label: '逗号标签' },
  { value: 'caption', label: '自然语言' },
  { value: 'json', label: '分类 JSON' }
]

export function SettingsView(): React.JSX.Element {
  const settings = useWorkspace((s) => s.settings)
  const updateSettings = useWorkspace((s) => s.updateSettings)
  const unsaved = useWorkspace((s) => s.unsavedChanges)
  const setUnsaved = useWorkspace((s) => s.setUnsavedChanges)
  const pushToast = useWorkspace((s) => s.pushToast)
  const density = useWorkspace((s) => s.density)
  const setDensity = useWorkspace((s) => s.setDensity)
  const motion = useWorkspace((s) => s.motion)
  const setMotion = useWorkspace((s) => s.setMotion)
  const inspectorWidth = useWorkspace((s) => s.inspectorWidth)
  const setInspectorWidth = useWorkspace((s) => s.setInspectorWidth)
  const [revealed, setRevealed] = useState(false)

  const save = (): void => {
    setUnsaved(false)
    pushToast({
      tone: 'success',
      title: '设置已保存',
      description: '配置写入本地数据库，下次启动自动生效。'
    })
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex max-w-[820px] flex-col gap-4 p-4">
          <Panel
            title="API 配置"
            bodyClassName="px-4 py-1"
            actions={
              <Badge tone={settings.apiKey ? 'signal' : 'warning'}>
                {settings.apiKey ? '已配置' : '未配置'}
              </Badge>
            }
          >
            <SettingRow
              label="Base URL"
              description="任意 OpenAI 兼容端点，例如 DeepSeek、通义、vLLM、Ollama。"
              control={
                <TextInput
                  value={settings.baseUrl}
                  onChange={(e) => updateSettings({ baseUrl: e.target.value })}
                  placeholder="https://api.openai.com/v1"
                  aria-label="Base URL"
                />
              }
            />
            <SettingRow
              label="API Key"
              description="只保存在本机数据库中，不会随导出或同步外发。"
              control={
                <div className="relative w-full">
                  <TextInput
                    type={revealed ? 'text' : 'password'}
                    value={settings.apiKey}
                    onChange={(e) => updateSettings({ apiKey: e.target.value })}
                    placeholder="sk-..."
                    aria-label="API Key"
                    className="pr-9"
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
              }
            />
            <SettingRow
              label="视觉模型"
              description="需要支持图片输入的多模态模型。"
              control={
                <Select
                  ariaLabel="视觉模型"
                  value={settings.model}
                  onChange={(value) => updateSettings({ model: value })}
                  options={MODEL_OPTIONS}
                />
              }
            />
            <SettingRow
              label="请求超时"
              description="单张图片超过这个时间就判定失败并重试。"
              control={
                <div className="flex w-full items-center gap-2.5">
                  <Slider
                    ariaLabel="请求超时"
                    min={5000}
                    max={120000}
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
          </Panel>

          <Panel title="打标默认值" bodyClassName="px-4 py-1">
            <SettingRow
              label="默认输出格式"
              control={
                <Segmented
                  ariaLabel="默认输出格式"
                  value={settings.outputFormat}
                  onChange={(value) =>
                    updateSettings({ outputFormat: value as typeof settings.outputFormat })
                  }
                  items={FORMAT_OPTIONS}
                />
              }
            />
            <SettingRow
              label="允许模型自造新标签"
              description="关闭后只允许输出标签库中已有的词，词表更干净但覆盖更窄。"
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
            <div className="border-b border-line-soft py-3 last:border-b-0">
              <Field
                label="打标提示词模板"
                hint="模板里会注入受控词表与输出格式要求。修改后只影响新的打标任务。"
              >
                <TextArea
                  rows={12}
                  value={settings.template}
                  onChange={(e) => updateSettings({ template: e.target.value })}
                  className="font-mono text-[11.5px]"
                  aria-label="打标提示词模板"
                />
              </Field>
            </div>
          </Panel>

          <Panel title="路径与缓存" bodyClassName="px-4 py-1">
            <SettingRow
              label="数据集根目录"
              description="添加数据集时的默认起始位置。"
              control={
                <TextInput
                  value={settings.datasetRoot}
                  onChange={(e) => updateSettings({ datasetRoot: e.target.value })}
                  aria-label="数据集根目录"
                  className="font-mono text-[11.5px]"
                />
              }
            />
            <SettingRow
              label="缩略图缓存目录"
              control={
                <TextInput
                  value={settings.thumbnailDir}
                  onChange={(e) => updateSettings({ thumbnailDir: e.target.value })}
                  aria-label="缩略图缓存目录"
                  className="font-mono text-[11.5px]"
                />
              }
            />
            <SettingRow
              label="缓存上限"
              description="超出后按最久未访问优先清理。"
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
          </Panel>

          <Panel title="外观" bodyClassName="px-4 py-1">
            <SettingRow
              label="界面密度"
              description="紧凑模式会减小行高与缩略图间距，一屏容纳更多内容。"
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
              description="面板开合、悬停反馈的动画强度。系统开启「减少动态效果」时自动降级。"
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

      <div className="flex h-12 shrink-0 items-center justify-between gap-3 border-t border-line bg-surface px-4">
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
          <Button variant="ghost" size="sm" disabled={!unsaved} onClick={() => setUnsaved(false)}>
            放弃修改
          </Button>
          <Button variant="primary" size="sm" disabled={!unsaved} onClick={save}>
            <Save size={13} />
            保存设置
          </Button>
        </div>
      </div>
    </div>
  )
}
