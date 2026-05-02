import type { Submission } from '../model/submission'
import { Badge } from '@shared/ui/badge'
import { cn } from '@shared/lib/utils'
import { CheckCircle2, XCircle } from 'lucide-react'

interface Props {
  submission: Submission
}

export function SubmissionCard({ submission }: Props) {
  const isPassed = submission.status === 'passed'
  const date = new Date(submission.createdAt).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })

  return (
    <div className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <Badge
          variant="secondary"
          className={cn(
            'font-bold border-none text-[11px]',
            isPassed ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700',
          )}
        >
          {isPassed ? 'Passed' : 'Failed'}
        </Badge>
        <span className="text-xs text-gray-400">{date}</span>
      </div>

      <p className="text-sm text-gray-600 mb-3">
        Score:{' '}
        <strong className="text-gray-900">
          {submission.score}/{submission.maxScore}
        </strong>
      </p>

      <ul className="space-y-1.5">
        {submission.checks.map((check, i) => (
          <li key={i} className="flex items-start gap-2 text-xs text-gray-500">
            {check.passed ? (
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 mt-0.5 shrink-0" />
            ) : (
              <XCircle className="h-3.5 w-3.5 text-red-400 mt-0.5 shrink-0" />
            )}
            <span>
              <strong className="text-gray-700">{check.name}:</strong> {check.message}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
