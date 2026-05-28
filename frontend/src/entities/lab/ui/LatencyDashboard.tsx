import { Activity, AlertCircle, Gauge, LoaderCircle } from 'lucide-react'
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  XAxis,
  YAxis,
} from 'recharts'
import { cn } from '@shared/lib/utils'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@shared/ui/chart'
import type { LatencySnapshot } from '../model/lab'

const chartConfig = {
  p95: {
    label: 'P95',
    color: '#38bdf8',
  },
  threshold: {
    label: 'Threshold',
    color: '#f97316',
  },
}

function formatLatency(value: number | null) {
  if (value == null) return '--'
  return `${value.toFixed(1)}ms`
}

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function LatencyDashboard({
  snapshot,
  isLoading,
  className,
}: {
  snapshot: LatencySnapshot | null
  isLoading: boolean
  className?: string
}) {
  if (!isLoading && (!snapshot || !snapshot.enabled)) {
    return null
  }

  const statusTone =
    snapshot?.status === 'pass'
      ? 'text-emerald-300 border-emerald-500/30 bg-emerald-500/10'
      : snapshot?.status === 'fail'
        ? 'text-rose-300 border-rose-500/30 bg-rose-500/10'
        : 'text-slate-300 border-slate-500/30 bg-slate-500/10'

  return (
    <section
      className={cn(
        'w-[360px] rounded-xl border border-white/10 bg-[#0b1120]/88 p-4 text-slate-100 shadow-2xl backdrop-blur-md',
        className,
      )}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-100">
            <Activity className="h-4 w-4 text-cyan-300" />
            Latency Dashboard
          </div>
          <p className="mt-1 text-xs text-slate-400">
            {snapshot?.service ? `Service ${snapshot.service}` : 'Sandbox request latency'}
          </p>
        </div>
        <div className={cn('rounded-full border px-2 py-1 text-[11px] font-medium uppercase', statusTone)}>
          {isLoading ? 'Loading' : snapshot?.status ?? 'pending'}
        </div>
      </div>

      {isLoading && !snapshot ? (
        <div className="flex h-48 items-center justify-center text-slate-400">
          <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
          Loading latency data
        </div>
      ) : (
        <>
          <div className="grid grid-cols-4 gap-2">
            <MetricTile label="p50" value={formatLatency(snapshot?.quantiles.p50 ?? null)} />
            <MetricTile label="p95" value={formatLatency(snapshot?.quantiles.p95 ?? null)} />
            <MetricTile label="p99" value={formatLatency(snapshot?.quantiles.p99 ?? null)} />
            <MetricTile
              label="Target"
              value={
                snapshot?.targetThresholdMs
                  ? `${snapshot.targetThresholdMs.toFixed(0)}ms`
                  : '--'
              }
            />
          </div>

          <div className="mt-3 rounded-lg border border-white/10 bg-slate-950/40 p-2">
            {snapshot?.series.length ? (
              <ChartContainer config={chartConfig} className="h-40 w-full">
                <LineChart data={snapshot.series}>
                  <CartesianGrid vertical={false} stroke="rgba(148,163,184,0.16)" />
                  <XAxis
                    dataKey="timestamp"
                    tickLine={false}
                    axisLine={false}
                    minTickGap={20}
                    tickFormatter={formatTime}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    width={40}
                    tickFormatter={(value) => `${Number(value).toFixed(0)}ms`}
                  />
                  <ChartTooltip
                    cursor={false}
                    content={
                      <ChartTooltipContent
                        labelFormatter={(value) => formatTime(String(value))}
                        formatter={(value) => [`${Number(value).toFixed(1)}ms`, 'p95']}
                      />
                    }
                  />
                  <ReferenceLine
                    y={snapshot.targetThresholdMs}
                    stroke="var(--color-threshold)"
                    strokeDasharray="4 4"
                  />
                  <Line
                    type="monotone"
                    dataKey="p95"
                    stroke="var(--color-p95)"
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ChartContainer>
            ) : (
              <div className="flex h-40 flex-col items-center justify-center text-center text-xs text-slate-400">
                <Gauge className="mb-2 h-4 w-4" />
                {snapshot?.message ?? 'Waiting for latency samples.'}
              </div>
            )}
          </div>

          {snapshot?.message && snapshot.status !== 'pending' && (
            <div className="mt-3 flex items-start gap-2 text-xs text-amber-200">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{snapshot.message}</span>
            </div>
          )}
        </>
      )}
    </section>
  )
}

function MetricTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-slate-950/50 px-2 py-2">
      <div className="text-[10px] uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 text-sm font-semibold text-slate-100">{value}</div>
    </div>
  )
}
