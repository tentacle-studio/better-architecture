import { useState, useEffect, type ReactNode } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Clock, ChevronRight, Tag, PlayCircle } from 'lucide-react'
import { SideNavbar } from '@widgets/side-navbar'
import { Header } from '@widgets/header'
import { getLab, startLab } from '@entities/lab'
import type { Lab } from '@entities/lab'
import { SubmissionCard } from '@entities/submission'
import type { Submission } from '@entities/submission'
import { httpClient } from '@shared/api'
import { Badge } from '@shared/ui/badge'
import { Button } from '@shared/ui/button'
import { ScrollArea } from '@shared/ui/scroll-area'
import { Skeleton } from '@shared/ui/skeleton'
import { cn } from '@shared/lib/utils'

const DIFFICULTY_STYLES: Record<string, string> = {
  Easy:   'bg-emerald-50 text-emerald-700',
  Medium: 'bg-amber-50 text-amber-700',
  Hard:   'bg-red-50 text-red-700',
}

export function LabDetailPage() {
  const { labId } = useParams<{ labId: string }>()
  const navigate = useNavigate()

  const [lab, setLab] = useState<Lab | null>(null)
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [loading, setLoading] = useState(true)
  const [starting, setStarting] = useState(false)

  useEffect(() => {
    if (!labId) return
    setLoading(true)
    Promise.all([
      getLab(labId),
      httpClient.get<Submission[]>(`/submissions?labId=${labId}`),
    ]).then(([labData, subsRes]) => {
      setLab(labData)
      if (!subsRes.error) setSubmissions(subsRes.data)
      setLoading(false)
    })
  }, [labId])

  const handleStart = async () => {
    if (!labId) return
    setStarting(true)
    const session = await startLab(labId)
    if (session) {
      void navigate(`/labs/${labId}/session/${session.sandboxId}`)
    } else {
      setStarting(false)
    }
  }

  const Shell = ({ children }: { children: ReactNode }) => (
    <div className="flex bg-background min-h-screen">
      <SideNavbar />
      <main className="flex-1 md:ml-64 flex flex-col min-h-screen">
        <Header />
        {children}
      </main>
    </div>
  )

  if (loading) {
    return (
      <Shell>
        <div className="flex-1 p-10 space-y-4">
          <Skeleton className="h-9 w-72" />
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-5 w-1/2" />
        </div>
      </Shell>
    )
  }

  if (!lab) {
    return (
      <Shell>
        <div className="flex-1 flex items-center justify-center">
          <p className="text-gray-400">Lab not found.</p>
        </div>
      </Shell>
    )
  }

  return (
    <Shell>
      <div className="flex-1 p-6 lg:p-10">
        <div className="max-w-4xl mx-auto">
          {/* Title + Start */}
          <div className="flex items-start justify-between gap-6 mb-8">
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 mb-3">
                {lab.title}
              </h1>
              <div className="flex flex-wrap gap-2">
                <Badge
                  variant="secondary"
                  className={cn('font-bold border-none', DIFFICULTY_STYLES[lab.difficulty])}
                >
                  {lab.difficulty}
                </Badge>
                <div className="flex items-center gap-1.5 px-2.5 py-0.5 bg-gray-100 text-gray-600 rounded-full text-[11px] font-semibold">
                  <Clock className="h-3 w-3" />
                  {lab.estimatedMin} min
                </div>
                {lab.tags.map((tag) => (
                  <div
                    key={tag}
                    className="flex items-center gap-1.5 px-2.5 py-0.5 bg-gray-100 text-gray-600 rounded-full text-[11px] font-semibold"
                  >
                    <Tag className="h-3 w-3" />
                    {tag}
                  </div>
                ))}
              </div>
            </div>

            <Button
              size="lg"
              className="gap-2 shrink-0"
              onClick={() => { void handleStart() }}
              disabled={starting || lab.status === 'locked'}
            >
              <PlayCircle className="h-5 w-5" />
              {starting ? 'Starting…' : 'Start Lab'}
              {!starting && <ChevronRight className="h-4 w-4" />}
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Description */}
            <div className="lg:col-span-2 rounded-xl border border-gray-100 bg-white p-8 shadow-sm">
              <div className="prose prose-sm max-w-none text-gray-600 whitespace-pre-wrap leading-relaxed">
                {lab.description}
              </div>
            </div>

            {/* Submissions */}
            <div>
              <h2 className="font-bold text-sm text-gray-900 mb-3 uppercase tracking-wider">
                Previous Submissions
              </h2>
              {submissions.length === 0 ? (
                <p className="text-sm text-gray-400">No submissions yet.</p>
              ) : (
                <ScrollArea className="max-h-[400px]">
                  <div className="space-y-3 pr-2">
                    {submissions.map((s) => (
                      <SubmissionCard key={s.id} submission={s} />
                    ))}
                  </div>
                </ScrollArea>
              )}
            </div>
          </div>
        </div>
      </div>
    </Shell>
  )
}
