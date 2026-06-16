import { useState, type ReactNode } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Terminal, ChevronLeft, Power } from 'lucide-react'
import { SideNavbar } from '@widgets/side-navbar'
import { Header } from '@widgets/header'
import { ResourceList, useResourceStream } from '@entities/resource'
import { httpClient } from '@shared/api'
import { Button } from '@shared/ui/button'
import { Badge } from '@shared/ui/badge'

export function LabSessionPage() {
  const { labId, sandboxId } = useParams<{ labId: string; sandboxId: string }>()
  const navigate = useNavigate()

  const [disconnecting, setDisconnecting] = useState(false)

  const wsUrl = `ws://${window.location.host}`

  const { resources, isLoading, error } = useResourceStream({
    sandboxId: sandboxId || null,
    wsUrl,
  })

  const handleDisconnect = async () => {
    if (!sandboxId) return
    setDisconnecting(true)
    try {
      await httpClient.delete(`/labs/${labId}/session/${sandboxId}`)
    } catch {
      // Ignore errors on disconnect
    } finally {
      setDisconnecting(false)
      void navigate(`/labs/${labId}`)
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

  return (
    <Shell>
      <div className="flex-1 p-6 lg:p-10">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  void navigate(`/labs/${labId}`)
                }}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Lab Sandbox</h1>
                <p className="text-sm text-gray-500">Sandbox ID: {sandboxId}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="font-mono text-xs">
                Active Session
              </Badge>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDisconnect}
                disabled={disconnecting}
              >
                <Power className="h-4 w-4 mr-1" />
                {disconnecting ? 'Disconnecting...' : 'Disconnect'}
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Resource Monitor */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <Terminal className="h-5 w-5 text-gray-600" />
                <h2 className="text-lg font-semibold text-gray-900">Infrastructure Resources</h2>
              </div>
              <div className="rounded-lg border bg-white p-4">
                <ResourceList resources={resources} isLoading={isLoading} error={error} />
              </div>
            </div>

            {/* Terminal / Info Panel */}
            <div className="space-y-4">
              <div className="rounded-lg border bg-white p-4">
                <h3 className="font-semibold text-gray-900 mb-3">Quick Actions</h3>
                <div className="space-y-2">
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => {
                      void navigate(`/labs/${labId}/session/${sandboxId}/terminal`)
                    }}
                  >
                    <Terminal className="h-4 w-4 mr-2" />
                    Open Terminal
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    disabled
                    title="Canvas view coming soon"
                  >
                    <span className="h-4 w-4 mr-2 rounded bg-gray-200" />
                    View Canvas (Coming Soon)
                  </Button>
                </div>
              </div>

              <div className="rounded-lg border bg-white p-4">
                <h3 className="font-semibold text-gray-900 mb-2">Session Info</h3>
                <div className="text-sm space-y-1 text-gray-600">
                  <div>Resource Count:</div>
                  <div className="pl-4 font-mono text-gray-900">{resources.length} resources</div>
                  <div className="mt-2 pt-2 border-t">Pods:</div>
                  <div className="pl-4 font-mono text-gray-900">
                    {resources.filter((r) => r.kind === 'Pod').length} pods
                  </div>
                  <div className="mt-2 pt-2 border-t">Services:</div>
                  <div className="pl-4 font-mono text-gray-900">
                    {resources.filter((r) => r.kind === 'Service').length} services
                  </div>
                  <div className="mt-2 pt-2 border-t">Deployments:</div>
                  <div className="pl-4 font-mono text-gray-900">
                    {resources.filter((r) => r.kind === 'Deployment').length} deployments
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Shell>
  )
}