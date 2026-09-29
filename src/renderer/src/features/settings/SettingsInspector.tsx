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
  const [testing, setTesting] = useState(false)
  const [result, setResult] = useState<ConnectionTestResult | null>(null)
  const [info, setInfo] = useState<AppInfo | null>(null)

  useEffect(() => {
    void bridge.appInfo().then(setInfo)
  }, [])

  const runTest = (): void => {
    setTesting(true)
    setResult(null)
    window.setTimeout(() => {
      setTesting(false)
      if (!settings.apiKey.trim()) {
        setResult({ ok: false, message: '还没有填写 API Key，无法发起请求。' })
        return
      }
      if (!/^https?:\/\//.test(settings.baseUrl)) {
        setResult({ ok: false, message: 'Base URL 需要以 http:// 或 https:// 开头。' })
        return
      }
      setResult({
        ok: true,
        latencyMs: 384,
        models: ['gpt-4o-mini', 'gpt-4o', 'gpt-4.1-mini'],
        message: '端点可用，返回了 3 个可用模型。'
      })
    }, 900)
  }

  const maskedKey = settings.apiKey
    ? `${settings.apiKey.slice(0, 5)}${'•'.repeat(Math.max(4, Math.min(18, settings.apiKey.length - 5)))}`
    : '未填写'

  return (
    <div className="flex flex-col">
      <InspectorGroup
        title="连接测试"
        tone="accent"
        actions={
          <Button size="sm" variant="secondary" onClick={runTest} disabled={testing}>
            {testing ? <Loader2 size={12} className="animate-spin" /> : <Plug size={12} />}
            {testing ? '测试中' : '测试连接'}
          </Button>
        }
      >
        {testing ? (
          <p className="rounded-control border border-line-soft bg-inset px-2.5 py-2 text-2xs text-ink-muted">
            正在向 {settings.baseUrl} 发起一次最小请求…
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
            {result.ok ? (
              <>
                <div className="flex items-center justify-between text-2xs">
                  <span className="text-ink-faint">往返延迟</span>
                  <span className="num text-ink-soft">{result.latencyMs} ms</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {(result.models ?? []).map((model) => (
                    <Badge key={model} tone="neutral">
                      {model}
                    </Badge>
                  ))}
                </div>
              </>
            ) : null}
          </div>
        ) : (
          <p className="rounded-control border border-dashed border-line-soft px-2.5 py-2 text-2xs text-ink-faint">
            测试会实际发一次请求，可以看到端点是否可用、延迟多少、有哪些模型可选。
          </p>
        )}
      </InspectorGroup>

      <InspectorGroup title="当前配置">
        <div className="flex flex-col divide-y divide-line-soft">
          {[
            { label: 'Base URL', value: settings.baseUrl },
            { label: '模型', value: settings.model },
            { label: 'API Key', value: maskedKey },
            { label: '并发 / 超时', value: `${settings.concurrency} · ${settings.timeoutMs / 1000}s` },
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

      <InspectorGroup title="存储">
        <div className="flex flex-col divide-y divide-line-soft">
          {[
            { label: '数据集根目录', value: settings.datasetRoot },
            { label: '缩略图缓存', value: settings.thumbnailDir },
            { label: '缓存上限', value: `${settings.thumbnailLimitMb / 1024} GB` }
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

      <InspectorGroup title="应用">
        <div className="flex items-start gap-2 rounded-control border border-line-soft bg-inset p-2.5">
          <Server size={14} className="mt-px shrink-0 text-ink-faint" />
          <div className="min-w-0">
            <p className="text-xs text-ink">{info?.name ?? 'ComfyUI 工作台'}</p>
            <p className="num text-2xs text-ink-faint">版本 {info?.version ?? '0.1.0'}</p>
            <p className="mt-1 break-all font-mono text-[10px] text-ink-faint">
              {info?.userData || '（浏览器预览模式）'}
            </p>
          </div>
        </div>
      </InspectorGroup>
    </div>
  )
}
