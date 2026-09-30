import { useEffect, useState } from 'react'
import { CircleAlert, CircleCheck, Loader2, Plug, Server } from 'lucide-react'
import type { ConnectionTestResult } from '@shared/types'
import { useWorkspace } from '@renderer/lib/store'
import { bridge, type AppInfo } from '@renderer/lib/bridge'
import { Button } from '@renderer/components/Button'
import { Badge } from '@renderer/components/primitives'
import { InspectorGroup } from '@renderer/components/Panel'

export function SettingsInspector(): React.JSX.Element {
  const settings = useWorkspace((s) => s.settings)
  const apiKey = useWorkspace((s) => s.apiKey)
  const activeEndpoint = useWorkspace((s) => s.activeEndpoint)
  const dataDir = useWorkspace((s) => s.dataDir)
  const unsaved = useWorkspace((s) => s.unsavedChanges)
  const saveSettings = useWorkspace((s) => s.saveSettings)
  const fetchModels = useWorkspace((s) => s.fetchModels)
  const fetchingModels = useWorkspace((s) => s.fetchingModels)
  const [result, setResult] = useState<ConnectionTestResult | null>(null)
  const [info, setInfo] = useState<AppInfo | null>(null)

  useEffect(() => {
    void bridge.appInfo().then(setInfo)
  }, [])

  const runTest = async (): Promise<void> => {
    setResult(null)
    if (unsaved) await saveSettings()
    setResult(await fetchModels())
  }

  const keyLabel =
    apiKey.source === 'env'
      ? `${apiKey.variable} · ${apiKey.masked}`
      : apiKey.source === 'key'
        ? `${apiKey.masked}`
        : '未填写'

  return (
    <div className="flex flex-col">
      <InspectorGroup
        title="连接与模型列表"
        tone="accent"
        actions={
          <Button
            size="sm"
            variant="secondary"
            onClick={() => void runTest()}
            disabled={fetchingModels}
          >
            {fetchingModels ? <Loader2 size={12} className="animate-spin" /> : <Plug size={12} />}
            {fetchingModels ? '请求中' : '获取模型'}
          </Button>
        }
      >
        {fetchingModels ? (
          <p className="rounded-control border border-line-soft bg-inset px-2.5 py-2 text-2xs text-ink-muted">
            正在向 {activeEndpoint?.baseUrl ?? '端点'} 请求模型列表…
          </p>
        ) : result ? (
          <div
            role="status"
            className={
              result.ok
                ? 'flex flex-col gap-2 rounded-control border border-signal/40 bg-signal-soft p-2.5'
                : 'flex flex-col gap-2 rounded-control border border-danger/40 bg-danger-soft p-2.5'
            }
          >
            <div className="flex items-start gap-2">
              {result.ok ? (
                <CircleCheck size={14} className="mt-px shrink-0 text-signal" />
              ) : (
                <CircleAlert size={14} className="mt-px shrink-0 text-danger" />
              )}
              <p className="text-2xs leading-[1.6] text-ink-soft">{result.message}</p>
            </div>
            {result.latencyMs !== undefined ? (
              <div className="flex items-center justify-between text-2xs">
                <span className="text-ink-faint">往返延迟</span>
                <span className="num text-ink-soft">{result.latencyMs} ms</span>
              </div>
            ) : null}
            {result.models && result.models.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {result.models.slice(0, 12).map((model) => (
                  <Badge key={model} tone="neutral">
                    {model}
                  </Badge>
                ))}
                {result.models.length > 12 ? (
                  <span className="self-center text-[10px] text-ink-faint">
                    +{result.models.length - 12}
                  </span>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : (
          <p className="rounded-control border border-dashed border-line-soft px-2.5 py-2 text-2xs leading-[1.6] text-ink-faint">
            会真的发一次 <span className="font-mono">GET /models</span> 请求，结果直接写进「视觉模型」下拉框，下次启动不用再拉。
            {unsaved ? '（有未保存的修改，会先保存再请求）' : ''}
          </p>
        )}
      </InspectorGroup>

      <InspectorGroup title="当前配置">
        <div className="flex flex-col divide-y divide-line-soft">
          {[
            { label: '配置', value: activeEndpoint?.name ?? '—' },
            { label: 'Base URL', value: activeEndpoint?.baseUrl ?? '—' },
            { label: '模型', value: activeEndpoint?.model ?? '—' },
            { label: 'API Key', value: keyLabel },
            {
              label: '并发 / 超时',
              value: `${settings.concurrency} · ${settings.timeoutMs / 1000}s`
            },
            { label: '输出格式', value: settings.outputFormat }
          ].map((row) => (
            <div key={row.label} className="flex items-baseline justify-between gap-3 py-1.5">
              <span className="shrink-0 text-2xs text-ink-faint">{row.label}</span>
              <span
                className="min-w-0 truncate text-right font-mono text-[11px] text-ink-soft"
                title={row.value}
              >
                {row.value}
              </span>
            </div>
          ))}
        </div>
      </InspectorGroup>

      <InspectorGroup title="存储位置">
        <div className="flex flex-col gap-2">
          <div className="flex items-start gap-2 rounded-control border border-line-soft bg-inset p-2">
            <Server size={13} className="mt-px shrink-0 text-ink-faint" />
            <div className="min-w-0">
              <p className="text-2xs text-ink-soft">索引与缩略图</p>
              <p className="break-all font-mono text-[10px] text-ink-faint">{dataDir || '—'}</p>
            </div>
          </div>
          <p className="text-[10px] leading-4 text-ink-faint">
            工作台只在这里写入索引和缩略图，不会改动你的图片目录。
          </p>
        </div>
      </InspectorGroup>

      <InspectorGroup title="应用">
        <div className="flex items-start gap-2 rounded-control border border-line-soft bg-inset p-2.5">
          <Server size={14} className="mt-px shrink-0 text-ink-faint" />
          <div className="min-w-0">
            <p className="text-xs text-ink">{info?.name ?? 'ComfyUI 工作台'}</p>
            <p className="num text-2xs text-ink-faint">版本 {info?.version || '—'}</p>
            <p className="mt-1 text-2xs text-ink-faint">
              平台 {info?.platform ?? '—'}
            </p>
          </div>
        </div>
      </InspectorGroup>
    </div>
  )
}
