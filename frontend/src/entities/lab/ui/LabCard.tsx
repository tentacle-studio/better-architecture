import type { Lab } from '../model/lab'
import { Badge } from '@shared/ui/badge'
import { cn } from '@shared/lib/utils'
import { Clock, ChevronRight } from 'lucide-react'

const DIFFICULTY_STYLES: Record<string, string> = {
  Easy:   'bg-emerald-50 text-emerald-700',
  Medium: 'bg-amber-50 text-amber-700',
  Hard:   'bg-red-50 text-red-700',
}

const STATUS_RING: Record<string, string> = {
  locked:      'opacity-60 cursor-not-allowed',
  available:   '',
  in_progress: 'ring-2 ring-primary/30',
  completed:   'border-emerald-200',
}

interface Props {
  lab: Lab
  onClick?: (lab: Lab) => void
}

export function LabCard({ lab, onClick }: Props) {
  return (
    <button
      className={cn(
        'w-full text-left rounded-xl border border-gray-100 bg-white p-5 shadow-sm',
        'hover:shadow-md hover:border-primary/20 transition-all',
        STATUS_RING[lab.status],
      )}
      onClick={() => onClick?.(lab)}
      disabled={lab.status === 'locked'}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 text-sm truncate">{lab.title}</h3>
          <p className="text-xs text-gray-500 mt-1 line-clamp-2">{lab.description}</p>
        </div>
        <ChevronRight className="h-4 w-4 text-gray-400 shrink-0 mt-0.5" />
      </div>

      <div className="flex items-center gap-2 mt-3">
        <Badge
          variant="secondary"
          className={cn('text-[11px] font-bold border-none', DIFFICULTY_STYLES[lab.difficulty])}
        >
          {lab.difficulty}
        </Badge>
        <div className="flex items-center gap-1 text-[11px] text-gray-400">
          <Clock className="h-3 w-3" />
          {lab.estimatedMinutes} min
        </div>
        {lab.status === 'completed' && (
          <span className="ml-auto text-[11px] font-semibold text-emerald-600">✓ Done</span>
        )}
      </div>
    </button>
  )
}
