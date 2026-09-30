import { Activity, Database, HardDrive, ShieldAlert, ShieldCheck } from 'lucide-react'
import type { ScanPhase } from '@shared/types'
import { useWorkspace } from '@renderer/lib/store'
import { ProgressBar } from '@renderer/components/primitives'
import { cn } from '@renderer/lib/utils'

const PHASE_LABEL: Record<ScanPhase, string> = {
  walking: '正在遍历目录',
  parsing: '正在解析元数据',
  thumbnails: '正在生成缩略图',
  done: '扫描完成',
  error: '扫描出错'
}

function Sep(): React.JSX.Element {
  return <span aria-hidden className="h-3 w-px shrink-0 bg-white/15" />
}

export function StatusBar(): React.JSX.Element {
  const datasets = useWorkspace((s) => s.datasets)
  const images = useWorkspace((s) => s.images)
  const scan = useWorkspace((s) => s.scan)
  const dataDir = useWorkspace((s) => s.dataDir)
  const selectedCount = useWorkspace((s) => s.selectedIds.length)
  const apiReady = useWorkspace((s) => s.apiKey.ready)
  const apiSource = useWorkspace((s) => s.apiKey.source)
  const apiVariable = useWorkspace((s) => s.apiKey.variable)

  const tagged = images.filter((image) => image.tags.length > 0).length
  const scanning = scan !== null && scan.phase !== 'done'

  return (
    <footer className="glass-chrome relative flex h-[var(--statusbar-h)] shrink-0 items-center gap-3 border-t border-line-soft bg-surface px-3 text-2xs text-ink-muted">
      <span className="flex shrink-0 items-center gap-1.5">
        <Database size={12} />
        <span className="num">{images.length} 张图片</span>
      </span>
      <Sep />
      <span className="num shrink-0">{datasets.length} 个数据集</span>
      <Sep />
      <span className={cn('num shrink-0', selectedCount > 0 ? 'text-accent' : 'text-ink-faint')}>
        已选 {selectedCount}
      </span>

      <div className="mx-auto flex min-w-0 items-center gap-2">
        {scanning ? (
          <>
            <Activity size={12} className="shrink-0 text-accent" />
            <span className="shrink-0 truncate text-ink-soft">
              {scan.datasetName} · {PHASE_LABEL[scan.phase]}
            </span>
            <ProgressBar
              className="w-28 shrink-0"
              tone="accent"
              value={scan.current}
              max={Math.max(scan.total, 1)}
              label="扫描进度"
            />
            <span className="num shrink-0">
              {scan.current}/{scan.total}
            </span>
          </>
        ) : images.length > 0 ? (
          <>
            <span className="shrink-0 text-ink-faint">已打标</span>
            <ProgressBar
              className="w-28 shrink-0"
              tone="signal"
              value={tagged}
              max={images.length}
              label="打标进度"
            />
            <span className="num shrink-0">
              {tagged}/{images.length}
            </span>
          </>
        ) : (
          <span className="shrink-0 text-ink-faint">还没有图片，先添加一个数据集文件夹</span>
        )}
      </div>

      <span
        className="flex shrink-0 items-center gap-1.5"
        title={dataDir ? `数据目录：${dataDir}` : undefined}
      >
        <HardDrive size={12} />
        <span>本地存储</span>
      </span>
      <Sep />
      <span
        className={cn(
          'flex shrink-0 items-center gap-1.5',
          apiReady ? 'text-signal' : 'text-warning'
        )}
        title={
          apiReady
            ? apiSource === 'env'
              ? `密钥来自环境变量 ${apiVariable}`
              : '密钥来自设置里保存的值'
            : '既没有环境变量，也没有在设置里填写密钥'
        }
      >
        {apiReady ? <ShieldCheck size={12} /> : <ShieldAlert size={12} />}
        {apiReady
          ? apiSource === 'env'
            ? `API 就绪 · ${apiVariable}`
            : 'API 已配置'
          : 'API 未配置'}
      </span>
    </footer>
  )
}
