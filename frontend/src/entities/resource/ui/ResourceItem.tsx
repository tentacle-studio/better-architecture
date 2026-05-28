import { Circle, Server, Box } from 'lucide-react'
import type { Resource, ResourceType } from '../model/resource'
import { cn } from '@shared/lib/utils'

const KIND_ICONS: Record<ResourceType, React.ReactNode> = {
  Pod: <Circle className="h-4 w-4" />,
  Service: <Server className="h-4 w-4" />,
  Deployment: <Box className="h-4 w-4" />,
}

const STATUS_COLORS: Record<string, string> = {
  // Pod statuses
  Running: 'bg-green-100 text-green-800 border-green-200',
  Pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  Failed: 'bg-red-100 text-red-800 border-red-200',
  Succeeded: 'bg-blue-100 text-blue-800 border-blue-200',
  Unknown: 'bg-gray-100 text-gray-800 border-gray-200',
  // Deployment statuses
  Ready: 'bg-green-100 text-green-800 border-green-200',
  Progressing: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  Available: 'bg-blue-100 text-blue-800 border-blue-200',
  // Service statuses
  Active: 'bg-green-100 text-green-800 border-green-200',
}

function getStatusColor(status: string): string {
  return STATUS_COLORS[status] || 'bg-gray-100 text-gray-800 border-gray-200'
}

function getKindLabel(kind: ResourceType): string {
  return kind === 'Pod' ? 'Pod' : kind === 'Service' ? 'Service' : 'Deployment'
}

interface ResourceItemProps {
  resource: Resource
}

export function ResourceItem({ resource }: ResourceItemProps) {
  const isPod = resource.kind === 'Pod'
  const containerInfo = isPod && resource.readyContainers !== undefined && resource.totalContainers !== undefined
    ? `${resource.readyContainers}/${resource.totalContainers}`
    : null

  return (
    <div className="flex items-center justify-between p-3 border rounded-lg bg-white hover:bg-gray-50 transition-colors">
      <div className="flex items-center gap-3 min-w-0">
        <div className={cn('p-2 rounded-full', getKindColor(resource.kind))}>
          {KIND_ICONS[resource.kind]}
        </div>
        <div className="min-w-0">
          <div className="font-medium text-sm text-gray-900 truncate">{resource.name}</div>
          <div className="text-xs text-gray-500">{getKindLabel(resource.kind)}</div>
          {containerInfo && (
            <div className="text-xs text-gray-400 mt-0.5">
              Containers: {containerInfo}
              {resource.restartCount !== undefined && resource.restartCount > 0 && (
                <span className="ml-2 text-amber-600">
                  Restarts: {resource.restartCount}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
      <div
        className={cn(
          'px-2 py-1 rounded-full text-xs font-semibold border',
          getStatusColor(resource.status)
        )}
      >
        {resource.status}
      </div>
    </div>
  )
}

function getKindColor(kind: ResourceType): string {
  switch (kind) {
    case 'Pod':
      return 'bg-blue-100 text-blue-600'
    case 'Service':
      return 'bg-purple-100 text-purple-600'
    case 'Deployment':
      return 'bg-orange-100 text-orange-600'
    default:
      return 'bg-gray-100 text-gray-600'
  }
}