import { Command, Cpu, Database, FolderOpen, HardDrive, Server } from 'lucide-react'
import { useWorkspace } from '@renderer/lib/store'
import { formatCount } from '@renderer/lib/utils'
import { Badge, Kbd } from '@renderer/components/primitives'
import { DefinitionRow, InspectorGroup } from '@renderer/components/Panel'
import { Button } from '@renderer/components/Button'

const SHORTCUTS: { keys: string[]; label: string }[] = [
  { keys: ['Ctrl', 'K'], label: '命令面板' },
  { keys: ['Ctrl', '1-6'], label: '切换视图' },
  { keys: ['Ctrl', 'B'], label: '检视面板' },
  { keys: ['Ctrl', 'A'], label: '全选' },
  { keys: ['Space'], label: '选择图片' },
  { keys: ['Enter'], label: '查看详情' },
  { keys: ['Esc'], label: '取消选择' }
]

export function HomeInspector(): React.JSX.Element {
  const datasets = useWorkspace((s) => s.datasets)
  const images = useWorkspace((s) => s.images)
  const tags = useWorkspace((s) => s.tags)
  const activeEndpoint = useWorkspace((s) => s.activeEndpoint)
  const settings = useWorkspace((s) => s.settings)
  const dataDir = useWorkspace((s) => s.dataDir)
  const appVersion = useWorkspace((s) => s.appVersion)
  const setView = useWorkspace((s) => s.setView)

  const apiReady = useWorkspace((s) => s.apiKey.ready)
  const apiKey = useWorkspace((s) => s.apiKey)
  const tagged = images.filter((image) => image.tags.length > 0).length

  return (
    <div className="flex flex-col">
      <InspectorGroup title="运行状态" tone="accent">
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-ink-soft">打标服务</span>
            <Badge tone={apiReady ? 'signal' : 'warning'}>
              {apiReady ? '已配置' : '未配置'}
            </Badge>
          </div>
          <DefinitionRow label="密钥" mono>
            {apiKey.source === 'env'
              ? `环境变量 ${apiKey.variable}`
              : apiKey.source === 'key'
                ? '配置里保存的值'
                : '—'}
          </DefinitionRow>
          <DefinitionRow label="端点" mono>
            {activeEndpoint?.baseUrl.replace(/^https?:\/\//, '') ?? '—'}
          </DefinitionRow>
          <DefinitionRow label="模型" mono>
            {activeEndpoint?.model ?? '—'}
          </DefinitionRow>
          <DefinitionRow label="并发 / 超时">
            {settings.concurrency} · {settings.timeoutMs / 1000}s
          </DefinitionRow>
          {!apiReady ? (
            <Button size="sm" variant="primary" onClick={() => setView('settings')}>
              <Cpu size={13} />
              去配置 API
            </Button>
          ) : null}
        </div>
      </InspectorGroup>

      <InspectorGroup title="本地数据">
        <div className="flex flex-col">
          <DefinitionRow label="图片">{`${formatCount(images.length)} 张`}</DefinitionRow>
          <DefinitionRow label="数据集">{`${datasets.length} 个`}</DefinitionRow>
          <DefinitionRow label="标签词条">{`${formatCount(tags.length)} 个`}</DefinitionRow>
          <DefinitionRow label="已有标签">{`${formatCount(tagged)} 张`}</DefinitionRow>
          <div className="mt-2 flex items-start gap-2 rounded-control border border-line-soft bg-inset p-2">
            <Database size={13} className="mt-px shrink-0 text-ink-faint" />
            <p className="min-w-0 break-all font-mono text-[10px] leading-[1.5] text-ink-muted">
              {dataDir || '—'}
            </p>
          </div>
          <Button
            size="sm"
            variant="ghost"
            className="mt-2 w-full"
            disabled={!dataDir}
            onClick={() => void window.workspace?.shell.openPath(dataDir)}
          >
            <FolderOpen size={13} />
            打开数据目录
          </Button>
        </div>
      </InspectorGroup>

      <InspectorGroup title="快捷键">
        <ul className="flex flex-col gap-1.5">
          {SHORTCUTS.map((item) => (
            <li key={item.label} className="flex items-center justify-between gap-2">
              <span className="text-2xs text-ink-muted">{item.label}</span>
              <span className="flex shrink-0 items-center gap-1.5">
                {item.keys.map((key) => (
                  <Kbd key={key}>{key}</Kbd>
                ))}
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-2 flex items-center gap-1.5 text-[10px] text-ink-faint">
          <Command size={11} />
          macOS 上把 Ctrl 换成 Cmd
        </p>
      </InspectorGroup>

      <InspectorGroup title="存储">
        <div className="flex flex-col gap-2">
          <div className="flex items-start gap-2 rounded-control border border-line-soft bg-inset p-2">
            <HardDrive size={13} className="mt-px shrink-0 text-ink-faint" />
            <div className="min-w-0">
              <p className="text-2xs text-ink-soft">缩略图缓存</p>
              <p className="text-[10px] leading-4 text-ink-faint">
                与索引同级存放，上限 {settings.thumbnailLimitMb / 1024} GB
              </p>
            </div>
          </div>
          <div className="flex items-start gap-2 rounded-control border border-line-soft bg-inset p-2">
            <Server size={13} className="mt-px shrink-0 text-ink-faint" />
            <div className="min-w-0">
              <p className="text-2xs text-ink-soft">应用版本</p>
              <p className="num font-mono text-[10px] text-ink-faint">v{appVersion || '—'}</p>
            </div>
          </div>
        </div>
      </InspectorGroup>
    </div>
  )
}
