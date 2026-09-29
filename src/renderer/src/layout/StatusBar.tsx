import { Activity, Database, HardDrive, ShieldCheck, ShieldAlert } from 'lucide-react'
import { useWorkspace } from '@renderer/lib/store'
import { MOCK_DATASETS, MOCK_IMAGES, MOCK_JOBS } from '@renderer/lib/mock'
import { ProgressBar } from '@renderer/components/primitives'
import { cn } from '@renderer/lib/utils'

function Sep(): React.JSX.Element {
  return <span aria-hidden className="h-3 w-px shrink-0 bg-line" />
}

export function StatusBar(): React.JSX.Element {
  const selectedCount = useWorkspace((s) => s.selectedIds.length)
  const apiKey = useWorkspace((s) => s.settings.apiKey)
  const runningJob = MOCK_JOBS.find((job) => job.status === 'running')
  const total = MOCK_IMAGES.length
  const jobTotal = runningJob?.items.length ?? 0

  return (
    <footer className="flex h-[var(--statusbar-h)] shrink-0 items-center gap-3 border-t border-line bg-surface px-3 text-2xs text-ink-muted">
      <span className="flex shrink-0 items-center gap-1.5">
        <Database size={12} />
        <span className="num">{total} 张图片</span>
      </span>
      <Sep />
      <span className="num shrink-0">{MOCK_DATASETS.length} 个数据集</span>
      <Sep />
      <span className={cn('num shrink-0', selectedCount > 0 ? 'text-accent' : 'text-ink-faint')}>
        已选 {selectedCount}
      </span>

      <div className="mx-auto flex min-w-0 items-center gap-2">
        {runningJob ? (
          <>
            <Activity size={12} className="shrink-0 text-signal" />
            <span className="shrink-0 truncate text-ink-soft">{runningJob.name}</span>
            <ProgressBar
              className="w-28 shrink-0"
              tone="signal"
              value={runningJob.done}
              max={jobTotal}
              label="打标进度"
            />
            <span className="num shrink-0">
              {runningJob.done}/{jobTotal}
            </span>
            {runningJob.failed > 0 ? (
              <span className="num shrink-0 text-danger">失败 {runningJob.failed}</span>
            ) : null}
          </>
        ) : (
          <span className="shrink-0 text-ink-faint">没有正在运行的后台任务</span>
        )}
      </div>

      <span className="flex shrink-0 items-center gap-1.5">
        <HardDrive size={12} />
        <span className="num">缩略图缓存 128 MB</span>
      </span>
      <Sep />
      <span
        className={cn('flex shrink-0 items-center gap-1.5', apiKey ? 'text-signal' : 'text-warning')}
      >
        {apiKey ? <ShieldCheck size={12} /> : <ShieldAlert size={12} />}
        {apiKey ? 'API 已配置' : 'API 未配置'}
      </span>
    </footer>
  )
}
